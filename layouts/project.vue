<script setup lang="ts">
/**
 * Project layout — sidebar + main content slot.
 *
 * Applied to /project/[id]/* routes via definePageMeta({ layout: 'project' }).
 * The global header (FR/EN, login, sync) is intentionally absent here — its
 * content moves into the sidebar footer, Gameframe-style.
 */
const route = useRoute()
const localePath = useLocalePath()
const { projectList, switchProject, currentProject } = useProject()

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
//   - No projects at all → /project/new
//   - Projects exist but wrong id → first project hub
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
    <div class="flex-1 flex flex-col min-w-0">
      <main class="flex-1 min-w-0">
        <slot />
      </main>
    </div>
  </div>
</template>
