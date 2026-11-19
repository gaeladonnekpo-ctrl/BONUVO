# Compte rendu — Point 6 : CSP à nonce en mode rapport (Contrôle V2)

**Branche** : `fix/point-6-csp-nonce`  
**Date** : 19 novembre 2026  
**Statut** : Terminé

---

## Résumé

Une politique `Content-Security-Policy-Report-Only` avec `nonce` unique par requête (`script-src 'self' 'nonce-…' 'strict-dynamic'`, sans `'unsafe-inline'`) a été activée dans `src/proxy.ts`, accompagnée de l'endpoint de collecte `POST /api/csp-report` et du helper `src/server/security/csp.ts`. L'en-tête bloquant existant dans `next.config.ts` reste actif pendant la phase d'observation en mode rapport.

## Critères d'acceptation

1. **`script-src 'self' 'nonce-…' 'strict-dynamic'` sans `'unsafe-inline'`** : `buildNonceReportOnlyCsp` + `x-nonce` généré par requête dans `src/proxy.ts` — **OK**.
2. **Déploiement en mode rapport** : en-tête `Content-Security-Policy-Report-Only` + `report-uri /api/csp-report` — **OK**.
3. **Contrôle V2 rejoué** : `tests/unit/csp-nonce.test.ts` et `tests/unit/security.test.ts` passés, fiche `V2` mise à jour dans `docs/security/audit-41-controles.md` — **OK**.

## Tests

- `tests/unit/csp-nonce.test.ts` (3/3 tests réussis) et `tests/unit/security.test.ts` (6/6 tests réussis).
- `npm run typecheck` et `npm run lint` (`0` erreur).

## Suite

- Mise en ligne sur `main`, vérification en production de l'en-tête `Content-Security-Policy-Report-Only`, puis passage au **Point 7 (`fix/point-7-badges-and-codes`)**.
