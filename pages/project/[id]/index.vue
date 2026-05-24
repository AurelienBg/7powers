<script setup lang="ts">
import type { PowerType } from '~/types/database'
import { computeMarketAttractiveness, hasMinimumMarketData } from '~/utils/marketScore'
import { defensibilityBreakdown, topPowers as computeTopPowers } from '~/composables/useDefensibilityAnalysis'

definePageMeta({ layout: 'project' })

const { compute: computePowerScore, isComplete: isPowerComplete } = usePowerScore()

const { t } = useI18n()
const router = useRouter()
const localePath = useLocalePath()
const { currentProject, deleteProject, assessments } = useProject()

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
// 9 = Setup (always) + Market + 7 Powers. Synthesis is derivative.
const completedPowersCount = computed(() => {
  let n = 0
  for (const p of powers) {
    if (isPowerComplete(assessments.value[p]?.answers)) n += 1
  }
  return n
})

const completedCount = computed(() => {
  let done = 1 // Setup always done
  if (marketDone.value) done += 1
  done += completedPowersCount.value
  return done
})

const progressPercent = computed(() => Math.round((completedCount.value / 9) * 100))

// ============================================================
// Synthesis preview data
// ============================================================

const synthesisBreakdown = computed(() => {
  if (!currentProject.value) return null
  return defensibilityBreakdown(currentProject.value, assessments.value)
})

const top3 = computed(() => computeTopPowers(assessments.value, 3))
const top3PowerKeys = computed(() => top3.value.map((p) => p.power))

const hasAnyPowerScored = computed(() => completedPowersCount.value > 0)

// ============================================================
// Delete confirmation modal
// ============================================================

const showDeleteModal = ref(false)
function openDelete() { showDeleteModal.value = true }
function cancelDelete() { showDeleteModal.value = false }
function executeDelete() {
  if (!currentProject.value) return
  deleteProject(currentProject.value.local_id)
  showDeleteModal.value = false
  router.push(localePath('/'))
}
</script>

