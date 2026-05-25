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

// ============================================================
// Sidebar TOC with scroll-spy.
// 7 sections → too long for a vertical scan without a TOC. The sidebar
// is sticky on the right (md+), highlights the currently-in-view section
// via IntersectionObserver, and lets the user jump anywhere instantly.
// ============================================================
interface TocItem {
  id: string
  labelKey: string
}
const tocItems: TocItem[] = [
  { id: 'power',     labelKey: 'learn.toc.power' },
  { id: 's-curve',   labelKey: 'learn.toc.sCurve' },
  { id: 'powers',    labelKey: 'learn.toc.powers' },
  { id: 'value',     labelKey: 'learn.toc.value' },
  { id: 'pitfalls',  labelKey: 'learn.toc.pitfalls' },
  { id: 'resources', labelKey: 'learn.toc.resources' },
  { id: 'next',      labelKey: 'learn.toc.next' }
]
const activeSection = ref<string>('power')

onMounted(() => {
  // The header is sticky h-14 (~56px). Use a negative top margin so a
  // section becomes "active" a bit before its actual top edge crosses
  // the viewport top — feels more natural than the strict 0 boundary.
  const observer = new IntersectionObserver(
    (entries) => {
      // Pick the topmost intersecting entry as the active one.
      const visible = entries
        .filter((e) => e.isIntersecting)
        .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
      if (visible.length > 0 && visible[0]?.target.id) {
        activeSection.value = visible[0].target.id
      }
    },
    {
      // Offset the top boundary by header height + a bit so highlighting
      // updates as the user passes a section title rather than waiting
      // for the next section to fully appear.
      rootMargin: '-72px 0px -55% 0px',
      threshold: 0
    }
  )
  tocItems.forEach((item) => {
    const el = document.getElementById(item.id)
    if (el) observer.observe(el)
  })
  onBeforeUnmount(() => observer.disconnect())
})
</script>

