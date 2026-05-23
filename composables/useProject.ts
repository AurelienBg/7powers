import { useProjectStore } from '~/stores/project'
import type {
  Project,
  PowerType,
  PowerAnswers,
  ProjectSector,
  ProjectStage,
  MarketSize
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
    if (!current) return null
    if (store.syncedLocalIds.includes(current.local_id)) return current.local_id

    const { data: created, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.value.id,
        name: current.name,
        sector: current.sector,
        stage: current.stage,
        description: current.description,
        market_size: current.market_size
      })
      .select('id')
      .single<Pick<Project, 'id'>>()

    if (projectError || !created) throw projectError ?? new Error('Failed to create project')

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
    updateMarketSize,
    saveAssessment,
    syncToCloud,
    reset: () => store.reset()
  }
}
