# Phase 7 — BONUVO AI : Rapport de phase

## Périmètre livré

1. **Modèle statistique Poisson déterministe v1.0** (`poisson-v1.0`) :
   - Spécification mathématique documentée dans `docs/ai/modele-v1.md` et décision d'architecture dans `docs/decisions/ADR-0008-bonuvo-ai-poisson-model.md`.
   - Calcul pur sans accès réseau (`src/modules/ai/model/poisson.ts`, `poisson-math.ts`), seuil strict `MIN_MATCHES_THRESHOLD = 6`, normalisation des probabilités en points de base (`sum = 1`), empreinte d'entrée canonique SHA-256 (`input_snapshot_hash`), calcul de Brier (`src/modules/ai/model/settle.ts`) et garde-fou lexical anti-promesses + vérification des nombres LLM (`src/modules/ai/model/language-guard.ts`).
2. **Fournisseur de données sportives & quota gratuit 100 req/j** :
   - Interface unique `SportsDataProvider` + adaptateur `ApiFootballProvider` (`src/modules/ai/providers/api-football.ts`) avec validation Zod stricte de chaque réponse avant écriture et arrêt propre (`partial_quota_stop`) sous la réserve configurée (`quota_reserve = 10`).
   - En l'absence de `API_FOOTBALL_KEY`, aucune donnée sportive n'est inventée : les écrans affichent un état vide explicite.
3. **Base de données PostgreSQL, RLS et immutabilité avant coup d'envoi** :
   - Schéma étendu dans `src/server/db/schema/ai-core.ts` & `ai-predictions.ts` (11 tables) et migrations `drizzle/0013_solid_adam_destine.sql` + `drizzle/0014_phase7_ai_rls.sql`.
   - Portée `ai_pipeline` ajoutée à `src/server/db/context.ts` et trigger PostgreSQL `private.guard_prediction_immutability()` interdisant l'insertion après coup d'envoi ainsi que la modification/suppression d'un pronostic verrouillé (`locked_at IS NOT NULL`).
4. **Orchestration Cron & Cache** :
   - Utilitaire partagé `verifyCronRequest` / `parseCronJsonBody` (`src/server/security/cron-auth.ts`) utilisé par `aggregate-metrics`, `ingest-fixtures`, `ingest-stats`, `compute-predictions` et `settle-predictions` avec verrou distribué et journalisation d'audit/sécurité.
5. **Interfaces publiques et back-office** :
   - Pages publiques `/[locale]/pronostics`, `/[locale]/pronostics/[fixtureId]`, `/[locale]/pronostics/historique` (+ aperçu `#pronostics` sur l'accueil) incluant `Disclaimer` (`18+`), `FixtureRow`, `ProbabilityBar`, `ConfidenceBadge`, `StatsTable`, `HeadToHead`, `AccuracyChart`.
   - Back-office protégé (permission `predictions.manage` + TOTP) : `/admin/pronostics` et `/admin/ingestion` accessibles depuis le menu latéral.

## Vérifications exécutées

- Vérification de longueur `<= 300` lignes sous `src/`.
- Formatage Prettier, typage `tsc --noEmit`, ESLint.
- Tests unitaires (`phase7-ai.test.ts`), tests d'intégration RLS PostgreSQL (`ai-rls.test.ts`), build de production et tests E2E Playwright (`phase7-ai.spec.ts` incluant audit axe-core WCAG 2.0 AA).
