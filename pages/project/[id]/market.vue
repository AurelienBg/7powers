<script setup lang="ts">
import type { MarketSize } from '~/types/database'
import {
  computeMarketAttractiveness,
  isCoherent,
  formatMarketValue,
  hasMinimumMarketData
} from '~/utils/marketScore'

definePageMeta({ layout: 'project' })

const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { currentProject, updateMarketSize } = useProject()

// Layout handles URL ↔ store sync + guards. We can read currentProject directly.

// Local working copy of the market — only persists to the store on save.
// This lets the user explore values + see the live score without committing.
const form = reactive<MarketSize>({
  tam: currentProject.value?.market_size?.tam,
  sam: currentProject.value?.market_size?.sam,
  som: currentProject.value?.market_size?.som,
  unit: currentProject.value?.market_size?.unit ?? 'usd',
  sources: currentProject.value?.market_size?.sources ?? [],
  notes: currentProject.value?.market_size?.notes
})

const sourcesText = ref((form.sources ?? []).join('\n'))

const liveScore = computed(() => computeMarketAttractiveness(form))
const liveCoherent = computed(() => isCoherent(form))
const canSave = computed(() => hasMinimumMarketData(form))

const scoreBand = computed(() => {
  const s = liveScore.value
  if (s >= 75) return { label: t('module1.scoreBands.strong'), tone: 'strong' }
  if (s >= 50) return { label: t('module1.scoreBands.solid'), tone: 'solid' }
  if (s >= 25) return { label: t('module1.scoreBands.thin'), tone: 'thin' }
  return { label: t('module1.scoreBands.empty'), tone: 'empty' }
})

const quickValues = [
  { value: 10 * 1_000_000, label: '10M' },
  { value: 100 * 1_000_000, label: '100M' },
  { value: 1 * 1_000_000_000, label: '1B' },
  { value: 10 * 1_000_000_000, label: '10B' }
]

function applyQuickValue(field: 'tam' | 'sam' | 'som', value: number) {
  form[field] = value
}

// Methodology flow: Market → Scale Economies → … → Power Map.
const nextLabel = computed(() => t('powers.scale'))
const nextPath = computed(() => localePath(`/project/${route.params.id}/power/scale`))

function save() {
  // Parse sources textarea into array (one per line, trimmed)
  form.sources = sourcesText.value
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
  updateMarketSize({ ...form })
  navigateTo(nextPath.value)
}
</script>

