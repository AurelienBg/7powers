<script setup lang="ts">
import type { PowerType, PowerAnswers, ActionItem, ProjectSector } from '~/types/database'

definePageMeta({ layout: 'project' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { currentProject, assessments, saveAssessment } = useProject()
const { compute, isComplete } = usePowerScore()

// ============================================================
// Routing guards
// ============================================================

const ALL_POWERS: PowerType[] = [
  'scale',
  'network',
  'counter',
  'switching',
  'branding',
  'cornered',
  'process'
]

const IMPLEMENTED_POWERS: PowerType[] = [
  'scale',
  'network',
  'counter',
  'switching',
  'branding',
  'cornered',
  'process'
]

const powerType = computed<PowerType | null>(() => {
  const t = route.params.type as string
  return ALL_POWERS.includes(t as PowerType) ? (t as PowerType) : null
})

if (!powerType.value) {
  await navigateTo(localePath(`/project/${route.params.id}`))
}
if (powerType.value && !IMPLEMENTED_POWERS.includes(powerType.value)) {
  await navigateTo(localePath(`/project/${route.params.id}`))
}

// ============================================================
// State
// ============================================================

const sector = computed<ProjectSector>(() => currentProject.value?.sector ?? 'saas')

const existing = computed(() =>
  powerType.value ? assessments.value[powerType.value] : undefined
)

const form = reactive<PowerAnswers>({
  q1: existing.value?.answers?.q1,
  q2: existing.value?.answers?.q2,
  q3: existing.value?.answers?.q3,
  q4: existing.value?.answers?.q4,
  q5: existing.value?.answers?.q5,
  benefit: existing.value?.answers?.benefit ?? '',
  barrier: existing.value?.answers?.barrier ?? '',
  notes: existing.value?.answers?.notes ?? ''
})

const actionItems = reactive<ActionItem[]>([
  existing.value?.action_items?.[0] ?? { title: '' },
  existing.value?.action_items?.[1] ?? { title: '' },
  existing.value?.action_items?.[2] ?? { title: '' }
])

const liveScore = computed(() => compute(form))
const allAnswered = computed(() => isComplete(form))

// ============================================================
// UI helpers
// ============================================================

const scale = [0, 1, 2, 3, 4, 5] as const
type QuestionKey = 'q1' | 'q2' | 'q3' | 'q4' | 'q5'
const questionKeys: QuestionKey[] = ['q1', 'q2', 'q3', 'q4', 'q5']

function setAnswer(key: QuestionKey, value: number) {
  form[key] = value
}

const scoreBand = computed(() => {
  const s = liveScore.value
  if (s >= 70) return { label: t(`power.scoreBands.strong`), tone: 'strong' }
  if (s >= 40) return { label: t(`power.scoreBands.solid`), tone: 'solid' }
  if (s >= 15) return { label: t(`power.scoreBands.weak`), tone: 'weak' }
  return { label: t(`power.scoreBands.absent`), tone: 'absent' }
})

// ============================================================
// Methodology flow — Save & continue → next Power, or → Synthesis after Process
// ============================================================

const POWER_ORDER: PowerType[] = [
  'scale', 'network', 'counter', 'switching', 'branding', 'cornered', 'process'
]

const nextDestination = computed(() => {
  if (!powerType.value) {
    return {
      path: localePath(`/project/${route.params.id}`),
      label: t('hub.backToProject')
    }
  }
  const idx = POWER_ORDER.indexOf(powerType.value)
  if (idx >= 0 && idx < POWER_ORDER.length - 1) {
    const next = POWER_ORDER[idx + 1]
    return {
      path: localePath(`/project/${route.params.id}/power/${next}`),
      label: t(`powers.${next}`)
    }
  }
  // Last Power (process) → go to Synthesis / Power Map
  return {
    path: localePath(`/project/${route.params.id}/synthesis`),
    label: t('hub.moduleSynthesis')
  }
})

// ============================================================
// Save
// ============================================================

function save() {
  if (!powerType.value) return
  const score = allAnswered.value ? liveScore.value : null
  const cleanedActions = actionItems
    .map((a) => ({ ...a, title: a.title.trim() }))
    .filter((a) => a.title.length > 0)
  saveAssessment(powerType.value, { ...form }, score)
  const store = useProjectStore()
  store.setActionItems(powerType.value, cleanedActions)
  navigateTo(nextDestination.value.path)
}
</script>

<template>
  <main
    v-if="currentProject && powerType"
    class="mx-auto max-w-5xl px-6 py-6"
  >
    <!-- Header -->
    <div class="space-y-1.5 mb-4">
      <p class="text-xs uppercase tracking-widest text-accent-blue-bright">
        {{ t(`power.${powerType}.step`) }}
      </p>
      <div class="flex items-center gap-3">
        <span class="glyph text-3xl text-accent-blue-bright">{{ t(`powerGlyphs.${powerType}`) }}</span>
        <h1 class="text-3xl font-semibold text-ink-high">{{ t(`powers.${powerType}`) }}</h1>
      </div>
      <p class="text-ink-mid max-w-3xl">{{ t(`power.${powerType}.tagline`) }}</p>
    </div>

    <!-- Definition + Example side-by-side -->
    <section class="card p-4 mb-3">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="space-y-2">
          <p class="text-[10px] uppercase tracking-widest text-ink-mid">
            {{ t('power.helmerDefinition') }}
          </p>
          <p class="text-ink-high text-sm leading-relaxed">
            {{ t(`power.${powerType}.definition`) }}
          </p>
        </div>
        <div
          class="space-y-2 pt-5 border-t border-border-subtle
                 lg:pt-0 lg:pl-5 lg:border-t-0 lg:border-l"
        >
          <p class="text-[10px] uppercase tracking-widest text-ink-mid">
            {{ t('power.exampleFor', { sector: t(`sectors.${sector}`) }) }}
          </p>
          <p class="text-ink-mid text-sm leading-relaxed">
            {{ t(`power.${powerType}.examples.${sector}`) }}
          </p>
        </div>
      </div>
    </section>

    <!-- Live score -->
    <div class="card p-4 mb-4 flex items-center justify-between gap-6">
      <div class="space-y-1">
        <p class="text-xs uppercase tracking-wider text-ink-mid">
          <HelmerTooltip term="power">{{ t('power.powerScore') }}</HelmerTooltip>
        </p>
        <p class="text-xs text-ink-low">{{ scoreBand.label }}</p>
      </div>
      <div class="flex items-baseline gap-2">
        <span
          class="text-4xl font-semibold tabular-nums"
          :class="scoreBand.tone === 'strong' ? 'text-gold-bright' : 'text-accent-blue-bright'"
        >
          {{ liveScore }}
        </span>
        <span class="text-ink-low text-sm">/100</span>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="save">
      <!-- Questions table — compact horizontal layout -->
      <section class="space-y-3">
        <div class="flex items-baseline justify-between">
          <h2 class="text-xs uppercase tracking-widest text-ink-mid">
            {{ t('power.questionsHeading') }}
          </h2>
          <!-- Scale rail (visible md+ only — mobile stacks buttons under each row) -->
          <div class="hidden md:flex items-baseline gap-2 text-[10px] text-ink-low tabular-nums">
            <span>{{ t('power.scaleLabels.none') }}</span>
            <span class="text-ink-low/40">→</span>
            <span>{{ t('power.scaleLabels.totally') }}</span>
          </div>
        </div>

        <!-- Column headers for the score buttons (md+ only) -->
        <div class="hidden md:flex justify-end pr-4">
          <div class="grid grid-cols-6 gap-1.5 w-[280px] text-center">
            <span v-for="n in scale" :key="`hdr-${n}`" class="text-[10px] text-ink-low tabular-nums">{{ n }}</span>
          </div>
        </div>

        <div class="card py-1.5">
          <div
            v-for="key in questionKeys"
            :key="key"
            class="px-4 py-2 flex flex-col md:flex-row md:items-center gap-2 md:gap-5"
          >
            <!-- Question label + hint (left, takes remaining width) -->
            <div class="flex-1 min-w-0 space-y-0.5">
              <p class="text-sm font-medium text-ink-high">
                <span class="text-[10px] text-ink-low font-mono uppercase mr-2 tabular-nums">{{ key }}</span>
                {{ t(`power.${powerType}.${key}.label`) }}
              </p>
              <p class="text-xs text-ink-mid">{{ t(`power.${powerType}.${key}.hint`) }}</p>
            </div>

            <!-- Score buttons (right column, fixed width on md+) -->
            <div class="grid grid-cols-6 gap-1.5 w-full md:w-[280px] shrink-0">
              <button
                v-for="n in scale"
                :key="n"
                type="button"
                class="h-9 rounded-lg border transition-colors text-sm font-medium tabular-nums"
                :class="form[key] === n
                  ? 'bg-accent-blue text-white border-accent-blue shadow-glow-blue'
                  : 'bg-bg-elevated text-ink-mid border-border-subtle hover:border-accent-blue hover:text-ink-high'"
                :aria-label="`${key.toUpperCase()} = ${n}`"
                :aria-pressed="form[key] === n"
                @click="setAnswer(key, n)"
              >
                {{ n }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Qualitative description -->
      <section class="space-y-6 pt-4 border-t border-border-subtle">
        <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('power.qualitativeHeading') }}</h2>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="space-y-2">
            <label for="benefit" class="text-sm font-medium text-ink-high">
              <HelmerTooltip term="benefit">{{ t('power.benefitLabel') }}</HelmerTooltip>
            </label>
            <p class="text-xs text-ink-mid">{{ t('power.benefitHint') }}</p>
            <textarea
              id="benefit"
              v-model="form.benefit"
              rows="4"
              class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                     text-ink-high placeholder:text-ink-low text-sm
                     focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                     transition-colors resize-y"
              :placeholder="t(`power.${powerType}.benefitPlaceholder`)"
            />
          </div>

          <div class="space-y-2">
            <label for="barrier" class="text-sm font-medium text-ink-high">
              <HelmerTooltip term="barrier">{{ t('power.barrierLabel') }}</HelmerTooltip>
            </label>
            <p class="text-xs text-ink-mid">{{ t('power.barrierHint') }}</p>
            <textarea
              id="barrier"
              v-model="form.barrier"
              rows="4"
              class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                     text-ink-high placeholder:text-ink-low text-sm
                     focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                     transition-colors resize-y"
              :placeholder="t(`power.${powerType}.barrierPlaceholder`)"
            />
          </div>
        </div>
      </section>

      <!-- Action items -->
      <section class="space-y-4 pt-4 border-t border-border-subtle">
        <div class="space-y-1">
          <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('power.actionItemsHeading') }}</h2>
          <p class="text-xs text-ink-low">{{ t('power.actionItemsHint') }}</p>
        </div>

        <div class="space-y-3">
          <div
            v-for="(item, idx) in actionItems"
            :key="idx"
            class="flex items-start gap-3"
          >
            <span class="text-xs text-ink-low font-mono tabular-nums pt-3">
              {{ String(idx + 1).padStart(2, '0') }}
            </span>
            <input
              v-model="item.title"
              type="text"
              class="flex-1 bg-bg-elevated border border-border-subtle rounded-lg px-4 py-2.5
                     text-ink-high placeholder:text-ink-low
                     focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                     transition-colors"
              :placeholder="t(`power.${powerType}.actionPlaceholders.${idx}`)"
            >
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="flex items-center justify-between pt-4 border-t border-border-subtle">
        <NuxtLink
          :to="localePath(`/project/${route.params.id}`)"
          class="text-sm text-ink-mid hover:text-ink-high transition-colors"
        >
          ← {{ t('hub.backToProject') }}
        </NuxtLink>
        <button type="submit" class="btn-primary !px-4 !py-2 text-sm">
          {{ t('common.saveAndContinue', { next: nextDestination.label }) }}
        </button>
      </div>
    </form>
  </main>
</template>
