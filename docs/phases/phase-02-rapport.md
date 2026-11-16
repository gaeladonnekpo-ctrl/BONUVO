# Rapport de Phase 2 — Authentification, rôles et socle de sécurité (BONUVO)

**Branche** : `feat/phase-2-auth-security` (basée sur `feat/phase-1-design-system`)  
**Statut** : Implémentation et vérifications locales/DB complètes — **en attente des clés externes (`Supabase Auth`, `Upstash Redis`, `Resend`, `IP_HASH_SECRET`) pour exécution E2E live et validation humaine**

---

## 1. Résumé

La Phase 2 met en place l'infrastructure complète d'authentification côté serveur, de contrôle d'accès par rôles (RBAC + TOTP AAL2), de moindre privilège PostgreSQL et de sécurité :

- **Base de données & moindre privilège** : 8 tables (`profiles`, `roles`, `permissions`, `role_permissions`, `user_roles`, `consents`, `audit_log`, `security_events`), migrations versionnées (`0001_lucky_harpoon.sql`, `0002_phase2_rls_and_security.sql`, `0003_fix_actor_id_helper.sql`) appliquées sur la base Supabase de développement, rôle `bonuvo_app` (`NOLOGIN NOBYPASSRLS`) via `withAppDb()`, RLS active et forcée (`FORCE ROW LEVEL SECURITY`), immuabilité SQL sur `consents`/`audit_log`/`security_events`, et seed idempotent (`5` rôles, `16` permissions, `41` associations).
- **Authentification serveur (`Supabase Auth`) & garde à 2 niveaux** : `createServerClient` strictement serveur avec cookies `HttpOnly`, `SameSite=Lax`, `Secure` hors `local`, aucune variable `NEXT_PUBLIC_SUPABASE_*`, politique mot de passe >= 12 caractères, révocation globale sur réinitialisation, garde niveau 1 dans `src/proxy.ts` et niveau 2 dans les layouts/pages `/compte`, `/admin` et `src/server/auth/guards.ts`.
- **Rate limiting, audit, e-mails & interfaces** : limitation distribuée `@upstash/ratelimit` couvrant les 7 seuils auth de la section 11 (`429` + `Retry-After`), journalisation `logAudit()` / `logSecurityEvent()` avec hachage HMAC-SHA256 des IP (`src/server/security/ip.ts`) et masquage des secrets (`redact.ts`), route `POST /api/webhooks/email` signée (fenêtre 5 min), script `scripts/create-super-admin.ts`, composants (`AuthForm`, `PasswordField`, `OtpInput`, `TotpForm`) et 6 pages bilingues (`/connexion`, `/inscription`, `/mot-de-passe-oublie`, `/reinitialisation`, `/verification`, `/double-authentification`).

---

## 2. Critères d'acceptation

