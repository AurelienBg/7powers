/**
 * useCloudSync — bridges local-first Pinia state to Supabase on login.
 *
 * Gameframe-style flow (per spec § 12):
 *   1. Anonymous user works locally — everything in Pinia + localStorage.
 *   2. User opts in to login (magic-link or OAuth in Phase 1.5+).
 *   3. On first login WITH a local project that hasn't been synced yet,
 *      we push the project + assessments to Supabase via useProject().syncToCloud().
 *   4. Subsequent local edits in this session stay local — full bidirectional
 *      sync is Phase 2+. The user can re-sync manually via a UI action (future).
 *
 * The watcher is scoped to the active component (typically the default layout),
 * so it follows the app's lifecycle. Idempotent: re-runs of the effect skip
 * when syncedToCloud is already true.
 */
export function useCloudSync() {
  const user = useSupabaseUser()
  const { syncToCloud, hasProject, syncedToCloud } = useProject()

  const status = ref<'idle' | 'syncing' | 'synced' | 'error'>('idle')
  const errorMessage = ref<string | null>(null)

  // Initial state reflects whatever the persisted store says.
  if (syncedToCloud.value) status.value = 'synced'

  watchEffect(async () => {
    // SSR has no localStorage and no auth state worth syncing — skip.
    if (typeof window === 'undefined') return
    if (!user.value) {
      // User signed out → reset visible status. The store's syncedToCloud
      // flag is preserved (their cloud-side data still exists).
      if (status.value === 'synced' || status.value === 'error') status.value = 'idle'
      return
    }
    if (!hasProject.value) return
    if (syncedToCloud.value) {
      status.value = 'synced'
      return
    }
    // Conditions met: authenticated + local project + not yet synced.
    status.value = 'syncing'
    errorMessage.value = null
    try {
      await syncToCloud()
      status.value = 'synced'
    } catch (e) {
      status.value = 'error'
      errorMessage.value = e instanceof Error ? e.message : 'Unknown sync error'
      console.error('[useCloudSync] syncToCloud failed:', e)
    }
  })

  return { status, errorMessage }
}
