ALTER TABLE "bookmaker_countries"
  ADD COLUMN IF NOT EXISTS "legal_validated_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "legal_validated_by" text,
  ADD COLUMN IF NOT EXISTS "legal_source" text NOT NULL DEFAULT '';

-- Strictly prohibited online sports betting jurisdictions (including Mauritania MR)
WITH prohibited AS (
  SELECT id FROM "countries"
  WHERE "code" IN (
    'MR', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE',
    'IR', 'IQ', 'SY', 'LY', 'SD', 'SS', 'SO', 'DJ', 'KM',
    'DZ', 'EG', 'JO', 'LB', 'PS',
    'AF', 'PK', 'BD', 'BN', 'MV', 'ID', 'MY', 'SG', 'TH', 'VN',
    'KH', 'LA', 'MM', 'CN', 'KP', 'JP', 'UZ', 'TM', 'TJ',
    'ER', 'VA', 'CU'
  )
)
DELETE FROM "bookmaker_countries" WHERE "country_id" IN (SELECT id FROM prohibited);

DELETE FROM "offer_countries"
WHERE "country_id" IN (
  SELECT id FROM "countries"
  WHERE "code" IN (
    'MR', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE',
    'IR', 'IQ', 'SY', 'LY', 'SD', 'SS', 'SO', 'DJ', 'KM',
    'DZ', 'EG', 'JO', 'LB', 'PS',
    'AF', 'PK', 'BD', 'BN', 'MV', 'ID', 'MY', 'SG', 'TH', 'VN',
    'KH', 'LA', 'MM', 'CN', 'KP', 'JP', 'UZ', 'TM', 'TJ',
    'ER', 'VA', 'CU'
  )
);

DELETE FROM "bookmaker_payment_methods"
WHERE "country_id" IN (
  SELECT id FROM "countries"
  WHERE "code" IN (
    'MR', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE',
    'IR', 'IQ', 'SY', 'LY', 'SD', 'SS', 'SO', 'DJ', 'KM',
    'DZ', 'EG', 'JO', 'LB', 'PS',
    'AF', 'PK', 'BD', 'BN', 'MV', 'ID', 'MY', 'SG', 'TH', 'VN',
    'KH', 'LA', 'MM', 'CN', 'KP', 'JP', 'UZ', 'TM', 'TJ',
    'ER', 'VA', 'CU'
  )
);

-- Deactivate any remaining prohibited countries referenced by historical clicks, and delete unreferenced ones
UPDATE "countries"
SET "active" = false
WHERE "code" IN (
  'MR', 'SA', 'AE', 'QA', 'KW', 'BH', 'OM', 'YE',
  'IR', 'IQ', 'SY', 'LY', 'SD', 'SS', 'SO', 'DJ', 'KM',
  'DZ', 'EG', 'JO', 'LB', 'PS',
  'AF', 'PK', 'BD', 'BN', 'MV', 'ID', 'MY', 'SG', 'TH', 'VN',
  'KH', 'LA', 'MM', 'CN', 'KP', 'JP', 'UZ', 'TM', 'TJ',
  'ER', 'VA', 'CU'
);

DELETE FROM "countries" c
WHERE c."active" = false
  AND NOT EXISTS (SELECT 1 FROM "clicks" cl WHERE cl."country_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "conversions" cv WHERE cv."country_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "campaigns" cp WHERE cp."country_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "promo_codes" pc WHERE pc."country_id" = c."id")
  AND NOT EXISTS (SELECT 1 FROM "affiliate_links" al WHERE al."country_id" = c."id");

-- Record baseline operator validation on remaining eligible bookmaker_countries rows
UPDATE "bookmaker_countries"
SET
  "legal_validated_at" = COALESCE("legal_validated_at", NOW()),
  "legal_validated_by" = COALESCE(NULLIF("legal_validated_by", ''), 'Exploitant BONUVO'),
  "legal_source" = CASE
    WHEN "legal_source" = '' THEN 'Validation exploitant (retrait pays strictement interdits)'
    ELSE "legal_source"
  END
WHERE "eligible" = true AND "deleted_at" IS NULL;
