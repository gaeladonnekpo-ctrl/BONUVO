# BONUVO

> **BONUVO: SMART OFFERS. BETTER CHOICES.**

Plateforme internationale d'affiliation, de comparaison d'offres de bookmakers, de pronostics football vérifiables et de communauté, construite selon [Plan.md](./Plan.md).

## Démarrage rapide (développement local)

1. Installer Node.js `26.x` (LTS) et `npm`.
2. Copier `.env.example` vers `.env.local` et renseigner les variables requises :

   ```bash
   cp .env.example .env.local
   ```

3. Installer les dépendances :

   ```bash
   npm ci
   ```

4. Vérifier la configuration d'environnement et appliquer les migrations :

   ```bash
   npm run env:check
   npm run db:migrate
   ```

5. Lancer le serveur de développement :

   ```bash
   npm run dev
   ```

## Scripts principaux

| Script                 | Rôle                                          |
| :--------------------- | :-------------------------------------------- |
| `npm run dev`          | Démarre le serveur Next.js en développement   |
| `npm run build`        | Compile l'application pour la production      |
| `npm run lint`         | Exécute ESLint sur tout le dépôt              |
| `npm run format:check` | Vérifie le formatage Prettier                 |
| `npm run typecheck`    | Vérifie les types TypeScript (`tsc --noEmit`) |
| `npm run test:unit`    | Exécute les tests unitaires Vitest            |
| `npm run test:e2e`     | Exécute les tests bout en bout Playwright     |
| `npm run env:check`    | Valide les variables d'environnement via Zod  |
| `npm run db:generate`  | Génère une migration Drizzle SQL              |
| `npm run db:migrate`   | Applique les migrations SQL versionnées       |

## Documentation

- Feuille de route : [Plan.md](./Plan.md)
- Décisions d'architecture : [docs/decisions/](./docs/decisions/)
- Rapports de phases : [docs/phases/](./docs/phases/)
