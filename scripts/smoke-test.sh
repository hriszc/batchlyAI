#!/bin/bash
# Smoke test for BatchlyAI deploy verification.
# Defaults to production and uses only curl + node.
# Usage:
#   bash scripts/smoke-test.sh
#   BASE_URL=https://preview.example.com SMOKE_RUN_GENERATION=0 bash scripts/smoke-test.sh
set -euo pipefail

BASE_URL="${BASE_URL:-https://batchlyai.com}"
BASE_URL="${BASE_URL%/}"
SMOKE_AUTH_EMAIL="${SMOKE_AUTH_EMAIL:-test@test.com}"
SMOKE_AUTH_PASSWORD="${SMOKE_AUTH_PASSWORD:-test123456}"
SMOKE_SIGNUP_EMAIL="${SMOKE_SIGNUP_EMAIL:-smoke-$(date +%s)@batchlyai.com}"
SMOKE_SIGNUP_PASSWORD="${SMOKE_SIGNUP_PASSWORD:-test123456}"
SMOKE_RUN_GENERATION="${SMOKE_RUN_GENERATION:-1}"
SMOKE_GENERATION_MODEL="${SMOKE_GENERATION_MODEL:-z-image-fast}"
SMOKE_GENERATION_COUNT="${SMOKE_GENERATION_COUNT:-2}"
SMOKE_POLL_ATTEMPTS="${SMOKE_POLL_ATTEMPTS:-18}"
SMOKE_POLL_INTERVAL="${SMOKE_POLL_INTERVAL:-10}"
export SMOKE_GENERATION_COUNT

PASS=0
FAIL=0
WARN=0
LAST_BODY=""
LAST_STATUS=""
COOKIE_JAR="$(mktemp)"

cleanup() {
  rm -f "$COOKIE_JAR"
}
trap cleanup EXIT

green() {
  echo -e "\033[32mPASS\033[0m $1"
  PASS=$((PASS + 1))
}

red() {
  echo -e "\033[31mFAIL\033[0m $1"
  FAIL=$((FAIL + 1))
}

yellow() {
  echo -e "\033[33mWARN\033[0m $1"
  WARN=$((WARN + 1))
}

request() {
  local method="$1"
  local path_or_url="$2"
  local body="${3:-}"
  local use_cookies="${4:-0}"
  local timeout="${5:-15}"
  local tmp
  tmp="$(mktemp)"
  local url="$path_or_url"
  if [[ "$url" != http* ]]; then
    url="$BASE_URL$path_or_url"
  fi

  local args=(-sS -o "$tmp" -w "%{http_code}" --max-time "$timeout" -X "$method" "$url")
  args+=(-H "Origin: $BASE_URL")
  if [[ "$use_cookies" == "1" ]]; then
    args+=(-b "$COOKIE_JAR" -c "$COOKIE_JAR")
  fi
  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi

  if ! LAST_STATUS="$(curl "${args[@]}" 2>/tmp/smoke-curl-error)"; then
    LAST_STATUS="000"
  fi
  LAST_BODY="$(tr -d '\000' < "$tmp")"
  rm -f "$tmp"
  if [[ "$LAST_STATUS" == "000" && -s /tmp/smoke-curl-error ]]; then
    LAST_BODY="$(cat /tmp/smoke-curl-error)"
  fi
}

json_check() {
  local json="$1"
  local expression="$2"
  JSON_INPUT="$json" node -e '
const data = JSON.parse(process.env.JSON_INPUT || "null");
const expression = process.argv[1];
const ok = Function("data", `return (${expression})`)(data);
process.exit(ok ? 0 : 1);
' "$expression"
}

json_value() {
  local json="$1"
  local expression="$2"
  JSON_INPUT="$json" node -e '
const data = JSON.parse(process.env.JSON_INPUT || "null");
const expression = process.argv[1];
const value = Function("data", `return (${expression})`)(data);
if (Array.isArray(value)) {
  process.stdout.write(value.join(","));
} else if (value !== undefined && value !== null) {
  process.stdout.write(String(value));
}
' "$expression"
}

expect_status() {
  local expected="$1"
  [[ "$LAST_STATUS" == "$expected" ]]
}

expect_json() {
  local expression="$1"
  json_check "$LAST_BODY" "$expression"
}

absolute_url() {
  local url="$1"
  if [[ "$url" == http* ]]; then
    echo "$url"
  else
    echo "$BASE_URL$url"
  fi
}

echo "=== Smoke test: $BASE_URL ==="
echo "Generation check: model=$SMOKE_GENERATION_MODEL count=$SMOKE_GENERATION_COUNT enabled=$SMOKE_RUN_GENERATION"
echo ""

# Infrastructure
request GET "/api/health" "" 0 10
if expect_status 200 && expect_json 'data.status === "ok"'; then
  green "health endpoint returns ok"
else
  red "health endpoint failed: status=$LAST_STATUS body=$LAST_BODY"
fi

request GET "/" "" 0 10
if expect_status 200 && echo "$LAST_BODY" | head -1 | grep -q '<!DOCTYPE html>'; then
  green "homepage returns HTML document"
