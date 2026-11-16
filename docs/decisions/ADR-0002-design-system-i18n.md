# ADR-0002 : Design system, typographie, logo officiel et internationalisation (Phase 1)

- **Statut** : Proposé pour validation humaine en fin de Phase 1
- **Date** : 2026-11-16
- **Contexte** : Implémentation de la Phase 1 décrite dans [Plan.md](../../Plan.md) et intégration de la maquette de logo officielle `Choix.dc.html`.

## 1. Dépendances Phase 1 figées

Toutes les versions sont épinglées à l'exact (`--save-exact`) :

- `next-intl` : `4.15.1` (compatibilité déclarée `next ^16.0.0`, `react ^19.0.0`)
- `lucide-react` : `1.73.0`
- `class-variance-authority` : `0.7.1`
- `clsx` : `2.1.1`
- `tailwind-merge` : `3.7.0`
- Primitives Radix (`shadcn/ui`) : `@radix-ui/react-slot@1.5.0`, `@radix-ui/react-dialog@1.3.1`, `@radix-ui/react-tabs@1.2.1`, `@radix-ui/react-select@2.4.1`, `@radix-ui/react-switch@1.4.1`, `@radix-ui/react-tooltip@1.4.1`
- Outils de test et d'accessibilité (devDependencies) : `@testing-library/react@16.3.3`, `@testing-library/dom@10.4.1`, `@testing-library/jest-dom@7.0.1`, `@vitejs/plugin-react@6.3.0`, `jsdom@31.0.1`, `@axe-core/playwright@4.14.0`

## 2. Identité visuelle, thèmes et accessibilité WCAG 2.1 AA

- **Logo officiel (`Choix.dc.html`)** : reproduit dans `src/components/brand/BrandLogo.tsx`, `src/components/brand/BrandMark.tsx` et `src/app/icon.svg` avec la police display `Unbounded` et le double glyphe géométrique anneau + cible.
- **Typographie (`next/font/google`)** : `Unbounded` (`--font-display`), `Plus Jakarta Sans` (`--font-sans`), `JetBrains Mono` (`--font-mono`).
- **Thèmes par variables CSS** :
  - Thème **sombre bleu nuit par défaut** (`--bg: #0B1120`, `--surface: #131C31`, accent CTA `#FF7A1A` avec encre sombre `#101014` assurant un ratio de contraste `7.28:1`).
  - Thème **clair** issu de la variante claire du logo (`--bg: #F6F4EF`, `--surface: #FFFFFF`, accent `#C2410C` avec texte blanc `5.18:1`).
  - Couleur **vert confiance** (`#2EE08A` en sombre, `#047857` en clair) réservée aux notes, vérifications et états positifs.
- **Persistance sans script inline ni `dangerouslySetInnerHTML`** : lecture SSR du cookie non sensible `bonuvo_theme` dans `src/app/[locale]/layout.tsx`, sans injection HTML brute et sans flash d'hydratation.

## 3. Routage i18n via Next.js 16 `src/proxy.ts`

- Next.js 16 remplace la convention `middleware.ts` par `src/proxy.ts` (`export function proxy(request: NextRequest)`).
- Locales : `fr` (défaut) et `en`, préfixe toujours explicite (`/fr`, `/en`), détection de langue active, routes `/api/*`, `/go/*` et actifs statiques exclus du matcher.
- Politique `Content-Security-Policy-Report-Only` activée dans `next.config.ts` avant passage au mode bloquant avec nonce en Phase 9.
