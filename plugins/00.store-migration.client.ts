/**
 * One-shot localStorage migration: store schema v1 → v2.
 *
 * v1 (single-project): { currentProject, assessments, syncedToCloud, syncedProjectId }
 *                      stored under key `sevenpowers:project`
 *
 * v2 (multi-project):  { projects, assessmentsByProject, currentProjectId, syncedLocalIds }
 *                      stored under key `sevenpowers:project:v2`
 *
 * Runs BEFORE the Pinia store hydrates (plugin filename prefix `00.` =
 * alphabetically first). Idempotent: if v2 already exists, no-op.
 */

const V1_KEY = 'sevenpowers:project'
const V2_KEY = 'sevenpowers:project:v2'

export default defineNuxtPlugin(() => {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(V2_KEY)) return

  const oldRaw = localStorage.getItem(V1_KEY)
  if (!oldRaw) return

  try {
    const old = JSON.parse(oldRaw) as {
      currentProject?: { local_id: string } & Record<string, unknown>
      assessments?: Record<string, unknown>
      syncedToCloud?: boolean
      syncedProjectId?: string | null
    }

    if (!old.currentProject?.local_id) {
      // Old shape but empty → just discard.
      localStorage.removeItem(V1_KEY)
      return
    }

    const id = old.currentProject.local_id
    const v2 = {
      projects: { [id]: old.currentProject },
      assessmentsByProject: { [id]: old.assessments ?? {} },
      currentProjectId: id,
      syncedLocalIds: old.syncedToCloud ? [id] : []
    }

    localStorage.setItem(V2_KEY, JSON.stringify(v2))
    localStorage.removeItem(V1_KEY)
    // eslint-disable-next-line no-console
    console.log('[migration] sevenpowers:project v1 → v2 migrated')
  } catch (e) {
    console.error('[migration] failed to migrate v1 → v2:', e)
    // Don't delete the v1 key on failure — preserve data for manual recovery.
  }
})
