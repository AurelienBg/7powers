/**
 * URL → Module 0 prefill endpoint.
 *
 * Input (JSON body):  { url: string, locale?: 'fr' | 'en' }
 * Output (JSON):      {
 *   name: string,
 *   sector: 'defi' | 'ai' | 'saas' | 'web3-other' | null,
 *   stage:  'origination' | 'takeoff' | 'stability'  | null,
 *   description: string | null,
 *   finalUrl: string   // after redirects, for transparency
 * }
 *
 * Pipeline:
 *   1. Validate URL — http(s) only, refuse obvious SSRF targets.
 *   2. Fetch with 10s timeout + 500KB body cap.
 *   3. Strip HTML to plain text (remove scripts/styles, then tags),
 *      truncate to ~25KB.
 *   4. Call Claude with a forced tool-use (`record_project_info`) so the
 *      output is structured JSON, not free text.
 *   5. Validate enums against ProjectSector / ProjectStage and pass through.
 *
 * Not a long-running endpoint — completes in ~3-5s including Claude.
 * No streaming needed (single small JSON response).
 */

import Anthropic from '@anthropic-ai/sdk'
import { buildUrlImportSystemPrompt, URL_IMPORT_TOOL_SCHEMA } from '../utils/prompts'
import type { ProjectSector, ProjectStage } from '~/types/database'

// ---------- Types ----------

interface ImportUrlBody {
  url?: unknown
  locale?: unknown
}

interface ImportUrlResponse {
  name: string
  sector: ProjectSector | null
  stage: ProjectStage | null
  description: string | null
  finalUrl: string
}

const VALID_SECTORS: ReadonlyArray<ProjectSector> = ['defi', 'ai', 'saas', 'web3-other']
const VALID_STAGES: ReadonlyArray<ProjectStage> = ['origination', 'takeoff', 'stability']

// Anything that resolves to these hosts is rejected outright. Not a
// complete SSRF defense (real one would resolve DNS and check the IP) but
// stops the common foot-gun cases.
const BLOCKED_HOST_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^::1$/,
  /^\[::1\]$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^fe80::/i,
  /\.internal$/i,
  /\.local$/i
]

// ---------- Helpers ----------

function validateUrl(raw: unknown): { ok: true; url: URL } | { ok: false; error: string } {
  if (typeof raw !== 'string') return { ok: false, error: 'url must be a string' }
  const trimmed = raw.trim()
  if (trimmed.length === 0) return { ok: false, error: 'url is empty' }
  if (trimmed.length > 2048) return { ok: false, error: 'url too long' }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { ok: false, error: 'invalid URL syntax' }
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, error: 'only http(s) URLs are accepted' }
  }
  const host = parsed.hostname
  for (const pattern of BLOCKED_HOST_PATTERNS) {
    if (pattern.test(host)) {
      return { ok: false, error: 'this host is not accessible from the importer' }
    }
  }
  return { ok: true, url: parsed }
}

/**
 * Fetch a URL with a 10s timeout and a 500KB body cap. Honors a single
 * redirect chain (handled by undici/fetch natively, max ~20). Returns
 * the final URL (after redirects), the body as text, and the content-type.
 */
async function fetchPage(url: URL): Promise<{ finalUrl: string; body: string }> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10_000)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        // Many sites serve a different (and shorter) HTML to unknown user
        // agents. A standard desktop UA gets us reliable, full content.
        'User-Agent':
          'Mozilla/5.0 (compatible; 7Powers-URLImport/1.0; +https://7powers.vercel.app)',
        Accept: 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9,fr;q=0.8'
      },
      redirect: 'follow',
      signal: controller.signal
    })
  } catch (e) {
    clearTimeout(timeoutId)
    const msg = e instanceof Error ? e.message : 'fetch failed'
    if (msg.includes('aborted')) {
      throw new Error('Fetching the URL timed out after 10s.')
    }
    throw new Error(`Could not fetch the URL: ${msg}`)
  }
  clearTimeout(timeoutId)

  if (!res.ok) {
    throw new Error(`The site responded with HTTP ${res.status}.`)
  }
  // Re-validate the final URL after redirects — a 30x could have bounced
  // us into a blocked-host range.
  let finalUrl = res.url || url.toString()
  try {
    const finalParsed = new URL(finalUrl)
    for (const pattern of BLOCKED_HOST_PATTERNS) {
      if (pattern.test(finalParsed.hostname)) {
        throw new Error('redirect landed on a blocked host')
      }
    }
  } catch (e) {
    throw e instanceof Error ? e : new Error('invalid final URL')
  }

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.toLowerCase().includes('html') && !contentType.toLowerCase().includes('text')) {
    throw new Error(`Unsupported content-type: ${contentType || 'unknown'}`)
  }

  // Read body with a hard 500KB cap. We stream-decode to avoid pulling a
  // huge file fully into memory if the server lies about Content-Length.
  const MAX_BYTES = 500_000
  if (!res.body) throw new Error('empty response body')
  const reader = res.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let total = 0
  let body = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.length
    if (total > MAX_BYTES) {
      try {
        await reader.cancel()
      } catch {
        /* swallow */
      }
      break
    }
    body += decoder.decode(value, { stream: true })
  }
  body += decoder.decode()
  if (body.length === 0) throw new Error('empty body')

  return { finalUrl, body }
}

