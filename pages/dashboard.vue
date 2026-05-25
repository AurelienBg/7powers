<script setup lang="ts">
import type { LocalProject, PowerType, LocalPowerAssessment } from '~/types/database'
import { computeMarketAttractiveness, hasMinimumMarketData } from '~/utils/marketScore'

definePageMeta({ layout: 'project' })

const { t } = useI18n()
const localePath = useLocalePath()
const router = useRouter()
const { projectList, deleteProject, duplicateProject } = useProject()
const { isAuthenticated } = useAuth()
const projectStore = useProjectStore()
const { compute: computePowerScore } = usePowerScore()

const projectToDelete = ref<LocalProject | null>(null)
const deleteError = ref<string | null>(null)
const deleting = ref(false)

function projectInitial(p: LocalProject): string {
  return p.name.charAt(0).toUpperCase() || '·'
}

function projectMarketScore(p: LocalProject): number | null {
  if (!hasMinimumMarketData(p.market_size)) return null
  return computeMarketAttractiveness(p.market_size)
}

function projectDefensibility(p: LocalProject): number | null {
  const assessments = projectStore.assessmentsByProject[p.local_id] ?? {}
  const top3 = (Object.values(assessments) as (LocalPowerAssessment | undefined)[])
    .filter((a): a is NonNullable<typeof a> => !!a && typeof a.score === 'number')
    .map((a) => a.score as number)
    .sort((x, y) => y - x)
    .slice(0, 3)
  if (top3.length === 0) return null
  const top3Avg = top3.reduce((s, x) => s + x, 0) / top3.length
  const market = hasMinimumMarketData(p.market_size) ? computeMarketAttractiveness(p.market_size) : 0
  return Math.round(top3Avg * 0.7 + market * 0.3)
}

function projectCompletedPowersCount(p: LocalProject): number {
  const assessments = projectStore.assessmentsByProject[p.local_id] ?? {}
  return (Object.values(assessments) as (LocalPowerAssessment | undefined)[])
    .filter((a) => !!a && typeof a.score === 'number')
    .length
}

function isProjectSynced(p: LocalProject): boolean {
  return projectStore.syncedLocalIds.includes(p.local_id)
}

function formatRelativeTime(iso: string): string {
  const now = Date.now()
  const then = new Date(iso).getTime()
  const sec = Math.floor((now - then) / 1000)
  if (sec < 60) return t('dashboard.timeJustNow')
  if (sec < 3600) return t('dashboard.timeMinutesAgo', { n: Math.floor(sec / 60) })
  if (sec < 86400) return t('dashboard.timeHoursAgo', { n: Math.floor(sec / 3600) })
  if (sec < 2592000) return t('dashboard.timeDaysAgo', { n: Math.floor(sec / 86400) })
  return new Date(iso).toLocaleDateString()
}

function confirmDelete(p: LocalProject) {
  projectToDelete.value = p
}

function cancelDelete() {
  projectToDelete.value = null
  deleteError.value = null
}

async function executeDelete() {
  if (!projectToDelete.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await deleteProject(projectToDelete.value.local_id)
    projectToDelete.value = null
  } catch (e) {
    // Cloud delete failed (RLS, network, etc). Keep the modal open with
    // a visible error so the user can retry. Critically, we do NOT remove
    // the project locally on failure — otherwise sign-out+in would
    // resurrect it via fetchFromCloud and the bug we just fixed would
    // come back.
    deleteError.value = e instanceof Error ? e.message : t('dashboard.deleteError')
    console.error('[dashboard] delete failed:', e)
  } finally {
    deleting.value = false
  }
}

function handleEdit(p: LocalProject) {
  router.push(localePath(`/project/${p.local_id}/edit`))
}

