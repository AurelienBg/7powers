<script setup lang="ts">
/**
 * ProjectSidebar — project-context navigation only.
 *
 * Stripped of every control that's now in <AppHeader />: brand row,
 * lang/theme switchers, sync badge, email + sign-out, wallet badge, the
 * Learn link, the All-projects link. Those all live in the topbar (shared
 * across both layouts). What remains here is purely contextual to a
 * /project/* route: new project, current project + modules, other
 * projects, defensibility score.
 */
import type { PowerType, LocalProject } from '~/types/database'
import { computeMarketAttractiveness, hasMinimumMarketData } from '~/utils/marketScore'

const { t } = useI18n()
const localePath = useLocalePath()
const route = useRoute()
const {
  projectList,
  currentProject,
  assessments,
  switchProject
} = useProject()
const { isOpen: isSidebarOpen, close: closeSidebar } = useSidebar()

const { compute: computePowerScore, isComplete: isPowerComplete } = usePowerScore()

// ============================================================
// Project switcher
// ============================================================

const otherProjects = computed(() =>
  projectList.value.filter((p) => p.local_id !== currentProject.value?.local_id)
)

function handleProjectSwitch(p: LocalProject) {
  switchProject(p.local_id)
  navigateTo(localePath(`/project/${p.local_id}`))
  closeSidebar()
}

function projectInitial(p: LocalProject): string {
  return p.name.charAt(0).toUpperCase() || '·'
}

// ============================================================
// Module nav for the current project
// ============================================================

const powers: PowerType[] = [
  'scale',
  'network',
  'counter',
  'switching',
  'branding',
  'cornered',
  'process'
]

