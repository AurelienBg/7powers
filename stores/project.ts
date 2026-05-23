import { defineStore } from 'pinia'
import type {
  LocalProject,
  LocalPowerAssessment,
  PowerType,
  PowerAnswers,
  ActionItem,
  MarketSize,
  ProjectSector,
  ProjectStage
} from '~/types/database'

interface ProjectState {
  // Single active project for v1. Multi-project support comes later
  // (dashboard module, post-Phase 1).
  currentProject: LocalProject | null
  assessments: Record<PowerType, LocalPowerAssessment | undefined>
  // Track whether the user has logged in and pushed their local data to Supabase.
  syncedToCloud: boolean
  syncedProjectId: string | null
}

const emptyAssessments = (): Record<PowerType, LocalPowerAssessment | undefined> => ({
  scale: undefined,
  network: undefined,
  counter: undefined,
  switching: undefined,
  branding: undefined,
  cornered: undefined,
  process: undefined
})

export const useProjectStore = defineStore('project', {
  state: (): ProjectState => ({
    currentProject: null,
    assessments: emptyAssessments(),
    syncedToCloud: false,
    syncedProjectId: null
  }),

  getters: {
    hasProject: (state) => state.currentProject !== null,

    completedPowers: (state): PowerType[] => {
      return (Object.entries(state.assessments) as [PowerType, LocalPowerAssessment | undefined][])
        .filter(([, a]) => a && typeof a.score === 'number')
        .map(([k]) => k)
    },

    topPowers: (state) => {
      const scored = (
        Object.entries(state.assessments) as [PowerType, LocalPowerAssessment | undefined][]
      )
        .map(([k, a]) => ({ power: k, score: a?.score ?? null }))
        .filter((x): x is { power: PowerType; score: number } => typeof x.score === 'number')
        .sort((a, b) => b.score - a.score)
      return scored.slice(0, 3)
    }
  },

  actions: {
    createLocalProject(input: {
      name: string
      sector: ProjectSector
      stage: ProjectStage
      description?: string
      market_size?: MarketSize
    }) {
      const now = new Date().toISOString()
      this.currentProject = {
        local_id: `local-${crypto.randomUUID()}`,
        name: input.name,
        sector: input.sector,
        stage: input.stage,
        description: input.description ?? null,
        market_size: input.market_size ?? {},
        created_at: now,
        updated_at: now
      }
      this.assessments = emptyAssessments()
      this.syncedToCloud = false
      this.syncedProjectId = null
    },

    updateProject(patch: Partial<Omit<LocalProject, 'local_id' | 'created_at'>>) {
      if (!this.currentProject) return
      this.currentProject = {
        ...this.currentProject,
        ...patch,
        updated_at: new Date().toISOString()
      }
    },

    upsertAssessment(power: PowerType, answers: PowerAnswers, score: number | null) {
      const now = new Date().toISOString()
      const existing = this.assessments[power]
      this.assessments[power] = {
        local_id: existing?.local_id ?? `local-${crypto.randomUUID()}`,
        local_project_id: this.currentProject?.local_id ?? '',
        power,
        answers,
        score,
        action_items: existing?.action_items ?? [],
        created_at: existing?.created_at ?? now,
        updated_at: now
      }
    },

    setActionItems(power: PowerType, items: ActionItem[]) {
      const existing = this.assessments[power]
      if (!existing) return
      this.assessments[power] = {
        ...existing,
        action_items: items,
        updated_at: new Date().toISOString()
      }
    },

    reset() {
      this.currentProject = null
      this.assessments = emptyAssessments()
      this.syncedToCloud = false
      this.syncedProjectId = null
    },

    markSynced(supabaseProjectId: string) {
      this.syncedToCloud = true
      this.syncedProjectId = supabaseProjectId
    }
  },

  // Persist local-first state to localStorage so the user can leave + come back
  // without logging in. pinia-plugin-persistedstate/nuxt is wired in nuxt.config.ts.
  persist: {
    key: 'sevenpowers:project',
    pick: ['currentProject', 'assessments', 'syncedToCloud', 'syncedProjectId']
  }
})
