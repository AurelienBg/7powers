import type { Config } from 'tailwindcss'

/**
 * 7Powers brand palette — LOCKED.
 *
 *   Primary blue:  #378ADD  (CTAs, card borders, hover glow, all Power scoring elements)
 *   Gold accent:   #EF9F27  (USED SPARINGLY — only on dominant Powers and top-scoring
 *                            elements. "What shines = what holds.")
 *
 * Logo files live in public/. See public/README.md for usage rules.
 *
 * Derived shades (bright/glow) are computed from the locked brand hexes to keep
 * the visual identity coherent across hover, focus, and emphasis states.
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
        // Surfaces
        bg: {
          base: '#0a0a0f',
          card: '#11111a',
          elevated: '#161622'
        },
        border: {
          subtle: '#1f1f2e',
          accent: '#2a2a40'
        },

        // Brand — primary blue (#378ADD)
        // Use `brand-blue` everywhere a Power-related accent is needed.
        // `accent-blue` is kept as an alias of `brand-blue` so existing
        // utilities (.btn-primary, .card-hover) keep working unchanged.
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

        // Gold — emphasis only. Reserve for top-3 Powers / high-score badges.
        gold: {
          DEFAULT: '#EF9F27',
          bright: '#F5B450',
          glow: '#B87808'
        },

        // Typography ramp
        ink: {
          high: '#f5f5f7',
          mid: '#a1a1aa',
          low: '#52525b'
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
