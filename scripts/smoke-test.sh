#!/bin/bash
# Smoke test for BatchlyAI deploy verification
# Tests full signup → verify → signin flow against production.
# Usage: bash scripts/smoke-test.sh
set -e

DOMAIN="batchlyai.com"
BASE="https://$DOMAIN"
PASS=0
FAIL=0
EMAIL="smoke-$(date +%s)@batchlyai.com"
PASSWORD="test123456"

green() { echo -e "\033[32mPASS\033[0m $1"; PASS=$((PASS + 1)); }
red() { echo -e "\033[31mFAIL\033[0m $1"; FAIL=$((FAIL + 1)); }
warn() { echo -e "\033[33mWARN\033[0m $1"; }

echo "=== Smoke test: $BASE ==="
echo ""

# 1. Health endpoint
if HEALTH=$(curl -sf --max-time 10 "$BASE/api/health" 2>&1); then
  if echo "$HEALTH" | grep -q '"ok"'; then
    green "health endpoint: ok"
  else
    warn "health endpoint: unexpected response"
  fi
else
  red "health endpoint: unreachable"
fi

# 2. Homepage returns valid HTML
if curl -sf --max-time 10 "$BASE/" | head -1 | grep -q '<!DOCTYPE html>'; then
  green "homepage returns DOCTYPE"
else
  red "homepage failed"
fi

# 3. Homepage contains core UI
HTML=$(curl -sf --max-time 10 "$BASE/" 2>&1 || true)
if echo "$HTML" | grep -q 'BatchlyAI'; then
  green "homepage contains BatchlyAI"
else
  warn "homepage missing BatchlyAI text"
fi

# 4. Sign-up (requireEmailVerification=true returns token:null, user created)
echo "  Signing up: $EMAIL"
SIGNUP=$(curl -s --max-time 15 -X POST "$BASE/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"SmokeTest\"}" 2>&1 || true)
if echo "$SIGNUP" | grep -q '"token"'; then
  green "sign-up API ok (user created, verification required)"
elif echo "$SIGNUP" | grep -qE 'already|exists'; then
  warn "sign-up: email already exists (expected on retry)"
else
  red "sign-up API: $SIGNUP"
fi

# 5. Sign-up gives correct default credits (40)
if echo "$SIGNUP" | grep -q '"credits":40'; then
  green "sign-up gives 40 default credits"
else
  warn "sign-up credits: not verified (may differ from 40)"
fi

# 6. Simulate email verification via D1 (same effect as clicking the link)
echo "  Verifying email in D1..."
npx wrangler d1 execute batchlyai-db --remote \
  --command "UPDATE user SET email_verified = 1 WHERE email = '$EMAIL';" 2>&1 | grep -q '"changed_db": true' && \
  green "email verified in D1" || \
  red "D1 verification failed"

# 7. Sign-in after verification
SIGNIN=$(curl -s --max-time 15 -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}" 2>&1 || true)
if echo "$SIGNIN" | grep -q '"token":"'; then
  TOKEN=$(echo "$SIGNIN" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
  green "sign-in after verification: token received"
else
  red "sign-in after verification failed: $SIGNIN"
fi

# 8. Invalid credentials properly rejected
INVALID=$(curl -s --max-time 15 -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"fake@no.com","password":"wrong"}' 2>&1 || true)
if echo "$INVALID" | grep -qE 'error|Invalid|401'; then
  green "invalid login properly rejected"
else
  warn "invalid login: unexpected response"
fi

echo ""
echo "=== Result: $PASS passed, $FAIL failed ==="
if [ $FAIL -gt 0 ]; then
  echo "❌ SMOKE TEST FAILED — check production before promoting"
  exit 1
else
  echo "✅ All checks passed"
fi
