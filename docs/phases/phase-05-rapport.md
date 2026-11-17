# Rapport de phase — Phase 5 : Affiliation (campagnes, postbacks, conversions, commissions)

- **Statut** : Implémentée et vérifiée automatiquement (prête pour raccordement des clés `AFFILIATE_*` réelles lors de la configuration des réseaux)
- **Date** : 2026-11-17
- **Branche** : `feat/phase-5-affiliation`

---

## 1. Livrables réalisés

- **Documentation partenaire & ADR (`docs/affiliation/*.md`, `ADR-0006`)** :
  - `docs/affiliation/1xpartners-betb2b.md` : spécification S2S pour `1xBet`, `Melbet`, `Megapari`, `Linebet`, `Paripesa` et `Winwinbet` (`subid`, extraction `tag=...c_clk_...`, `{reg}` / `{ftd}`, jeton ou HMAC-SHA256, fenêtre 5 min).
  - `docs/affiliation/1win-partners.md` : spécification S2S et webhook JSON signé pour `1win`.
  - `docs/affiliation/csv-import.md` : format d'import CSV et règles de validation ligne par ligne.
  - `docs/decisions/ADR-0006-affiliation-postbacks-conversions.md`.
- **Schéma PostgreSQL & RLS (`0009_slim_thaddeus_ross.sql`, `0010_phase5_affiliation_rls.sql`)** :
  - Tables `postback_events`, `conversion_imports`, `conversions`, `commissions`, `commission_history` ; extension de `affiliate_networks` (`slug`, `bookmaker_id`, `adapter_key`, `signature_mode`, `signature_header`, `allowed_ips`, `timestamp_tolerance_seconds`) et `campaigns` (`bookmaker_id`, `offer_id`, `country_id`, `description`).
  - Contrainte DB stricte `CHECK (postback_event_id IS NOT NULL OR import_id IS NOT NULL)` sur `conversions` et index d'unicité `(network_id, external_event_id)` ; historique `commission_history` immuable (ajout seul).
  - Nouvelle portée `postback_ingest` sur `bonuvo_app` avec moindre privilège.
- **Adaptateurs, sécurité et endpoints HTTP (`src/modules/affiliation/`, `src/app/api/`)** :
  - Endpoints machine `GET|POST /api/postbacks/[network]` et `POST /api/webhooks/[provider]` avec rate limiting Upstash (`120/min/IP`), vérification d'IP autorisée, comparaison temps constant (`crypto.timingSafeEqual`), fenêtre temporelle anti-rejeu de `300 s`, masquage des secrets avant stockage brut dans `postback_events` et déduplication idempotente (`200 duplicate: true`).
  - Cascade d'attribution déterministe (`click_id` -> `promo_code` -> `unattributed`).
  - Import CSV avec prévisualisation des rejets avant confirmation (`import-service.ts`), cycle de vie des commissions avec référence justificative obligatoire pour `confirmed` (`commission-service.ts`), campagnes UTM (`campaign-service.ts`) et outil de rejeu admin (`replayPostbackEvent`).
- **Écrans back-office (`/admin/campagnes`, `/admin/postbacks`, `/admin/conversions`, `/admin/commissions`, `/admin/imports`)** :
  - Vues modulaires `CampaignsView`, `EventInspector`, `ConversionsView`, `CommissionsView`, `ImportWizard` et `StatusPill`, avec séparation explicite des 4 faits et mention « données non disponibles » pour tout réseau sans intégration configurée.

---

## 2. Preuves et vérifications

- **Conformité taille (`<= 300` lignes sous `src/`)** : tous les fichiers sous `src/` respectent `<= 300` lignes.
- **Qualité & Build** : `npx prettier --check .`, `npx tsc --noEmit`, `npx eslint .` et `npm run build` (`81/81` routes compilées) sans erreur.
- **Tests unitaires & composants (`npm run test:unit`)** : `16` fichiers, `67` tests passés (incluant `tests/unit/phase5-affiliation.test.ts` : HMAC/jeton, rejet > 5 min `401`, IP `403`, extraction `1xPartners` `c_clk_...`, rejet montant négatif / devise inconnue, parse CSV 1 000 lignes, preuve obligatoire sur confirmation de commission).
- **Tests d'intégration RLS PostgreSQL (`npm run test:integration`)** : `4` fichiers, `4` tests passés (incluant `tests/integration/affiliation-postbacks-rls.test.ts` prouvant l'isolation `postback_ingest`, la contrainte source obligatoire, la déduplication unique, l'interdiction de confirmation sans justificatif et l'immuabilité de `commission_history`).
- **Tests E2E Playwright (`npm run test:e2e`)** : `23/23` tests passés (incluant `tests/e2e/phase5-affiliation.spec.ts` : refus non authentifié des 5 nouvelles routes `/admin/*`, `404` réseau inconnu, `413` payload > 64 Ko, test de rafale concurrente sans erreur `500`).