function handleDuplicate(p: LocalProject) {
  const newName = `${p.name} ${t('dashboard.duplicateSuffix')}`
  const newId = duplicateProject(p.local_id, newName)
  if (newId) router.push(localePath(`/project/${newId}`))
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-12 space-y-10">
    <!-- Header -->
    <header class="flex items-end justify-between gap-6 flex-wrap">
      <div class="space-y-2">
        <p class="text-xs uppercase tracking-widest text-ink-mid">{{ t('dashboard.kicker') }}</p>
        <h1 class="text-3xl md:text-4xl font-semibold leading-tight text-ink-high">{{ t('dashboard.title') }}</h1>
        <p class="text-ink-mid">{{ t('dashboard.subtitle', { count: projectList.length }) }}</p>
      </div>
      <NuxtLink :to="localePath('/project/new')" class="btn-primary !px-5 !py-2.5">
        + {{ t('sidebar.newProject') }}
      </NuxtLink>
    </header>

    <!-- Empty state -->
    <section v-if="projectList.length === 0" class="card p-12 text-center space-y-4">
      <Logo :size="56" />
      <h2 class="text-xl font-semibold text-ink-high">{{ t('dashboard.emptyTitle') }}</h2>
      <p class="text-ink-mid max-w-md mx-auto">{{ t('dashboard.emptyBody') }}</p>
      <div class="pt-2">
        <NuxtLink :to="localePath('/project/new')" class="btn-primary !px-6 !py-3">
          {{ t('dashboard.emptyCta') }}
        </NuxtLink>
      </div>
    </section>

    <!-- Projects grid -->
    <section v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="p in projectList"
        :key="p.local_id"
        class="card-hover p-4 group relative flex flex-col gap-3"
      >
        <!-- Card head -->
        <div class="flex items-start gap-2.5">
          <div
            class="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-semibold shrink-0
                   bg-gradient-to-br from-accent-blue/40 to-accent-blue-glow/40
                   text-ink-high"
          >
            {{ projectInitial(p) }}
          </div>
          <div class="flex-1 min-w-0">
            <NuxtLink
              :to="localePath(`/project/${p.local_id}`)"
              class="block"
            >
              <h3 class="font-medium text-ink-high truncate group-hover:text-accent-blue-bright transition-colors">
                {{ p.name }}
              </h3>
              <p class="text-xs text-ink-mid mt-0.5">
                {{ formatRelativeTime(p.updated_at) }}
              </p>
            </NuxtLink>
          </div>
          <div class="flex items-center gap-1 shrink-0">
            <button
              type="button"
              class="w-7 h-7 rounded inline-flex items-center justify-center
                     text-accent-blue-bright hover:text-accent-blue hover:bg-bg-elevated
                     border border-border-subtle hover:border-accent-blue transition-colors"
              :title="t('dashboard.editProject')"
              @click.stop.prevent="handleEdit(p)"
            >
              <!-- Pencil / Edit -->
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
            <button
              type="button"
              class="w-7 h-7 rounded inline-flex items-center justify-center
                     text-accent-blue-bright hover:text-accent-blue hover:bg-bg-elevated
                     border border-border-subtle hover:border-accent-blue transition-colors"
              :title="t('dashboard.duplicateProject')"
              @click.stop.prevent="handleDuplicate(p)"
            >
              <!-- Copy / Duplicate -->
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
            <button
              type="button"
              class="w-7 h-7 rounded inline-flex items-center justify-center
                     text-red-400 hover:text-red-300 hover:bg-red-500/10
                     border border-border-subtle hover:border-red-400 transition-colors"
              :title="t('dashboard.deleteProject')"
              @click.stop.prevent="confirmDelete(p)"
            >
              <!-- Trash -->
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
            </button>
          </div>
        </div>

        <!-- Tags row -->
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bg-elevated text-ink-mid border border-border-subtle">
            {{ t(`sectors.${p.sector}`) }}
          </span>
          <span class="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bg-elevated text-ink-mid border border-border-subtle">
            {{ t(`stages.${p.stage}`) }}
          </span>
          <!-- Sync status: small cloud glyph with a hover tooltip.
               Uses a NAMED group (group/sync) so the tooltip only triggers
               on the cloud span itself, not on the card-wide .group ancestor
               that also exists on this card. Without the name, group-hover
               was matching the card and the tooltip popped on any card hover. -->
          <span
            v-if="isProjectSynced(p)"
            class="relative group/sync text-[10px] text-ink-low ml-0.5 select-none
                   cursor-help focus:outline-none"
            tabindex="0"
            :aria-label="t('dashboard.syncTooltip')"
          >
            ☁
            <span
              class="invisible opacity-0 group-hover/sync:visible group-hover/sync:opacity-100
                     group-focus/sync:visible group-focus/sync:opacity-100
                     transition-opacity duration-150
                     absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-20
                     w-56 px-2.5 py-1.5 rounded-md
                     bg-bg-elevated border border-border-subtle shadow-lg
                     text-[10px] text-ink-mid leading-snug normal-case tracking-normal
                     pointer-events-none text-left"
            >
              {{ t('dashboard.syncTooltip') }}
            </span>
          </span>
        </div>

        <!-- Description (takes remaining vertical space so the score row stays
             flush at the bottom even when description is absent). -->
        <p class="text-sm text-ink-mid line-clamp-2 flex-1 min-h-[1.25rem]">
          {{ p.description || '' }}
        </p>

        <!-- Score row -->
        <div class="flex items-center justify-between pt-3 border-t border-border-subtle mt-auto">
          <div class="flex gap-4">
            <div class="space-y-0.5">
              <p class="text-[10px] uppercase tracking-widest text-ink-low">{{ t('dashboard.cardMarket') }}</p>
              <p class="text-sm font-medium tabular-nums text-ink-high">
                {{ projectMarketScore(p) ?? '—' }}<span v-if="projectMarketScore(p) !== null" class="text-ink-low">/100</span>
              </p>
            </div>
            <div class="space-y-0.5">
              <p class="text-[10px] uppercase tracking-widest text-ink-low">{{ t('dashboard.cardPowers') }}</p>
              <p class="text-sm font-medium tabular-nums text-ink-high">
                {{ projectCompletedPowersCount(p) }}<span class="text-ink-low">/7</span>
              </p>
            </div>
          </div>
          <div class="space-y-0.5 text-right">
            <p class="text-[10px] uppercase tracking-widest text-ink-low">{{ t('dashboard.cardDefensibility') }}</p>
            <p
              class="text-sm font-medium tabular-nums"
              :class="(projectDefensibility(p) ?? 0) >= 70 ? 'text-gold-bright' : 'text-accent-blue-bright'"
            >
              {{ projectDefensibility(p) ?? '—' }}<span v-if="projectDefensibility(p) !== null" class="text-ink-low">/100</span>
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- Anon hint -->
    <section v-if="!isAuthenticated && projectList.length > 0" class="card p-5 border-accent-blue/30 bg-accent-blue/5">
      <p class="text-sm text-ink-high">
        <span class="glyph text-accent-blue-bright mr-2">✦</span>
        {{ t('dashboard.anonHintTitle') }}
      </p>
      <p class="text-xs text-ink-mid mt-2 max-w-2xl">
        {{ t('dashboard.anonHintBody') }}
      </p>
      <div class="pt-3">
        <NuxtLink :to="localePath('/login')" class="btn-ghost !py-1.5 !px-3 text-sm">
          {{ t('nav.login') }} →
        </NuxtLink>
      </div>
    </section>
  </div>

  <!-- Delete confirmation modal -->
  <Teleport to="body">
    <div
      v-if="projectToDelete"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-base/80 backdrop-blur-sm"
      @click.self="cancelDelete"
    >
      <div class="card p-6 max-w-md w-full space-y-4">
        <h3 class="text-lg font-semibold text-ink-high">{{ t('dashboard.deleteConfirmTitle') }}</h3>
        <p class="text-sm text-ink-mid">
          {{ t('dashboard.deleteConfirmBody', { name: projectToDelete.name }) }}
        </p>
        <div
          v-if="deleteError"
          class="card p-3 border-red-500/30 bg-red-500/5 break-words"
        >
          <p class="text-xs uppercase tracking-wider text-red-300 mb-1">{{ t('dashboard.deleteErrorLabel') }}</p>
          <p class="text-xs font-mono text-red-200">{{ deleteError }}</p>
        </div>
        <div class="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            class="btn-ghost !py-2 !px-4 text-sm"
            :disabled="deleting"
            @click="cancelDelete"
          >
            {{ t('dashboard.deleteCancel') }}
          </button>
          <button
            type="button"
            class="inline-flex items-center justify-center px-4 py-2 rounded-lg
                   bg-red-500/90 text-white text-sm font-medium
                   hover:bg-red-500 transition-colors disabled:opacity-50"
            :disabled="deleting"
            @click="executeDelete"
          >
            {{ deleting ? t('dashboard.deleting') : t('dashboard.deleteConfirm') }}
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
