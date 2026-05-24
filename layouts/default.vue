<script setup lang="ts">
/**
 * Default layout — header + main + footer. All nav/auth/utility chrome
 * lives in <AppHeader />, which is shared with the `project` layout for
 * a consistent top bar across the whole app.
 */
const { t } = useI18n()
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg-base text-ink-high">
    <AppHeader />

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-border-subtle py-6 mt-12">
      <div class="mx-auto max-w-6xl px-6 text-xs text-ink-low flex items-center justify-between">
        <span>{{ t('app.name') }} — {{ t('app.tagline') }}</span>
        <Logo :size="18" :show-seven="false" />
      </div>
    </footer>
  </div>
</template>
