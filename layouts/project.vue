<script setup lang="ts">
/**
 * Project layout — sidebar + main content slot.
 *
 * Applied to /project/[id]/* routes via definePageMeta({ layout: 'project' }).
 * The global header (FR/EN, login, sync) is intentionally absent here — its
 * content moves into the sidebar footer, Gameframe-style.
 *
 * Mobile (< md): sidebar acts as a slide-in drawer; a hamburger button at
 * top-left of the main content toggles it.
 */
const { t } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
const { projectList, switchProject, currentProject } = useProject()
const { isOpen: isSidebarOpen, toggle: toggleSidebar, close: closeSidebar } = useSidebar()

// URL is source of truth for currentProjectId. When the user navigates
// to /project/[id], we sync the store accordingly.
watchEffect(() => {
  const id = route.params.id as string | undefined
  if (!id) return
  const exists = projectList.value.find((p) => p.local_id === id)
  if (exists && currentProject.value?.local_id !== id) {
    switchProject(id)
  }
})

// Guard: if the URL id doesn't match any local project, bounce.
if (route.params.id) {
  const id = route.params.id as string
  const exists = projectList.value.find((p) => p.local_id === id)
  if (!exists) {
    if (projectList.value.length === 0) {
      await navigateTo(localePath('/project/new'))
    } else {
      await navigateTo(localePath(`/project/${projectList.value[0].local_id}`))
    }
  }
}
</script>

<template>
  <div class="min-h-screen flex bg-bg-base text-ink-high">
    <ProjectSidebar />

    <!-- Mobile backdrop -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isSidebarOpen"
        class="fixed inset-0 z-30 bg-bg-base/70 backdrop-blur-sm md:hidden"
        @click="closeSidebar"
      />
    </Transition>

    <div class="flex-1 flex flex-col min-w-0">
      <!-- Mobile-only hamburger button -->
      <button
        type="button"
        class="md:hidden fixed top-3 left-3 z-30 inline-flex items-center justify-center
               w-10 h-10 rounded-lg bg-bg-card border border-border-subtle text-ink-high
               hover:border-accent-blue transition-colors"
        :aria-label="t('sidebar.openMenu')"
        @click="toggleSidebar"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
          <line x1="2" y1="4.5" x2="16" y2="4.5" />
          <line x1="2" y1="9" x2="16" y2="9" />
          <line x1="2" y1="13.5" x2="16" y2="13.5" />
        </svg>
      </button>

      <main class="flex-1 min-w-0 pt-14 md:pt-0">
        <slot />
      </main>
    </div>

    <!-- AI Coach — floating bubble (collapsed) + drawer (open) -->
    <CoachToggle />
    <CoachChat />
  </div>
</template>
