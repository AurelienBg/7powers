<script setup lang="ts">
import type { PowerType, PowerAnswers, ActionItem, ProjectSector } from '~/types/database'

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { currentProject, hasProject, assessments, saveAssessment } = useProject()
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

// Phase 1 ships only Scale Economies as the template. Other Powers reuse this
// same page in Phase 2 — for now they redirect to the hub.
const IMPLEMENTED_POWERS: PowerType[] = ['scale']

const powerType = computed<PowerType | null>(() => {
  const t = route.params.type as string
  return ALL_POWERS.includes(t as PowerType) ? (t as PowerType) : null
})

// Guard 1: no project or wrong id → /project/new
if (!hasProject.value || currentProject.value?.local_id !== route.params.id) {
  await navigateTo(localePath('/project/new'))
}

// Guard 2: invalid power type → hub
if (!powerType.value) {
  await navigateTo(localePath(`/project/${route.params.id}`))
}

// Guard 3: not-yet-implemented power → hub (will be removed in Phase 2)
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
// Save
// ============================================================

function save() {
  if (!powerType.value) return
  const score = allAnswered.value ? liveScore.value : null
  // Strip empty action items
  const cleanedActions = actionItems
    .map((a) => ({ ...a, title: a.title.trim() }))
    .filter((a) => a.title.length > 0)
  saveAssessment(powerType.value, { ...form }, score)
  // also persist action items via the store (small extension)
  const store = useProjectStore()
  store.setActionItems(powerType.value, cleanedActions)
  navigateTo(localePath(`/project/${route.params.id}`))
}
</script>

<template>
  <main
    v-if="currentProject && powerType"
    class="mx-auto max-w-3xl px-6 py-12"
  >
    <!-- Header -->
    <div class="space-y-2 mb-2">
      <p class="text-xs uppercase tracking-widest text-accent-blue-bright">
        {{ t(`power.${powerType}.step`) }}
      </p>
      <div class="flex items-center gap-3">
        <span class="glyph text-3xl text-accent-blue-bright">{{ t(`powerGlyphs.${powerType}`) }}</span>
        <h1 class="text-3xl font-semibold text-ink-high">{{ t(`powers.${powerType}`) }}</h1>
      </div>
      <p class="text-ink-mid max-w-2xl">{{ t(`power.${powerType}.tagline`) }}</p>
    </div>

    <!-- Definition card -->
    <section class="card p-5 my-8 space-y-4">
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-wider text-ink-mid">{{ t('power.helmerDefinition') }}</p>
        <p class="text-ink-high">{{ t(`power.${powerType}.definition`) }}</p>
      </div>
      <div class="space-y-2 pt-2 border-t border-border-subtle">
        <p class="text-xs uppercase tracking-wider text-ink-mid">
          {{ t('power.exampleFor', { sector: t(`sectors.${sector}`) }) }}
        </p>
        <p class="text-ink-mid text-sm leading-relaxed">
          {{ t(`power.${powerType}.examples.${sector}`) }}
        </p>
      </div>
    </section>

    <!-- Live score -->
    <div class="card p-5 mb-8 flex items-center justify-between gap-6">
      <div class="space-y-1">
        <p class="text-xs uppercase tracking-wider text-ink-mid">{{ t('power.powerScore') }}</p>
        <p class="text-xs text-ink-low">{{ scoreBand.label }}</p>
      </div>
      <div class="flex items-baseline gap-2">
        <span
          class="text-5xl font-semibold tabular-nums"
          :class="scoreBand.tone === 'strong' ? 'text-gold-bright' : 'text-accent-blue-bright'"
        >
          {{ liveScore }}
        </span>
        <span class="text-ink-low text-sm">/100</span>
      </div>
    </div>

    <form class="space-y-12" @submit.prevent="save">
      <!-- 5 questions -->
      <section class="space-y-10">
        <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('power.questionsHeading') }}</h2>

        <div
          v-for="key in questionKeys"
          :key="key"
          class="space-y-3"
        >
          <div class="space-y-1">
            <div class="flex items-baseline gap-3">
              <span class="text-xs text-ink-low font-mono uppercase">{{ key }}</span>
              <span class="text-sm font-medium text-ink-high">
                {{ t(`power.${powerType}.${key}.label`) }}
              </span>
            </div>
            <p class="text-xs text-ink-mid pl-8">{{ t(`power.${powerType}.${key}.hint`) }}</p>
          </div>

          <div class="pl-8 space-y-2">
            <div class="flex gap-2">
              <button
                v-for="n in scale"
                :key="n"
                type="button"
                class="w-11 h-11 rounded-lg border transition-colors text-sm font-medium tabular-nums"
                :class="form[key] === n
                  ? 'bg-accent-blue text-white border-accent-blue shadow-glow-blue'
                  : 'bg-bg-elevated text-ink-mid border-border-subtle hover:border-accent-blue hover:text-ink-high'"
                @click="setAnswer(key, n)"
              >
                {{ n }}
              </button>
            </div>
            <div class="flex justify-between text-xs text-ink-low">
              <span>{{ t('power.scaleLabels.none') }}</span>
              <span>{{ t('power.scaleLabels.totally') }}</span>
            </div>
          </div>
        </div>
      </section>

      <!-- Qualitative description -->
      <section class="space-y-6 pt-4 border-t border-border-subtle">
        <h2 class="text-xs uppercase tracking-widest text-ink-mid">{{ t('power.qualitativeHeading') }}</h2>

        <div class="space-y-2">
          <label for="benefit" class="text-sm font-medium text-ink-high">
            {{ t('power.benefitLabel') }}
          </label>
          <p class="text-xs text-ink-mid">{{ t('power.benefitHint') }}</p>
          <textarea
            id="benefit"
            v-model="form.benefit"
            rows="3"
            class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                   text-ink-high placeholder:text-ink-low
                   focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                   transition-colors resize-y"
            :placeholder="t(`power.${powerType}.benefitPlaceholder`)"
          />
        </div>

        <div class="space-y-2">
          <label for="barrier" class="text-sm font-medium text-ink-high">
            {{ t('power.barrierLabel') }}
          </label>
          <p class="text-xs text-ink-mid">{{ t('power.barrierHint') }}</p>
          <textarea
            id="barrier"
            v-model="form.barrier"
            rows="3"
            class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                   text-ink-high placeholder:text-ink-low
                   focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                   transition-colors resize-y"
            :placeholder="t(`power.${powerType}.barrierPlaceholder`)"
          />
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
        <button type="submit" class="btn-primary !px-6 !py-3">
          {{ t('power.save') }}
        </button>
      </div>
    </form>
  </main>
</template>
