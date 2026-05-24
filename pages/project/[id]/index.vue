<script setup lang="ts">
import type { PowerType, LocalPowerAssessment } from '~/types/database'
import { computeMarketAttractiveness, hasMinimumMarketData } from '~/utils/marketScore'

definePageMeta({ layout: 'project' })

const { compute: computePowerScore, isComplete: isPowerComplete } = usePowerScore()

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const { currentProject, deleteProject, assessments } = useProject()

// All 7 Powers unlocked as of Phase 2.
const IMPLEMENTED_POWERS: PowerType[] = [
  'scale',
  'network',
  'counter',
  'switching',
  'branding',
  'cornered',
  'process'
]

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

const projectInitial = computed(() => currentProject.value?.name.charAt(0).toUpperCase() ?? '·')

// Progress = how many of the 9 modules are completed
// 9 = Module 0 (always done since project exists) + Module 1 (market) + 7 Powers
// (Module 9 Synthesis isn't counted as completable — it's a derivative view)
const completedCount = computed(() => {
  let done = 1 // Module 0 always done
  if (marketDone.value) done += 1
  for (const p of powers) {
    if (isPowerComplete(assessments.value[p]?.answers)) done += 1
  }
  return done
})

const progressPercent = computed(() => Math.round((completedCount.value / 9) * 100))

// ============================================================
// Delete confirmation modal
// ============================================================

const showDeleteModal = ref(false)

function openDelete() {
  showDeleteModal.value = true
}

function cancelDelete() {
  showDeleteModal.value = false
}

function executeDelete() {
  if (!currentProject.value) return
  deleteProject(currentProject.value.local_id)
  showDeleteModal.value = false
  router.push(localePath('/'))
}
</script>

