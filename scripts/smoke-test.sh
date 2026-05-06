#!/bin/bash
# Smoke test for BatchlyAI deployment
# Usage: bash scripts/smoke-test.sh <domain>
# Example: bash scripts/smoke-test.sh staging.batchlyai.com

set -e

DOMAIN=${1:-batchlyai.com}
BASE="https://$DOMAIN"
PASS=0
FAIL=0

green() { echo -e "\033[32mPASS\033[0m $1"; ((PASS++)); }
red() { echo -e "\033[31mFAIL\033[0m $1"; ((FAIL++)); exit 1; }

echo "=== Smoke test: $BASE ==="
echo ""

# 1. Homepage returns valid HTML
if curl -sf --max-time 10 "$BASE/" | head -1 | grep -q '<!DOCTYPE html>'; then
  green "homepage returns DOCTYPE"
else
  red "homepage failed"
fi

# 2. Sign-up returns a response (not 500/503)
SIGNUP=$(curl -sf --max-time 15 -X POST "$BASE/api/auth/sign-up/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"test123456","name":"SmokeTest"}' 2>&1 || true)
if echo "$SIGNUP" | grep -qE 'token|already|exists'; then
  green "sign-up API"
else
  red "sign-up API: $SIGNUP"
fi

# 3. Sign-in works
SIGNIN=$(curl -sf --max-time 15 -X POST "$BASE/api/auth/sign-in/email" \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"test123456"}' 2>&1 || true)
if echo "$SIGNIN" | grep -q '"token"'; then
  green "sign-in API"
else
  red "sign-in API: $SIGNIN"
fi

echo ""
echo "=== Result: $PASS passed, $FAIL failed ==="
