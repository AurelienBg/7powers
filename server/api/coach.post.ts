/**
 * Coach IA streaming endpoint.
 *
 * Input (JSON body):
 *   {
 *     project: CoachProjectContext,  // name, sector, stage, market, assessments
 *     powerContext?: PowerType,       // which Power module the founder is on
 *     locale: 'fr' | 'en',
 *     messages: { role: 'user'|'assistant', content: string }[]  // full history
 *   }
 *
 * Output: Server-Sent Events stream.
 *   - event: token, data: { text: "..." }   ← text deltas
 *   - event: done,  data: {}                ← end of stream
 *   - event: error, data: { message }       ← fatal error
 *
 * The system prompt is built server-side from the project context (never
 * trust client-passed system prompts). Anthropic API key never crosses
 * the wire to the client.
 */

import Anthropic from '@anthropic-ai/sdk'
import type { CoachProjectContext } from '../utils/prompts'
import type { PowerType } from '~/types/database'

interface CoachRequestBody {
  project: CoachProjectContext
  powerContext?: PowerType | null
  locale: 'fr' | 'en'
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  if (!config.anthropicApiKey) {
    setResponseStatus(event, 500)
    return { error: 'ANTHROPIC_API_KEY not configured on this deployment.' }
  }

  // ---------- Validate input ----------
  const body = await readBody<CoachRequestBody>(event).catch(() => null)
  if (!body || !body.project || !Array.isArray(body.messages)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid request body. Expected { project, messages, locale }.' }
  }

  if (body.messages.length === 0) {
    setResponseStatus(event, 400)
    return { error: 'messages must contain at least one entry.' }
  }

  if (body.messages.length > 40) {
    setResponseStatus(event, 400)
    return { error: 'Conversation too long. Max 40 messages per request.' }
  }

  // Sanity-check shapes — the founder sends arbitrary JSON, we don't trust it.
  for (const m of body.messages) {
    if (m.role !== 'user' && m.role !== 'assistant') {
      setResponseStatus(event, 400)
      return { error: `Invalid message role: ${m.role}` }
    }
    if (typeof m.content !== 'string' || m.content.length === 0) {
      setResponseStatus(event, 400)
      return { error: 'Each message must have a non-empty string content.' }
    }
    if (m.content.length > 8000) {
      setResponseStatus(event, 400)
      return { error: 'Single message too long. Max 8000 chars.' }
    }
  }

  // ---------- Build system prompt ----------
  const systemPrompt = buildCoachSystemPrompt({
    project: body.project,
    powerContext: body.powerContext ?? null,
    locale: body.locale ?? 'fr'
  })

  // ---------- Anthropic streaming ----------
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })

  // SSE headers
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache, no-transform')
  setHeader(event, 'Connection', 'keep-alive')
  // Vercel-specific: disable function-level response buffering so deltas flush
  // to the client as they arrive.
  setHeader(event, 'X-Accel-Buffering', 'no')

  const res = event.node.res

  function sendSseEvent(name: string, data: unknown) {
    res.write(`event: ${name}\n`)
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  try {
    const stream = anthropic.messages.stream({
      model: config.anthropicModel as string,
      max_tokens: 1024,
      system: systemPrompt,
      messages: body.messages
    })

    for await (const ev of stream) {
      if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
        sendSseEvent('token', { text: ev.delta.text })
      }
    }

    const finalMessage = await stream.finalMessage()
    sendSseEvent('done', {
      usage: finalMessage.usage,
      stop_reason: finalMessage.stop_reason
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown Anthropic error'
    sendSseEvent('error', { message })
  } finally {
    res.end()
  }
})
