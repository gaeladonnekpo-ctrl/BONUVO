# Phase 8 — BONUVO COMMUNITY et espace MEMBERS complet : Rapport de phase

## Périmètre livré

1. **Modèle de données Phase 8 & RLS PostgreSQL (`bonuvo_app`)** :
   - 8 nouvelles tables dans `src/server/db/schema/community.ts` et `src/server/db/schema/members.ts` : `posts`, `community_channels`, `coupons`, `notifications`, `notification_deliveries`, `communication_preferences`, `member_activity`, `account_deletion_requests`.
   - Migrations `drizzle/0016_flashy_ben_parker.sql` et `drizzle/0017_phase8_community_members_rls.sql` appliquées avec `ENABLE/FORCE ROW LEVEL SECURITY`, triggers `touch_updated_at`, portées `public_unsubscribe` et `purge_worker`, isolation stricte propriétaire (`user_id = private.current_actor_id()`) et immutabilité append-only de `public.consents`.
2. **Sécurité éditoriale, validation des canaux et intégration Telegram** :
   - Sanitisation serveur dans `src/modules/community/sanitizer.ts` neutralisant `<script>`, `<iframe>`, attributs `on*` et URLs `javascript:`/`data:`.
   - Liste blanche stricte des domaines de canaux dans `src/modules/community/channel-url.ts` (`t.me`, `telegram.me`, `whatsapp.com`, `www.whatsapp.com`, `chat.whatsapp.com`, `wa.me` en HTTPS uniquement).
   - Publication automatique optionnelle des coupons validés et notifications vers l'API Bot Telegram (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_DEFAULT_CHAT_ID`) et webhook protégé `POST /api/webhooks/telegram`.
3. **Espace Membre (`/compte`), Désinscription 1-clic signée et Purge différée 14 jours** :
   - Tableau de bord `/[locale]/compte` permettant de modifier profil, pays et langue, de gérer ses préférences de communication avec horodatage immuable dans `consents`, d'exporter l'intégralité de ses données personnelles en JSON (`GET /api/account/export`), et de demander ou d'annuler la suppression de son compte pendant la fenêtre de 14 jours.
   - Désinscription en 1 clic sans besoin de connexion via jeton signé HMAC-SHA256 (`/[locale]/desinscription` et `/api/unsubscribe`).
   - Tâche planifiée `POST /api/cron/purge-data` anonymisant les comptes arrivés à échéance de 14 jours sans altérer les statistiques anonymes.
4. **Interfaces publiques et back-office** :
   - Pages publiques `/[locale]/communaute`, `/[locale]/actualites/[slug]` et `/[locale]/desinscription` accessibles sans compte.
   - Pages d'administration protégées par RBAC + TOTP : `/[locale]/admin/communaute`, `/[locale]/admin/contenus` et `/[locale]/admin/notifications`.

## Vérifications exécutées

- Vérification de longueur `<= 300` lignes sur tous les fichiers de `src/`.
- Formatage Prettier, typage `tsc --noEmit`, ESLint.
- Tests unitaires (`phase8-community-members.test.ts`), tests d'intégration PostgreSQL RLS (`community-members-rls.test.ts`), build de production + vérification CSS automatique (`postbuild`) et tests E2E Playwright (`phase8-community-members.spec.ts` incluant audit axe-core WCAG 2.1 AA).
