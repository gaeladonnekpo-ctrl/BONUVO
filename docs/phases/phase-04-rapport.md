# Rapport de phase — Phase 4 : BONUVO OFFERS public, redirection et clics

- **Statut** : Implémentée et vérifiée automatiquement — en attente des données réelles Phase 3 et de validation humaine (`ADR-0005` + essai manuel 10 clics réels une fois les premiers liens d'affiliation saisis)
- **Date** : 2026-11-16
- **Branche** : `feat/phase-4-public-offers`

## 1. Livrables réalisés

- **Schéma PostgreSQL & RLS (`0006_nasty_sugar_man.sql`, `0007_phase4_public_rls.sql`)** :
  - Tables `campaigns`, `clicks` et `visit_events` ajoutées avec index et contraintes CHECK.
  - Nouvelles portées `public_catalog` (lecture strictement limitée aux offres `published` non expirées, bookmakers `active`, codes promo et liens HTTPS `allowed_hosts` actifs) et `public_tracking` (insertion contrôlée des clics et vues/copies sans lecture d'autres visiteurs).
- **Redirection sécurisée & collecte (`src/app/go/[slug]/route.ts`, `src/app/api/events/route.ts`)** :
  - `GET /go/[slug]` : validation du slug, vérification pays (`B11`), re-contrôle `https://` + `allowed_hosts` (`B2`), détection de robot via `isbot@5.2.3` + détection de rafale (`B3`), limite Upstash `go_redirect` à `30/min/IP` (`429`), insertion d'un clic avec `public_click_id` passé en paramètre `sub_id_param_name`, réponse `302` (`Cache-Control: no-store`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`).
  - `POST /api/events` : validation d'origine (403 cross-origin), schéma Zod strict (`page_view`, `offer_view`, `promo_copy`), hachage journalier `visitor_daily_hash` sans cookie de suivi, limite `60/min/IP`.
- **Services publics cachés & invalidation (`src/modules/offers/public-*.ts`)** :
  - Services `listOffers`, `getOffer`, `listBookmakers`, `getBookmaker`, `listPromoCodes`, `compareOffers`, `getCatalogMeta` avec cache étiqueté Next.js (`offers`, `bookmakers`, `promo-codes`, `countries`), invalidé par chaque action d'administration.
- **Pages publiques, filtres URL et SEO (`src/app/[locale]/(public)/...`)** :
  - Accueil définitif `/[locale]`, catalogue `/[locale]/offres`, fiche offre `/[locale]/offres/[slug]` (avec garde d'éligibilité `B11` et `notFound()`), répertoire `/[locale]/bookmakers`, fiche opérateur `/[locale]/bookmakers/[slug]` (grille `/10`, licences locales, moyens de paiement), `/[locale]/codes-promo`, `/[locale]/comparateur`, `/sitemap.xml` dynamique et `/robots.txt`.
  - Composants `OfferList`, `FilterBar`, `SortMenu`, `CompareTable`, `CompareTray`, `TermsPanel`, `CountryGate`, `PromoCodesCatalog` synchronisés par URL via `nuqs@2.10.3`.
  - Décision d'architecture consignée dans `docs/decisions/ADR-0005-public-offers-tracking.md`.

## 2. Preuves et vérifications

- **Conformité des tailles de fichiers** : aucun fichier sous `src/` ne dépasse 300 lignes.
- **Qualité & Audit** : `npx prettier --check .`, `npm run typecheck`, `npm run lint`, `npm run env:check`, `npm audit --audit-level=high` (`0` vulnérabilité élevée/critique), contrôle `E3` (`0` secret dans `.next/static`).
- **Tests unitaires & composants (`npm run test:unit`)** : `15` fichiers, `62` tests passés (dont `public-offers-and-redirect.test.ts` sur `B2`, géolocalisation, détection robots, badges, filtres/tris et validation `/api/events`).
- **Tests d'intégration DB/RLS (`npm run test:integration`)** : `3` fichiers, `3` tests passés sur PostgreSQL réel (`public-offers-rls.test.ts` prouve que `public_catalog` ne voit jamais `draft`/expiré/désactivé/admin et que `public_tracking` ne peut insérer un clic que sur un lien actif).
- **Build & E2E (`npm run build` + Playwright)** : `71/71` routes compilées ; `20/20` tests Playwright passés (routes publiques, `sitemap.xml`, `robots.txt`, `CountryGate` `?pays=JP`, garde `notFound()` sur offre absente, axe-core WCAG 2.1 AA sans erreur critique/sérieuse sur `/fr/offres` et `/fr/comparateur`, blocage `B2` sur `/go/[slug]`, blocage cross-origin `403` / payload invalide `400` sur `/api/events`).
- **Mesures Web Vitals mobiles (Chromium `375x812`, `next start`)** :
  - `/fr` : LCP `248 ms`, CLS `0`
  - `/fr/offres` : LCP `272 ms`, CLS `0`

## 3. Point ouvert pour acceptation humaine

L'acceptation finale de la Phase 4 (affichage de données réelles saisies en Phase 3 et contrôle manuel de 10 clics réels via `/go/[slug]`) sera vérifiée dès réception des premiers codes promo et liens d'affiliation réels de l'équipe, sans aucune donnée fictive injectée.
