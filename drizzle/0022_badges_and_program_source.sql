ALTER TABLE "offers"
  ADD COLUMN IF NOT EXISTS "badge_justification" text NOT NULL DEFAULT '';

ALTER TABLE "promo_codes"
  ADD COLUMN IF NOT EXISTS "program_source" text NOT NULL DEFAULT '';

-- Populate affiliate program provenance on each promo code
UPDATE "promo_codes" AS p
SET "program_source" = CASE b."slug"
  WHEN '1xbet' THEN '1xPartners'
  WHEN 'melbet' THEN 'Melbet Affiliates'
  WHEN 'megapari' THEN 'Megapari Partners'
  WHEN 'linebet' THEN 'Linebet Partners'
  WHEN 'paripesa' THEN 'PariPesa Partners'
  WHEN '1win' THEN '1win Partners'
  WHEN 'winwinbet' THEN 'Winwin Partners'
  ELSE b."name" || ' Affiliates'
END
FROM "bookmakers" AS b
WHERE p."bookmaker_id" = b."id"
  AND p."program_source" = '';

-- Remove "exclusive" when the promo code is shared across multiple operators
UPDATE "offers" AS o
SET
  "badge_code" = NULL,
  "badge_justification" = ''
WHERE o."badge_code" = 'exclusive'
  AND EXISTS (
    SELECT 1
    FROM "promo_codes" AS p1
    WHERE p1."bookmaker_id" = o."bookmaker_id"
      AND p1."deleted_at" IS NULL
      AND (
        SELECT COUNT(DISTINCT p2."bookmaker_id")
        FROM "promo_codes" AS p2
        WHERE UPPER(p2."code") = UPPER(p1."code")
          AND p2."deleted_at" IS NULL
      ) > 1
  );

-- Record explicit admin justification for remaining editorial badges
UPDATE "offers" AS o
SET "badge_justification" = CASE o."badge_code"
  WHEN 'recommended' THEN 'Sélection éditoriale BONUVO (couverture pays & conditions)'
  WHEN 'new' THEN 'Offre ajoutée récemment au catalogue BONUVO'
  ELSE ''
END
WHERE o."badge_code" IS NOT NULL
  AND o."badge_justification" = '';
