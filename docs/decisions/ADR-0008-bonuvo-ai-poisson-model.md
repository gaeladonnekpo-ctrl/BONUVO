# ADR-0008 : Pipeline d'ingestion, modèle Poisson v1.0 et immuabilité BONUVO AI (Phase 7)

- **Statut** : Acceptée
- **Date** : 2026-11-17
- **Phase** : Phase 7 — BONUVO AI

## Contexte

La Phase 7 doit publier des pronostics football transparents, reproductibles, verrouillés avant le coup d'envoi et réglés objectivement sans aucune bibliothèque ML opaque ni donnée sportive fabriquée.

## Décisions

1. **Adaptateur fournisseur unique (`SportsDataProvider`) + validation Zod stricte**
   - `ApiFootballProvider` encapsule tous les appels HTTP vers `v3.football.api-sports.io` avec `API_FOOTBALL_KEY` exclusivement côté serveur.
   - Toutes les réponses sont validées via Zod avant insertion ; les tâches s'arrêtent proprement à l'approche du quota journalier (`quota_reserve`).
2. **Modèle pur `poisson-v1.0` sans dépendance réseau**
   - `src/modules/ai/model/poisson.ts` prend uniquement des instantanés de statistiques en entrée, applique le seuil minimal (`>= 6` matchs joués par équipe), calcule les trois marchés (`1x2`, `over_under_25`, `btts`) à somme strictement égale à `1` et produit une empreinte SHA-256 (`input_snapshot_hash`).
3. **Verrouillage et non-création après coup d'envoi garantis par PostgreSQL**
   - Un trigger PostgreSQL sur `public.predictions` rejette toute création après `fixtures.kickoff_at` et interdit toute modification ou suppression lorsque `locked_at IS NOT NULL`.
   - Les règlements (`won`, `lost`, `void` + score de Brier) s'écrivent exclusivement dans la table 1-1 `prediction_results`, préservant l'intégrité historique de `predictions`.
4. **Sécurité back-office, cron et conformité éditoriale**
   - `POST /api/cron/{ingest-fixtures,ingest-stats,compute-predictions,settle-predictions}` partagent `cron-auth.ts` (`CRON_SECRET` en temps constant + verrou distribué Redis) et s'exécutent sous la portée RLS `ai_pipeline`.
   - Un filtre lexical bloque tout terme trompeur (« sûr », « garanti », « gain assuré ») à la génération et à la publication, et chaque vue publique affiche `Disclaimer` + mention `18+`.
