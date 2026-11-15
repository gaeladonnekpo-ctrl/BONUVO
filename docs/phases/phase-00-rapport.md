# Rapport de Phase 0 — Analyse de l'environnement, architecture et fondations

- **Projet** : BONUVO
- **Phase** : Phase 0 (`Plan.md`, sections 9 et 16)
- **Date** : 2026-11-16
- **Statut global** : **Livré localement et prêt pour CI/Revue — 2 critères externes en attente d'action humaine** (provisionnement Supabase dev + URL de prévisualisation Vercel + validation humaine ADR/rapport)

---

## 1. Résumé de la phase

La Phase 0 a posé les fondations techniques strictement nécessaires sans anticiper les tables ni la logique des phases suivantes :

- **Environnement inspecté** : Windows 11 (`Win32NT 10.0.26300.0`), PowerShell `5.1.26100.9818`, `node v26.13.0`, `npm 11.20.0`, `git 2.56.0.windows.4`, `gh 2.103.3` (connecté au compte `gaeladonnekpo-ctrl`). Absents du poste : `pnpm`, `vercel`, `supabase`, `docker`, `psql`.
- **Socle applicatif initialisé** : Next.js `16.4.6` (App Router), React `19.3.1`, TypeScript strict (`6.0.3` avec `noUncheckedIndexedAccess`), Tailwind CSS `4.3.5`, ESLint `9.39.5` (config flat + Prettier), Prettier `3.10.1`, Zod `4.6.7`, `server-only 0.0.1`.
- **Base de données préparée** : Drizzle ORM `0.45.4`, `drizzle-kit 0.31.11`, pilote `postgres 4.1.1` (`prepare: false`), première migration SQL vide [`drizzle/0000_init.sql`](../../drizzle/0000_init.sql) et script [`scripts/migrate.ts`](../../scripts/migrate.ts).
- **Environnement & démarrage sûr** : séparation serveur/public dans [`src/server/env-schema.ts`](../../src/server/env-schema.ts) et [`src/server/env.ts`](../../src/server/env.ts), vérification au démarrage du serveur Node dans [`src/instrumentation.ts`](../../src/instrumentation.ts) et CLI [`scripts/check-env.ts`](../../scripts/check-env.ts).
- **Routes Phase 0** : accueil provisoire bilingue `src/app/[locale]/(public)/page.tsx` (`/fr`, `/en`, redirection `/` -> `/fr`) affichant `BONUVO` et `BONUVO: SMART OFFERS. BETTER CHOICES.`, et endpoint de santé [`src/app/api/health/route.ts`](../../src/app/api/health/route.ts).
- **Industrialisation & sécurité** : Git initialisé (`main` + `feat/phase-0-foundations`), Husky + `lint-staged` + validation des commits conventionnels, en-têtes HTTP dans [`next.config.ts`](../../next.config.ts), workflows GitHub Actions [`ci.yml`](../../.github/workflows/ci.yml) et [`security.yml`](../../.github/workflows/security.yml).

---

## 2. Critères d'acceptation vérifiés

