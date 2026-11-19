ALTER TABLE "bookmaker_payment_methods"
  ADD COLUMN IF NOT EXISTS "confirmed" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "verified_at" timestamp with time zone,
  ADD COLUMN IF NOT EXISTS "verified_by" text;

-- Mark existing catalog entries as confirmed baseline; new entries default to unconfirmed
UPDATE "bookmaker_payment_methods"
SET
  "confirmed" = true,
  "verified_at" = COALESCE("verified_at", NOW()),
  "verified_by" = COALESCE("verified_by", 'Vérification initiale catalogue')
WHERE "confirmed" = false;
