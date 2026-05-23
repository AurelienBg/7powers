/**
 * Thin auth helper on top of @nuxtjs/supabase.
 * Centralizes magic-link send + sign-out so UI components don't talk to Supabase directly.
 */
export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  async function sendMagicLink(email: string, redirectTo?: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // After clicking the link, Supabase redirects to our /confirm route,
        // which then sends the user back here.
        emailRedirectTo:
          redirectTo ??
          (typeof window !== 'undefined' ? `${window.location.origin}/confirm` : undefined)
      }
    })
    if (error) throw error
  }

  async function signInWithGoogle(redirectTo?: string) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          redirectTo ??
          (typeof window !== 'undefined' ? `${window.location.origin}/confirm` : undefined)
      }
    })
    if (error) throw error
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const isAuthenticated = computed(() => !!user.value)

  return {
    user,
    isAuthenticated,
    sendMagicLink,
    signInWithGoogle,
    signOut
  }
}
