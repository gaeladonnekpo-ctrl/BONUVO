# ADR-0003 : Authentification côté serveur, RBAC, RLS et socle de sécurité (Phase 2)

- **Statut** : Validé par l'utilisateur pour clôture de Phase 2 (configuration d'un domaine/SMTP propre reportée en fin de projet avant mise en production publique)
- **Date** : 2026-11-16
- **Contexte** : Implémentation de la Phase 2 décrite dans [Plan.md](../../Plan.md) suite à la validation d'[ADR-0001](./ADR-0001-stack.md) et d'[ADR-0002](./ADR-0002-design-system-i18n.md).

## 1. Dépendances Phase 2 figées

Versions épinglées à l'exact (`--save-exact`) :

- `@supabase/supabase-js` : `2.119.0`
- `@supabase/ssr` : `0.12.7`
- `@upstash/ratelimit` : `2.2.1`
- `@upstash/redis` : `1.41.0`
- `resend` : `6.38.1`

## 2. Authentification 100 % côté serveur (Supabase Auth)

- **Aucun client navigateur Supabase (`createBrowserClient`)** et aucune variable `NEXT_PUBLIC_SUPABASE_*` exposée au navigateur : toutes les opérations d'authentification (`signUp`, `signIn`, `signOut`, récupération, réinitialisation, TOTP MFA) passent exclusivement côté serveur via `@supabase/ssr` (`createServerClient`) et `@supabase/supabase-js` admin (service role serveur uniquement).
- **Cookies de session durcis** : `httpOnly: true`, `sameSite: "lax"`, `secure: true` hors environnement `local` (`APP_ENV !== "local"`), `path: "/"`.
- **Vérification cryptographique de session** : `getClaims()` / `getUser()` côté serveur (jamais `getSession()` seul pour autoriser une route ou action).
- **Révocation sur changement de mot de passe** : appel à `signOut({ scope: "global" })` / révocation admin lors de la réinitialisation du mot de passe.
- **TOTP obligatoire pour l'administration** : niveau d'assurance `aal2` requis pour les rôles d'administration (`super_admin`, `admin`, `editor`, `analyst`) avant d'accéder à `/admin`.

## 3. Contrôle d'accès à deux niveaux et RBAC

1. **Proxy Next.js 16 (`src/proxy.ts`)** : conserve le routage `next-intl`, rafraîchit la session Supabase et bloque l'accès direct aux segments `/[locale]/admin` et `/[locale]/compte` sans session valide (redirection vers `/[locale]/connexion`, tout en conservant le `404` de `/[locale]/admin/design` en production).
2. **Pages, Server Components, Server Actions et API (`src/server/auth/`)** : vérifient systématiquement `requireUser()`, `requireEmailVerified()`, `requireAdminAccess()` (rôle + `aal2`) et `requirePermission(permission)`.
3. **Prévention d'élévation de privilèges (contrôle B7)** : seul un `super_admin` peut attribuer/retirer le rôle `super_admin` ou modifier les rôles d'un titulaire `super_admin`.

## 4. Base de données : moindre privilège (`bonuvo_app`) et RLS forcée

- **Séparation des rôles** (`contrôle D2`) : `postgres` (via `DATABASE_URL`) reste strictement réservé aux migrations (`drizzle-kit` / `scripts/migrate.ts`). Les requêtes applicatives s'exécutent dans un contexte transactionnel basculant vers `bonuvo_app` (`NOLOGIN NOBYPASSRLS`, sans droits `CREATE`/`DROP`/`ALTER`/`TRUNCATE`).
- **RLS active et forcée (`FORCE ROW LEVEL SECURITY`) sur toutes les tables Phase 2** (`contrôle D3`) : politique de refus par défaut, helpers `SECURITY DEFINER` placés dans le schéma privé `private` avec `set search_path = ''` et révocation d'`EXECUTE` pour `PUBLIC`, `anon` et `authenticated`.
- **Tables immuables (`consents`, `audit_log`, `security_events`)** (`contrôle D8`) : droits `SELECT, INSERT` uniquement pour `bonuvo_app` + déclencheur SQL `private.prevent_immutable_mutation()` rejetant tout `UPDATE` ou `DELETE`.

## 5. Rate limiting HTTP `429`, e-mails et webhooks

- **Points d'entrée HTTP dédiés (`/api/auth/*`)** adossés aux mêmes schémas Zod et services que `src/modules/auth/actions.ts` : permet de renvoyer un statut HTTP `429` réel (avec en-tête `Retry-After`) dès le franchissement des seuils du tableau de la section 11 (`5/min/IP` sur connexion, `10/h/compte` avec blocage 1 h et e-mail d'alerte, etc.), tout en appliquant un contrôle `Origin`/`Host` anti-CSRF (`contrôle V3`).
- **Upstash Redis** (`@upstash/ratelimit` + `@upstash/redis`) pour le comptage distribué en fenêtre glissante et les verrous temporaires, utilisant l'en-tête IP de l'hébergeur (`x-vercel-forwarded-for`, jamais modifiable librement par le client). `src/server/env-schema.ts` accepte également les alias `KV_REST_API_URL` et `KV_REST_API_TOKEN` injectés automatiquement par l'intégration Upstash du Marketplace Vercel.
- **Resend** pour l'envoi d'e-mails d'alerte de sécurité, le SMTP personnalisé Supabase Auth et la réception signée des rebonds sur `POST /api/webhooks/email` (`resend.webhooks.verify` + fenêtre temporelle de 5 minutes).
