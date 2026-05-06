#!/bin/bash
# Smoke test for BatchlyAI canary deploy
# Usage: bash scripts/smoke-test.sh
# Run after `wrangler deploy` to verify the canary version before promoting.

set -e

DOMAIN="batchlyai.com"
BASE="https://$DOMAIN"
HEADER="x-cwv-debug: 2"   # Route to the latest (canary) version
PASS=0
FAIL=0

green() { echo -e "\033[32mPASS\033[0m $1"; ((PASS++)); }
red() { echo -e "\033[31mFAIL\033[0m $1"; ((FAIL++)); exit 1; }

echo "=== Smoke test (canary version): $BASE ==="
echo ""

# 1. Homepage returns valid HTML
if curl -sf --max-time 10 -H "$HEADER" "$BASE/" | head -1 | grep -q '<!DOCTYPE html>'; then
  green "homepage returns DOCTYPE"
else
  red "homepage failed"
fi

# 2. Sign-up
SIGNUP=$(curl -sf --max-time 15 -H "$HEADER" -X POST "$BASE/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"test123456","name":"SmokeTest"}' 2>&1 || true)
if echo "$SIGNUP" | grep -qE 'token|already|exists'; then
  green "sign-up API"
else
  red "sign-up API: $SIGNUP"
fi

# 3. Sign-in
SIGNIN=$(curl -sf --max-time 15 -H "$HEADER" -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"test123456"}' 2>&1 || true)
if echo "$SIGNIN" | grep -q '"token"'; then
  green "sign-in API"
else
  red "sign-in API: $SIGNIN"
fi

echo ""
echo "=== Result: $PASS passed, $FAIL failed ==="
echo "→ If all passed, run: npx wrangler versions promote"
