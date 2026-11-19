-- Add Betwinner to the real BONUVO catalog (Point 9: community consistency)
WITH inserted_bm AS (
  INSERT INTO "bookmakers" (
    "name",
    "slug",
    "description_fr",
    "description_en",
    "founded_year",
    "app_platforms",
    "allowed_hosts",
    "operator_license_number",
    "operator_license_authority",
    "status"
  )
  VALUES (
    'Betwinner',
    'betwinner',
    'Opérateur de paris sportifs en ligne référencé avec le code promo GAEL229.',
    'Online sportsbook operator listed with promo code GAEL229.',
    2018,
    ARRAY['android', 'ios', 'web']::text[],
    ARRAY['bwredir.com', 'betwinner.com']::text[],
    '',
    '',
    'active'
  )
  ON CONFLICT ("slug") DO UPDATE
  SET
    "allowed_hosts" = ARRAY['bwredir.com', 'betwinner.com']::text[],
    "status" = 'active',
    "deleted_at" = NULL,
    "updated_at" = NOW()
  RETURNING "id"
),
bm AS (
  SELECT "id" FROM inserted_bm
),
inserted_offer AS (
  INSERT INTO "offers" (
    "bookmaker_id",
    "offer_type",
    "slug",
    "title_fr",
    "title_en",
    "bonus_amount",
    "currency_code",
    "bonus_percentage",
    "min_deposit",
    "rollover_text",
    "last_verified_at",
    "badge_code",
    "badge_justification",
    "rank_order",
    "status"
  )
  SELECT
    bm."id",
    'welcome',
    'betwinner-bienvenue',
    'Offre de bienvenue 100% avec code promo GAEL229',
    '100% Welcome Offer with promo code GAEL229',
    NULL,
    'XOF',
    100,
    NULL,
    '',
    NOW(),
    NULL,
    '',
    8,
    'published'
  FROM bm
  ON CONFLICT ("slug") DO UPDATE
  SET
    "status" = 'published',
    "deleted_at" = NULL,
    "updated_at" = NOW()
  RETURNING "id", "bookmaker_id"
)
INSERT INTO "bookmaker_countries" (
  "bookmaker_id",
  "country_id",
  "eligible",
  "local_license",
  "authority_name",
  "legal_validated_at",
  "legal_validated_by",
  "legal_source",
  "status"
)
SELECT
  bm."id",
  bc."country_id",
  true,
  '',
  '',
  NOW(),
  'Exploitant BONUVO',
  'Ajout catalogue Point 9 (cohérence communauté)',
  'active'
FROM bm
CROSS JOIN (
  SELECT DISTINCT bc2."country_id"
  FROM "bookmaker_countries" bc2
  JOIN "bookmakers" b2 ON b2."id" = bc2."bookmaker_id"
  WHERE b2."slug" = 'melbet'
    AND bc2."eligible" = true
    AND bc2."deleted_at" IS NULL
) bc
ON CONFLICT ("bookmaker_id", "country_id") DO NOTHING;

INSERT INTO "offer_countries" ("offer_id", "country_id")
SELECT o."id", bc."country_id"
FROM "offers" o
JOIN "bookmaker_countries" bc ON bc."bookmaker_id" = o."bookmaker_id"
WHERE o."slug" = 'betwinner-bienvenue'
  AND bc."eligible" = true
  AND bc."deleted_at" IS NULL
ON CONFLICT DO NOTHING;

INSERT INTO "promo_codes" (
  "bookmaker_id",
  "offer_id",
  "code",
  "description",
  "program_source",
  "status"
)
SELECT
  o."bookmaker_id",
  o."id",
  'GAEL229',
  'Code promo GAEL229 valable à l''inscription sur Betwinner.',
  'Betwinner Partners',
  'active'
FROM "offers" o
WHERE o."slug" = 'betwinner-bienvenue'
  AND NOT EXISTS (
    SELECT 1 FROM "promo_codes" p
    WHERE p."bookmaker_id" = o."bookmaker_id"
      AND UPPER(p."code") = 'GAEL229'
      AND p."deleted_at" IS NULL
  );

INSERT INTO "affiliate_links" (
  "slug",
  "bookmaker_id",
  "offer_id",
  "destination_url",
  "allowed_host",
  "active",
  "status"
)
SELECT
  'betwinner',
  o."bookmaker_id",
  o."id",
  'https://bwredir.com/264l',
  'bwredir.com',
  true,
  'active'
FROM "offers" o
WHERE o."slug" = 'betwinner-bienvenue'
ON CONFLICT ("slug") DO UPDATE
SET
  "destination_url" = 'https://bwredir.com/264l',
  "allowed_host" = 'bwredir.com',
  "active" = true,
  "status" = 'active',
  "deleted_at" = NULL,
  "updated_at" = NOW();
