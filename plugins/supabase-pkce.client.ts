/**
 * PKCE code exchange — runs once on initial client load.
 *
 * Supabase magic-links (and OAuth flows in newer SDK versions) use the PKCE
 * flow, which redirects the user to `<redirect_to>?code=<pkce_code>`. The code
 * must be explicitly exchanged for a session via `exchangeCodeForSession`.
 *
 * The @nuxtjs/supabase module's built-in callback handler is disabled here
 * because we run with `redirect: false` (Gameframe-style opt-in auth — we don't
 * force a global redirect middleware). This plugin replaces that callback path
 * with a more permissive handler: it processes the code wherever the user
 * lands (`/`, `/confirm`, `/en/`, etc.) so the magic-link flow never breaks
 * even if Supabase's URL whitelist falls back to the Site URL.
 */
export default defineNuxtPlugin(async () => {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  if (!code) return

  const supabase = useSupabaseClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    // Don't throw — the user may have hit an expired/already-used link.
    // Log silently; the UI will simply show "not authenticated".
    console.error('[supabase-pkce] exchangeCodeForSession failed:', error.message)
    return
  }

  // Clean the URL so the code doesn't sit in the address bar (and isn't
  // accidentally shared if the user copies the URL). Replace history entry
  // instead of pushing — no back-button artifact.
  url.searchParams.delete('code')
  // Also remove auth-related leftovers if any.
  url.searchParams.delete('error')
  url.searchParams.delete('error_description')
  window.history.replaceState({}, '', url.toString())
})
