<script setup lang="ts">
import type { PowerType } from '~/types/database'
import {
  defensibilityBreakdown,
  topPowers,
  detectRedFlags,
  stageFitFor,
  rankedPowers
} from '~/composables/useDefensibilityAnalysis'

definePageMeta({ layout: 'project' })

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const { currentProject, assessments } = useProject()

// Reactive derivations
const breakdown = computed(() => {
  if (!currentProject.value) return null
  return defensibilityBreakdown(currentProject.value, assessments.value)
})

const top3 = computed(() => topPowers(assessments.value, 3))

const top3Powers = computed(() => top3.value.map((p) => p.power))

const redFlags = computed(() => {
  if (!currentProject.value) return []
  return detectRedFlags(currentProject.value, assessments.value)
})

const ranked = computed(() => rankedPowers(assessments.value))

// Stage fit table — show each Power vs the project's S-Curve stage
const stageFitTable = computed(() => {
  const stage = currentProject.value?.stage
  if (!stage) return []
  const allPowers: PowerType[] = [
    'scale', 'network', 'counter', 'switching', 'branding', 'cornered', 'process'
  ]
  return allPowers.map((p) => {
    const score = assessments.value[p]?.score ?? null
    const fit = stageFitFor(p, stage)
    return { power: p, score, fit }
  })
})

const hasAnyAssessment = computed(() =>
  Object.values(assessments.value).some((a) => a && typeof a.score === 'number')
)
</script>

