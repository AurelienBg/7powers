import type { PowerAnswers } from '~/types/database'

/**
 * Helmer 7-Powers strength score (0-100), deterministic, computed from 5
 * sub-questions Q1-Q5 each rated 0-5.
 *
 * Q1, Q2: Benefit (clarity + magnitude)
 * Q3, Q4: Barrier (height + me-too resistance)
 * Q5:     Stage fit (S-Curve alignment)
 *
 * Formula (spec § 6.1, corrected for normalization):
 *
 *   benefit_avg = (Q1 + Q2) / 2       ∈ [0, 5]
 *   barrier_avg = (Q3 + Q4) / 2       ∈ [0, 5]
 *   stage_fit   = Q5                  ∈ [0, 5]
 *   score       = benefit_avg × barrier_avg × stage_fit / 125 × 100
 *               = benefit_avg × barrier_avg × stage_fit × 0.8
 *
 * The spec writes "/ 25 × 100" but that yields max=500. Normalizing by
 * 125 (= 5 × 5 × 5) gives the documented 0-100 range. CLAUDE.md and
 * sevenpowers-spec.md will be updated to match in a doc pass.
 *
 * The formula is intentionally MULTIPLICATIVE — a zero on Benefit or
 * Barrier zeros out the entire score. That's the whole point of Helmer's
 * "Benefit AND Barrier required" rule: an arbitrable advantage is not
 * a Power, no matter how big the cash impact.
 */

export function usePowerScore() {
  function compute(answers: PowerAnswers | undefined): number {
    if (!answers) return 0
    const { q1, q2, q3, q4, q5 } = answers
    if (q1 == null || q2 == null || q3 == null || q4 == null || q5 == null) {
      return 0
    }
    const benefit = (q1 + q2) / 2
    const barrier = (q3 + q4) / 2
    const score = (benefit * barrier * q5 * 100) / 125
    return Math.round(score)
  }

  function isComplete(answers: PowerAnswers | undefined): boolean {
    if (!answers) return false
    const { q1, q2, q3, q4, q5 } = answers
    return q1 != null && q2 != null && q3 != null && q4 != null && q5 != null
  }

  return { compute, isComplete }
}
