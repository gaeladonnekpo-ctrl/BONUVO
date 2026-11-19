# Compte rendu — Point 4 : Calibrage des pronostics & Mention de responsabilité BONUVO AI

**Branche** : `fix/point-4-predictions-calibration`  
**Date** : 19 novembre 2026  
**Statut** : Terminé

---

## Résumé

Le modèle de pronostics a été mis à niveau vers `poisson-v2.0` : régression bayésienne vers la moyenne de la ligue (`PRIOR_MATCHES_WEIGHT = 8`), plafonnement des ratios extrêmes (`[0.55, 1.75]`), calcul de la baseline domicile/extérieur mesurée par saison, calibrage en température (`T = 1.08`), confiance calculée par match, probabilité de combiné ajustée contre l'hypothèse d'indépendance parfaite, affichage du score de Brier dès 50 matchs réglés, et intégration de la mention de responsabilité BONUVO AI sur `/pronostics` et `/pronostics/historique`.

## Critères d'acceptation

1. **Plafonnement des écarts extrêmes & avantage du terrain mesuré** : `computeAttackAndDefenseRates` dans `src/modules/ai/model/poisson-math.ts` + baseline mesurée par saison dans `src/modules/ai/service/prediction-service.ts` — **OK**.
2. **Confiance par match (non par ligue)** : calculée par `resolveConfidence` sur l'écart `p1 - p2` et l'historique du match — **OK**.
3. **Probabilité du combiné sans indépendance parfaite** : `computeCorrelatedComboProbability` dans `src/modules/ai/model/coupons.ts` — **OK**.
4. **Score de Brier dès 50 matchs réglés** : `MIN_SETTLED_FOR_BRIER = 50` dans `src/modules/ai/model/settle.ts`, affiché sur `/pronostics` et `/pronostics/historique` — **OK**.
5. **Test de calibrage sur saison passée (~70 %)** : `tests/unit/prediction-calibration.test.ts` vérifie sur 380 matchs simulés que la tranche ~70 % atteint ~70 % de réussite (`[64 %, 76 %]`) — **OK**.
6. **Mention de responsabilité BONUVO AI** : composant `src/components/ai/AiResponsibilityNotice.tsx` intégré sur `/pronostics` et `/pronostics/historique` — **OK**.

## Tests

- `tests/unit/prediction-calibration.test.ts` (5/5), `tests/unit/phase7-ai.test.ts` (7/7), `tests/unit/phase6-intelligence.test.ts` (3/3).
- `npm run typecheck` : **0 erreur**.
- `npm run lint` : **0 erreur**.

## Sécurité

- Aucune promesse de gain garanti ; avertissement visible et responsive sur mobile et ordinateur.

## Décisions

- Bump de `MODEL_VERSION_TAG` à `poisson-v2.0` pour tracer les nouveaux calculs calibrés séparément des anciens pronostics `poisson-v1.0`.

## Écarts

- Aucun.

## Dette et risques

- Les pronostics déjà verrouillés avant le coup d'envoi en `poisson-v1.0` restent figés pour préserver l'intégrité historique ; les prochains lancements du cron `compute-predictions` utiliseront `poisson-v2.0`.

## Suite

- Prochaine étape : mise en ligne sur `main` puis **Point 5 (`fix/point-5-predictions-transparency`)** (fournisseur + heure de dernière ingestion sur chaque match, logos depuis le stockage ou monogramme).
