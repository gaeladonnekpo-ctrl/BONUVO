# Guide de saisie du catalogue — BONUVO Admin (Phase 3)

Ce guide décrit le parcours complet de saisie et de vérification d'une fiche opérateur réelle dans `/fr/admin`.

---

## 1. Prérequis d'accès

1. Se connecter sur `/fr/connexion` avec un compte disposant d'un rôle d'administration (`super_admin`, `admin`, `editor`) et valider le second facteur TOTP sur `/fr/double-authentification`.
2. Vérifier dans **Pays (`/fr/admin/pays`)** que les pays cibles (ex. `BJ`, `CI`, `SN`, `FR`) sont **actifs**.

## 2. Créer un bookmaker (`/fr/admin/bookmakers`)

1. Saisir le **nom officiel**, le **slug URL** (minuscules, chiffres et tirets uniquement) et au moins un **hôte autorisé** (ex. `betclic.ci`).
2. Téléverser le logo (`PNG`, `JPEG` ou `WebP`, `<= 2 Mo`) : le serveur vérifie les octets magiques, supprime les métadonnées EXIF, ré-encode l'image et l'enregistre hors application.
3. Ouvrir la fiche du bookmaker pour renseigner :
   - Les **licences et scores par pays** (`bookmaker_countries`),
   - Les **moyens de paiement et dépôts minimums** (`bookmaker_payment_methods`),
   - La **grille de notation pondérée /10** (`bookmaker_ratings`).

## 3. Saisir, vérifier et publier une offre (`/fr/admin/offres`)

1. Créer l'offre (montant en valeur exacte, devise ISO 4217, dépôt minimum, conditions de rollover et pays éligibles). Toute offre est créée à l'état **`draft` (brouillon)**.
2. Sur la fiche de l'offre, ajouter les **conditions détaillées**, les **arguments (+ / -)** et, si applicable, un **code promo**.
3. Cliquer sur **« Marquer comme vérifiée aujourd'hui »** uniquement après contrôle réel des conditions sur le site du partenaire : l'horodatage réel est enregistré avec votre identifiant.
4. Cliquer sur **« Publier l'offre »** (réservé aux rôles disposant de `offers.publish` : `admin` et `super_admin`).

## 4. Ajouter un lien d'affiliation (`/fr/admin/affiliation`)

1. Choisir le bookmaker, saisir un **slug `/go/...` unique** et une URL **`https://`** dont le nom d'hôte figure dans `allowed_hosts` du bookmaker (toute URL HTTP ou vers un domaine non autorisé est rejetée par le serveur et par PostgreSQL RLS).
2. Contrôler toutes les écritures et états avant/après dans **Journal (`/fr/admin/journal`)**.
