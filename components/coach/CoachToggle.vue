<script setup lang="ts">
const { t } = useI18n()
const isOpen = useState<boolean>('coach-open', () => false)
const { currentProject } = useProject()

function toggle() {
  isOpen.value = !isOpen.value
}
</script>

<template>
  <button
    v-if="currentProject && !isOpen"
    type="button"
    class="fixed bottom-5 right-5 z-30
           inline-flex items-center gap-2 px-4 py-2.5 rounded-full
           bg-accent-blue text-white font-medium text-sm
           shadow-glow-blue
           hover:bg-accent-blue-bright transition-colors"
    :aria-label="t('coach.open')"
    @click="toggle"
  >
    <span class="glyph text-base">✦</span>
    <span>{{ t('coach.open') }}</span>
  </button>
</template>