| Critère                                                                                 | Statut                                           | Vérification / Preuve                                                                                                                          |
| --------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Fournisseur Auth côté serveur uniquement (`HttpOnly`, `SameSite=Lax`, `Secure`)         | Validé                                           | `src/server/auth/supabase.ts` + contrôle E3 (`0` clé serveur dans `.next/static`)                                                              |
| Rôle DB moindre privilège `bonuvo_app` distinct du rôle de migration (`D2`)             | Validé                                           | `tests/integration/db-security.test.ts` : `DROP TABLE` refusé sur Postgres réel                                                                |
| RLS active et forcée sur toutes les tables Phase 2 (`D3`) et journaux immuables (`D8`)  | Validé                                           | `tests/integration/db-security.test.ts` : `0` ligne sans contexte, `UPDATE`/`DELETE` refusés                                                   |
| Aucune élévation de privilèges vers `super_admin` (`B7`)                                | Validé                                           | `tests/unit/auth-rbac.test.ts` + contrainte RLS SQL dans `db-security.test.ts`                                                                 |
| Six connexions en 1 min depuis une IP → `429` + événement sécurité (`R1`)               | Validé (doublures) / **En attente live Upstash** | `tests/unit/rate-limit.test.ts` + `tests/unit/auth-http.test.ts` (`429` + `Retry-After: 900`) ; test live en attente de `UPSTASH_REDIS_REST_*` |
| Aucune route `/admin` ne répond `200` sans rôle ni TOTP `aal2`                          | Validé                                           | `tests/e2e/phase2-auth.spec.ts` (`307` vers `/connexion`, `/admin/design` reste `404` en prod) + `guards.ts`                                   |
| Jeton de réinitialisation à usage unique + révocation globale des sessions (`A4`, `A8`) | Validé (doublures)                               | `tests/unit/rate-limit.test.ts` (`TOKEN_ALREADY_USED` + `signOut({ scope: "global" })`)                                                        |
| 6 pages auth accessibles WCAG 2.1 AA sans débordement à `375 px`                        | Validé                                           | `tests/e2e/phase2-auth.spec.ts` (Axe 0 critique/sérieux, 0 débordement)                                                                        |
| Rate limiting fonctionnel sur la prévisualisation déployée (`Vercel Preview`)           | **En attente utilisateur**                       | Requiert ajout des variables `SUPABASE_*`, `UPSTASH_REDIS_REST_*`, `RESEND_*`, `IP_HASH_SECRET` dans Vercel Preview                            |
| Parcours live `inscription -> e-mail reçu -> vérification -> connexion -> TOTP`         | **En attente utilisateur**                       | Requiert clés `Supabase Auth`, SMTP/API `Resend` et activation TOTP dans Supabase Dashboard                                                    |

---

## 3. Tests

Exécutés sur le code complet Phase 2 (`npm run db:migrate`, `npm run db:seed` x2, puis suite complète) :

- **Formatage (`npm run format:check`)** : OK (`All matched files use Prettier code style!`)
- **Lint (`npm run lint`)** : OK (`0` erreur)
- **Typage (`npm run typecheck`)** : OK (`tsc --noEmit`)
- **Tests unitaires et composants (`npm run test:unit`)** : `12` fichiers, `47` tests passés (`6.47s`), couvrant notamment `env.test.ts` (`10`), `security.test.ts` (`6`), `rate-limit.test.ts` (`6`), `auth-rbac.test.ts` (`3`), `auth-http.test.ts` (`1`), `auth-components.test.tsx` (`3`).
- **Tests d'intégration PostgreSQL (`npm run test:integration`)** : `1` fichier, `1` test passé (`7.49s`, rollback transactionnel sans donnée résiduelle) prouvant `D2`, `D3`, `D8` et `B7` sur la base Supabase `BONUVO BASE`.
- **Build de production (`npm run build`)** : OK (`Next.js 16.4.6`, `42/42` pages générées).
- **Tests E2E Playwright (`PORT=3097 npm run test:e2e`)** : `13` tests passés en `21.2s` (`smoke.spec.ts`, `phase1-ui.spec.ts`, `phase2-auth.spec.ts`) + vérification `ALLOW_DEV_SHOWCASE=1` (`1 passed`, `7.1s`).

---

## 4. Sécurité

