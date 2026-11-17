# Documentation partenaire — 1win Partners (`1win`)

- **Date de vérification** : 2026-11-17
- **Opérateur couvert** : `1win` (`lkmv.cc`)
- **Adaptateur BONUVO** : `src/modules/affiliation/adapters/one-win.ts` (`adapterKey = "1win"`)
- **Mode de suivi** : `postback` S2S (`GET`) ou `webhook` JSON (`POST`) avec signature HMAC-SHA256, plus attribution secondaire par code promo (`GAEL228`).

---

## 1. Passage de l'identifiant de clic sortant (`/go/1win`)

BONUVO ajoute automatiquement `subid=clk_<uuid32>` (ou `sub1` si `sub_id_param_name = "sub1"` est configuré sur le réseau `1win-partners`) lors de la redirection `302`.

Lors du postback ou du webhook entrant, l'adaptateur `1win` lit l'identifiant de clic dans l'ordre :
`clickid` -> `click_id` -> `subid` -> `sub_id` -> `sub1`.

---

## 2. Événements et paramètres normalisés

| Macro / valeur `event` ou `status` chez 1win     | Type BONUVO (`conversion_type`) | Champs montant / joueur                                                             |
| ------------------------------------------------ | ------------------------------- | ----------------------------------------------------------------------------------- |
| `registration`, `reg`, `signup`                  | `registration`                  | `event_id` / `transaction_id`, `player_id` / `customer_id`, `promo_code`            |
| `ftd`, `first_deposit`, `first_time_deposit`     | `first_deposit`                 | `payout` / `sum` / `amount`, `currency`, `event_id` / `transaction_id`, `player_id` |
| `dep`, `deposit`, `cpa`, `revshare`, `qualified` | `qualified`                     | `payout` / `sum` / `amount`, `currency`, `event_id` / `transaction_id`              |

### Exemple Postback GET

```text
https://bonuvo.vercel.app/api/postbacks/1win-partners?clickid={clickid}&event=ftd&event_id={transaction_id}&payout={payout}&sum={amount}&currency={currency}&player_id={player_id}&token=...
```

### Exemple Webhook JSON POST

```json
{
  "event_id": "1w_tx_90812",
  "event": "ftd",
  "clickid": "clk_...",
  "player_id": "usr_7781",
  "sum": "15000",
  "payout": "25.00",
  "currency": "USD",
  "timestamp": 1794873600
}
```

Signé par HMAC-SHA256 dans l'en-tête `X-Signature` ou `X-Webhook-Signature` avec le secret référencé par `AFFILIATE_1WIN_SECRET`.

---

## 3. Règles de rejet et d'intégrité

- Un montant négatif (`< 0`), non numérique ou une devise absente du référentiel/liste ISO-4217 autorisée entraîne un rejet HTTP `400` tout en conservant la trace brute marquée `rejected` dans `postback_events`.
- Si le clic correspondant n'est pas trouvé et qu'aucun code promo actif ne permet l'attribution, l'événement reste conservé comme `unattributed` (`click_id = null`) sans jamais inventer de clic.
- Si aucun postback/webhook n'est encore configuré pour un réseau (`tracking_mode = "none"`), le back-office affiche explicitement « données non disponibles ».
