-- Full parity for Betwinner matching 1xBet structure (logo, license, offer details, highlights, terms, payments)
WITH bm AS (
  SELECT "id" FROM "bookmakers" WHERE "slug" = 'betwinner' LIMIT 1
),
inserted_logo AS (
  INSERT INTO "media_assets" (
    "storage_bucket",
    "storage_path",
    "public_url",
    "mime_type",
    "size_bytes",
    "width",
    "height",
    "sha256",
    "alt_text",
    "status"
  )
  VALUES (
    'bonuvo-media',
    'logos/3952cde7-a18c-46ff-9625-d20dadf862bc.png',
    'https://sxdgzqicwjcfvwjikpwg.supabase.co/storage/v1/object/public/bonuvo-media/logos/3952cde7-a18c-46ff-9625-d20dadf862bc.png',
    'image/png',
    8315,
    128,
    128,
    '3952cde7a18c46ff9625d20dadf862bc3952cde7a18c46ff9625d20dadf862bc',
    'Logo officiel Betwinner',
    'active'
  )
  ON CONFLICT ("storage_path") DO UPDATE
  SET "public_url" = EXCLUDED."public_url"
  RETURNING "id"
)
UPDATE "bookmakers"
SET
  "logo_asset_id" = (SELECT "id" FROM inserted_logo),
  "description_fr" = 'Opérateur international fondé en 2018 (Prevailer B.V.), offrant paris sportifs, paiements Mobile Money en Afrique de l''Ouest et application Android/iOS.',
  "description_en" = 'International sportsbook founded in 2018 (Prevailer B.V.) featuring deep sports markets, West African Mobile Money support, and Android/iOS apps.',
  "founded_year" = 2018,
  "app_platforms" = ARRAY['android', 'ios', 'web']::text[],
  "allowed_hosts" = ARRAY['bwredir.com', 'betwinner.com']::text[],
  "operator_license_number" = 'Licence Curaçao GCB OGL/2024/341/0759',
  "operator_license_authority" = 'Prevailer B.V. · Curaçao Gaming Authority',
  "updated_at" = NOW()
WHERE "slug" = 'betwinner';

UPDATE "offers"
SET
  "title_fr" = 'Bonus 1er dépôt 100% jusqu''à 65 500 XOF avec code promo',
  "title_en" = 'First deposit bonus 100% up to 65,500 XOF (€100) with promo code',
  "bonus_amount" = 65500.00,
  "currency_code" = 'XOF',
  "bonus_percentage" = 100,
  "min_deposit" = 600.00,
  "min_odds" = 1.40,
  "rollover_text" = '5x en paris combinés (min. 3 sélections, cote min. 1.40, 30 jours)',
  "last_verified_at" = NOW(),
  "updated_at" = NOW()
WHERE "slug" = 'betwinner-bienvenue';

DELETE FROM "offer_highlights"
WHERE "offer_id" = (SELECT "id" FROM "offers" WHERE "slug" = 'betwinner-bienvenue' LIMIT 1);

INSERT INTO "offer_highlights" ("offer_id", "locale", "polarity", "label", "sort_order")
SELECT o."id", v.locale, v.polarity, v.label, v.sort_order
FROM "offers" o
CROSS JOIN (
  VALUES
    ('fr', 'positive', 'Dépôt minimum accessible dès 600 XOF', 0),
    ('fr', 'positive', 'Rollover 5x en combinés à cote accessible (1.40) sous 30 jours', 1),
    ('fr', 'positive', 'Compatible MTN MoMo, Moov Money, Orange Money et Wave', 2),
    ('fr', 'negative', 'Profil complet et numéro vérifié requis avant dépôt ; comptes crypto exclus.', 99),
    ('en', 'positive', 'Accessible minimum deposit starting from 600 XOF', 0),
    ('en', 'positive', '5x accumulator rollover at 1.40+ odds within 30 days', 1),
    ('en', 'positive', 'Supports MTN MoMo, Moov Money, Orange Money and Wave', 2),
    ('en', 'negative', 'Full profile and phone verification required before deposit; crypto accounts excluded.', 99)
) AS v(locale, polarity, label, sort_order)
WHERE o."slug" = 'betwinner-bienvenue';

DELETE FROM "offer_terms"
WHERE "offer_id" = (SELECT "id" FROM "offers" WHERE "slug" = 'betwinner-bienvenue' LIMIT 1);

INSERT INTO "offer_terms" ("offer_id", "locale", "title", "body", "sort_order")
SELECT o."id", v.locale, v.title, v.body, v.sort_order
FROM "offers" o
CROSS JOIN (
  VALUES
    ('fr', 'Inscription et éligibilité', 'Valable sur le premier dépôt dès 600 XOF après remplissage complet du profil personnel, activation du numéro de téléphone et activation de l''option bonus sport avec le code GAEL229.', 0),
    ('fr', 'Conditions de mise et retrait', 'Miser 5 fois le montant du bonus sur des paris combinés d''au moins 3 sélections (au moins 3 sélections à cote ≥ 1.40) dans un délai de 30 jours. Les retraits restent bloqués jusqu''à validation complète du rollover.', 1),
    ('en', 'Registration & eligibility', 'Applies to the first deposit starting from 600 XOF after completing all personal profile fields, activating your phone number, and opting into sports bonuses with promo code GAEL229.', 0),
    ('en', 'Wagering & withdrawal terms', 'Wager 5x the bonus amount on accumulator bets with at least 3 selections (at least 3 legs at odds 1.40+) within 30 days. Withdrawals remain restricted until rollover is completed.', 1)
) AS v(locale, title, body, sort_order)
WHERE o."slug" = 'betwinner-bienvenue';

-- Mirror confirmed regional payment methods structure from 1xBet with Betwinner's 600 XOF min deposit
INSERT INTO "bookmaker_payment_methods" (
  "bookmaker_id",
  "payment_method_id",
  "country_id",
  "min_deposit_amount",
  "currency_code",
  "supports_deposit",
  "supports_withdrawal",
  "confirmed",
  "verified_at",
  "verified_by"
)
SELECT
  (SELECT "id" FROM "bookmakers" WHERE "slug" = 'betwinner' LIMIT 1),
  bpm."payment_method_id",
  bpm."country_id",
  600.00,
  bpm."currency_code",
  bpm."supports_deposit",
  bpm."supports_withdrawal",
  true,
  NOW(),
  'Vérification Betwinner (Point 9)'
FROM "bookmaker_payment_methods" bpm
JOIN "bookmakers" b ON b."id" = bpm."bookmaker_id"
WHERE b."slug" = '1xbet'
  AND bpm."confirmed" = true
ON CONFLICT ("bookmaker_id", "payment_method_id", "country_id") DO UPDATE
SET
  "min_deposit_amount" = 600.00,
  "confirmed" = true,
  "verified_at" = NOW(),
  "verified_by" = 'Vérification Betwinner (Point 9)';
