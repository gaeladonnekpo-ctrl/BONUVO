# Dictionnaire des indicateurs — BONUVO INTELLIGENCE

Ce document fait référence pour tous les calculs affichés dans `/admin/statistiques` et exportés via `GET /api/admin/export/[report]`. Aucun indicateur n'est estimé ni extrapolé.

## 1. Règles fondamentales de fiabilité

- **Quatre faits distincts** :
  1. **Visiteurs / Vues / Copies de code** (`visit_events`) — mesuré sans cookie traceur publicitaire par empreinte journalière irréversible (`visitor_daily_hash`).
  2. **Clics sortants** (`clicks`) — mesuré lors de la redirection contrôlée `/go/[slug]`.
  3. **Inscriptions & Premiers dépôts (FTD)** (`conversions`) — exclusivement issus d'un postback, webhook signé ou import CSV tracé (`postback_event_id IS NOT NULL OR import_id IS NOT NULL`).
  4. **Commissions** (`commissions`) — montants déclarés par les partenaires ou imports ; confirmation soumise à justificatif (`proof_reference`).
- **Exclusions systématiques** :
  - **Robots et trafic suspect** : `visit_events.is_bot = true` exclu de tous les totaux ; `clicks.is_bot = true OR clicks.is_suspect = true` exclu de `valid_clicks` et des taux.
  - **Comptes internes et back-office** : les routes `/admin/*` et `/api/*` n'émettent jamais vers `visit_events` ; les conversions et commissions en statut `'rejected'` sont exclues des KPI positifs.
- **Zéro division par zéro et zéro donnée inventée** :
  - Si un dénominateur vaut `0`, le taux vaut `null` et s'affiche **`« — »`** à l'écran (et cellule vide ou `N/A` explicite en CSV).
  - Si un réseau d'affiliation a `tracking_mode = 'none'` et aucune conversion importée, les métriques post-clic (inscriptions, FTD, commissions, taux de conversion) affichent **`« — »`** (« données non disponibles ») et **jamais `0`**.

---

## 2. Catalogue des indicateurs

| Indicateur                       | Code                          | Source SQL      | Formule exacte                                                                                                                              | Exclusions                                 |
| -------------------------------- | ----------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **Visiteurs uniques (jour)**     | `unique_visitors`             | `visit_events`  | `COUNT(DISTINCT visitor_daily_hash)` par jour (et total de la période = somme des visiteurs uniques journaliers sur la granularité retenue) | `is_bot = false`                           |
| **Pages vues**                   | `page_views`                  | `visit_events`  | `COUNT(*)` avec `event_type = 'page_view'`                                                                                                  | `is_bot = false`                           |
| **Vues d'offres**                | `offer_views`                 | `visit_events`  | `COUNT(*)` avec `event_type = 'offer_view'`                                                                                                 | `is_bot = false`                           |
| **Copies de codes promo**        | `promo_copies`                | `visit_events`  | `COUNT(*)` avec `event_type = 'promo_copy'`                                                                                                 | `is_bot = false`                           |
| **Clics bruts**                  | `raw_clicks`                  | `clicks`        | `COUNT(*)`                                                                                                                                  | Aucune (inclut robots/suspects pour audit) |
| **Clics valides**                | `valid_clicks`                | `clicks`        | `COUNT(*)`                                                                                                                                  | `is_bot = false AND is_suspect = false`    |
| **Taux de clic (CTR offre)**     | `ctr_rate`                    | `daily_metrics` | `valid_clicks / unique_visitors` (ou `—` si `unique_visitors = 0`)                                                                          | Robots et suspects exclus                  |
| **Inscriptions déclarées**       | `registrations`               | `conversions`   | `COUNT(*)` avec `conversion_type = 'registration'`                                                                                          | `status <> 'rejected'`                     |
| **Premiers dépôts (FTD)**        | `first_deposits`              | `conversions`   | `COUNT(*)` avec `conversion_type = 'first_deposit'`                                                                                         | `status <> 'rejected'`                     |
| **Conversions qualifiées**       | `qualified_conversions`       | `conversions`   | `COUNT(*)` avec `conversion_type = 'qualified'`                                                                                             | `status <> 'rejected'`                     |
| **Taux clic → inscription**      | `click_to_reg_rate`           | `daily_metrics` | `registrations / valid_clicks` (`—` si `valid_clicks = 0` ou réseau sans suivi)                                                             | Suspects/robots et conversions rejetées    |
| **Taux inscription → FTD**       | `reg_to_ftd_rate`             | `daily_metrics` | `first_deposits / registrations` (`—` si `registrations = 0` ou réseau sans suivi)                                                          | Conversions rejetées                       |
| **Taux clic → FTD**              | `click_to_ftd_rate`           | `daily_metrics` | `first_deposits / valid_clicks` (`—` si `valid_clicks = 0` ou réseau sans suivi)                                                            | Suspects/robots et conversions rejetées    |
| **Commissions confirmées (#)**   | `confirmed_commissions_count` | `commissions`   | `COUNT(*)` avec `status IN ('confirmed', 'paid')`                                                                                           | `status IN ('pending', 'rejected')`        |
| **Commissions confirmées (EUR)** | `confirmed_commissions_eur`   | `commissions`   | `SUM(convertCurrencyAmount(amount, currency_code, 'EUR'))` pour `status IN ('confirmed', 'paid')`                                           | `pending` et `rejected` exclus             |
| **Commissions en attente (EUR)** | `pending_commissions_eur`     | `commissions`   | `SUM(convertCurrencyAmount(amount, currency_code, 'EUR'))` pour `status = 'pending'`                                                        | `confirmed`, `paid`, `rejected` exclus     |
| **Revenu par clic valide (EPC)** | `epc_eur`                     | `daily_metrics` | `confirmed_commissions_eur / valid_clicks` (`—` si `valid_clicks = 0` ou réseau sans suivi)                                                 | Exclusions ci-dessus                       |

---

## 3. Granularités de `daily_metrics`

Pour que les totaux globaux et filtrés par pays égalent exactement les requêtes SQL directes (sans double comptage d'un visiteur consultant plusieurs offres ou bookmakers le même jour), `aggregate-metrics` produit trois granularités dans `daily_metrics` :

1. **`day_total`** (`country_code = 'ALL'`, FKs `NULL`) : totaux exacts du site par date UTC (utilisés quand aucun filtre pays/bookmaker/campagne n'est actif).
2. **`day_country`** (`country_code = ISO/GLOBAL`, FKs `NULL`) : totaux exacts par date UTC et pays.
3. **`breakdown`** (`country_code`, `bookmaker_id`, `offer_id`, `campaign_id`) : découpage additif complet par dimensions métier pour les tableaux de ventilation, séries temporelles filtrées et classement des offres.
