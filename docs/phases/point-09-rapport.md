# Compte rendu — Point 9 : Cohérence communauté (Ajout de Betwinner au catalogue)

**Branche** : `fix/point-9-community-betwinner`  
**Date** : 19 novembre 2026  
**Statut** : Terminé

---

## Résumé

Sur décision de l'exploitant, **Betwinner** a été ajouté au catalogue réel de BONUVO via `drizzle/0024_add_betwinner_catalog.sql`, avec le code promo `GAEL229` (`program_source = 'Betwinner Partners'`) et le lien d'affiliation `/go/betwinner` vers `https://bwredir.com/264l` (`allowed_host = 'bwredir.com'`). Les mentions de Betwinner dans les canaux communautaires sont désormais 100 % cohérentes avec le catalogue.

## Critères d'acceptation

1. **Ajout de Betwinner au catalogue réel** : fiche `bookmakers` (`betwinner`), `bookmaker_countries` (38 pays éligibles validés), offre `betwinner-bienvenue`, code promo `GAEL229` et lien `/go/betwinner` -> `https://bwredir.com/264l` — **OK**.
2. **Respect des règles précédentes** : aucun montant ni numéro de licence inventé, `badge_code = NULL`, `program_source = 'Betwinner Partners'` — **OK**.

## Tests

- `tests/unit/community-betwinner.test.ts` (1/1 test réussi).
- `npm run typecheck` et `npm run lint` (`0` erreur).

## Suite

- Mise en ligne sur `main`, vérification en production de `/fr/bookmakers/betwinner` et `/go/betwinner`, puis passage au **Point 10 (`fix/point-10-minor-fixes`)**.
