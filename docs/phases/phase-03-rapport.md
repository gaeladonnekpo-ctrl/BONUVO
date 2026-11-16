# Rapport de Phase 3 — Back-office et saisie du catalogue (BONUVO)

**Branche** : `feat/phase-3-backoffice-catalog` (basée sur `feat/phase-2-auth-security`)  
**Statut** : **Implémentation, migrations DB, seed ISO 3166, suite automatisée (`56` unitaires, `2` intégration DB, `15` E2E, build `61/61`) et contrôle sécurité complets — en attente de saisie réelle par un humain et de validation d'ADR-0004 pour ouvrir la Phase 4**

---

## 1. Résumé

La Phase 3 livre le back-office complet de gestion du catalogue, des liens d'affiliation, des pays, des utilisateurs/rôles, du journal d'audit et des paramètres :

- **Base de données (15 tables + RLS forcée)** : `countries`, `payment_methods`, `media_assets`, `settings`, `bookmakers`, `bookmaker_countries`, `bookmaker_payment_methods`, `bookmaker_ratings`, `offers`, `offer_countries`, `offer_terms`, `offer_highlights`, `promo_codes`, `affiliate_networks` et `affiliate_links`, générées dans `drizzle/0004_slimy_black_bolt.sql` et sécurisées dans `drizzle/0005_phase3_catalog_rls.sql` (`FORCE ROW LEVEL SECURITY`, rôle `bonuvo_app`, politique SQL bloquant `published` sans `offers.publish` et fonction `private.url_host_allowed()` appliquant le contrôle `B1` en base).
- **Référentiels ISO 3166 & défauts (`scripts/seed-reference.ts`)** : seed idempotent de `249` pays ISO 3166-1 alpha-2 (dont `18` marchés actifs par défaut), `9` moyens de paiement et `3` paramètres système typés (`catalog.freshness_warning_days`, `offers.default_sort`, `admin.audit_retention_days`).
- **Téléversement sécurisé (`F1` à `F3`)** : endpoint `POST /api/admin/media` protégé (`offers.write` + `aal2` + CSRF `Origin`), quota `20 téléversements/heure/compte`, inspection par octets magiques (`file-type`), limite `2 Mo`, ré-encodage complet via `sharp` (suppression EXIF/commentaires et extraction des dimensions), stockage hors application dans le bucket Supabase Storage `bonuvo-media` sous UUID aléatoire et journalisation `media.uploaded`.
- **Services, Server Actions & composants réutilisables** : modules `src/modules/offers/*`, `src/modules/media/service.ts` et `src/modules/admin/*` avec garde `requireActionPermission()`, validation Zod (`numeric` non flottants, `validUntil > validFrom`, `validateAffiliateUrl`), `logAudit()` avant/après systématique, et composants `DataTable`, `EntityForm`, `ConfirmDialog`, `MediaUploader`, `AuditTimeline`.
- **12 écrans `/[locale]/admin/...` sans donnée codée en dur** : tableau de bord à compteurs SQL réels (incluant alerte fraîcheur `> 30 jours`), hub catalogue, bookmakers (liste + fiche pays/paiements/notes), offres (liste + fiche cycle de vie + bouton manuel « Marquer comme vérifiée aujourd'hui »), codes promo, pays ISO 3166, réseaux & liens d'affiliation, utilisateurs & rôles (respectant `B7`), journal audit/sécurité et paramètres.

---

## 2. Critères d'acceptation

| Critère                                                                                              | Statut                | Vérification / Preuve                                                                                               |
| ---------------------------------------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Schémas Drizzle/Zod catalogue, 15 tables + RLS + seed ISO 3166 appliqués                             | **Validé**            | `npm run db:migrate` + `npm run db:seed` x 2 (`249` pays ISO 3166, `9` paiements, `3` paramètres)                   |
| Création, modification, publication, désactivation et suppression d'une offre                        | **Validé**            | `offer-service.ts` + `tests/integration/catalog-security.test.ts` sur Postgres réel                                 |
| Un `editor` ne peut pas publier ni supprimer une offre ni gérer les liens                            | **Validé**            | `tests/unit/phase3-catalog.test.ts` + `tests/integration/catalog-security.test.ts` (rejet RLS PostgreSQL prouvé)    |
| Refus d'une URL d'affiliation HTTP ou hors `allowed_hosts` (`B1`)                                    | **Validé**            | `url-guard.ts` (`phase3-catalog.test.ts`) + politique RLS `private.url_host_allowed()` (`catalog-security.test.ts`) |
| Refus d'un fichier renommé en image, SVG scripté, > 2 Mo et suppression EXIF (`F1`–`F3`)             | **Validé**            | `tests/unit/phase3-media.test.ts` (`fileTypeFromBuffer` + `sharp` + rate-limit `20/h` → `429`)                      |
| Aucun compteur du tableau de bord codé en dur ; écritures journalisées avant/après                   | **Validé**            | `src/modules/admin/service.ts` (agrégats SQL `count(*)` uniquement) + `logAudit()` sur chaque mutation              |
| Saisie réelle bout-en-bout d'un premier bookmaker, offre, code et lien par un humain via `/fr/admin` | **En attente humain** | Ouvre la session `super_admin` (`gaeladonnekpo@gmail.com`) + TOTP selon `docs/guides/guide-saisie-catalogue.md`     |

---

## 3. Tests

- **Formatage (`npm run format:check`)** : OK (`All matched files use Prettier code style!`)
- **Lint (`npm run lint`)** : OK (`0` erreur)
- **Typage (`npm run typecheck`)** : OK (`tsc --noEmit`, `0` erreur)
- **Limite <= 300 lignes (`Plan.md` section 5)** : `0` fichier > 300 lignes dans `src/`
- **Tests unitaires et composants (`npm run test:unit`)** : `14` fichiers, `56` tests passés (`9.32s`), dont `phase3-catalog.test.ts` (`4`) et `phase3-media.test.ts` (`3`).
- **Tests d'intégration PostgreSQL (`npm run test:integration`)** : `2` fichiers, `2` tests passés (`10.92s`) contre `BONUVO BASE` (`db-security.test.ts` + `catalog-security.test.ts`).
- **Build de production (`npm run build`)** : OK (`Next.js 16.4.6`, `61/61` pages).
- **Contrôle E3 (bundle client)** : `0` occurrence de clé serveur ou `NEXT_PUBLIC_SUPABASE` dans `.next/static`.
- **Tests E2E Playwright (`PORT=3097 npm run test:e2e`)** : `15` tests passés (`26.5s`), dont `phase3-admin.spec.ts` vérifiant le blocage (`307` → `/connexion`) de toutes les sous-routes `/admin/*` et le rejet (`401`/`403`) sur `POST /api/admin/media`.

---

## 4. Sécurité

- **Moindre privilège et RLS forcée (`D2`, `D3`, `B1`, `B7`)** : vérifiés en intégration sur PostgreSQL `17.11` réel sous rôle `bonuvo_app`.
- **Téléversement médias (`F1`–`F3`)** : validation binaire réelle (`file-type`), plafond `2 Mo`, ré-encodage `sharp` supprimant les EXIF, stockage Supabase `bonuvo-media` hors racine applicative sous UUID aléatoire et rate limiting `20/h/compte`.
- **Audit des dépendances (`npm audit --audit-level=high`)** : `0` vulnérabilité élevée ou critique après ajout des dépendances Phase 3 (`react-hook-form@7.92.0`, `@hookform/resolvers@7.0.6`, `@tanstack/react-table@9.3.1`, `file-type@22.3.0`, `sharp@0.35.5`).

---

## 5. Décisions

- **ADR-0003** (`docs/decisions/ADR-0003-auth-security.md`) : validé par l'utilisateur en clôture de Phase 2.
- **ADR-0004** (`docs/decisions/ADR-0004-backoffice-catalog.md`) : soumis à validation humaine en fin de Phase 3.

---

## 6. Écarts

- Le bucket Supabase Storage `bonuvo-media` a été créé en accès public pour permettre l'affichage direct des logos validés via `next/image`, tandis que toute écriture passe exclusivement côté serveur après contrôle `F1`–`F3`.
- En environnement local/CI sans clés Supabase Storage ou Upstash, `uploadMediaAsset` échoue explicitement avec `503 MEDIA_SERVICE_NOT_CONFIGURED` ; les tests unitaires utilisent un double injecté (`StorageUploader`).

---

## 7. Dette et risques

- Les sections futures (pronostics, contenus, statistiques avancées) restent hors menu Phase 3 jusqu'à leurs phases dédiées (Phases 5 à 7) afin de n'exposer aucun écran factice ni lien inactif.
- Avant de déclarer la Phase 3 close, au moins une fiche réelle (`bookmaker`, `offer`, `promo_code`, `affiliate_link`) doit être saisie et vérifiée dans `/fr/admin`.

---

## 8. Livrables & actions humaines attendues

- **Livrables** : back-office complet `/admin/*`, guide opérateur d'une page (`docs/guides/guide-saisie-catalogue.md`), `ADR-0004`, migrations `0004` + `0005` et ce rapport.
- **Validation humaine** :
  1. Finaliser ton accès `super_admin` (`gaeladonnekpo@gmail.com`) + TOTP et saisir un premier bookmaker réel, une offre, un code promo et un lien d'affiliation dans `/fr/admin` (en local ou sur la Preview Vercel de `feat/phase-3-backoffice-catalog`),
  2. Valider **`ADR-0004`** et ce rapport pour ouvrir la **Phase 4 — BONUVO OFFERS public, redirection et clics** (et parallélisable **Phase 7 — BONUVO AI**).
