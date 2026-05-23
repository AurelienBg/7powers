import { useProjectStore } from '~/stores/project'
import type {
  Project,
  PowerAssessment,
  PowerType,
  PowerAnswers,
  ProjectSector,
  ProjectStage,
  MarketSize
} from '~/types/database'

/**
 * useProject — high-level façade for project state.
 *
 * Gameframe-style local-first model:
 *   - Anonymous users get a project in localStorage (via Pinia + persistedstate).
 *   - On login, we push the local project up to Supabase and mark it synced.
 *   - Subsequent mutations go to both stores until full Supabase migration is done
 *     (post-Phase 1; for now we only handle the initial upload).
 */
export function useProject() {
  const store = useProjectStore()
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  function createProject(input: {
    name: string
    sector: ProjectSector
    stage: ProjectStage
    description?: string
    market_size?: MarketSize
  }) {
    store.createLocalProject(input)
  }

  function updateMarketSize(market_size: MarketSize) {
    store.updateProject({ market_size })
  }

  function saveAssessment(power: PowerType, answers: PowerAnswers, score: number | null) {
    store.upsertAssessment(power, answers, score)
  }

  /**
   * Push the current local project + assessments to Supabase.
   * Called manually after the user logs in.
   * Returns the newly created Supabase project id (or the existing one if already synced).
   */
  async function syncToCloud(): Promise<string | null> {
    if (!user.value) throw new Error('Not authenticated')
    if (!store.currentProject) return null
    if (store.syncedToCloud && store.syncedProjectId) return store.syncedProjectId

    const local = store.currentProject

    const { data: created, error: projectError } = await supabase
      .from('projects')
      .insert({
        user_id: user.value.id,
        name: local.name,
        sector: local.sector,
        stage: local.stage,
        description: local.description,
        market_size: local.market_size
      })
      .select('id')
      .single<Pick<Project, 'id'>>()

    if (projectError || !created) {
      throw projectError ?? new Error('Failed to create project')
    }

    const assessmentRows = Object.values(store.assessments)
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

    store.markSynced(created.id)
    return created.id
  }

  return {
    // state
    currentProject: computed(() => store.currentProject),
    assessments: computed(() => store.assessments),
    syncedToCloud: computed(() => store.syncedToCloud),
    hasProject: computed(() => store.hasProject),
    topPowers: computed(() => store.topPowers),
    completedPowers: computed(() => store.completedPowers),
    // actions
    createProject,
    updateMarketSize,
    saveAssessment,
    syncToCloud,
    reset: () => store.reset()
  }
}
