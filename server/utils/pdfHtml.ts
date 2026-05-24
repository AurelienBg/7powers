/**
 * PDF HTML builder — generates a self-contained A4-formatted HTML string
 * that Puppeteer renders to PDF in /api/export-pdf.
 *
 * Why we build raw HTML server-side instead of crawling the live Nuxt page:
 *   - Local-first projects aren't in Supabase (yet) → not URL-fetchable.
 *   - Auth context is messy to forward to a headless browser.
 *   - The PDF layout has different constraints than the SPA (page breaks,
 *     no interactivity, inline CSS, embedded SVG) so the divergence is OK.
 *
 * The Power Radar SVG geometry is duplicated from PowerRadar.vue. Keep in
 * sync — both use the same math (7 axes, RING_MAX, polar coords). When
 * the radar changes meaningfully, update here too.
 */

import type {
  PowerType,
  ProjectSector,
  ProjectStage,
  MarketSize,
  PowerAssessment
} from '~/types/database'
import { computeMarketAttractiveness, hasMinimumMarketData, formatMarketValue } from '~/utils/marketScore'
import {
  defensibilityBreakdown,
  topPowers as computeTopPowers,
  detectRedFlags,
  stageFitFor
} from '~/composables/useDefensibilityAnalysis'

// ============================================================
// Input shape
// ============================================================

export interface PdfExportPayload {
  project: {
    name: string
    sector: ProjectSector
    stage: ProjectStage
    description?: string | null
    market_size: MarketSize
  }
  assessments: Partial<Record<PowerType, Pick<PowerAssessment, 'answers' | 'score' | 'action_items'>>>
  locale: 'fr' | 'en'
  generatedAt: string
}

// ============================================================
// Labels (FR/EN minimal — keep PDF self-contained without nuxt-i18n)
// ============================================================

type Lang = 'fr' | 'en'

const POWER_LABEL: Record<Lang, Record<PowerType, string>> = {
  fr: {
    scale: "Économies d'échelle",
    network: 'Effets de réseau',
    counter: 'Counter-Positioning',
    switching: 'Coûts de switch',
    branding: 'Marque',
    cornered: 'Ressource captive',
    process: 'Process Power'
  },
  en: {
    scale: 'Scale Economies',
    network: 'Network Economies',
    counter: 'Counter-Positioning',
    switching: 'Switching Costs',
    branding: 'Branding',
    cornered: 'Cornered Resource',
    process: 'Process Power'
  }
}

const POWER_GLYPH: Record<PowerType, string> = {
  scale: '⬡',
  network: '◉',
  counter: '⇄',
  switching: '◈',
  branding: '✦',
  cornered: '△',
  process: '⚖'
}

const SECTOR_LABEL: Record<Lang, Record<ProjectSector, string>> = {
  fr: { defi: 'DeFi / Web3', ai: 'AI / Agents', saas: 'SaaS / B2B', 'web3-other': 'Web3 (autre)' },
  en: { defi: 'DeFi / Web3', ai: 'AI / Agents', saas: 'SaaS / B2B', 'web3-other': 'Web3 (other)' }
}

const STAGE_LABEL: Record<Lang, Record<ProjectStage, string>> = {
  fr: { origination: 'Origination', takeoff: 'Takeoff', stability: 'Stability' },
  en: { origination: 'Origination', takeoff: 'Takeoff', stability: 'Stability' }
}

