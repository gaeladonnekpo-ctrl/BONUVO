BONUVO — Plan d'implémentation technique

Synthèse et mode d'emploi
BONUVO se construit en 11 phases (0 à 10), chacune validée par des tests et un compte rendu avant la suivante. Ce document est la feuille de route d'Antigravity : il fixe l'architecture, l'ordre de construction et les preuves à fournir. Il ne contient aucun code applicatif.
Signature de marque : BONUVO: SMART OFFERS. BETTER CHOICES.
Décisions structurantes
Sujet	Décision	Statut
Application	Monolithe modulaire Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4	Obligatoire
Base de données	PostgreSQL, schéma versionné par migrations, accès serveur uniquement	Obligatoire
Fournisseur Postgres + Auth	Supabase (base, authentification, stockage) ; alternative Neon + Better Auth	À confirmer en phase 0
Hébergement	Vercel Pro dès l'ouverture publique ; le plan Hobby interdit l'usage commercial, donc un site d'affiliation	À confirmer (dépense)
Rate limiting	Upstash Redis, côté serveur, compatible distribué	Obligatoire
Pronostics	Modèle statistique déterministe calculé sur des données stockées ; un LLM ne sert qu'à rédiger, jamais à produire un chiffre	Obligatoire
Données sportives	API-Football, ingestion par lots dans la base, jamais d'appel depuis une requête visiteur	À confirmer (clé et saisons du plan gratuit)
Données réelles	Aucune offre, note, conversion, commission ou statistique inventée ; un état vide remplace toute donnée absente	Obligatoire
Ordre de construction	L'administration (phase 3) précède le catalogue public (phase 4) : les offres réelles sont saisies, pas simulées	Obligatoire
Comment lire ce document
•	Les sections 1 à 9 décrivent la cible : architecture, données, API, interfaces, modules.
•	La section 10 est le plan d'exécution. Antigravity traite une phase à la fois, dans l'ordre.
•	La section 11 contient l'audit de sécurité des 41 contrôles, à exécuter avec preuves.
•	Les sections 17 et 18 regroupent les règles de travail de l'agent et la checklist finale.
•	« Obligatoire » ne se renégocie pas sans validation humaine. « À confirmer » se tranche à l'inspection de l'environnement.
Points à valider par un humain avant de lancer la phase 0
•	☐ Budget d'hébergement : Vercel Pro (20 $/mois) au lancement, ou Cloudflare Workers en alternative.
•	☐ Liste initiale des bookmakers partenaires, avec pour chacun le programme d'affiliation, l'identifiant affilié et le mode de suivi disponible (postback, export, tableau de bord seul).
•	☐ Pays cibles au lancement et langues (français d'abord, anglais ensuite, par défaut).
•	☐ Validation juridique par pays : la promotion d'opérateurs de jeux est réglementée et souvent réservée aux opérateurs licenciés localement.
1. Présentation et vision du projet
BONUVO est une plateforme internationale qui présente, compare et met à jour les codes promotionnels, bonus et offres de bookmakers, et se rémunère par l'affiliation. Le revenu naît d'un parcours précis : un visiteur trouve une offre adaptée à son pays, clique, s'inscrit chez le partenaire, dépose, et le partenaire confirme une commission.
Ce que la plateforme doit réussir
1.	Inspirer confiance. Conditions de bonus lisibles, dates de validité, pays éligibles, mention d'affiliation visible, date de dernière vérification réelle.
2.	Convertir. Un chemin court entre l'offre et le partenaire, un code copiable en un geste, un bouton d'action unique par carte.
3.	Mesurer vrai. Clics, inscriptions, premiers dépôts et commissions sont quatre faits distincts, chacun tracé jusqu'à sa source.
4.	Fidéliser. Pronostics football vérifiables, actualités, communauté Telegram et WhatsApp, espace membre facultatif.
5.	Durer. Une architecture qui accepte de nouveaux pays, langues, bookmakers et sports sans refonte.
Publics
Public	Besoin	Accès
Visiteur	Trouver et comparer une offre valable dans son pays	Libre, sans compte
Membre	Préférences, pays, historique, notifications consenties	Compte facultatif
Éditeur	Saisir et tenir à jour bookmakers, offres, contenus	Back-office, rôle limité
Analyste	Lire les performances	Back-office, lecture seule
Administrateur	Rôles, configuration, liens d'affiliation, journal	Back-office, tous droits
Hors périmètre
BONUVO ne prend aucun pari, ne détient aucun fonds et ne traite aucun paiement de joueur. Aucun gain n'est promis. Les contenus s'adressent aux adultes ; un rappel 18+ et un message de jeu responsable figurent sur toutes les pages d'offres et de pronostics.
2. Références visuelles : ce qu'on retient des quatre captures
Les quatre sites fournis convergent vers un même schéma : une liste classée de cartes, une promesse chiffrée par carte, un seul bouton d'action. BONUVO reprend ces motifs, les relie à des données réelles et ne copie ni logos, ni textes, ni identité graphique.
Référence	Motifs à reprendre	Traduction dans BONUVO
Transfermarkt, bookmakers Afrique	Compteur de résultats à côté du titre, tri « Classer par note », badges Recommandé / Exclusif / Nouveau, note chiffrée en vert, deux indicateurs par carte, bouton pleine largeur, mention « Sponsorisé »	OfferList avec compteur et tri ; Badge piloté par des champs de la base ; RatingScore ; ligne d'indicateurs ; mention d'affiliation permanente dans l'en-tête de liste
Eurosport, meilleurs sites	Ruban d'étiquette au coin de la carte, logo rond, étoiles, titre du bonus au centre, trois arguments cochés, bouton nommant le bookmaker, pied de carte « Vérifié », « Sous licence en », bouton CGU	OfferCard en quatre zones : identité, promesse, arguments, action ; pied de carte avec date de vérification, licence par pays et ouverture des conditions dans un panneau
Afrik-Foot, classement	Rang numéroté, navigation par intention (bonus, applications, sites, pronostics, actus), moyens de paiement locaux, rollover annoncé, points faibles affichés	Rang visible sur les classements ; menu principal par intention ; champs moyens de paiement et rollover ; un argument négatif autorisé par carte
Mejor Prono	Thème sombre bleu nuit, grille de logos partenaires, bloc code promo en pointillés avec bouton Copier, mention « Valable sur », boutons flottants WhatsApp et Telegram, menu court	Thème sombre par défaut ; PartnerLogoGrid ; PromoCodeBox ; CommunityFab ; cinq entrées de menu au maximum sur mobile
Règles tirées de ces références
•	« Vérifié aujourd'hui » ne s'affiche que si le champ last_verified_at de l'offre date du jour. Sinon la carte affiche la date réelle, ou rien.
•	Les notes suivent une grille de critères publiée sur une page « Méthodologie ». Pas de note sans grille remplie.
•	Les badges Recommandé, Exclusif et Nouveau sont des champs saisis en administration. Nouveau expire automatiquement après 30 jours.
•	La licence s'affiche par pays, depuis la table d'éligibilité. Un bookmaker non éligible dans le pays du visiteur n'apparaît pas dans ses listes.
•	Le code promo se copie en un geste ; l'action est comptée comme événement, distinct du clic sortant.
•	Les montants s'affichent dans la devise du pays (XOF, EUR, etc.) tels que saisis ; aucune conversion automatique de bonus.
Direction visuelle proposée
Élément	Proposition	Statut
Thème	Sombre bleu nuit par défaut, thème clair disponible	
Couleur d'action	Une seule teinte vive réservée aux boutons d'action (jaune-vert ou bleu électrique)	
Couleur de confiance	Vert pour notes, vérifications et états positifs uniquement	Obligatoire
Typographie	Une police de titres à forte graisse, une police de texte lisible, chargées via next/font	À confirmer
Cartes	Fond légèrement relevé, rayon 12 px, une seule action principale	Obligatoire
Mobile	Carte empilée : identité, promesse, code, bouton pleine largeur	Obligatoire
3. Architecture technique globale et schéma des composants
BONUVO est un monolithe modulaire : une seule application Next.js sert le site public, l'espace membre, le back-office et les API, au-dessus d'une base PostgreSQL unique. Ce choix évite les coûts et la complexité de microservices tant que l'équipe et le trafic sont réduits, et garde chaque module isolé dans son dossier pour une extraction future.
 
architecture · 3 entrées, 1 application, 4 dépendances
Toutes les entrées passent par l'application ; elle seule accède à la base, à Redis, au stockage et aux API externes.
Principes
1.	Rendu serveur d'abord. Les pages publiques sont des Server Components mis en cache et revalidés par étiquette ; le JavaScript client se limite aux filtres, au comparateur, à la copie de code et aux graphiques.
2.	Une seule porte vers les données. Seul le serveur parle à la base. Le navigateur ne reçoit jamais de clé de service ni de chaîne de connexion.
3.	Trois couches par module. schema (validation Zod), service (règles métier), repository (requêtes). Les routes et pages n'appellent que les services.
4.	Écritures par Server Actions, intégrations par Route Handlers. Les formulaires passent par des actions serveur protégées ; les webhooks, postbacks, tâches planifiées et redirections passent par /api et /go.
5.	Tâches hors requête. Ingestion sportive, calcul des pronostics, agrégats statistiques et envois tournent en tâches planifiées signées, jamais pendant l'affichage d'une page.
6.	Refus par défaut. Toute route est fermée tant qu'une règle d'accès explicite ne l'ouvre pas.
Composants
Composant	Rôle	Technologie
Site public	Offres, comparateur, pronostics, communauté, pages éditoriales	Next.js, rendu serveur, cache par étiquette
Espace membre	Profil, préférences, consentements, historique	Next.js, session serveur
Back-office	Catalogue, liens, pronostics, contenus, rôles, statistiques, journal	Next.js, segment /admin protégé
Redirection d'affiliation	/go/[slug] : enregistre le clic, redirige vers une URL stockée	Route Handler
Réception des conversions	Postbacks et webhooks signés, dédupliqués	Route Handlers
Tâches planifiées	Ingestion, pronostics, règlement des résultats, agrégats, expiration des offres	Planificateur + Route Handlers signés
Base de données	Source de vérité unique	PostgreSQL
Cache et limites	Rate limiting, verrous de tâches, déduplication courte	Redis (Upstash)
Stockage de fichiers	Logos et visuels validés	Stockage objet
Fournisseurs externes	Données sportives, e-mail, réseaux d'affiliation, Telegram, WhatsApp	API tierces, toutes derrière un adaptateur
Flux critiques²&
•	Clic sortant. Carte → /go/[slug] → contrôle du lien actif et du pays → création du clic avec identifiant unique → redirection 302 vers l'URL du partenaire, l'identifiant étant passé dans le paramètre de sous-affilié prévu par le programme.
•	Conversion. Le partenaire appelle le postback → vérification de signature → enregistrement brut → déduplication → rattachement au clic → création ou mise à jour de la conversion.
•	Pronostic. Ingestion des matchs et statistiques → calcul du modèle → pronostic figé et horodaté avant le coup d'envoi → après le match, règlement automatique à partir du score du fournisseur → mise à jour de la précision.
•	Publication d'offre. Saisie en administration → validation → publication → invalidation du cache des pages concernées → entrée au journal d'audit.
4. Stack technologique recommandée et justification
La stack tient en un langage (TypeScript), un framework (Next.js) et une base (PostgreSQL) ; tout le reste démarre sur des plans gratuits, sauf l'hébergement au lancement public. Les versions exactes sont figées en phase 0 après inspection (npm show <paquet> version).
Choix retenus
Couche	Choix	Pourquoi	Statut
Framework	Next.js 16, App Router	Rendu serveur et cache pour le SEO, API et interface dans un même dépôt, exigé par le cahier des charges	Obligatoire
Langage	TypeScript, mode strict	Erreurs détectées à la compilation, contrats partagés entre client et serveur	Obligatoire
Interface	React 19, Tailwind CSS 4, composants shadcn/ui (Radix)	Composants accessibles copiés dans le dépôt, donc modifiables et sans dépendance lourde	Obligatoire
Validation	Zod	Un seul schéma pour formulaires, actions serveur et API	Obligatoire
Base	PostgreSQL	Relations fortes (offres, pays, clics, conversions), contraintes d'unicité, agrégats SQL	Obligatoire
ORM et migrations	Drizzle ORM + drizzle-kit	Requêtes typées et paramétrées, migrations SQL lisibles et versionnées	Recommandé
Authentification	Supabase Auth (e-mail, vérification, réinitialisation, TOTP)	Évite d'écrire soi-même le stockage des mots de passe et des sessions	À confirmer
Rate limiting	Upstash Redis + @upstash/ratelimit	Fonctionne en serverless et en distribué, plan gratuit suffisant au départ	Obligatoire
Internationalisation	next-intl, routes /[locale]	Français puis anglais, URL et balises hreflang par langue	Obligatoire
Graphiques	Recharts	Suffisant pour courbes et barres du back-office	Recommandé
E-mail	Resend (API ou SMTP)	Plan gratuit de 3 000 e-mails/mois, plafonné à 100/jour	À confirmer
Tests	Vitest (unitaires, intégration), Playwright (bout en bout)	Standards de l'écosystème, rapides en CI	Obligatoire
Qualité	ESLint, Prettier, tsc --noEmit, Husky + lint-staged	Barrière automatique avant chaque commit	Obligatoire
CI	GitHub Actions	Gratuit pour ce volume ; lint, types, tests, audit de dépendances, recherche de secrets	Obligatoire
Supervision	Sentry (erreurs), journaux de l'hébergeur	Plan gratuit au départ, limites à vérifier	Recommandé
Comparaisons
Base de données et authentification
Option	Atouts	Limites	Verdict
Supabase (Postgres + Auth + stockage)	Un seul service pour trois besoins ; RLS ; vérification d'e-mail, réinitialisation et TOTP fournis	Plan gratuit : 500 Mo de base, 2 projets, mise en pause après 7 jours d'inactivité ; Pro à 25 $/mois	Recommandé
Neon + Better Auth	Postgres serverless sans pause hebdomadaire, branches de base par environnement, aucune dépendance d'authentification	Plan gratuit : 0,5 Go et 100 heures de calcul par projet, démarrage à froid ; authentification et stockage de fichiers à assembler soi-même	Alternative
MongoDB ou autre NoSQL	Souplesse de schéma	Mal adapté aux jointures et à l'unicité exigées par le suivi des conversions	Écarté
La pause Supabase ne concerne pas un site en activité : les tâches planifiées quotidiennes et le trafic maintiennent le projet actif. Le passage au plan Pro devient nécessaire avant d'approcher 400 Mo ou dès que les sauvegardes quotidiennes sont exigées.
Hébergement
Option	Atouts	Limites	Verdict
Vercel 	Intégration native Next.js, prévisualisations par branche, tâches planifiées		Recommandé au lancement
Vercel Hobby	Gratuit	Réservé à l'usage personnel non commercial : exclu pour un site d'affiliation public	Développement privé seulement
Cloudflare Workers (adaptateur OpenNext)	Plan gratuit de 100 000 requêtes/jour, usage commercial possible	10 ms de CPU par requête sur le plan gratuit, juste pour du rendu serveur ; le middleware Node de Next.js reste non pris en charge par l'adaptateur	Alternative économique
VPS + Docker	Coût fixe bas, contrôle total	Exploitation, sécurité et mises à jour à la charge de l'équipe	Plus tard, si le coût l'impose
Données sportives
Option	Atouts	Limites	Verdict
API-Football	Tous les endpoints sur tous les plans ; gratuit 100 requêtes/jour 	Saisons limitées sur le plan gratuit : à vérifier avec une vraie clé	Recommandé
football-data.org	Gratuit pour une douzaine de grandes compétitions	Couverture et statistiques réduites, 10 requêtes/minute	Secours ou complément
TheSportsDB	Gratuit, large	Données contributives, fiabilité inégale	Écarté pour les pronostics
Moteur de pronostics
Option	Atouts	Limites	Verdict
Modèle statistique maison (Poisson sur buts attendus + forme + confrontations)	Reproductible, explicable, gratuit, vérifiable ligne par ligne	Moins fin qu'un modèle entraîné	Obligatoire pour la première version
Endpoint de prédictions du fournisseur	Immédiat	Boîte noire, impossible à justifier	Affichage comparatif éventuel, jamais seul
LLM pour la rédaction	Texte d'analyse lisible à partir des chiffres calculés	Coût par appel, risque d'invention : sortie contrôlée contre les données d'entrée	Optionnel, phase 7, derrière un interrupteur
5. Arborescence indicative du projet
Le code s'organise par module métier dans src/modules, et les routes dans src/app ne contiennent que de l'assemblage. Cette arborescence est indicative : Antigravity la confirme en phase 0 et consigne tout écart dans docs/decisions.
bonuvo/
├── .github/workflows/          ci.yml, security.yml
├── docs/
│   ├── architecture.md
│   ├── decisions/              ADR-0001-stack.md, ...
│   ├── phases/                 phase-00-rapport.md, ...
│   └── security/               audit-41-controles.md
├── drizzle/                    migrations SQL versionnées
├── messages/                   fr.json, en.json
├── public/                     icônes, images statiques
├── scripts/                    seed-reference.ts (pays, rôles), check-env.ts
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (public)/
│   │   │   │   ├── page.tsx                    accueil
│   │   │   │   ├── bookmakers/page.tsx         répertoire
│   │   │   │   ├── bookmakers/[slug]/page.tsx  fiche
│   │   │   │   ├── offres/page.tsx             catalogue
│   │   │   │   ├── offres/[slug]/page.tsx      détail
│   │   │   │   ├── codes-promo/page.tsx
│   │   │   │   ├── comparateur/page.tsx
│   │   │   │   ├── pronostics/page.tsx
│   │   │   │   ├── pronostics/[fixtureId]/page.tsx
│   │   │   │   ├── pronostics/historique/page.tsx
│   │   │   │   ├── communaute/page.tsx
│   │   │   │   ├── actualites/[slug]/page.tsx
│   │   │   │   └── (legal)/                    méthodologie, mentions, confidentialité, jeu responsable
│   │   │   ├── (auth)/                         connexion, inscription, mot-de-passe-oublie, reinitialisation, verification
│   │   │   ├── (members)/compte/               profil, preferences, consentements, historique, suppression
│   │   │   └── admin/                          dashboard, bookmakers, offres, codes, liens, campagnes,
│   │   │                                       conversions, pronostics, contenus, utilisateurs, roles,
│   │   │                                       pays, statistiques, journal, parametres
│   │   ├── go/[slug]/route.ts                  redirection d'affiliation
│   │   └── api/
│   │       ├── postbacks/[network]/route.ts
│   │       ├── webhooks/[provider]/route.ts
│   │       ├── cron/[job]/route.ts
│   │       ├── events/route.ts                 copie de code, vues
│   │       └── health/route.ts
│   ├── components/
│   │   ├── ui/                 primitives (bouton, champ, dialogue, tableau, ...)
│   │   ├── layout/             Header, Footer, Sidebar, MobileNav, AdminShell
│   │   └── feedback/           Skeleton, EmptyState, ErrorState
│   ├── modules/
│   │   ├── offers/             components, schema.ts, service.ts, repository.ts, actions.ts
│   │   ├── affiliation/
│   │   ├── ai/                 providers/, model/, service.ts
│   │   ├── community/
│   │   ├── members/
│   │   ├── admin/
│   │   └── intelligence/
│   ├── server/
│   │   ├── db/                 client.ts, schema/ (un fichier par domaine)
│   │   ├── auth/               session.ts, permissions.ts, guards.ts
│   │   ├── security/           rate-limit.ts, signatures.ts, redirect.ts, headers.ts
│   │   ├── audit/              log.ts
│   │   └── env.ts              validation Zod des variables d'environnement
│   ├── lib/                    utilitaires purs, formatage, constantes
│   ├── i18n/                   configuration next-intl
│   └── proxy.ts                locale, en-têtes, garde /admin (nommé middleware.ts selon la version)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example                noms des variables, aucune valeur
├── .gitignore
├── drizzle.config.ts
├── next.config.ts
├── package.json
└── README.md
Règles d'organisation
•	Un module n'importe jamais le repository d'un autre module ; il passe par son service.
•	Tout fichier de src/server commence par import "server-only".
•	Un composant utilisé par deux modules monte dans src/components.
•	Aucun fichier ne dépasse 300 lignes sans justification écrite.
6. Architecture de la base de données : tables et relations
La base compte environs 45 tables réparties en six domaines, créées progressivement : chaque phase n'ajoute que les tables dont elle a besoin. Toutes les tables portent id (UUID), created_at et updated_at ; les tables éditoriales portent en plus status et deleted_at (suppression logique).
Identité et accès
Table	Contenu principal	Relations et contraintes
profiles	Nom affiché, pays, langue, fuseau	1-1 avec l'utilisateur d'authentification
roles	super_admin, admin, editor, analyst, member	Nom unique
permissions	Clés du type offers.write, links.manage, stats.read	Clé unique
role_permissions	Association rôle ↔ permission	Clé composite
user_roles	Association utilisateur ↔ rôle	Clé composite ; modification journalisée
consents	Type (e-mail marketing, notifications, mesure d'audience), valeur, version du texte, date, IP hachée	N-1 vers profiles ; historique conservé, jamais écrasé
communication_preferences	Canaux et thèmes choisis	1-1 avec profiles
member_activity	Offres consultées, codes copiés, pronostics suivis	N-1 vers profiles ; purge à la suppression du compte
account_deletion_requests	Demande, date d'exécution prévue, état	N-1 vers profiles
Catalogue (BONUVO OFFERS)
Table	Contenu principal	Relations et contraintes
countries	Code ISO, nom, devise, langue par défaut, actif	Code unique
bookmakers	Nom, slug, logo, description, année, applications, statut	Slug unique
bookmaker_countries	Éligibilité, licence locale, autorité, note par pays	Unique (bookmaker_id, country_id)
payment_methods	Mobile Money, Orange Money, carte, crypto, etc.	Nom unique
bookmaker_payment_methods	Moyen disponible par bookmaker et par pays	Clé composite
bookmaker_ratings	Critères notés (bonus, paiements, cotes, application, support), note finale calculée	N-1 vers bookmakers ; version de la grille
offers	Type (bienvenue, spéciale, recharge, cashback), titre, montant, devise, pourcentage, dépôt minimum, rollover, cote minimum, valid_from, valid_until, last_verified_at, verified_by, badges, rang	N-1 vers bookmakers ; contrainte valid_until > valid_from
offer_countries	Pays où l'offre est valable	Clé composite
offer_terms	Conditions détaillées, par langue	N-1 vers offers
offer_highlights	Arguments affichés sur la carte, positifs ou négatifs, ordonnés	N-1 vers offers
promo_codes	Code, bookmaker, offre liée, validité, pays	Unique (bookmaker_id, code)
media_assets	Fichier validé, type MIME vérifié, dimensions, auteur	Référencé par bookmakers et contenus
Affiliation et tracking
Table	Contenu principal	Relations et contraintes
affiliate_networks	Programme ou réseau, mode de suivi (postback, webhook, import, aucun), nom du paramètre de sous-affilié, référence du secret	Nom unique ; le secret reste en variable d'environnement
affiliate_links	Slug public, URL de destination, hôte autorisé, bookmaker, pays, réseau, actif	Slug unique ; l'hôte de l'URL doit figurer dans allowed_hosts du bookmaker
campaigns	Nom, source, support, dates, code UTM	Clé unique par campagne
clicks	Identifiant de clic public, lien, offre, campagne, pays, appareil, référent, IP hachée, session anonyme, indicateur robot	N-1 vers affiliate_links ; index sur date et lien ; partition mensuelle prévue
postback_events	Charge brute reçue, en-têtes utiles, résultat de signature, identifiant externe, état de traitement	Unique (network_id, external_event_id) : déduplication
conversions	Type (registration, first_deposit, qualified), clic rattaché, montant, devise, date de l'événement, source (postback, webhook, import), état	N-1 vers clicks (nullable si attribution par code) ; N-1 vers postback_events
commissions	Montant, devise, modèle (CPA, partage de revenus, hybride), état (pending, confirmed, rejected, paid), période	N-1 vers conversions ou vers un import de période
conversion_imports	Fichier importé, auteur, période, lignes acceptées et rejetées	Source de toute conversion saisie manuellement
Sport et pronostics (BONUVO AI)
Table	Contenu principal	Relations et contraintes
sports_providers	Fournisseur, état, quota journalier	—
leagues, seasons, teams	Référentiels, avec identifiant externe du fournisseur	Unique (provider_id, external_id)
fixtures	Match, date, état, score, ligue, saison	N-1 vers leagues, teams (domicile, extérieur)
team_stats_snapshots	Statistiques d'équipe à une date : buts marqués et encaissés, forme, domicile et extérieur	N-1 vers teams ; horodatage de la source
standings	Classement par ligue et saison	—
ingestion_runs	Tâche, début, fin, requêtes consommées, erreurs	Traçabilité de chaque donnée
model_versions	Version du modèle, paramètres, date d'activation	—
predictions	Match, marché (1X2, plus/moins 2,5, les deux marquent), probabilités, choix, niveau de confiance, version du modèle, empreinte des données d'entrée, published_at, locked_at	Unique (fixture_id, market, model_version_id) ; non modifiable après locked_at
prediction_results	Issue réelle, verdict (won, lost, void), date de règlement	1-1 avec predictions
Contenus et communauté
Table	Contenu principal	Relations et contraintes
posts	Annonces et actualités, par langue, statut, auteur	Slug unique par langue
community_channels	Type (chaîne Telegram, chaîne WhatsApp, groupe WhatsApp), URL d'invitation, pays, actif	URL validée contre une liste d'hôtes
coupons	Coupon validé : sélections, cote totale, bookmaker, validateur, date	N-1 vers bookmakers ; lien facultatif vers predictions
notifications	Message, canal, cible, planification	—
notification_deliveries	Envoi par destinataire, état	Envoi interdit sans consentement actif
Système
Table	Contenu principal	Relations et contraintes
audit_log	Acteur, action, entité, avant, après, IP hachée, date	Insertion seule : ni mise à jour ni suppression
security_events	Échecs de connexion, blocages, signatures invalides, refus d'accès	Insertion seule
settings	Paramètres généraux typés	Clé unique
visit_events	Vue de page : chemin, pays, appareil, identifiant visiteur journalier haché	Purge à 90 jours
daily_metrics	Agrégats par jour, pays, bookmaker, offre, campagne : visiteurs, clics, inscriptions, premiers dépôts, commissions	Unique sur les dimensions ; recalculable
Relations clés
•	Un bookmaker possède plusieurs offres, codes, liens d'affiliation et fiches pays.
•	Une offre est valable dans plusieurs pays ; un pays voit plusieurs offres.
•	Un lien d'affiliation reçoit plusieurs clics ; un clic peut donner plusieurs conversions (inscription, puis premier dépôt).
•	Une conversion donne zéro ou une commission ; une commission ne devient confirmed que sur preuve du partenaire.
•	Un match porte plusieurs pronostics (un par marché et par version de modèle) ; chaque pronostic a un seul résultat.
Règles de données
•	Montants en type numeric, jamais en flottant, avec la devise dans une colonne voisine.
•	Dates en timestamptz, stockées en UTC, affichées dans le fuseau du visiteur.
•	Adresses IP jamais stockées en clair : hachage avec sel secret.
•	RLS activée sur toutes les tables, politique de refus par défaut, y compris si l'accès passe par le serveur.
7. Organisation des API et endpoints
Les lectures publiques passent par le rendu serveur, les écritures internes par des Server Actions, et seules les intégrations machine exposent des routes HTTP. Cette répartition réduit la surface d'attaque : moins de routes publiques, moins de contrôles à oublier.
Conventions
•	Toute entrée (corps, paramètres, en-têtes utiles) est validée par un schéma Zod avant tout traitement.
•	Réponse d'erreur uniforme : { "error": { "code": "...", "message": "..." } }, sans trace technique ni détail interne.
•	Chaque action serveur commence par requirePermission("...") et finit par une écriture au journal d'audit si elle modifie des données.
•	Pagination par curseur, 50 éléments au maximum par page.
•	Les routes machine exigent une signature ou un secret ; elles ne dépendent jamais d'un cookie.
Routes HTTP
Méthode et chemin	Rôle	Protection	Phase
GET /go/[slug]	Enregistre le clic, redirige vers le partenaire	Lien actif, pays éligible, hôte autorisé, limite par IP	4
POST /api/events	Copie de code, vue d'offre, vue de page	Schéma strict, limite par IP, aucun identifiant personnel	4
GET ou POST /api/postbacks/[network]	Réception des conversions des programmes d'affiliation	Signature ou jeton par réseau, déduplication, limite	5
POST /api/webhooks/[provider]	Webhooks e-mail, Telegram	Signature du fournisseur, fenêtre temporelle de 5 minutes	5, 8
POST /api/cron/[job]	Ingestion, pronostics, règlement, agrégats, expiration, purges	Secret de planification, verrou Redis contre l'exécution double	6, 7
GET /api/health	État de l'application et de la base	Aucune donnée sensible	0
GET /api/admin/export/[report]	Export CSV des statistiques	Session + permission stats.export, journalisé	6
Server Actions par module
Module	Actions	Permission minimale
Authentification	signUp, signIn, signOut, requestPasswordReset, resetPassword, resendVerification, verifyTotp	Public, avec rate limiting
Membres	updateProfile, updatePreferences, setConsent, unsubscribe, requestAccountDeletion, exportMyData	Propriétaire du compte
Offres	createBookmaker, updateBookmaker, archiveBookmaker, createOffer, updateOffer, publishOffer, disableOffer, deleteOffer, markOfferVerified, upsertPromoCode, setCountryEligibility	offers.write ; offers.publish pour publier
Affiliation	createAffiliateLink, updateAffiliateLink, disableAffiliateLink, createCampaign, importConversions, setCommissionStatus	links.manage, conversions.manage
Pronostics	publishPrediction, unpublishPrediction, voidPrediction, rerunModel, createCoupon	predictions.manage
Contenus et communauté	createPost, publishPost, updateChannel, scheduleNotification	content.write, community.manage
Administration	assignRole, revokeRole, suspendUser, updateSetting, uploadMedia	users.manage, settings.manage
Lectures
Les pages publiques lisent via les services (listOffers, getBookmaker, compareOffers, listFixtures, getPredictionStats) avec cache étiqueté : offers, bookmaker:{id}, predictions, posts. Toute publication invalide l'étiquette concernée.
Tâches planifiées
Tâche	Fréquence de départ	Effet
expire-offers	Toutes les heures	Désactive les offres dont valid_until est passé
ingest-fixtures	1 fois par jour	Calendrier des 7 prochains jours pour les ligues suivies
ingest-stats	1 fois par jour	Statistiques d'équipes et classements
compute-predictions	1 fois par jour, après l'ingestion	Calcule et verrouille les pronostics du lendemain
settle-predictions	2 fois par jour	Récupère les scores finaux, règle les pronostics
aggregate-metrics	Toutes les heures	Met à jour daily_metrics
purge-data	1 fois par jour	Supprime vues anciennes, comptes en fin de délai, jetons expirés
Le budget de 100 requêtes par jour du plan gratuit d'API-Football impose de limiter le démarrage à 3 à 5 ligues ; la tâche d'ingestion compte ses appels et s'arrête avant le quota.
8. Organisation des interfaces et design system
L'interface se compose de trois coques (publique, membre, administration) qui partagent un même design system. Chaque écran de données prévoit quatre états : chargement, contenu, vide, erreur.
Les trois coques
Coque	Structure	Navigation
Publique	En-tête fixe, contenu, pied de page, boutons communauté flottants	Offres, Bookmakers, Codes promo, Pronostics, Communauté ; sélecteur de pays et de langue
Membre	En-tête public + menu latéral de compte	Profil, Préférences, Consentements, Historique, Sécurité
Administration	Barre latérale repliable, en-tête avec recherche et profil, zone de travail	Tableau de bord, Catalogue, Affiliation, Pronostics, Contenus, Utilisateurs, Statistiques, Journal, Paramètres
Pages publiques
Page	Contenu	Composants clés
Accueil	Promesse, meilleures offres du pays, code promo mis en avant, logos partenaires, pronostics du jour, communauté	Hero, OfferCard, PromoCodeBox, PartnerLogoGrid, PredictionCard, CommunityCta
Offres	Liste classée, compteur, tri, filtres	OfferList, FilterBar, SortMenu, ResultCount
Détail d'offre	Promesse, conditions complètes, étapes pour en profiter, offres voisines	OfferHeader, TermsPanel, StepList
Bookmakers	Répertoire avec notes	BookmakerCard, RatingScore
Fiche bookmaker	Présentation, grille de notation, moyens de paiement, offres actives, licence par pays	RatingBreakdown, PaymentMethodList, LicenseBadge
Codes promo	Tous les codes valables dans le pays	PromoCodeBox, CopyButton
Comparateur	2 à 3 offres côte à côte, mêmes critères	CompareTable, CompareTray
Pronostics	Matchs par date et ligue, probabilités, niveau de confiance	FixtureRow, ProbabilityBar, ConfidenceBadge
Détail de pronostic	Données utilisées, forme, confrontations, avertissement	StatsTable, HeadToHead, Disclaimer
Historique	Résultats passés, précision par marché et par période	AccuracyChart, ResultBadge
Communauté	Chaînes Telegram et WhatsApp, annonces, coupons validés	ChannelCard, CouponCard, PostCard
Pages de confiance	Méthodologie, mention d'affiliation, jeu responsable, confidentialité, contact	Gabarit éditorial
Anatomie de la carte d'offre
1.	Bandeau : rang ou étiquette (Meilleure offre, Populaire, Nouveau).
2.	Identité : logo, nom, note chiffrée.
3.	Promesse : titre du bonus, montant dans la devise du pays.
4.	Arguments : 3 à 4 lignes, dont rollover et moyens de paiement.
5.	Code : bloc pointillé avec bouton Copier, si un code existe.
6.	Action : un seul bouton, libellé avec le nom du bookmaker, vers /go/[slug], avec rel="sponsored nofollow noopener".
7.	Pied : date de vérification, licence, lien Conditions, mention 18+.
Design system
Élément	Règle
Jetons	Couleurs, espacements, rayons, ombres et tailles de texte en variables CSS, déclinés en thème sombre et clair
Grille	Mobile d'abord ; points de rupture 640, 768, 1024, 1280 px ; largeur de contenu 1200 px
Composants de base	Bouton, lien, champ, sélecteur, case, interrupteur, badge, carte, onglets, tableau, dialogue, tiroir, infobulle, toast, pagination, fil d'Ariane
États	Skeleton pour le chargement, EmptyState avec action proposée, ErrorState avec nouvel essai
Animations	150 à 250 ms, transform et opacité seulement ; désactivées si prefers-reduced-motion
Accessibilité	Niveau WCAG 2.1 AA : contraste 4,5:1, navigation clavier, focus visible, libellés sur tous les champs
Performance	LCP sous 2,5 s en 4G, CLS sous 0,1 ; images en next/image avec dimensions fixées
SEO	Métadonnées par page, données structurées, plan du site, hreflang, URL canoniques par pays et langue
Écrans d'administration
Chaque entité suit le même triptyque : liste filtrable, formulaire de création et d'édition avec validation en ligne, vue de détail avec historique des modifications. Les actions destructrices demandent une confirmation nommant l'élément.
9. Description complète des dix modules
Chaque module a un périmètre, des règles métier non négociables et une phase de livraison. Le détail d'exécution est en section 10.
Module 1 — Fondation et architecture
Dépôt Git, configuration TypeScript stricte, validation des variables d'environnement au démarrage, base et migrations, CI, trois environnements (local, prévisualisation, production). Règle : l'application refuse de démarrer si une variable obligatoire manque ou est mal formée. Phase 0.
Module 2 — Interface et expérience
Design system, trois coques, pages de présentation, états de chargement, vide et erreur, versions mobile et tablette. Règle : aucun texte factice ni chiffre d'exemple dans une page livrée ; un état vide explique ce qui manque. Phases 1 puis continu.
Module 3 — BONUVO OFFERS
Répertoire et fiches bookmakers, offres, codes, conditions, comparateur, recherche, filtres, classement, validité, pays éligibles, redirection et clics.
•	Cycle de vie d'une offre : draft → published → expired ou disabled → archived. La suppression définitive est réservée à l'administrateur et bloquée si des clics existent.
•	Classement : rang manuel par pays en priorité, puis note, puis date de vérification. La règle de tri est affichée sur la page Méthodologie.
•	Filtres : pays, type de bonus, moyen de paiement, dépôt minimum, présence d'un code, bookmaker.
•	Pays : déduit de l'en-tête géographique de l'hébergeur, modifiable par le visiteur, mémorisé dans un cookie de préférence.
•	Fraîcheur : une offre non vérifiée depuis 30 jours passe en alerte dans le back-office.
Phases 3 (saisie) et 4 (public).
Module 4 — Affiliation et tracking
Liens, codes, campagnes, clics, postbacks, webhooks, conversions, commissions, statistiques.
•	Quatre faits distincts : clic (mesuré par BONUVO), inscription, premier dépôt, commission (déclarés par le partenaire). Aucun n'est déduit d'un autre.
•	Trois modes d'attribution, selon ce que le programme permet : postback avec identifiant de clic ; code promo dédié ; import de rapport. Le mode est saisi par réseau.
•	Source obligatoire : chaque conversion porte postback, webhook ou import, et pointe vers l'événement brut ou le fichier d'origine.
•	Sans preuve, zéro : un réseau sans postback ni import affiche « données non disponibles », jamais une estimation.
•	Robots : les clics d'agents connus ou en rafale sont marqués et exclus des taux.
Phase 5.
Module 5 — BONUVO AI
Calendrier, équipes, statistiques, confrontations, probabilités, pronostics, confiance, historique, règlement, précision.
•	Méthode de départ : buts attendus par équipe à partir des moyennes de buts marqués et encaissés, domicile et extérieur, pondérées par la forme récente ; loi de Poisson pour la grille des scores ; probabilités 1X2, plus/moins 2,5 buts et les deux équipes marquent.
•	Seuil de données : pas de pronostic si une équipe compte moins de 6 matchs dans la saison ; la page l'indique.
•	Confiance : trois niveaux dérivés de l'écart de probabilité et du volume de données, avec la formule publiée.
•	Intégrité : un pronostic est verrouillé avant le coup d'envoi ; jamais modifié ni retiré de l'historique après coup.
•	Transparence : chaque pronostic affiche les données utilisées et leur date ; la précision est calculée sur tous les pronostics publiés, pertes comprises.
•	Langage : aucune formule du type « sûr », « garanti » ou « gain assuré » ; un contrôle automatique bloque ces termes à la publication.
Phase 7.
Module 6 — BONUVO COMMUNITY
Liens vers la chaîne Telegram, la chaîne et le groupe WhatsApp, annonces, offres mises en avant, coupons validés, actualités, notifications.
•	Première version : liens d'invitation gérés en administration, par pays, et publications sur le site.
•	Seconde étape : publication automatique vers Telegram via l'API de bot, qui est gratuite. WhatsApp reste en lien manuel tant que l'API Business n'est pas justifiée par le volume.
•	Consentement : aucun envoi sans consentement actif et daté ; chaque message contient un moyen de désinscription.
Phase 8.
Module 7 — BONUVO MEMBERS
Inscription, connexion, déconnexion, récupération, vérification d'e-mail, profil, pays, préférences, historique, consentements, désinscription, suppression.
•	Facultatif : aucune offre ni aucun code n'exige un compte.
•	Suppression : délai de 14 jours annulable, puis effacement des données personnelles et anonymisation des traces statistiques.
•	Messages neutres : connexion et récupération ne révèlent jamais si une adresse existe.
Phases 2 (authentification) et 8 (espace complet).
Module 8 — BONUVO ADMIN
Tableau de bord, catalogue, liens, pronostics, contenus, utilisateurs, rôles, pays, statistiques, journal, configuration.
Rôle	Catalogue	Liens et conversions	Pronostics	Utilisateurs et rôles	Statistiques	Paramètres
super_admin	Tout	Tout	Tout	Tout	Tout	Tout
admin	Tout	Tout	Tout	Gérer, sauf super_admin	Tout	Lecture
editor	Créer, modifier ; publication selon réglage	Lecture	Créer, modifier	Aucun	Lecture limitée	Aucun
analyst	Lecture	Lecture	Lecture	Aucun	Lecture et export	Aucun
member	Aucun	Aucun	Aucun	Aucun	Aucun	Aucun
Les comptes d'administration exigent la double authentification TOTP. Phases 3 puis extension à chaque phase.
Module 9 — BONUVO INTELLIGENCE
Visiteurs, clics, taux de conversion, inscriptions, premiers dépôts, commissions, par bookmaker, pays et campagne, en vue quotidienne, hebdomadaire et mensuelle.
•	Entonnoir : visiteurs → clics → inscriptions → premiers dépôts → commissions confirmées, avec le taux de passage entre chaque étape.
•	Chaque chiffre est cliquable jusqu'aux lignes qui le composent.
•	Fraîcheur affichée : date du dernier agrégat et de la dernière réception par réseau.
Phase 6.
Module 10 — Sécurité, audit et conformité
Transversal : contrôles intégrés à chaque phase, audit complet des 41 contrôles en phase 9, répété avant chaque mise en production majeure. Détail en section 11.
10. Plan d'implémentation par phases
Le projet se déroule en 11 phases, de l'analyse de l'environnement à la mise en production ; une phase n'est close que lorsque ses critères d'acceptation sont prouvés et son compte rendu validé par un humain. Chaque phase suit les 13 rubriques exigées.
 
enchaînement des phases · 11 phases, 3 chantiers parallèles
Après la phase 3, trois files avancent côte à côte : offres puis conversions puis statistiques, communauté et membres, pronostics. Elles se rejoignent à l'audit.
Ordre, parallélisme et blocages
Phase	Contenu	Attend la fin de	Peut avancer en parallèle de
0	Analyse, architecture, fondations	—	—
1	Design system et coques d'interface	0	2
2	Authentification, rôles, socle de sécurité	0	1
3	Back-office et saisie du catalogue	1 et 2	—
4	BONUVO OFFERS public, redirection et clics	3	7
5	Affiliation : campagnes, postbacks, conversions, commissions	4	7, 8
6	BONUVO INTELLIGENCE	5	7, 8
7	BONUVO AI	3	4, 5, 6
8	BONUVO COMMUNITY et espace MEMBERS complet	4	5, 6, 7
9	Audit des 41 contrôles, performance, SEO, conformité	4 à 8	—
10	Mise en production et exploitation	9	—
Blocages impératifs : aucune page publique d'offre avant le back-office (phase 3), aucune statistique de conversion avant les postbacks (phase 5), aucune ouverture publique avant l'audit (phase 9).
Phase 0 — Analyse de l'environnement, architecture et fondations
1.	Objectif. Disposer d'un dépôt qui compile, se teste et se déploie en prévisualisation, avec une architecture écrite et validée.
2.	Fonctionnalités. Page d'accueil provisoire affichant le nom et la signature de marque ; route de santé ; rien d'autre.
3.	Tâches techniques.
o	Inspecter l'environnement : système, versions de Node, npm et Git, contenu du dossier de travail, comptes et clés disponibles. Consigner le résultat dans docs/phases/phase-00-rapport.md.
o	Rédiger docs/decisions/ADR-0001-stack.md : choix confirmés, options écartées, versions figées.
o	Initialiser Next.js avec TypeScript strict, Tailwind, ESLint, Prettier, alias @/.
o	Créer src/server/env.ts : schéma Zod de toutes les variables, séparation serveur et client, échec au démarrage si invalide.
o	Créer .env.example (noms seuls) et .gitignore couvrant .env*.
o	Configurer Drizzle, la connexion à la base, une première migration vide et le script de migration.
o	Configurer Git : branche main protégée, branches feat/*, commits conventionnels, Husky + lint-staged.
o	Écrire la CI : installation, lint, types, tests, build, audit de dépendances, recherche de secrets.
o	Poser les en-têtes de sécurité de base dans next.config.ts.
4.	Architecture et dépendances. next, react, typescript, tailwindcss, zod, drizzle-orm, drizzle-kit, pilote Postgres, vitest, @playwright/test, eslint, prettier, husky, lint-staged, server-only.
5.	Pages et composants. app/[locale]/(public)/page.tsx provisoire ; app/api/health/route.ts.
6.	Tables. Aucune table métier ; table des migrations seulement.
7.	API. GET /api/health.
8.	Services externes. GitHub (dépôt, CI), fournisseur Postgres (projet de développement), hébergeur (prévisualisation). Création des comptes sur validation humaine.
9.	Sécurité. Secrets hors dépôt ; validation des variables ; recherche de secrets en CI ; en-têtes X-Content-Type-Options, Referrer-Policy, X-Frame-Options, HSTS.
10.	Tests. Test unitaire du schéma d'environnement (variable manquante = échec) ; test de bout en bout : la page d'accueil répond 200 ; test de la route de santé.
11.	Critères d'acceptation. npm run lint, typecheck, test et build passent en local et en CI ; une prévisualisation est en ligne ; aucun secret dans l'historique Git ; l'ADR est validé par un humain.
12.	Livrables. Dépôt initialisé, ADR-0001, rapport de phase, .env.example, pipeline CI vert, URL de prévisualisation.
13.	Dépendances. Aucune en amont. Bloque toutes les phases.
Phase 1 — Design system et coques d'interface
1.	Objectif. Fournir les composants et gabarits réutilisés par toutes les pages, validés sur mobile, tablette et bureau.
2.	Fonctionnalités. Thèmes sombre et clair ; coque publique ; coque d'administration ; pages de confiance (méthodologie, affiliation, jeu responsable, confidentialité) ; page 404 et page d'erreur ; internationalisation français et anglais.
3.	Tâches techniques.
o	Définir les jetons de design en variables CSS et les brancher dans Tailwind.
o	Installer les primitives shadcn/ui nécessaires, les adapter aux jetons.
o	Construire Header, Footer, MobileNav, Sidebar, AdminShell, CountrySwitcher, LocaleSwitcher.
o	Construire Skeleton, EmptyState, ErrorState, Toast.
o	Construire les composants métier sans données : OfferCard, PromoCodeBox, RatingScore, Badge, PartnerLogoGrid, CommunityFab, avec des propriétés typées.
o	Mettre en place next-intl, les fichiers de messages et la détection de langue.
o	Créer une page interne /admin/design listant chaque composant dans chaque état, réservée au développement.
4.	Architecture et dépendances. next-intl, class-variance-authority, tailwind-merge, lucide-react, primitives Radix via shadcn/ui, next/font.
5.	Pages et composants. Ceux listés ci-dessus ; gabarits (public)/layout.tsx, admin/layout.tsx.
6.	Tables. Aucune.
7.	API. Aucune.
8.	Services externes. Aucun.
9.	Sécurité. Aucun dangerouslySetInnerHTML ; liens externes avec rel="noopener" ; politique CSP en mode rapport.
10.	Tests. Tests de composants (rendu, états, clavier) ; contrôle d'accessibilité automatisé avec axe ; captures Playwright à 375, 768 et 1280 px.
11.	Critères d'acceptation. Aucun défaut d'accessibilité critique ; aucun débordement horizontal à 375 px ; chaque composant de données possède ses quatre états ; bascule de thème et de langue fonctionnelle ; la page de démonstration n'utilise que des données marquées « exemple de développement » et n'est pas accessible en production.
12.	Livrables. Bibliothèque de composants, pages de confiance rédigées, captures d'écran, rapport de phase.
13.	Dépendances. Phase 0. Parallèle à la phase 2. Bloque la phase 3.
Phase 2 — Authentification, rôles et socle de sécurité
1.	Objectif. Permettre l'inscription et la connexion en sécurité, et rendre toute fonction d'administration inaccessible sans permission explicite.
2.	Fonctionnalités. Inscription, vérification d'e-mail, connexion, déconnexion, mot de passe oublié, réinitialisation, TOTP pour les rôles d'administration, rôles et permissions, rate limiting, journal de sécurité.
3.	Tâches techniques.
o	Intégrer le fournisseur d'authentification côté serveur uniquement ; cookies HttpOnly, Secure, SameSite=Lax.
o	Créer requireUser(), requirePermission() et can() dans src/server/auth.
o	Garder /admin et /compte à deux niveaux : proxy de routage et vérification dans chaque page et action.
o	Créer src/server/security/rate-limit.ts sur Upstash, fenêtre glissante, clés par IP et par compte.
o	Appliquer les seuils du tableau de la section 11 à chaque route d'authentification.
o	Écrire logSecurityEvent() et logAudit().
o	Semer les rôles et permissions de référence ; créer le premier super_admin par script, avec validation humaine.
o	Politique de mot de passe : 12 caractères au minimum, refus des mots de passe compromis connus si le fournisseur le permet.
4.	Architecture et dépendances. SDK d'authentification serveur, @upstash/redis, @upstash/ratelimit, fournisseur d'e-mail.
5.	Pages et composants. connexion, inscription, mot-de-passe-oublie, reinitialisation, verification, double-authentification ; AuthForm, PasswordField, OtpInput.
6.	Tables. profiles, roles, permissions, role_permissions, user_roles, consents, audit_log, security_events.
7.	API. Server Actions d'authentification ; POST /api/webhooks/email si le fournisseur notifie les rebonds.
8.	Services externes. Authentification, Upstash Redis, e-mail transactionnel (plans gratuits).
9.	Sécurité. Messages neutres ; rotation de session à la connexion ; invalidation de toutes les sessions au changement de mot de passe ; jetons à usage unique et à durée limitée ; blocage à la sixième tentative par minute et par IP.
10.	Tests. Six connexions en une minute depuis une IP : la sixième reçoit 429 et un événement de sécurité ; un membre appelant une action d'administration reçoit un refus ; un jeton de réinitialisation ne sert qu'une fois ; parcours complet inscription → vérification → connexion en bout en bout.
11.	Critères d'acceptation. Tous les tests ci-dessus passent ; aucune route /admin ne répond 200 sans rôle ; le rate limiting fonctionne sur la prévisualisation déployée, pas seulement en local ; les e-mails arrivent réellement.
12.	Livrables. Parcours d'authentification, matrice des permissions en base, rapport de tests de sécurité, rapport de phase.
13.	Dépendances. Phase 0. Parallèle à la phase 1. Bloque les phases 3 et 8.
Phase 3 — Back-office et saisie du catalogue
1.	Objectif. Donner à l'équipe le moyen de saisir de vraies données : bookmakers, offres, codes, pays, liens.
2.	Fonctionnalités. Tableau de bord d'administration (compteurs réels seulement) ; gestion des pays, bookmakers, fiches pays, moyens de paiement, grilles de notation, offres, conditions, arguments, codes promo, liens d'affiliation ; téléversement de logos ; gestion des utilisateurs et rôles ; journal ; paramètres.
3.	Tâches techniques.
o	Écrire les schémas Drizzle et Zod du catalogue et les migrations.
o	Construire DataTable générique (tri, filtres, pagination serveur) et EntityForm.
o	Implémenter le cycle de vie des offres et le bouton « Marquer comme vérifiée aujourd'hui ».
o	Valider chaque URL d'affiliation : HTTPS obligatoire, hôte présent dans allowed_hosts du bookmaker.
o	Implémenter le téléversement sécurisé (voir contrôles F1 à F3).
o	Journaliser chaque création, modification, publication, désactivation et suppression avec l'état avant et après.
o	Semer la table countries depuis la norme ISO 3166.
4.	Architecture et dépendances. react-hook-form, @hookform/resolvers, @tanstack/react-table, stockage objet, file-type pour la détection réelle du format.
5.	Pages et composants. /admin et ses sous-sections catalogue, liens, utilisateurs, rôles, pays, journal, paramètres ; DataTable, EntityForm, ConfirmDialog, MediaUploader, AuditTimeline.
6.	Tables. countries, bookmakers, bookmaker_countries, payment_methods, bookmaker_payment_methods, bookmaker_ratings, offers, offer_countries, offer_terms, offer_highlights, promo_codes, media_assets, affiliate_networks, affiliate_links, settings.
7.	API. Server Actions du module Offres et Administration (section 7).
8.	Services externes. Stockage de fichiers (plan gratuit).
9.	Sécurité. Permission vérifiée dans chaque action ; un editor ne publie pas sans le droit ; protection contre l'accès à un objet par simple changement d'identifiant ; double authentification exigée pour entrer dans /admin.
10.	Tests. Création, modification, publication, désactivation et suppression d'une offre ; refus d'une URL d'affiliation hors liste ; refus d'un fichier renommé en image ; test de permission pour chaque rôle sur chaque action ; présence d'une entrée de journal pour chaque écriture.
11.	Critères d'acceptation. Un humain saisit de bout en bout un bookmaker réel, une offre, un code et un lien ; toutes les écritures figurent au journal ; aucun compteur du tableau de bord n'est codé en dur.
12.	Livrables. Back-office fonctionnel, premières données réelles saisies par l'équipe, guide de saisie d'une page, rapport de phase.
13.	Dépendances. Phases 1 et 2. Bloque les phases 4 et 7.
Phase 4 — BONUVO OFFERS public, redirection et clics
1.	Objectif. Mettre en ligne le catalogue public alimenté par les données saisies, et mesurer chaque clic sortant.
2.	Fonctionnalités. Accueil définitif, catalogue d'offres, détail d'offre, répertoire et fiches bookmakers, page des codes promo, comparateur, recherche, filtres, tri, sélection du pays, redirection /go/[slug], comptage des copies de code.
3.	Tâches techniques.
o	Écrire listOffers, getOffer, listBookmakers, getBookmaker, compareOffers avec filtrage systématique par pays, statut et validité.
o	Mettre en cache par étiquette et invalider à la publication.
o	Détecter le pays par l'en-tête de l'hébergeur ; permettre le changement manuel ; prévoir le cas « pays non couvert ».
o	Implémenter /go/[slug] : charger le lien par slug, vérifier actif, pays et hôte, créer le clic, ajouter l'identifiant de clic dans le paramètre du réseau, répondre 302. Aucune URL n'est lue depuis la requête.
o	Marquer les robots (agent utilisateur connu, rafales) sans bloquer la redirection.
o	Implémenter POST /api/events pour la copie de code et les vues.
o	Ajouter métadonnées, données structurées, plan du site et hreflang.
o	Rendre les filtres partageables par l'URL.
4.	Architecture et dépendances. nuqs ou équivalent pour l'état d'URL ; bibliothèque de détection de robots ; composants de la phase 1.
5.	Pages et composants. Pages publiques de la section 8 liées aux offres ; OfferList, FilterBar, SortMenu, CompareTable, CompareTray, TermsPanel, CountryGate.
6.	Tables. clicks, visit_events, campaigns (lecture du paramètre de campagne).
7.	API. GET /go/[slug], POST /api/events.
8.	Services externes. Aucun nouveau.
9.	Sécurité. Redirection limitée aux URL stockées ; limite de 30 redirections par minute et par IP ; IP hachée ; aucune offre d'un pays non éligible servie, même par URL directe ; attribut rel="sponsored nofollow noopener".
10.	Tests. Une offre expirée ou désactivée disparaît des listes et son lien /go répond 404 ; un slug inconnu ne redirige jamais ; tentative d'injection d'URL dans la requête sans effet ; un clic crée exactement une ligne ; filtres et tri vérifiés sur un jeu de test ; Lighthouse mobile sur l'accueil et le catalogue.
11.	Critères d'acceptation. Les pages n'affichent que des données saisies en phase 3 ; un pays sans offre affiche un état vide explicite ; LCP sous 2,5 s ; le clic mesuré correspond au clic effectué, vérifié à la main sur 10 essais.
12.	Livrables. Site public navigable, redirection opérationnelle, rapport Lighthouse, rapport de phase.
13.	Dépendances. Phase 3. Bloque les phases 5 et 8. Parallèle à la phase 7.
Phase 5 — Affiliation : campagnes, postbacks, conversions, commissions
1.	Objectif. Relier chaque clic aux événements déclarés par les partenaires, sans jamais créer un fait non prouvé.
2.	Fonctionnalités. Campagnes et paramètres UTM ; réception des postbacks et webhooks ; vérification de signature ; déduplication ; rattachement au clic ; attribution par code promo ; import de rapports ; cycle de vie des commissions ; historique des conversions.
3.	Tâches techniques.
o	Lire la documentation réelle de chaque programme partenaire avant d'écrire son adaptateur ; consigner format, paramètres et mode de signature dans docs/affiliation/<réseau>.md.
o	Écrire un adaptateur par réseau : verify(request), parse(payload), toConversion(event).
o	Stocker l'événement brut avant tout traitement ; traiter ensuite de façon idempotente.
o	Dédupliquer par contrainte d'unicité (network_id, external_event_id) et renvoyer 200 sur un doublon.
o	Rattacher par identifiant de clic ; à défaut par code promo ; à défaut marquer « non attribué ».
o	Écrire l'import CSV : aperçu, validation ligne par ligne, rapport des rejets, confirmation humaine.
o	Gérer les états de commission et l'historique de leurs changements.
o	Fournir un outil de test en administration qui rejoue un événement brut enregistré.
4.	Architecture et dépendances. Module affiliation/adapters ; crypto natif pour HMAC et comparaison en temps constant ; analyseur CSV en flux.
5.	Pages et composants. /admin/campagnes, /admin/conversions, /admin/commissions, /admin/postbacks (événements bruts et état), /admin/imports ; EventInspector, ImportWizard, StatusPill.
6.	Tables. postback_events, conversions, commissions, conversion_imports ; compléments sur campaigns et affiliate_networks.
7.	API. GET ou POST /api/postbacks/[network], POST /api/webhooks/[provider], actions importConversions, setCommissionStatus, createCampaign.
8.	Services externes. Programmes d'affiliation des bookmakers retenus. Aucun coût attendu ; toute ouverture de compte passe par un humain.
9.	Sécurité. Signature ou jeton obligatoire, comparaison en temps constant ; rejet des événements de plus de 5 minutes quand un horodatage signé existe ; liste d'IP autorisées si le réseau la publie ; limite de débit ; aucune conversion créée depuis le navigateur ; changement d'état de commission réservé et journalisé.
10.	Tests. Signature invalide : 401 et événement de sécurité ; même événement envoyé deux fois : une seule conversion ; événement sans clic connu : stocké, non attribué ; montant négatif ou devise inconnue : rejeté ; import de 1 000 lignes avec erreurs : rapport exact ; test de charge léger sur l'endpoint.
11.	Critères d'acceptation. Un postback réel ou de bac à sable d'au moins un partenaire est reçu, vérifié et rattaché ; les quatre faits restent distincts dans la base et à l'écran ; aucune ligne de conversions sans source ; les réseaux sans intégration affichent « données non disponibles ».
12.	Livrables. Adaptateurs documentés, écrans de suivi, jeu de tests de sécurité, rapport de phase.
13.	Dépendances. Phase 4. Bloque la phase 6. Parallèle aux phases 7 et 8.
Phase 6 — BONUVO INTELLIGENCE
1.	Objectif. Transformer les faits mesurés en tableaux de bord fiables et lisibles.
2.	Fonctionnalités. Vue d'ensemble, entonnoir, évolution quotidienne, hebdomadaire et mensuelle, performances par bookmaker, pays, campagne et offre, classement des meilleures offres, export CSV.
3.	Tâches techniques.
o	Écrire la tâche aggregate-metrics, idempotente et rejouable sur une période.
o	Définir chaque indicateur dans docs/metrics.md : formule, source, exclusions (robots, comptes internes).
o	Construire les requêtes sur daily_metrics, avec filtres de période, pays, bookmaker et campagne.
o	Compter les visiteurs par identifiant journalier haché, sans cookie de suivi.
o	Afficher la fraîcheur des données et les sources manquantes.
o	Permettre de descendre d'un chiffre vers ses lignes.
4.	Architecture et dépendances. recharts ; planificateur ; verrou Redis.
5.	Pages et composants. /admin/statistiques et sous-vues ; KpiCard, FunnelChart, TimeSeriesChart, BreakdownTable, DateRangePicker, FreshnessNote.
6.	Tables. daily_metrics ; index complémentaires sur clicks et conversions.
7.	API. POST /api/cron/aggregate-metrics, GET /api/admin/export/[report].
8.	Services externes. Planificateur de l'hébergeur ou Upstash QStash (plan gratuit) si la fréquence horaire n'est pas disponible.
9.	Sécurité. Permission stats.read ; export journalisé ; endpoint de tâche protégé par secret ; aucune donnée personnelle dans les exports.
10.	Tests. Jeu de données de test connu : chaque indicateur est comparé à une valeur calculée à la main ; double exécution de l'agrégat sans double comptage ; un analyst lit mais ne modifie rien ; division par zéro gérée dans les taux.
11.	Critères d'acceptation. Les totaux du tableau de bord égalent les comptages SQL directs ; un indicateur sans donnée affiche « — » et non 0 ; la page charge en moins de 2 s sur 12 mois de données de test.
12.	Livrables. Tableaux de bord, dictionnaire des indicateurs, rapport de phase.
13.	Dépendances. Phase 5. Parallèle aux phases 7 et 8.
Phase 7 — BONUVO AI
1.	Objectif. Publier des pronostics football calculés sur des données vérifiables, verrouillés avant les matchs et réglés automatiquement.
2.	Fonctionnalités. Calendrier, fiches de match, statistiques d'équipes, confrontations, probabilités sur trois marchés, niveau de confiance, historique, règlement, précision par marché et par période, coupons validés par un humain.
3.	Tâches techniques.
o	Vérifier avec une vraie clé ce que le plan gratuit du fournisseur couvre (saisons, ligues) et le consigner.
o	Écrire l'interface SportsDataProvider et son adaptateur ; aucun appel au fournisseur hors de cet adaptateur.
o	Écrire les tâches d'ingestion avec compteur de quota, reprise sur erreur et journal ingestion_runs.
o	Implémenter le modèle en fonctions pures : entrées, sortie, version ; aucun accès réseau dans le calcul.
o	Enregistrer avec chaque pronostic l'empreinte de ses données d'entrée.
o	Verrouiller les pronostics avant le coup d'envoi ; régler après réception du score final ; marquer void les matchs reportés ou annulés.
o	Calculer précision, score de Brier et calibration ; publier la précision réelle.
o	Optionnel, derrière un interrupteur : rédaction du texte d'analyse par LLM à partir d'un objet de faits ; contrôle automatique que chaque nombre du texte existe dans l'objet ; plafond journalier d'appels.
4.	Architecture et dépendances. Module ai/providers, ai/model, ai/service ; planificateur ; aucune bibliothèque d'apprentissage dans la première version.
5.	Pages et composants. pronostics, pronostics/[fixtureId], pronostics/historique, /admin/pronostics, /admin/ingestion ; FixtureRow, ProbabilityBar, ConfidenceBadge, HeadToHead, AccuracyChart, Disclaimer.
6.	Tables. sports_providers, leagues, seasons, teams, fixtures, team_stats_snapshots, standings, ingestion_runs, model_versions, predictions, prediction_results.
7.	API. POST /api/cron/ingest-fixtures, ingest-stats, compute-predictions, settle-predictions ; actions du module Pronostics.
8.	Services externes. API-Football, plan gratuit au départ ; passage au plan payant sur validation humaine quand le nombre de ligues l'exige.
9.	Sécurité. Clé du fournisseur côté serveur seulement ; réponses du fournisseur validées par schéma avant insertion ; tâches protégées et verrouillées ; pronostics non modifiables après verrouillage (contrainte en base) ; plafond de coût sur toute fonction LLM ; avertissement et rappel 18+ sur chaque page.
10.	Tests. Tests unitaires du modèle sur des cas calculés à la main ; somme des probabilités égale à 1 ; refus de pronostic sous le seuil de données ; règlement correct sur des scores connus ; réponse malformée du fournisseur rejetée sans corrompre la base ; arrêt propre à l'approche du quota ; blocage des termes interdits.
11.	Critères d'acceptation. Chaque pronostic publié se retrace jusqu'aux données et à l'exécution d'ingestion ; aucun pronostic créé ou modifié après le coup d'envoi ; la précision affichée égale le calcul SQL sur tout l'historique ; aucune donnée sportive saisie à la main ou inventée.
12.	Livrables. Pipeline d'ingestion, modèle versionné et documenté (docs/ai/modele-v1.md), pages publiques, rapport de phase.
13.	Dépendances. Phase 3. Parallèle aux phases 4, 5 et 6.
Phase 8 — BONUVO COMMUNITY et espace MEMBERS complet
1.	Objectif. Fidéliser : relier le site aux canaux communautaires et offrir un espace membre utile et respectueux du consentement.
2.	Fonctionnalités. Page communauté, liens Telegram et WhatsApp par pays, annonces, actualités, coupons validés, boutons flottants ; profil, pays et préférences, historique, consentements, préférences de communication, désinscription en un clic, export des données, suppression du compte ; notifications par e-mail consenties ; publication automatique vers Telegram en option.
3.	Tâches techniques.
o	Construire l'éditeur d'annonces et d'actualités avec un format de texte assaini côté serveur.
o	Gérer les canaux en administration ; valider les URL contre t.me, whatsapp.com, chat.whatsapp.com et wa.me.
o	Construire l'espace /compte et ses actions, chacune vérifiant que l'utilisateur agit sur son propre compte.
o	Enregistrer chaque consentement avec date, version du texte et origine ; ne jamais écraser l'historique.
o	Implémenter la désinscription par lien signé, sans connexion.
o	Implémenter la suppression différée de 14 jours et la tâche d'effacement.
o	Écrire l'envoi de notifications : file, respect du consentement, plafond journalier du fournisseur.
o	Option : bot Telegram publiant les offres et coupons validés, jeton en variable d'environnement.
4.	Architecture et dépendances. Bibliothèque d'assainissement HTML ou format Markdown restreint ; gabarits d'e-mail ; API de bot Telegram.
5.	Pages et composants. communaute, actualites/[slug], /compte/*, /admin/contenus, /admin/communaute, /admin/notifications ; ChannelCard, CouponCard, PostCard, ConsentToggle, DeleteAccountDialog.
6.	Tables. posts, community_channels, coupons, notifications, notification_deliveries, communication_preferences, member_activity, account_deletion_requests.
7.	API. Actions des modules Membres, Contenus et communauté ; POST /api/webhooks/telegram si le bot reçoit des mises à jour ; POST /api/cron/purge-data.
8.	Services externes. E-mail transactionnel (plan gratuit, 100 envois par jour) ; API de bot Telegram (gratuite) ; WhatsApp par simple lien.
9.	Sécurité. Contenu éditorial assaini ; vérification de propriété sur chaque action de compte ; ré-authentification avant suppression ou changement d'e-mail ; lien de désinscription signé ; aucun envoi sans consentement actif.
10.	Tests. Un membre ne peut ni lire ni modifier le compte d'un autre en changeant un identifiant ; script injecté dans une annonce neutralisé ; retrait du consentement : l'envoi suivant est bloqué ; suppression : données personnelles absentes après la tâche, statistiques conservées anonymes ; lien de désinscription falsifié refusé.
11.	Critères d'acceptation. Toutes les pages d'offres restent accessibles sans compte ; l'historique des consentements est complet et daté ; un e-mail réel part, arrive et se désinscrit en un clic ; les liens communautaires s'ouvrent vers les vrais canaux fournis par l'équipe.
12.	Livrables. Espace communauté, espace membre, système de notifications, rapport de phase.
13.	Dépendances. Phases 2 et 4. Parallèle aux phases 5, 6 et 7.
Phase 9 — Audit de sécurité, performance, SEO et conformité
1.	Objectif. Prouver, contrôle par contrôle, que la plateforme peut être ouverte au public.
2.	Fonctionnalités. Aucune nouvelle ; corrections seulement.
3.	Tâches techniques.
o	Exécuter les 41 contrôles de la section 11 et les contrôles propres à BONUVO ; attribuer un verdict à chacun, avec preuve.
o	Pour chaque échec, rédiger la fiche : vulnérabilité, gravité, emplacement, impact, code concerné, correction ; corriger ; re-tester.
o	Passer la CSP du mode rapport au mode bloquant.
o	Mesurer les performances sur les pages clés et corriger les écarts.
o	Vérifier le référencement : métadonnées, plan du site, robots.txt, données structurées, hreflang, pages d'administration non indexées.
o	Vérifier la conformité : mention d'affiliation, 18+, jeu responsable, politique de confidentialité, bandeau de consentement si des traceurs non essentiels existent, éligibilité par pays.
o	Tester la restauration d'une sauvegarde sur une base vierge.
o	Relire les journaux pour s'assurer qu'aucun secret ni donnée personnelle n'y figure.
4.	Architecture et dépendances. npm audit, outil d'analyse de dépendances, recherche de secrets sur tout l'historique, OWASP ZAP en analyse de base, Lighthouse.
5.	Pages et composants. Aucun nouveau.
6.	Tables. Aucune nouvelle.
7.	API. Aucune nouvelle.
8.	Services externes. Aucun payant.
9.	Sécurité. Objet même de la phase.
10.	Tests. Suite complète (unitaires, intégration, bout en bout) ; tests d'intrusion ciblés décrits en section 11 ; test de restauration.
11.	Critères d'acceptation. Aucun contrôle au verdict ÉCHOUÉ de gravité critique ou élevée ; tout verdict PARTIEL est accepté par écrit par un humain ; Lighthouse mobile au moins 90 en performance, accessibilité et SEO sur l'accueil et le catalogue ; restauration réussie et chronométrée.
12.	Livrables. docs/security/audit-41-controles.md complet, fiches de correction, rapports Lighthouse et ZAP, procès-verbal de restauration, rapport de phase.
13.	Dépendances. Phases 4 à 8. Bloque la phase 10.
Phase 10 — Mise en production et exploitation
1.	Objectif. Ouvrir BONUVO au public de façon réversible et surveillée.
2.	Fonctionnalités. Domaine, certificat, environnement de production, supervision, alertes, sauvegardes, procédure de retour arrière.
3.	Tâches techniques.
o	Obtenir la validation humaine écrite : budget d'hébergement, domaine, pays ouverts, liste des offres publiées.
o	Créer le projet de base de production, distinct du développement ; appliquer les migrations.
o	Renseigner les secrets de production, différents de ceux des autres environnements.
o	Configurer domaine, DNS, HTTPS, redirections www.
o	Activer la supervision des erreurs, un contrôle de disponibilité externe et les alertes.
o	Programmer les tâches planifiées de production.
o	Déployer, exécuter les tests de fumée, vérifier un clic et un postback réels.
o	Rédiger docs/runbook.md : déploiement, retour arrière, rotation des secrets, incident, restauration.
4.	Architecture et dépendances. Hébergeur sur plan autorisant l'usage commercial ; base de production.
5.	Pages et composants. Page de maintenance.
6.	Tables. Aucune nouvelle.
7.	API. Aucune nouvelle.
8.	Services externes. Hébergement payant (première dépense obligatoire), nom de domaine ; passage de la base au plan payant dès que les sauvegardes quotidiennes sont exigées.
9.	Sécurité. Double authentification sur tous les comptes de service ; accès de production limité ; secrets propres à la production ; prévisualisations protégées.
10.	Tests. Tests de fumée en production ; test de retour arrière sur une prévisualisation ; vérification des alertes par une erreur volontaire.
11.	Critères d'acceptation. Site accessible en HTTPS sur le domaine ; premier clic réel visible au back-office ; alerte reçue lors du test ; retour arrière réalisé en moins de 10 minutes ; aucune donnée de test en production.
12.	Livrables. Production en ligne, guide d'exploitation, tableau des accès, rapport final.
13.	Dépendances. Phase 9. Ouvre la maintenance (section 15).
11. Plan de sécurité : audit des 41 contrôles et contrôles propres à BONUVO
La sécurité se prouve par un test, pas par une déclaration : chaque contrôle ci-dessous reçoit un verdict PASSÉ, ÉCHOUÉ, PARTIEL ou N/A, accompagné de sa preuve. Les contrôles sont appliqués dès la phase qui les concerne, puis tous rejoués en phase 9.
Mesures intégrées dès le départ
Menace	Mesure
Fuite de secrets	Variables d'environnement validées, jamais préfixées NEXT_PUBLIC_, recherche de secrets en CI
Injection SQL	Requêtes paramétrées par l'ORM, aucun SQL construit par concaténation
XSS	Échappement par défaut de React, assainissement du texte riche, CSP stricte avec nonce
CSRF	Server Actions avec contrôle d'origine, cookies SameSite, aucune modification par GET
IDOR / BOLA	Vérification de propriété ou de permission dans le service, pas seulement dans la page
Redirection malveillante	Destination lue en base uniquement ; paramètres de retour limités aux chemins relatifs
Force brute	Rate limiting distribué, blocage temporaire, journal des échecs
Faux webhooks	Signature, fenêtre temporelle, déduplication
Fichiers piégés	Liste blanche par contenu réel, taille limitée, ré-encodage, stockage hors application
Dépendances vulnérables	Audit en CI, mises à jour automatisées, verrouillage des versions
Perte de données	Sauvegardes quotidiennes, restauration testée, objectif de perte maximale de 24 h
Seuils de rate limiting
Route	Seuil	Clé	Sanction
Connexion	5 par minute	IP	Blocage 15 minutes dès la 6e tentative
Connexion	10 par heure	Compte visé	Blocage 1 heure, e-mail d'alerte au titulaire
Inscription	3 par heure	IP	Refus jusqu'à la fin de la fenêtre
Mot de passe oublié	3 par heure	IP et adresse	Réponse neutre, aucun e-mail supplémentaire
Réinitialisation	5 par heure	IP et jeton	Jeton invalidé
Code OTP ou TOTP	5 par 10 minutes	Compte	Blocage 15 minutes, nouvelle connexion exigée
Renvoi de vérification d'e-mail	3 par heure	Compte	Refus
/go/[slug]	30 par minute	IP	429, clics marqués suspects
/api/events	60 par minute	IP	429
Postbacks	300 par minute	Réseau	429, alerte
Téléversement	20 par heure	Compte	Refus
L'adresse IP provient de l'en-tête fourni par l'hébergeur, jamais d'un en-tête que le client peut forger.
Catégorie 1 — Variables d'environnement et secrets (6)
N°	Contrôle	Méthode de vérification
E1	Aucun secret dans le dépôt ni dans l'historique Git	Recherche de secrets sur tout l'historique ; résultat joint
E2	Fichiers .env* ignorés ; .env.example sans valeur	Lecture de .gitignore ; git ls-files ne liste aucun fichier d'environnement réel
E3	Aucun secret exposé au navigateur	Recherche des noms et motifs de clés dans le build client ; revue des variables NEXT_PUBLIC_
E4	Variables validées au démarrage	Démarrage avec une variable manquante : échec explicite
E5	Secrets distincts par environnement, rotation documentée	Comparaison des empreintes entre environnements ; procédure présente dans le guide d'exploitation
E6	Aucun secret dans les journaux, erreurs ou réponses	Provocation d'erreurs ; lecture des journaux et des réponses
Catégorie 2 — Sécurité de la base de données (8)
N°	Contrôle	Méthode de vérification
D1	Connexions chiffrées, base non joignable sans authentification	Tentative de connexion sans TLS et sans identifiants
D2	Rôle applicatif au moindre privilège, distinct du rôle de migration	Liste des privilèges du rôle ; tentative de DROP TABLE refusée
D3	RLS activée sur toutes les tables, refus par défaut	Requête listant les tables sans RLS : zéro ligne ; lecture avec la clé publique refusée
D4	Requêtes paramétrées uniquement	Recherche de SQL concaténé dans le code ; tests d'injection sur recherche et filtres
D5	Données sensibles protégées	Mots de passe gérés par le fournisseur ; IP hachées ; jetons stockés hachés ; contrôle en base
D6	Sauvegardes automatiques et restauration testée	Restauration sur base vierge, chronométrée, procès-verbal
D7	Migrations versionnées, aucune migration destructrice sans validation	Historique des migrations ; revue des DROP et ALTER
D8	Contraintes d'intégrité et journaux en insertion seule	Tentative d'UPDATE et de DELETE sur audit_log refusée ; doublon de postback refusé
Catégorie 3 — Authentification et sessions (8)
N°	Contrôle	Méthode de vérification
A1	Mots de passe hachés par un algorithme robuste, politique de 12 caractères	Configuration du fournisseur ; inscription avec mot de passe faible refusée
A2	Cookies de session HttpOnly, Secure, SameSite ; durée limitée	Inspection des en-têtes Set-Cookie en production
A3	Vérification d'e-mail exigée avant les fonctions de compte	Compte non vérifié : accès refusé à /compte
A4	Jetons de réinitialisation à usage unique, courte durée, réponses neutres	Réutilisation refusée ; même réponse pour adresse connue et inconnue
A5	Protection contre la force brute	Six tentatives en une minute : blocage constaté sur l'environnement déployé
A6	Autorisation vérifiée côté serveur sur chaque route et action	Appel direct de chaque action d'administration avec un compte membre : refus
A7	Protection IDOR / BOLA	Accès à la ressource d'un autre utilisateur par changement d'identifiant : refus
A8	TOTP obligatoire pour l'administration ; sessions révoquées à la déconnexion et au changement de mot de passe	Accès /admin sans second facteur refusé ; ancien cookie rejeté
Catégorie 4 — Validation côté serveur (6)
N°	Contrôle	Méthode de vérification
V1	Schéma de validation sur chaque action et chaque route	Inventaire automatique des points d'entrée ; aucun sans schéma
V2	Protection XSS	Charges de test dans tous les champs de saisie ; CSP en mode bloquant sans unsafe-inline pour les scripts
V3	Protection CSRF	Requête d'origine étrangère vers une action : refus ; aucune écriture par GET hors redirection et postback signés
V4	Aucune redirection ouverte	Paramètres next, redirect, url chargés d'adresses externes : ignorés
V5	Bornes sur tailles, longueurs, nombres et pagination	Corps de 10 Mo, page de 10 000 éléments, montants négatifs : refus
V6	Champs autorisés explicites, erreurs sans détail interne	Envoi de role ou id dans un formulaire de profil : ignoré ; aucune trace dans les réponses
Catégorie 5 — Dépendances et packages (5)
N°	Contrôle	Méthode de vérification
P1	Fichier de verrouillage versionné, installation reproductible	npm ci réussit en CI
P2	Aucune vulnérabilité élevée ou critique connue	npm audit --audit-level=high : zéro
P3	Mises à jour de sécurité automatisées	Configuration Dependabot ou Renovate active
P4	Chaque dépendance est justifiée et maintenue	Revue de package.json ; aucune dépendance sans mise à jour depuis 24 mois sans justification
P5	Framework et environnement d'exécution sur des versions supportées	Versions de Next.js et Node comparées aux versions maintenues
Catégorie 6 — Rate limiting (3)
N°	Contrôle	Méthode de vérification
R1	Seuil de 5 connexions par minute et par IP, blocage à la 6e	Script de test sur l'environnement déployé
R2	Toutes les routes sensibles d'authentification couvertes	Test de chaque ligne du tableau des seuils
R3	Limitation côté serveur, partagée entre instances, IP fiable	Requêtes réparties sur deux instances : compteur commun ; en-tête X-Forwarded-For forgé sans effet
Catégorie 7 — CORS (2)
N°	Contrôle	Méthode de vérification
C1	Aucune origine générique ; liste explicite, jamais * avec identifiants	Lecture des en-têtes sur toutes les routes /api
C2	Requêtes préliminaires d'origines étrangères refusées	OPTIONS depuis une origine tierce : aucun en-tête d'autorisation renvoyé
Catégorie 8 — Téléchargements et fichiers (3)
N°	Contrôle	Méthode de vérification
F1	Type vérifié par le contenu, liste blanche PNG, JPEG, WebP, taille maximale de 2 Mo	Envoi d'un exécutable renommé, d'un SVG avec script, d'un fichier de 5 Mo : refus
F2	Stockage hors application, nom aléatoire, type de contenu correct, nosniff	Inspection de l'URL et des en-têtes d'un fichier servi
F3	Téléversement réservé, limité, image ré-encodée	Envoi sans permission refusé ; métadonnées EXIF absentes du fichier servi
Contrôles propres à BONUVO
N°	Domaine	Contrôle	Méthode de vérification
B1	Liens d'affiliation	Seuls links.manage créent ou modifient un lien ; hôte dans la liste du bookmaker	Tentative par un editor ; URL hors liste refusée
B2	Redirections	/go ne redirige que vers une URL stockée et active	Slug inconnu, lien désactivé, paramètre d'URL injecté : aucune redirection externe
B3	Clics	Les rafales et robots n'entrent pas dans les taux	100 requêtes en rafale : marquées, exclues des statistiques
B4	Conversions	Aucune création depuis le navigateur ni sans source	Recherche d'actions exposées ; contrainte source NOT NULL
B5	Conversions	Rejeu et doublons sans effet	Même événement envoyé 3 fois : une ligne
B6	Commissions	Changement d'état réservé et journalisé	Tentative par un analyst refusée ; entrée au journal présente
B7	Permissions	Élévation de privilèges impossible	Un admin ne peut ni se nommer super_admin ni modifier un super_admin
B8	Webhooks	Signature, fenêtre temporelle, secret par réseau	Signature absente, fausse, ancienne : 401
B9	Données sportives	Réponses du fournisseur validées ; pronostics non modifiables après verrouillage	Réponse altérée rejetée ; UPDATE après verrouillage refusé par la base
B10	Fonctions IA	Plafond d'appels et de coût ; aucune saisie visiteur injectée dans une consigne	Dépassement du plafond : arrêt ; revue des consignes
B11	Éligibilité	Aucune offre servie hors de ses pays	Accès direct à l'URL depuis un pays non éligible : état « non disponible »
B12	Tâches planifiées	Endpoints protégés et non rejouables en parallèle	Appel sans secret : 401 ; deux appels simultanés : un seul s'exécute
Fiche d'échec
Chaque verdict ÉCHOUÉ ou PARTIEL produit une fiche avec ces champs :
Champ	Contenu attendu
Contrôle	Numéro et intitulé
Vulnérabilité	Description factuelle
Gravité	Critique, élevée, moyenne ou faible, avec justification
Emplacement	Fichier, ligne, route ou configuration
Impact	Ce qu'un attaquant obtient
Code concerné	Extrait exact
Correction	Modification concrète, puis preuve du nouveau test
Journalisation et reprise
•	Événements journalisés : connexions réussies et échouées, blocages, changements de rôle, écritures d'administration, signatures invalides, exports, téléversements, exécutions de tâches.
•	Jamais journalisé : mots de passe, jetons, clés, contenu complet des cookies.
•	Sauvegardes : quotidiennes, conservées 7 jours au minimum ; export logique hebdomadaire chiffré vers un stockage distinct tant que le plan gratuit de la base n'inclut pas de sauvegarde.
•	Objectifs : perte de données maximale de 24 heures ; remise en service en moins de 4 heures.
12. Plan de tests
Une fonctionnalité n'est terminée que si un test automatisé la couvre et passe en CI ; les tests s'écrivent dans la phase qui livre la fonctionnalité, pas après. Les tests n'appellent jamais un service externe réel : les fournisseurs sont remplacés par des doublures alimentées par des réponses enregistrées.
Niveau	Outil	Cible	Exigence
Statique	TypeScript, ESLint	Tout le code	Zéro erreur, zéro any non justifié
Unitaire	Vitest	Services, schémas, modèle de pronostics, adaptateurs, calculs d'indicateurs	80 % de couverture sur src/modules/*/service.ts et src/server/security
Intégration	Vitest + base de test	Repositories, Server Actions, routes, contraintes de base	Chaque action : cas nominal, entrée invalide, permission refusée
Bout en bout	Playwright	Parcours visiteur, membre, éditeur, administrateur	Parcours critiques ci-dessous, sur Chromium et mobile émulé
Sécurité	Scripts dédiés, OWASP ZAP	Les 41 contrôles et B1 à B12	Rejoués en phase 9 et avant chaque version majeure
Accessibilité	axe via Playwright	Pages publiques et formulaires	Aucun défaut critique ou sérieux
Performance	Lighthouse CI	Accueil, catalogue, fiche, pronostics	Score mobile d'au moins 90, budget JavaScript surveillé
Visuel	Captures Playwright	Composants et pages clés à 375, 768 et 1280 px	Écart examiné avant fusion
Parcours critiques de bout en bout
1.	Un visiteur arrive, change de pays, filtre les offres, copie un code, clique vers le partenaire : un clic et un événement de copie existent en base.
2.	Un visiteur compare trois offres et ouvre les conditions de l'une.
3.	Une personne s'inscrit, vérifie son e-mail, se connecte, modifie ses préférences, se désinscrit, supprime son compte.
4.	Un éditeur crée une offre, la soumet ; un administrateur la publie ; elle apparaît sur le site ; elle expire à sa date.
5.	Un postback signé arrive : la conversion apparaît, rattachée au bon clic ; le même postback rejoué ne change rien.
6.	Une ingestion de test alimente un match ; le pronostic est calculé, verrouillé, puis réglé après le score.
7.	Un membre tente d'ouvrir /admin et chaque action d'administration : refus partout.
Données de test
Les jeux de test vivent dans tests/fixtures, portent des noms manifestement fictifs (« Bookmaker Test A ») et ne sont chargés que dans la base de test. Aucun script de données de démonstration ne s'exécute en production ; la CI le vérifie.
Barrière de fusion
Une branche ne fusionne dans main que si lint, types, tests unitaires, tests d'intégration, build et audit de dépendances passent. Les tests de bout en bout tournent sur la prévisualisation avant toute mise en production.
13. Stratégie de déploiement
Trois environnements isolés, un déploiement automatique par branche et un retour arrière en un geste : rien n'atteint la production sans avoir tourné en prévisualisation.
Environnement	Déclencheur	Base	Secrets	Accès
Local	Poste de développement	Base de développement ou conteneur Postgres	.env.local, valeurs de développement	Développeur, agent
Prévisualisation	Chaque demande de fusion	Base de développement distincte de la production	Jeu propre, jamais ceux de production	Protégé par authentification
Production	Fusion dans main après validation humaine	Projet de base dédié	Jeu propre, rotation documentée	Public
Chaîne de livraison
1.	Branche feat/* → demande de fusion → CI complète.
2.	Déploiement de prévisualisation → tests de bout en bout → revue humaine.
3.	Fusion dans main → migrations appliquées par une étape dédiée → déploiement de production.
4.	Tests de fumée automatiques : accueil, catalogue, /api/health, une redirection /go de test.
5.	En cas d'échec : retour à la version précédente par l'hébergeur ; les migrations suivent la règle ci-dessous.
Règles de migration
•	Migrations additives d'abord : ajouter une colonne, déployer le code, puis retirer l'ancienne dans une version ultérieure.
•	Toute migration destructrice exige une sauvegarde fraîche et une validation humaine.
•	Aucune commande de type push directe sur la base de production ; seules les migrations versionnées s'appliquent.
Configuration de production
•	Domaine avec HTTPS forcé et HSTS.
•	En-têtes de sécurité et CSP bloquante.
•	robots.txt excluant /admin, /compte, /api, /go.
•	Régions d'exécution et de base proches l'une de l'autre et de l'audience principale.
•	Tâches planifiées déclarées dans la configuration de l'hébergeur ou dans QStash, avec secret.
Validation humaine obligatoire avant
•	☐ Toute dépense ou passage à un plan payant.
•	☐ La première mise en production publique et tout changement de domaine.
•	☐ Toute migration destructrice ou suppression de données.
•	☐ L'utilisation de données personnelles réelles hors production.
•	☐ La rotation ou la création de secrets de production.
14. Services externes et budget progressif
Le développement complet tient sur des plans gratuits ; la première dépense obligatoire est l'hébergement au moment de l'ouverture publique, parce que le plan gratuit de Vercel exclut l'usage commercial. 
Service	Utilité	Plan gratuit et limites	Alternatives	Devient payant quand
Vercel
Hébergement, prévisualisations, tâches planifiées	Hobby : usage personnel non commercial uniquement	Cloudflare Workers, VPS + Docker	Dès l'ouverture publique : Pro à 20 $/utilisateur/mois
Cloudflare Workers
Hébergement alternatif via OpenNext	100 000 requêtes/jour, 10 ms de CPU par requête	Vercel Pro	Si le rendu serveur dépasse le CPU gratuit
Supabase
Postgres, authentification, stockage	500 Mo de base, 1 Go de fichiers, 50 000 utilisateurs actifs/mois, 2 projets, pause après 7 jours d'inactivité	Neon + Better Auth	Avant 400 Mo, ou dès que les sauvegardes quotidiennes sont exigées : Pro à 25 $/mois
Neon
Postgres serverless alternatif	0,5 Go et 100 heures de calcul par projet, 10 branches	Supabase	Stockage ou calcul dépassés
Upstash Redis
Rate limiting, verrous	256 Mo, 500 000 commandes/mois	Redis auto-hébergé	Au-delà de 500 000 commandes : 0,20 $ par 100 000
API-Football
Données football	100 requêtes/jour, tous les endpoints, saisons limitées	football-data.org	Plus de 3 à 5 ligues suivies : Pro à 19 $/mois pour 7 500 requêtes/jour
Resend ou Brevo	E-mails transactionnels	3 000 e-mails/mois, 100 par jour	SMTP du fournisseur d'authentification, Amazon SES	Plus de 100 e-mails par jour : 
GitHub	Dépôt, CI	Suffisant pour ce projet	GitLab	Non prévu
Sentry	Suivi des erreurs	Plan gratuit, limites à vérifier	Journaux de l'hébergeur	Volume d'erreurs ou équipe élargie
API de bot Telegram	Publication automatique	Gratuite	Publication manuelle	Jamais
WhatsApp Business API	Envois automatisés	Aucun plan gratuit utile ici	Liens d'invitation manuels	Seulement si le volume le justifie, sur décision humaine
LLM de rédaction	Texte d'analyse des pronostics	—	Texte par gabarit, sans LLM	Optionnel, phase 7, avec plafond journalier
Nom de domaine	Adresse du site	—	—	-
Trajectoire de coût
Étape	Services payants	Ordre de grandeur mensuel
Développement, phases 0 à 9	Aucun	0 $
Lancement public	Hébergement + domaine	20 $ + domaine (approximatif : 1 à 2 $/mois ramené au mois)
Croissance	+ base Pro + données sportives Pro	Environ 65 $
Volume	+ e-mail Pro, Redis à l'usage	Environ 85 $ et plus, selon l'usage
Une alerte de dépense est configurée chez chaque fournisseur dès la saisie d'un moyen de paiement. Antigravity ne souscrit à aucun plan : il signale le besoin, chiffre l'option et attend la décision.
15. Maintenance et évolution
Après le lancement, la plateforme vit par des routines fixes : sans vérification régulière des offres et des dépendances, la confiance et la sécurité se dégradent en quelques semaines.
Routines
Fréquence	Action	Responsable
Quotidienne	Lire les alertes d'erreurs et de sécurité ; contrôler l'exécution des tâches planifiées et de l'ingestion	Administrateur
Quotidienne	Vérifier les offres mises en avant et marquer leur date de vérification	Éditeur
Hebdomadaire	Revoir les offres non vérifiées depuis 30 jours, les liens en erreur, les conversions non attribuées	Éditeur, administrateur
Hebdomadaire	Fusionner les mises à jour de sécurité des dépendances après CI	Développement
Mensuelle	Rapprocher les commissions de BONUVO avec les tableaux de bord des partenaires	Administrateur
Mensuelle	Revoir les comptes d'administration et leurs rôles ; retirer les accès inutiles	Super-administrateur
Trimestrielle	Tester une restauration ; faire tourner les secrets ; rejouer l'audit des 41 contrôles	Développement
Trimestrielle	Évaluer la précision du modèle de pronostics et décider d'une nouvelle version	Développement
Règles d'évolution
•	Toute évolution structurante commence par un ADR dans docs/decisions.
•	Un nouveau réseau d'affiliation ou fournisseur de données s'ajoute par un adaptateur, sans toucher au cœur.
•	Un nouveau pays s'ouvre par configuration : éligibilités, devise, langue, canaux, validation juridique.
•	Une nouvelle version du modèle de pronostics coexiste avec l'ancienne ; l'historique garde la version d'origine.
•	Les mises à jour majeures du framework passent par une branche dédiée et la suite de tests complète.
Évolutions envisagées après la première version
Évolution	Condition de déclenchement
Autres sports (basket, tennis)	Précision football stable et audience demandeuse
Modèle de pronostics entraîné (Elo, régression)	Deux saisons de données en base
Application mobile ou PWA avec notifications	Part mobile élevée et membres actifs
Avis et notes des membres	Modération en place
Tests A/B sur cartes et boutons	Volume de clics suffisant pour conclure
Partitionnement de clicks, entrepôt analytique	Plusieurs millions de lignes
Extraction de l'ingestion sportive en service séparé	Durée des tâches dépassant les limites de l'hébergeur
16. Critères de réussite du projet
Le projet est réussi quand un visiteur trouve une offre réelle en moins de trois gestes et que chaque chiffre du back-office se prouve jusqu'à sa source.
Domaine	Critère mesurable
Fonctionnel	Les dix modules sont livrés et leurs critères d'acceptation validés par un humain
Véracité	Zéro donnée fictive en production ; chaque conversion et commission a une source ; chaque pronostic a ses données d'entrée
Sécurité	41 contrôles et B1 à B12 exécutés ; aucun échec critique ou élevé ouvert
Performance	LCP sous 2,5 s et score Lighthouse mobile d'au moins 90 sur les pages clés
Accessibilité	Conformité WCAG 2.1 AA sur les parcours publics
Fiabilité	Disponibilité mensuelle d'au moins 99,5 % ; restauration testée en moins de 4 heures
Suivi	Écart entre clics BONUVO et clics déclarés par les partenaires inférieur à 10 % sur un mois
Qualité du code	CI verte ; couverture d'au moins 80 % sur les services ; aucune erreur TypeScript
Exploitation	Guide d'exploitation à jour ; une personne nouvelle déploie et restaure en le suivant
Conformité	Mention d'affiliation, 18+, jeu responsable et éligibilité par pays présents et validés juridiquement
Budget	Coût mensuel conforme à la trajectoire validée ; aucune dépense non approuvée
17. Directives de travail pour Antigravity
Antigravity avance une phase à la fois, prouve chaque fonctionnalité par un test et s'arrête pour validation humaine à la fin de chaque phase. Ces règles priment sur toute recherche de rapidité.
Avant d'écrire du code
1.	Lire ce document en entier, puis la phase en cours.
2.	Inspecter le dépôt : arborescence, package.json, migrations, docs/decisions, dernier rapport de phase.
3.	Ne rien supposer : vérifier qu'une fonctionnalité, une table ou une variable existe avant de s'y appuyer.
4.	Annoncer le plan de la session : fichiers à créer ou modifier, tests prévus, risques.
Pendant le travail
•	Respecter l'architecture validée ; tout écart passe par un ADR et une validation.
•	Ne modifier un fichier fonctionnel que si la tâche l'exige ; expliquer pourquoi dans le commit.
•	Chercher un composant, une fonction ou un schéma existant avant d'en créer un : aucune duplication.
•	Écrire un code typé, lisible, commenté là où l'intention n'est pas évidente.
•	Placer chaque secret dans une variable d'environnement déclarée dans src/server/env.ts et .env.example.
•	Écrire le test en même temps que la fonctionnalité, l'exécuter, corriger jusqu'au vert.
•	Faire des commits petits et nommés selon la convention (feat:, fix:, chore:, test:, docs:).
•	Ne jamais désactiver un test, une règle de lint ou un contrôle de sécurité pour faire passer la CI.
Interdits
•	Créer des données fictives présentées comme réelles : offres, notes, avis, conversions, commissions, statistiques, pronostics, résultats.
•	Simuler une intégration : un adaptateur non branché affiche « non configuré » et ne renvoie aucune fausse réponse.
•	Coder en dur un chiffre de tableau de bord.
•	Écrire un secret dans le code, un commit, un journal ou un rapport.
•	Développer plusieurs phases dans une même session.
•	Employer un vocabulaire de gain garanti dans les contenus.
Arrêt obligatoire et demande de validation humaine
•	Action irréversible : suppression de données, migration destructrice, réécriture d'historique Git.
•	Dépense : création de compte payant, changement de plan, achat de domaine.
•	Données réelles sensibles : accès à des données personnelles ou à des identifiants d'affiliation de production.
•	Mise en production publique ou modification du DNS.
•	Ambiguïté sur une règle métier ou contradiction entre ce document et l'environnement constaté.
Compte rendu de fin de phase
Chaque phase se clôt par docs/phases/phase-NN-rapport.md, structuré ainsi :
Rubrique	Contenu
Résumé	Ce qui a été livré, en cinq lignes
Critères d'acceptation	Liste de la phase, chacun avec verdict et preuve (commande, sortie, capture)
Tests	Nombre, résultats, couverture
Sécurité	Contrôles de la section 11 concernés, avec verdict
Décisions	ADR créés ou modifiés
Écarts	Ce qui diffère du plan, et pourquoi
Dette et risques	Ce qui reste fragile ou reporté
Questions ouvertes	Points nécessitant une décision humaine
Suite	Prérequis de la phase suivante
18. Checklist finale destinée à Antigravity
Cette liste se coche phase après phase ; la plateforme n'est ouverte au public que lorsque toutes les cases sont cochées et contresignées par un humain.
Fondations
•	☐ Environnement inspecté et rapport de phase 0 rédigé.
•	☐ ADR-0001 validé ; versions figées.
•	☐ TypeScript strict, lint, formatage et crochets Git actifs.
•	☐ Variables d'environnement validées au démarrage ; .env.example à jour.
•	☐ CI verte : lint, types, tests, build, audit, recherche de secrets.
•	☐ Trois environnements isolés, secrets distincts.
Interface
•	☐ Design system et jetons en place, thèmes sombre et clair.
•	☐ Coques publique, membre et administration responsives.
•	☐ États de chargement, vide et erreur sur chaque écran de données.
•	☐ Français et anglais disponibles ; hreflang correct.
•	☐ Accessibilité AA vérifiée ; performances mesurées.
Catalogue et offres
•	☐ Bookmakers, offres, codes, conditions et pays gérés depuis l'administration.
•	☐ Cycle de vie des offres et expiration automatique opérationnels.
•	☐ Date de vérification réelle affichée ; aucun « vérifié aujourd'hui » automatique.
•	☐ Filtres, tri, recherche et comparateur fonctionnels.
•	☐ Aucune offre servie hors de ses pays éligibles.
•	☐ Mention d'affiliation, 18+ et jeu responsable visibles.
Affiliation et mesure
•	☐ /go/[slug] ne redirige que vers des URL stockées et autorisées.
•	☐ Chaque clic enregistré une fois, robots marqués.
•	☐ Postbacks vérifiés, dédupliqués, événements bruts conservés.
•	☐ Clics, inscriptions, premiers dépôts et commissions distincts.
•	☐ Aucune conversion ni commission sans source.
•	☐ Tableaux de bord égaux aux comptages SQL ; fraîcheur affichée.
Pronostics
•	☐ Ingestion tracée, quota respecté, réponses validées.
•	☐ Modèle versionné, documenté, testé sur des cas calculés à la main.
•	☐ Pronostics verrouillés avant le match, réglés après, jamais modifiés.
•	☐ Précision publiée sur tout l'historique, pertes comprises.
•	☐ Avertissement présent ; aucun terme de gain garanti.
Membres et communauté
•	☐ Offres accessibles sans compte.
•	☐ Inscription, vérification, connexion, récupération et déconnexion testées.
•	☐ Consentements historisés ; désinscription en un clic ; suppression de compte effective.
•	☐ Liens Telegram et WhatsApp réels, gérés par pays.
•	☐ Aucun envoi sans consentement actif.
Administration et sécurité
•	☐ Rôles et permissions séparés ; double authentification pour l'administration.
•	☐ Chaque écriture d'administration au journal d'audit.
•	☐ Rate limiting distribué actif : 5 connexions par minute et par IP, blocage à la 6e.
•	☐ 41 contrôles exécutés avec verdict et preuve ; B1 à B12 exécutés.
•	☐ Fiches d'échec closes ou acceptées par écrit.
•	☐ CSP bloquante ; en-têtes de sécurité vérifiés en production.
Production
•	☐ Plan d'hébergement autorisant l'usage commercial, validé et payé par un humain.
•	☐ Sauvegardes actives ; restauration testée et chronométrée.
•	☐ Supervision, alertes et contrôle de disponibilité actifs.
•	☐ Guide d'exploitation rédigé ; retour arrière testé.
•	☐ Aucune donnée de test en production.
•	☐ Validation juridique des pays ouverts obtenue.
•	☐ Rapport final remis.
BONUVO: SMART OFFERS. BETTER CHOICES.
Sources
Tarifs et limites consultés le 10 novembre 2026. Les chiffres Supabase, le prix de Vercel Pro et la version de Next.js proviennent de comparatifs tiers récents ; à reconfirmer sur les pages officielles.
•	Vercel — plan Hobby, restriction d'usage non commercial
•	Vercel — limites du plan Hobby en 2026 (DeployWise)
•	Cloudflare Workers — tarifs
•	Cloudflare Pages et adaptateur OpenNext (Temps)
•	Supabase — mise en pause des projets gratuits
•	Supabase — plans et limites 2026 (MakerKit)
•	Neon — limites du plan gratuit
•	Upstash Redis — tarifs
•	API-Football — tarifs
•	API-Football — guide de démarrage et quotas
•	Resend — tarifs
•	Next.js — versions de la branche 16 (VersionLog)
Références visuelles : captures fournies de transfermarkt.fr, eurosport.fr, afrik-foot.com et du site Mejor Prono.
