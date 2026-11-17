# Modèle statistique BONUVO AI — Spécification `poisson-v1.0`

Ce document décrit le modèle prédictif versionné `poisson-v1.0` utilisé pour les pronostics football publiés par BONUVO. Aucun réseau de neurones ni bibliothèque d'apprentissage opaque n'est utilisé dans cette version : l'ensemble du calcul est déterministe, reproductible à partir des données d'entrée et vérifiable à la main.

---

## 1. Sources de données et couverture fournisseur

- **Fournisseur** : API-Football (`v3.football.api-sports.io`) via l'adaptateur unique `src/modules/ai/providers/api-football.ts`. Aucune requête vers un fournisseur externe n'est autorisée hors de cet adaptateur.
- **Validation stricte** : chaque réponse JSON externe est validée par un schéma Zod avant toute écriture en base (`ingestion_runs`, `leagues`, `seasons`, `teams`, `fixtures`, `team_stats_snapshots`, `standings`). En cas de payload malformé, la réponse est rejetée et l'exécution consignée comme `failed` sans corrompre les tables.
- **Budget du plan gratuit (`100` requêtes/jour)** :
  - L'ingestion cible au départ `3` à `5` ligues prioritaires configurables en back-office (`tracked = true`).
  - Une réserve de sécurité (`quota_reserve = 10`) arrête proprement la tâche (`partial_quota_stop`) si l'en-tête `x-ratelimit-requests-remaining` indique un quota restant `<= quota_reserve`.
  - En l'absence de `API_FOOTBALL_KEY` ou de données ingérées, aucune donnée sportive n'est inventée : les écrans affichent un état vide explicite.

---

## 2. Seuil minimal de données (`MIN_MATCHES_THRESHOLD = 6`)

Un pronostic est **refusé** (`INSUFFICIENT_DATA`) si l'une des deux équipes compte moins de **6 matchs joués** dans la saison courante (`matches_played < 6`), ou si l'un des instantanés statistiques (`team_stats_snapshots`) fait défaut.

---

## 3. Calcul des buts attendus ($\lambda_{\text{dom}}$ et $\lambda_{\text{ext}}$)

Soient :

- $\mu_H$ la moyenne de buts marqués à domicile dans la ligue (par défaut $1{,}45$ si insuffisant) et $\mu_A$ celle à l'extérieur (par défaut $1{,}15$).
- Pour l'équipe à domicile $H$ et l'équipe à l'extérieur $A$ :
  - Taux offensif domicile de $H$ (ou global si $< 3$ matchs à domicile) : $a_H = \frac{\text{buts marqués}}{\text{matchs}}$, combiné avec la forme récente ($70\%$ saison + $30\%$ forme sur les $5$ derniers matchs si disponible).
  - Taux défensif domicile de $H$ : $d_H$.
  - Mêmes composantes à l'extérieur pour $A$ ($a_A$, $d_A$).
- Forces relatives rapportées aux moyennes de référence :
  $$\lambda_{\text{dom}} = \text{clamp}\!\left(\mu_H \cdot \frac{a_H}{\mu_H} \cdot \frac{d_A}{\mu_H},\; 0{,}20,\; 4{,}50\right)$$
  $$\lambda_{\text{ext}} = \text{clamp}\!\left(\mu_A \cdot \frac{a_A}{\mu_A} \cdot \frac{d_H}{\mu_A},\; 0{,}20,\; 4{,}50\right)$$

---

## 4. Grille de scores par loi de Poisson et marchés publiés

Pour chaque score exact $(i, j)$ avec $i, j \in \{0, \dots, 10\}$ :
$$P(X = i) = \frac{e^{-\lambda_{\text{dom}}} \lambda_{\text{dom}}^i}{i!}, \qquad P(Y = j) = \frac{e^{-\lambda_{\text{ext}}} \lambda_{\text{ext}}^j}{j!}$$
$$M_{i,j} = \frac{P(X = i)\, P(Y = j)}{\sum_{u=0}^{10}\sum_{v=0}^{10} P(X=u)\, P(Y=v)}$$

La matrice $M$ est normalisée pour que la somme des probabilités de chaque marché vaille **strictement `1`** :

1. **1X2 (`1x2`)** : $P(\text{home}) = \sum_{i>j} M_{i,j}$, $P(\text{draw}) = \sum_{i=j} M_{i,j}$, $P(\text{away}) = \sum_{i<j} M_{i,j}$.
2. **Plus/Moins 2,5 buts (`over_under_25`)** : $P(\text{over\_2\_5}) = \sum_{i+j \ge 3} M_{i,j}$, $P(\text{under\_2\_5}) = 1 - P(\text{over\_2\_5})$.
3. **Les deux équipes marquent (`btts`)** : $P(\text{yes}) = \sum_{i \ge 1,\, j \ge 1} M_{i,j}$, $P(\text{no}) = 1 - P(\text{yes})$.

---

## 5. Niveau de confiance (`low`, `medium`, `high`)

Soit $p_1$ la plus forte probabilité du marché, $p_2$ la deuxième plus forte, et $n = \min(\text{matchs}_H, \text{matchs}_A)$ :

- $\Delta = p_1 - p_2$
- **Score de confiance** :
  $$S = \text{round}\!\left(\min\!\left(1,\; 0{,}7 \cdot \min\!\left(1, \frac{\Delta}{0{,}35}\right) + 0{,}3 \cdot \min\!\left(1, \frac{n}{20}\right)\right),\; 4\right)$$
- **Paliers** :
  - `high` : $\Delta \ge 0{,}22$ et $n \ge 12$ (et $p_1 \ge 0{,}55$)
  - `medium` : $\Delta \ge 0{,}10$ et $n \ge 8$
  - `low` : dans tous les autres cas éligibles ($n \ge 6$).

---

## 6. Verrouillage, traçabilité, règlement et score de Brier

- **Empreinte d'entrée** : chaque pronostic enregistre `input_snapshot_hash` (SHA-256 canonique des statistiques d'entrée et paramètres).
- **Verrouillage irréversible avant coup d'envoi** : `locked_at` est positionné avant `kickoff_at`. Un trigger PostgreSQL (`predictions_lock_immutability_trigger`) interdit toute insertion après coup d'envoi ainsi que toute modification ou suppression une fois verrouillé.
- **Règlement automatique (`settle-predictions`)** :
  - Matchs `postponed`, `cancelled`, `abandoned` $\rightarrow$ `verdict = 'void'` (non comptés comme gagnés ni perdus).
  - Matchs `finished` $\rightarrow$ `won` ou `lost` selon le score final exact et calcul du **score de Brier** :
    - Pour 1X2 ($K=3$ issues) : $\sum_{k=1}^3 (p_k - y_k)^2$.
    - Pour marchés binaires (`over_under_25`, `btts`, $K=2$) : $(p_{\text{sel}} - y_{\text{won}})^2$ (plus proche de $0$ = meilleure calibration).

---

## 7. Garde-fou rédactionnel et option LLM

Toute analyse textuelle (modèle ou LLM optionnel activé via `AI_LLM_ENABLED=true`) passe obligatoirement par :

1. **Blocage des termes interdits** : « sûr », « garanti », « gain assuré », « 100% », « sans risque », « infaillible », « guaranteed », « risk-free », « safe bet ».
2. **Vérification des nombres** (si rédigée par LLM) : tout nombre présent dans le texte doit exister dans l'objet de faits d'entrée.