| Critère (`Plan.md` Phase 0)                                       | État       | Preuve / Observation                                                                                         |
| :---------------------------------------------------------------- | :--------- | :----------------------------------------------------------------------------------------------------------- |
| Inspection de l'environnement consignée                           | Validé     | Consignée dans ce rapport (section 1)                                                                        |
| ADR-0001 rédigé avec versions figées et soumis à validation       | Validé\*   | [`docs/decisions/ADR-0001-stack.md`](../decisions/ADR-0001-stack.md) (\*validation humaine attendue)         |
| Next.js 16 + TS strict + Tailwind 4 + ESLint + Prettier + `@/*`   | Validé     | `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `postcss.config.mjs`                    |
| `src/server/env.ts` + `.env.example` + `.gitignore` `.env*`       | Validé     | Échec explicite sans variables vérifié (`npm run env:check` & `npm run start`) ; `.env.example` sans valeur  |
| Drizzle ORM + PostgreSQL + 1re migration vide + script migrate    | Validé\*   | `drizzle/0000_init.sql`, `drizzle-kit check` vert (\*exécution sur Postgres réel en attente de Supabase)     |
| Git (`main`, `feat/*`, commits conventionnels, Husky/lint-staged) | Validé     | Branche `feat/phase-0-foundations`, `.husky/pre-commit`, `.husky/commit-msg`, `scripts/check-commit-msg.mjs` |
| CI + workflow sécurité (audit + scan secrets)                     | Configuré  | `.github/workflows/ci.yml` et `.github/workflows/security.yml`                                               |
| En-têtes de sécurité dans `next.config.ts`                        | Validé     | `poweredByHeader: false` + 5 en-têtes HTTP appliqués sur `/:path*`                                           |
| Page provisoire `BONUVO` + `GET /api/health`                      | Validé     | Vérifiés par tests unitaires et smoke tests Playwright (`3 passed`)                                          |
| `lint`, `typecheck`, `test`, `build` verts localement             | Validé     | Tous exécutés après la dernière modification avec code de sortie `0`                                         |
| `lint`, `typecheck`, `test`, `build` verts en CI                  | À vérifier | Déclenchement automatique au push vers `gaeladonnekpo-ctrl/BONUVO`                                           |
| Déploiement de prévisualisation en ligne                          | En attente | Requiert liaison manuelle sur le compte Vercel de l'utilisateur                                              |
| Aucun secret dans l'historique Git                                | Validé     | `.gitignore` exclut `.env*` (hors `.env.example`), aucun `.env` suivi, audit Git vérifié                     |
| Validation humaine de l'ADR et du rapport de phase                | En attente | Requiert accord explicite de l'utilisateur avant Phase 1                                                     |

---

## 3. Tests exécutés et résultats

Toutes les vérifications ci-dessous ont été exécutées après la dernière modification du code Phase 0 :

| Vérification                 | Commande                                            | Résultat attendu                           | Résultat observé                                                                                          |
| :--------------------------- | :-------------------------------------------------- | :----------------------------------------- | :-------------------------------------------------------------------------------------------------------- |
| Formatage Prettier           | `npm run format:check`                              | Tous les fichiers conformes                | Succès (`0`), tous les fichiers conformes                                                                 |
| Linting ESLint               | `npm run lint`                                      | 0 erreur, 0 avertissement                  | Succès (`0`), 0 erreur                                                                                    |
| Typage TypeScript            | `npm run typecheck`                                 | 0 erreur de typage strict                  | Succès (`0`), 0 erreur                                                                                    |
| Tests unitaires (Vitest)     | `npm run test:unit`                                 | Validation `env` (7) et `health` (3)       | Succès (`0`), 2 fichiers, 10 tests passés                                                                 |
| Cohérence migrations Drizzle | `node --conditions=react-server .../bin.cjs check`  | Journal/snapshot cohérents                 | Succès (`0`), `Everything's fine`                                                                         |
| Build Next.js (sans `.env`)  | `npm run build`                                     | Compilation sans faux besoin DB au build   | Succès (`0`), `/`, `/fr`, `/en`, `/api/health` générés                                                    |
| Test négatif CLI env (E4)    | `npm run env:check` (sans variables)                | Code `1` + noms des clés manquantes        | Succès du test négatif : code `1`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`                                 |
| Test négatif serveur (E4)    | `npm run start -- --port 3099` (sans variables)     | Arrêt code `1` en production sans fuite    | Succès du test négatif : code `1`, `[BONUVO] Configuration d'environnement invalide`                      |
| Smoke tests E2E (Playwright) | `npm run test:e2e` (Chromium, env local non secret) | `/fr` 200, `/` -> `/fr`, `/api/health` sûr | Succès (`0`), 3 tests passés (`/api/health` retourne `503`/`degraded` sans DB, sans URL Postgres exposée) |
| Audit dépendances            | `npm audit --audit-level=high`                      | 0 vulnérabilité `high` ou `critical`       | Succès (`0`), 0 vulnérabilité `high`/`critical`                                                           |

---

## 4. Contrôles de sécurité vérifiés

- **E1 — Aucun secret versionné** : `.gitignore` ignore `.env` et `.env.*` tout en autorisant `.env.example` (qui ne contient que des clés vides). Vérification automatique ajoutée dans `ci.yml` (`git ls-files '.env*'`) et workflow `security.yml` (TruffleHog).
- **E2 — Clés sensibles uniquement côté serveur** : tous les fichiers dans `src/server/` commencent par `import "server-only";`. Aucun secret n'utilise le préfixe `NEXT_PUBLIC_`.
- **E3 — `src/server/env.ts` sépare serveur et client** : `parseServerEnv` et `parseClientEnv` isolent strictement les variables publiques (`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_APP_NAME`) des secrets serveur (`DATABASE_URL`, `DATABASE_SSL`).
- **E4 — Échec explicite au démarrage** : `src/instrumentation.ts` appelle `getServerEnv()` au démarrage Node.js (hors phase de build `phase-production-build`) et quitte avec le code `1` en production si une variable manque ou est invalide (`DATABASE_SSL=disable` interdit hors `local`, `NEXT_PUBLIC_SITE_URL` obligatoirement `https://` si `APP_ENV=production`).
- **P1 — En-têtes HTTP de sécurité** : `next.config.ts` désactive `X-Powered-By` (`poweredByHeader: false`) et injecte `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload` et `Permissions-Policy`.
- **P5 — Vulnérabilités de dépendances** : `npm audit --audit-level=high` retourne `0` vulnérabilité critique ou élevée (11 vulnérabilités modérées uniquement dans les dépendances de développement `esbuild <=0.24.2` via `drizzle-kit` et `minimatch` via `typescript-eslint`, absentes du runtime de production).

---

## 5. Décisions prises / ADR

Voir [`docs/decisions/ADR-0001-stack.md`](../decisions/ADR-0001-stack.md) :

- **Stack figée** : Node `>=22` (CI sur `24` LTS), `npm 11.20.0`, Next.js `16.4.6`, React `19.3.1`, TypeScript `6.0.3`, Tailwind CSS `4.3.5`, Zod `4.6.7`, Drizzle ORM `0.45.4` + `drizzle-kit 0.31.11` + `postgres 4.1.1` (`prepare: false`), Vitest `5.1.0`, Playwright `1.65.1`, ESLint `9.39.5`, Prettier `3.10.1`, Husky `9.1.7`, `lint-staged 17.6.1`.
- **Compatibilité** : verrouillage de TypeScript en `6.0.3` et ESLint en `9.39.5` pour éviter les conflits de peer dependencies avec `eslint-config-next@16.4.6`.
- **Hébergement** : Vercel Hobby utilisé uniquement pour le développement et les aperçus (Phases 0–9) ; arbitrage Vercel Pro vs Cloudflare Workers maintenu avant la mise en production Phase 10.

---

## 6. Écarts au plan et justifications

1. **`npm` au lieu de `pnpm`** : `pnpm` n'était pas installé sur la machine ; `npm 11.20.0` a été utilisé et documenté dans `ADR-0001-stack.md`.
2. **Prévisualisation Vercel et Postgres Supabase non reliés par l'agent** : l'utilisateur a précisé ne pas donner accès à ses comptes Supabase et Vercel ; les configurations locales et CI sont prêtes pour un raccordement humain immédiat.
3. **Configuration CI factice locale pour E2E** : `.github/workflows/ci.yml` injecte `APP_ENV=local`, `DATABASE_URL=postgresql://127.0.0.1:5432/bonuvo_ci` et `DATABASE_SSL=disable` afin de démarrer `next start` et valider le smoke test Playwright sans base distante ni secret en CI (`/api/health` vérifié en mode dégradé `503` sans exposition d'URL).
4. **Condition `"react-server"` dans les scripts CLI** : `drizzle-kit`, `scripts/check-env.ts`, `scripts/migrate.ts` et `vitest.config.ts` activent la condition `react-server` (ou l'alias `server-only/empty.js` en test unitaire) pour respecter la présence obligatoire de `import "server-only";` dans `src/server/`.

---

## 7. Dette technique et risques

- **Absence de base PostgreSQL locale** : l'exécution réelle de `npm run db:migrate` et la réponse `200 OK` (`database: "ok"`) de `GET /api/health` n'ont pas encore pu être constatées contre une base active.
- **Avertissement Vite 8 dans Vitest** : `vitest.config.ts` émet un avertissement bénin de chargement CJS sous Vite 8 (`configLoader: 'native'`) ; renommable ultérieurement en `.mts` si souhaité.
- **Vulnérabilités modérées dev-only** : `esbuild` (`drizzle-kit`) et `minimatch` (`typescript-eslint`) signalent 11 avis modérés en `devDependencies`, sans impact sur le bundle serveur/client de production.
- **Risque CGU Vercel Hobby** : ne jamais ouvrir de trafic commercial sur le plan Hobby ; prévoir Vercel Pro ou Cloudflare Workers avant Phase 10.

---

## 8. Questions ouvertes pour l'humain

1. **Validez-vous** [`docs/decisions/ADR-0001-stack.md`](../decisions/ADR-0001-stack.md) (notamment l'orientation Supabase pour la Phase 2+) et le présent rapport de Phase 0 ?
2. Pouvez-vous **créer le projet Supabase de développement**, copier les clés dans `.env.local` (d'après `.env.example`), exécuter `npm run env:check` puis `npm run db:migrate`, et confirmer que `/api/health` retourne `200` en local ?
3. Pouvez-vous **lier le dépôt GitHub `gaeladonnekpo-ctrl/BONUVO` à Vercel**, renseigner les variables d'environnement de prévisualisation et partager l'URL de preview obtenue ?
4. Pouvez-vous **protéger la branche `main`** sur GitHub (Pull Request requise + vérification CI obligatoire) ?

---

## 9. Recommandation pour la suite

Une fois la base Supabase dev reliée en local (`db:migrate` exécuté), l'URL de prévisualisation Vercel vérifiée en ligne et l'ADR validé :

- **Clôturer la Phase 0** et autoriser le démarrage de la **Phase 1 — Modélisation complète de la base et migrations** (~45 tables Drizzle ORM, indexes, contraintes d'unicité/intégrité, RLS sur schémas exposés si applicable, jeux de données de référence ISO 3166 et catalogue initial).
