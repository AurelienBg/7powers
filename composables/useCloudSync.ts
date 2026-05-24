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
 * The watcher is scoped to the active component (typically the default layout
 * or the project layout's sidebar), so it follows the app's lifecycle.
 * Idempotent: re-runs of the effect skip when syncedToCloud is already true.
 */

const _status = ref<'idle' | 'syncing' | 'synced' | 'error'>('idle')
const _errorMessage = ref<string | null>(null)
const _watcherInstalled = ref(false)

export function useCloudSync() {
  const user = useSupabaseUser()
  const { syncToCloud, hasProject, syncedToCloud } = useProject()

  // Initial state reflects whatever the persisted store says.
  if (syncedToCloud.value && _status.value === 'idle') _status.value = 'synced'

  async function runSync(): Promise<void> {
    _status.value = 'syncing'
    _errorMessage.value = null
    try {
      await syncToCloud()
      _status.value = 'synced'
    } catch (e) {
      _status.value = 'error'
      _errorMessage.value = e instanceof Error ? e.message : 'Unknown sync error'
      console.error('[useCloudSync] syncToCloud failed:', e)
    }
  }

  // Mount the auto-watcher only once across the app, even if multiple
  // components call useCloudSync() (sidebar + header could both subscribe).
  if (!_watcherInstalled.value) {
    _watcherInstalled.value = true
    watchEffect(() => {
      if (typeof window === 'undefined') return
      if (!user.value) {
        if (_status.value === 'synced' || _status.value === 'error') _status.value = 'idle'
        return
      }
      if (!hasProject.value) return
      if (syncedToCloud.value) {
        _status.value = 'synced'
        return
      }
      // Conditions met → trigger an auto-sync (only once per state transition).
      if (_status.value !== 'syncing') runSync()
    })
  }

  return {
    status: _status,
    errorMessage: _errorMessage,
    /** Manually re-trigger a sync attempt (used by the Retry button). */
    retry: runSync
  }
}
