<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const { hasProject, currentProject } = useProject()

// If the user already has a local project, the CTA becomes "Continue my project"
// pointing to its hub. Otherwise it kicks off Module 0.
const ctaTarget = computed(() => {
  if (hasProject.value && currentProject.value) {
    return localePath(`/project/${currentProject.value.local_id}`)
  }
  return localePath('/project/new')
})

const ctaLabel = computed(() =>
  hasProject.value ? t('landing.hero.continueExisting') : t('landing.hero.cta')
)

const howSteps = ['1', '2', '3', '4', '5'] as const
const howGlyphs: Record<string, string> = {
  '1': '⬡',
  '2': '◉',
  '3': '⇄',
  '4': '✦',
  '5': '△'
}

const personas = [
  { key: 'defi', glyph: '◉' },
  { key: 'ai', glyph: '⬡' },
  { key: 'incubator', glyph: '⚖' }
] as const

const powers = [
  { key: 'scale', glyph: '⬡' },
  { key: 'network', glyph: '◉' },
  { key: 'counter', glyph: '⇄' },
  { key: 'switching', glyph: '◈' },
  { key: 'branding', glyph: '✦' },
  { key: 'cornered', glyph: '△' },
  { key: 'process', glyph: '⚖' }
] as const
</script>

<template>
  <main class="mx-auto max-w-5xl px-6 py-24 space-y-32">
    <!-- HERO -->
    <section class="space-y-8">
      <div class="flex items-center gap-3 text-ink-mid">
        <Logo :size="56" mode="dark" />
        <span class="tracking-widest text-xs uppercase">{{ t('landing.hero.kicker') }}</span>
      </div>

      <h1 class="text-4xl md:text-5xl font-semibold leading-tight text-ink-high max-w-3xl">
        {{ t('landing.hero.title') }}
      </h1>

      <p class="text-lg text-ink-mid max-w-2xl leading-relaxed">
        {{ t('landing.hero.subtitle') }}
      </p>

      <div>
        <NuxtLink :to="ctaTarget" class="btn-primary text-base !px-6 !py-3">
          {{ ctaLabel }}
        </NuxtLink>
      </div>
    </section>

    <!-- HOW IT WORKS -->
    <section class="space-y-8">
      <div class="space-y-2 max-w-2xl">
        <h2 class="text-2xl md:text-3xl font-semibold text-ink-high">
          {{ t('landing.how.heading') }}
        </h2>
        <p class="text-ink-mid">{{ t('landing.how.subheading') }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div
          v-for="step in howSteps"
          :key="step"
          class="card-hover p-5 space-y-3"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-low font-mono">0{{ step }}</span>
            <span class="glyph text-lg text-accent-blue-bright">{{ howGlyphs[step] }}</span>
          </div>
          <h3 class="text-sm font-medium text-ink-high">
            {{ t(`landing.how.steps.${step}.title`) }}
          </h3>
          <p class="text-xs text-ink-mid leading-snug">
            {{ t(`landing.how.steps.${step}.body`) }}
          </p>
        </div>
      </div>
    </section>

    <!-- FOR WHO -->
    <section class="space-y-8">
      <div class="space-y-2 max-w-2xl">
        <h2 class="text-2xl md:text-3xl font-semibold text-ink-high">
          {{ t('landing.for.heading') }}
        </h2>
        <p class="text-ink-mid">{{ t('landing.for.subheading') }}</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          v-for="p in personas"
          :key="p.key"
          class="card-hover p-5 space-y-3"
        >
          <span class="glyph text-2xl text-accent-blue-bright">{{ p.glyph }}</span>
          <h3 class="text-base font-medium text-ink-high">
            {{ t(`landing.for.personas.${p.key}.title`) }}
          </h3>
          <p class="text-sm text-ink-mid leading-relaxed">
            {{ t(`landing.for.personas.${p.key}.body`) }}
          </p>
        </div>
      </div>
    </section>

    <!-- POWERS GRID -->
    <section class="space-y-8">
      <div class="space-y-2 max-w-2xl">
        <h2 class="text-2xl md:text-3xl font-semibold text-ink-high">
          {{ t('landing.powersGrid.heading') }}
        </h2>
        <p class="text-ink-mid">{{ t('landing.powersGrid.subheading') }}</p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <div
          v-for="power in powers"
          :key="power.key"
          class="card-hover p-5 flex flex-col items-center gap-3 text-center"
        >
          <span class="glyph text-2xl text-accent-blue-bright">{{ power.glyph }}</span>
          <span class="text-xs text-ink-mid leading-tight">{{ t(`powers.${power.key}`) }}</span>
        </div>
      </div>
    </section>

    <!-- BOTTOM CTA -->
    <section class="card p-8 space-y-4 text-center">
      <h2 class="text-xl font-semibold text-ink-high">
        {{ t('landing.hero.title') }}
      </h2>
      <div class="pt-2">
        <NuxtLink :to="ctaTarget" class="btn-primary text-base !px-6 !py-3">
          {{ ctaLabel }}
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
