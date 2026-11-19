# Compte rendu — Point 7 : Badges et codes promo

**Branche** : `fix/point-7-badges-and-codes`  
**Date** : 19 novembre 2026  
**Statut** : Terminé

---

## Résumé

Chaque badge d'offre est désormais rattaché à un champ `badge_justification` obligatoire en administration (`offers`), le badge « Exclusif » a été retiré sur les offres dont le code promo est partagé entre plusieurs opérateurs (`GAEL229` sur 6 bookmakers, notamment Melbet), et chaque code promo affiche et enregistre son programme d'affiliation source (`program_source` sur `promo_codes`).

## Critères d'acceptation

1. **Badge rattaché à un champ justifié en administration** : `badge_justification` ajouté sur `offers`, requis dans `offerInputSchema` et éditable dans `OfferDetailView.tsx` — **OK**.
2. **Retrait d'« Exclusif » si le code est le même partout** : migration `0022_badges_and_program_source.sql` + garde serveur dans `resolveOfferBadges` (`isSharedPromoCode`) et `public-offers-repo.ts` — **OK**.
3. **Programme d'affiliation source affiché dans l'administration** : `program_source` ajouté sur `promo_codes`, renseigné pour les 7 codes en base et affiché dans `PromoCodesView.tsx` — **OK**.

## Tests

- `tests/unit/badges-and-codes.test.ts` (3/3 tests réussis) et `tests/unit/phase3-catalog.test.ts`.
- `npm run typecheck` et `npm run lint` (`0` erreur).

## Suite

- Mise en ligne sur `main` puis passage au **Point 8 (`fix/point-8-payment-methods`)** : vérification par opérateur et par pays des moyens de paiement.
