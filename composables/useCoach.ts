import type { PowerType, LocalPowerAssessment } from '~/types/database'
import type { PowerContext, CoachLocalMessage } from '~/stores/coach'
import type { CoachProjectContext } from '~/server/utils/prompts'

/**
 * useCoach — wraps the SSE streaming consumption from /api/coach.
 *
 * Scoped to the (currentProject, powerContext) pair. Re-mount the component
 * (or just call switchContext) when the user navigates between modules.
 */
export function useCoach(powerContext: Ref<PowerContext>) {
  const { t, locale } = useI18n()
  const store = useCoachStore()
  const { currentProject, assessments } = useProject()

  const isStreaming = ref(false)
  const errorMessage = ref<string | null>(null)
  // Token usage from the most recent assistant response — surfaced in the UI
  // footer so power users can see how expensive their conversations are.
  const lastUsage = ref<{ input_tokens?: number; output_tokens?: number } | null>(null)
  // AbortController for the in-flight fetch. Kept in module scope of this
  // composable invocation so the "Stop generating" button can call .abort()
  // without prop-drilling.
  let activeController: AbortController | null = null

  const messages = computed<CoachLocalMessage[]>(() => {
    if (!currentProject.value) return []
    return store.getThread(currentProject.value.local_id, powerContext.value)
  })

  function buildProjectContext(): CoachProjectContext | null {
    const p = currentProject.value
    if (!p) return null
    const ass = assessments.value
    const assessmentsArr = (Object.values(ass) as (LocalPowerAssessment | undefined)[])
      .filter((a): a is LocalPowerAssessment => !!a && typeof a.score === 'number')
      .map((a) => ({
        power: a.power,
        score: a.score,
        answers: a.answers,
        action_items: a.action_items
      }))
    return {
      name: p.name,
      sector: p.sector,
      stage: p.stage,
      description: p.description,
      market_size: p.market_size,
      assessments: assessmentsArr
    }
  }

  async function sendMessage(userText: string) {
    const trimmed = userText.trim()
    if (!trimmed || isStreaming.value) return
    const project = currentProject.value
    if (!project) return

    errorMessage.value = null

    // 1) Append the user message immediately for snappy UI.
    const userMsg: CoachLocalMessage = {
      id: `local-${crypto.randomUUID()}`,
      role: 'user',
      content: trimmed,
      created_at: new Date().toISOString()
    }
    store.appendMessage(project.local_id, powerContext.value, userMsg)

    // 2) Append an empty assistant message — we'll grow it as tokens stream in.
    const assistantMsg: CoachLocalMessage = {
      id: `local-${crypto.randomUUID()}`,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString()
    }
    store.appendMessage(project.local_id, powerContext.value, assistantMsg)

    isStreaming.value = true
    try {
      const projectContext = buildProjectContext()
      if (!projectContext) throw new Error('No current project')

      const payload = {
        project: projectContext,
        powerContext: powerContext.value === 'general' ? null : powerContext.value,
        locale: (locale.value as 'fr' | 'en') ?? 'fr',
        // Include the full thread (user/assistant pairs) for multi-turn context.
        // Excludes the empty assistant placeholder we just added.
        messages: store
          .getThread(project.local_id, powerContext.value)
          .slice(0, -1)
          .map((m) => ({ role: m.role, content: m.content }))
      }

      // Hook up an AbortController so the UI can interrupt streaming
      // ("Stop generating" button). If a previous stream is somehow still
      // referenced, abort it defensively before starting a new one.
      activeController?.abort()
      activeController = new AbortController()

      const response = await fetch('/api/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: activeController.signal
      })

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => '')
        throw new Error(`Coach API ${response.status}: ${text || response.statusText}`)
      }

      // ---- SSE parsing ----
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE events are separated by a blank line (\n\n).
        let sep: number
        while ((sep = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, sep)
          buffer = buffer.slice(sep + 2)

          const lines = chunk.split('\n')
          let eventName = 'message'
          let dataLine = ''
          for (const line of lines) {
            if (line.startsWith('event: ')) eventName = line.slice(7).trim()
            else if (line.startsWith('data: ')) dataLine = line.slice(6)
          }
          if (!dataLine) continue

          let parsed: { text?: string; message?: string }
          try {
            parsed = JSON.parse(dataLine)
          } catch {
            continue
          }

          if (eventName === 'token' && typeof parsed.text === 'string') {
            store.appendChunkToLast(project.local_id, powerContext.value, parsed.text)
          } else if (eventName === 'error') {
            errorMessage.value = parsed.message ?? t('coach.errors.generic')
            break
          } else if (eventName === 'done') {
            // Stream finished cleanly. The server side emits the Anthropic
            // `usage` block here (see server/api/coach.post.ts), so we
            // can surface input/output token counts in the UI.
            const u = (parsed as { usage?: { input_tokens?: number; output_tokens?: number } }).usage
            if (u) lastUsage.value = u
          }
        }
      }
    } catch (e) {
      // User-initiated abort is NOT an error worth surfacing. Anything
      // else (network, parse, server error) is.
      if (e instanceof Error && e.name === 'AbortError') {
        // Trim the trailing space the assistant might have just written
        // so the final visible message looks intentional.
      } else {
        errorMessage.value = e instanceof Error ? e.message : t('coach.errors.generic')
      }
    } finally {
      isStreaming.value = false
      activeController = null
    }
  }

  /** Interrupt the in-flight stream, if any. */
  function abortStream() {
    activeController?.abort()
  }

  function clearThread() {
    if (!currentProject.value) return
    store.clearThread(currentProject.value.local_id, powerContext.value)
    errorMessage.value = null
  }

  return {
    messages,
    isStreaming: readonly(isStreaming),
    errorMessage: readonly(errorMessage),
    lastUsage: readonly(lastUsage),
    sendMessage,
    abortStream,
    clearThread
  }
}
