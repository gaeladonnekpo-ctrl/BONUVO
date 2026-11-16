# ADR-0005 — Catalogue public BONUVO OFFERS, redirection `/go/[slug]` et collecte de clics

- **Statut** : En attente de validation humaine
- **Date** : 2026-11-16
- **Phase** : Phase 4 — BONUVO OFFERS public, redirection et clics

## Contexte

Le catalogue public doit afficher uniquement des données réelles publiées en Phase 3, respecter strictement l'éligibilité par pays (`B11`), protéger les redirections partenaires contre toute injection (`B2`), marquer les robots/rafales (`B3`) et mesurer chaque clic sortant ou copie de code promo sans cookie publicitaire tiers.

## Décisions

1. **Portées PostgreSQL dédiées (`public_catalog` et `public_tracking`)** :
   - La portée `public_catalog` accorde à `bonuvo_app` une lecture strictement bornée par RLS aux offres `published` non supprimées et dans leur fenêtre `[valid_from, valid_until)`, aux bookmakers `active`, aux codes promo actifs et aux liens actifs HTTPS validés par `private.url_host_allowed`.
   - La portée `public_tracking` permet l'insertion seule dans `clicks` et `visit_events`, en vérifiant côté RLS SQL qu'un clic cible obligatoirement un lien et un bookmaker actifs.
2. **Redirection `/go/[slug]` et contrôle `B2` / `B3`** :
   - `GET /go/[slug]` résout uniquement l'URL stockée en base, re-valide le schéma `https://` et `allowed_hosts` du bookmaker, génère un identifiant opaque `clk_<uuid>`, l'ajoute au paramètre `sub_id_param_name` du réseau, marque `is_bot` (via `isbot`) et `is_suspect` (rafale), enregistre le clic avec `ip_hash` HMAC-SHA256 et répond `302` (`Cache-Control: no-store`, `Referrer-Policy: no-referrer`).
   - Limitation de débit Upstash `go_redirect` à `30 / min / IP` (`429`) et `public_events` à `60 / min / IP` sur `POST /api/events`.
   - Aucune redirection n'est jamais lue depuis la query string de la requête.
3. **Détection pays, éligibilité `B11` et cache étiqueté** :
   - Résolution pays déterministe : `?pays=` → cookie `bonuvo_country` → en-tête hébergeur (`x-vercel-ip-country` / `cf-ipcountry`) → `GLOBAL`.
   - Les pages `/offres/[slug]` et `/bookmakers/[slug]` vérifient l'éligibilité pays côté serveur avant toute exposition de code promo ou lien `/go/...` ; une offre expirée, en brouillon ou désactivée répond `404` aussi bien en page qu'en `/go/[slug]`.
   - Les lectures publiques utilisent des étiquettes de cache Next.js (`offers`, `bookmakers`, `promo-codes`, `countries`) invalidées immédiatement par chaque écriture d'administration.
4. **Filtres partageables et SEO** :
   - Les filtres et la sélection du comparateur utilisent `nuqs` (état d'URL partageable).
   - Métadonnées localisées (`hreflang`), données structurées JSON-LD, `/sitemap.xml` dynamique et `/robots.txt` bloquant `/admin/`, `/compte/`, `/api/` et `/go/`.

## Conséquences

- Zéro donnée factice possible en production ou prévisualisation : un marché sans offre affiche `CountryGate` ou `EmptyState`.
- Isolation complète entre navigation anonyme, membres et administration via `bonuvo_app` + `SET LOCAL`.
