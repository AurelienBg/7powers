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
    '@vueuse/nuxt',
    // Auto page-view tracking on Vercel. Only sends data when deployed
    // on Vercel + Analytics is enabled in the project's dashboard; no-op
    // locally + on other hosting platforms.
    '@vercel/analytics/nuxt'
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

  // xrpl-connect ships a Web Component (<xrpl-wallet-connector>) — tell Vue
  // not to treat it as an unknown Vue component and not to emit warnings.
  vue: {
    compilerOptions: {
      isCustomElement: (tag) => tag === 'xrpl-wallet-connector'
    }
  },

  app: {
    head: {
      title: '7Powers — Build defensibility, Helmer-style',
      htmlAttrs: { class: 'dark' },
      // Inline script runs synchronously BEFORE first paint — prevents a
      // light↔dark flash if the user's persisted theme differs from the
      // SSR default class. See composables/useTheme.ts for the runtime side.
      script: [
        {
          innerHTML: `(function(){try{var t=localStorage.getItem('sevenpowers:theme');if(t==='light'){document.documentElement.classList.remove('dark')}else if(t==='dark'){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          tagPosition: 'head'
        }
      ],
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
    // Override-able via NUXT_ANTHROPIC_MODEL env var on Vercel without a rebuild.
    // Per spec § 4.3: Sonnet 4 by default. Bump when newer Sonnet ships.
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-20250514',
    public: {
      // xrpl-connect / Xaman adapter. Override on Vercel via:
      //   NUXT_PUBLIC_XAMAN_API_KEY     (Xaman / Xumm Developer Console)
      //   NUXT_PUBLIC_XRPL_NETWORK      'mainnet' | 'testnet' | 'devnet' (defaults mainnet)
      xamanApiKey: process.env.NUXT_PUBLIC_XAMAN_API_KEY ?? '',
      xrplNetwork: process.env.NUXT_PUBLIC_XRPL_NETWORK ?? 'mainnet'
    }
  }
})
