# Rapport de Phase 1 — Design system et coques d'interface (BONUVO)

**Branche** : `feat/phase-1-design-system` (basée sur `feat/phase-0-foundations`, commit `e3c38eb`)  
**Statut** : Terminée — en attente de validation humaine avant démarrage de la Phase 2

---

## 1. Résumé

La Phase 1 met en place le design system complet de BONUVO à partir de la charte du logo officiel fourni (`Choix.dc.html`), l'internationalisation `fr` / `en` avec détection par proxy (`src/proxy.ts`), le basculeur de pays multi-continents (`CountrySwitcher`), les 17 primitives UI (`src/components/ui/`), les trois coques d'interface (`PublicShell`, `MemberShell`, `AdminShell`), les composants métier à 4 états (`loading`, `content`, `empty`, `error`), les 4 pages de confiance publiques ainsi que la vitrine de design `/[locale]/admin/design` isolée de la production.

Aucun schéma ni aucune table métier en base de données n'a été ajouté durant cette phase. Les pages publiques n'affichent aucune offre, cote ou statistique inventée : le catalogue reste en état vide explicite jusqu'au branchement vérifié en base de données (Phase 3).

---

## 2. Critères d'acceptation

| Critère                                                                                                    | Statut | Vérification                                                                                                   |
| ---------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Intégration du logo officiel (`Choix.dc.html`)                                                             | Validé | `src/app/icon.svg`, `BrandMark.tsx`, `BrandLogo.tsx` vérifiés visuellement sur captures                        |
| Thème sombre par défaut & thème clair persisté par cookie (`bonuvo_theme`), sans `dangerouslySetInnerHTML` | Validé | Bascule et persistance vérifiées dans `phase1-ui.spec.ts`                                                      |
| Bilingue `fr` / `en` avec `lang`, `canonical`, `hreflang` et proxy Next 16 (`src/proxy.ts`)                | Validé | Redirection `/ -> /fr` (`smoke.spec.ts`), `/ -> /en` et bascule (`phase1-ui.spec.ts`)                          |
| `CountrySwitcher` multi-continents + vue globale (`GLOBAL`)                                                | Validé | `countries.test.ts` + test E2E `CountrySwitcher` + vérification visuelle 768 px et 1280 px                     |
| Composants métier à 4 états (`loading`, `content`, `empty`, `error`)                                       | Validé | `Badge`, `RatingScore`, `PromoCodeBox`, `OfferCard`, `PartnerLogoGrid`, `CommunityFab` + `offer-card.test.tsx` |
| Zéro défaut critique/sérieux d'accessibilité (`@axe-core/playwright`, WCAG 2.1 AA)                         | Validé | Audits Axe automatisés sur accueil sombre/clair, 4 pages de confiance, 404 et `/admin/design`                  |
| Zéro débordement horizontal à 375 px, 768 px et 1280 px                                                    | Validé | Assertion E2E + captures dans `docs/phases/screenshots/phase-01/`                                              |
| Route `/admin/design` bloquée (`404`) en production par défaut et limitée aux exemples de développement    | Validé | `showcase-guard.test.ts` + E2E `bloque /admin/design en build production par défaut (404)`                     |
| En-têtes `Content-Security-Policy-Report-Only` et attributs `rel` sécurisés sur liens externes             | Validé | `next.config.ts` + assertions `phase1-ui.spec.ts` et `offer-card.test.tsx`                                     |

---

## 3. Tests

