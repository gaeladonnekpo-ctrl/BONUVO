# ADR-0009 — BONUVO COMMUNITY, espace MEMBERS, registre de consentements append-only et purge différée 14 jours

- **Statut** : Accepté
- **Date** : 2026-11-17
- **Phase** : Phase 8 — BONUVO COMMUNITY et espace MEMBERS complet

## Contexte

La Phase 8 ouvre simultanément l'espace communautaire public (`/[locale]/communaute`, `/[locale]/actualites/[slug]`), le pilotage éditorial et communautaire admin (`/admin/contenus`, `/admin/communaute`, `/admin/notifications`) et l'espace membre optionnel (`/[locale]/compte`, `/[locale]/desinscription`).

Conformément au `Plan.md` :

1. Aucune page d'offres ou du catalogue public ne doit exiger de compte membre.
2. Les contenus éditoriaux (`posts`) et annonces ne doivent jamais exécuter de HTML ou script arbitraire côté navigateur.
3. Les liens de canaux communautaires (`community_channels`) doivent être restreints aux domaines officiels Telegram et WhatsApp.
4. L'historique des consentements (`consents`) doit rester immuable (append-only, horodaté avec version de politique), tandis que `communication_preferences` reflète l'état courant des préférences par canal.
5. La désinscription (`/[locale]/desinscription` et `/api/unsubscribe`) doit fonctionner en 1 clic sans reconnexion grâce à un jeton HMAC signé.
6. La suppression de compte doit être différée de 14 jours (annulable par le membre) avant qu'une tâche planifiée (`POST /api/cron/purge-data`) n'anonymise les données personnelles tout en préservant les statistiques anonymes.

## Décisions

1. **Sanitisation serveur stricte (`src/modules/community/sanitizer.ts`)** :
   - Avant persistance et avant rendu, tout texte ou fragment éditorial est nettoyé côté serveur : suppression des balises `<script>`, `<iframe>`, `<object>`, `<embed>`, `<style>`, `<form>`, neutralisation des attributs `on*` (`onerror`, `onload`, etc.) et des schémas `javascript:`, `vbscript:` et `data:`.

2. **Liste blanche des domaines de canaux (`src/modules/community/channel-url.ts`)** :
   - Seules les URLs `https://` pointant vers `t.me`, `telegram.me`, `whatsapp.com`, `www.whatsapp.com`, `chat.whatsapp.com` ou `wa.me` sont acceptées.

3. **Registre de consentements immuable + désinscription HMAC 1-clic (`src/modules/members/unsubscribe-token.ts`)** :
   - Toute modification de préférence dans `/compte` ou via `/desinscription` insère une nouvelle ligne dans `public.consents` (protégée par le trigger PostgreSQL `consents_immutable_guard`) et met à jour `public.communication_preferences`.
   - Le jeton de désinscription encode `userId`, `scope` (`all` | `marketing_email` | `notifications`) et `issuedAt`, signé par `HMAC-SHA256` avec `IP_HASH_SECRET` et vérifié en temps constant (`timingSafeEqual`).

4. **Suppression différée 14 jours et purge RGPD (`src/modules/members/purge-service.ts`)** :
   - Une demande crée une entrée `pending` dans `account_deletion_requests` avec `scheduled_purge_at = now() + interval '14 days'` et passe `profiles.status` à `'pending_deletion'`.
   - Tant que `scheduled_purge_at` n'est pas échu, le membre peut annuler la demande depuis `/compte`.
   - Passé 14 jours, `POST /api/cron/purge-data` (portée RLS `purge_worker`) anonymise `profiles` (`email = 'deleted-<uuid>@anonymized.bonuvo.local'`, `display_name = NULL`, `country_code = NULL`, `status = 'suspended'`, `deleted_at = now()`), supprime `communication_preferences` et `member_activity`, et marque la demande `executed`, sans altérer les compteurs ni événements analytiques anonymes.