const I18N = {
  fr: {
    title: '7Powers — Power Map',
    subtitle: "Stress-test de défensibilité (framework Hamilton Helmer)",
    generatedOn: 'Généré le',
    defensibility: 'Defensibility Score',
    topPowers: 'Top 3 Powers',
    marketSizing: 'Taille de marché',
    redFlags: 'Red flags',
    actionPlan: "Plan d'action",
    powerMap: 'Power Map',
    benefit: 'Benefit',
    barrier: 'Barrier',
    score: 'Score',
    stageFit: 'Alignement stade',
    aligned: 'Aligné',
    mismatch: 'Hors stade',
    noPowersYet: 'Aucun Power scoré',
    notAssessed: 'Non évalué',
    footer: 'Généré avec 7Powers — 7powers.vercel.app',
    redFlagsBody: {
      stageMismatch: ({ power }: { power: string }) =>
        `${power} hors stade : le Power se construit habituellement à un autre stade S-Curve. Re-vérifier.`,
      unarticulated: ({ power }: { power: string }) =>
        `${power} pas articulé : score >40 sans description Benefit ou Barrier. À approfondir.`,
      maxScore: ({ power }: { power: string }) =>
        `${power} maxé sur tous les axes : suspect d'overclaim, re-challenger Q3 (Barrier).`,
      tooManyPowers: () =>
        'Trop de Powers revendiqués (5+ à plus de 60). Helmer dit 2-3, pas 7.',
      noClearMoat: () =>
        'Pas de Power dominant (aucun > 50). Risque arbitrage par concurrent bien financé.',
      thinMarket: () =>
        'Marché étroit + Powers forts. Value = Market × Power. Re-évaluer SAM/SOM.'
    }
  },
  en: {
    title: '7Powers — Power Map',
    subtitle: 'Defensibility stress-test (Hamilton Helmer framework)',
    generatedOn: 'Generated on',
    defensibility: 'Defensibility Score',
    topPowers: 'Top 3 Powers',
    marketSizing: 'Market sizing',
    redFlags: 'Red flags',
    actionPlan: 'Action plan',
    powerMap: 'Power Map',
    benefit: 'Benefit',
    barrier: 'Barrier',
    score: 'Score',
    stageFit: 'Stage fit',
    aligned: 'Aligned',
    mismatch: 'Off-stage',
    noPowersYet: 'No Power scored',
    notAssessed: 'Not assessed',
    footer: 'Generated with 7Powers — 7powers.vercel.app',
    redFlagsBody: {
      stageMismatch: ({ power }: { power: string }) =>
        `${power} off-stage: this Power usually builds at a different S-Curve stage. Re-check.`,
      unarticulated: ({ power }: { power: string }) =>
        `${power} unarticulated: score >40 without Benefit or Barrier description. Dig deeper.`,
      maxScore: ({ power }: { power: string }) =>
        `${power} maxed on every axis: likely overclaim, re-challenge Q3 (Barrier).`,
      tooManyPowers: () =>
        'Too many Powers claimed (5+ above 60). Helmer says 2-3, not 7.',
      noClearMoat: () =>
        'No dominant Power (none > 50). Risk of arbitrage by a well-funded competitor.',
      thinMarket: () =>
        'Thin market + strong Powers. Value = Market × Power. Re-evaluate SAM/SOM.'
    }
  }
} as const

// ============================================================
// Radar SVG generator — duplicates PowerRadar.vue geometry
// ============================================================

const POWERS_ORDER: PowerType[] = [
  'scale', 'network', 'counter', 'switching', 'branding', 'cornered', 'process'
]

function polar(deg: number, r: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r }
}

