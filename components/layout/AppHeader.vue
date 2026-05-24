<script setup lang="ts">
/**
 * AppHeader — the single top bar of the app, shared by both `default` and
 * `project` layouts. Previously the header lived inline in default.vue and
 * `project.vue` had no header (chrome was duplicated into the sidebar
 * footer). Extracting here means:
 *   - one source of truth for nav / utility / auth controls
 *   - the project layout's sidebar can drop its duplicated brand row,
 *     learn link, auth section, lang+theme switchers, sync badge
 *   - users get the same identity controls everywhere
 *
 * Sync indicator policy (per user feedback "on ne comprend pas le nuage"):
 * the cloud chip is HIDDEN in the happy path (idle / synced). It only
 * appears for active states (syncing, error) where the user has something
 * to know about. Silence = OK. The per-project ☁ on dashboard cards
 * remains as the persistent "is this row backed up?" indicator.
 */
const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const route = useRoute()
const { isAuthenticated } = useAuth()
// Mount the cloud-sync watcher once per session lifetime.
const { status: syncStatus, errorMessage: syncError, retry: retrySync } = useCloudSync()
const showSyncError = ref(false)

const { isDark, toggle: toggleTheme } = useTheme()

const otherLocales = computed(() =>
  (locales.value as { code: string; name: string }[]).filter((l) => l.code !== locale.value)
)

const syncLabel = computed(() => {
  switch (syncStatus.value) {
    case 'syncing': return t('nav.syncingToCloud')
    case 'error':   return t('nav.syncFailed')
    default:        return ''
  }
})

// Primary nav items — declared as data so the template stays clean and
// active-state matching can use the same path source of truth as the link.
interface PrimaryNavItem {
  to: string
  labelKey: string
}
const primaryNav: PrimaryNavItem[] = [
  { to: '/dashboard', labelKey: 'nav.assess' },
  { to: '/learn',     labelKey: 'nav.learn' },
  { to: '/examples',  labelKey: 'nav.examples' }
]

// Strip the locale prefix from route.path so comparisons work the same
// in FR (default locale → NO prefix in URL) and EN (/en/...). Previously
// we compared `route.path` to `localePath(target)`, which worked in EN
// but in FR `localePath('/learn')` could resolve to either '/learn' or
// '/fr/learn' depending on Nuxt i18n internals — and `route.path` could
// land on either form too, so the active state silently failed.
const LOCALE_RE = /^\/(fr|en)(?=\/|$)/
function isActive(target: string): boolean {
  const bare = route.path.replace(LOCALE_RE, '') || '/'
  if (target === '/dashboard') {
    // Assess covers /dashboard AND every /project/* route.
    return bare === '/dashboard' || bare.startsWith('/project')
  }
  return bare === target || bare.startsWith(target + '/')
}
</script>

<template>
  <header class="border-b border-border-subtle bg-bg-base sticky top-0 z-30">
    <!-- Full-bleed inner row: logo pinned to the actual top-left of the
         viewport (px-4/6 from edge), nav cluster pinned to the right.
         Was previously inside `mx-auto max-w-6xl` which pushed the logo
         to ~150px from the edge on wide screens, hence the 'logo isn't
         top-left' feedback. -->
    <div class="px-4 md:px-6 h-14 flex items-center justify-between">
      <NuxtLink :to="localePath('/')" class="flex items-center gap-2.5 shrink-0">
        <Logo :size="28" />
        <span class="font-semibold tracking-tight">{{ t('app.name') }}</span>
      </NuxtLink>

      <!-- Three visual groups:
             1. Primary nav (md+): Assess / Learn / Examples with active state
             2. Utility cluster: lang + theme + ACTIVE-state sync indicator
             3. Auth: user menu (avatar dropdown) or "Sign in" button -->
      <nav class="flex items-center gap-1.5">
        <!-- Group 1 — Primary nav -->
        <div class="hidden md:flex items-center gap-0.5">
          <NuxtLink
            v-for="item in primaryNav"
            :key="item.to"
            :to="localePath(item.to)"
            class="text-xs uppercase tracking-wider px-3 py-1.5 rounded-md transition-colors"
            :class="isActive(item.to)
              ? 'text-ink-high bg-accent-blue/10 border border-accent-blue/40'
              : 'text-ink-mid hover:text-ink-high hover:bg-bg-elevated/60'"
          >
            {{ t(item.labelKey) }}
          </NuxtLink>
        </div>

        <span class="hidden md:inline-block w-px h-4 bg-border-subtle mx-1.5" />

        <!-- Group 2 — Utility cluster -->
        <div class="flex items-center gap-0.5">
          <NuxtLink
            v-for="l in otherLocales"
            :key="l.code"
            :to="switchLocalePath(l.code)"
            class="text-[10px] uppercase tracking-widest font-medium
                   text-ink-low hover:text-ink-high
                   px-2 py-1 rounded-md transition-colors"
            :title="t('nav.switchLocale', { code: l.code.toUpperCase() })"
            :aria-label="t('nav.switchLocale', { code: l.code.toUpperCase() })"
          >
            {{ l.code.toUpperCase() }}
          </NuxtLink>

          <button
            type="button"
            class="w-8 h-8 inline-flex items-center justify-center rounded-md
                   text-ink-mid hover:text-ink-high
                   hover:bg-bg-elevated/60 transition-colors"
            :title="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
            :aria-label="isDark ? t('nav.switchToLight') : t('nav.switchToDark')"
            @click="toggleTheme"
          >
            <svg v-if="isDark" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
            <svg v-else width="15" height="15" viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          </button>

          <!-- Sync indicator — ONLY appears for syncing/error. Silence in
               idle/synced states because a passive cloud icon confused
               users into wondering what it means. -->
          <button
            v-if="isAuthenticated && (syncStatus === 'syncing' || syncStatus === 'error')"
            type="button"
            class="text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors"
            :class="syncStatus === 'error'
              ? 'text-amber-400 hover:bg-amber-500/10 cursor-pointer'
              : 'text-accent-blue-bright cursor-default'"
            :title="syncStatus === 'error' && syncError ? syncError : syncLabel"
            :aria-label="syncStatus === 'error' && syncError ? syncError : syncLabel"
            :disabled="syncStatus !== 'error'"
            @click="syncStatus === 'error' && (showSyncError = true)"
          >
            <span class="glyph">{{ syncStatus === 'error' ? '⚠' : '↻' }}</span>
            <span class="hidden lg:inline">{{ syncLabel }}</span>
          </button>
        </div>

        <!-- Group 3 — Auth: user menu (avatar) or sign-in button -->
        <div class="flex items-center pl-1.5 ml-1 border-l border-border-subtle">
          <UserMenu v-if="isAuthenticated" />
          <NuxtLink
            v-else
            :to="localePath('/login')"
            class="btn-ghost !py-1.5 !px-3 text-sm"
          >
            {{ t('nav.login') }}
          </NuxtLink>
        </div>
      </nav>
    </div>

    <!-- Sync error modal — opens when the user clicks the ⚠ badge. Stays
         scoped to the header component so any layout using AppHeader
         gets the same error-recovery flow without duplication. -->
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
  </header>
</template>
