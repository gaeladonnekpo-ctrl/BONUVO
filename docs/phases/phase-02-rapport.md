# Rapport de Phase 2 — Authentification, rôles et socle de sécurité (BONUVO)

**Branche** : `feat/phase-2-auth-security` (basée sur `feat/phase-1-design-system`)  
**Statut** : **Validée par l'utilisateur — socle auth/sécurité complet et prouvé en live ; configuration SMTP/domaine propre reportée avant mise en production (Phase 8)**

---

## 1. Résumé

La Phase 2 met en place et valide en conditions réelles l'infrastructure complète d'authentification côté serveur, de contrôle d'accès par rôles (RBAC + TOTP AAL2), de moindre privilège PostgreSQL et de sécurité :

- **Base de données & moindre privilège** : 8 tables (`profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`, `consents`, `audit_log`, `security_events`), migrations versionnées (`0001_lucky_harpoon.sql`, `0002_phase2_rls_and_security.sql`, `0003_fix_actor_id_helper.sql`) appliquées sur la base Supabase de développement (`BONUVO BASE`), rôle `bonuvo_app` (`NOLOGIN NOBYPASSRLS`) via `withAppDb()`, RLS active et forcée (`FORCE ROW LEVEL SECURITY`), immuabilité SQL sur `consents`/`audit_log`/`security_events`, et seed idempotent (`5` rôles, `16` permissions, `41` associations).
- **Authentification serveur (`Supabase Auth`) & garde à 2 niveaux** : `createServerClient` strictement serveur avec cookies `HttpOnly`, `SameSite=Lax`, `Secure` hors `local`, aucune variable `NEXT_PUBLIC_SUPABASE_*` utilisée ou bundlée côté client, politique mot de passe >= 12 caractères, révocation globale sur réinitialisation, garde niveau 1 dans `src/proxy.ts` et niveau 2 dans les layouts/pages `/compte`, `/admin` et `src/server/auth/guards.ts`.
- **Rate limiting, audit, e-mails & interfaces** : limitation distribuée `@upstash/ratelimit` (`upstash-kv-copper-pillar`) couvrant les 7 seuils auth de la section 11 (`429` + `Retry-After`), journalisation `logAudit()` / `logSecurityEvent()` avec hachage HMAC-SHA256 des IP (`src/server/security/ip.ts`) et masquage des secrets (`redact.ts`), route `POST /api/webhooks/email` signée (fenêtre 5 min), script `scripts/create-super-admin.ts`, composants (`AuthForm`, `PasswordField`, `OtpInput`, `TotpForm`) et 6 pages bilingues (`/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation`, `/verification`, `/double-authentification`).
- **Services externes & Preview Vercel configurés** : `Supabase Auth` (Site URL `https://bonuvo.vercel.app/`, redirections callback local/prod/preview, confirmation d'e-mail, politique 12+ car., TOTP MFA, SMTP personnalisé Resend), `Upstash Redis` (plan gratuit `upstash-kv-copper-pillar` connecté à Vercel + `.env.local`, prise en charge native de `KV_REST_API_URL` / `KV_REST_API_TOKEN` dans `src/server/env-schema.ts`), `Resend` (`BONUVO <onboarding@resend.dev>`) et `IP_HASH_SECRET` distinct par environnement.

---

## 2. Critères d'acceptation

| Critère                                                                                 | Statut     | Vérification / Preuve                                                                                                                                                                                                                                      |
| --------------------------------------------------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fournisseur Auth côté serveur uniquement (`HttpOnly`, `SameSite=Lax`, `Secure`)         | **Validé** | `src/server/auth/supabase.ts` + callback live vérifié (`HttpOnly; SameSite=Lax`) + contrôle E3 (`0` clé serveur dans `.next/static`)                                                                                                                       |
| Rôle DB moindre privilège `bonuvo_app` distinct du rôle de migration (`D2`)             | **Validé** | `tests/integration/db-security.test.ts` : `DROP TABLE` refusé sur Postgres réel                                                                                                                                                                            |
| RLS active et forcée sur toutes les tables Phase 2 (`D3`) et journaux immuables (`D8`)  | **Validé** | `tests/integration/db-security.test.ts` : `0` ligne sans contexte, `UPDATE`/`DELETE` refusés                                                                                                                                                               |
| Aucune élévation de privilèges vers `super_admin` (`B7`)                                | **Validé** | `tests/unit/auth-rbac.test.ts` + contrainte RLS SQL dans `db-security.test.ts`                                                                                                                                                                             |
| Six connexions en 1 min depuis une IP → `429` + événement sécurité (`R1`)               | **Validé** | Testé en live sur **Vercel Preview** (`/fr/connexion`) : tentatives 1–5 → `401 INVALID_CREDENTIALS`, tentative 6 → **`429 RATE_LIMITED`** (`Retry-After: 900`) + événement DB `login_rate_limited` (`high`)                                                |
| Aucune route `/admin` ne répond `200` sans rôle ni TOTP `aal2`                          | **Validé** | Membre authentifié sur `/fr/admin` → `307`, `super_admin` `aal1` → `307 /fr/double-authentification`, `super_admin` `aal2` → `200`, non-authentifié sur Preview → `307 /fr/connexion` (`admin/design` → `404`)                                             |
| Jeton de réinitialisation à usage unique + révocation globale des sessions (`A4`, `A8`) | **Validé** | Vérifié en conditions réelles contre Supabase Auth + Upstash : rejeu OTP et rejeu `POST /api/auth/reset-password` rejetés, session précédente immédiatement invalidée (`307 /fr/connexion`)                                                                |
| 6 pages auth accessibles WCAG 2.1 AA sans débordement à `375 px`                        | **Validé** | `tests/e2e/phase2-auth.spec.ts` (Axe `0` critique/sérieux, `0` débordement horizontal)                                                                                                                                                                     |
| Rate limiting fonctionnel sur la prévisualisation déployée (`Vercel Preview`)           | **Validé** | Test live navigateur sur `bonuvo-git-feat-phase-2-auth-security-dash-saa-s.vercel.app` (`13:57:16`–`13:57:45 GMT`) + trace `login_rate_limited` vérifiée en base                                                                                           |
| Parcours live `inscription -> e-mail -> vérification -> connexion -> TOTP` + livraison  | **Validé** | Parcours E2E complet exécuté sur instance réelle (`Supabase Auth`, `Resend`, `Upstash`, `BONUVO BASE`), promotion `super_admin` (`gaeladonnekpo@gmail.com`) et 2 e-mails Resend vérifiés `Delivered` (`Confirm your email address`, `Reset your password`) |

---

## 3. Tests

### 3.1 Suite automatisée (CI & locale)

- **Formatage (`npm run format:check`)** : OK (`All matched files use Prettier code style!`)
- **Lint (`npm run lint`)** : OK (`0` erreur)
- **Typage (`npm run typecheck`)** : OK (`tsc --noEmit`)
- **Tests unitaires et composants (`npm run test:unit`)** : `12` fichiers, `48` tests passés (incluant la prise en charge `KV_REST_API_URL` / `KV_REST_API_TOKEN` dans `tests/unit/env.test.ts`).
- **Tests d'intégration PostgreSQL (`npm run test:integration`)** : `1` fichier, `1` test passé sur `BONUVO BASE` (rollback transactionnel) prouvant `D2`, `D3`, `D8` et `B7`.
- **Build de production (`npm run build`)** : OK (`Next.js 16.4.6`, `42/42` pages générées).
- **Tests E2E Playwright (`npm run test:e2e`)** : `13` tests passés (`smoke.spec.ts`, `phase1-ui.spec.ts`, `phase2-auth.spec.ts`).

### 3.2 Vérifications live (Preview Vercel, Supabase Auth, Upstash Redis, Resend)

- **Vercel Preview (`bonuvo-git-feat-phase-2-auth-security-dash-saa-s.vercel.app`, commit `99f3993`)** :
  - `GET /api/health` → `200` (`{"status":"ok","app":"ok","database":"ok",...}`)
  - `GET /fr/admin` (anonyme) → `307 /fr/connexion?next=%2Ffr%2Fadmin`
  - `GET /fr/admin/design` → `404`
  - `GET /fr/connexion` → `200` (`0` requête réseau `>= 400`, `0` exception JS, en-têtes HSTS / `X-Frame-Options: DENY` / `nosniff` / `CSP-Report-Only` présents)
  - `POST /api/auth/sign-in` x 6 en `29 s` (`13:57:16`–`13:57:45 GMT`) → tentatives `1`–`5` en `401 INVALID_CREDENTIALS`, tentative `6` en **`429 RATE_LIMITED`** (`Retry-After: 900`), message UI affiché et événement `login_rate_limited` (`high`) écrit en base (`security_events`), puis clés temporaires Upstash de test nettoyées.
- **Parcours E2E live complet (`Supabase Auth` + `BONUVO BASE` + `Upstash` + `Resend`)** :
  - Inscription (`POST /api/auth/sign-up`) + consentements (`consents`: `analytics=false`, `notifications=true`, `marketing_email=false`) + audit (`user.registered`),
  - Confirmation callback (`GET /api/auth/callback`) posant des cookies `HttpOnly; SameSite=Lax`,
  - Membre vérifié : `/fr/compte` (`200`), `/fr/admin` (`307 /fr` + `permission_denied`),
  - Réinitialisation de mot de passe : usage unique (`400/401` au rejeu) et révocation globale de la session précédente (`307 /fr/connexion`),
  - Bootstrap `super_admin` via `scripts/create-super-admin.ts` pour `gaeladonnekpo@gmail.com` (`user.super_admin_bootstrapped`), enrôlement et validation TOTP RFC 6238 (`/fr/admin` passe de `307 /fr/double-authentification` en `aal1` à `200` en `aal2`), puis suppression du facteur TOTP de test et envoi d'un lien de réinitialisation afin que le propriétaire définisse son propre mot de passe et sa propre application TOTP.
- **Livraison Resend (`resend.com/emails`)** :
  - `"Confirm your email address"` (`onboarding@resend.dev` → `gaeladonnekpo@gmail.com`) : **`Delivered`** (`14:14`).
  - `"Reset your password"` (`onboarding@resend.dev` → `gaeladonnekpo@gmail.com`) : **`Delivered`** (`14:15`).

---

## 4. Sécurité

- **Contrôle E3 (bundle client)** : `0` clé serveur (`SUPABASE_*`, `UPSTASH_REDIS_*`, `RESEND_API_KEY`, `IP_HASH_SECRET`, `DATABASE_URL`) présente dans `.next/static`.
- **Contrôles D2, D3, D8, B7** : vérifiés contre PostgreSQL `17.11` réel via `test:integration`.
- **Contrôles V1–V5, E6, B8** : schémas Zod (`12+` car. et denylist), protection CSRF (`Origin` / `Sec-Fetch-Site`), plafond corps HTTP (`16 Ko` sur auth, `64 Ko` sur webhook e-mail), blocage open-redirect (`sanitizeRelativeRedirect`), redaction logs/audit (`redactRecord`), vérification HMAC webhook Resend avec fenêtre `<= 5 min`.
- **Audit des dépendances (`npm audit --audit-level=high`)** : `0` vulnérabilité élevée/critique (`11` vulnérabilités `moderate` connues et préexistantes dans l'outillage de dev `drizzle-kit` / `typescript-eslint`).

---

## 5. Décisions

- **ADR-0002** (`docs/decisions/ADR-0002-design-system-i18n.md`) : statut `Validé par l'utilisateur avant démarrage de la Phase 2`.
- **ADR-0003** (`docs/decisions/ADR-0003-auth-security.md`) : soumis à validation humaine finale (Supabase Auth 100 % serveur + cookies `HttpOnly`, Route Handlers `/api/auth/*`, rôle `bonuvo_app` + helpers `private.*`, Upstash Redis incluant les alias `KV_REST_API_*` de Vercel, Resend SMTP + webhooks).

---

## 6. Écarts

- La validation stricte des variables externes s'impose au démarrage en `preview` et `production` (`E4`) ; en `local` / CI sans secrets externes, leur absence est tolérée et tout adaptateur non configuré retourne `503 SERVICE_NOT_CONFIGURED`.
- Des endpoints `/api/auth/*` complètent les Server Actions `src/modules/auth/actions.ts` afin de renvoyer un statut HTTP `429` avec `Retry-After` et de supporter les garde-fous CSRF/taille de corps uniformes.
- `KV_REST_API_URL` / `KV_REST_API_TOKEN` (noms injectés par l'intégration Upstash du Marketplace Vercel) sont normalisés automatiquement vers `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` dans `src/server/env-schema.ts`.

---

## 7. Dette et risques

- **Domaine expéditeur e-mail (`onboarding@resend.dev`)** : tant qu'un domaine personnalisé BONUVO n'est pas vérifié dans Resend, les e-mails sortants ne peuvent être livrés qu'à l'adresse propriétaire du compte Resend (`gaeladonnekpo@gmail.com`). À configurer avant toute ouverture publique en production (Phase 8).
- **Durcissement CSP en Phase 8** : la console Preview en mode `Content-Security-Policy-Report-Only` signale les scripts inline d'hydratation Next.js et `eval` de Zod ; il faudra passer à des nonces par requête avant d'activer une politique `Content-Security-Policy` bloquante en Phase 8.
- **Webhook rebond e-mail (`RESEND_WEBHOOK_SECRET`)** : non configuré tant qu'un domaine d'envoi personnalisé n'est pas actif (l'endpoint `POST /api/webhooks/email` répond proprement `503` tant que le secret est absent).
- **`CI` GitHub Actions** : exécute `test:unit` et `test:e2e` sans PostgreSQL live ; `test:integration` est exécuté localement contre la base de développement.

---

## 8. Actions restantes côté utilisateur avant mise en production (non bloquantes pour Phase 3)

1. Valider **`ADR-0003`** (`docs/decisions/ADR-0003-auth-security.md`) et ce rapport de Phase 2 pour autoriser le passage en **Phase 3 — Back-office et saisie du catalogue**.
2. À votre convenance avant d'utiliser `/fr/admin` en phase suivante : finaliser votre mot de passe personnel via le lien reçu dans votre boîte `gaeladonnekpo@gmail.com` (ou via `/fr/mot-de-passe-oublie`) et scanner votre propre QR code TOTP lors de votre première connexion `super_admin` sur `/fr/double-authentification` (une fois la branche fusionnée ou sur l'environnement local/Preview).
3. Vérifier un domaine d'envoi BONUVO dans Resend (Phase 8 / pré-lancement public) et configurer `RESEND_WEBHOOK_SECRET`.

---

## 9. Suite

- Validation humaine d'**ADR-0003** et de la **Phase 2**, puis fusion de `feat/phase-2-auth-security` et ouverture de la **Phase 3 — Back-office et saisie du catalogue**.
