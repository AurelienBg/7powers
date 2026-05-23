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
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      // Local-first: we DON'T force redirect on every route.
      // Auth is opt-in for users who want to persist their project.
      exclude: ['/*'],
      cookieRedirect: false
    }
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
        { name: 'theme-color', content: '#0a0a0f' }
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }
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
