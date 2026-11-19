# Compte rendu — Point 8 : Moyens de paiement vérifiés par opérateur et par pays

**Branche** : `fix/point-8-payment-methods`  
**Date** : 19 novembre 2026  
**Statut** : Terminé

---

## Résumé

Une colonne `confirmed` (par défaut `false` sur toute nouvelle association), ainsi que `verified_at` et `verified_by`, ont été ajoutées sur `bookmaker_payment_methods` via `drizzle/0023_payment_methods_confirmation.sql`. Toutes les requêtes publiques (`public-bookmaker-detail-repo.ts`, `public-bookmakers-repo.ts`, `public-offers-snapshot.ts`) filtrent désormais strictement sur `confirmed = true`, et l'administration permet de confirmer ou masquer chaque moyen de paiement par opérateur et par pays.

## Critères d'acceptation

1. **Vérification par opérateur et par pays** : `confirmed`, `verified_at`, `verified_by` sur `bookmaker_payment_methods` + validation Zod (`confirmed` par défaut `false`) — **OK**.
2. **Affichage public limité aux moyens confirmés** : filtre `eq(bookmakerPaymentMethods.confirmed, true)` sur les 3 dépôts publics — **OK**.
3. **Gestion en administration** : badge `Confirmé` / `À vérifier`, bouton de confirmation/masquage et case à cocher dans `BookmakerSubSections.tsx` — **OK**.

## Tests

- `tests/unit/payment-methods-verification.test.ts` (2/2 tests réussis).
- `npm run typecheck` et `npm run lint` (`0` erreur).

## Suite

- Mise en ligne sur `main`, puis passage au **Point 9 (`fix/point-9-community-betwinner`)** : cohérence communauté (retirer Betwinner du texte WhatsApp ou l'ajouter au catalogue).
