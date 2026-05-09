#!/bin/bash
# Fix existing generation records that have raw R2 keys instead of proxy URLs.
# Run this ONCE after deploying the generation-files proxy route.

set -e

echo "Fixing generation resultUrls to use /api/generation-files/ prefix..."

npx wrangler d1 execute batchlyai-db --remote --command "
UPDATE generation
SET result_urls = (
  SELECT json_group_array(
    CASE
      WHEN value LIKE '/api/%' THEN value
      ELSE '/api/generation-files/' || value
    END
  )
  FROM json_each(result_urls)
)
WHERE result_urls IS NOT NULL
  AND result_urls != '[]'
  AND result_urls NOT LIKE '%/api/generation-files/%';
"

echo "Done. Verify with:"
echo "npx wrangler d1 execute batchlyai-db --remote --command \"SELECT id, result_urls FROM generation LIMIT 3;\""
