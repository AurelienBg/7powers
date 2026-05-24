<script setup lang="ts">
import type { DefensibilityBreakdown } from '~/composables/useDefensibilityAnalysis'

const props = defineProps<{
  breakdown: DefensibilityBreakdown | null
}>()

const { t } = useI18n()

const tone = computed(() => {
  if (!props.breakdown) return 'absent'
  const s = props.breakdown.defensibility
  if (s >= 70) return 'strong'
  if (s >= 50) return 'solid'
  if (s >= 30) return 'weak'
  return 'absent'
})

const colorClass = computed(() => {
  switch (tone.value) {
    case 'strong': return 'text-gold-bright'
    case 'solid':  return 'text-accent-blue-bright'
    case 'weak':   return 'text-accent-blue'
    default:       return 'text-ink-mid'
  }
})

const bandLabel = computed(() => {
  if (!props.breakdown) return t('synthesis.scoreBands.notReady')
  return t(`synthesis.scoreBands.${tone.value}`)
})
</script>

<template>
  <div class="card p-6 space-y-5">
    <div class="space-y-1">
      <p class="text-xs uppercase tracking-widest text-ink-mid">
        <HelmerTooltip term="defensibility">{{ t('synthesis.defensibilityHeading') }}</HelmerTooltip>
      </p>
      <p class="text-xs text-ink-low">{{ bandLabel }}</p>
    </div>

    <div v-if="breakdown" class="flex items-baseline gap-2">
      <span class="text-7xl font-semibold tabular-nums" :class="colorClass">
        {{ breakdown.defensibility }}
      </span>
      <span class="text-xl text-ink-low">/100</span>
    </div>
    <div v-else class="flex items-baseline gap-2">
      <span class="text-7xl font-semibold tabular-nums text-ink-low">—</span>
      <span class="text-xl text-ink-low">/100</span>
    </div>

    <!-- Breakdown formula -->
    <div v-if="breakdown" class="pt-4 border-t border-border-subtle space-y-3">
      <p class="text-[10px] uppercase tracking-widest text-ink-mid">{{ t('synthesis.breakdownHeading') }}</p>
      <div class="grid grid-cols-3 gap-3 text-xs">
        <div class="space-y-1">
          <p class="text-ink-low">{{ t('synthesis.breakdown.top3Avg') }}</p>
          <p class="text-base font-medium tabular-nums text-ink-high">{{ breakdown.top3Avg }}/100</p>
          <p class="text-ink-low text-[10px]">× 0.7</p>
        </div>
        <div class="space-y-1">
          <p class="text-ink-low">{{ t('synthesis.breakdown.market') }}</p>
          <p class="text-base font-medium tabular-nums text-ink-high">
            {{ breakdown.marketHasData ? `${breakdown.marketScore}/100` : '—' }}
          </p>
          <p class="text-ink-low text-[10px]">× 0.3</p>
        </div>
        <div class="space-y-1">
          <p class="text-ink-low">=</p>
          <p class="text-base font-medium tabular-nums" :class="colorClass">{{ breakdown.defensibility }}/100</p>
          <p class="text-ink-low text-[10px]">{{ t('synthesis.breakdown.defensibility') }}</p>
        </div>
      </div>
      <p class="text-[10px] text-ink-low italic pt-1">{{ t('synthesis.breakdown.formulaNote') }}</p>
    </div>
  </div>
</template>
