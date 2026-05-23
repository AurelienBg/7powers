<script setup lang="ts">
import type { PowerType } from '~/types/database'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const localePath = useLocalePath()
const { currentProject, hasProject, reset } = useProject()

// If there's no local project at all, or the URL id doesn't match the active project,
// send the user back to /project/new. (Multi-project support comes post-Phase 1.)
if (!hasProject.value || currentProject.value?.local_id !== route.params.id) {
  await navigateTo(localePath('/project/new'))
}

const powers: PowerType[] = [
  'scale',
  'network',
  'counter',
  'switching',
  'branding',
  'cornered',
  'process'
]

function onResetProject() {
  if (confirm(t('hub.resetConfirm'))) {
    reset()
    router.push(localePath('/'))
  }
}
</script>

<template>
  <main v-if="currentProject" class="mx-auto max-w-5xl px-6 py-12 space-y-12">
    <!-- Project header -->
    <header class="space-y-2">
      <h1 class="text-3xl font-semibold text-ink-high">{{ currentProject.name }}</h1>
      <p class="text-sm text-ink-mid">
        <span>{{ t(`sectors.${currentProject.sector}`) }}</span>
        <span class="text-ink-low mx-2">·</span>
        <span>{{ t(`stages.${currentProject.stage}`) }}</span>
      </p>
      <p v-if="currentProject.description" class="text-ink-mid max-w-2xl pt-2">
        {{ currentProject.description }}
      </p>
    </header>

    <!-- Modules grid -->
    <section class="space-y-4">
      <h2 class="text-xs uppercase tracking-widest text-ink-mid">
        {{ t('hub.modulesHeading') }}
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <!-- Module 0: done -->
        <div class="card p-5 space-y-3 border-accent-blue/50">
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-low font-mono">00</span>
            <span class="text-xs uppercase tracking-wider text-accent-blue-bright">
              {{ t('hub.done') }}
            </span>
          </div>
          <h3 class="text-base font-medium text-ink-high">{{ t('hub.module0') }}</h3>
          <p class="text-xs text-ink-mid">{{ currentProject.name }}</p>
        </div>

        <!-- Module 1: market sizing — coming soon -->
        <div class="card p-5 space-y-3 opacity-60">
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-low font-mono">01</span>
            <span class="text-xs uppercase tracking-wider text-ink-low">
              {{ t('hub.comingSoon') }}
            </span>
          </div>
          <h3 class="text-base font-medium text-ink-high">{{ t('hub.module1') }}</h3>
          <p class="text-xs text-ink-mid">TAM · SAM · SOM</p>
        </div>

        <!-- Modules 2-8: the 7 Powers — coming soon -->
        <div
          v-for="(power, idx) in powers"
          :key="power"
          class="card p-5 space-y-3 opacity-60"
        >
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-low font-mono">{{ String(idx + 2).padStart(2, '0') }}</span>
            <span class="text-xs uppercase tracking-wider text-ink-low">
              {{ t('hub.comingSoon') }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="glyph text-lg text-accent-blue-bright">{{ t(`powerGlyphs.${power}`) }}</span>
            <h3 class="text-base font-medium text-ink-high">{{ t(`powers.${power}`) }}</h3>
          </div>
        </div>

        <!-- Module 9: synthesis -->
        <div class="card p-5 space-y-3 opacity-60">
          <div class="flex items-center justify-between">
            <span class="text-xs text-ink-low font-mono">09</span>
            <span class="text-xs uppercase tracking-wider text-ink-low">
              {{ t('hub.comingSoon') }}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <span class="glyph text-lg text-gold-bright">✦</span>
            <h3 class="text-base font-medium text-ink-high">{{ t('hub.moduleSynthesis') }}</h3>
          </div>
        </div>
      </div>
    </section>

    <!-- Danger zone -->
    <section class="pt-8 border-t border-border-subtle">
      <button
        type="button"
        class="text-xs text-ink-low hover:text-red-400 transition-colors"
        @click="onResetProject"
      >
        {{ t('hub.resetProject') }}
      </button>
    </section>
  </main>
</template>