<template>
  <div v-if="currentProject" class="mx-auto max-w-6xl px-6 py-10 space-y-10">
    <!-- Header -->
    <header class="space-y-2">
      <p class="text-xs uppercase tracking-widest text-accent-blue-bright">{{ t('synthesis.step') }}</p>
      <h1 class="text-3xl font-semibold text-ink-high">{{ t('synthesis.title') }}</h1>
      <p class="text-ink-mid max-w-2xl">{{ t('synthesis.subtitle') }}</p>
    </header>

    <!-- Empty state -->
    <section v-if="!hasAnyAssessment" class="card p-10 text-center space-y-3">
      <span class="glyph text-4xl text-ink-low">✦</span>
      <h2 class="text-lg font-medium text-ink-high">{{ t('synthesis.emptyTitle') }}</h2>
      <p class="text-sm text-ink-mid max-w-md mx-auto">{{ t('synthesis.emptyBody') }}</p>
      <div class="pt-3">
        <NuxtLink :to="localePath(`/project/${route.params.id}`)" class="btn-primary !px-5 !py-2.5">
          {{ t('synthesis.emptyCta') }}
        </NuxtLink>
      </div>
    </section>

    <template v-else>
      <!-- Radar + Defensibility (two-column on lg+) -->
      <section class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-6">
          <p class="text-xs uppercase tracking-widest text-ink-mid mb-4">
            {{ t('synthesis.radarHeading') }}
          </p>
          <PowerRadar
            :assessments="assessments"
            :top-powers="top3Powers"
            :size="380"
          />
        </div>

        <DefensibilityScore :breakdown="breakdown" />
      </section>

      <!-- Top Powers -->
      <section class="space-y-4">
        <div class="space-y-1">
          <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('synthesis.topPowersHeading') }}</h2>
          <p class="text-xs text-ink-low max-w-2xl">{{ t('synthesis.topPowersSubtitle') }}</p>
        </div>
        <div v-if="top3.length > 0" class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <NuxtLink
            v-for="(entry, idx) in top3"
            :key="entry.power"
            :to="localePath(`/project/${currentProject.local_id}/power/${entry.power}`)"
            class="card-hover p-5 space-y-3 block"
            :class="idx === 0 ? 'border-gold/40 hover:border-gold-bright shadow-glow-gold' : ''"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs text-ink-low font-mono tabular-nums">#{{ idx + 1 }}</span>
              <span
                class="text-sm font-semibold tabular-nums"
                :class="idx === 0 ? 'text-gold-bright' : 'text-accent-blue-bright'"
              >
                {{ Math.round(entry.score) }}/100
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span
                class="glyph text-2xl"
                :class="idx === 0 ? 'text-gold-bright' : 'text-accent-blue-bright'"
              >
                {{ t(`powerGlyphs.${entry.power}`) }}
              </span>
              <h3 class="text-base font-medium text-ink-high">{{ t(`powers.${entry.power}`) }}</h3>
            </div>
            <p
              v-if="assessments[entry.power]?.answers?.benefit"
              class="text-xs text-ink-mid line-clamp-2"
            >
              {{ assessments[entry.power]?.answers?.benefit }}
            </p>
          </NuxtLink>
        </div>
        <p v-else class="text-sm text-ink-low">{{ t('synthesis.noPowersYet') }}</p>
      </section>

      <!-- Red flags -->
      <section v-if="redFlags.length > 0" class="space-y-4">
        <div class="space-y-1">
          <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('synthesis.redFlagsHeading') }}</h2>
          <p class="text-xs text-ink-low max-w-2xl">{{ t('synthesis.redFlagsSubtitle') }}</p>
        </div>
        <div class="space-y-2">
          <div
            v-for="flag in redFlags"
            :key="flag.id"
            class="card p-4 flex items-start gap-3"
            :class="flag.severity === 'critical'
              ? 'border-red-500/30 bg-red-500/5'
              : 'border-amber-500/30 bg-amber-500/5'"
          >
            <span
              class="glyph text-base shrink-0 mt-0.5"
              :class="flag.severity === 'critical' ? 'text-red-400' : 'text-amber-400'"
            >
              {{ flag.severity === 'critical' ? '⚠' : '!' }}
            </span>
            <div class="space-y-0.5 flex-1 min-w-0">
              <p class="text-sm font-medium text-ink-high">
                {{ t(`synthesis.redFlags.${flag.i18nKey}.title`, flag.power ? { power: t(`powers.${flag.power}`) } : {}) }}
              </p>
              <p class="text-xs text-ink-mid">
                {{ t(`synthesis.redFlags.${flag.i18nKey}.body`, flag.power ? { power: t(`powers.${flag.power}`) } : {}) }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Stage fit table -->
      <section class="space-y-4">
        <div class="space-y-1">
          <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('synthesis.stageFitHeading') }}</h2>
          <p class="text-xs text-ink-low max-w-2xl">
            {{ t('synthesis.stageFitSubtitle', { stage: t(`stages.${currentProject.stage}`) }) }}
          </p>
        </div>
        <div class="card p-5">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-3">
            <div
              v-for="row in stageFitTable"
              :key="row.power"
              class="space-y-2 text-center"
            >
              <div class="flex flex-col items-center gap-1">
                <span
                  class="glyph text-2xl"
                  :class="row.fit === 'expected' ? 'text-accent-blue-bright' : 'text-ink-low'"
                >
                  {{ t(`powerGlyphs.${row.power}`) }}
                </span>
                <p class="text-[10px] uppercase tracking-wider text-ink-mid">
                  {{ t(`powers.${row.power}`) }}
                </p>
              </div>
              <div class="space-y-0.5">
                <p
                  v-if="row.score !== null"
                  class="text-sm font-medium tabular-nums"
                  :class="row.fit === 'expected' ? 'text-ink-high' : 'text-ink-mid'"
                >
                  {{ Math.round(row.score) }}
                </p>
                <p v-else class="text-sm text-ink-low">—</p>
                <p
                  class="text-[10px] uppercase tracking-wider"
                  :class="row.fit === 'expected' ? 'text-accent-blue-bright' : 'text-amber-400'"
                >
                  {{ row.fit === 'expected' ? t('synthesis.stageFit.expected') : t('synthesis.stageFit.mismatch') }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- All Powers ranked (full table) -->
      <section v-if="ranked.length > 3" class="space-y-4">
        <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('synthesis.allRankedHeading') }}</h2>
        <div class="card divide-y divide-border-subtle">
          <NuxtLink
            v-for="(entry, idx) in ranked"
            :key="entry.power"
            :to="localePath(`/project/${currentProject.local_id}/power/${entry.power}`)"
            class="flex items-center gap-3 px-5 py-3 hover:bg-bg-card transition-colors"
          >
            <span class="text-xs text-ink-low font-mono tabular-nums w-6">#{{ idx + 1 }}</span>
            <span class="glyph text-lg text-accent-blue-bright shrink-0">{{ t(`powerGlyphs.${entry.power}`) }}</span>
            <span class="text-sm text-ink-high flex-1">{{ t(`powers.${entry.power}`) }}</span>
            <span class="text-sm tabular-nums text-ink-mid">{{ Math.round(entry.score) }}/100</span>
          </NuxtLink>
        </div>
      </section>
    </template>
  </div>
</template>
