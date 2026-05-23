<script setup lang="ts">
const { t } = useI18n()

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
  <main class="mx-auto max-w-5xl px-6 py-24">
    <section class="space-y-8">
      <div class="flex items-center gap-3 text-ink-mid">
        <Logo :size="56" mode="dark" />
        <span class="tracking-widest text-xs uppercase">{{ t('app.name') }}</span>
      </div>

      <h1 class="text-4xl md:text-5xl font-semibold leading-tight text-ink-high max-w-3xl">
        {{ t('landing.hero.title') }}
      </h1>

      <p class="text-lg text-ink-mid max-w-2xl">
        {{ t('landing.hero.subtitle') }}
      </p>

      <div>
        <button type="button" class="btn-primary">
          {{ t('landing.hero.cta') }}
        </button>
      </div>
    </section>

    <section class="mt-24 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
      <div
        v-for="power in powers"
        :key="power.key"
        class="card-hover p-5 flex flex-col items-center gap-3 text-center"
      >
        <span class="glyph text-2xl text-accent-blue-bright">{{ power.glyph }}</span>
        <span class="text-xs text-ink-mid leading-tight">{{ t(`powers.${power.key}`) }}</span>
      </div>
    </section>
  </main>
</template>
