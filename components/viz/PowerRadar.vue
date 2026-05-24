<script setup lang="ts">
import type { PowerType, LocalPowerAssessment } from '~/types/database'

/**
 * PowerRadar — the signature visual of 7Powers.
 *
 * 7 axes at 360°/7 ≈ 51.4° apart, starting at top (Scale at 12 o'clock,
 * then clockwise around). Score per Power is plotted 0-100 from center
 * to outer ring. The closed polygon visualizes the project's defensibility
 * shape. Top-3 Powers get a gold overlay — "what shines = what holds".
 *
 * Math: x = cos(angle) * radius, y = sin(angle) * radius
 *        SVG y-axis grows downward, so we negate y to put Scale at top.
 *        Angles in JS are radians: deg * Math.PI / 180.
 */

const props = defineProps<{
  assessments: Record<PowerType, LocalPowerAssessment | undefined>
  topPowers?: PowerType[]
  size?: number
  /** Compact mode: hide axis labels (used for hub preview). */
  compact?: boolean
}>()

const { t } = useI18n()

const SIZE = computed(() => props.size ?? 360)
const HALF = computed(() => SIZE.value / 2)
// Ring radius scales with the SVG so the radar fits regardless of size.
// Compact mode (no labels) → use most of the available radius.
// Full mode → reserve room for axis labels around the ring.
const RING_MAX = computed(() =>
  props.compact ? Math.floor(HALF.value * 0.88) : Math.max(60, HALF.value - 60)
)
const LABEL_R = computed(() => HALF.value - 30)

// Power order matters — same as the rest of the app for consistency.
const POWERS: PowerType[] = [
  'scale',
  'network',
  'counter',
  'switching',
  'branding',
  'cornered',
  'process'
]

// Angle per axis: start at -90° (top), increment 360°/7 clockwise.
function axisAngleDeg(idx: number): number {
  return -90 + (360 / POWERS.length) * idx
}

function polar(deg: number, r: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r }
}

// Per-Power score (0-100), defaults to 0 when not assessed.
function scoreOf(power: PowerType): number {
  const s = props.assessments[power]?.score
  return typeof s === 'number' ? Math.min(100, Math.max(0, s)) : 0
}

const isTopPower = (power: PowerType) =>
  Array.isArray(props.topPowers) && props.topPowers.includes(power)

// Pre-computed geometry.
const axes = computed(() =>
  POWERS.map((power, i) => {
    const angle = axisAngleDeg(i)
    const end = polar(angle, RING_MAX.value)
    const label = polar(angle, LABEL_R.value)
    const score = scoreOf(power)
    const scorePoint = polar(angle, (score / 100) * RING_MAX.value)
    // Anchor labels based on side they're on.
    const labelAnchor: 'start' | 'middle' | 'end' =
      label.x < -5 ? 'end' : label.x > 5 ? 'start' : 'middle'
    return { power, angle, end, label, score, scorePoint, labelAnchor }
  })
)

const polygonPoints = computed(() =>
  axes.value.map((a) => `${a.scorePoint.x.toFixed(2)},${a.scorePoint.y.toFixed(2)}`).join(' ')
)

// Concentric grid: 25, 50, 75, 100 — visual reference for scoring.
const gridRings = computed(() => [25, 50, 75, 100].map((v) => (v / 100) * RING_MAX.value))

const GLYPHS: Record<PowerType, string> = {
  scale: '⬡',
  network: '◉',
  counter: '⇄',
  switching: '◈',
  branding: '✦',
  cornered: '△',
  process: '⚖'
}
</script>

<template>
  <div class="flex justify-center">
    <svg
      :viewBox="`-${HALF} -${HALF} ${SIZE} ${SIZE}`"
      :width="SIZE"
      :height="SIZE"
      role="img"
      :aria-label="t('synthesis.radarAriaLabel')"
      class="overflow-visible"
    >
      <!-- Concentric grid -->
      <g class="text-border-subtle" stroke="currentColor" stroke-width="0.5" fill="none">
        <circle
          v-for="r in gridRings"
          :key="r"
          cx="0"
          cy="0"
          :r="r"
          :stroke-dasharray="r === RING_MAX ? '0' : '2 3'"
          opacity="0.8"
        />
      </g>

      <!-- Axis lines -->
      <g class="text-border-accent" stroke="currentColor" stroke-width="0.5">
        <line
          v-for="a in axes"
          :key="`axis-${a.power}`"
          x1="0"
          y1="0"
          :x2="a.end.x"
          :y2="a.end.y"
        />
      </g>

      <!-- Score polygon (blue) -->
      <polygon
        :points="polygonPoints"
        fill="rgba(55, 138, 221, 0.18)"
        stroke="#378ADD"
        stroke-width="1.5"
        stroke-linejoin="round"
      />

      <!-- Score dots — gold for top Powers, blue otherwise.
           Top dots get a subtle gold halo (concentric outer circle at low
           opacity) instead of a hard stroke — softer, more designed. -->
      <g>
        <template v-for="a in axes" :key="`dot-${a.power}`">
          <!-- Halo for top-3 only -->
          <circle
            v-if="isTopPower(a.power)"
            :cx="a.scorePoint.x"
            :cy="a.scorePoint.y"
            r="7"
            fill="#EF9F27"
            opacity="0.22"
          />
          <circle
            :cx="a.scorePoint.x"
            :cy="a.scorePoint.y"
            :r="isTopPower(a.power) ? 4 : 2.5"
            :fill="isTopPower(a.power) ? '#F5B450' : '#378ADD'"
          />
        </template>
      </g>

      <!-- Axis labels (Power name + glyph + score) -->
      <g v-if="!compact" class="text-ink-mid" font-family="Inter, system-ui, sans-serif" font-size="9">
        <g v-for="a in axes" :key="`label-${a.power}`">
          <text
            :x="a.label.x"
            :y="a.label.y - 5"
            :text-anchor="a.labelAnchor"
            fill="currentColor"
            font-size="11"
            font-weight="500"
          >
            <tspan :fill="isTopPower(a.power) ? '#F5B450' : '#5BA3E8'">{{ GLYPHS[a.power] }}</tspan>
            <tspan dx="3">{{ t(`powers.${a.power}`) }}</tspan>
          </text>
          <text
            :x="a.label.x"
            :y="a.label.y + 8"
            :text-anchor="a.labelAnchor"
            font-size="11"
            font-weight="600"
            class="tabular-nums"
            :fill="isTopPower(a.power) ? '#F5B450' : a.score > 0 ? '#f5f5f7' : '#52525b'"
          >
            {{ a.score > 0 ? `${Math.round(a.score)}/100` : '—' }}
          </text>
        </g>
      </g>

      <!-- Center dot -->
      <circle cx="0" cy="0" r="1.5" fill="#1f1f2e" />
    </svg>
  </div>
</template>