<template>
  <div v-if="currentProject" class="mx-auto max-w-7xl px-6 py-8 space-y-6">
    <!-- ====================================================== -->
    <!-- HEADER                                                  -->
    <!-- ====================================================== -->
    <header class="space-y-4">
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

      <p v-if="currentProject.description" class="text-ink-mid max-w-2xl text-sm">
        {{ currentProject.description }}
      </p>

      <!-- Progress bar -->
      <div class="space-y-1.5">
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

    <!-- ====================================================== -->
    <!-- 3-COLUMN LAYOUT — Setup | 7 Powers | Power Map           -->
    <!-- ====================================================== -->
    <div class="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_300px] gap-4 items-start">
      <!-- ──────────────────────────────────────────────────── -->
      <!-- LEFT COL — Setup                                      -->
      <!-- ──────────────────────────────────────────────────── -->
      <section class="space-y-3">
        <div class="space-y-0.5 px-1">
          <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('hub.section.setup') }}</h2>
          <p class="text-[11px] text-ink-low">{{ t('hub.section.setupSubtitleShort') }}</p>
        </div>

        <NuxtLink
          :to="localePath(`/project/${currentProject.local_id}/edit`)"
          class="card-hover p-3 flex items-center justify-between gap-2 border-accent-blue/40"
        >
          <div class="space-y-0.5 min-w-0 flex-1">
            <p class="text-[10px] uppercase tracking-wider text-ink-low">{{ t('hub.module0') }}</p>
            <p class="text-sm text-ink-high truncate">{{ currentProject.name }}</p>
          </div>
          <span class="text-xs text-gold-bright shrink-0">✓</span>
        </NuxtLink>

        <NuxtLink
          :to="localePath(`/project/${currentProject.local_id}/market`)"
          class="card-hover p-3 flex items-center justify-between gap-2"
          :class="marketDone ? 'border-accent-blue/40' : ''"
        >
          <div class="space-y-0.5 min-w-0 flex-1">
            <p class="text-[10px] uppercase tracking-wider text-ink-low">{{ t('hub.module1') }}</p>
            <p class="text-sm text-ink-high">TAM · SAM · SOM</p>
          </div>
          <span
            v-if="marketDone"
            class="text-sm tabular-nums shrink-0"
            :class="marketScore >= 70 ? 'text-gold-bright' : 'text-accent-blue-bright'"
          >
            {{ marketScore }}
          </span>
          <span v-else class="text-xs text-ink-mid shrink-0">→</span>
        </NuxtLink>
      </section>

      <!-- ──────────────────────────────────────────────────── -->
      <!-- CENTER COL — The 7 Powers (vertical list)             -->
      <!-- ──────────────────────────────────────────────────── -->
      <section class="space-y-3">
        <div class="flex items-baseline justify-between gap-3 px-1">
          <div class="space-y-0.5">
            <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('hub.section.powers') }}</h2>
            <p class="text-[11px] text-ink-low">{{ t('hub.section.powersSubtitleShort') }}</p>
          </div>
          <p class="text-xs tabular-nums shrink-0">
            <span :class="completedPowersCount === 7 ? 'text-gold-bright' : 'text-ink-high'">
              {{ completedPowersCount }}
            </span>
            <span class="text-ink-low">/ 7</span>
          </p>
        </div>

        <div class="space-y-1.5">
          <NuxtLink
            v-for="(power, idx) in powers"
            :key="power"
            :to="localePath(`/project/${currentProject.local_id}/power/${power}`)"
            class="card-hover p-3 flex items-center gap-3 group"
            :class="isPowerComplete(assessments[power]?.answers) ? 'border-accent-blue/40' : ''"
          >
            <span class="text-[10px] text-ink-low font-mono tabular-nums w-5 shrink-0">
              {{ String(idx + 1).padStart(2, '0') }}
            </span>
            <span class="glyph text-base text-accent-blue-bright shrink-0">{{ t(`powerGlyphs.${power}`) }}</span>
            <span class="text-sm font-medium text-ink-high flex-1 truncate">{{ t(`powers.${power}`) }}</span>
            <span
              v-if="isPowerComplete(assessments[power]?.answers)"
              class="text-sm tabular-nums shrink-0"
              :class="computePowerScore(assessments[power]?.answers) >= 70 ? 'text-gold-bright' : 'text-accent-blue-bright'"
            >
              {{ computePowerScore(assessments[power]?.answers) }}
            </span>
            <span v-else class="text-xs text-ink-mid shrink-0 group-hover:text-ink-high transition-colors">→</span>
          </NuxtLink>
        </div>
      </section>

      <!-- ──────────────────────────────────────────────────── -->
      <!-- RIGHT COL — Power Map preview                         -->
      <!-- ──────────────────────────────────────────────────── -->
      <section class="space-y-3">
        <div class="space-y-0.5 px-1">
          <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('hub.section.synthesis') }}</h2>
          <p class="text-[11px] text-ink-low">{{ t('hub.section.synthesisSubtitleShort') }}</p>
        </div>

        <NuxtLink
          :to="localePath(`/project/${currentProject.local_id}/synthesis`)"
          class="card-hover p-4 block border-gold/40 hover:shadow-glow-gold space-y-3"
        >
          <!-- Mini radar centered -->
          <div class="flex justify-center">
            <PowerRadar
              v-if="hasAnyPowerScored"
              :assessments="assessments"
              :top-powers="top3PowerKeys"
              :size="180"
              compact
            />
            <div
              v-else
              class="w-[180px] h-[180px] rounded-full border-2 border-dashed border-border-subtle
                     flex items-center justify-center text-ink-low"
            >
              <span class="glyph text-3xl">✦</span>
            </div>
          </div>

          <!-- Defensibility centered below radar -->
          <div v-if="synthesisBreakdown" class="text-center space-y-0.5">
            <div class="flex items-baseline justify-center gap-1">
              <span
                class="text-3xl font-semibold tabular-nums"
                :class="synthesisBreakdown.defensibility >= 70 ? 'text-gold-bright' : 'text-accent-blue-bright'"
              >
                {{ synthesisBreakdown.defensibility }}
              </span>
              <span class="text-xs text-ink-low">/100</span>
            </div>
            <p class="text-[10px] uppercase tracking-widest text-ink-mid">
              {{ t('synthesis.defensibilityHeading') }}
            </p>
          </div>
          <p v-else class="text-xs text-ink-mid text-center">{{ t('hub.synthesisCardEmpty') }}</p>

          <!-- Top 3 stacked -->
          <div v-if="top3.length > 0" class="space-y-1 pt-2 border-t border-border-subtle">
            <p class="text-[10px] uppercase tracking-widest text-ink-low text-center mb-1.5">
              {{ t('synthesis.topPowersHeading') }}
            </p>
            <div
              v-for="(entry, idx) in top3"
              :key="entry.power"
              class="flex items-center gap-2 text-xs"
            >
              <span
                class="glyph text-sm shrink-0"
                :class="idx === 0 ? 'text-gold-bright' : 'text-accent-blue-bright'"
              >
                {{ t(`powerGlyphs.${entry.power}`) }}
              </span>
              <span
                class="flex-1 truncate"
                :class="idx === 0 ? 'text-ink-high font-medium' : 'text-ink-mid'"
              >
                {{ t(`powers.${entry.power}`) }}
              </span>
              <span class="text-ink-low tabular-nums">{{ Math.round(entry.score) }}</span>
            </div>
          </div>

          <!-- CTA -->
          <div class="text-center pt-1">
            <span class="inline-flex items-center gap-1 text-xs font-medium text-gold-bright">
              {{ t('hub.synthesisCardCta') }} <span>→</span>
            </span>
          </div>
        </NuxtLink>
      </section>
    </div>

    <!-- ====================================================== -->
    <!-- DANGER ZONE                                             -->
    <!-- ====================================================== -->
    <section class="pt-6 border-t border-border-subtle">
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
