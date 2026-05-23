/**
 * Optional auth middleware.
 *
 * Apply per-page with:
 *   definePageMeta({ middleware: 'auth' })
 *
 * Used on routes that REQUIRE authentication (Supabase-backed dashboard, history).
 * Local-first routes (project creation, modules) do NOT use this middleware —
 * anonymous users keep their data in localStorage.
 */
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  if (!user.value) {
    return navigateTo({
      path: '/login',
      query: { next: to.fullPath }
    })
  }
})
