<script setup lang="ts">
/**
 * Examples library page.
 *
 * Surfaces the 12 canonical cases from utils/examplesLibrary.ts with two
 * filters: by dominant Power (the primary lens — Helmer-aligned) and by
 * sector. Cards are clickable to expand and reveal the per-Power score
 * breakdown plus a context paragraph in the user's locale.
 *
 * Cross-referenced from pages/learn.vue (the conceptual material) — this
 * page is the *applied* counterpart: "now you know the 7 Powers, here's
 * how they show up in real companies."
 */
import { EXAMPLES_LIBRARY, EXAMPLE_SECTORS, SECTOR_LABEL_KEYS } from '~/utils/examplesLibrary'
import type { ExampleCase, ExampleSector } from '~/utils/examplesLibrary'
import type { PowerType } from '~/types/database'

const { t, locale } = useI18n()
const localePath = useLocalePath()

// ============================================================
// Filters
// ============================================================
const POWERS: PowerType[] = ['scale', 'network', 'counter', 'switching', 'branding', 'cornered', 'process']

const activePower = ref<PowerType | 'all'>('all')
const activeSector = ref<ExampleSector | 'all'>('all')

const filtered = computed<ExampleCase[]>(() =>
  EXAMPLES_LIBRARY.filter((c) => {
    if (activePower.value !== 'all' && c.dominantPower !== activePower.value) return false
    if (activeSector.value !== 'all' && c.sector !== activeSector.value) return false
    return true
  })
)

// ============================================================
// Expand state
// ============================================================
const expanded = ref<Record<string, boolean>>({})
function toggle(id: string) {
  expanded.value[id] = !expanded.value[id]
}

// ============================================================
// Helpers
// ============================================================
function localized<T extends { fr: string; en: string }>(s: T): string {
  return locale.value === 'fr' ? s.fr : s.en
}

/** Tailwind tone for a score (matches the rest of the app). */
function scoreTone(score: number): string {
  if (score >= 70) return 'text-gold-bright'
  if (score >= 40) return 'text-accent-blue-bright'
  return 'text-ink-low'
}

/** Width % for the score bar in the expanded breakdown. */
function scoreWidth(score: number): string {
  return `${Math.max(2, Math.min(100, score))}%`
}
</script>

