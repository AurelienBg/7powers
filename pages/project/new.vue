<script setup lang="ts">
import type { ProjectSector, ProjectStage } from '~/types/database'

// Use the project layout so the sidebar stays visible during creation
// (lets the user switch back to an existing project mid-form).
definePageMeta({ layout: 'project' })

const { t, locale } = useI18n()
const localePath = useLocalePath()
const { createProject, hasAnyProject, projectList } = useProject()
const { isAuthenticated } = useAuth()

// Anon users are capped at 1 local project. If they hit this page despite
// already having one, redirect to their existing hub.
if (!isAuthenticated.value && hasAnyProject.value) {
  const existing = projectList.value[0]
  if (existing) {
    await navigateTo(localePath(`/project/${existing.local_id}`))
  }
}

const sectors: { id: ProjectSector; glyph: string }[] = [
  { id: 'defi', glyph: '◉' },
  { id: 'ai', glyph: '⬡' },
  { id: 'saas', glyph: '◈' },
  { id: 'web3-other', glyph: '△' }
]

const stages: { id: ProjectStage; index: number }[] = [
  { id: 'origination', index: 1 },
  { id: 'takeoff', index: 2 },
  { id: 'stability', index: 3 }
]

const form = reactive<{
  name: string
  sector: ProjectSector | ''
  stage: ProjectStage | ''
  description: string
}>({
  name: '',
  sector: '',
  stage: '',
  description: ''
})

const errors = reactive<{ name?: string; sector?: string; stage?: string }>({})

// ============================================================
// URL import — AI-assisted Module 0 pre-fill
// ============================================================
//
// The user pastes a URL (their product's homepage). We POST to
// /api/import-url, which fetches the page server-side, sends a cleaned
// extract to Claude with forced tool-use, and returns
// {name, sector?, stage?, description?}. Whatever Claude could infer is
// merged into the form — fields that were already user-edited are
// preserved (we never overwrite). Form is "AI-prefilled but reviewable".
//
// Why server-side fetch: avoids CORS issues + protects ANTHROPIC_API_KEY +
// applies a uniform SSRF / size / timeout policy. See server/api/import-url.post.ts.
//
// ============================================================
const importUrl = ref('')
const importStatus = ref<'idle' | 'loading' | 'success' | 'error'>('idle')
const importMessage = ref<string | null>(null)
const showImport = ref(true)

interface ImportResponse {
  name: string
  sector: ProjectSector | null
  stage: ProjectStage | null
  description: string | null
  finalUrl: string
}

async function runImport() {
  const url = importUrl.value.trim()
  if (!url) {
    importStatus.value = 'error'
    importMessage.value = t('module0.import.errorEmpty')
    return
  }
  importStatus.value = 'loading'
  importMessage.value = null
  try {
    const data = await $fetch<ImportResponse>('/api/import-url', {
      method: 'POST',
      body: { url, locale: locale.value }
    })

    // Merge: only fill blank fields, so user input always wins.
    let filled = 0
    if (data.name && !form.name.trim()) {
      form.name = data.name
      filled++
    }
    if (data.sector && !form.sector) {
      form.sector = data.sector
      filled++
    }
    if (data.stage && !form.stage) {
      form.stage = data.stage
      filled++
    }
    if (data.description && !form.description.trim()) {
      form.description = data.description
      filled++
    }

    if (filled === 0) {
      importStatus.value = 'error'
      importMessage.value = t('module0.import.errorNothingNew')
    } else {
      importStatus.value = 'success'
      importMessage.value = t('module0.import.success', { count: filled })
    }
  } catch (e) {
    importStatus.value = 'error'
    // $fetch wraps errors — the readable message is on e.data.error for our
    // endpoint (which returns { error: string } on failure).
    const err = e as { data?: { error?: string }; message?: string }
    importMessage.value = err.data?.error || err.message || t('module0.import.errorGeneric')
  }
}

function validate(): boolean {
  errors.name = undefined
  errors.sector = undefined
  errors.stage = undefined
  let ok = true
  if (form.name.trim().length === 0) {
    errors.name = t('module0.errors.nameRequired')
    ok = false
  }
  if (!form.sector) {
    errors.sector = t('module0.errors.sectorRequired')
    ok = false
  }
  if (!form.stage) {
    errors.stage = t('module0.errors.stageRequired')
    ok = false
  }
  return ok
}

