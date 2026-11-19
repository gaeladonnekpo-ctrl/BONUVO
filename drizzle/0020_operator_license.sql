ALTER TABLE "bookmakers"
  ADD COLUMN IF NOT EXISTS "operator_license_number" text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS "operator_license_authority" text NOT NULL DEFAULT '';

-- Move existing Curaçao / Anjouan offshore license once onto bookmakers
UPDATE "bookmakers" AS b
SET
  "operator_license_number" = COALESCE(src."local_license", ''),
  "operator_license_authority" = COALESCE(src."authority_name", '')
FROM (
  SELECT DISTINCT ON ("bookmaker_id")
    "bookmaker_id",
    "local_license",
    "authority_name"
  FROM "bookmaker_countries"
  WHERE "deleted_at" IS NULL
    AND ("local_license" <> '' OR "authority_name" <> '')
  ORDER BY "bookmaker_id", length("local_license") DESC
) AS src
WHERE b."id" = src."bookmaker_id"
  AND b."operator_license_number" = ''
  AND b."operator_license_authority" = '';

-- Clear offshore Curaçao/Anjouan labels from per-country rows (not local authorizations)
UPDATE "bookmaker_countries"
SET
  "local_license" = '',
  "authority_name" = '',
  "updated_at" = NOW()
WHERE "local_license" ILIKE '%cura%ao%'
   OR "local_license" ILIKE '%anjouan%'
   OR "authority_name" ILIKE '%cura%ao%'
   OR "authority_name" ILIKE '%anjouan%';
