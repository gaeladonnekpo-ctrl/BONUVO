-- BONUVO: Suivi automatique des résultats de coupons combinés (BONUVO AI & Communauté)
-- Ajoute settlement_status, settled_at, source, external_key, legs_json sur public.coupons
-- et autorise le scope ai_pipeline à persister / régler automatiquement les coupons.

ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS settlement_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS settled_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'community',
  ADD COLUMN IF NOT EXISTS external_key text,
  ADD COLUMN IF NOT EXISTS legs_json jsonb NOT NULL DEFAULT '[]'::jsonb;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_settlement_status_check'
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_settlement_status_check
      CHECK (settlement_status IN ('pending', 'won', 'lost', 'void'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'coupons_source_check'
  ) THEN
    ALTER TABLE public.coupons
      ADD CONSTRAINT coupons_source_check
      CHECK (source IN ('community', 'bonuvo_ai'));
  END IF;
END
$$;
--> statement-breakpoint

CREATE UNIQUE INDEX IF NOT EXISTS coupons_external_key_uidx
  ON public.coupons (external_key)
  WHERE external_key IS NOT NULL;
--> statement-breakpoint

CREATE INDEX IF NOT EXISTS coupons_settlement_status_idx
  ON public.coupons (status, settlement_status, settled_at);
--> statement-breakpoint

DROP POLICY IF EXISTS coupons_select_policy ON public.coupons;
CREATE POLICY coupons_select_policy ON public.coupons
FOR SELECT TO bonuvo_app
USING (
  ((SELECT private.current_db_scope()) = 'public_catalog' AND status = 'validated')
  OR (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('predictions.manage'))
);
--> statement-breakpoint

DROP POLICY IF EXISTS coupons_write_policy ON public.coupons;
CREATE POLICY coupons_write_policy ON public.coupons
FOR ALL TO bonuvo_app
USING (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('predictions.manage'))
)
WITH CHECK (
  (SELECT private.current_db_scope()) = 'ai_pipeline'
  OR (SELECT private.has_permission('community.manage'))
  OR (SELECT private.has_permission('predictions.manage'))
);