- **Contrôle E3 (bundle client)** : recherche sur `.next/static` confirmant zéro présence de `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `UPSTASH_REDIS`, `RESEND_API_KEY`, `IP_HASH_SECRET` ou `DATABASE_URL`.
- **Contrôles D2, D3, D8, B7** : vérifiés contre PostgreSQL `17.11` réel via `test:integration`.
- **Contrôles V1–V5, E6, B8** : schémas Zod (`12+` car. et denylist), protection CSRF (`Origin` / `Sec-Fetch-Site`), plafond corps HTTP (`16 Ko` sur auth, `64 Ko` sur webhook e-mail), blocage open-redirect (`sanitizeRelativeRedirect`), redaction logs/audit (`redactRecord`), vérification HMAC webhook Resend avec fenêtre `<= 5 min`.
- **Audit des dépendances (`npm audit --audit-level=high`)** : code `0` (`0` vulnérabilité élevée/critique ; `11` vulnérabilités `moderate` déjà existantes sur les dépendances de dev `drizzle-kit` / `typescript-eslint`).

---

## 5. Décisions

- **ADR-0002** (`docs/decisions/ADR-0002-design-system-i18n.md`) : statut passé à `Validé par l'utilisateur avant démarrage de la Phase 2`.
- **ADR-0003** (`docs/decisions/ADR-0003-auth-security.md`) : documentation des choix Phase 2 (Supabase Auth 100 % serveur + cookies `HttpOnly`, Route Handlers `/api/auth/*` pour statuts `429` réels, rôle `bonuvo_app` + helpers `private.*` sans dépendance ACL au schéma `auth`, Upstash Redis + Resend).

---

## 6. Écarts

- La validation stricte des variables externes (`SUPABASE_*`, `UPSTASH_REDIS_REST_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `IP_HASH_SECRET`) s'impose au démarrage en `preview` et `production` (`E4`) ; en environnement `local` / CI sans clés externes, leur absence est tolérée au build et tout appel aux adaptateurs non branchés retourne explicitement `503 SERVICE_NOT_CONFIGURED` sans simulation factice.
- Des endpoints `/api/auth/*` complètent les Server Actions `src/modules/auth/actions.ts` afin de renvoyer un code HTTP `429` standard et mesurable (et non un payload Next.js `200`) lors du dépassement des seuils.

---

## 7. Dette et risques

- Les parcours E2E **réels** avec envoi effectif d'e-mail, création de session `HttpOnly` Supabase et limitation Upstash distribuée sur Vercel Preview restent non prouvés tant que les clés externes correspondantes n'ont pas été renseignées par l'équipe humaine dans `.env.local` et dans les variables Vercel Preview.
- `CI` GitHub Actions n'exécute que `test:unit` et `test:e2e` (sans conteneur PostgreSQL dans `ci.yml`) ; `test:integration` est exécuté manuellement/localement contre la base de développement.

---

## 8. Questions ouvertes (actions humaines requises pour clore la Phase 2)

1. Renseigner dans `.env.local` (et dans **Vercel → Settings → Environment Variables** pour _Preview_) les variables manquantes listées dans `.env.example` :
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `RESEND_API_KEY`, `EMAIL_FROM`, `RESEND_WEBHOOK_SECRET` (optionnel en dev tant que le webhook rebond n'est pas configuré)
   - `IP_HASH_SECRET` (chaîne aléatoire >= 32 caractères, distincte entre local et preview)
2. Dans **Supabase Dashboard** (`BONUVO BASE`) :
   - Activer **Confirm email** + politique de mot de passe >= 12 caractères et détection des mots de passe compromis (si disponible sur le plan),
   - Activer **MFA → App Authenticator (TOTP)**,
   - Configurer les URL de redirection autorisées (`http://localhost:3000/api/auth/callback` et URL Vercel Preview),
   - Configurer le **SMTP personnalisé Resend** dans _Authentication → SMTP Settings_ pour que les e-mails arrivent réellement.
3. Confirmer l'e-mail destinataire du premier compte `super_admin` à créer via `npm run auth:create-super-admin -- --email=<votre-email>` avant validation finale de la Phase 2 et démarrage de la Phase 3.

---

## 9. Suite

Dès renseignement des clés et validation des tests live Phase 2 :

- Exécuter le test E2E réel (`inscription -> e-mail -> connexion -> TOTP AAL2 -> blocage 6e tentative 429 sur Preview`),
- Initialiser le premier `super_admin` avec TOTP actif,
- Ouvrir la **Phase 3 — Back-office et saisie du catalogue**.
