<script setup lang="ts">
import type { PowerType } from '~/types/database'

const { t } = useI18n()
const localePath = useLocalePath()

const powers: { key: PowerType; glyph: string; stage: string }[] = [
  { key: 'scale',     glyph: '⬡', stage: 'takeoff' },
  { key: 'network',   glyph: '◉', stage: 'takeoff' },
  { key: 'counter',   glyph: '⇄', stage: 'origination' },
  { key: 'switching', glyph: '◈', stage: 'takeoff' },
  { key: 'branding',  glyph: '✦', stage: 'stability' },
  { key: 'cornered',  glyph: '△', stage: 'origination' },
  { key: 'process',   glyph: '⚖', stage: 'stability' }
]

const stages = [
  { key: 'origination', glyph: '◌' },
  { key: 'takeoff',     glyph: '◐' },
  { key: 'stability',   glyph: '●' }
] as const

const externalLinks = [
  {
    href: 'https://www.amazon.com/7-Powers-Foundations-Business-Strategy/dp/0998116319',
    title: 'learn.resources.book.title',
    body: 'learn.resources.book.body'
  },
  {
    href: 'https://www.youtube.com/watch?v=lJgEx80b6L4',
    title: 'learn.resources.talk.title',
    body: 'learn.resources.talk.body'
  },
  {
    href: 'https://7powers.com',
    title: 'learn.resources.website.title',
    body: 'learn.resources.website.body'
  }
]
</script>