// All 7 Powers wired as of Phase 2.
const IMPLEMENTED_POWERS: PowerType[] = [
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

const marketScore = computed(() =>
  currentProject.value ? computeMarketAttractiveness(currentProject.value.market_size) : 0
)

function powerDone(power: PowerType): boolean {
  return isPowerComplete(assessments.value[power]?.answers)
}

function powerScore(power: PowerType): number {
  return computePowerScore(assessments.value[power]?.answers)
}

// ============================================================
// Active item highlight
// ============================================================

const activePath = computed(() => route.path)

function isActive(path: string): boolean {
  // localePath() prepends the locale prefix — compare suffix to be locale-agnostic.
  const target = localePath(path)
  return activePath.value === target
}

// ============================================================
// Defensibility (global score, bottom of sidebar)
// ============================================================

const defensibilityScore = computed<number | null>(() => {
  if (!currentProject.value) return null
  const top3 = (Object.values(assessments.value) as (typeof assessments.value)[PowerType][])
    .filter((a): a is NonNullable<typeof a> => !!a && typeof a.score === 'number')
    .map((a) => a.score as number)
    .sort((x, y) => y - x)
    .slice(0, 3)
  if (top3.length === 0) return null
  const top3Avg = top3.reduce((s, x) => s + x, 0) / top3.length
  const market = hasMinimumMarketData(currentProject.value.market_size)
    ? computeMarketAttractiveness(currentProject.value.market_size)
    : 0
  return Math.round(top3Avg * 0.7 + market * 0.3)
})

const defensibilityIsHigh = computed(() => (defensibilityScore.value ?? 0) >= 70)

// Auto-close drawer on route change (mobile UX — user clicks a module link).
watch(() => route.path, () => {
  if (isSidebarOpen.value) closeSidebar()
})
</script>

<template>
  <aside
    class="w-72 shrink-0 border-r border-border-subtle flex flex-col bg-bg-base
           md:sticky md:top-14 md:h-[calc(100vh-3.5rem)] md:translate-x-0
           fixed top-14 left-0 h-[calc(100vh-3.5rem)] z-40
           transition-transform duration-200 ease-out"
    :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
  >
    <!-- Top actions: New project (primary CTA) + Dashboard (back-to-list).
         The topbar already has 'Assess → /dashboard' but inside a project
         users expect a sidebar shortcut too — keeps them in-context. -->
    <div class="px-3 pt-3 pb-1.5 space-y-1">
      <NuxtLink
        :to="localePath('/project/new')"
        class="flex items-center justify-center gap-2 w-full px-3 py-1.5 rounded-lg
               bg-accent-blue text-white text-sm font-medium
               hover:bg-accent-blue-bright transition-colors"
      >
        <span>+</span>
        <span>{{ t('sidebar.newProject') }}</span>
      </NuxtLink>
      <NuxtLink
        :to="localePath('/dashboard')"
        class="flex items-center justify-between w-full px-3 py-1.5 rounded-lg text-sm
               text-ink-mid hover:text-ink-high hover:bg-bg-card transition-colors"
      >
        <span class="flex items-center gap-2">
          <span class="glyph text-xs">▦</span>
          <span>{{ t('sidebar.allProjects') }}</span>
        </span>
        <span class="text-xs text-ink-low tabular-nums">{{ projectList.length }}</span>
      </NuxtLink>
    </div>

    <!-- Project list + current project expanded -->
    <div class="flex-1 overflow-y-auto px-3 py-1.5 space-y-1">
      <!-- Current project: expanded with modules nav -->
      <div v-if="currentProject" class="space-y-0.5">
        <div class="flex items-center gap-2 px-2 py-1">
          <span
            class="w-6 h-6 rounded flex items-center justify-center text-xs font-medium
                   bg-accent-blue/20 text-accent-blue-bright"
          >
            {{ projectInitial(currentProject) }}
          </span>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium text-ink-high truncate">{{ currentProject.name }}</div>
            <div class="text-xs text-ink-low truncate">
              {{ t(`sectors.${currentProject.sector}`) }} · {{ t(`stages.${currentProject.stage}`) }}
            </div>
          </div>
          <span class="glyph text-xs text-ink-low">▾</span>
        </div>

        <!-- Module nav (3 sections) -->
        <div class="pl-2 space-y-2 pt-0.5">
          <!-- SETUP section -->
          <div class="space-y-0.5">
            <p class="text-[10px] uppercase tracking-widest text-ink-low px-2">{{ t('sidebar.setupSection') }}</p>
            <NuxtLink
              :to="localePath(`/project/${currentProject.local_id}`)"
              class="flex items-center justify-between pl-5 pr-2 py-1 rounded text-sm transition-colors"
              :class="isActive(`/project/${currentProject.local_id}`)
                ? 'bg-accent-blue/15 text-ink-high border-l-2 border-accent-blue'
                : 'text-ink-mid hover:text-ink-high hover:bg-bg-card'"
            >
              <span class="flex items-center gap-2">
                <span>{{ t('hub.module0') }}</span>
              </span>
              <span class="text-xs text-gold-bright">✓</span>
            </NuxtLink>
            <NuxtLink
              :to="localePath(`/project/${currentProject.local_id}/market`)"
              class="flex items-center justify-between pl-5 pr-2 py-1 rounded text-sm transition-colors"
              :class="isActive(`/project/${currentProject.local_id}/market`)
                ? 'bg-accent-blue/15 text-ink-high border-l-2 border-accent-blue'
                : 'text-ink-mid hover:text-ink-high hover:bg-bg-card'"
            >
              <span class="flex items-center gap-2">
                <span>{{ t('hub.module1') }}</span>
              </span>
              <span
                v-if="marketDone"
                class="text-xs tabular-nums"
                :class="marketScore >= 70 ? 'text-gold-bright' : 'text-accent-blue-bright'"
              >{{ marketScore }}</span>
            </NuxtLink>
          </div>

          <!-- 7 POWERS section -->
          <div class="space-y-0.5">
            <p class="text-[10px] uppercase tracking-widest text-ink-low px-2">{{ t('sidebar.powersSection') }}</p>
            <template v-for="(power, idx) in powers" :key="power">
              <NuxtLink
                v-if="IMPLEMENTED_POWERS.includes(power)"
                :to="localePath(`/project/${currentProject.local_id}/power/${power}`)"
                class="flex items-center justify-between pl-5 pr-2 py-1 rounded text-sm transition-colors"
                :class="isActive(`/project/${currentProject.local_id}/power/${power}`)
                  ? 'bg-accent-blue/15 text-ink-high border-l-2 border-accent-blue'
                  : 'text-ink-mid hover:text-ink-high hover:bg-bg-card'"
              >
                <span class="flex items-center gap-2">
                  <span class="text-[10px] text-gold-bright/80 font-mono tabular-nums">{{ String(idx + 1).padStart(2, '0') }}</span>
                  <span class="glyph text-sm text-accent-blue-bright">{{ t(`powerGlyphs.${power}`) }}</span>
                  <span>{{ t(`powers.${power}`) }}</span>
                </span>
                <span
                  v-if="powerDone(power)"
                  class="text-xs tabular-nums"
                  :class="powerScore(power) >= 70 ? 'text-gold-bright' : 'text-accent-blue-bright'"
                >{{ powerScore(power) }}</span>
              </NuxtLink>

              <div
                v-else
                class="flex items-center justify-between pl-5 pr-2 py-1 rounded text-sm text-ink-low opacity-60 cursor-not-allowed"
                :title="t('hub.comingSoon')"
              >
                <span class="flex items-center gap-2">
                  <span class="text-[10px] font-mono tabular-nums">{{ String(idx + 1).padStart(2, '0') }}</span>
                  <span class="glyph text-sm">{{ t(`powerGlyphs.${power}`) }}</span>
                  <span>{{ t(`powers.${power}`) }}</span>
                </span>
              </div>
            </template>
          </div>

          <!-- SYNTHESIS section -->
          <div class="space-y-0.5">
            <p class="text-[10px] uppercase tracking-widest text-ink-low px-2">{{ t('sidebar.synthesisSection') }}</p>
            <NuxtLink
              :to="localePath(`/project/${currentProject.local_id}/synthesis`)"
              class="flex items-center justify-between pl-5 pr-2 py-1 rounded text-sm transition-colors"
              :class="isActive(`/project/${currentProject.local_id}/synthesis`)
                ? 'bg-accent-blue/15 text-ink-high border-l-2 border-accent-blue'
                : 'text-ink-mid hover:text-ink-high hover:bg-bg-card'"
            >
              <span class="flex items-center gap-2">
                <span class="glyph text-sm text-gold-bright">✦</span>
                <span>{{ t('hub.moduleSynthesis') }}</span>
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Other projects: collapsed -->
      <div v-if="otherProjects.length > 0" class="pt-3 space-y-0.5 border-t border-border-subtle mt-2">
        <p class="text-[10px] uppercase tracking-widest text-ink-low px-2 mb-1">{{ t('sidebar.otherProjects') }}</p>
        <button
          v-for="p in otherProjects"
          :key="p.local_id"
          type="button"
          class="flex items-center gap-2 w-full pl-5 pr-2 py-1 rounded text-sm
                 text-ink-mid hover:text-ink-high hover:bg-bg-card transition-colors text-left"
          @click="handleProjectSwitch(p)"
        >
          <span
            class="w-6 h-6 rounded flex items-center justify-center text-xs font-medium
                   bg-bg-elevated text-ink-mid"
          >
            {{ projectInitial(p) }}
          </span>
          <span class="truncate flex-1 min-w-0">{{ p.name }}</span>
        </button>
      </div>
    </div>

    <!-- Defensibility score (bottom of nav, above meta footer) -->
    <div
      v-if="defensibilityScore !== null"
      class="px-5 py-2.5 border-t border-border-subtle"
    >
      <div class="flex items-baseline justify-between">
        <span class="text-[10px] uppercase tracking-widest text-ink-low">
          {{ t('sidebar.defensibility') }}
        </span>
        <span
          class="text-2xl font-semibold tabular-nums"
          :class="defensibilityIsHigh ? 'text-gold-bright' : 'text-accent-blue-bright'"
        >
          {{ defensibilityScore }}<span class="text-xs text-ink-low">/100</span>
        </span>
      </div>
    </div>

  </aside>
</template>
