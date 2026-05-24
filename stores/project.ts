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

/**
 * Multi-project store (schema v2).
 *
 * Anonymous mode: in practice we cap at 1 local project (Phase 1.5 design
 * decision — N anon projects adds sync ambiguity for low value). Authenticated
 * mode supports N projects, each with its own assessments. Migration from
 * v1 (single-project) shape is handled by plugins/00.store-migration.client.ts.
 *
 * IDs are stable local_ids (`local-<uuid>`) used in URLs. When a project is
 * synced to Supabase, its local_id is added to `syncedLocalIds` — we don't
 * track the Supabase UUID separately in Phase 1.5 (full bidirectional sync
 * is Phase 2+).
 */

type AssessmentMap = Record<PowerType, LocalPowerAssessment | undefined>

interface ProjectState {
  projects: Record<string, LocalProject>
  assessmentsByProject: Record<string, AssessmentMap>
  currentProjectId: string | null
  syncedLocalIds: string[]
}

const emptyAssessments = (): AssessmentMap => ({
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
    projects: {},
    assessmentsByProject: {},
    currentProjectId: null,
    syncedLocalIds: []
  }),

  getters: {
    projectList: (state): LocalProject[] => {
      return Object.values(state.projects).sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
    },

    currentProject: (state): LocalProject | null => {
      if (!state.currentProjectId) return null
      return state.projects[state.currentProjectId] ?? null
    },

    currentAssessments(state): AssessmentMap {
      if (!state.currentProjectId) return emptyAssessments()
      return state.assessmentsByProject[state.currentProjectId] ?? emptyAssessments()
    },

    hasAnyProject: (state): boolean => Object.keys(state.projects).length > 0,

    hasCurrentProject(): boolean {
      return this.currentProject !== null
    },

    projectCount: (state): number => Object.keys(state.projects).length,

    isCurrentProjectSynced(state): boolean {
      return state.currentProjectId
        ? state.syncedLocalIds.includes(state.currentProjectId)
        : false
    },

    completedPowers(): PowerType[] {
      return (Object.entries(this.currentAssessments) as [PowerType, LocalPowerAssessment | undefined][])
        .filter(([, a]) => a && typeof a.score === 'number')
        .map(([k]) => k)
    },

    topPowers(): { power: PowerType; score: number }[] {
      const scored = (Object.entries(this.currentAssessments) as [PowerType, LocalPowerAssessment | undefined][])
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
    }): string {
      const now = new Date().toISOString()
      const localId = `local-${crypto.randomUUID()}`
      this.projects[localId] = {
        local_id: localId,
        name: input.name,
        sector: input.sector,
        stage: input.stage,
        description: input.description ?? null,
        market_size: input.market_size ?? {},
        created_at: now,
        updated_at: now
      }
      this.assessmentsByProject[localId] = emptyAssessments()
      this.currentProjectId = localId
      return localId
    },

    setCurrentProject(localId: string | null) {
      if (localId === null || this.projects[localId]) {
        this.currentProjectId = localId
      }
    },

    deleteProject(localId: string) {
      delete this.projects[localId]
      delete this.assessmentsByProject[localId]
      this.syncedLocalIds = this.syncedLocalIds.filter((id) => id !== localId)
      if (this.currentProjectId === localId) {
        // Pick the next most-recently-updated project, or null if none left.
        const remaining = this.projectList
        this.currentProjectId = remaining[0]?.local_id ?? null
      }
    },

    /**
     * Clone an existing project + its assessments under a fresh local_id.
     * The new project becomes the current one. Returns the new id.
     * Caller provides the new name (typically `${source.name} (copy)` localized).
     */
    duplicateProject(sourceLocalId: string, newName: string): string {
      const source = this.projects[sourceLocalId]
      if (!source) return ''
      const newId = `local-${crypto.randomUUID()}`
      const now = new Date().toISOString()
      this.projects[newId] = {
        ...source,
        local_id: newId,
        name: newName,
        created_at: now,
        updated_at: now
      }
      const sourceAssessments = this.assessmentsByProject[sourceLocalId] ?? emptyAssessments()
      const cloned = emptyAssessments()
      for (const [power, a] of Object.entries(sourceAssessments) as [
        PowerType,
        LocalPowerAssessment | undefined
      ][]) {
        if (!a) continue
        cloned[power] = {
          ...a,
          local_id: `local-${crypto.randomUUID()}`,
          local_project_id: newId,
          created_at: now,
          updated_at: now
        }
      }
      this.assessmentsByProject[newId] = cloned
      // Duplicate is never synced by default (it's a fresh local entity).
      this.currentProjectId = newId
      return newId
    },

    updateCurrentProject(patch: Partial<Omit<LocalProject, 'local_id' | 'created_at'>>) {
      if (!this.currentProjectId) return
      const existing = this.projects[this.currentProjectId]
      if (!existing) return
      this.projects[this.currentProjectId] = {
        ...existing,
        ...patch,
        updated_at: new Date().toISOString()
      }
    },

    upsertAssessment(power: PowerType, answers: PowerAnswers, score: number | null) {
      if (!this.currentProjectId) return
      if (!this.assessmentsByProject[this.currentProjectId]) {
        this.assessmentsByProject[this.currentProjectId] = emptyAssessments()
      }
      const map = this.assessmentsByProject[this.currentProjectId]
      const existing = map[power]
      const now = new Date().toISOString()
      map[power] = {
        local_id: existing?.local_id ?? `local-${crypto.randomUUID()}`,
        local_project_id: this.currentProjectId,
        power,
        answers,
        score,
        action_items: existing?.action_items ?? [],
        created_at: existing?.created_at ?? now,
        updated_at: now
      }
    },

    setActionItems(power: PowerType, items: ActionItem[]) {
      if (!this.currentProjectId) return
      const map = this.assessmentsByProject[this.currentProjectId]
      if (!map) return
      const existing = map[power]
      if (!existing) return
      map[power] = {
        ...existing,
        action_items: items,
        updated_at: new Date().toISOString()
      }
    },

    markSynced(localId: string) {
      if (!this.syncedLocalIds.includes(localId)) {
        this.syncedLocalIds.push(localId)
      }
    },

    reset() {
      this.projects = {}
      this.assessmentsByProject = {}
      this.currentProjectId = null
      this.syncedLocalIds = []
    }
  },

  persist: {
    key: 'sevenpowers:project:v2',
    pick: ['projects', 'assessmentsByProject', 'currentProjectId', 'syncedLocalIds']
  }
})
