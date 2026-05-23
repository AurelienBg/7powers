<script setup lang="ts">
const { t, locale, locales } = useI18n()
// @nuxtjs/i18n v10 no longer auto-imports localePath/switchLocalePath as globals.
// They must be obtained via these composables.
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const { isAuthenticated, signOut, user } = useAuth()
// Mount the cloud-sync watcher here — it runs once for the lifetime of the
// layout (which is the lifetime of any logged session). It triggers an
// initial push of the local project to Supabase the moment auth lands.
const { status: syncStatus } = useCloudSync()

const otherLocales = computed(() =>
  (locales.value as { code: string; name: string }[]).filter((l) => l.code !== locale.value)
)

const syncLabel = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return t('nav.syncingToCloud')
    case 'synced':  return t('nav.syncedToCloud')
    case 'error':   return t('nav.syncFailed')
    default:        return ''
  }
})

const syncToneClass = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return 'text-accent-blue-bright'
    case 'synced':  return 'text-ink-mid'
    case 'error':   return 'text-amber-400'
    default:        return 'text-ink-low'
  }
})

async function handleSignOut() {
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg-base text-ink-high">
    <header class="border-b border-border-subtle">
      <div class="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <NuxtLink :to="localePath('/')" class="flex items-center gap-2.5">
          <Logo :size="28" mode="dark" />
          <span class="font-semibold tracking-tight">{{ t('app.name') }}</span>
        </NuxtLink>

        <nav class="flex items-center gap-2">
          <NuxtLink
            v-for="l in otherLocales"
            :key="l.code"
            :to="switchLocalePath(l.code)"
            class="text-xs uppercase tracking-wider text-ink-mid hover:text-ink-high px-2 py-1 transition-colors"
          >
            {{ l.code }}
          </NuxtLink>

          <span class="w-px h-4 bg-border-subtle mx-1" />

          <template v-if="isAuthenticated">
            <span
              v-if="syncStatus !== 'idle'"
              class="text-xs hidden md:inline-flex items-center gap-1 transition-colors"
              :class="syncToneClass"
              :title="syncLabel"
            >
              <span class="glyph">{{ syncStatus === 'error' ? '⚠' : syncStatus === 'syncing' ? '↻' : '☁' }}</span>
              <span>{{ syncLabel }}</span>
            </span>
            <span class="text-xs text-ink-mid hidden md:inline">{{ user?.email }}</span>
            <button type="button" class="btn-ghost !py-1.5 !px-3 text-sm" @click="handleSignOut">
              {{ t('nav.logout') }}
            </button>
          </template>
          <template v-else>
            <NuxtLink :to="localePath('/login')" class="btn-ghost !py-1.5 !px-3 text-sm">
              {{ t('nav.login') }}
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-border-subtle py-6 mt-12">
      <div class="mx-auto max-w-6xl px-6 text-xs text-ink-low flex items-center justify-between">
        <span>{{ t('app.name') }} — {{ t('app.tagline') }}</span>
        <Logo :size="18" mode="dark" :show-seven="false" />
      </div>
    </footer>
  </div>
</template>
