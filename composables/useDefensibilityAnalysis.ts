import type {
  PowerType,
  ProjectStage,
  LocalProject,
  LocalPowerAssessment
} from '~/types/database'
import { computeMarketAttractiveness, hasMinimumMarketData } from '~/utils/marketScore'

/**
 * Module 9 — Power Map analysis.
 *
 * Pure logic: derives the global Defensibility Score, the top-3 Powers,
 * and the red flags (coherence checks per spec § 6.3) from the current
 * project + its assessments. No reactivity wrapper — caller passes refs.
 */

// ------------------------------------------------------------
// Stage ↔ Power expected mapping (per Helmer's S-Curve)
// ------------------------------------------------------------

const POWER_TO_STAGE: Record<PowerType, ProjectStage[]> = {
  // Cornered Resource + Counter-Positioning are typically WON at Origination
  cornered: ['origination'],
  counter: ['origination'],
  // Scale + Network + Switching are BUILT at Takeoff
  scale: ['takeoff'],
  network: ['takeoff'],
  switching: ['takeoff'],
  // Branding + Process require Stability (hysteresis / tacit knowledge)
  branding: ['stability'],
  process: ['stability']
}

export function stageFitFor(power: PowerType, stage: ProjectStage): 'expected' | 'mismatch' {
  return POWER_TO_STAGE[power].includes(stage) ? 'expected' : 'mismatch'
}

// ------------------------------------------------------------
// Top Powers + Defensibility Score
// ------------------------------------------------------------

export interface PowerScoreEntry {
  power: PowerType
  score: number
}

export function rankedPowers(
  assessments: Record<PowerType, LocalPowerAssessment | undefined>
): PowerScoreEntry[] {
  return (Object.entries(assessments) as [PowerType, LocalPowerAssessment | undefined][])
    .map(([power, a]) => ({ power, score: a?.score ?? 0 }))
    .filter((x): x is PowerScoreEntry => typeof x.score === 'number' && x.score > 0)
    .sort((a, b) => b.score - a.score)
}

export function topPowers(
  assessments: Record<PowerType, LocalPowerAssessment | undefined>,
  n = 3
): PowerScoreEntry[] {
  return rankedPowers(assessments).slice(0, n)
}

export function defensibilityScore(
  project: LocalProject,
  assessments: Record<PowerType, LocalPowerAssessment | undefined>
): number | null {
  const top3 = topPowers(assessments, 3)
  if (top3.length === 0) return null
  const top3Avg = top3.reduce((s, x) => s + x.score, 0) / top3.length
  const market = hasMinimumMarketData(project.market_size)
    ? computeMarketAttractiveness(project.market_size)
    : 0
  return Math.round(top3Avg * 0.7 + market * 0.3)
}

/**
 * For the breakdown panel: same math as defensibilityScore() but exposing
 * the intermediate values so the UI can show "67 = 78 × 0.7 + 42 × 0.3".
 */
export interface DefensibilityBreakdown {
  defensibility: number
  top3Avg: number
  marketScore: number
  top3: PowerScoreEntry[]
  marketHasData: boolean
}

export function defensibilityBreakdown(
  project: LocalProject,
  assessments: Record<PowerType, LocalPowerAssessment | undefined>
): DefensibilityBreakdown | null {
  const top3 = topPowers(assessments, 3)
  if (top3.length === 0) return null
  const top3Avg = Math.round(top3.reduce((s, x) => s + x.score, 0) / top3.length)
  const marketHasData = hasMinimumMarketData(project.market_size)
  const marketScore = marketHasData ? computeMarketAttractiveness(project.market_size) : 0
  return {
    defensibility: Math.round(top3Avg * 0.7 + marketScore * 0.3),
    top3Avg,
    marketScore,
    top3,
    marketHasData
  }
}

// ------------------------------------------------------------
// Red flags — coherence checks per spec § 6.3
// ------------------------------------------------------------

export type RedFlagSeverity = 'warning' | 'critical'

export interface RedFlag {
  id: string
  severity: RedFlagSeverity
  /** i18n key under `synthesis.redFlags.{id}.title|body` plus optional {power}. */
  i18nKey: string
  power?: PowerType
}

export function detectRedFlags(
  project: LocalProject,
  assessments: Record<PowerType, LocalPowerAssessment | undefined>
): RedFlag[] {
  const flags: RedFlag[] = []
  const ranked = rankedPowers(assessments)

  // 1) Stage mismatch on a claimed Power (score > 50 but stage doesn't fit)
  for (const { power, score } of ranked) {
    if (score > 50 && stageFitFor(power, project.stage) === 'mismatch') {
      flags.push({
        id: `stage-mismatch-${power}`,
        severity: 'warning',
        i18nKey: 'stageMismatch',
        power
      })
    }
  }

  // 2) Score > 40 but Benefit OR Barrier text is empty (claimed without articulating)
  for (const { power, score } of ranked) {
    const a = assessments[power]
    if (!a) continue
    const benefit = a.answers?.benefit?.trim() ?? ''
    const barrier = a.answers?.barrier?.trim() ?? ''
    if (score > 40 && (benefit.length === 0 || barrier.length === 0)) {
      flags.push({
        id: `unarticulated-${power}`,
        severity: 'warning',
        i18nKey: 'unarticulated',
        power
      })
    }
  }

  // 3) Inflated self-scoring — all 5 Q at 5 (suspicious)
  for (const { power } of ranked) {
    const a = assessments[power]
    if (!a) continue
    const { q1, q2, q3, q4, q5 } = a.answers ?? {}
    if (q1 === 5 && q2 === 5 && q3 === 5 && q4 === 5 && q5 === 5) {
      flags.push({
        id: `max-score-${power}`,
        severity: 'warning',
        i18nKey: 'maxScore',
        power
      })
    }
  }

  // 4) Several Powers claimed strongly (Helmer says most have 2-3, not 5+)
  const strongCount = ranked.filter((p) => p.score >= 60).length
  if (strongCount >= 5) {
    flags.push({
      id: 'too-many-powers',
      severity: 'warning',
      i18nKey: 'tooManyPowers'
    })
  }

  // 5) No clear Power at all (no score > 50 → moat risk)
  if (ranked.length > 0 && ranked[0].score < 50) {
    flags.push({
      id: 'no-clear-moat',
      severity: 'critical',
      i18nKey: 'noClearMoat'
    })
  }

  // 6) Tiny market + claimed Powers — Value = Market × Power
  const market = hasMinimumMarketData(project.market_size)
    ? computeMarketAttractiveness(project.market_size)
    : 0
  if (market > 0 && market < 30 && ranked.some((p) => p.score >= 50)) {
    flags.push({
      id: 'thin-market-strong-power',
      severity: 'warning',
      i18nKey: 'thinMarket'
    })
  }

  return flags
}
