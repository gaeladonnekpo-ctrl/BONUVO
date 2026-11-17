# Rapport de phase — Phase 6 : BONUVO INTELLIGENCE

- **Statut** : Implémentée et vérifiée automatiquement (prête pour raccordement d'un planificateur HTTP sur `POST /api/cron/aggregate-metrics` avec `CRON_SECRET`)
- **Date** : 2026-11-17
- **Branche** : `feat/phase-6-intelligence`

---

## 1. Livrables réalisés

- **Dictionnaire des indicateurs & ADR (`docs/metrics.md`, `docs/decisions/ADR-0007-intelligence-metrics.md`)** :
  - Définition de chaque indicateur (`unique_visitors`, `page_views`, `offer_views`, `promo_copies`, `raw_clicks`, `valid_clicks`, `ctr_rate`, `registrations`, `first_deposits`, `qualified_conversions`, `click_to_reg_rate`, `reg_to_ftd_rate`, `click_to_ftd_rate`, `confirmed_commissions_count`, `confirmed_commissions_eur`, `pending_commissions_eur`, `epc_eur`), de sa source SQL et de ses exclusions (robots `is_bot`, clics suspects `is_suspect`, conversions et commissions `rejected`, comptes back-office hors tracking).
  - Règle d'honnêteté stricte : division par zéro retournant `null` (`« — »`), réseaux sans postback ni import (`tracking_mode = 'none'`) affichant `« — »` au lieu de `0`.
- **Schéma PostgreSQL, index & RLS (`drizzle/0011_wise_the_watchers.sql`, `drizzle/0012_phase6_intelligence_rls.sql`)** :
  - Table `daily_metrics` avec clé d'unicité `dimension_key` et trois granularités (`day_total`, `day_country`, `breakdown`) garantissant l'égalité avec les comptages SQL bruts sans double comptage des visiteurs journaliers hachés (`visitor_daily_hash`).
  - Index complémentaires sur `clicks` (`country_code`, `campaign_id`), `conversions` (`country_id`, `offer_id`) et `visit_events` (`country_code`).
  - Portée machine `stats_aggregator` sous `bonuvo_app` avec lecture restreinte aux faits bruts et écriture limitée à `daily_metrics`. Le rôle `analyst` dispose strictement d'un accès en lecture/export (`stats.read`, `stats.export`) sans aucun droit d'écriture.
- **Tâche d'agrégation & verrou Redis (`src/modules/intelligence/`, `src/app/api/cron/aggregate-metrics/route.ts`)** :
  - `runAggregateMetricsJob` : réexécution transactionnelle et idempotente sur n'importe quelle fenêtre `[fromDate, toDate]` (`DELETE` + `INSERT ON CONFLICT DO UPDATE`), protégée par verrou distribué Upstash Redis (`NX EX 300`, libération atomique par script Lua et repli mémoire déterministe uniquement en développement/tests).
  - `POST /api/cron/aggregate-metrics` protégé par `CRON_SECRET` en temps constant (`crypto.timingSafeEqual`) et journalisation dans `audit_log` / `security_events`.
- **Export CSV audité (`GET /api/admin/export/[report]`)** :
  - Rapports `daily-overview`, `bookmakers`, `countries`, `campaigns`, `offers` protégés par `stats.read` + `stats.export` (+ TOTP `aal2`), neutralisation contre l'injection de formules CSV (`=`, `+`, `-`, `@`), exclusion totale de toute donnée personnelle ou empreinte (`ip_hash`, `visitor_daily_hash`, `anon_session_hash`, `external_player_id`) et traçabilité dans `audit_log`.
- **Interface `/admin/statistiques` (`src/components/admin/intelligence/`, `src/app/[locale]/admin/(protected)/statistiques/page.tsx`)** :
  - Composants `KpiCard`, `FunnelChart` (entonnoir 5 étapes avec taux de passage), `TimeSeriesChart` (`recharts` avec granularité jour / semaine / mois), `BreakdownTable` (bookmaker, pays, campagne, offre, top offres + export CSV), `DateRangePicker` (`7 j`, `30 j`, `90 j`, `12 mois`, filtres pays / bookmaker / campagne), `FreshnessNote` (horodatage du dernier agrégat, statut par réseau, bouton de recalcul réservé aux administrateurs `conversions.manage`) et `DrilldownPanel` (descente d'un chiffre jusqu'aux lignes sous-jacentes non PII).

---

## 2. Preuves et vérifications

- **Conformité taille (`<= 300` lignes sous `src/`)** : tous les fichiers sous `src/` respectent `<= 300` lignes (`ALL_SRC_UNDER_300`).
- **Qualité & Build** : `npx prettier --check .`, `npx tsc --noEmit`, `npx eslint .` et `npm run build` (`84/84` routes compilées) sans erreur.
- **Tests unitaires & composants (`npm run test:unit`)** : `18` fichiers, `73` tests passés (incluant `tests/unit/phase6-intelligence.test.ts` : jeu de données connu comparé à des valeurs calculées à la main, idempotence, division par zéro, réseaux sans suivi affichant `« — »`, verrou concurrentiel et assainissement CSV).
- **Tests d'intégration RLS PostgreSQL (`npm run test:integration`)** : `5` fichiers, `5` tests passés (incluant `tests/integration/intelligence-rls.test.ts` prouvant la double exécution sans double comptage, l'égalité stricte `daily_metrics` = SQL brut, l'isolation de `stats_aggregator`, l'interdiction d'écriture pour `analyst`, le rejet `member`, ainsi que la lecture sur 12 mois / 365 jours en moins de 2 s).
- **Tests E2E Playwright (`npm run test:e2e`, `PORT=3097`)** : `26/26` tests passés (incluant `tests/e2e/phase6-intelligence.spec.ts` : blocage sans session TOTP de `/fr|en/admin/statistiques` et `/api/admin/export/*`, `404` sur rapport inconnu, rejet sans secret valide sur `POST /api/cron/aggregate-metrics`).
