import { useProjectStore } from '~/stores/project'
import type {
  Project,
  PowerType,
  PowerAnswers,
  PowerAssessment,
  MarketSize,
  ProjectSector,
  ProjectStage,
  LocalProject,
  LocalPowerAssessment
} from '~/types/database'

/**
 * useProject — high-level façade for project state.
 *
 * Multi-project model (Phase 1.5+):
 *   - Anonymous users get a single local project in localStorage.
 *     (We keep the soft cap at 1 anon project for sync simplicity.)
 *   - Authenticated users can have N projects, synced to Supabase one-shot
 *     on login or project creation.
 *
 * Routes use `local_id` consistently (the URL doesn't change after sync).
 */
export function useProject() {
  const store = useProjectStore()
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  // ============================================================
  // Project lifecycle
  // ============================================================

  function createProject(input: {
    name: string
    sector: ProjectSector
    stage: ProjectStage
    description?: string
    market_size?: MarketSize
  }): string {
    return store.createLocalProject(input)
  }

  function switchProject(localId: string | null) {
    store.setCurrentProject(localId)
  }

  /**
   * Delete a project EVERYWHERE.
   *
   * 1. If the project was ever synced (we have its cloud uuid in
   *    cloudIdByLocalId), DELETE the cloud row first. RLS guarantees we
   *    can only delete our own. The FK cascade on power_assessments and
   *    coach_messages takes care of the children server-side.
   * 2. Then remove locally.
   *
   * Order matters: if we wiped local first and the cloud delete failed,
   * a sign-out → sign-in cycle would resurrect the row via fetchFromCloud
   * (which is exactly the bug the user reported). Doing cloud first +
   * throwing on failure ensures local and cloud stay in sync.
   */
  async function deleteProject(localId: string): Promise<void> {
    if (user.value) {
      const cloudId = store.cloudIdByLocalId[localId]
      if (cloudId) {
        console.log('[deleteProject] cloud delete for', cloudId)
        const { error } = await supabase
          .from('projects')
          .delete()
          .eq('id', cloudId)
        if (error) {
          console.error('[deleteProject] cloud delete failed:', error)
          throw error
        }
      }
    }
    store.deleteProject(localId)
  }

  function duplicateProject(sourceLocalId: string, newName: string): string {
    return store.duplicateProject(sourceLocalId, newName)
  }

  // ============================================================
  // Current-project mutations
  // ============================================================

  function updateMarketSize(market_size: MarketSize) {
    store.updateCurrentProject({ market_size })
  }

  function saveAssessment(power: PowerType, answers: PowerAnswers, score: number | null) {
    store.upsertAssessment(power, answers, score)
  }

  // ============================================================
  // Supabase sync
  // ============================================================

  /**
   * One-shot push of the CURRENT project + its assessments to Supabase.
   * Idempotent (skipped if already synced). Returns the Supabase id or null.
   */
  async function syncToCloud(): Promise<string | null> {
    if (!user.value) throw new Error('Not authenticated')
    const current = store.currentProject
    if (!current) {
      console.warn('[syncToCloud] no current project to push — skipping')
      return null
    }
    if (store.syncedLocalIds.includes(current.local_id)) {
      console.log('[syncToCloud] project already synced — skipping', current.local_id)
      return current.local_id
    }

    // Owner identity is derived server-side via the `user_id default auth.uid()`
    // column (see migration 0002_user_id_default_auth_uid.sql). Sending
    // user_id from the client was fragile: a stale useSupabaseUser cache,
    // a mid-flight session refresh, or unlinked auth providers (magic-link
    // vs Google OAuth for the same email creating two separate auth.users
    // rows) made client.user_id diverge from JWT.sub, and the RLS check
    // `with check (user_id = auth.uid())` rejected the INSERT with 42501.
    console.log('[syncToCloud] inserting project:', current.name)
    const { data: created, error: projectError } = await supabase
      .from('projects')
      .insert({
        name: current.name,
        sector: current.sector,
        stage: current.stage,
        description: current.description,
        market_size: current.market_size
      })
      .select('id')
      .single<Pick<Project, 'id'>>()

    if (projectError) {
      console.error('[syncToCloud] INSERT projects failed:', projectError)
      throw projectError
    }
    if (!created) {
      console.error('[syncToCloud] INSERT returned no row (likely RLS policy denied silently)')
      throw new Error('Insert returned no row — check RLS policy.')
    }
    console.log('[syncToCloud] project inserted, cloud id =', created.id)

    const assessmentRows = Object.values(store.currentAssessments)
      .filter((a): a is NonNullable<typeof a> => !!a)
      .map((a) => ({
        project_id: created.id,
        power: a.power,
        answers: a.answers,
        score: a.score,
        action_items: a.action_items
      }))

    if (assessmentRows.length > 0) {
      const { error: assessmentsError } = await supabase
        .from('power_assessments')
        .insert(assessmentRows)
      if (assessmentsError) throw assessmentsError
    }

    // Record the local→cloud id mapping so subsequent coach_messages pushes
    // can target the right FK without us re-querying Supabase.
    store.markSynced(current.local_id, created.id)
    return created.id
  }

  // ============================================================
  // Pull from cloud — used on login to restore the user's projects
  // when local storage is empty (eg. new browser, after a signOut)
  // ============================================================

  /**
   * Fetch the authenticated user's projects + power_assessments from Supabase
   * and load them into the Pinia store. Idempotent: re-running won't duplicate
   * because we key local_id by the Supabase UUID. Returns the number of
   * projects fetched.
   *
   * Strategy notes:
   * - Only called when local store is empty (avoid wiping in-progress local
   *   edits the user might want synced first).
   * - All fetched projects are marked as already-synced (they came from cloud).
   * - The most recently updated project becomes currentProjectId.
   */
  async function fetchFromCloud(): Promise<number> {
    if (!user.value) throw new Error('Not authenticated')

    // RLS handles owner filtering server-side via auth.uid() against the JWT.
    // Do NOT add an explicit .eq('user_id', user.value.id) here — that
    // proved fragile: if useSupabaseUser's cached value lags the actual
    // session JWT (token refresh in flight, multi-tab race, etc.), the
    // filter rejects ALL the user's own rows, leading to "my projects
    // disappeared!". The RLS policy is the source of truth for ownership.
    const { data: projects, error: pErr } = await supabase
      .from('projects')
      .select('id, name, sector, stage, description, market_size, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .returns<Pick<Project, 'id' | 'name' | 'sector' | 'stage' | 'description' | 'market_size' | 'created_at' | 'updated_at'>[]>()

    if (pErr) {
      console.error('[fetchFromCloud] projects query failed:', pErr)
      throw pErr
    }
    console.log('[fetchFromCloud] received', projects?.length ?? 0, 'project(s) from Supabase')
    if (!projects || projects.length === 0) return 0

    // Stable local_id derived from the Supabase UUID so re-fetching the same
    // project across devices ends up with the same key.
    function toLocalId(supabaseId: string): string {
      return `local-${supabaseId}`
    }

    const emptyAssessments = (): Record<PowerType, LocalPowerAssessment | undefined> => ({
      scale: undefined, network: undefined, counter: undefined,
      switching: undefined, branding: undefined, cornered: undefined, process: undefined
    })

    for (const p of projects) {
      const localId = toLocalId(p.id)

      const localProject: LocalProject = {
        local_id: localId,
        name: p.name,
        sector: p.sector,
        stage: p.stage,
        description: p.description,
        market_size: p.market_size ?? {},
        created_at: p.created_at,
        updated_at: p.updated_at
      }
      store.projects[localId] = localProject

      // Load this project's assessments.
      const { data: assessments, error: aErr } = await supabase
        .from('power_assessments')
        .select('id, project_id, power, answers, score, action_items, created_at, updated_at')
        .eq('project_id', p.id)
        .returns<PowerAssessment[]>()

      if (aErr) {
        console.warn('[fetchFromCloud] assessments fetch failed for project', p.id, aErr)
        store.assessmentsByProject[localId] = emptyAssessments()
        continue
      }

      const map = emptyAssessments()
      for (const a of assessments ?? []) {
        map[a.power] = {
          local_id: toLocalId(a.id),
          local_project_id: localId,
          power: a.power,
          answers: a.answers,
          score: a.score,
          action_items: a.action_items ?? [],
          created_at: a.created_at,
          updated_at: a.updated_at
        }
      }
      store.assessmentsByProject[localId] = map

      // Came from cloud → already synced. Capture the cloud id mapping
      // so coach-message pushes have the right FK.
      store.markSynced(localId, p.id)
    }

    // Most-recently-updated project becomes the active one.
    store.currentProjectId = toLocalId(projects[0].id)

    return projects.length
  }

  // ============================================================
  // Coach messages — push-only backup to Supabase
  // ============================================================

  /**
   * Push a batch of new coach messages to Supabase. No-op if:
   *   - user is not signed in
   *   - project is not synced (we have no cloud id to FK against)
   *   - messages array is empty
   *
   * Returns the count actually inserted (0 on no-op). Errors are logged
   * and re-thrown so the caller (useCoach) can decide whether to retry
   * later — we never block the UI on coach-message persistence.
   *
   * Scope: push-only. Pulling the cloud history back into the local
   * thread (multi-device continuity) is backlog — adds conflict-resolution
   * complexity (interleaved local + cloud edits) that we don't need yet.
   */
  async function pushCoachMessages(
    localProjectId: string,
    powerContext: PowerType | 'general',
    messages: Array<{ role: 'user' | 'assistant'; content: string; created_at: string }>
  ): Promise<number> {
    if (!user.value) return 0
    if (messages.length === 0) return 0
    const cloudId = store.cloudIdByLocalId[localProjectId]
    if (!cloudId) return 0

    const rows = messages.map((m) => ({
      project_id: cloudId,
      // power_context is NULL for general / hub conversations.
      power_context: powerContext === 'general' ? null : powerContext,
      role: m.role,
      content: m.content,
      created_at: m.created_at
    }))

    const { error: insertError } = await supabase
      .from('coach_messages')
      .insert(rows)

    if (insertError) {
      console.warn('[pushCoachMessages] failed:', insertError)
      throw insertError
    }
    return rows.length
  }

  return {
    // state — single project
    currentProject: computed(() => store.currentProject),
    assessments: computed(() => store.currentAssessments),
    hasProject: computed(() => store.hasCurrentProject),
    topPowers: computed(() => store.topPowers),
    completedPowers: computed(() => store.completedPowers),
    syncedToCloud: computed(() => store.isCurrentProjectSynced),

    // state — multi-project
    projectList: computed(() => store.projectList),
    hasAnyProject: computed(() => store.hasAnyProject),
    projectCount: computed(() => store.projectCount),
    syncedLocalIds: computed(() => store.syncedLocalIds),

    // actions
    createProject,
    switchProject,
    deleteProject,
    duplicateProject,
    updateMarketSize,
    saveAssessment,
    syncToCloud,
    fetchFromCloud,
    pushCoachMessages,
    reset: () => store.reset()
  }
}