else
  red "homepage failed: status=$LAST_STATUS"
fi

if echo "$LAST_BODY" | grep -q 'BatchlyAI'; then
  green "homepage contains BatchlyAI"
else
  yellow "homepage missing BatchlyAI text"
fi

request GET "/robots.txt" "" 0 10
if expect_status 200 && echo "$LAST_BODY" | grep -qi 'User-agent'; then
  green "robots.txt available"
else
  red "robots.txt failed: status=$LAST_STATUS body=$LAST_BODY"
fi

request GET "/sitemap.xml" "" 0 10
if expect_status 200 && echo "$LAST_BODY" | grep -q '<urlset'; then
  green "sitemap.xml available"
else
  red "sitemap.xml failed: status=$LAST_STATUS body=$LAST_BODY"
fi

# Public API reads
request GET "/api/templates?limit=3" "" 0 15
if expect_status 200 && expect_json 'Array.isArray(data.templates) && typeof data.total === "number"'; then
  green "templates API returns list payload"
else
  red "templates API failed: status=$LAST_STATUS body=$LAST_BODY"
fi

request GET "/api/works?limit=3" "" 0 15
if expect_status 200 && expect_json 'Array.isArray(data.works)'; then
  green "works API returns list payload"
else
  red "works API failed: status=$LAST_STATUS body=$LAST_BODY"
fi

# Email sending health via known verified account
echo "  Checking email health..."
SIGNIN_BODY="{\"email\":\"$SMOKE_AUTH_EMAIL\",\"password\":\"$SMOKE_AUTH_PASSWORD\"}"
request POST "/api/auth/sign-in/email" "$SIGNIN_BODY" 1 20
AUTH_OK=0
if expect_status 200 && expect_json 'typeof data.token === "string"'; then
  AUTH_OK=1
  green "sign-in returns token for verified smoke account"
else
  red "sign-in failed for verified smoke account: status=$LAST_STATUS body=$LAST_BODY"
fi

if [[ "$AUTH_OK" == "1" ]]; then
  request GET "/api/diag/email" "" 1 30
  if expect_status 200 && expect_json 'data.ok === true' 2>/dev/null; then
    green "email diagnostic endpoint returned ok"
  elif expect_status 200 && echo "$LAST_BODY" | grep -q '<!DOCTYPE html>'; then
    yellow "email diagnostic route returned HTML fallback"
  else
    red "email diagnostic failed: status=$LAST_STATUS body=$LAST_BODY"
  fi
else
  yellow "email diagnostic skipped because sign-in failed"
fi

# Sign-up flow
echo "  Signing up: $SMOKE_SIGNUP_EMAIL"
SIGNUP_BODY="{\"email\":\"$SMOKE_SIGNUP_EMAIL\",\"password\":\"$SMOKE_SIGNUP_PASSWORD\",\"name\":\"SmokeTest\"}"
request POST "/api/auth/sign-up/email" "$SIGNUP_BODY" 0 20
SIGNUP_OK=0
if expect_status 200 && expect_json 'typeof data.token === "string" && data.user && data.user.email'; then
  SIGNUP_OK=1
  green "sign-up API creates user and returns token"
elif expect_status 403 && echo "$LAST_BODY" | grep -qi 'Human verification required'; then
  yellow "sign-up flow skipped because human verification is required"
else
  red "sign-up API failed: status=$LAST_STATUS body=$LAST_BODY"
fi

if [[ "$SIGNUP_OK" == "1" ]]; then
  if json_check "$LAST_BODY" 'data.user && data.user.credits === 40' 2>/dev/null; then
    green "sign-up gives 40 default credits"
  else
    red "sign-up default credits not verified: body=$LAST_BODY"
  fi
else
  yellow "sign-up default credits skipped because sign-up did not create a user"
fi

if [[ "$SIGNUP_OK" == "1" ]]; then
  UNVERIFIED_BODY="{\"email\":\"$SMOKE_SIGNUP_EMAIL\",\"password\":\"$SMOKE_SIGNUP_PASSWORD\"}"
  request POST "/api/auth/sign-in/email" "$UNVERIFIED_BODY" 0 20
  if [[ "$LAST_STATUS" =~ ^(400|401|403)$ ]] || echo "$LAST_BODY" | grep -qE 'Email not verified|EMAIL_NOT_VERIFIED'; then
    green "unverified account is blocked"
  else
    red "unverified account was not blocked as expected: status=$LAST_STATUS body=$LAST_BODY"
  fi
else
  yellow "unverified account block skipped because sign-up did not create a user"
fi

request POST "/api/auth/sign-in/email" '{"email":"fake@no.com","password":"wrong"}' 0 15
if [[ "$LAST_STATUS" =~ ^(400|401|403)$ ]] || echo "$LAST_BODY" | grep -qE 'error|Invalid|Unauthorized'; then
  green "invalid credentials are rejected"
else
  red "invalid credentials unexpected response: status=$LAST_STATUS body=$LAST_BODY"
fi

