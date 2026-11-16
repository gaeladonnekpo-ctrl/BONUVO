# Rapport de Phase 0 — Analyse de l'environnement, architecture et fondations

- **Projet** : BONUVO
- **Phase** : Phase 0 (`Plan.md`, sections 9 et 16)
- **Date** : 2026-11-16
- **Statut global** : **Livré localement, base Supabase dev reliée/migrée et déploiement Vercel en ligne vérifié `200 OK` — 2 actions humaines restantes** (push branche avec scope GitHub `workflow` pour CI + validation humaine ADR/rapport)

---

## 1. Résumé de la phase

La Phase 0 a posé l'ensemble des fondations techniques du socle BONUVO sans anticiper les tables métier des phases suivantes :

- **Environnement inspecté** : Windows 11 (`Win32NT 10.0.26300.0`), PowerShell `5.1.26100.9818`, `node v26.13.0`, `npm 11.20.0`, `git 2.56.0.windows.4`, `gh 2.103.3` (compte `gaeladonnekpo-ctrl`). Absents du poste : `pnpm`, `vercel`, `supabase`, `docker`, `psql`.
- **Socle applicatif initialisé** : Next.js `16.4.6` (App Router), React `19.3.1`, TypeScript strict (`6.0.3` + `noUncheckedIndexedAccess`), Tailwind CSS `4.3.5`, ESLint `9.39.5`, Prettier `3.10.1`, Zod `4.6.7`, `server-only 0.0.1`.
- **Base de données & Supabase reliés** : Drizzle ORM `0.45.4`, `drizzle-kit 0.31.11`, `postgres 4.1.1` (`prepare: false` + nettoyage des paramètres de pooler via [`src/server/db/connection-config.ts`](../../src/server/db/connection-config.ts)), première migration SQL vide [`drizzle/0000_init.sql`](../../drizzle/0000_init.sql) exécutée avec succès sur le projet Supabase **`BONUVO BASE`** (`sxdgzqicwjcfvwjikpwg`, région `eu-west-3`, Postgres `17.11`).
- **Environnement & démarrage sûr** : séparation serveur/client dans [`src/server/env-schema.ts`](../../src/server/env-schema.ts) et [`src/server/env.ts`](../../src/server/env.ts) (compatible avec `DATABASE_URL` et la variable `POSTGRES_URL` synchronisée par Supabase sur Vercel), vérification au démarrage Node dans [`src/instrumentation.ts`](../../src/instrumentation.ts) et CLI [`scripts/check-env.ts`](../../scripts/check-env.ts). `.env.local` configuré localement et strictement ignoré par Git.
- **Routes Phase 0** : accueil provisoire bilingue `src/app/[locale]/(public)/page.tsx` (`/fr`, `/en`, redirection `/` -> `/fr`) affichant `BONUVO` et `BONUVO: SMART OFFERS. BETTER CHOICES.`, et route [`src/app/api/health/route.ts`](../../src/app/api/health/route.ts).
- **Industrialisation, sécurité & déploiement en ligne** : Git (`main` + `feat/phase-0-foundations`), Husky + `lint-staged` + Conventional Commits, en-têtes HTTP dans [`next.config.ts`](../../next.config.ts), workflows GitHub Actions [`ci.yml`](../../.github/workflows/ci.yml) et [`security.yml`](../../.github/workflows/security.yml), projet Vercel **`bonuvo`** (`prj_Dovr25rL558rN0pTmHIf5XK0nBqL`) relié à `gaeladonnekpo-ctrl/BONUVO` et à Supabase (`Production`, `Preview`, `Development` synchronisés), déploiement vérifié en ligne (`dpl_26x4tqSoBuTCdVnPfGYBiw85LkL2`).

---

## 2. Critères d'acceptation vérifiés

