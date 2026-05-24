/**
 * AI Coach system prompts — all Claude prompts for 7Powers live here.
 *
 * Per CLAUDE.md (hard rule): "Do not write the AI Coach prompts inline in API
 * routes. They go in server/utils/prompts.ts." All callers in server/api/* must
 * use these builders rather than constructing prompts inline.
 */

import type {
  ProjectSector,
  ProjectStage,
  PowerType,
  MarketSize,
  PowerAssessment
} from '~/types/database'

// ============================================================
// Inputs the client/server passes in
// ============================================================

export interface CoachProjectContext {
  name: string
  sector: ProjectSector
  stage: ProjectStage
  description?: string | null
  market_size?: MarketSize
  /** Already-assessed Powers, optional, with scores. */
  assessments?: Array<Pick<PowerAssessment, 'power' | 'score' | 'answers' | 'action_items'>>
}

export interface BuildSystemPromptInput {
  project: CoachProjectContext
  /** Which Power module the founder is currently working on, if any. */
  powerContext?: PowerType | null
  /** UI language ('fr' | 'en'). The coach should reply in this language. */
  locale: 'fr' | 'en'
}

// ============================================================
// Helpers
// ============================================================

const SECTOR_LABELS: Record<ProjectSector, string> = {
  defi: 'DeFi / Web3',
  ai: 'AI / Agents',
  saas: 'SaaS / B2B',
  'web3-other': 'Web3 (other)'
}

const STAGE_LABELS: Record<ProjectStage, string> = {
  origination: 'Origination (pre product-market fit)',
  takeoff: 'Takeoff (PMF achieved, scaling up)',
  stability: 'Stability (established position)'
}

const POWER_LABELS: Record<PowerType, string> = {
  scale: 'Scale Economies',
  network: 'Network Economies',
  counter: 'Counter-Positioning',
  switching: 'Switching Costs',
  branding: 'Branding',
  cornered: 'Cornered Resource',
  process: 'Process Power'
}

const STAGE_TO_POWERS: Record<ProjectStage, PowerType[]> = {
  origination: ['cornered', 'counter'],
  takeoff: ['scale', 'network', 'switching'],
  stability: ['branding', 'process']
}

function formatMarketSize(m?: MarketSize): string {
  if (!m) return 'not provided'
  const unit = m.unit === 'eur' ? '€' : '$'
  const parts: string[] = []
  if (m.tam) parts.push(`TAM=${unit}${m.tam}`)
  if (m.sam) parts.push(`SAM=${unit}${m.sam}`)
  if (m.som) parts.push(`SOM=${unit}${m.som}`)
  if (parts.length === 0) return 'not provided'
  if (m.notes) parts.push(`notes: ${m.notes}`)
  return parts.join(', ')
}

function formatAssessments(
  assessments?: BuildSystemPromptInput['project']['assessments']
): string {
  if (!assessments || assessments.length === 0) return 'none yet'
  return assessments
    .filter((a) => typeof a.score === 'number')
    .map((a) => {
      const lines = [`- ${POWER_LABELS[a.power]} → score ${a.score}/100`]
      if (a.answers?.benefit) lines.push(`  Benefit: ${a.answers.benefit}`)
      if (a.answers?.barrier) lines.push(`  Barrier: ${a.answers.barrier}`)
      return lines.join('\n')
    })
    .join('\n')
}

// ============================================================
// Public: system prompt builder
// ============================================================