function renderRadarSvg(
  scores: Record<PowerType, number>,
  topPowerSet: Set<PowerType>,
  lang: Lang
): string {
  const SIZE = 320
  const HALF = SIZE / 2
  const RING_MAX = HALF - 60 // matches PowerRadar.vue full mode
  const LABEL_R = HALF - 30

  const axes = POWERS_ORDER.map((power, i) => {
    const angle = -90 + (360 / POWERS_ORDER.length) * i
    const end = polar(angle, RING_MAX)
    const label = polar(angle, LABEL_R)
    const score = Math.min(100, Math.max(0, scores[power] ?? 0))
    const scorePoint = polar(angle, (score / 100) * RING_MAX)
    const anchor = label.x < -5 ? 'end' : label.x > 5 ? 'start' : 'middle'
    return { power, angle, end, label, score, scorePoint, anchor, isTop: topPowerSet.has(power) }
  })

  const rings = [25, 50, 75, 100].map((v) => (v / 100) * RING_MAX)
  const polygonPoints = axes.map((a) => `${a.scorePoint.x.toFixed(2)},${a.scorePoint.y.toFixed(2)}`).join(' ')

  return `
<svg xmlns="http://www.w3.org/2000/svg"
     viewBox="-${HALF} -${HALF} ${SIZE} ${SIZE}"
     width="${SIZE}" height="${SIZE}"
     style="overflow: visible">
  ${rings.map((r) => `
    <circle cx="0" cy="0" r="${r}" fill="none" stroke="#d4d4d8" stroke-width="0.5"
            stroke-dasharray="${r === RING_MAX ? '0' : '2 3'}" opacity="0.7"/>
  `).join('')}
  ${axes.map((a) => `
    <line x1="0" y1="0" x2="${a.end.x.toFixed(2)}" y2="${a.end.y.toFixed(2)}"
          stroke="#a1a1aa" stroke-width="0.5"/>
  `).join('')}
  <polygon points="${polygonPoints}"
           fill="rgba(55, 138, 221, 0.18)"
           stroke="#378ADD" stroke-width="1.5" stroke-linejoin="round"/>
  ${axes.map((a) => {
    if (a.isTop) {
      return `
        <circle cx="${a.scorePoint.x.toFixed(2)}" cy="${a.scorePoint.y.toFixed(2)}" r="7" fill="#EF9F27" opacity="0.22"/>
        <circle cx="${a.scorePoint.x.toFixed(2)}" cy="${a.scorePoint.y.toFixed(2)}" r="4" fill="#F5B450"/>
      `
    }
    return `<circle cx="${a.scorePoint.x.toFixed(2)}" cy="${a.scorePoint.y.toFixed(2)}" r="2.5" fill="#378ADD"/>`
  }).join('')}
  ${axes.map((a) => `
    <text x="${a.label.x.toFixed(2)}" y="${(a.label.y - 5).toFixed(2)}"
          text-anchor="${a.anchor}" font-size="11" font-weight="500" fill="#0a0a0f">
      <tspan fill="${a.isTop ? '#B87808' : '#1E5FAB'}">${POWER_GLYPH[a.power]}</tspan>
      <tspan dx="3">${POWER_LABEL[lang][a.power]}</tspan>
    </text>
    <text x="${a.label.x.toFixed(2)}" y="${(a.label.y + 8).toFixed(2)}"
          text-anchor="${a.anchor}" font-size="11" font-weight="600"
          fill="${a.isTop ? '#B87808' : a.score > 0 ? '#0a0a0f' : '#a1a1aa'}">
      ${a.score > 0 ? `${Math.round(a.score)}/100` : '—'}
    </text>
  `).join('')}
  <circle cx="0" cy="0" r="1.5" fill="#52525b"/>
</svg>`
}

