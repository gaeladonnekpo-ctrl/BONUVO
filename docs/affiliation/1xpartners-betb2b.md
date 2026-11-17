# Documentation partenaire — 1xPartners / Réseaux BetB2B (1xBet, Melbet, Megapari, Linebet, Paripesa, Winwinbet)

- **Date de vérification** : 2026-11-17
- **Opérateurs couverts** : `1xBet` (`reffpa.com`), `Melbet` (`refpa3665.com`), `Megapari` (`refpazitag.top`), `Linebet` (`lb-aff.com`), `Paripesa` (`combodef.com`), `Winwinbet` (`refpa49781.com`).
- **Adaptateur BONUVO** : `src/modules/affiliation/adapters/one-x-partners.ts` (`adapterKey = "1xpartners"`)
- **Mode de suivi** : `postback` S2S (`GET` ou `POST /api/postbacks/[network]`) avec attribution secondaire par code promo (`GAEL229`) si le postback ne porte pas d'identifiant de clic.

---

## 1. Passage de l'identifiant de clic sortant (`/go/[slug]`)

Lors de la redirection `302` depuis `/go/[slug]`, BONUVO génère un identifiant unique `clk_<uuid32>` (`public_click_id`) et l'injecte dans le paramètre configuré sur `affiliate_networks.sub_id_param_name` (par défaut `subid`, ou `sub_id` / `aff_sub` selon le compte partenaire).

Pour les réseaux dérivés de la famille 1xPartners qui encapsulent parfois le `click_id` dans un `tag` composite (`d_<site>m_<ad>c_<clickid>`), l'adaptateur `1xpartners` extrait automatiquement :

1. d'abord les paramètres explicites `subid`, `sub_id`, `clickid`, `click_id`, `aff_sub` ;
2. sinon, le segment `c_(clk_[a-f0-9]{32})` à l'intérieur du paramètre `tag`.

---

## 2. Paramètres attendus sur les postbacks S2S

L'administrateur configure deux règles distinctes dans le tableau de bord partenaire (ou via son manager affilié) vers `https://<domaine>/api/postbacks/<network-slug>` :

| Événement partenaire    | Paramètre `status` / `event` accepté   | Type BONUVO (`conversions.conversion_type`) | Paramètres complémentaires                                                    |
| ----------------------- | -------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| Inscription (`{reg}`)   | `lead`, `reg`, `registration`          | `registration`                              | `subid` / `tag`, `event_id` / `tx_id`, `player_id`, `promo_code` (facultatif) |
| Premier dépôt (`{ftd}`) | `sale`, `ftd`, `first_deposit`, `dep1` | `first_deposit`                             | `subid`, `payout` / `amount`, `currency`, `event_id` / `tx_id`, `player_id`   |
| Qualification / CPA     | `qualified`, `cpa`, `confirmed`        | `qualified`                                 | `subid`, `payout`, `currency`, `event_id` / `tx_id`                           |

### Exemple d'URL Postback (GET)

```text
https://bonuvo.vercel.app/api/postbacks/1xpartners?subid={subid}&status=sale&event_id={tx_id}&payout={payout}&currency=USD&player_id={player_id}&ts={timestamp}&sig={signature}
```

---

## 3. Sécurité, signature et fenêtre temporelle

- **Secret hors base** : le nom de variable d'environnement est stocké dans `affiliate_networks.secret_env_ref` (ex. `AFFILIATE_1XPARTNERS_SECRET`, strictement préfixé `AFFILIATE_`).
- **Modes vérifiés en temps constant** (`crypto.timingSafeEqual`) :
  - `token` : jeton partagé passé via en-tête `x-postback-token` / `x-webhook-secret` / `Authorization: Bearer ...` ou paramètre `token` / `secret` (strippé avant stockage dans `raw_query` / `raw_headers`).
  - `hmac_sha256` : signature HMAC-SHA256 sur le corps brut (`POST`) ou la chaîne canonique triée sans `sig`/`signature` (`GET`), via en-tête `x-signature` ou paramètre `sig`.
- **Fenêtre temporelle anti-rejeu** : si `ts` / `timestamp` (secondes ou millisecondes Unix ou ISO-8601) ou l'en-tête `x-timestamp` est fourni, tout écart > `300 s` (`timestamp_tolerance_seconds`) dans le passé ou > `60 s` dans le futur est rejeté `401` et journalisé dans `security_events`.
- **Liste d'IP autorisées** : facultative dans `affiliate_networks.allowed_ips` (IP exacte ou CIDR v4).
- **Idempotence** : chaque événement brut est enregistré dans `postback_events` avant attribution ; un doublon sur `(network_id, external_event_id)` renvoie `200 { ok: true, duplicate: true }` sans créer de seconde conversion.
