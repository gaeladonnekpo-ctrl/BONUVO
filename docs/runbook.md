# Guide d'exploitation BONUVO (Runbook — Phase 10)

**Plateforme** : BONUVO (`https://bonuvo.vercel.app`)  
**Stack** : Next.js 16 (App Router) · Node.js `26.x` · PostgreSQL (Supabase) · Upstash Redis · Vercel

---

## 1. Déploiement & promotion

1. Tout push sur `main` déclenche automatiquement :
   - Les workflows GitHub Actions [ci.yml](../.github/workflows/ci.yml) et [security.yml](../.github/workflows/security.yml).
   - Le déploiement de production Vercel sur `https://bonuvo.vercel.app`.
2. Vérifier après chaque déploiement :
   - Statut Vercel `Ready / Success`.
   - `GET /api/health` -> `200 OK` (`{"status":"ok","app":"ok","database":"ok"}`).
   - En-têtes de sécurité sur `GET /fr` (`Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options: DENY`).

---

## 2. Procédure de retour arrière (_Rollback_ < 10 minutes)

1. Ouvrir **Vercel Dashboard → bonuvo → Deployments**.
2. Identifier le dernier déploiement `Ready` précédent.
3. Cliquer sur **⋯ → Promote to Production** (effet immédiat en < 1 minute sans recompilation).
4. En parallèle sur Git, annuler le commit fautif (`git revert <sha> && git push origin main`) pour réaligner le code source.
5. Si une migration SQL a été appliquée, ne jamais exécuter de `DROP` destructeur en urgence : déployer une migration corrective avant.

---

## 3. Mode maintenance (`503`)

- **Activation** : ajouter ou passer `MAINTENANCE_MODE=1` dans les variables d'environnement Vercel Production, puis redéployer (ou promouvoir).
- **Effet** : toutes les routes publiques affichent `/fr/maintenance` (ou `/en/maintenance`) avec code HTTP `503` et `Retry-After: 300`, tandis que `/api/health` reste accessible.
- **Désactivation** : repasser `MAINTENANCE_MODE=0` (ou supprimer la variable).

---

## 4. Rotation des secrets

Effectuer la rotation tous les 90 jours ou immédiatement en cas de suspicion de fuite :

| Secret                      | Où le régénérer                                        | Impact et ordre                                                               |
| :-------------------------- | :----------------------------------------------------- | :---------------------------------------------------------------------------- |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API            | Mettre à jour Vercel env → redéployer.                                        |
| `DATABASE_URL`              | Supabase Dashboard → Database → Reset password         | Mettre à jour `DATABASE_URL` Vercel → redéployer.                             |
| `IP_HASH_SECRET`            | Générer 32+ octets aléatoires (`openssl rand -hex 32`) | Mettre à jour Vercel env (invalide les anciens liens de désinscription HMAC). |
| `CRON_SECRET`               | Générer 32+ octets aléatoires                          | Mettre à jour Vercel env + GitHub Secrets (`CRON_SECRET`).                    |
| Clé SMTP Brevo              | Brevo → SMTP & API                                     | Mettre à jour dans Supabase Dashboard → Auth → SMTP Settings.                 |
| `RESEND_API_KEY`            | Resend Dashboard → API Keys                            | Mettre à jour Vercel env → redéployer.                                        |
| `TELEGRAM_BOT_TOKEN`        | `@BotFather` (`/revoke`)                               | Mettre à jour Vercel env → redéployer.                                        |

---

## 5. Sauvegardes & restauration PostgreSQL

- **Sauvegardes** : sauvegardes automatiques quotidiennes sur le projet Supabase managé (rétention minimum 7 jours sur plan Pro) + export logique hebdomadaire chiffré (`pg_dump --format=custom`).
- **Restauration sur base vierge** :
  1. Créer la base cible et appliquer le schéma : `npm run db:migrate`.
  2. Restaurer le dump logique (`pg_restore --no-owner --role=postgres`).
  3. Vérifier l'intégrité : `SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity;` (doit retourner `0`).
- **Objectifs** : RPO <= 24 heures, RTO <= 4 heures.

---

## 6. Supervision & tâches planifiées

- **Sonde de disponibilité** : configurer un moniteur externe (UptimeRobot / Better Stack / Vercel Checks) sur `https://bonuvo.vercel.app/api/health` toutes les 5 minutes (alerte si statut != `200`).
- **Tâches planifiées** ([production-crons.yml](../.github/workflows/production-crons.yml)) :
  - `/api/cron/ingest-fixtures`
  - `/api/cron/ingest-stats`
  - `/api/cron/compute-predictions`
  - `/api/cron/settle-predictions`
  - `/api/cron/aggregate-metrics`
  - `/api/cron/purge-data`

---

## 7. Tableau des accès & rôles

| Rôle          | Permissions                                                                      | MFA TOTP (AAL2) |
| :------------ | :------------------------------------------------------------------------------- | :-------------: |
| `super_admin` | Administration complète, gestion des rôles et paramètres système                 |   Obligatoire   |
| `admin`       | Publication offres, gestion affiliation, communauté, notifications, statistiques |   Obligatoire   |
| `editor`      | Saisie et modification du catalogue, contenus et actualités                      |   Obligatoire   |
| `analyst`     | Consultation des statistiques et exports CSV                                     |   Obligatoire   |
| `member`      | Espace personnel `/compte`, préférences, consentements, export et suppression    |   Optionnelle   |
