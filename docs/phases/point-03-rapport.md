# Compte rendu — Point 3 : Liste des pays éligibles

**Branche** : `fix/point-3-eligible-countries`  
**Date** : 19 novembre 2026  
**Statut** : Terminé

---

## Résumé

Suite à la décision de l'exploitant, les **44 juridictions où les paris sportifs en ligne sont strictement interdits** (dont la **Mauritanie `MR`**, `SA`, `AE`, `QA`, `KW`, `DZ`, `EG`, `BD`, `PK`, `ID`, `MY`, `SG`, `TH`, `VN`, etc.) ont été supprimées de `countries`, `bookmaker_countries`, `offer_countries` et `bookmaker_payment_methods` via `drizzle/0021_country_legal_validation.sql`. Les **pays d'Afrique de l'Ouest** (`BJ, CI, SN, TG, BF, ML, NE, GN, GW, GH, NG, CV, GM, LR, SL`) ont été placés en tête de priorité d'affichage, et toute ouverture d'un pays dans l'administration exige désormais une validation juridique tracée (`legal_validated_at`, `legal_validated_by`, `legal_source`).

## Critères d'acceptation

1. **Suppression des pays strictement interdits (Mauritanie `MR` et assimilés)** : `countries` passé de `249` à `205` pays actifs ; `bookmaker_countries` passé de `47` à `38` pays éligibles (`0` pays interdit restant) — **OK**.
2. **Priorisation Afrique de l'Ouest en haut des sélecteurs** : `TOP_BETTING_TIER1_CODES` dans `src/lib/i18n/betting-priority.ts` place les 15 pays éligibles d'Afrique de l'Ouest en tête — **OK**.
3. **Validation juridique consignée en administration (date, auteur, source)** : colonnes ajoutées sur `bookmaker_countries`, validation Zod obligatoire dans `bookmakerCountrySchema` si `eligible = true`, champs et affichage ajoutés dans `BookmakerSubSections.tsx` — **OK**.

## Tests

- `npm run typecheck` : **0 erreur**.
- `npm run lint` : **0 erreur** (2 avertissements préexistants).
- `npx vitest run tests/unit/eligible-countries-governance.test.ts tests/unit/countries.test.ts tests/unit/license-presentation.test.ts` : **3/3 fichiers, 10/10 tests réussis**.

## Sécurité

- Aucun secret exposé ; contrôle de validation serveur Zod renforcé sur `upsertBookmakerCountry`.

## Décisions

- Point 2 (`x-vercel-ip-country` sur `/go/[slug]`) mis de côté sur instruction utilisateur (_« Laissons le 2 »_).
- Les 44 pays où les paris en ligne sont strictement interdits ont été supprimés sans toucher aux autres pays conservés par l'exploitant.

## Écarts

- Les pays conservés hors liste interdite restent ouverts à la demande explicite de l'exploitant avec une mention de validation exploitant datée du 19/11/2026 ; il reste à saisir les sources juridiques individuelles si des licences locales sont obtenues ultérieurement.

## Dette et risques

- Le Point 2 ayant été laissé de côté, `/go/[slug]` continue de s'appuyer sur la résolution de pays actuelle.

## Questions ouvertes

- Souhaitez-vous fusionner dès maintenant `fix/point-1-licenses-presentation` et `fix/point-3-eligible-countries` sur `main`, ou passer d'abord au **Point 4 (Calibrage des pronostics)** ?

## Suite

- Prochaine étape : **Point 4 (`fix/point-4-predictions-calibration`)** — plafonnement des écarts extrêmes, régression vers la moyenne de la ligue, confiance par match, probabilité combiné réaliste et score de Brier dès 50 matchs réglés.
