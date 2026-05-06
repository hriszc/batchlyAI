#\!/bin/bash
set -e
echo "=== Production Safety Check ==="

# 1: .env.production must exist
if test -f .env.production; then
  echo "✅ .env.production exists"
else
  echo "❌ .env.production missing\! Add: VITE_BASE_URL=https://batchlyai.com"
  exit 1
fi

# 2: VITE_BASE_URL must be correct
if grep -q 'VITE_BASE_URL=https://batchlyai.com' .env.production; then
  echo "✅ VITE_BASE_URL set correctly"
else
  echo "❌ VITE_BASE_URL=https://batchlyai.com not found in .env.production"
  exit 1
fi

# 3: requireEmailVerification needs real email OR be disabled
if grep -q 'requireEmailVerification: true' src/lib/auth/auth.ts; then
  if grep -q 'console.log.*rification email\|console.log.*Reset email' src/lib/auth/auth.ts; then
    echo "❌ requireEmailVerification=true but email sends are stubs\!"
    exit 1
  fi
fi
echo "✅ Email verification config OK"
echo "=== All safety checks passed ==="