<template>
  <div v-if="currentProject" class="mx-auto max-w-5xl px-6 py-10 space-y-10">
    <!-- Project header -->
    <header class="space-y-5">
      <div class="flex items-start gap-4">
        <div
          class="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-semibold shrink-0
                 bg-gradient-to-br from-accent-blue/40 to-accent-blue-glow/40
                 text-ink-high"
        >
          {{ projectInitial }}
        </div>
        <div class="space-y-1.5 flex-1 min-w-0">
          <h1 class="text-3xl font-semibold text-ink-high break-words">{{ currentProject.name }}</h1>
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bg-elevated text-ink-mid border border-border-subtle">
              {{ t(`sectors.${currentProject.sector}`) }}
            </span>
            <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bg-elevated text-ink-mid border border-border-subtle">
              {{ t(`stages.${currentProject.stage}`) }}
            </span>
          </div>
        </div>
        <NuxtLink
          :to="localePath(`/project/${currentProject.local_id}/edit`)"
          class="btn-ghost !py-1.5 !px-3 text-xs inline-flex items-center gap-1.5 shrink-0"
          :title="t('hub.editProject')"
        >
          <span class="glyph">✎</span>
          <span>{{ t('hub.editProject') }}</span>
        </NuxtLink>
      </div>

      <p v-if="currentProject.description" class="text-ink-mid max-w-2xl">
        {{ currentProject.description }}
      </p>

      <!-- Progress bar -->
      <div class="space-y-2">
        <div class="flex items-baseline justify-between">
          <p class="text-[10px] uppercase tracking-widest text-ink-mid">{{ t('hub.progressLabel') }}</p>
          <p class="text-xs text-ink-mid tabular-nums">{{ completedCount }} / 9</p>
        </div>
        <div class="h-1.5 rounded-full bg-bg-elevated overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-300"
            :class="progressPercent >= 70 ? 'bg-gold-bright' : 'bg-accent-blue'"
            :style="{ width: `${progressPercent}%` }"
          />
        </div>
      </div>
    </header>

    <!-- Modules grid -->
    <section class="space-y-4">
      <h2 class="text-xs uppercase tracking-widest text-ink-mid">
        {{ t('hub.modulesHeading') }}
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <!-- Setup (no number) -->
        <NuxtLink
          :to="localePath(`/project/${currentProject.local_id}/edit`)"
          class="card-hover p-5 space-y-3 block border-accent-blue/50"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-wider text-ink-low">{{ t('hub.setupLabel') }}</span>
            <span class="text-xs uppercase tracking-wider text-gold-bright">
              ✓ {{ t('hub.done') }} · {{ t('hub.editProject') }}
            </span>
          </div>
          <h3 class="text-base font-medium text-ink-high">{{ t('hub.module0') }}</h3>
          <p class="text-xs text-ink-mid">{{ currentProject.name }}</p>
        </NuxtLink>

        <!-- Market sizing (no number) -->
        <NuxtLink
          :to="localePath(`/project/${currentProject.local_id}/market`)"
          class="card-hover p-5 space-y-3 block"
          :class="marketDone ? 'border-accent-blue/50' : ''"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-wider text-ink-low">{{ t('hub.setupLabel') }}</span>
            <span
              v-if="marketDone"
              class="text-xs uppercase tracking-wider tabular-nums"
              :class="marketScore >= 70 ? 'text-gold-bright' : 'text-accent-blue-bright'"
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

        <!-- 7 Powers numbered 01-07 -->
        <template v-for="(power, idx) in powers" :key="power">
          <NuxtLink
            v-if="IMPLEMENTED_POWERS.includes(power)"
            :to="localePath(`/project/${currentProject.local_id}/power/${power}`)"
            class="card-hover p-5 space-y-3 block"
            :class="isPowerComplete(assessments[power]?.answers) ? 'border-accent-blue/50' : ''"
          >
            <div class="flex items-center justify-between">
              <span class="text-xs text-ink-low font-mono">{{ String(idx + 1).padStart(2, '0') }}</span>
              <span
                v-if="isPowerComplete(assessments[power]?.answers)"
                class="text-xs uppercase tracking-wider tabular-nums"
                :class="computePowerScore(assessments[power]?.answers) >= 70 ? 'text-gold-bright' : 'text-accent-blue-bright'"
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
              <span class="text-xs text-ink-low font-mono">{{ String(idx + 1).padStart(2, '0') }}</span>
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

        <!-- Synthesis (no number) -->
        <NuxtLink
          :to="localePath(`/project/${currentProject.local_id}/synthesis`)"
          class="card-hover p-5 space-y-3 block border-gold/30"
        >
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-wider text-ink-low">{{ t('hub.synthesisLabel') }}</span>
            <span class="text-xs uppercase tracking-wider text-gold-bright">
              {{ t('hub.openModule') }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="glyph text-lg text-gold-bright">✦</span>
            <h3 class="text-base font-medium text-ink-high">{{ t('hub.moduleSynthesis') }}</h3>
          </div>
          <p class="text-xs text-ink-mid">{{ t('hub.synthesisSubtitle') }}</p>
        </NuxtLink>
      </div>
    </section>

    <!-- Danger zone -->
    <section class="pt-8 border-t border-border-subtle">
      <button
        type="button"
        class="text-xs text-ink-low hover:text-red-400 transition-colors"
        @click="openDelete"
      >
        {{ t('hub.resetProject') }}
      </button>
    </section>

    <!-- Delete confirmation modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm"
        @click.self="cancelDelete"
      >
        <div class="card p-6 max-w-md w-full space-y-4">
          <h3 class="text-lg font-semibold text-ink-high">{{ t('dashboard.deleteConfirmTitle') }}</h3>
          <p class="text-sm text-ink-mid">
            {{ t('dashboard.deleteConfirmBody', { name: currentProject.name }) }}
          </p>
          <div class="flex items-center justify-end gap-2 pt-2">
            <button type="button" class="btn-ghost !py-2 !px-4 text-sm" @click="cancelDelete">
              {{ t('dashboard.deleteCancel') }}
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center px-4 py-2 rounded-lg
                     bg-red-500/90 text-white text-sm font-medium
                     hover:bg-red-500 transition-colors"
              @click="executeDelete"
            >
              {{ t('dashboard.deleteConfirm') }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
