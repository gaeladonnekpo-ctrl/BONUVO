# Audit de sécurité BONUVO — 41 contrôles & contrôles métier B1–B12 (Phase 9)

**Date d'audit** : 18 novembre 2026  
**Référentiel** : `Plan.md` section 11  
**Environnements vérifiés** : Local (`http://localhost:3000`) & Production (`https://bonuvo.vercel.app`)

---

## Catégorie 1 — Variables d'environnement et secrets (6)

| N°     | Contrôle                                                 |  Verdict  | Preuve vérifiée                                                                                                                                                                                    |
| :----- | :------------------------------------------------------- | :-------: | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E1** | Aucun secret dans le dépôt ni dans l'historique Git      | **PASSÉ** | Workflow `.github/workflows/security.yml` (TruffleHog OSS) et vérification des fichiers suivis.                                                                                                    |
| **E2** | Fichiers `.env*` ignorés ; `.env.example` sans valeur    | **PASSÉ** | `git ls-files '.env*'` retourne uniquement `.env.example`.                                                                                                                                         |
| **E3** | Aucun secret exposé au navigateur                        | **PASSÉ** | Scan sur `.next/static/**/*.js` (`SERVICE_ROLE`, `RESEND_API_KEY`, `IP_HASH_SECRET`, `TELEGRAM_BOT_TOKEN`, `API_FOOTBALL_KEY`, `postgres://postgres`) : `0` occurrence (`E3_CLIENT_BUNDLE_CLEAN`). |
| **E4** | Variables validées au démarrage                          | **PASSÉ** | `src/server/env-schema.ts` + `tests/unit/env.test.ts` (11/11 tests réussis).                                                                                                                       |
| **E5** | Secrets distincts par environnement, rotation documentée | **PASSÉ** | Variables locales (`.env.local`) distinctes des secrets Vercel Production ; procédure prévue au runbook Phase 10.                                                                                  |
| **E6** | Aucun secret dans les journaux, erreurs ou réponses      | **PASSÉ** | `src/server/security/redact.ts` + `tests/unit/security.test.ts` (6/6) + réponses `/api/health` (`81` octets neutres).                                                                              |

## Catégorie 2 — Sécurité de la base de données (8)

