import type { Config } from 'tailwindcss'

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
        bg: {
          base: '#0a0a0f',
          card: '#11111a',
          elevated: '#161622'
        },
        border: {
          subtle: '#1f1f2e',
          accent: '#2a2a40'
        },
        accent: {
          blue: '#3b82f6',
          'blue-bright': '#60a5fa',
          'blue-glow': '#1e3a8a'
        },
        gold: {
          DEFAULT: '#f59e0b',
          bright: '#fbbf24'
        },
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
        'glow-blue': '0 0 0 1px rgba(59, 130, 246, 0.4), 0 0 24px -4px rgba(59, 130, 246, 0.35)',
        'glow-gold': '0 0 0 1px rgba(245, 158, 11, 0.4), 0 0 24px -4px rgba(245, 158, 11, 0.35)',
        'card': '0 1px 0 0 rgba(255, 255, 255, 0.04) inset, 0 0 0 1px rgba(255, 255, 255, 0.04)'
      }
    }
  }
}
