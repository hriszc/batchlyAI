#\!/bin/bash
# Production build safety checks
# Exit 1 if any check fails

set -e

echo "=== Production Build Safety Check ==="

# 1. No localhost URLs in production build
echo -n "Checking for localhost in build..."
if grep -rq 'localhost:3000' .output/public/; then
  echo " ❌ FAILED"
  echo "ERROR: Found 'localhost:3000' in production build output\!"
  echo "This means VITE_BASE_URL is not set correctly."
  echo "Fix: ensure .env.production has VITE_BASE_URL=https://batchlyai.com"
  exit 1
fi
echo " ✅ PASS"

# 2. No dev secrets in production build
echo -n "Checking for dev secrets in build..."
if grep -rq 'dev-secret-placeholder' .output/public/; then
  echo " ❌ FAILED"
  echo "ERROR: Found dev secret in production build\!"
  exit 1
fi
echo " ✅ PASS"

# 3. Verify .env.production exists
echo -n "Checking .env.production exists..."
if [ \! -f .env.production ]; then
  echo " ⚠️ WARNING: .env.production not found"
else
  echo " ✅ FOUND"
fi

echo ""
echo "=== All checks passed ==="
