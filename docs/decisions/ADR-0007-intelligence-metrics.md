# ADR-0007 : Architecture d'agrégation et de restitution BONUVO INTELLIGENCE (Phase 6)

- **Statut** : Acceptée
- **Date** : 2026-11-17
- **Phase** : Phase 6 — BONUVO INTELLIGENCE

## Contexte

Les phases 4 et 5 collectent des événements anonymisés (`visit_events`), des clics sortants (`clicks`), des conversions attribuées (`conversions`) et des commissions vérifiées (`commissions`). La phase 6 doit exposer ces données dans `/admin/statistiques` avec :

- des totaux fidèles au SQL brut (zéro double comptage),
- une charge de page inférieure à 2 s sur 12 mois de données,
- une tâche d'agrégation rejouable, idempotente et protégée par verrou distribué Redis,
- un export CSV exempt de toute donnée personnelle et journalisé.

## Décisions

1. **Table `daily_metrics` à clé dimensionnelle unique et trois granularités (`day_total`, `day_country`, `breakdown`)**
   - Un visiteur unique (`visitor_daily_hash`) peut consulter plusieurs bookmakers ou pays le même jour ; sommer des lignes détaillées surestimerait `COUNT(DISTINCT visitor_daily_hash)`.
   - `aggregate-metrics` recalcule de façon transactionnelle toute la fenêtre `[fromDate, toDate]` (`DELETE` + `INSERT` idempotent) et produit :
     - `day_total` pour la vue globale,
     - `day_country` pour les filtres pays,
     - `breakdown` pour la ventilation `(bookmaker_id, offer_id, campaign_id)` et le classement des offres.
2. **Portée PostgreSQL dédiée `stats_aggregator` sous `bonuvo_app`**
   - La tâche `POST /api/cron/aggregate-metrics` s'exécute via `withAppDb({ scope: "stats_aggregator" })` avec RLS forcée : lecture autorisée des faits bruts et écriture limitée à `daily_metrics`.
   - Aucune lecture libre ni mutation sur `profiles`, `audit_log` ou `settings` n'est possible depuis cette portée.
3. **Verrou distribué Redis + secret en temps constant (`CRON_SECRET`)**
   - L'endpoint vérifie `Authorization: Bearer <secret>` ou `x-cron-secret` par `crypto.timingSafeEqual`.
   - Un verrou Redis (`NX EX 300`, libération conditionnelle par jeton) empêche toute exécution concurrente ; en l'absence de Redis en environnement local/test uniquement, un verrou en mémoire déterministe prend le relais.
4. **Honnêteté stricte des taux et des réseaux sans suivi**
   - Toute division par zéro retourne `null` (affiché `« — »`).
   - Les bookmakers dont le réseau actif est en `tracking_mode = 'none'` sans conversion enregistrée affichent `« — »` sur les métriques partenaires et une note explicite dans `FreshnessNote`.
5. **Recharts pour la visualisation & export CSV assaini**
   - `TimeSeriesChart` utilise `recharts` avec bascule jour / semaine / mois et palette conforme aux jetons CSS.
   - `GET /api/admin/export/[report]` exige `stats.read` + `stats.export` (+ TOTP `aal2`), neutralise les formules Excel (`=`, `+`, `-`, `@`), exclut toute empreinte (`ip_hash`, `visitor_daily_hash`, `anon_session_hash`, `external_player_id`) et trace chaque export dans `audit_log`.
