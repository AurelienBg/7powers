<script setup lang="ts">
import type { ProjectSector, ProjectStage } from '~/types/database'

const { t } = useI18n()
const localePath = useLocalePath()
const { createProject, hasProject, currentProject } = useProject()

// If the user already has a local project, send them to its hub.
// Module 0 is for first-time setup only (one-project local model).
if (hasProject.value && currentProject.value) {
  await navigateTo(localePath(`/project/${currentProject.value.local_id}`))
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
  createProject({
    name: form.name.trim(),
    sector: form.sector as ProjectSector,
    stage: form.stage as ProjectStage,
    description: form.description.trim() || undefined
  })
  // currentProject is now populated. Send to its hub.
  if (currentProject.value) {
    await navigateTo(localePath(`/project/${currentProject.value.local_id}`))
  }
}
</script>

<template>
  <main class="mx-auto max-w-3xl px-6 py-16">
    <div class="space-y-2 mb-10">
      <p class="text-xs uppercase tracking-widest text-accent-blue-bright">{{ t('module0.step') }}</p>
      <h1 class="text-3xl font-semibold text-ink-high">{{ t('module0.title') }}</h1>
      <p class="text-ink-mid">{{ t('module0.subtitle') }}</p>
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
            {{ t('module0.stageLabel') }}
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
