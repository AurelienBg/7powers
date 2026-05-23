# 7Powers — Logo assets

Logo officiel de l'app 7Powers. Métaphore : vue du dessus d'un moat circulaire, 6 murets bleus + 1 muret gold dominant en haut, protégeant le chiffre 7 au centre.

## Palette

- **Bleu (murets standards)** : `#378ADD`
- **Gold (muret dominant)** : `#EF9F27`
- **Texte 7 (light mode)** : `#0a0a0f`
- **Texte 7 (dark mode)** : `#ffffff`
- **Fond sombre (favicon, dark mode)** : `#0a0a0f`

## Fichiers

| Fichier | Usage |
|---|---|
| `logo-light.svg` | Logo pour fond clair. Le chiffre 7 est en `#0a0a0f`. À utiliser dans le header light mode, dans le PDF export, sur les supports print clairs. |
| `logo-dark.svg` | Logo pour fond sombre. Le chiffre 7 est en `#ffffff`. À utiliser dans le header dark mode (qui est le mode par défaut de l'app), sur les fonds sombres en général. |
| `logo-adaptive.svg` | Logo qui s'adapte automatiquement au mode (light/dark) via `@media (prefers-color-scheme: dark)`. Pratique pour un usage générique où on ne veut pas gérer deux fichiers. ⚠️ Ne fonctionne pas dans toutes les intégrations (certains contextes désactivent le CSS dans les SVG). À tester avant de l'utiliser comme source unique. |
| `favicon-A-with-7.svg` | Favicon avec le chiffre 7 visible. Plus narratif mais le 7 devient flou en dessous de 24px. À utiliser pour les usages où la taille minimale est ≥ 32px (favicon tab moderne, apple-touch-icon, OpenGraph). |
| `favicon-B-no-7.svg` | Favicon sans le chiffre 7, juste la couronne de 7 murets. Plus lisible aux petites tailles. À utiliser pour les favicons système (16px, 32px) et les contextes très contraints. |

## Intégration Nuxt 3

### 1. Placement
Place les fichiers dans `public/` à la racine du projet Nuxt :

```
public/
├── logo-light.svg
├── logo-dark.svg
├── logo-adaptive.svg
├── favicon.svg              ← copie de favicon-A-with-7.svg ou favicon-B-no-7.svg
└── apple-touch-icon.png     ← à générer depuis favicon-A-with-7.svg en 180×180
```

### 2. Favicon dans `nuxt.config.ts`

```ts
export default defineNuxtConfig({
  app: {
    head: {
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
      meta: [
        { name: 'theme-color', content: '#0a0a0f' },
      ],
    },
  },
})
```

### 3. Utilisation dans un composant Vue

```vue
<template>
  <!-- Light mode header -->
  <img src="/logo-light.svg" alt="7Powers" width="40" height="40" />

  <!-- Dark mode header (mode par défaut de l'app 7Powers) -->
  <img src="/logo-dark.svg" alt="7Powers" width="40" height="40" />

  <!-- Lockup horizontal logo + wordmark -->
  <div class="flex items-center gap-3">
    <img src="/logo-dark.svg" alt="" width="36" height="36" />
    <span class="text-xl font-medium tracking-tight">7Powers</span>
  </div>
</template>
```

### 4. Inlining (recommandé pour les petits SVG)

Pour éviter une requête HTTP supplémentaire et permettre le styling CSS, tu peux inliner le SVG directement dans un composant `<Logo />` :

```vue
<!-- components/ui/Logo.vue -->
<template>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="-100 -100 200 200" :width="size" :height="size" role="img" aria-label="7Powers">
    <title>7Powers</title>
    <path d="M -39,-67.55 A 78,78 0 0,1 39,-67.55 L 29,-50.23 A 58,58 0 0,0 -29,-50.23 Z" fill="#EF9F27"/>
    <!-- ... 6 autres paths bleus ... -->
    <text x="0" y="20" text-anchor="middle" font-family="Inter, system-ui, sans-serif" font-size="68" font-weight="500" :fill="textColor">7</text>
  </svg>
</template>

<script setup lang="ts">
const props = defineProps<{
  size?: number
  mode?: 'light' | 'dark'
}>()

const size = computed(() => props.size ?? 40)
const textColor = computed(() => props.mode === 'light' ? '#0a0a0f' : '#ffffff')
</script>
```

## Génération de favicons multi-format

Si tu veux générer les versions PNG (favicon.ico, apple-touch-icon-180.png, og-image.png, etc.) à partir du SVG, utilise [favicon.io](https://favicon.io/favicon-converter/) ou la CLI `sharp` :

```bash
npx sharp-cli -i favicon-A-with-7.svg -o apple-touch-icon.png --width 180 --height 180
npx sharp-cli -i favicon-A-with-7.svg -o og-image.png --width 1200 --height 630
```

## Notes de design

- Le **muret gold** est en haut (centré sur l'axe vertical) et n'a **pas d'interstice** avec ses deux voisins → il "fusionne" avec eux, suggérant qu'un Power dominant en débloque souvent d'autres (cohérent avec la théorie Helmer).
- Les **6 autres murets** ont entre eux un gap de 1.7° pour rester distincts (= 7 Powers identifiables).
- La **typographie du 7** doit rester en `font-weight: 500` (medium), jamais en bold/700. Inter ou Geist sont les fonts cibles.
- **Ne pas modifier les couleurs** sans validation produit — `#378ADD` et `#EF9F27` sont les couleurs de marque officielles.