<template>
  <!-- Same shell as the `project` layout: a fixed-width sidebar on the
       LEFT (border-r, sticky under AppHeader), then the main column on
       the right. User asked for visual parity with the project sidebar
       ('sidebar comme pour assess'). -->
  <div class="flex min-h-[calc(100vh-3.5rem)]">

    <!-- ============================================================ -->
    <!-- TOC SIDEBAR — w-72 to match ProjectSidebar, border-r, sticky  -->
    <!-- under the topbar. Hidden on mobile (the page stays readable  -->
    <!-- without it).                                                  -->
    <!-- ============================================================ -->
    <aside
      class="hidden md:flex md:flex-col w-72 shrink-0 border-r border-border-subtle
             bg-bg-base sticky top-14 self-start h-[calc(100vh-3.5rem)] overflow-y-auto"
      :aria-label="t('learn.toc.label')"
    >
      <div class="px-5 pt-4 pb-2">
        <p class="text-[10px] uppercase tracking-widest text-ink-low">
          {{ t('learn.toc.label') }}
        </p>
      </div>
      <nav class="px-3 pb-4 space-y-0.5">
        <a
          v-for="(item, idx) in tocItems"
          :key="item.id"
          :href="`#${item.id}`"
          class="flex items-center justify-between pl-5 pr-2 py-1.5 rounded text-sm transition-colors"
          :class="activeSection === item.id
            ? 'bg-accent-blue/15 text-ink-high border-l-2 border-accent-blue'
            : 'text-ink-mid hover:text-ink-high hover:bg-bg-card'"
        >
          <span class="flex items-center gap-2 min-w-0">
            <span class="text-[10px] text-gold-bright/80 font-mono tabular-nums shrink-0">
              {{ String(idx + 1).padStart(2, '0') }}
            </span>
            <span class="truncate">{{ t(item.labelKey) }}</span>
          </span>
        </a>
      </nav>
    </aside>

    <!-- ============================================================ -->
    <!-- MAIN COLUMN — same content as before, max-w-4xl reading width -->
    <!-- ============================================================ -->
    <div class="flex-1 min-w-0">
      <div class="mx-auto max-w-4xl px-6 py-16 space-y-12">
        <!-- HERO -->
        <section class="space-y-4">
          <div class="flex items-center gap-3 text-ink-mid">
            <Logo :size="40" />
            <span class="tracking-widest text-xs uppercase text-gold-bright">
              {{ t('learn.hero.kicker') }}
            </span>
          </div>
          <h1 class="text-3xl md:text-4xl font-semibold leading-tight text-ink-high max-w-3xl">
            {{ t('learn.hero.title') }}
          </h1>
          <p class="text-lg text-ink-mid max-w-2xl leading-relaxed">
            {{ t('learn.hero.subtitle') }}
          </p>
        </section>

        <!-- WHAT IS A POWER -->
        <section id="power" class="space-y-4 scroll-mt-20">
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

        <!-- S-CURVE -->
        <section id="s-curve" class="space-y-4 scroll-mt-20">
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
                <!-- Gold accent on the numbering — small but pulls visual
                     consistency with the dashboard / project sidebar. -->
                <span class="text-xs text-gold-bright/80 font-mono">{{ String(idx + 1).padStart(2, '0') }}</span>
              </div>
              <h3 class="text-base font-medium text-ink-high">{{ t(`stages.${stage.key}`) }}</h3>
              <p class="text-sm text-ink-mid leading-snug">{{ t(`learn.sCurve.stages.${stage.key}`) }}</p>
              <p class="text-xs text-gold-bright pt-1">
                {{ t(`learn.sCurve.stagePowers.${stage.key}`) }}
              </p>
            </div>
          </div>
        </section>

        <!-- THE 7 POWERS -->
        <section id="powers" class="space-y-4 scroll-mt-20">
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
                  <span class="text-xs text-gold-bright/80 font-mono tabular-nums">{{ String(idx + 1).padStart(2, '0') }}</span>
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

        <!-- VALUE = MARKET × POWER -->
        <section id="value" class="space-y-4 scroll-mt-20">
          <h2 class="text-2xl font-semibold text-ink-high">{{ t('learn.value.heading') }}</h2>
          <div class="card p-6 space-y-3 border-gold/30">
            <p class="text-center text-2xl font-semibold tabular-nums text-gold-bright">
              Value = Market × Power
            </p>
            <p class="text-ink-high leading-relaxed">{{ t('learn.value.body') }}</p>
            <p class="text-sm text-ink-mid italic">{{ t('learn.value.example') }}</p>
          </div>
        </section>

        <!-- COMMON PITFALLS -->
        <section id="pitfalls" class="space-y-4 scroll-mt-20">
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

        <!-- RESOURCES -->
        <section id="resources" class="space-y-4 scroll-mt-20">
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

        <!-- BRIDGE TO /examples + /project/new -->
        <section id="next" class="grid grid-cols-1 md:grid-cols-2 gap-3 scroll-mt-20">
          <NuxtLink
            :to="localePath('/examples')"
            class="card p-6 hover:border-accent-blue/50 transition-colors space-y-2 block"
          >
            <p class="text-[10px] uppercase tracking-widest text-accent-blue-bright">{{ t('learn.examplesEyebrow') }}</p>
            <h3 class="text-lg font-semibold text-ink-high">{{ t('learn.examplesTitle') }}</h3>
            <p class="text-sm text-ink-mid">{{ t('learn.examplesBody') }}</p>
            <p class="text-xs text-accent-blue-bright pt-1">→ {{ t('learn.examplesLink') }}</p>
          </NuxtLink>

          <NuxtLink
            :to="localePath('/project/new')"
            class="card p-6 hover:border-gold/50 transition-colors space-y-2 block border-gold/20"
          >
            <p class="text-[10px] uppercase tracking-widest text-gold-bright">{{ t('learn.cta.eyebrow') }}</p>
            <h3 class="text-lg font-semibold text-ink-high">{{ t('learn.cta.title') }}</h3>
            <p class="text-sm text-ink-mid">{{ t('learn.cta.body') }}</p>
            <p class="text-xs text-gold-bright pt-1">→ {{ t('learn.cta.button') }}</p>
          </NuxtLink>
        </section>
      </div>
    </div>
  </div>
</template>
