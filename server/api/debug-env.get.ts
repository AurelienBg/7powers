/**
 * TEMPORARY debug endpoint.
 * Returns BOOLEANS only — no secret values are leaked.
 * DELETE this file once the env var pipeline is confirmed working.
 *
 * Curl from prod:
 *   curl https://7powers.vercel.app/api/debug-env | jq
 */
export default defineEventHandler(() => {
  const runtimeConfig = useRuntimeConfig()

  return {
    note: 'TEMPORARY DEBUG ENDPOINT — booleans only, no secrets',
    build_marker: 'v2-after-supabase-vars-added',
    runtime: {
      node_version: process.version,
      platform: process.platform,
      env_count: Object.keys(process.env).length,
      // VERCEL_GIT_COMMIT_SHA is auto-injected by Vercel on every build
      // → tells us EXACTLY which commit this deployment was built from.
      vercel_commit_sha: process.env.VERCEL_GIT_COMMIT_SHA ?? '(not on vercel?)',
      vercel_env: process.env.VERCEL_ENV ?? '(not on vercel?)'
    },
    // What our .env.example uses
    custom_names: {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
      ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY
    },
    // What Nuxt's runtimeConfig conventions expect
    nuxt_convention: {
      NUXT_PUBLIC_SUPABASE_URL: !!process.env.NUXT_PUBLIC_SUPABASE_URL,
      NUXT_PUBLIC_SUPABASE_KEY: !!process.env.NUXT_PUBLIC_SUPABASE_KEY,
      NUXT_SUPABASE_SERVICE_KEY: !!process.env.NUXT_SUPABASE_SERVICE_KEY
    },
    // What @nuxtjs/supabase module conventions expect by default
    supabase_module_convention: {
      SUPABASE_KEY: !!process.env.SUPABASE_KEY,
      SUPABASE_SERVICE_KEY: !!process.env.SUPABASE_SERVICE_KEY
    },
    // What the resolved runtimeConfig actually contains
    resolved_runtime_config: {
      public_supabase_url_set: !!(runtimeConfig.public as Record<string, unknown>)?.supabase
        ? !!((runtimeConfig.public as Record<string, { url?: string }>).supabase?.url)
        : false,
      public_supabase_key_set: !!(runtimeConfig.public as Record<string, unknown>)?.supabase
        ? !!((runtimeConfig.public as Record<string, { key?: string }>).supabase?.key)
        : false,
      anthropic_key_set: !!(runtimeConfig as Record<string, unknown>).anthropicApiKey
    },
    // Length of values (further confirmation without revealing them)
    value_lengths: {
      SUPABASE_URL_len: (process.env.SUPABASE_URL ?? '').length,
      SUPABASE_ANON_KEY_len: (process.env.SUPABASE_ANON_KEY ?? '').length,
      SUPABASE_SERVICE_ROLE_len: (process.env.SUPABASE_SERVICE_ROLE ?? '').length,
      ANTHROPIC_API_KEY_len: (process.env.ANTHROPIC_API_KEY ?? '').length
    }
  }
})