Toutes les commandes ci-dessous ont été ré-exécutées après la dernière modification de code (correction de l'alignement sur une ligne de `CountrySwitcher` à 768 px et 1280 px) :

- **Formatage (`npm run format:check`)** : OK (`All matched files use Prettier code style!`)
- **Lint (`npm run lint`)** : OK (0 erreur, 0 avertissement)
- **Typage (`npm run typecheck`)** : OK (`tsc --noEmit`)
- **Tests unitaires et composants (`npm run test:unit`)** : 7 fichiers, 26 tests passés :
  - `tests/unit/countries.test.ts` (2 tests)
  - `tests/unit/connection-config.test.ts` (2 tests)
  - `tests/unit/health.test.ts` (3 tests)
  - `tests/unit/showcase-guard.test.ts` (4 tests)
  - `tests/unit/env.test.ts` (8 tests)
  - `tests/components/controls.test.tsx` (3 tests)
  - `tests/components/offer-card.test.tsx` (4 tests)
- **Build de production (`npm run build`)** : OK (`Next.js 16.4.6 (Turbopack)`)
- **Tests E2E Playwright (`PORT=3097 CAPTURE_PHASE1_SCREENSHOTS=1 npm run test:e2e`)** : 9 tests passés en `18.0s` (`smoke.spec.ts` + `phase1-ui.spec.ts`)
- **Capture vitrine `/admin/design` (`PORT=3098 ALLOW_DEV_SHOWCASE=1 CAPTURE_PHASE1_SCREENSHOTS=1 npx playwright test tests/e2e/phase1-ui.spec.ts -g "bloque /admin/design"`)** : 1 test passé en `8.6s`
- **Captures visuelles produites et inspectées** : `docs/phases/screenshots/phase-01/` (6 fichiers PNG : `home-dark-desktop-1280.png`, `home-light-desktop-1280.png`, `home-dark-tablet-768.png`, `home-dark-mobile-375.png`, `admin-design-desktop-1280.png`, `admin-design-mobile-375.png` — `home-dark-desktop-1280.png` et `home-dark-tablet-768.png` relus après le correctif `CountrySwitcher`).

---

## 4. Sécurité

- **Zéro injection HTML** : aucun usage de `dangerouslySetInnerHTML` dans `src/` ; le thème initial est lu côté serveur via le cookie `bonuvo_theme` dans `src/app/[locale]/layout.tsx`.
- **Politique de sécurité (`next.config.ts`)** : diffusion de `Content-Security-Policy-Report-Only` vérifiée par test E2E.
- **Liens sortants & canaux communautaires** : CTA d'offres équipés de `rel="sponsored nofollow noopener"` (`OfferCard`) et allowlist stricte `https://` (`t.me`, `wa.me`, `whatsapp.com`, `chat.whatsapp.com`) dans `CommunityFab`.
- **Isolation de la vitrine interne** : `src/lib/design/showcase-guard.ts` renvoie `404` sur `/[locale]/admin/design` en environnement de production par défaut (vérifié sur le build Next.js de production).
- **Dépendances (`npm audit --audit-level=high`)** : code de sortie `0` (aucune vulnérabilité `high` ou `critical` ; 11 vulnérabilités `moderate` signalées sur les chaînes d'outillage de développement `drizzle-kit` / `@typescript-eslint`).
- **Validation d'environnement (`npm run env:check`)** : OK (`APP_ENV=local, DATABASE_SSL=require, NEXT_PUBLIC_APP_NAME=BONUVO`). Aucun secret ni fichier `.env.local` versionné (`.env.*`, `.next/`, `test-results/`, `playwright-report/` confirmés ignorés via `git check-ignore`).

---

## 5. Décisions

- **ADR-0001** (`docs/decisions/ADR-0001-stack.md`) : statut mis à jour suite à la validation utilisateur avant le démarrage de la Phase 1, commité sur `feat/phase-0-foundations` (`e3c38eb`).
- **ADR-0002** (`docs/decisions/ADR-0002-design-system-i18n.md`) : formalisation de l'architecture design system (tokens Tailwind/CSS sans script inline, primitives Radix UI, `next-intl` v4 avec `src/proxy.ts` et stratégie 4 états).
- **Correction `label-content-name-mismatch` (WCAG 2.5.3)** : usage de texte masqué visuellement (`sr-only`) combiné au libellé visible sur les contrôles de langue, de thème et de logo plutôt qu'un `aria-label` divergent.
- **Correction Radix Select (`src/components/ui/select.tsx`)** : ajout systématique de `<SelectPrimitive.ItemText>` dans `SelectItem` pour garantir l'affichage de la valeur sélectionnée dans `<SelectValue />`.

---

## 6. Écarts

- Aucun écart fonctionnel par rapport au périmètre Phase 1.
- Correction mineure apportée à `.github/workflows/security.yml` lors du premier push GitHub (`f36da51`) : suppression du drapeau `--fail` dans `extra_args` car l'action `trufflesecurity/trufflehog@main` injecte déjà `--fail` par défaut (ce qui provoquait l'erreur `flag 'fail' cannot be repeated`).
- Suite à l'activation du scope `workflow` côté GitHub CLI, `feat/phase-0-foundations` (`e3c38eb`) et `feat/phase-1-design-system` (`f36da51`) ont été poussées sur `origin` ; les workflows `CI` (`1m18s`) et `Security` (`48s`) ont tous deux réussi sur `feat/phase-1-design-system`.

---

## 7. Dette et risques

- **Dépendances `moderate` côté dev** : 11 alertes `moderate` (`esbuild <=0.24.2` via `drizzle-kit` et `minimatch` via `typescript-eslint`) à surveiller lors des prochaines montées de version majeures d'outillage dev (hors runtime de production).
- **CSP en mode observation** : l'en-tête CSP est en mode `Report-Only` en Phase 1 et devra être durci puis basculé vers `Content-Security-Policy` avec nonce avant la mise en production publique.
- **Politiques de confidentialité / textes juridiques** : les textes des pages de confiance devront être relus et complétés avec les coordonnées légales définitives avant l'ouverture publique.

---

## 8. Questions ouvertes

1. Validation explicite des choix visuels (thème sombre marine/orange issu de `Choix.dc.html`, thème clair pierre chaude, ergonomie mobile/tablette/bureau et 4 pages de confiance) pour autoriser le démarrage de la **Phase 2 — Schéma de base de données et couche d'accès** (et la demande de fusion vers `main` si souhaité).

---

## 9. Suite

Après votre validation de la Phase 1 :

- Démarrer la **Phase 2** sur une branche dédiée : modélisation PostgreSQL/Drizzle (`partners`, `offers`, `promo_codes`, `countries`, `matches`, `predictions`, `editorial_blocks`, `click_events`, `conversion_events`, `audit_logs`, etc.), politiques RLS et couche d'accès serveur.
