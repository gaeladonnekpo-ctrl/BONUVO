# Compte rendu — Point 5 : Transparence des pronostics

**Branche** : `fix/point-5-predictions-transparency`  
**Date** : 19 novembre 2026  
**Statut** : Terminé

---

## Résumé

Chaque fiche de match affiche désormais le fournisseur officiel des données (`providerName`) et l'heure de la dernière ingestion (`lastIngestedAt`). Les logos d'équipes et de compétitions sont filtrés par `isAuthorizedSportLogoUrl` : seuls les chemins locaux du site, le stockage Supabase du projet et les CDN sportifs autorisés (`media.api-sports.io`, `a.espncdn.com`) sont chargés, avec repli automatique vers un monogramme déterministe sinon.

## Critères d'acceptation

1. **Fournisseur et heure de dernière ingestion sur chaque match** : `providerName` et `lastIngestedAt` ajoutés sur `PublicFixtureDto`, alimentés depuis `sports_providers` et `ingestion_runs` dans `public-ai-service.ts` et affichés dans `FixtureRow.tsx` — **OK**.
2. **Logos depuis le stockage / source autorisée ou monogramme** : `isAuthorizedSportLogoUrl` dans `SportCrest.tsx` — **OK**.

## Tests

- `tests/unit/predictions-transparency.test.ts` (2/2 tests réussis).
- `npm run typecheck` et `npm run lint` validés.

## Sécurité

- Blocage des URLs externes non autorisées, `http://` et `//` sur les écussons d'équipes/compétitions.

## Suite

- Mise en ligne sur `main` puis passage au **Point 6 (`fix/point-6-csp-nonce`)** : CSP à nonce en mode rapport.
