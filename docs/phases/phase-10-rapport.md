# Rapport de Phase 10 — Mise en production et exploitation

**Statut** : Terminée  
**Date** : 18 novembre 2026  
**URL de production** : `https://bonuvo.vercel.app`

---

## 1. Livrables d'exploitation réalisés

1. **Guide d'exploitation** ([docs/runbook.md](../runbook.md)) :
   - Procédure de déploiement et promotion Vercel.
   - Procédure de retour arrière (_rollback_ < 10 min).
   - Rotation des secrets (Supabase, `IP_HASH_SECRET`, `CRON_SECRET`, SMTP Brevo, Resend, Telegram).
   - Sauvegardes, restauration PostgreSQL et objectifs RPO/RTO.
   - Tableau des accès et rôles RBAC + MFA TOTP.
2. **Page de maintenance** ([src/app/[locale]/maintenance/page.tsx](../../src/app/%5Blocale%5D/maintenance/page.tsx)) & bascule `MAINTENANCE_MODE=1` dans [src/proxy.ts](../../src/proxy.ts) (`503 Service Unavailable`, `Retry-After: 300`, `/api/health` préservé).
3. **Tâches planifiées de production** ([.github/workflows/production-crons.yml](../../.github/workflows/production-crons.yml)) pour l'orchestration sécurisée des 6 endpoints `/api/cron/*`.

## 2. Vérifications de mise en production

- `npm run typecheck`, `npm run lint`, `npm run test:unit`, `npm run test:integration` et `npm run build` validés.
- Tests de fumée en production sur `https://bonuvo.vercel.app` :
  - `/fr`, `/fr/offres`, `/fr/bookmakers`, `/fr/codes-promo`, `/fr/comparateur`, `/fr/pronostics`, `/fr/communaute`, `/fr/connexion`, `/fr/inscription`, `/fr/maintenance` -> `200 OK`
  - `/api/health` -> `200 OK` (`{"status":"ok","app":"ok","database":"ok"}`)
  - `/manifest.webmanifest`, `/sw.js`, `/icons/*.png` -> `200 OK` (PWA active)
  - `/sitemap.xml`, `/robots.txt` -> `200 OK`
  - En-tête `Content-Security-Policy` bloquant + `Strict-Transport-Security` actifs.