async function submit() {
  if (!validate()) return
  const newLocalId = createProject({
    name: form.name.trim(),
    sector: form.sector as ProjectSector,
    stage: form.stage as ProjectStage,
    description: form.description.trim() || undefined
  })
  await navigateTo(localePath(`/project/${newLocalId}`))
}
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-16">
    <div class="space-y-2 mb-10">
      <p class="text-xs uppercase tracking-widest text-accent-blue-bright">{{ t('module0.step') }}</p>
      <h1 class="text-3xl font-semibold text-ink-high">{{ t('module0.title') }}</h1>
      <p class="text-ink-mid">{{ t('module0.subtitle') }}</p>
    </div>

    <!-- AI URL import — optional shortcut to pre-fill the form -->
    <div v-if="showImport" class="card p-5 mb-10 border-accent-blue/30 bg-accent-blue/[0.03] space-y-3 relative">
      <button
        type="button"
        class="absolute top-2.5 right-2.5 text-ink-low hover:text-ink-mid transition-colors text-base leading-none"
        :title="t('module0.import.dismiss')"
        :aria-label="t('module0.import.dismiss')"
        @click="showImport = false"
      >
        ×
      </button>

      <div class="space-y-1">
        <p class="text-xs uppercase tracking-widest text-accent-blue-bright flex items-center gap-1.5">
          <span class="glyph">✦</span>
          <span>{{ t('module0.import.label') }}</span>
        </p>
        <h2 class="text-lg font-semibold text-ink-high">{{ t('module0.import.title') }}</h2>
        <p class="text-sm text-ink-mid">{{ t('module0.import.subtitle') }}</p>
      </div>

      <form class="flex flex-col sm:flex-row gap-2" @submit.prevent="runImport">
        <input
          v-model="importUrl"
          type="url"
          inputmode="url"
          autocomplete="url"
          :disabled="importStatus === 'loading'"
          class="flex-1 bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2 text-sm
                 text-ink-high placeholder:text-ink-low
                 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                 transition-colors disabled:opacity-50"
          :placeholder="t('module0.import.placeholder')"
        >
        <button
          type="submit"
          class="btn-primary !px-4 !py-2 text-sm whitespace-nowrap"
          :disabled="importStatus === 'loading'"
        >
          <span v-if="importStatus === 'loading'" class="inline-flex items-center gap-2">
            <span class="glyph animate-pulse">↻</span>
            <span>{{ t('module0.import.analyzing') }}</span>
          </span>
          <span v-else>{{ t('module0.import.button') }}</span>
        </button>
      </form>

      <p
        v-if="importMessage"
        class="text-xs"
        :class="importStatus === 'success' ? 'text-emerald-400' : 'text-amber-400'"
      >
        {{ importMessage }}
      </p>
    </div>

    <form class="space-y-10" @submit.prevent="submit">
      <!-- Name -->
      <div class="space-y-2">
        <label for="project-name" class="text-xs uppercase tracking-wider text-ink-mid">
          {{ t('module0.nameLabel') }}
        </label>
        <input
          id="project-name"
          v-model="form.name"
          type="text"
          maxlength="120"
          autocomplete="off"
          class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                 text-ink-high placeholder:text-ink-low text-lg
                 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                 transition-colors"
          :placeholder="t('module0.namePlaceholder')"
        >
        <p v-if="errors.name" class="text-sm text-red-400">{{ errors.name }}</p>
      </div>

      <!-- Sector -->
      <div class="space-y-3">
        <div class="space-y-1">
          <label class="text-xs uppercase tracking-wider text-ink-mid">
            {{ t('module0.sectorLabel') }}
          </label>
          <p class="text-xs text-ink-low">{{ t('module0.sectorHint') }}</p>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            v-for="s in sectors"
            :key="s.id"
            type="button"
            class="card-hover p-4 text-left space-y-2 cursor-pointer"
            :class="form.sector === s.id ? 'border-accent-blue shadow-glow-blue' : ''"
            @click="form.sector = s.id"
          >
            <span class="glyph text-xl text-accent-blue-bright">{{ s.glyph }}</span>
            <div class="text-sm font-medium text-ink-high">{{ t(`sectors.${s.id}`) }}</div>
            <div class="text-xs text-ink-mid leading-snug">{{ t(`sectors.${s.id}Hint`) }}</div>
          </button>
        </div>
        <p v-if="errors.sector" class="text-sm text-red-400">{{ errors.sector }}</p>
      </div>

      <!-- Stage -->
      <div class="space-y-3">
        <div class="space-y-1">
          <label class="text-xs uppercase tracking-wider text-ink-mid">
            <HelmerTooltip term="sCurve">{{ t('module0.stageLabel') }}</HelmerTooltip>
          </label>
          <p class="text-xs text-ink-low">{{ t('module0.stageHint') }}</p>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
          <button
            v-for="st in stages"
            :key="st.id"
            type="button"
            class="card-hover p-4 text-left space-y-2 cursor-pointer"
            :class="form.stage === st.id ? 'border-accent-blue shadow-glow-blue' : ''"
            @click="form.stage = st.id"
          >
            <div class="flex items-center gap-2">
              <span class="glyph text-xs text-ink-low font-mono">0{{ st.index }}</span>
              <span class="text-sm font-medium text-ink-high">{{ t(`stages.${st.id}`) }}</span>
            </div>
            <p class="text-xs text-ink-mid leading-snug">{{ t(`stages.${st.id}Hint`) }}</p>
          </button>
        </div>
        <p v-if="errors.stage" class="text-sm text-red-400">{{ errors.stage }}</p>
      </div>

      <!-- Description -->
      <div class="space-y-2">
        <label for="project-description" class="text-xs uppercase tracking-wider text-ink-mid">
          {{ t('module0.descriptionLabel') }}
          <span class="normal-case text-ink-low ml-1">{{ t('module0.descriptionOptional') }}</span>
        </label>
        <textarea
          id="project-description"
          v-model="form.description"
          rows="3"
          class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-3
                 text-ink-high placeholder:text-ink-low
                 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                 transition-colors resize-y"
          :placeholder="t('module0.descriptionPlaceholder')"
        />
      </div>

      <!-- Submit -->
      <div class="pt-4">
        <button type="submit" class="btn-primary text-base !px-6 !py-3">
          {{ t('module0.submit') }}
        </button>
      </div>
    </form>
  </main>
</template>
