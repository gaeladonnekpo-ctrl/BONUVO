# ADR-0001 : Choix de la stack technique et versions figées (Phase 0)

- **Statut** : Proposé (en attente de validation humaine de Phase 0)
- **Date** : 2026-11-15
- **Contexte** : Initialisation du projet BONUVO selon [Plan.md](../../Plan.md).

## Décisions retenues

| Couche                   | Choix retenu                                                                                | Version figée                             | Statut dans le plan        |
| :----------------------- | :------------------------------------------------------------------------------------------ | :---------------------------------------- | :------------------------- |
| Runtime Node.js          | Node.js (>= 22.0.0 ; local `26.13.0`, CI `24` LTS)                                          | `>=22.0.0`                                | Confirmé                   |
| Gestionnaire de paquets  | `npm` (`11.20.0`, `pnpm` non installé sur le poste)                                         | `11.20.0`                                 | Confirmé                   |
| Framework applicatif     | Next.js (App Router, monolithe modulaire)                                                   | `16.4.6`                                  | Obligatoire                |
| Bibliothèque UI          | React + React DOM                                                                           | `19.3.1`                                  | Obligatoire                |
| Langage                  | TypeScript (mode strict + `noUncheckedIndexedAccess`)                                       | `6.0.3`                                   | Obligatoire                |
| Styles                   | Tailwind CSS + `@tailwindcss/postcss`                                                       | `4.3.5`                                   | Obligatoire                |
| Validation               | Zod                                                                                         | `4.6.7`                                   | Obligatoire                |
| ORM & migrations         | Drizzle ORM + `drizzle-kit` + `postgres` (`postgres.js`)                                    | `0.45.4` / `0.31.11` / `4.1.1`            | Recommandé                 |
| Tests unitaires / intég. | Vitest + `@vitejs/plugin-react` + Vite                                                      | `5.1.0` / `6.3.0` / `8.3.8`               | Obligatoire                |
| Tests E2E                | Playwright (`@playwright/test`)                                                             | `1.65.1`                                  | Obligatoire                |
| Qualité & formatage      | ESLint (`eslint-config-next`, `eslint-config-prettier`), Prettier                           | `9.39.5` / `16.4.6` / `10.1.8` / `3.10.1` | Obligatoire                |
| Crochets Git             | Husky + `lint-staged` + Conventional Commits                                                | `9.1.7` / `17.6.1`                        | Obligatoire                |
| Isolation serveur        | `server-only`                                                                               | `0.0.1`                                   | Obligatoire                |
| Base de données & Auth   | Supabase (Postgres + Auth + Stockage objet)                                                 | Phase 2+                                  | À valider par l’humain     |
| Hébergement              | Vercel Hobby (Phases 0–9 dev/preview) ; Pro vs Cloudflare Workers à trancher avant Phase 10 | —                                         | À confirmer avant Phase 10 |

## Justifications et vérifications de compatibilité

1. **TypeScript `6.0.3` au lieu de `7.0.2`** : `typescript@latest` pointe vers `7.0.2`, mais `eslint-config-next@16.4.6` embarque `typescript-eslint@^8.56.0` dont la contrainte de compatibilité est `typescript >=4.8.4 <6.1.0`. `6.0.3` évite tout conflit de graphe de dépendances.
2. **ESLint `9.39.5` au lieu de `10.15.0`** : `eslint-plugin-react@7.37.5`, `eslint-plugin-import@2.32.0` et `eslint-plugin-jsx-a11y@6.10.2` (embarqués par `eslint-config-next@16.4.6`) déclarent une compatibilité jusqu’à `eslint ^9`.
3. **Pilote Postgres (`postgres@4.1.1`) avec `prepare: false`** : compatible avec PostgreSQL standard et avec les poolers de connexion en mode transaction (Supabase PgBouncer).
4. **Validation d’environnement au démarrage** : `src/server/env.ts` valide via Zod et échoue explicitement si une variable obligatoire est absente ou invalide (`src/instrumentation.ts` à l’exécution serveur, `scripts/check-env.ts` en CLI).
5. **Hébergement et accès comptes** : Antigravity n’a pas accès aux comptes personnels Supabase et Vercel ; la création du projet Supabase de développement et la liaison du dépôt sur Vercel pour la prévisualisation sont effectuées par l’équipe humaine à l’issue de la Phase 0.

## Options écartées

- **NoSQL (MongoDB)** : écarté pour incapacité à garantir les contraintes relationnelles et l’unicité forte requises par les conversions/commissions.
- **Vercel Hobby en production publique** : écarté car les CGU Vercel interdisent l’usage commercial (donc un site d’affiliation public) sur le plan Hobby.
- **`@vercel/postgres` et `@vercel/kv`** : obsolètes / remplacés par Postgres standard/Supabase/Neon et Upstash Redis.
- **`pnpm`** : absent de l’environnement inspecté (`npm 11.20.0` installé).

## Points restant à confirmer par l’humain

- Validation finale de **Supabase** (vs Neon + Better Auth) pour les phases 2+.
- Validation de l’hébergement commercial avant Phase 10 (**Vercel Pro** vs **Cloudflare Workers**).
- Provisionnement du projet Postgres dev + `.env.local` et liaison Vercel du dépôt GitHub.
