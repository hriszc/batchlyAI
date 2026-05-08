#!/bin/bash
# Check i18n coverage — must be 100%.
# All keys must exist in both en and zh, with non-empty values.
set -e

echo "=== i18n Coverage Check ==="

# Run the i18n coverage test
npx vitest run src/lib/i18n/__tests__/i18n-coverage.test.ts --reporter=verbose

# Scan for hardcoded English strings that look like untranslated UI text
echo ""
echo "=== Hardcoded String Scan ==="
echo "Scanning for potentially untranslated strings..."

# Patterns that SHOULD use t() but often don't
HARDCODED=$(grep -rn ">[A-Z][a-z]" src/components/ src/routes/ --include="*.tsx" | \
  grep -v "t(\|__tests__\|node_modules\|className\|import\|from \|svg\|png\|http\|href\|path\|\.jpg\|\.jpeg\|name=\|id=\|key=\|type=\|mode=\|method=\|provider=\|rel=\|media=\|placeholder=\|alt=\|title=\|aria-\|src=\|lang=" | \
  grep -E ">[A-Z][a-z]{2,}" || true)

if [ -n "$HARDCODED" ]; then
  echo "WARNING: Potential hardcoded strings found:"
  echo "$HARDCODED"
  echo ""
  echo "These may need t() wrapping if they are user-facing text."
else
  echo "No obvious hardcoded strings found."
fi

echo ""
echo "=== i18n coverage: PASSED ==="
