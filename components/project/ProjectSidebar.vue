<script setup lang="ts">
import type { PowerType, LocalProject } from '~/types/database'
import { computeMarketAttractiveness, hasMinimumMarketData } from '~/utils/marketScore'

const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()
const { isAuthenticated, signOut, user } = useAuth()
const { status: syncStatus, errorMessage: syncError, retry: retrySync } = useCloudSync()
const showSyncError = ref(false)
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

// ============================================================
// Auth + meta
// ============================================================

const otherLocales = computed(() =>
  (locales.value as { code: string; name: string }[]).filter((l) => l.code !== locale.value)
)

const syncIcon = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return '↻'
    case 'synced':  return '☁'
    case 'error':   return '⚠'
    default:        return ''
  }
})

const syncLabel = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return t('nav.syncingToCloud')
    case 'synced':  return t('nav.syncedToCloud')
    case 'error':   return t('nav.syncFailed')
    default:        return ''
  }
})

async function handleSignOut() {
  await signOut()
  await navigateTo(localePath('/'))
  closeSidebar()
}

// Auto-close drawer on route change (mobile UX — user clicks a module link).
watch(() => route.path, () => {
  if (isSidebarOpen.value) closeSidebar()
})
</script>

<template>
  <aside
    class="w-72 shrink-0 border-r border-border-subtle flex flex-col bg-bg-base
           md:sticky md:top-0 md:h-screen md:translate-x-0
           fixed top-0 left-0 h-screen z-40
           transition-transform duration-200 ease-out"
    :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'"
  >
    <!-- Brand -->
    <div class="px-5 py-4 border-b border-border-subtle">
      <NuxtLink :to="localePath('/')" class="flex items-center gap-2.5">
        <Logo :size="24" mode="dark" />
        <span class="font-semibold tracking-tight">{{ t('app.name') }}</span>
      </NuxtLink>
    </div>

    <!-- New project + All projects -->
    <div class="px-3 pt-3 pb-2 space-y-1">
      <NuxtLink
        :to="localePath('/project/new')"
        class="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg
               bg-accent-blue text-white text-sm font-medium
               hover:bg-accent-blue-bright transition-colors"
      >
        <span>+</span>
        <span>{{ t('sidebar.newProject') }}</span>
      </NuxtLink>

      <NuxtLink
        v-if="isAuthenticated"
        :to="localePath('/dashboard')"
        class="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm
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
    <div class="flex-1 overflow-y-auto px-3 py-2 space-y-1">
      <!-- Current project: expanded with modules nav -->
      <div v-if="currentProject" class="space-y-1">
        <div class="flex items-center gap-2 px-2 py-1.5">
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
        <div class="pl-2 space-y-3 pt-1">
          <!-- SETUP section -->
          <div class="space-y-0.5">
            <p class="text-[10px] uppercase tracking-widest text-ink-low px-2">{{ t('sidebar.setupSection') }}</p>
            <NuxtLink
              :to="localePath(`/project/${currentProject.local_id}`)"
              class="flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors"
              :class="isActive(`/project/${currentProject.local_id}`)
                ? 'bg-accent-blue/15 text-ink-high border-l-2 border-accent-blue'
                : 'text-ink-mid hover:text-ink-high hover:bg-bg-card'"
            >
              <span class="flex items-center gap-2">
                <span class="text-[10px] text-ink-low font-mono tabular-nums">00</span>
                <span>{{ t('hub.module0') }}</span>
              </span>
              <span class="text-xs text-accent-blue-bright">✓</span>
            </NuxtLink>
            <NuxtLink
              :to="localePath(`/project/${currentProject.local_id}/market`)"
              class="flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors"
              :class="isActive(`/project/${currentProject.local_id}/market`)
                ? 'bg-accent-blue/15 text-ink-high border-l-2 border-accent-blue'
                : 'text-ink-mid hover:text-ink-high hover:bg-bg-card'"
            >
              <span class="flex items-center gap-2">
                <span class="text-[10px] text-ink-low font-mono tabular-nums">01</span>
                <span>{{ t('hub.module1') }}</span>
              </span>
              <span v-if="marketDone" class="text-xs text-accent-blue-bright tabular-nums">{{ marketScore }}</span>
            </NuxtLink>
          </div>

          <!-- 7 POWERS section -->
          <div class="space-y-0.5">
            <p class="text-[10px] uppercase tracking-widest text-ink-low px-2">{{ t('sidebar.powersSection') }}</p>
            <template v-for="(power, idx) in powers" :key="power">
              <NuxtLink
                v-if="IMPLEMENTED_POWERS.includes(power)"
                :to="localePath(`/project/${currentProject.local_id}/power/${power}`)"
                class="flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors"
                :class="isActive(`/project/${currentProject.local_id}/power/${power}`)
                  ? 'bg-accent-blue/15 text-ink-high border-l-2 border-accent-blue'
                  : 'text-ink-mid hover:text-ink-high hover:bg-bg-card'"
              >
                <span class="flex items-center gap-2">
                  <span class="text-[10px] text-ink-low font-mono tabular-nums">{{ String(idx + 2).padStart(2, '0') }}</span>
                  <span class="glyph text-sm text-accent-blue-bright">{{ t(`powerGlyphs.${power}`) }}</span>
                  <span>{{ t(`powers.${power}`) }}</span>
                </span>
                <span v-if="powerDone(power)" class="text-xs text-accent-blue-bright tabular-nums">{{ powerScore(power) }}</span>
              </NuxtLink>

              <div
                v-else
                class="flex items-center justify-between px-2 py-1.5 rounded text-sm text-ink-low opacity-60 cursor-not-allowed"
                :title="t('hub.comingSoon')"
              >
                <span class="flex items-center gap-2">
                  <span class="text-[10px] font-mono tabular-nums">{{ String(idx + 2).padStart(2, '0') }}</span>
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
              class="flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors"
              :class="isActive(`/project/${currentProject.local_id}/synthesis`)
                ? 'bg-accent-blue/15 text-ink-high border-l-2 border-accent-blue'
                : 'text-ink-mid hover:text-ink-high hover:bg-bg-card'"
            >
              <span class="flex items-center gap-2">
                <span class="text-[10px] text-ink-low font-mono tabular-nums">09</span>
                <span class="glyph text-sm text-gold-bright">✦</span>
                <span>{{ t('hub.moduleSynthesis') }}</span>
              </span>
            </NuxtLink>
          </div>
        </div>
      </div>

      <!-- Other projects: collapsed -->
      <div v-if="otherProjects.length > 0" class="pt-4 space-y-0.5 border-t border-border-subtle mt-3">
        <p class="text-[10px] uppercase tracking-widest text-ink-low px-2 mb-1">{{ t('sidebar.otherProjects') }}</p>
        <button
          v-for="p in otherProjects"
          :key="p.local_id"
          type="button"
          class="flex items-center gap-2 w-full px-2 py-1.5 rounded text-sm
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
      class="px-5 py-3 border-t border-border-subtle"
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

    <!-- Footer meta -->
    <div class="border-t border-border-subtle px-3 py-3 space-y-2 text-xs">
      <!-- Sync status -->
      <button
        v-if="isAuthenticated && syncStatus !== 'idle'"
        type="button"
        class="flex items-center gap-1.5 text-left w-full"
        :class="[
          syncStatus === 'error' ? 'text-amber-400 hover:underline cursor-pointer' : '',
          syncStatus === 'syncing' ? 'text-accent-blue-bright cursor-default' : '',
          syncStatus === 'synced' ? 'text-ink-mid cursor-default' : ''
        ]"
        :title="syncStatus === 'error' && syncError ? syncError : syncLabel"
        :disabled="syncStatus !== 'error'"
        @click="syncStatus === 'error' && (showSyncError = true)"
      >
        <span class="glyph">{{ syncIcon }}</span>
        <span>{{ syncLabel }}</span>
      </button>

      <!-- Auth -->
      <template v-if="isAuthenticated">
        <div class="flex items-center justify-between gap-2">
          <span class="text-ink-mid truncate min-w-0">{{ user?.email }}</span>
          <button
            type="button"
            class="text-ink-low hover:text-ink-high transition-colors underline-offset-2 hover:underline shrink-0"
            @click="handleSignOut"
          >
            {{ t('nav.logout') }}
          </button>
        </div>
      </template>
      <template v-else>
        <NuxtLink :to="localePath('/login')" class="text-ink-mid hover:text-ink-high transition-colors block">
          {{ t('nav.login') }} →
        </NuxtLink>
      </template>

      <!-- Lang switcher -->
      <div class="flex items-center gap-2 pt-1">
        <NuxtLink
          v-for="l in otherLocales"
          :key="l.code"
          :to="switchLocalePath(l.code)"
          class="text-ink-low hover:text-ink-high uppercase tracking-wider transition-colors"
        >
          {{ l.code }}
        </NuxtLink>
        <span class="text-ink-high uppercase tracking-wider">{{ locale }}</span>
      </div>
    </div>
  </aside>

  <!-- Sync error modal — same as default layout, scoped to project routes -->
  <Teleport to="body">
    <div
      v-if="showSyncError"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm"
      @click.self="showSyncError = false"
    >
      <div class="card p-6 max-w-lg w-full space-y-4 border-amber-500/30">
        <div class="flex items-center gap-2">
          <span class="glyph text-amber-400 text-xl">⚠</span>
          <h3 class="text-lg font-semibold text-ink-high">{{ t('nav.syncFailed') }}</h3>
        </div>
        <p class="text-sm text-ink-mid">{{ t('nav.syncErrorBody') }}</p>
        <div v-if="syncError" class="card p-3 border-red-500/30 bg-red-500/5 break-words">
          <p class="text-xs uppercase tracking-wider text-red-300 mb-1">{{ t('nav.syncErrorDetail') }}</p>
          <p class="text-xs font-mono text-red-200">{{ syncError }}</p>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button type="button" class="btn-ghost !py-2 !px-4 text-sm" @click="showSyncError = false">
            {{ t('nav.syncErrorClose') }}
          </button>
          <button type="button" class="btn-primary !px-4 !py-2 text-sm" @click="retrySync(); showSyncError = false">
            {{ t('nav.syncErrorRetry') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