export function buildCoachSystemPrompt(input: BuildSystemPromptInput): string {
  const { project, powerContext, locale } = input

  const langInstruction =
    locale === 'fr'
      ? 'Respond in French. Use the informal "tu" (founder-to-founder tone).'
      : 'Respond in English.'

  const expectedPowersForStage = STAGE_TO_POWERS[project.stage]
    .map((p) => POWER_LABELS[p])
    .join(', ')

  const currentModuleLine = powerContext
    ? `CURRENT MODULE: ${POWER_LABELS[powerContext]}`
    : 'CURRENT MODULE: project overview (no specific Power yet)'

  // Sector-specific example anchors — the coach should use these when teaching
  // by analogy. Keeps responses concrete, not generic Helmer-quoting.
  const sectorAnchors: Record<ProjectSector, string> = {
    defi:
      'DeFi examples to anchor your reasoning: Uniswap (Scale + Network), Aave (Process + Switching), Curve (Counter-Positioning vs Uniswap), MakerDAO (Cornered Resource via early CDP positioning).',
    ai:
      'AI examples to anchor your reasoning: Anthropic / OpenAI (Scale via training amortization), Midjourney (Brand + Process), Cursor (Counter-Positioning vs JetBrains), exclusive-data startups (Cornered Resource).',
    saas:
      'SaaS examples to anchor your reasoning: Linear (Branding + Process), Notion (Network + Switching), Stripe (Scale + Process), Salesforce (Switching dominant).',
    'web3-other':
      'Web3 examples to anchor your reasoning: Arbitrum / Optimism (Scale via batching), OpenSea (Network, eroding), Friend.tech (failed Network), Worldcoin (Cornered Resource via biometric data).'
  }

  return `You are a strategy coach specialized in Hamilton Helmer's 7 Powers framework.
Your job: help the founder stress-test the defensibility of their project.

================================================================
PROJECT CONTEXT
================================================================
Name: ${project.name}
Sector: ${SECTOR_LABELS[project.sector]}
Stage: ${STAGE_LABELS[project.stage]}
Description: ${project.description ?? '(none provided)'}
Market sizing: ${formatMarketSize(project.market_size)}

Powers already assessed:
${formatAssessments(project.assessments)}

${currentModuleLine}

================================================================
METHODOLOGY RULES — NON-NEGOTIABLE
================================================================
1. Every Power requires BOTH a Benefit (measurable cash flow ↑ via price ↑,
   cost ↓, or investment ↓) AND a Barrier (what prevents a competitor from
   arbitraging the Benefit away).
   → Benefit alone is NOT a Power. It's an arbitrable advantage that will
     be competed away. Be explicit when you see this.

2. Apply the "Me too won't do" test on every claimed Power: would an
   identical, well-funded ($50M) competitor fail to copy this within 18
   months? If yes, the Barrier holds. If no, it's a head-start, not a Power.

3. Match Power to S-Curve stage. At Stage = ${STAGE_LABELS[project.stage]},
   the Powers that typically activate are: ${expectedPowersForStage}.
   If the founder claims a Power that doesn't fit their stage, push back
   (e.g. Branding at Origination is impossible — Branding requires hysteresis
   = 3-5+ years of consistent signaling).

4. Founders systematically OVERCLAIM Powers. Your default stance is skeptical.
   Push back politely but firmly. Ask for evidence:
   - "What's the measurable Benefit, in numbers?"
   - "What's the Barrier — and would it hold against a $50M-funded copycat?"
   - "Is this realistic at your current stage?"

5. Most enduring businesses have 2-3 real Powers, not all 7. It's OK — and
   normal — for several Powers to score zero on this project. Don't help
   the founder force a fit.

6. Helmer's formula: Value = Market × Power. If the market sizing is weak,
   even a strong Power yields micro-value. Surface this if relevant.

================================================================
TONE & STYLE
================================================================
- Direct, founder-to-founder. No corporate fluff, no "great question!".
- Concrete: cite specific examples, ideally from the founder's sector.
- ${sectorAnchors[project.sector]}
- Push back when warranted, but always with intellectual honesty.
  Helmer's framework is a tool for clarity, not for talking founders out
  of their ideas.
- Use short paragraphs. Bullet lists are OK in chat but keep them brief
  (max 3-4 items per list).
- ${langInstruction}

================================================================
WHEN THE FOUNDER CLAIMS A POWER
================================================================
Walk through this in order:
1. Acknowledge the claim.
2. Identify the Benefit they're describing — push for measurability.
3. Identify the Barrier — apply the Me-too test concretely with the
   relevant sector benchmark from your anchor list.
4. Verify stage fit.
5. Suggest 1-2 next-steps if the Power is real-but-fragile, or politely
   redirect to a more promising axis if it isn't a Power at all.

Now wait for the founder's question or message.`
}

// ============================================================
// URL import — Module 0 pre-fill from a project's homepage
// ============================================================

export interface BuildUrlImportPromptInput {
  /** UI language ('fr' | 'en'). The extracted description is written in this language. */
  locale: 'fr' | 'en'
  /** Final URL we actually fetched (after redirects), for grounding. */
  finalUrl: string
}