# Authenticated low-side-effect reads
if [[ "$AUTH_OK" == "1" ]]; then
  request GET "/api/auth/get-session" "" 1 15
  if expect_status 200 && echo "$LAST_BODY" | grep -q "$SMOKE_AUTH_EMAIL"; then
    green "authenticated session endpoint returns smoke user"
  else
    red "authenticated session check failed: status=$LAST_STATUS body=$LAST_BODY"
  fi

  request GET "/api/referral/stats" "" 1 15
  if expect_status 200 && expect_json 'typeof data.totalCreditsEarned === "number" && "referralCode" in data'; then
    green "referral stats returns authenticated payload"
  else
    red "referral stats failed: status=$LAST_STATUS body=$LAST_BODY"
  fi

  request GET "/api/generations?limit=1" "" 1 15
  if expect_status 200 && expect_json 'Array.isArray(data.generations)'; then
    green "my generations API returns authenticated list"
  else
    red "my generations API failed: status=$LAST_STATUS body=$LAST_BODY"
  fi

  request GET "/api/prompts?limit=1" "" 1 15
  if expect_status 200 && expect_json 'Array.isArray(data.prompts)'; then
    green "my prompts API returns authenticated list"
  else
    red "my prompts API failed: status=$LAST_STATUS body=$LAST_BODY"
  fi
fi

# Real low-cost generation path. z-image-fast is the app's image turbo model.
if [[ "$SMOKE_RUN_GENERATION" == "1" ]]; then
  if [[ "$AUTH_OK" != "1" ]]; then
    red "generation check skipped because sign-in failed"
  else
    PROMPT="smoke test simple blue square icon $(date +%s)"
    GENERATE_BODY="{\"prompt\":\"$PROMPT\",\"promptTemplate\":\"$PROMPT\",\"variableGroups\":[],\"aspectRatio\":\"1:1\",\"n\":$SMOKE_GENERATION_COUNT,\"model\":\"$SMOKE_GENERATION_MODEL\"}"
    request POST "/api/generate" "$GENERATE_BODY" 1 30
    if ! expect_status 200; then
      red "generation create failed: status=$LAST_STATUS body=$LAST_BODY"
    elif json_check "$LAST_BODY" 'Array.isArray(data.urls) && data.urls.length > 0' 2>/dev/null; then
      FIRST_URL="$(json_value "$LAST_BODY" 'data.urls[0]')"
      green "generation returned sync URLs"
      ASSET_URL="$(absolute_url "$FIRST_URL")"
      if curl -sfL --max-time 20 -o /dev/null "$ASSET_URL"; then
        green "generated asset is reachable"
      else
        red "generated asset is not reachable: $ASSET_URL"
      fi
    elif json_check "$LAST_BODY" 'Array.isArray(data.predictionIds) && data.predictionIds.length === Number(process.env.SMOKE_GENERATION_COUNT || 2)' 2>/dev/null; then
      IDS="$(json_value "$LAST_BODY" 'data.predictionIds')"
      green "generation created $SMOKE_GENERATION_COUNT async prediction(s)"
      COMPLETE=0
      for attempt in $(seq 1 "$SMOKE_POLL_ATTEMPTS"); do
        sleep "$SMOKE_POLL_INTERVAL"
        request GET "/api/generate-status?ids=$IDS" "" 1 30
        if ! expect_status 200; then
          red "generation status failed: status=$LAST_STATUS body=$LAST_BODY"
          COMPLETE=2
          break
        fi
        if json_check "$LAST_BODY" 'Array.isArray(data.results) && data.results.some((r) => r.status === "failed" || r.status === "error")' 2>/dev/null; then
          red "generation failed while polling: body=$LAST_BODY"
          COMPLETE=2
          break
        fi
        if json_check "$LAST_BODY" 'Array.isArray(data.results) && data.results.length > 0 && data.results.every((r) => r.status === "succeeded" && Array.isArray(r.urls) && r.urls.length > 0)' 2>/dev/null; then
          FIRST_URL="$(json_value "$LAST_BODY" 'data.results.find((r) => r.urls && r.urls.length).urls[0]')"
          green "generation completed after poll attempt $attempt"
          ASSET_URL="$(absolute_url "$FIRST_URL")"
          if curl -sfL --max-time 20 -o /dev/null "$ASSET_URL"; then
            green "generated asset is reachable"
          else
            red "generated asset is not reachable: $ASSET_URL"
          fi
          COMPLETE=1
          break
        fi
        echo "  generation still processing (attempt $attempt/$SMOKE_POLL_ATTEMPTS)"
      done
      if [[ "$COMPLETE" == "0" ]]; then
        red "generation did not complete within $((SMOKE_POLL_ATTEMPTS * SMOKE_POLL_INTERVAL))s"
      fi
    else
      red "generation response missing urls or predictionIds: body=$LAST_BODY"
    fi
  fi
else
  yellow "real generation check skipped (SMOKE_RUN_GENERATION=$SMOKE_RUN_GENERATION)"
fi

echo ""
echo "=== Result: $PASS passed, $WARN warnings, $FAIL failed ==="
if [[ "$FAIL" -gt 0 ]]; then
  echo "SMOKE TEST FAILED - check deployment before promoting"
  exit 1
fi

echo "All blocking smoke checks passed"