/**
 * Strip HTML to plain text. Naive but dependency-free:
 *   1. Remove <script>, <style>, <noscript>, <svg>, <iframe> blocks
 *      (their content is never useful and often huge).
 *   2. Optionally keep <title> + <meta description> (we surface them
 *      explicitly at the top of the output).
 *   3. Replace remaining tags with whitespace.
 *   4. Decode common HTML entities.
 *   5. Collapse whitespace.
 *   6. Truncate to MAX_CHARS.
 */
function htmlToText(html: string): string {
  const MAX_CHARS = 25_000

  // Pull out metadata first so it survives the strip.
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i)
  const metaDescMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  )
  const ogDescMatch = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i
  )

  // Index 1 is the first capture group. With noUncheckedIndexedAccess we
  // narrow via ?? '' to satisfy strict TS without changing behavior.
  const metaBlock = [
    titleMatch ? `TITLE: ${(titleMatch[1] ?? '').trim()}` : '',
    metaDescMatch ? `META DESCRIPTION: ${(metaDescMatch[1] ?? '').trim()}` : '',
    ogDescMatch ? `OG DESCRIPTION: ${(ogDescMatch[1] ?? '').trim()}` : ''
  ]
    .filter(Boolean)
    .join('\n')

  // Strip noisy blocks.
  let body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')

  // Decode the most common entities. Full decoding would need a dep; we
  // catch the handful that show up in marketing copy.
  body = body
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&mdash;/g, '—')
    .replace(/&ndash;/g, '–')
    .replace(/&hellip;/g, '…')
    .replace(/&[a-z]+;/gi, ' ')

  // Collapse whitespace.
  body = body.replace(/\s+/g, ' ').trim()

  const full = metaBlock ? `${metaBlock}\n\nBODY: ${body}` : body
  return full.length > MAX_CHARS ? `${full.slice(0, MAX_CHARS)}…[truncated]` : full
}

// ---------- Handler ----------

export default defineEventHandler(async (event): Promise<ImportUrlResponse | { error: string }> => {
  const config = useRuntimeConfig()
  if (!config.anthropicApiKey) {
    setResponseStatus(event, 500)
    return { error: 'ANTHROPIC_API_KEY not configured on this deployment.' }
  }

  // ---- Validate body ----
  const body = await readBody<ImportUrlBody>(event).catch(() => null)
  if (!body) {
    setResponseStatus(event, 400)
    return { error: 'Invalid request body. Expected { url, locale? }.' }
  }
  const urlCheck = validateUrl(body.url)
  if (!urlCheck.ok) {
    setResponseStatus(event, 400)
    return { error: urlCheck.error }
  }
  const locale: 'fr' | 'en' = body.locale === 'en' ? 'en' : 'fr'

  // ---- Fetch + strip ----
  let fetched: { finalUrl: string; body: string }
  try {
    fetched = await fetchPage(urlCheck.url)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'fetch failed'
    setResponseStatus(event, 502)
    return { error: msg }
  }
  const text = htmlToText(fetched.body)
  if (text.length < 50) {
    setResponseStatus(event, 422)
    return {
      error:
        'The page seems to have no readable content (likely a JS-rendered SPA without server-side HTML).'
    }
  }

  // ---- Call Claude with forced tool-use ----
  const anthropic = new Anthropic({ apiKey: config.anthropicApiKey })
  const systemPrompt = buildUrlImportSystemPrompt({ locale, finalUrl: fetched.finalUrl })

  let toolInput: { name?: unknown; sector?: unknown; stage?: unknown; description?: unknown }
  try {
    const response = await anthropic.messages.create({
      model: config.anthropicModel as string,
      max_tokens: 1024,
      system: systemPrompt,
      // Our schema is declared `as const` to keep the literal enums readable
      // in prompts.ts. The SDK's `Tool` type expects a wider shape, so we
      // cast — the runtime contract is enforced by Claude itself.
      tools: [URL_IMPORT_TOOL_SCHEMA] as unknown as Anthropic.Messages.Tool[],
      // tool_choice forces Claude to call the named tool exactly once,
      // which guarantees a structured JSON response.
      tool_choice: { type: 'tool', name: URL_IMPORT_TOOL_SCHEMA.name },
      messages: [
        {
          role: 'user',
          content: `Extract the project info from the following page content:\n\n${text}`
        }
      ]
    })

    // Find the tool_use block in the response.
    const toolUseBlock = response.content.find((b) => b.type === 'tool_use')
    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      throw new Error('Model did not return a tool_use block.')
    }
    toolInput = toolUseBlock.input as typeof toolInput
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Claude extraction failed'
    setResponseStatus(event, 502)
    return { error: msg }
  }

  // ---- Validate the extracted fields against our enums ----
  const name = typeof toolInput.name === 'string' && toolInput.name.trim().length > 0
    ? toolInput.name.trim().slice(0, 120)
    : ''

  const sector =
    typeof toolInput.sector === 'string' && (VALID_SECTORS as readonly string[]).includes(toolInput.sector)
      ? (toolInput.sector as ProjectSector)
      : null

  const stage =
    typeof toolInput.stage === 'string' && (VALID_STAGES as readonly string[]).includes(toolInput.stage)
      ? (toolInput.stage as ProjectStage)
      : null

  const description =
    typeof toolInput.description === 'string' && toolInput.description.trim().length > 0
      ? toolInput.description.trim().slice(0, 1000)
      : null

  // If we got nothing at all, treat that as a failure rather than returning empty.
  if (!name && !description && !sector && !stage) {
    setResponseStatus(event, 422)
    return { error: 'Could not extract any project info from this page.' }
  }

  return {
    name,
    sector,
    stage,
    description,
    finalUrl: fetched.finalUrl
  }
})