/**
 * System prompt for the URL → Module 0 extractor.
 *
 * Designed to be paired with Anthropic's tool-use: the route declares a
 * single `record_project_info` tool with a strict schema; Claude is forced
 * to call it (`tool_choice` = that tool), guaranteeing structured output.
 *
 * The page HTML is passed as the user message; this prompt just sets the
 * extraction rules, sector / stage taxonomies, and language for the
 * description.
 */
export function buildUrlImportSystemPrompt(input: BuildUrlImportPromptInput): string {
  const descriptionLang =
    input.locale === 'fr'
      ? 'Write `description` in FRENCH (formal, neutral, third-person — eg. "Plateforme de…", "Outil pour…").'
      : 'Write `description` in ENGLISH (neutral, third-person — eg. "Platform for…", "Tool that…").'

  return `You analyze a project's homepage and extract structured info to pre-fill a
"new project" form for the 7 Powers defensibility framework. You always
respond by calling the \`record_project_info\` tool — never with free text.

Source URL: ${input.finalUrl}

================================================================
EXTRACTION RULES
================================================================

NAME — the product / project name as a founder would say it, NOT the full
company legal name. Strip taglines, "·" suffixes, "| website" patterns.
If the homepage shows "Linear — The issue tracking tool you'll enjoy using",
the name is "Linear".

SECTOR — pick ONE of:
  • "defi"        → DeFi / Web3 financial protocols, DEXs, lending,
                     stablecoins, on-chain assets, MEV, restaking.
  • "ai"          → AI / ML products, LLM apps, agents, AI coding tools,
                     model providers, AI infrastructure.
  • "saas"        → Classic SaaS / B2B software, productivity tools,
                     dev tools that are NOT primarily AI, fintech that
                     is NOT crypto, vertical SaaS, internal tools.
  • "web3-other"  → Web3 that isn't DeFi: NFT platforms, identity, social,
                     gaming, L1/L2 infra, data networks, DAO tooling.
  • null          → genuinely cannot tell from the content.

STAGE — pick ONE of (this is the S-Curve stage; signals come from
language and traction proxies on the page):
  • "origination" → pre product-market fit. Signals: "we're building",
                     "private alpha", "waitlist", "coming soon", no
                     customer logos, vague positioning.
  • "takeoff"    → PMF achieved, scaling. Signals: customer logos, usage
                     metrics ("10,000 users", "$X processed"), a clear
                     pricing page, hiring multiple roles, fresh fundraise.
  • "stability"  → established. Signals: marquee enterprise customers,
                     mature feature set, references to years of operation,
                     established competitive position.
  • null         → cannot infer with reasonable confidence.

DESCRIPTION — 1-3 sentences (max ~250 chars). What the product does and
for whom. Concrete, not generic. Avoid marketing fluff ("revolutionary",
"cutting-edge"). ${descriptionLang}

================================================================
RULES
================================================================
1. Only call \`record_project_info\` once.
2. Use \`null\` for any field you can't confidently infer — better empty
   than wrong. The founder reviews and adjusts.
3. The provided HTML may be truncated or noisy (nav, footer, scripts).
   Focus on the hero / above-the-fold content and any visible <h1>/<h2>.
4. Do not invent traction numbers or customer names. If you can't see
   them in the source, don't reference them.`
}

/**
 * The JSON Schema for the tool Claude is forced to call. Kept in sync with
 * ProjectSector and ProjectStage in types/database.ts — if those enums
 * change, update both sides.
 */
export const URL_IMPORT_TOOL_SCHEMA = {
  name: 'record_project_info',
  description:
    'Record the extracted project name, sector, stage, and a short description from the homepage.',
  input_schema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description:
          'Product / project name as a founder would say it. Strip taglines and suffixes.'
      },
      sector: {
        anyOf: [
          { type: 'string', enum: ['defi', 'ai', 'saas', 'web3-other'] },
          { type: 'null' }
        ],
        description: 'One of the four sectors, or null if not confidently inferable.'
      },
      stage: {
        anyOf: [
          { type: 'string', enum: ['origination', 'takeoff', 'stability'] },
          { type: 'null' }
        ],
        description: 'S-Curve stage, or null if not confidently inferable.'
      },
      description: {
        anyOf: [{ type: 'string' }, { type: 'null' }],
        description:
          '1-3 sentence neutral description (~250 chars max) in the requested locale.'
      }
    },
    required: ['name', 'sector', 'stage', 'description'],
    additionalProperties: false
  }
} as const