| N°     | Contrôle                                                              |   Verdict   | Preuve vérifiée                                                                                                                                                                                                                            |
| :----- | :-------------------------------------------------------------------- | :---------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **D1** | Connexions chiffrées, base non joignable sans authentification        |  **PASSÉ**  | `DATABASE_SSL=require` en production (`src/server/db/connection-config.ts`, `tests/unit/connection-config.test.ts`).                                                                                                                       |
| **D2** | Rôle applicatif au moindre privilège, distinct du rôle de migration   |  **PASSÉ**  | `bonuvo_app` utilisé via `SET LOCAL ROLE bonuvo_app` dans `withAppDb` ; `tests/integration/db-security.test.ts` prouve le refus de `DROP TABLE`.                                                                                           |
| **D3** | RLS activée sur toutes les tables, refus par défaut                   |  **PASSÉ**  | Requête `pg_tables` sur `schemaname = 'public'` : **52 tables, 0 table sans RLS**.                                                                                                                                                         |
| **D4** | Requêtes paramétrées uniquement                                       |  **PASSÉ**  | Drizzle ORM paramétré exclusivement (`tests/integration/*` + `tests/unit/public-offers-and-redirect.test.ts`).                                                                                                                             |
| **D5** | Données sensibles protégées                                           |  **PASSÉ**  | Mots de passe gérés par Supabase Auth ; IP hachées (`IP_HASH_SECRET`) ; jetons de désinscription HMAC-SHA256.                                                                                                                              |
| **D6** | Sauvegardes automatiques et restauration testée                       | **PARTIEL** | Base Supabase managée ; export logique/migrations versionnées `0000`–`0019` rejouées via `npm run db:migrate`. Restauration complète sur base vierge planifiée en Phase 10 sur le plan payant Supabase (accepté pour l'ouverture Phase 9). |
| **D7** | Migrations versionnées, aucune migration destructrice sans validation |  **PASSÉ**  | 20 migrations SQL versionnées dans `drizzle/0000` à `drizzle/0019` sous `drizzle/meta/_journal.json`.                                                                                                                                      |
| **D8** | Contraintes d'intégrité et journaux en insertion seule                |  **PASSÉ**  | `tests/integration/db-security.test.ts` prouve le refus d'`UPDATE`/`DELETE` sur `audit_log` ; `tests/integration/community-members-rls.test.ts` prouve le caractère append-only de `consents`.                                             |

## Catégorie 3 — Authentification et sessions (8)

| N°     | Contrôle                                                      |  Verdict  | Preuve vérifiée                                                                                                                                                                   |
| :----- | :------------------------------------------------------------ | :-------: | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A1** | Mots de passe hachés, politique 12 caractères                 | **PASSÉ** | Zod `signUpSchema` + `PasswordField` exigeant 12+ caractères (`tests/components/auth-components.test.tsx`).                                                                       |
| **A2** | Cookies de session `HttpOnly`, `Secure`, `SameSite`           | **PASSÉ** | `buildSessionCookieOptions` dans `src/server/auth/supabase.ts` (`httpOnly: true`, `sameSite: "lax"`, `secure: APP_ENV !== "local"`).                                              |
| **A3** | Vérification d'e-mail exigée avant les fonctions protégées    | **PASSÉ** | `requireEmailVerified` (`src/server/auth/guards.ts`) et test `tests/e2e/phase2-auth.spec.ts` (`/fr/compte` sans session -> redirection `/fr/connexion`).                          |
| **A4** | Jetons de réinitialisation à usage unique, réponses neutres   | **PASSÉ** | Flux Supabase Auth `resetPasswordForEmail` + réponses neutres sur `/api/auth/forgot-password`.                                                                                    |
| **A5** | Protection contre la force brute                              | **PASSÉ** | `tests/unit/auth-http.test.ts` : blocage `429` + `Retry-After: 900` à la 6e tentative.                                                                                            |
| **A6** | Autorisation vérifiée côté serveur sur chaque route et action | **PASSÉ** | `requireActionPermission` / `requireAdminAccess` dans toutes les actions et routes `/api/admin/*` (`tests/unit/auth-rbac.test.ts`, `tests/integration/catalog-security.test.ts`). |
| **A7** | Protection IDOR / BOLA                                        | **PASSÉ** | RLS `user_id = current_user_id()` + vérifications `actorId === targetUserId` dans `src/modules/members/*` (`tests/integration/community-members-rls.test.ts`).                    |
| **A8** | TOTP obligatoire pour l'administration ; sessions révoquées   | **PASSÉ** | `roleRequiresTotp` + vérification `aal2` + `tests/e2e/phase3-admin.spec.ts` & `phase7-ai.spec.ts`.                                                                                |

## Catégorie 4 — Validation côté serveur (6)

| N°     | Contrôle                                                 |  Verdict  | Preuve vérifiée                                                                                                                                                                                                                                                                                                                                 |
| :----- | :------------------------------------------------------- | :-------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **V1** | Schéma de validation Zod sur chaque action et route      | **PASSÉ** | Schémas Zod dédiés (`auth/schema.ts`, `offers/schema.ts`, `intelligence/schema.ts`, `members/newsletter-schema.ts`).                                                                                                                                                                                                                            |
| **V2** | Protection XSS & CSP bloquante                           | **PASSÉ** | Sanitisation serveur (`src/modules/community/sanitizer.ts`, `tests/unit/phase8-community-members.test.ts`) + `Content-Security-Policy` bloquant dans `next.config.ts` + `Content-Security-Policy-Report-Only` à nonce (`'self' 'nonce-…' 'strict-dynamic'`, sans `'unsafe-inline'`, `/api/csp-report`) rejoué (`tests/unit/csp-nonce.test.ts`). |
| **V3** | Protection CSRF                                          | **PASSÉ** | `checkSameOrigin` sur toutes les routes mutantes (`tests/unit/auth-http.test.ts`, `tests/e2e/phase2-auth.spec.ts`, `phase4-public-offers.spec.ts` -> `403`).                                                                                                                                                                                    |
| **V4** | Aucune redirection ouverte                               | **PASSÉ** | `sanitizeRelativeRedirect` (`tests/e2e/phase2-auth.spec.ts` sur `/api/auth/callback?next=https://evil.example`).                                                                                                                                                                                                                                |
| **V5** | Bornes sur tailles, longueurs et pagination              | **PASSÉ** | Rejet `413` > 16 Ko sur auth et > 8 Ko sur `/api/newsletter`, pagination bornée.                                                                                                                                                                                                                                                                |
| **V6** | Champs autorisés explicites, erreurs sans détail interne | **PASSÉ** | Validation Zod stricte + messages d'erreur neutres sans stacktrace ni détail SQL.                                                                                                                                                                                                                                                               |

## Catégorie 5 — Dépendances et packages (5)

| N°     | Contrôle                                                |  Verdict  | Preuve vérifiée                                                                                                         |
| :----- | :------------------------------------------------------ | :-------: | :---------------------------------------------------------------------------------------------------------------------- |
| **P1** | Fichier de verrouillage versionné (`package-lock.json`) | **PASSÉ** | `package-lock.json` suivi ; `npm ci` exécuté en CI (`.github/workflows/ci.yml`).                                        |
| **P2** | Aucune vulnérabilité élevée ou critique connue          | **PASSÉ** | `npm audit --audit-level=high` retourne `0` vulnérabilité critique ou élevée (exit `0`).                                |
| **P3** | Mises à jour de sécurité automatisées                   | **PASSÉ** | `.github/dependabot.yml` configuré pour `npm` et `github-actions` (hebdomadaire).                                       |
| **P4** | Chaque dépendance est justifiée et maintenue            | **PASSÉ** | `npm ls --depth=0` : 56 dépendances directes à jour (`next@16.4.6`, `react@19.3.1`, `drizzle-orm@0.45.4`, `zod@4.6.7`). |
| **P5** | Framework et Node.js sur des versions supportées        | **PASSÉ** | Node.js `v26.13.0` (`"engines": { "node": "26.x" }`, `.nvmrc` = `26`), Next.js `16.4.6`.                                |

## Catégorie 6 — Rate limiting (3)

| N°     | Contrôle                                          |  Verdict  | Preuve vérifiée                                                                                                                                                                                                               |
| :----- | :------------------------------------------------ | :-------: | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **R1** | Seuil de 5 connexions/min par IP, blocage à la 6e | **PASSÉ** | `AUTH_RATE_LIMIT_RULES.login_ip` (`limit: 5, windowSeconds: 60, lockSeconds: 900`), prouvé par `tests/unit/auth-http.test.ts`.                                                                                                |
| **R2** | Toutes les routes sensibles couvertes             | **PASSÉ** | `login_ip`, `login_account`, `signup_ip`, `forgot_password`, `reset_password`, `otp_account`, `resend_verification`, `media_upload`, `go_redirect`, `public_events`, `newsletter_crm`, `postback_ingest`, `webhook_provider`. |
| **R3** | Limitation distribuée Upstash & IP fiable         | **PASSÉ** | `createUpstashRateLimitBackend` + `extractTrustedClientIp` (`tests/unit/rate-limit.test.ts` & `tests/unit/security.test.ts`).                                                                                                 |

## Catégorie 7 — CORS (2)

| N°     | Contrôle                                              |  Verdict  | Preuve vérifiée                                                                                         |
| :----- | :---------------------------------------------------- | :-------: | :------------------------------------------------------------------------------------------------------ |
| **C1** | Aucune origine générique `*` avec identifiants        | **PASSÉ** | Vérification `OPTIONS /api/events` depuis `https://evil.example` : `access-control-allow-origin: null`. |
| **C2** | Requêtes préliminaires d'origines étrangères refusées | **PASSÉ** | Aucun en-tête CORS permissif renvoyé sur les requêtes tierces.                                          |

## Catégorie 8 — Téléchargements et fichiers (3)

| N°     | Contrôle                                              |  Verdict  | Preuve vérifiée                                                                                |
| :----- | :---------------------------------------------------- | :-------: | :--------------------------------------------------------------------------------------------- |
| **F1** | Type vérifié par contenu (PNG/JPEG/WebP), max 2 Mo    | **PASSÉ** | `file-type` + `sharp` dans `src/modules/media/service.ts` (`tests/unit/phase3-media.test.ts`). |
| **F2** | Stockage hors application, nom aléatoire, `nosniff`   | **PASSÉ** | Supabase Storage + `X-Content-Type-Options: nosniff` dans `next.config.ts`.                    |
| **F3** | Téléversement réservé, limité (20/h), EXIF supprimées | **PASSÉ** | Ré-encodage `sharp` sans EXIF + quota `20/h` (`tests/unit/phase3-media.test.ts`).              |

---

## Contrôles propres à BONUVO (B1–B12)

| N°      | Domaine                                 |  Verdict  | Preuve vérifiée                                                                                                             |
| :------ | :-------------------------------------- | :-------: | :-------------------------------------------------------------------------------------------------------------------------- |
| **B1**  | Liens d'affiliation                     | **PASSÉ** | `tests/integration/catalog-security.test.ts` (`links.manage` requis, validation hôte).                                      |
| **B2**  | Redirections `/go/[slug]`               | **PASSÉ** | `tests/e2e/phase4-public-offers.spec.ts` + `tests/unit/public-offers-and-redirect.test.ts`.                                 |
| **B3**  | Clics rafales & robots                  | **PASSÉ** | `isbot` + détection rafale (`src/server/tracking/bot-detect.ts`).                                                           |
| **B4**  | Conversions (`source NOT NULL`)         | **PASSÉ** | `tests/integration/affiliation-postbacks-rls.test.ts`.                                                                      |
| **B5**  | Déduplication conversions               | **PASSÉ** | `tests/unit/phase5-affiliation.test.ts` & `affiliation-postbacks-rls.test.ts`.                                              |
| **B6**  | Commissions & journal                   | **PASSÉ** | `tests/integration/affiliation-postbacks-rls.test.ts` + `audit_log`.                                                        |
| **B7**  | Élévation de privilèges impossible      | **PASSÉ** | `tests/integration/db-security.test.ts` + `tests/unit/auth-rbac.test.ts`.                                                   |
| **B8**  | Webhooks signés & fenêtre temporelle    | **PASSÉ** | `tests/e2e/phase5-affiliation.spec.ts` & `phase8-community-members.spec.ts`.                                                |
| **B9**  | Données sportives & verrouillage        | **PASSÉ** | `tests/integration/ai-rls.test.ts` + `tests/unit/phase7-ai.test.ts`.                                                        |
| **B10** | Fonctions IA déterministes & garde-fous | **PASSÉ** | `tests/unit/phase7-ai.test.ts` (termes interdits et nombres vérifiés).                                                      |
| **B11** | Éligibilité par pays                    | **PASSÉ** | `tests/e2e/phase4-public-offers.spec.ts` (`/fr/offres?pays=JP` -> CountryGate).                                             |
| **B12** | Tâches planifiées protégées             | **PASSÉ** | `tests/e2e/phase6-intelligence.spec.ts`, `phase7-ai.spec.ts`, `phase8-community-members.spec.ts` (`401`/`503` sans secret). |
