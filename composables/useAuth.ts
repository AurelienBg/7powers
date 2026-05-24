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
    // PROTECT UNSYNCED WORK before wiping local state. We used to $reset
    // unconditionally, which lost any project that hadn't yet been pushed
    // to Supabase (e.g. anon project created right before login → user
    // hits "Logout" before the auto-push completes → project is dropped
    // locally AND never made it to the cloud).
    //
    // Strategy: push any local-only projects synchronously here. Errors
    // are logged but don't block the logout — the user explicitly asked
    // to sign out and we shouldn't strand them.
    if (typeof window !== 'undefined' && user.value) {
      const projectStore = useProjectStore()
      const { syncToCloud } = useProject()
      const unsynced = projectStore.projectList.filter(
        (p) => !projectStore.syncedLocalIds.includes(p.local_id)
      )
      if (unsynced.length > 0) {
        const previousCurrent = projectStore.currentProjectId
        for (const p of unsynced) {
          try {
            // syncToCloud uses store.currentProject — temporarily switch.
            projectStore.setCurrentProject(p.local_id)
            await syncToCloud()
            console.log('[signOut] pushed unsynced project before logout:', p.name)
          } catch (e) {
            console.warn('[signOut] failed to push unsynced project', p.local_id, e)
          }
        }
        projectStore.setCurrentProject(previousCurrent)
      }
    }

    // Now wipe per-user local state so the next account that logs in on
    // this browser doesn't inherit the previous user's projects / coach
    // threads via localStorage.
    if (typeof window !== 'undefined') {
      useProjectStore().$reset()
      useCoachStore().$reset()
    }
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
