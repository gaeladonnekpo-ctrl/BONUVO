# Format d'import CSV partenaire (`conversion_imports`)

- **Date** : 2026-11-17
- **Route / Action** : `/admin/imports` (`previewConversionImportAction` -> confirmation humaine -> `commitConversionImportAction`)
- **Permission requise** : `conversions.manage` (`super_admin`, `admin`)

---

## 1. Colonnes attendues (UTF-8, séparateur `,` ou `;`)

| Colonne             | Obligatoire    | Format / Valeurs acceptées                                               |
| ------------------- | -------------- | ------------------------------------------------------------------------ |
| `external_event_id` | Oui            | Identifiant unique côté partenaire (anti-doublon par réseau)             |
| `bookmaker_slug`    | Oui            | Slug exact du bookmaker BONUVO (`1xbet`, `1win`, `melbet`, etc.)         |
| `conversion_type`   | Oui            | `registration`, `first_deposit`, `qualified` (alias `reg`, `ftd`, `cpa`) |
| `occurred_at`       | Oui            | ISO-8601 (`2026-11-16T14:30:00Z`) ou `YYYY-MM-DD HH:mm:ss`               |
| `amount`            | Non            | Montant numérique `>= 0` (vide autorisé pour inscription)                |
| `currency`          | Oui si montant | Code ISO-4217 actif ou autorisé (`XOF`, `USD`, `EUR`, ...)               |
| `click_id`          | Non            | Identifiant `clk_...` BONUVO pour rattachement au clic                   |
| `promo_code`        | Non            | Code promo (`GAEL229`, `GAEL228`) si attribution par code                |
| `player_id`         | Non            | Identifiant joueur anonymisé/partenaire                                  |
| `commission_model`  | Non            | `cpa`, `revshare`, `hybrid` (défaut `cpa` si `commission_amount` fourni) |
| `commission_amount` | Non            | Montant de commission `>= 0`                                             |
| `period_label`      | Non            | Période comptable (ex. `2026-11`)                                        |
| `proof_reference`   | Non            | Référence facture/relevé partenaire                                      |

---

## 2. Garanties d'intégrité

1. **Prévisualisation obligatoire** : aucune ligne n'est insérée en base lors de l'aperçu ; l'outil valide toutes les lignes (jusqu'à `5 000` lignes par fichier) et liste chaque erreur par numéro de ligne et motif exact.
2. **Traçabilité source** : chaque ligne acceptée pointe vers `conversion_imports.id` avec `source = "import"` (contrainte `CHECK (postback_event_id IS NOT NULL OR import_id IS NOT NULL)` en base).
3. **Anti-doublon** : les lignes déjà importées pour le même `(network_id, external_event_id)` ou dupliquées dans le CSV sont comptées et ignorées proprement sans doublon.
4. **Journalisation** : toute validation d'import crée une entrée dans `audit_log`.
