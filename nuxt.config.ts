// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt',
    'pinia-plugin-persistedstate/nuxt',
    '@nuxtjs/i18n',
    '@nuxtjs/supabase',
    '@vueuse/nuxt'
  ],

  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE,
    // Local-first (Gameframe-style): auth is OPT-IN.
    // Disabling redirect entirely → users can browse without being forced to /login.
    // The login page is reachable via the explicit "Connexion" link in the header.
    redirect: false
  },

  css: ['~/assets/css/main.css'],

  components: [
    // Flatten directory hierarchy: components/ui/Logo.vue → <Logo />
    { path: '~/components', pathPrefix: false }
  ],

  typescript: {
    strict: true,
    typeCheck: false
  },

  app: {
    head: {
      title: '7Powers — Build defensibility, Helmer-style',
      htmlAttrs: { class: 'dark' },
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: 'Stress-test the defensibility of your project with Hamilton Helmer\'s 7 Powers framework.' },
        { name: 'theme-color', content: '#0a0a0f' },
        // OpenGraph (Slack / LinkedIn / Twitter previews)
        { property: 'og:title', content: '7Powers — Build defensibility, Helmer-style' },
        { property: 'og:description', content: 'Stress-test the defensibility of your project with Hamilton Helmer\'s 7 Powers framework. Power Map, defensibility score, action plan.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: '7Powers' },
        { name: 'twitter:card', content: 'summary' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        // iOS home-screen icon (iOS 18+ supports SVG)
        { rel: 'apple-touch-icon', href: '/favicon-A-with-7.svg' }
      ]
    }
  },

  i18n: {
    strategy: 'prefix_except_default',
    defaultLocale: 'fr',
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français', file: 'fr.json' },
      { code: 'en', language: 'en-US', name: 'English', file: 'en.json' }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
      redirectOn: 'root'
    }
  },

  runtimeConfig: {
    // Server-only secrets
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    public: {}
  }
})