// ============================================================
// Helpers
// ============================================================

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function formatDate(iso: string, lang: Lang): string {
  const d = new Date(iso)
  return d.toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

// ============================================================
// Main builder
// ============================================================

export function buildPdfHtml(payload: PdfExportPayload): string {
  const { project, assessments, locale, generatedAt } = payload
  const t = I18N[locale]

  // Normalize assessments into a full Record<PowerType, ...> for the analysis helpers.
  const fullAssessments = Object.fromEntries(
    POWERS_ORDER.map((p) => [p, assessments[p]
      ? { ...assessments[p], local_id: '', local_project_id: '', power: p, created_at: '', updated_at: '' } as never
      : undefined])
  ) as Parameters<typeof defensibilityBreakdown>[1]

  // Build a LocalProject-shaped object for the analysis helpers.
  const projectShape = {
    ...project,
    local_id: '',
    description: project.description ?? null,
    created_at: '',
    updated_at: ''
  } as Parameters<typeof defensibilityBreakdown>[0]

  const breakdown = defensibilityBreakdown(projectShape, fullAssessments)
  const top3 = computeTopPowers(fullAssessments, 3)
  const top3Set = new Set(top3.map((p) => p.power))
  const redFlags = detectRedFlags(projectShape, fullAssessments)

  const scores: Record<PowerType, number> = Object.fromEntries(
    POWERS_ORDER.map((p) => [p, assessments[p]?.score ?? 0])
  ) as Record<PowerType, number>

  const radarSvg = renderRadarSvg(scores, top3Set, locale)

  const marketScore = hasMinimumMarketData(project.market_size)
    ? computeMarketAttractiveness(project.market_size)
    : null

  const marketUnit = project.market_size.unit === 'eur' ? 'eur' : 'usd'

  // ============================================================
  // HTML
  // ============================================================

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(project.name)} — 7Powers Report</title>
<style>
  @page {
    size: A4;
    margin: 20mm 18mm;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', 'Helvetica Neue', Arial, sans-serif;
    color: #0a0a0f;
    line-height: 1.5;
    margin: 0;
    padding: 0;
    font-size: 11pt;
  }
  h1 { font-size: 24pt; font-weight: 600; margin: 0 0 6pt; letter-spacing: -0.02em; }
  h2 { font-size: 14pt; font-weight: 600; margin: 24pt 0 10pt; color: #0a0a0f; border-bottom: 1px solid #e5e5e7; padding-bottom: 4pt; }
  h3 { font-size: 12pt; font-weight: 600; margin: 14pt 0 4pt; }
  p { margin: 0 0 6pt; }
  .muted { color: #52525b; }
  .small { font-size: 9pt; }
  .tabular { font-variant-numeric: tabular-nums; }
  .gold { color: #B87808; }
  .blue { color: #1E5FAB; }
  .tags { display: inline-flex; gap: 6pt; }
  .tag {
    font-size: 8pt; text-transform: uppercase; letter-spacing: 0.04em;
    padding: 2pt 6pt; border-radius: 3pt;
    background: #f4f4f6; color: #52525b; border: 1px solid #e5e5e7;
  }
  .cover { padding: 0 0 24pt; border-bottom: 2px solid #378ADD; margin-bottom: 24pt; }
  .cover .kicker { font-size: 9pt; text-transform: uppercase; letter-spacing: 0.1em; color: #B87808; margin-bottom: 8pt; }
  .cover h1 { font-size: 28pt; }
  .cover .meta { margin-top: 12pt; font-size: 10pt; color: #52525b; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18pt; }
  .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12pt; }
  .score-big { font-size: 36pt; font-weight: 600; line-height: 1; }
  .card {
    border: 1px solid #e5e5e7; border-radius: 6pt; padding: 10pt 12pt;
    background: #fafafa;
    page-break-inside: avoid;
  }
  .card.gold { border-color: #EF9F27; background: rgba(239, 159, 39, 0.04); }
  .card.warn { border-color: #f59e0b; background: rgba(245, 158, 11, 0.05); }
  .card.crit { border-color: #dc2626; background: rgba(220, 38, 38, 0.05); }
  .power-detail {
    page-break-inside: avoid;
    margin-bottom: 14pt;
    padding-bottom: 10pt;
    border-bottom: 1px solid #e5e5e7;
  }
  .power-detail:last-child { border-bottom: none; }
  .power-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6pt; }
  .power-header .name { font-size: 13pt; font-weight: 600; }
  .power-header .score { font-size: 14pt; font-weight: 600; font-variant-numeric: tabular-nums; }
  .field-label { font-size: 8pt; text-transform: uppercase; letter-spacing: 0.06em; color: #52525b; margin-top: 6pt; }
  ul.actions { padding-left: 18pt; margin: 4pt 0; }
  ul.actions li { margin-bottom: 2pt; }
  .footer { margin-top: 30pt; padding-top: 10pt; border-top: 1px solid #e5e5e7; font-size: 8pt; color: #a1a1aa; text-align: center; }
  .radar-wrap { text-align: center; margin: 12pt 0; }
  .page-break { page-break-before: always; }
</style>
</head>
<body>

<!-- COVER -->
<section class="cover">
  <div class="kicker">${escapeHtml(t.title)}</div>
  <h1>${escapeHtml(project.name)}</h1>
  <div class="tags">
    <span class="tag">${escapeHtml(SECTOR_LABEL[locale][project.sector])}</span>
    <span class="tag">${escapeHtml(STAGE_LABEL[locale][project.stage])}</span>
  </div>
  ${project.description ? `<p style="margin-top:10pt;color:#52525b;">${escapeHtml(project.description)}</p>` : ''}
  <div class="meta">${t.subtitle} · ${t.generatedOn} ${formatDate(generatedAt, locale)}</div>
</section>

<!-- EXECUTIVE SUMMARY: defensibility + top 3 + market -->
<section>
  <h2>${t.defensibility}</h2>
  <div class="grid-3">
    <div class="card ${breakdown && breakdown.defensibility >= 70 ? 'gold' : ''}">
      <div class="field-label">${t.defensibility}</div>
      <div class="score-big ${breakdown && breakdown.defensibility >= 70 ? 'gold' : 'blue'}">
        ${breakdown ? breakdown.defensibility : '—'}<span class="muted" style="font-size:16pt">/100</span>
      </div>
      ${breakdown ? `
        <p class="small muted" style="margin-top:6pt;">
          Top 3 × 0.7 + Market × 0.3<br/>
          ${breakdown.top3Avg} × 0.7 + ${breakdown.marketScore} × 0.3
        </p>
      ` : ''}
    </div>
    <div class="card">
      <div class="field-label">${t.marketSizing}</div>
      ${marketScore !== null ? `
        <div class="score-big blue">${marketScore}<span class="muted" style="font-size:16pt">/100</span></div>
        <p class="small muted">
          TAM ${formatMarketValue(project.market_size.tam ?? 0, marketUnit)} ·
          SAM ${formatMarketValue(project.market_size.sam ?? 0, marketUnit)} ·
          SOM ${formatMarketValue(project.market_size.som ?? 0, marketUnit)}
        </p>
      ` : `<p class="muted">${t.notAssessed}</p>`}
    </div>
    <div class="card">
      <div class="field-label">${t.topPowers}</div>
      ${top3.length > 0 ? top3.map((p, idx) => `
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-top:4pt">
          <span ${idx === 0 ? 'style="font-weight:600"' : 'class="muted"'}>
            <span class="${idx === 0 ? 'gold' : 'blue'}">${POWER_GLYPH[p.power]}</span>
            ${escapeHtml(POWER_LABEL[locale][p.power])}
          </span>
          <span class="tabular ${idx === 0 ? 'gold' : ''}">${Math.round(p.score)}</span>
        </div>
      `).join('') : `<p class="muted">${t.noPowersYet}</p>`}
    </div>
  </div>
</section>

<!-- POWER MAP RADAR -->
<section>
  <h2>${t.powerMap}</h2>
  <div class="radar-wrap">
    ${radarSvg}
  </div>
</section>

<!-- RED FLAGS -->
${redFlags.length > 0 ? `
<section>
  <h2>${t.redFlags}</h2>
  ${redFlags.map((flag) => {
    const power = flag.power ? POWER_LABEL[locale][flag.power] : ''
    const body = (t.redFlagsBody as Record<string, (args?: { power?: string }) => string>)[flag.i18nKey]?.({ power })
      ?? ''
    return `<div class="card ${flag.severity === 'critical' ? 'crit' : 'warn'}">
      <p>${escapeHtml(body)}</p>
    </div>`
  }).join('\n')}
</section>
` : ''}

<!-- PER-POWER DETAIL (page break before for cleaner layout) -->
<section class="page-break">
  <h2>${locale === 'fr' ? 'Détail par Power' : 'Per-Power detail'}</h2>
  ${POWERS_ORDER.map((p) => {
    const a = assessments[p]
    const score = a?.score
    const isTop = top3Set.has(p)
    return `<div class="power-detail">
      <div class="power-header">
        <div class="name">
          <span class="${isTop ? 'gold' : 'blue'}">${POWER_GLYPH[p]}</span>
          ${escapeHtml(POWER_LABEL[locale][p])}
        </div>
        <div class="score ${isTop ? 'gold' : 'blue'}">
          ${typeof score === 'number' ? `${Math.round(score)}/100` : `<span class="muted">${t.notAssessed}</span>`}
        </div>
      </div>
      ${a?.answers?.benefit ? `
        <div class="field-label">${t.benefit}</div>
        <p>${escapeHtml(a.answers.benefit)}</p>
      ` : ''}
      ${a?.answers?.barrier ? `
        <div class="field-label">${t.barrier}</div>
        <p>${escapeHtml(a.answers.barrier)}</p>
      ` : ''}
      <div class="field-label">${t.stageFit}: ${
        stageFitFor(p, project.stage) === 'expected'
          ? `<span class="blue">${t.aligned}</span>`
          : `<span class="gold">${t.mismatch}</span>`
      }</div>
      ${(a?.action_items && a.action_items.length > 0) ? `
        <div class="field-label">${t.actionPlan}</div>
        <ul class="actions">${a.action_items.map((item) => `<li>${escapeHtml(item.title)}</li>`).join('')}</ul>
      ` : ''}
    </div>`
  }).join('\n')}
</section>

<div class="footer">${t.footer}</div>

</body>
</html>`
}
