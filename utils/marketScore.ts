import type { MarketSize } from '~/types/database'

/**
 * Market attractiveness score (0-100), deterministic, computed from TAM/SAM/SOM.
 *
 * Why this matters: Helmer's `Value = Market × Power`. Even a strong Power on a
 * micro-market gives micro-value. The score rewards a real TAM, a focused SAM,
 * and a *realistic* SOM (founders chronically over-claim capture).
 *
 * Breakdown:
 *   - TAM tier (0-40): log-scale jumps at 10M / 100M / 1B / 10B (USD or EUR
 *     are treated equivalently here — order-of-magnitude is what matters).
 *   - SAM tier (0-30): same shape, narrower (1B+ is the cap).
 *   - SOM realism (0-30): SOM/SAM ratio sweet spot is 5-20% over 3-5 years.
 *     Below 5% → conservative (still scored). Above 40% → red flag, low score.
 *
 * Edge cases:
 *   - Anything missing or 0 → that section scores 0
 *   - Logical inconsistency (TAM < SAM or SAM < SOM) → still scored, but
 *     `isCoherent()` returns false so the UI can flag it
 */

const M = 1_000_000
const B = 1_000_000_000

function tamScore(tam: number): number {
  if (tam >= 10 * B) return 40
  if (tam >= 1 * B) return 32
  if (tam >= 100 * M) return 22
  if (tam >= 10 * M) return 10
  if (tam > 0) return 4
  return 0
}

function samScore(sam: number): number {
  if (sam >= 1 * B) return 30
  if (sam >= 100 * M) return 22
  if (sam >= 10 * M) return 12
  if (sam > 0) return 4
  return 0
}

function somRealism(sam: number, som: number): number {
  if (sam <= 0 || som <= 0) return 0
  const ratio = som / sam
  // Sweet spot: 5-20% capture over a 3-5y horizon → realistic ambition
  if (ratio >= 0.05 && ratio <= 0.20) return 30
  // Conservative: < 5% → still rewarded for honesty, but slightly less
  if (ratio < 0.05) return 18
  // Stretch: 20-40% → optimistic but defensible if the founder can argue it
  if (ratio <= 0.40) return 18
  // > 40% → unrealistic in almost all real markets; red flag
  return 6
}

export function computeMarketAttractiveness(market: MarketSize): number {
  const tam = market.tam ?? 0
  const sam = market.sam ?? 0
  const som = market.som ?? 0
  return Math.min(100, tamScore(tam) + samScore(sam) + somRealism(sam, som))
}

/**
 * Returns whether TAM >= SAM >= SOM. Used by the UI to surface a warning
 * (not a hard block — founders should still be able to save inconsistent
 * numbers and iterate).
 */
export function isCoherent(market: MarketSize): boolean {
  const tam = market.tam ?? 0
  const sam = market.sam ?? 0
  const som = market.som ?? 0
  if (sam > tam && tam > 0) return false
  if (som > sam && sam > 0) return false
  return true
}

/**
 * Considers the market sizing "complete enough to score" if at least TAM is set
 * (founders often start with TAM and refine SAM/SOM later).
 */
export function hasMinimumMarketData(market: MarketSize): boolean {
  return (market.tam ?? 0) > 0
}

/**
 * Compact human-readable formatter (e.g. "$1.2B", "$45M", "€800K").
 */
export function formatMarketValue(amount: number, unit: 'usd' | 'eur' = 'usd'): string {
  if (!amount || amount <= 0) return '—'
  const symbol = unit === 'eur' ? '€' : '$'
  if (amount >= B) {
    const v = amount / B
    return `${symbol}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}B`
  }
  if (amount >= M) {
    const v = amount / M
    return `${symbol}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}M`
  }
  if (amount >= 1000) {
    const v = amount / 1000
    return `${symbol}${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)}K`
  }
  return `${symbol}${amount}`
}
