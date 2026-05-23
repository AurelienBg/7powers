<script setup lang="ts">
/**
 * 7Powers logo — inline SVG.
 *
 * Brand assets locked in public/README.md:
 *   - 6 blue walls (#378ADD) + 1 gold dominant wall (#EF9F27) on top
 *   - Central "7" — color depends on mode (light/dark)
 *
 * Modes:
 *   - 'dark'   (default): the "7" is white. For dark backgrounds (app default).
 *   - 'light': the "7" is near-black #0a0a0f. For light backgrounds (PDF export, light surfaces).
 *
 * showSeven=false renders the moat-only mark — used at very small sizes where the "7" becomes
 * illegible (favicons ≤24px, very compact UI badges).
 */
const props = withDefaults(
  defineProps<{
    size?: number | string
    mode?: 'light' | 'dark'
    showSeven?: boolean
    label?: string
  }>(),
  {
    size: 40,
    mode: 'dark',
    showSeven: true,
    label: '7Powers'
  }
)

const sevenFill = computed(() => (props.mode === 'light' ? '#0a0a0f' : '#ffffff'))
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="-100 -100 200 200"
    :width="size"
    :height="size"
    role="img"
    :aria-label="label"
  >
    <title>{{ label }}</title>
    <!-- Gold dominant wall (top) -->
    <path
      d="M -39,-67.55 A 78,78 0 0,1 39,-67.55 L 29,-50.23 A 58,58 0 0,0 -29,-50.23 Z"
      fill="#EF9F27"
    />
    <!-- 6 blue walls -->
    <path
      d="M 39,-67.55 A 78,78 0 0,1 76.46,-15.44 L 56.85,-11.48 A 58,58 0 0,0 29,-50.23 Z"
      fill="#378ADD"
    />
    <path
      d="M 76.88,-13.17 A 78,78 0 0,1 60.74,48.94 L 45.16,36.39 A 58,58 0 0,0 57.17,-9.79 Z"
      fill="#378ADD"
    />
    <path
      d="M 59.24,50.71 A 78,78 0 0,1 1.17,77.99 L 0.87,57.99 A 58,58 0 0,0 44.05,37.71 Z"
      fill="#378ADD"
    />
    <path
      d="M -1.14,77.99 A 78,78 0 0,1 -59.21,50.74 L -44.03,37.73 A 58,58 0 0,0 -0.85,57.99 Z"
      fill="#378ADD"
    />
    <path
      d="M -60.72,48.97 A 78,78 0 0,1 -76.89,-13.13 L -57.18,-9.77 A 58,58 0 0,0 -45.15,36.41 Z"
      fill="#378ADD"
    />
    <path
      d="M -76.45,-15.46 A 78,78 0 0,1 -39,-67.55 L -29,-50.23 A 58,58 0 0,0 -56.85,-11.50 Z"
      fill="#378ADD"
    />
    <!-- Central "7" -->
    <text
      v-if="showSeven"
      x="0"
      y="20"
      text-anchor="middle"
      font-family="Inter, system-ui, -apple-system, sans-serif"
      font-size="68"
      font-weight="500"
      :fill="sevenFill"
    >
      7
    </text>
  </svg>
</template>