<template>
  <main class="mx-auto max-w-4xl px-6 py-16 space-y-20">
    <!-- ============================================================ -->
    <!-- HERO                                                         -->
    <!-- ============================================================ -->
    <section class="space-y-4">
      <div class="flex items-center gap-3 text-ink-mid">
        <Logo :size="40" />
        <span class="tracking-widest text-xs uppercase text-gold-bright">
          {{ t('learn.hero.kicker') }}
        </span>
      </div>
      <h1 class="text-4xl md:text-5xl font-semibold leading-tight text-ink-high max-w-3xl">
        {{ t('learn.hero.title') }}
      </h1>
      <p class="text-lg text-ink-mid max-w-2xl leading-relaxed">
        {{ t('learn.hero.subtitle') }}
      </p>
    </section>

    <!-- ============================================================ -->
    <!-- WHAT IS A POWER                                              -->
    <!-- ============================================================ -->
    <section class="space-y-5">
      <h2 class="text-2xl font-semibold text-ink-high">{{ t('learn.power.heading') }}</h2>
      <div class="card p-6 space-y-4">
        <p class="text-ink-high leading-relaxed">{{ t('learn.power.body') }}</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border-subtle">
          <div class="space-y-2">
            <p class="text-[10px] uppercase tracking-widest text-accent-blue-bright">{{ t('learn.power.benefitLabel') }}</p>
            <p class="text-sm text-ink-high">{{ t('learn.power.benefitBody') }}</p>
            <p class="text-xs text-ink-mid italic">{{ t('learn.power.benefitExample') }}</p>
          </div>
          <div class="space-y-2">
            <p class="text-[10px] uppercase tracking-widest text-accent-blue-bright">{{ t('learn.power.barrierLabel') }}</p>
            <p class="text-sm text-ink-high">{{ t('learn.power.barrierBody') }}</p>
            <p class="text-xs text-ink-mid italic">{{ t('learn.power.barrierExample') }}</p>
          </div>
        </div>
        <div class="pt-2 border-t border-border-subtle">
          <p class="text-sm text-gold-bright">
            <span class="font-medium">{{ t('learn.power.ruleHighlight') }}</span>
            — {{ t('learn.power.ruleBody') }}
          </p>
        </div>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- S-CURVE                                                       -->
    <!-- ============================================================ -->
    <section class="space-y-5">
      <h2 class="text-2xl font-semibold text-ink-high">{{ t('learn.sCurve.heading') }}</h2>
      <p class="text-ink-mid">{{ t('learn.sCurve.intro') }}</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div
          v-for="(stage, idx) in stages"
          :key="stage.key"
          class="card p-5 space-y-3"
        >
          <div class="flex items-center gap-2">
            <span class="glyph text-2xl text-accent-blue-bright">{{ stage.glyph }}</span>
            <span class="text-xs text-ink-low font-mono">{{ String(idx + 1).padStart(2, '0') }}</span>
          </div>
          <h3 class="text-base font-medium text-ink-high">{{ t(`stages.${stage.key}`) }}</h3>
          <p class="text-sm text-ink-mid leading-snug">{{ t(`learn.sCurve.stages.${stage.key}`) }}</p>
          <p class="text-xs text-gold-bright pt-1">
            {{ t(`learn.sCurve.stagePowers.${stage.key}`) }}
          </p>
        </div>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- THE 7 POWERS                                                  -->
    <!-- ============================================================ -->
    <section class="space-y-5">
      <h2 class="text-2xl font-semibold text-ink-high">{{ t('learn.powers.heading') }}</h2>
      <p class="text-ink-mid max-w-2xl">{{ t('learn.powers.intro') }}</p>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div
          v-for="(power, idx) in powers"
          :key="power.key"
          class="card p-5 space-y-3"
        >
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="glyph text-xl text-accent-blue-bright">{{ power.glyph }}</span>
              <span class="text-xs text-ink-low font-mono tabular-nums">{{ String(idx + 1).padStart(2, '0') }}</span>
              <h3 class="text-sm font-medium text-ink-high">{{ t(`powers.${power.key}`) }}</h3>
            </div>
            <span class="text-[10px] uppercase tracking-wider text-ink-low">
              {{ t(`stages.${power.stage}`) }}
            </span>
          </div>
          <p class="text-xs text-ink-mid leading-relaxed">{{ t(`power.${power.key}.definition`) }}</p>
        </div>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- VALUE = MARKET × POWER                                        -->
    <!-- ============================================================ -->
    <section class="space-y-5">
      <h2 class="text-2xl font-semibold text-ink-high">{{ t('learn.value.heading') }}</h2>
      <div class="card p-6 space-y-3 border-gold/30">
        <p class="text-center text-2xl font-semibold tabular-nums text-gold-bright">
          Value = Market × Power
        </p>
        <p class="text-ink-high leading-relaxed">{{ t('learn.value.body') }}</p>
        <p class="text-sm text-ink-mid italic">{{ t('learn.value.example') }}</p>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- COMMON PITFALLS                                               -->
    <!-- ============================================================ -->
    <section class="space-y-5">
      <h2 class="text-2xl font-semibold text-ink-high">{{ t('learn.pitfalls.heading') }}</h2>
      <p class="text-ink-mid">{{ t('learn.pitfalls.intro') }}</p>
      <div class="space-y-3">
        <div
          v-for="i in 4"
          :key="`pitfall-${i}`"
          class="card p-4 border-amber-500/30 bg-amber-500/5"
        >
          <p class="text-sm font-medium text-ink-high mb-1">
            <span class="glyph text-amber-400 mr-2">!</span>
            {{ t(`learn.pitfalls.items.${i - 1}.title`) }}
          </p>
          <p class="text-xs text-ink-mid pl-6">{{ t(`learn.pitfalls.items.${i - 1}.body`) }}</p>
        </div>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- RESOURCES                                                     -->
    <!-- ============================================================ -->
    <section class="space-y-5">
      <h2 class="text-2xl font-semibold text-ink-high">{{ t('learn.resources.heading') }}</h2>
      <p class="text-ink-mid">{{ t('learn.resources.intro') }}</p>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <a
          v-for="link in externalLinks"
          :key="link.href"
          :href="link.href"
          target="_blank"
          rel="noopener noreferrer"
          class="card-hover p-4 space-y-2 block"
        >
          <p class="text-sm font-medium text-ink-high">{{ t(link.title) }}</p>
          <p class="text-xs text-ink-mid">{{ t(link.body) }}</p>
          <p class="text-xs text-accent-blue-bright">↗ {{ t('learn.resources.openLink') }}</p>
        </a>
      </div>
    </section>

    <!-- ============================================================ -->
    <!-- BOTTOM CTA                                                    -->
    <!-- ============================================================ -->
    <section class="card p-8 space-y-4 text-center border-gold/30">
      <h2 class="text-xl font-semibold text-ink-high">{{ t('learn.cta.title') }}</h2>
      <p class="text-sm text-ink-mid max-w-md mx-auto">{{ t('learn.cta.body') }}</p>
      <div class="pt-2">
        <NuxtLink :to="localePath('/project/new')" class="btn-primary text-base !px-6 !py-3">
          {{ t('learn.cta.button') }}
        </NuxtLink>
      </div>
    </section>
  </main>
</template>
