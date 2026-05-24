/**
 * useCloudSync — bridges local-first Pinia state to Supabase on login.
 *
 * Bidirectional sync at the login boundary:
 *
 *   1. User logs in with NO local projects     → fetchFromCloud()
 *      (e.g. new browser, post-logout, multi-device)
 *
 *   2. User logs in WITH local unsynced project → syncToCloud()
 *      (anonymous work being persisted upstream for the first time)
 *
 *   3. User logs in WITH local synced project   → noop
 *      (continuation of the same session, nothing to do)
 *
 *   4. User signs out                            → store.$reset()
 *      (handled in useAuth — clears local state so the next user starts clean)
 *
 * The watcher is mounted via useCloudSync() in components that care to
 * surface the status (default layout header + project sidebar footer).
 * Module-scoped refs keep the state shared across both mount points.
 */

const _status = ref<'idle' | 'syncing' | 'synced' | 'error'>('idle')
const _errorMessage = ref<string | null>(null)
const _watcherInstalled = ref(false)
// Tracks whether we've already done a one-shot pull for the current session,
// so we don't re-fetch on every reactive tick.
const _pullAttempted = ref(false)

export function useCloudSync() {
  const user = useSupabaseUser()
  const { syncToCloud, fetchFromCloud, hasProject, hasAnyProject, syncedToCloud } = useProject()

  if (syncedToCloud.value && _status.value === 'idle') _status.value = 'synced'

  async function runPush(): Promise<void> {
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

  async function runPull(): Promise<void> {
    _status.value = 'syncing'
    _errorMessage.value = null
    try {
      const count = await fetchFromCloud()
      _status.value = count > 0 ? 'synced' : 'idle'
    } catch (e) {
      _status.value = 'error'
      _errorMessage.value = e instanceof Error ? e.message : 'Unknown fetch error'
      console.error('[useCloudSync] fetchFromCloud failed:', e)
    }
  }

  /** Manually re-trigger a sync (used by the Retry button on the error modal). */
  async function retry(): Promise<void> {
    if (!user.value) return
    if (hasProject.value && !syncedToCloud.value) {
      await runPush()
    } else if (!hasAnyProject.value) {
      _pullAttempted.value = false
      await runPull()
    }
  }

  // Install the auto-watcher once. Decides push vs pull based on current state.
  if (!_watcherInstalled.value) {
    _watcherInstalled.value = true
    watchEffect(() => {
      if (typeof window === 'undefined') return

      // Signed out → reset visible status + the pull guard so the next
      // login can do a fresh fetch.
      if (!user.value) {
        if (_status.value === 'synced' || _status.value === 'error') _status.value = 'idle'
        _pullAttempted.value = false
        return
      }

      // Logged in. Decide what to do based on local state.
      if (hasAnyProject.value) {
        if (syncedToCloud.value) {
          _status.value = 'synced'
          return
        }
        // Local exists but not yet pushed → push.
        if (_status.value !== 'syncing') {
          console.log('[useCloudSync] logged in + unsynced local project → push')
          runPush()
        }
        return
      }

      // Logged in + empty local store → pull from cloud once per session.
      if (!_pullAttempted.value && _status.value !== 'syncing') {
        console.log('[useCloudSync] logged in + empty local → pull from cloud')
        _pullAttempted.value = true
        runPull()
      }
    })
  }

  return {
    status: _status,
    errorMessage: _errorMessage,
    retry
  }
}
