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
