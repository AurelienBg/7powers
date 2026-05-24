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
const { status: syncStatus, errorMessage: syncError, retry: retrySync } = useCloudSync()
const showSyncError = ref(false)

const { isDark, toggle: toggleTheme } = useTheme()

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
          <Logo :size="28" />
          <span class="font-semibold tracking-tight">{{ t('app.name') }}</span>
        </NuxtLink>

        <nav class="flex items-center gap-2">
          <NuxtLink
            :to="localePath('/learn')"
            class="text-xs uppercase tracking-wider text-ink-mid hover:text-ink-high px-2 py-1 transition-colors"
          >
            {{ t('nav.learn') }}
          </NuxtLink>

          <NuxtLink
            v-for="l in otherLocales"
            :key="l.code"
            :to="switchLocalePath(l.code)"
            class="text-xs uppercase tracking-wider text-ink-mid hover:text-ink-high px-2 py-1 transition-colors"
          >
            {{ l.code }}
          </NuxtLink>

          <button
            type="button"
            class="w-9 h-9 inline-flex items-center justify-center rounded-lg
                   border border-border-subtle hover:border-accent-blue
                   transition-colors"
            :class="isDark ? 'text-gold-bright hover:text-gold' : 'text-accent-blue-bright hover:text-accent-blue'"
            :title="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
            :aria-label="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
            @click="toggleTheme"
          >
            <!-- Sun (currently dark → click goes light) -->
            <svg v-if="isDark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4.5" />
              <line x1="12" y1="1.5" x2="12" y2="4" />
              <line x1="12" y1="20" x2="12" y2="22.5" />
              <line x1="4.22" y1="4.22" x2="5.85" y2="5.85" />
              <line x1="18.15" y1="18.15" x2="19.78" y2="19.78" />
              <line x1="1.5" y1="12" x2="4" y2="12" />
              <line x1="20" y1="12" x2="22.5" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.85" y2="18.15" />
              <line x1="18.15" y1="5.85" x2="19.78" y2="4.22" />
            </svg>
            <!-- Moon (currently light → click goes dark) -->
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>

          <span class="w-px h-4 bg-border-subtle mx-1" />

          <template v-if="isAuthenticated">
            <button
              v-if="syncStatus !== 'idle'"
              type="button"
              class="text-xs hidden md:inline-flex items-center gap-1 transition-colors"
              :class="[syncToneClass, syncStatus === 'error' ? 'cursor-pointer hover:underline' : 'cursor-default']"
              :title="syncStatus === 'error' && syncError ? syncError : syncLabel"
              :disabled="syncStatus !== 'error'"
              @click="syncStatus === 'error' && (showSyncError = true)"
            >
              <span class="glyph">{{ syncStatus === 'error' ? '⚠' : syncStatus === 'syncing' ? '↻' : '☁' }}</span>
              <span>{{ syncLabel }}</span>
            </button>
            <span class="text-xs text-ink-mid hidden md:inline">{{ user?.email }}</span>
            <WalletBadge />
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
        <Logo :size="18" :show-seven="false" />
      </div>
    </footer>

    <!-- Sync error modal — opens when the user clicks the ⚠ badge -->
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
  </div>
</template>
