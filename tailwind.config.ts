import type { Config } from 'tailwindcss'

/**
 * 7Powers brand palette — LOCKED.
 *
 *   Primary blue:  #378ADD  (CTAs, card borders, hover glow, Power scoring)
 *   Gold accent:   #EF9F27  (USED SPARINGLY — only on dominant Powers and
 *                            top-scoring elements. "What shines = what holds.")
 *
 * Surface colors (bg.*, border.*, ink.*) are wired to CSS variables defined
 * in assets/css/main.css — they swap between light and dark via the `.dark`
 * class on <html>. Brand colors stay static across themes.
 */
export default <Partial<Config>>{
  darkMode: 'class',
  content: [
    './components/**/*.{vue,js,ts}',
    './layouts/**/*.vue',
    './pages/**/*.vue',
    './composables/**/*.{js,ts}',
    './plugins/**/*.{js,ts}',
    './app.vue',
    './error.vue'
  ],
  theme: {
    extend: {
      colors: {
        // ────────────────────────────────────────────────────────────────
        // Theme-aware surface colors — driven by CSS variables in :root + .dark
        // ────────────────────────────────────────────────────────────────
        bg: {
          base: 'rgb(var(--bg-base) / <alpha-value>)',
          card: 'rgb(var(--bg-card) / <alpha-value>)',
          elevated: 'rgb(var(--bg-elevated) / <alpha-value>)'
        },
        border: {
          subtle: 'rgb(var(--border-subtle) / <alpha-value>)',
          accent: 'rgb(var(--border-accent) / <alpha-value>)'
        },
        ink: {
          high: 'rgb(var(--ink-high) / <alpha-value>)',
          mid: 'rgb(var(--ink-mid) / <alpha-value>)',
          low: 'rgb(var(--ink-low) / <alpha-value>)'
        },

        // ────────────────────────────────────────────────────────────────
        // Brand colors — LOCKED, identical in both themes
        // ────────────────────────────────────────────────────────────────
        brand: {
          blue: '#378ADD',
          'blue-bright': '#5BA3E8',
          'blue-glow': '#1E5FAB',
          gold: '#EF9F27',
          'gold-bright': '#F5B450',
          'gold-glow': '#B87808'
        },
        accent: {
          blue: '#378ADD',
          'blue-bright': '#5BA3E8',
          'blue-glow': '#1E5FAB'
        },
        gold: {
          DEFAULT: '#EF9F27',
          bright: '#F5B450',
          glow: '#B87808'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Geist', 'system-ui', 'sans-serif'],
        mono: ['Geist Mono', 'JetBrains Mono', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        // 55,138,221 = #378ADD
        'glow-blue': '0 0 0 1px rgba(55, 138, 221, 0.4), 0 0 24px -4px rgba(55, 138, 221, 0.35)',
        // 239,159,39 = #EF9F27
        'glow-gold': '0 0 0 1px rgba(239, 159, 39, 0.4), 0 0 24px -4px rgba(239, 159, 39, 0.35)',
        'card': '0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 0 0 1px rgba(255, 255, 255, 0.04)'
      }
    }
  }
}
