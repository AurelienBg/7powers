import { defineStore } from 'pinia'
import type { PowerType } from '~/types/database'

/**
 * Coach message store — local-first, persisted to localStorage.
 *
 * Threads are scoped by (projectId, powerContext). Each Power module gets its
 * own conversation; the hub + market pages share a 'general' thread. This
 * keeps Helmer's "module-aware coach" rule (per CLAUDE.md) clean: when the
 * founder works on Scale Economies, they don't see ghost messages from a
 * previous Branding session.
 *
 * When the user logs in we could later sync these to public.coach_messages
 * in Supabase (already in the schema). For Phase 1.5, local-only.
 */

export type PowerContext = PowerType | 'general'

export interface CoachLocalMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

type ThreadKey = string // `${projectLocalId}::${powerContext}`

interface CoachState {
  threads: Record<ThreadKey, CoachLocalMessage[]>
}

function threadKey(projectLocalId: string, ctx: PowerContext): ThreadKey {
  return `${projectLocalId}::${ctx}`
}

export const useCoachStore = defineStore('coach', {
  state: (): CoachState => ({
    threads: {}
  }),

  getters: {
    getThread:
      (state) =>
      (projectLocalId: string, ctx: PowerContext): CoachLocalMessage[] => {
        return state.threads[threadKey(projectLocalId, ctx)] ?? []
      }
  },

  actions: {
    appendMessage(
      projectLocalId: string,
      ctx: PowerContext,
      message: CoachLocalMessage
    ) {
      const key = threadKey(projectLocalId, ctx)
      if (!this.threads[key]) this.threads[key] = []
      this.threads[key].push(message)
    },

    /**
     * Append a chunk to the last assistant message in the thread.
     * Used during streaming — we mutate the same message object in place
     * so Vue reactivity picks up each delta.
     */
    appendChunkToLast(projectLocalId: string, ctx: PowerContext, chunk: string) {
      const key = threadKey(projectLocalId, ctx)
      const thread = this.threads[key]
      if (!thread || thread.length === 0) return
      const last = thread[thread.length - 1]
      if (last.role !== 'assistant') return
      last.content += chunk
    },

    clearThread(projectLocalId: string, ctx: PowerContext) {
      delete this.threads[threadKey(projectLocalId, ctx)]
    },

    clearAllForProject(projectLocalId: string) {
      for (const k of Object.keys(this.threads)) {
        if (k.startsWith(`${projectLocalId}::`)) {
          delete this.threads[k]
        }
      }
    }
  },

  persist: {
    key: 'sevenpowers:coach:v1',
    pick: ['threads']
  }
})