<template>
  <main v-if="currentProject" class="mx-auto max-w-3xl px-6 py-12">
    <div class="space-y-2 mb-2">
      <p class="text-xs uppercase tracking-widest text-accent-blue-bright">{{ t('module1.step') }}</p>
      <h1 class="text-3xl font-semibold text-ink-high">{{ t('module1.title') }}</h1>
      <p class="text-ink-mid max-w-2xl">{{ t('module1.subtitle') }}</p>
    </div>

    <!-- Live score panel — sticky-ish, prominent -->
    <div class="card p-5 my-8 flex items-center justify-between gap-6">
      <div class="space-y-1">
        <p class="text-xs uppercase tracking-wider text-ink-mid">{{ t('module1.liveScore') }}</p>
        <p class="text-xs text-ink-low">{{ scoreBand.label }}</p>
      </div>
      <div class="flex items-baseline gap-2">
        <span class="text-5xl font-semibold tabular-nums"
          :class="scoreBand.tone === 'strong' ? 'text-gold-bright' : 'text-accent-blue-bright'">
          {{ liveScore }}
        </span>
        <span class="text-ink-low text-sm">/100</span>
      </div>
    </div>

    <!-- Coherence warning (soft, doesn't block) -->
    <div
      v-if="!liveCoherent"
      class="card p-3 mb-6 border-amber-500/40 bg-amber-500/5"
    >
      <p class="text-xs text-amber-300">
        <span class="font-medium">{{ t('module1.coherenceWarningTitle') }}</span>
        — {{ t('module1.coherenceWarningBody') }}
      </p>
    </div>

    <form class="space-y-10" @submit.prevent="save">
      <!-- Currency picker -->
      <div class="flex items-center gap-3">
        <label class="text-xs uppercase tracking-wider text-ink-mid">{{ t('module1.currencyLabel') }}</label>
        <div class="flex gap-1 rounded-lg border border-border-subtle p-1">
          <button
            type="button"
            class="px-3 py-1 rounded-md text-sm transition-colors"
            :class="form.unit === 'usd' ? 'bg-accent-blue text-white' : 'text-ink-mid hover:text-ink-high'"
            @click="form.unit = 'usd'"
          >
            USD
          </button>
          <button
            type="button"
            class="px-3 py-1 rounded-md text-sm transition-colors"
            :class="form.unit === 'eur' ? 'bg-accent-blue text-white' : 'text-ink-mid hover:text-ink-high'"
            @click="form.unit = 'eur'"
          >
            EUR
          </button>
        </div>
      </div>

      <!-- TAM -->
      <div class="space-y-3">
        <div class="flex items-baseline justify-between gap-4">
          <div class="space-y-1">
            <label for="tam" class="text-sm font-medium text-ink-high">{{ t('module1.tamLabel') }}</label>
            <p class="text-xs text-ink-mid">{{ t('module1.tamHint') }}</p>
          </div>
          <span class="text-sm text-ink-mid tabular-nums">{{ formatMarketValue(form.tam ?? 0, form.unit) }}</span>
        </div>
        <input
          id="tam"
          v-model.number="form.tam"
          type="number"
          min="0"
          inputmode="numeric"
          class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                 text-ink-high placeholder:text-ink-low
                 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                 transition-colors"
          :placeholder="t('module1.tamPlaceholder')"
        >
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="q in quickValues"
            :key="`tam-${q.value}`"
            type="button"
            class="text-xs px-2 py-1 rounded border border-border-subtle text-ink-mid hover:border-accent-blue hover:text-accent-blue-bright transition-colors"
            @click="applyQuickValue('tam', q.value)"
          >
            {{ q.label }}
          </button>
        </div>
      </div>

      <!-- SAM -->
      <div class="space-y-3">
        <div class="flex items-baseline justify-between gap-4">
          <div class="space-y-1">
            <label for="sam" class="text-sm font-medium text-ink-high">{{ t('module1.samLabel') }}</label>
            <p class="text-xs text-ink-mid">{{ t('module1.samHint') }}</p>
          </div>
          <span class="text-sm text-ink-mid tabular-nums">{{ formatMarketValue(form.sam ?? 0, form.unit) }}</span>
        </div>
        <input
          id="sam"
          v-model.number="form.sam"
          type="number"
          min="0"
          inputmode="numeric"
          class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                 text-ink-high placeholder:text-ink-low
                 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                 transition-colors"
          :placeholder="t('module1.samPlaceholder')"
        >
        <div class="flex gap-2 flex-wrap">
          <button
            v-for="q in quickValues"
            :key="`sam-${q.value}`"
            type="button"
            class="text-xs px-2 py-1 rounded border border-border-subtle text-ink-mid hover:border-accent-blue hover:text-accent-blue-bright transition-colors"
            @click="applyQuickValue('sam', q.value)"
          >
            {{ q.label }}
          </button>
        </div>
      </div>

      <!-- SOM -->
      <div class="space-y-3">
        <div class="flex items-baseline justify-between gap-4">
          <div class="space-y-1">
            <label for="som" class="text-sm font-medium text-ink-high">{{ t('module1.somLabel') }}</label>
            <p class="text-xs text-ink-mid">{{ t('module1.somHint') }}</p>
          </div>
          <span class="text-sm text-ink-mid tabular-nums">{{ formatMarketValue(form.som ?? 0, form.unit) }}</span>
        </div>
        <input
          id="som"
          v-model.number="form.som"
          type="number"
          min="0"
          inputmode="numeric"
          class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                 text-ink-high placeholder:text-ink-low
                 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                 transition-colors"
          :placeholder="t('module1.somPlaceholder')"
        >
      </div>

      <!-- Sources -->
      <div class="space-y-2">
        <label for="sources" class="text-sm font-medium text-ink-high">
          {{ t('module1.sourcesLabel') }}
          <span class="font-normal text-ink-low ml-1">{{ t('module1.sourcesOptional') }}</span>
        </label>
        <p class="text-xs text-ink-mid">{{ t('module1.sourcesHint') }}</p>
        <textarea
          id="sources"
          v-model="sourcesText"
          rows="3"
          class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                 text-ink-high placeholder:text-ink-low
                 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                 transition-colors resize-y font-mono text-sm"
          :placeholder="t('module1.sourcesPlaceholder')"
        />
      </div>

      <!-- Notes -->
      <div class="space-y-2">
        <label for="notes" class="text-sm font-medium text-ink-high">
          {{ t('module1.notesLabel') }}
          <span class="font-normal text-ink-low ml-1">{{ t('module1.sourcesOptional') }}</span>
        </label>
        <textarea
          id="notes"
          v-model="form.notes"
          rows="3"
          class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                 text-ink-high placeholder:text-ink-low
                 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                 transition-colors resize-y"
          :placeholder="t('module1.notesPlaceholder')"
        />
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between pt-4 border-t border-border-subtle">
        <NuxtLink
          :to="localePath(`/project/${route.params.id}`)"
          class="text-sm text-ink-mid hover:text-ink-high transition-colors"
        >
          ← {{ t('hub.backToProject') }}
        </NuxtLink>
        <button
          type="submit"
          class="btn-primary !px-6 !py-3"
          :disabled="!canSave"
        >
          {{ t('common.saveAndContinue', { next: nextLabel }) }}
        </button>
      </div>
    </form>
  </main>
</template>
