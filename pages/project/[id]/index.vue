<script setup lang="ts">
import type { PowerType } from '~/types/database'
import { computeMarketAttractiveness, hasMinimumMarketData } from '~/utils/marketScore'

definePageMeta({ layout: 'project' })

const { compute: computePowerScore, isComplete: isPowerComplete } = usePowerScore()

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const { currentProject, deleteProject, assessments } = useProject()

// Layout already handles the URL ↔ store sync and the bouncing if the id is
// unknown. Below this line, we can assume currentProject is the right one.

// Phase 1 ships Scale Economies as the implemented Power template.
// The other 6 are stubbed as "coming soon" until Phase 2.
const IMPLEMENTED_POWERS: PowerType[] = ['scale']

const powers: PowerType[] = [
  'scale',
  'network',
  'counter',
  'switching',
  'branding',
  'cornered',
  'process'
]

const marketDone = computed(() =>
  !!currentProject.value && hasMinimumMarketData(currentProject.value.market_size)
)

const marketScore = computed(() => {
  if (!currentProject.value) return 0
  return computeMarketAttractiveness(currentProject.value.market_size)
})

function onResetProject() {
  if (!currentProject.value) return
  if (confirm(t('hub.resetConfirm'))) {
    deleteProject(currentProject.value.local_id)
    router.push(localePath('/'))
  }
}
</script>

<template>
  <main v-if="currentProject" class="mx-auto max-w-5xl px-6 py-12 space-y-12">
    <!-- Project header -->
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold text-ink-high">{{ currentProject.name }}</h1>
      <p class="text-sm text-ink-mid">
        <span>{{ t(`sectors.${currentProject.sector}`) }}</span>
        <span class="text-ink-low mx-2">·</span>
        <span>{{ t(`stages.${currentProject.stage}`) }}</span>
      </p>
      <p v-if="currentProject.description" class="text-ink-mid max-w-2xl pt-2">
        {{ currentProject.description }}
      </p>
    </header>

    <!-- Modules grid -->
    <section class="space-y-4">
      <h2 class="text-xs uppercase tracking-widest text-ink-mid">
        {{ t('hub.modulesHeading') }}
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Module 0: done -->
        <div class="card p-5 space-y-3 border-accent-blue/50">
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-low font-mono">00</span>
            <span class="text-xs uppercase tracking-wider text-accent-blue-bright">
              {{ t('hub.done') }}
            </span>
          </div>
          <h3 class="text-base font-medium text-ink-high">{{ t('hub.module0') }}</h3>
          <p class="text-xs text-ink-mid">{{ currentProject.name }}</p>
        </div>

        <!-- Module 1: market sizing -->
        <NuxtLink
          :to="localePath(`/project/${currentProject.local_id}/market`)"
          class="card-hover p-5 space-y-3 block"
          :class="marketDone ? 'border-accent-blue/50' : ''"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-low font-mono">01</span>
            <span
              v-if="marketDone"
              class="text-xs uppercase tracking-wider text-accent-blue-bright tabular-nums"
            >
              {{ marketScore }}/100
            </span>
            <span v-else class="text-xs uppercase tracking-wider text-ink-mid">
              {{ t('hub.openModule') }}
            </span>
          </div>
          <h3 class="text-base font-medium text-ink-high">{{ t('hub.module1') }}</h3>
          <p class="text-xs text-ink-mid">TAM · SAM · SOM</p>
        </NuxtLink>

        <!-- Modules 2-8: the 7 Powers (Scale implemented in Phase 1) -->
        <template v-for="(power, idx) in powers" :key="power">
          <NuxtLink
            v-if="IMPLEMENTED_POWERS.includes(power)"
            :to="localePath(`/project/${currentProject.local_id}/power/${power}`)"
            class="card-hover p-5 space-y-3 block"
            :class="isPowerComplete(assessments[power]?.answers) ? 'border-accent-blue/50' : ''"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs text-ink-low font-mono">{{ String(idx + 2).padStart(2, '0') }}</span>
              <span
                v-if="isPowerComplete(assessments[power]?.answers)"
                class="text-xs uppercase tracking-wider text-accent-blue-bright tabular-nums"
              >
                {{ computePowerScore(assessments[power]?.answers) }}/100
              </span>
              <span v-else class="text-xs uppercase tracking-wider text-ink-mid">
                {{ t('hub.openModule') }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="glyph text-lg text-accent-blue-bright">{{ t(`powerGlyphs.${power}`) }}</span>
              <h3 class="text-base font-medium text-ink-high">{{ t(`powers.${power}`) }}</h3>
            </div>
          </NuxtLink>

          <div v-else class="card p-5 space-y-3 opacity-60">
            <div class="flex items-center justify-between">
              <span class="text-xs text-ink-low font-mono">{{ String(idx + 2).padStart(2, '0') }}</span>
              <span class="text-xs uppercase tracking-wider text-ink-low">
                {{ t('hub.comingSoon') }}
              </span>
            </div>
            <div class="flex items-center gap-2">
              <span class="glyph text-lg text-accent-blue-bright">{{ t(`powerGlyphs.${power}`) }}</span>
              <h3 class="text-base font-medium text-ink-high">{{ t(`powers.${power}`) }}</h3>
            </div>
          </div>
        </template>

        <!-- Module 9: synthesis -->
        <div class="card p-5 space-y-3 opacity-60">
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-low font-mono">09</span>
            <span class="text-xs uppercase tracking-wider text-ink-low">
              {{ t('hub.comingSoon') }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="glyph text-lg text-gold-bright">✦</span>
            <h3 class="text-base font-medium text-ink-high">{{ t('hub.moduleSynthesis') }}</h3>
          </div>
        </div>
      </div>
    </section>

    <!-- Danger zone -->
    <section class="pt-8 border-t border-border-subtle">
      <button
        type="button"
        class="text-xs text-ink-low hover:text-red-400 transition-colors"
        @click="onResetProject"
      >
        {{ t('hub.resetProject') }}
      </button>
    </section>
  </main>
</template>
