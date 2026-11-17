# ADR-0006 — Affiliation : postbacks S2S, attribution, imports CSV et cycle des commissions

- **Statut** : Accepté
- **Date** : 2026-11-17
- **Phase** : Phase 5 — Affiliation : campagnes, postbacks, conversions, commissions

---

## Contexte

En Phase 4, `/go/[slug]` enregistre chaque clic sortant (`public_click_id = clk_...`) et `/api/events` enregistre les vues/copies de codes promo. La Phase 5 relie ces clics aux faits déclarés par les partenaires d'affiliation sans jamais extrapoler ni créer de donnée non prouvée.

## Décisions

1. **Quatre faits strictement séparés en base et à l'écran** :
   - `clicks` (clic sortant mesuré par BONUVO) ;
   - `conversions` de type `registration`, `first_deposit` ou `qualified` (déclarées par le partenaire via `postback`, `webhook` ou `import`) ;
   - `commissions` (`pending`, `confirmed`, `rejected`, `paid`), accompagnées d'une table immuable `commission_history`.
   - Une contrainte PostgreSQL `CHECK (postback_event_id IS NOT NULL OR import_id IS NOT NULL)` garantit qu'aucune conversion n'existe sans source vérifiable.

2. **Stockage brut avant traitement & idempotence S2S** :
   - Toute requête sur `GET|POST /api/postbacks/[network]` ou `POST /api/webhooks/[provider]` vérifie d'abord la limite de débit Upstash, la liste d'IP autorisées éventuelle, la signature en temps constant (`token` ou `HMAC-SHA256`) via un secret lu uniquement depuis une variable `AFFILIATE_*`, et une fenêtre temporelle signée de 5 minutes (`300 s`).
   - Les jetons secrets sont retirés avant persistance dans `postback_events` (`raw_query`, `raw_headers`).
   - La contrainte unique partielle `(network_id, external_event_id)` garantit qu'un même événement rejoué renvoie `200 { ok: true, duplicate: true }` sans double conversion.

3. **Cascade d'attribution déterministe** :
   - (1) `public_click_id` (`clk_...`, y compris extrait de `tag=d_...m_...c_<clickid>`) ;
   - (2) code promo actif (`promo_codes`) si aucun clic n'est fourni ;
   - (3) à défaut, conservation de la conversion marquée `unattributed` (`click_id = null`).

4. **Moindre privilège DB dédié `postback_ingest`** :
   - Portée PostgreSQL `postback_ingest` sur `bonuvo_app` : accès limité aux tables nécessaires à la résolution réseau/clic/code et à l'insertion brute des postbacks, conversions et commissions initiales `pending`. Seule la permission admin `conversions.manage` autorise le passage d'une commission à `confirmed` (avec référence justificative obligatoire), `rejected` ou `paid`, ainsi que l'import CSV.

5. **Adaptateurs par réseau documentés** :
   - `1xpartners` (famille BetB2B : `1xBet`, `Melbet`, `Megapari`, `Linebet`, `Paripesa`, `Winwinbet`), `1win`, et `generic`, documentés dans `docs/affiliation/`.

## Conséquences

- Zéro conversion fabriquée côté navigateur ;
- Rejeu sécurisé des événements bruts possible depuis `/admin/postbacks` ;
- Tout réseau sans postback ni import affiche explicitement « données non disponibles ».
