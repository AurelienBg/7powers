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

  function deleteProject(localId: string) {
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

    store.markSynced(current.local_id)
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

    // Belt + suspenders: RLS already filters by user_id, but adding the
    // explicit `.eq` here means a misconfigured policy can't silently
    // return another user's projects.
    const { data: projects, error: pErr } = await supabase
      .from('projects')
      .select('id, name, sector, stage, description, market_size, created_at, updated_at')
      .eq('user_id', user.value.id)
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

      // Came from cloud → already synced.
      store.markSynced(localId)
    }

    // Most-recently-updated project becomes the active one.
    store.currentProjectId = toLocalId(projects[0].id)

    return projects.length
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
    reset: () => store.reset()
  }
}