<template>
  <!-- max-w-4xl matches /learn (the paired methodology page). Examples
       are conceptually the "applied" counterpart to /learn's theory, so
       they should share the same reading rhythm. Cards grid drops to 2
       columns max at this width so they stay readable. -->
  <main class="mx-auto max-w-4xl px-6 py-16">
    <!-- Header — same pattern as /learn's hero: logo top-left + eyebrow,
         then title + subtitle. Keeps brand identity consistent. -->
    <div class="space-y-4 mb-10">
      <div class="flex items-center gap-3 text-ink-mid">
        <Logo :size="40" />
        <span class="tracking-widest text-xs uppercase text-accent-blue-bright">
          {{ t('examples.eyebrow') }}
        </span>
      </div>
      <h1 class="text-3xl md:text-4xl font-semibold text-ink-high">{{ t('examples.title') }}</h1>
      <p class="text-ink-mid max-w-2xl">{{ t('examples.subtitle') }}</p>
    </div>

    <!-- Filters -->
    <div class="space-y-3 mb-8">
      <!-- Power filter — label on its own line, buttons on a single
           horizontal row below. shrink-0 on buttons + overflow-x-auto on
           the row ensures all 8 (All + 7 Powers) fit on ONE line on any
           viewport; narrow screens get horizontal scroll instead of wrap. -->
      <div class="space-y-1.5">
        <span class="block text-[10px] uppercase tracking-widest text-ink-low">
          {{ t('examples.filterPower') }}
        </span>
        <div class="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
          <button
            type="button"
            class="shrink-0 text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap"
            :class="activePower === 'all'
              ? 'border-accent-blue text-ink-high bg-accent-blue/10'
              : 'border-border-subtle text-ink-mid hover:text-ink-high hover:border-accent-blue/50'"
            @click="activePower = 'all'"
          >
            {{ t('examples.filterAll') }}
          </button>
          <button
            v-for="p in POWERS"
            :key="p"
            type="button"
            class="shrink-0 text-xs px-2.5 py-1 rounded-md border inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            :class="activePower === p
              ? 'border-accent-blue text-ink-high bg-accent-blue/10'
              : 'border-border-subtle text-ink-mid hover:text-ink-high hover:border-accent-blue/50'"
            @click="activePower = p"
          >
            <span class="glyph text-accent-blue-bright">{{ t(`powerGlyphs.${p}`) }}</span>
            <span>{{ t(`powers.${p}`) }}</span>
          </button>
        </div>
      </div>

      <!-- Sector filter — same layout as the Power row for consistency -->
      <div class="space-y-1.5">
        <span class="block text-[10px] uppercase tracking-widest text-ink-low">
          {{ t('examples.filterSector') }}
        </span>
        <div class="flex items-center gap-2 overflow-x-auto pb-1 -mb-1">
          <button
            type="button"
            class="shrink-0 text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap"
            :class="activeSector === 'all'
              ? 'border-accent-blue text-ink-high bg-accent-blue/10'
              : 'border-border-subtle text-ink-mid hover:text-ink-high hover:border-accent-blue/50'"
            @click="activeSector = 'all'"
          >
            {{ t('examples.filterAll') }}
          </button>
          <button
            v-for="s in EXAMPLE_SECTORS"
            :key="s"
            type="button"
            class="shrink-0 text-xs px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap"
            :class="activeSector === s
              ? 'border-accent-blue text-ink-high bg-accent-blue/10'
              : 'border-border-subtle text-ink-mid hover:text-ink-high hover:border-accent-blue/50'"
            @click="activeSector = s"
          >
            {{ t(SECTOR_LABEL_KEYS[s]) }}
          </button>
        </div>
      </div>

      <p class="text-xs text-ink-low">
        {{ t('examples.count', { n: filtered.length, total: EXAMPLES_LIBRARY.length }) }}
      </p>
    </div>

    <!-- Empty state -->
    <div
      v-if="filtered.length === 0"
      class="card p-8 text-center text-ink-mid"
    >
      {{ t('examples.noResults') }}
    </div>

    <!-- Cards grid — capped at 2 cols to keep cards readable inside the
         narrower max-w-4xl container (was 3 cols at max-w-6xl). -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <article
        v-for="ex in filtered"
        :key="ex.id"
        class="card p-5 space-y-3 cursor-pointer hover:border-accent-blue/50 transition-colors"
        @click="toggle(ex.id)"
      >
        <!-- Header: name + dominant Power glyph -->
        <div class="flex items-start justify-between gap-2">
          <div class="space-y-1 min-w-0">
            <h2 class="text-lg font-semibold text-ink-high truncate">{{ ex.name }}</h2>
            <div class="flex items-center gap-1.5 flex-wrap text-[10px] uppercase tracking-wider">
              <span class="text-ink-low">{{ t(SECTOR_LABEL_KEYS[ex.sector]) }}</span>
              <span class="text-ink-low">·</span>
              <span class="text-ink-low">{{ t(`stages.${ex.stage}`) }}</span>
            </div>
          </div>
          <div class="text-right shrink-0">
            <span class="glyph text-2xl text-gold-bright leading-none">{{ t(`powerGlyphs.${ex.dominantPower}`) }}</span>
            <p class="text-[10px] uppercase tracking-wider text-ink-low mt-0.5">
              {{ t(`powers.${ex.dominantPower}`) }}
            </p>
          </div>
        </div>

        <!-- Benefit + Barrier (Helmer's mandatory pair) -->
        <div class="space-y-2 pt-2 border-t border-border-subtle">
          <div>
            <p class="text-[10px] uppercase tracking-widest text-accent-blue-bright">{{ t('examples.benefitLabel') }}</p>
            <p class="text-sm text-ink-high leading-snug mt-0.5">{{ localized(ex.benefit) }}</p>
          </div>
          <div>
            <p class="text-[10px] uppercase tracking-widest text-gold-bright">{{ t('examples.barrierLabel') }}</p>
            <p class="text-sm text-ink-high leading-snug mt-0.5">{{ localized(ex.barrier) }}</p>
          </div>
        </div>

        <!-- Expand toggle -->
        <button
          type="button"
          class="w-full text-xs text-ink-mid hover:text-ink-high inline-flex items-center justify-center gap-1.5 pt-1 transition-colors"
          @click.stop="toggle(ex.id)"
        >
          <span>{{ expanded[ex.id] ? t('examples.collapse') : t('examples.expand') }}</span>
          <span class="glyph">{{ expanded[ex.id] ? '▴' : '▾' }}</span>
        </button>

        <!-- Expanded section: per-Power scores + context -->
        <div v-if="expanded[ex.id]" class="space-y-3 pt-2 border-t border-border-subtle">
          <!-- Per-Power scores as horizontal bars -->
          <div class="space-y-1.5">
            <p class="text-[10px] uppercase tracking-widest text-ink-low">{{ t('examples.scoresLabel') }}</p>
            <div
              v-for="p in POWERS"
              :key="p"
              class="flex items-center gap-2 text-xs"
            >
              <span class="glyph text-ink-mid w-4 shrink-0">{{ t(`powerGlyphs.${p}`) }}</span>
              <span class="text-ink-mid w-24 shrink-0 truncate">{{ t(`powers.${p}`) }}</span>
              <div class="flex-1 h-1.5 bg-bg-elevated rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all"
                  :class="ex.scores[p] >= 70 ? 'bg-gold-bright' : ex.scores[p] >= 40 ? 'bg-accent-blue-bright' : 'bg-ink-low/40'"
                  :style="{ width: scoreWidth(ex.scores[p]) }"
                />
              </div>
              <span
                class="w-8 text-right tabular-nums shrink-0"
                :class="scoreTone(ex.scores[p])"
              >{{ ex.scores[p] }}</span>
            </div>
          </div>

          <!-- Context paragraph -->
          <div class="space-y-1">
            <p class="text-[10px] uppercase tracking-widest text-ink-low">{{ t('examples.contextLabel') }}</p>
            <p class="text-sm text-ink-mid leading-relaxed">{{ localized(ex.context) }}</p>
          </div>

          <!-- Optional reference link -->
          <a
            v-if="ex.url"
            :href="ex.url"
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-accent-blue-bright hover:text-accent-blue inline-flex items-center gap-1"
            @click.stop
          >
            <span>{{ t('examples.referenceLink') }}</span>
            <span class="glyph">↗</span>
          </a>
        </div>
      </article>
    </div>

    <!-- Footer CTAs back to /learn and /dashboard -->
    <div class="mt-12 grid grid-cols-1 md:grid-cols-2 gap-3">
      <NuxtLink
        :to="localePath('/learn')"
        class="card p-5 hover:border-accent-blue/50 transition-colors flex items-center justify-between gap-3"
      >
        <div>
          <p class="text-[10px] uppercase tracking-widest text-accent-blue-bright">{{ t('examples.footerLearnEyebrow') }}</p>
          <p class="text-sm text-ink-high mt-0.5">{{ t('examples.footerLearnCta') }}</p>
        </div>
        <span class="glyph text-xl text-ink-mid">→</span>
      </NuxtLink>
      <NuxtLink
        :to="localePath('/dashboard')"
        class="card p-5 hover:border-accent-blue/50 transition-colors flex items-center justify-between gap-3"
      >
        <div>
          <p class="text-[10px] uppercase tracking-widest text-gold-bright">{{ t('examples.footerAssessEyebrow') }}</p>
          <p class="text-sm text-ink-high mt-0.5">{{ t('examples.footerAssessCta') }}</p>
        </div>
        <span class="glyph text-xl text-ink-mid">→</span>
      </NuxtLink>
    </div>
  </main>
</template>