| Critère (`Plan.md` Phase 0)                                       | État        | Preuve / Observation                                                                                            |
| :---------------------------------------------------------------- | :---------- | :-------------------------------------------------------------------------------------------------------------- |
| Inspection de l'environnement consignée                           | Validé      | Consignée dans ce rapport (section 1)                                                                           |
| ADR-0001 rédigé avec versions figées et soumis à validation       | Validé\*    | [`docs/decisions/ADR-0001-stack.md`](../decisions/ADR-0001-stack.md) (\*validation humaine attendue)            |
| Next.js 16 + TS strict + Tailwind 4 + ESLint + Prettier + `@/*`   | Validé      | `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `postcss.config.mjs`                       |
| `src/server/env.ts` + `.env.example` + `.gitignore` `.env*`       | Validé      | Échec explicite sans variables vérifié (`env:check` & `next start`) ; `.env.example` vide ; `.env.local` ignoré |
| Drizzle ORM + PostgreSQL + 1re migration vide + script migrate    | Validé      | `drizzle/0000_init.sql` exécuté via `npm run db:migrate` sur Supabase `BONUVO BASE`                             |
| Git (`main`, `feat/*`, commits conventionnels, Husky/lint-staged) | Validé      | `feat/phase-0-foundations`, `.husky/pre-commit`, `.husky/commit-msg`, `scripts/check-commit-msg.mjs`            |
| CI + workflow sécurité (audit + scan secrets)                     | Configuré\* | `.github/workflows/ci.yml` et `security.yml` (\*push bloqué par manque du scope GitHub `workflow` sur `gh`)     |
| En-têtes de sécurité dans `next.config.ts`                        | Validé      | `poweredByHeader: false` + 5 en-têtes vérifiés en local et sur Vercel                                           |
| Page provisoire `BONUVO` + `GET /api/health`                      | Validé      | `200 OK` en local et en ligne sur Vercel (`/fr` et `/api/health` avec `database: "ok"`)                         |
| `lint`, `typecheck`, `test`, `build` verts localement             | Validé      | Tous exécutés après la dernière modification avec code de sortie `0`                                            |
| `lint`, `typecheck`, `test`, `build` verts en CI                  | En attente  | Attend le push de `feat/phase-0-foundations` avec le scope `workflow`                                           |
| Déploiement en ligne sur Vercel                                   | Validé      | Déploiement `READY` (`https://bonuvo-6bnugreeq-dash-saa-s.vercel.app`, alias `bonuvo.vercel.app`)               |
| Aucun secret dans l'historique Git                                | Validé      | `.gitignore` exclut `.env*` (hors `.env.example`) ; `.env.local` confirmé ignoré                                |
| Validation humaine de l'ADR et du rapport de phase                | En attente  | Requiert accord explicite de l'utilisateur avant Phase 1                                                        |

---

## 3. Tests exécutés et résultats

| Vérification                  | Commande / Méthode                                 | Résultat observé                                                                        |
| :---------------------------- | :------------------------------------------------- | :-------------------------------------------------------------------------------------- |
| Formatage Prettier            | `npm run format:check`                             | Succès (`0`), tous les fichiers conformes                                               |
| Linting ESLint                | `npm run lint`                                     | Succès (`0`), 0 erreur                                                                  |
| Typage TypeScript             | `npm run typecheck`                                | Succès (`0`), 0 erreur                                                                  |
| Tests unitaires (Vitest)      | `npm run test:unit`                                | Succès (`0`), 3 fichiers, 13 tests passés (`env`, `health`, `connection-config`)        |
| Cohérence migrations Drizzle  | `node --conditions=react-server .../bin.cjs check` | Succès (`0`), `Everything's fine`                                                       |
| Validation env locale (E4)    | `npm run env:check` (avec `.env.local`)            | Succès (`0`), `Environnement valide (APP_ENV=local, DATABASE_SSL=require)`              |
| Test négatif CLI & serveur E4 | `env:check` et `next start` sans variables         | Échec attendu (`EXIT=1`) avec liste explicite des clés manquantes                       |
| Migration Drizzle réelle      | `npm run db:migrate` contre `BONUVO BASE`          | Succès (`0`), `Migrations Drizzle appliquées avec succès.`                              |
| Build Next.js                 | `npm run build`                                    | Succès (`0`), routes `/`, `/fr`, `/en`, `/api/health`                                   |
| `/api/health` local en direct | `next start --port 3098` -> `GET /api/health`      | HTTP `200`, `{"status":"ok","app":"ok","database":"ok",...}`, `Cache-Control: no-store` |
| Smoke tests E2E (Playwright)  | `npm run test:e2e` (Chromium)                      | Succès (`0`), 3 tests passés (`/fr` 200, `/` -> `/fr`, `/api/health` sûr)               |
| Vérification Vercel en ligne  | `web_fetch_vercel_url` sur `/fr` et `/api/health`  | HTTP `200` sur `/fr` et `/api/health` (`database: "ok"`) + 5 en-têtes de sécurité       |
| Audit dépendances             | `npm audit --audit-level=high`                     | Succès (`0`), 0 vulnérabilité `high`/`critical`                                         |

---

## 4. Contrôles de sécurité vérifiés

- **E1 — Aucun secret versionné** : `.gitignore` ignore `.env` et `.env.*` (`.env.local` vérifié par `git check-ignore -v .env.local`), `.env.example` reste sans valeurs, vérification Git intégrée à `ci.yml` + TruffleHog dans `security.yml`.
- **E2 — Clés sensibles uniquement côté serveur** : `import "server-only";` en tête de chaque fichier sous `src/server/*`. Aucun secret sous `NEXT_PUBLIC_`.
- **E3 — `src/server/env.ts` sépare serveur et client** : `parseServerEnv` et `parseClientEnv` séparent strictement les secrets Postgres des clés publiques.
- **E4 — Échec explicite au démarrage** : `src/instrumentation.ts` appelle `getServerEnv()` au boot Node.js (hors `phase-production-build`) et arrête le serveur production (`process.exit(1)`) si une clé obligatoire manque.
- **P1 — En-têtes HTTP de sécurité** : `X-Powered-By` désactivé (`null` constaté) et `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Strict-Transport-Security`, `Permissions-Policy` vérifiés sur le déploiement Vercel.
- **P5 — Vulnérabilités de dépendances** : `npm audit --audit-level=high` à `0` vulnérabilité critique/élevée (11 modérées uniquement sur outillage dev `esbuild` via `drizzle-kit` et `minimatch` via `typescript-eslint`).
- **Protection de prévisualisation Vercel** : `ssoProtection` activé (`all_except_custom_domains`, `x-robots-tag: noindex`) empêchant l'accès public non authentifié pendant la construction.

---

## 5. Décisions prises / ADR

Voir [`docs/decisions/ADR-0001-stack.md`](../decisions/ADR-0001-stack.md) (statut `Proposé`, à valider par l'humain).

- Connexion PostgreSQL Vercel/Supabase via **Transaction Pooler IPv4 (`aws-0-eu-west-3.pooler.supabase.com:6543`)** avec `prepare: false` et suppression des paramètres de requête spécifiques au pooler (`supa`, `pgbouncer`, `sslmode`) avant instanciation de `postgres.js` (nécessaire car la résolution directe `db.*.supabase.co` est IPv6-only).

---

## 6. Écarts au plan et justifications

1. **`npm` au lieu de `pnpm`** : `pnpm` absent du poste (`npm 11.20.0` utilisé).
2. **Diagnostic OAuth plugin MCP Supabase Antigravity** : la connexion via le plugin MCP Supabase dans Antigravity échoue côté `api.supabase.com/v1/oauth/authorize` avec `{"message":"Unrecognized client_id"}` (bug DCR connu `supabase/mcp#355` / cache client). Contourné proprement via le tableau de bord Supabase + l'intégration officielle Vercel ↔ Supabase, sans bloquer BONUVO.
3. **Fallback `POSTGRES_URL` et variables système Vercel dans `env-schema.ts`** : l'intégration Vercel ↔ Supabase injecte `POSTGRES_URL` plutôt que `DATABASE_URL` ; `normalizeServerRawEnv` accepte `POSTGRES_URL` uniquement si `DATABASE_URL` est absent, tout en conservant le même échec strict E4 si aucune des deux n'est définie.
4. **Déploiement Vercel initial via `create_deployment` (fichiers sources)** : en attendant le push GitHub de `feat/phase-0-foundations` (bloqué localement faute de scope OAuth `workflow` sur `gh`), un déploiement initial a été créé directement via MCP Vercel pour valider le runtime Next.js + Supabase en ligne.

---

## 7. Dette technique et risques

- **Scope GitHub `workflow` manquant sur `gh`** : `feat/phase-0-foundations` doit encore être poussée avec le scope `workflow` afin de déclencher GitHub Actions (`CI` et `Security`) et la détection automatique des futurs push sur Git.
- **Premier déploiement Vercel tagué `production` sous protection SSO** : le premier déploiement créé avant existence d'une branche de prévisualisation poussée sur GitHub a reçu `target: "production"` et les alias `bonuvo.vercel.app` / `bonuvo-dash-saa-s.vercel.app`, tout en restant protégé par Vercel Authentication (`ssoProtection`). Les prochains push de branches `feat/*` sur GitHub produiront des déploiements `preview`.
- **Avertissement Vite 8 dans Vitest** : `vitest.config.ts` émet un avertissement CJS bénin sous Vite 8.
- **Vulnérabilités modérées dev-only** : `esbuild` (`drizzle-kit`) et `minimatch` (`typescript-eslint`) sans impact runtime.

---

## 8. Questions ouvertes pour l'humain

1. Pouvez-vous **autoriser le scope `workflow` sur GitHub** et pousser `feat/phase-0-foundations` (`gh auth refresh -h github.com -s workflow && git push -u origin feat/phase-0-foundations`), puis **activer la protection de la branche `main`** sur GitHub et vérifier que la CI est verte ?
2. **Validez-vous** [`docs/decisions/ADR-0001-stack.md`](../decisions/ADR-0001-stack.md) et le présent rapport pour clôturer la Phase 0 et passer à la **Phase 1** ?

---

## 9. Recommandation pour la suite

Dès que `feat/phase-0-foundations` sera poussée avec CI verte sur GitHub et que vous aurez validé l'ADR-0001 et ce rapport :

- **Clôturer la Phase 0** et démarrer la **Phase 1 — Modélisation complète de la base et migrations** (schéma Drizzle complet, index, contraintes d'unicité/intégrité, politiques RLS si requises et données de référence initiales).
