# ADR-0004 : Back-office, schéma catalogue et téléversement sécurisé (Phase 3)

- **Statut** : Proposé pour validation humaine en fin de Phase 3
- **Date** : 2026-11-16
- **Contexte** : Implémentation de la Phase 3 décrite dans [Plan.md](../../Plan.md) après validation d'[ADR-0001](./ADR-0001-stack.md), [ADR-0002](./ADR-0002-design-system-i18n.md) et [ADR-0003](./ADR-0003-auth-security.md).

## 1. Dépendances Phase 3 figées

Versions exactes ajoutées à [package.json](../../package.json) :

- `react-hook-form` : `7.92.0`
- `@hookform/resolvers` : `7.0.6`
- `@tanstack/react-table` : `9.3.1`
- `file-type` : `22.3.0`
- `sharp` : `0.35.5`

## 2. Modèle de données et sécurité PostgreSQL

- **15 tables Phase 3** réparties par domaine dans `src/server/db/schema/` : `countries`, `payment_methods`, `media_assets`, `settings`, `bookmakers`, `bookmaker_countries`, `bookmaker_payment_methods`, `bookmaker_ratings`, `offers`, `offer_countries`, `offer_terms`, `offer_highlights`, `promo_codes`, `affiliate_networks`, `affiliate_links`.
- **Moindre privilège et RLS forcée** : toutes les nouvelles tables ont `ENABLE ROW LEVEL SECURITY` et `FORCE ROW LEVEL SECURITY` (`bonuvo_app`), sans accès pour `PUBLIC`, `anon` ni `authenticated`.
- **Règle métier au niveau SQL (`offers`)** : la publication (`status = 'published'`) exige la permission `offers.publish` jusque dans la politique RLS `WITH CHECK` (un `editor` ne peut pas publier une offre).
- **Contrôle `B1` (`affiliate_links`)** : `destination_url` exige HTTPS et un hôte appartenant à la liste `allowed_hosts` du bookmaker cible ; les permissions sont restreintes à `links.manage`.
- **Référentiel ISO 3166** : les pays officiels ISO 3166-1 alpha-2, les moyens de paiement courants et les réglages typés par défaut sont semés de façon idempotente par `scripts/seed-reference.ts`.

## 3. Stockage objet et contrôle des médias (`F1` à `F3`)

- **Stockage hors application** : bucket Supabase Storage `bonuvo-media` manipulé uniquement côté serveur via `SUPABASE_SERVICE_ROLE_KEY`.
- **Pipeline de validation serveur (`POST /api/admin/media`)** :
  1. Garde `requireActionPermission("offers.write")` + session TOTP `aal2` + rate limit `20 téléversements/heure/compte`,
  2. Détection réelle par octets magiques via `file-type` (`image/png`, `image/jpeg`, `image/webp` uniquement, plafond `2 Mo`),
  3. Ré-encodage complet via `sharp` pour supprimer les métadonnées EXIF/commentaires et mesurer les dimensions exactes,
  4. Nommage par UUID aléatoire (`logos/<uuid>.<ext>`), enregistrement dans `media_assets` et journalisation dans `audit_log`.
