<script setup lang="ts">
/**
 * UserMenu — avatar (user's initial) with a dropdown.
 *
 * Collects everything related to the *signed-in identity* into one
 * affordance: email, XRPL wallet link, sign-out. Before this the navbar
 * had email + sync badge + wallet badge + sign-out all in a row, which
 * was cluttered and gave equal visual weight to admin chrome.
 *
 * Anonymous users see a plain "Sign in" button instead — handled by the
 * parent layout, not here.
 */
const { t, locale, locales } = useI18n()
const localePath = useLocalePath()
const switchLocalePath = useSwitchLocalePath()
const { isAuthenticated, signOut, user } = useAuth()
const { isDark, toggle: toggleTheme } = useTheme()

// Locales the user can switch TO (excludes the current one).
const otherLocales = computed(() =>
  (locales.value as { code: string; name: string }[]).filter((l) => l.code !== locale.value)
)

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

// Initial char shown inside the avatar circle. Falls back to '·' so the
// avatar is never empty (covers users with no display name set).
const initial = computed(() => {
  const email = user.value?.email
  if (!email) return '·'
  return email.charAt(0).toUpperCase()
})

// Truncated email for the dropdown header. Avoids long addresses breaking
// the layout in the popover.
const shortEmail = computed(() => {
  const e = user.value?.email
  if (!e) return ''
  if (e.length <= 32) return e
  return `${e.slice(0, 18)}…${e.slice(-10)}`
})

async function handleSignOut() {
  open.value = false
  await signOut()
  await navigateTo(localePath('/'))
}

function onDocClick(e: MouseEvent) {
  if (!open.value) return
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    open.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div v-if="isAuthenticated" ref="rootEl" class="relative">
    <!-- Avatar trigger -->
    <button
      type="button"
      class="w-9 h-9 inline-flex items-center justify-center rounded-full
             bg-bg-elevated border border-border-subtle text-ink-high
             text-sm font-semibold
             hover:border-accent-blue hover:bg-bg-card
             focus:outline-none focus:ring-2 focus:ring-accent-blue/30
             transition-colors"
      :aria-label="t('nav.userMenuAria')"
      :aria-expanded="open"
      @click="open = !open"
    >
      {{ initial }}
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      class="absolute right-0 top-full mt-1.5 w-64 rounded-lg
             border border-border-subtle bg-bg-elevated shadow-lg
             z-50 overflow-hidden text-sm"
    >
      <!-- Identity row -->
      <div class="px-3 py-2.5 border-b border-border-subtle">
        <p class="text-[10px] uppercase tracking-wider text-ink-low">
          {{ t('nav.userMenuSignedInAs') }}
        </p>
        <p class="text-xs text-ink-high truncate font-medium">{{ shortEmail }}</p>
      </div>

      <!-- XRPL wallet — reuse the sidebar variant which is row-style and
           fits a dropdown context cleanly. -->
      <div class="px-3 py-2.5 border-b border-border-subtle">
        <p class="text-[10px] uppercase tracking-wider text-ink-low mb-1.5">
          {{ t('nav.userMenuWallet') }}
        </p>
        <WalletBadge variant="sidebar" />
      </div>

      <!-- Language switcher — same UX as anon's inline FR/EN, just contained -->
      <div
        v-if="otherLocales.length > 0"
        class="px-3 py-2 border-b border-border-subtle flex items-center justify-between gap-2"
      >
        <span class="text-[10px] uppercase tracking-wider text-ink-low">
          {{ t('nav.userMenuLanguage') }}
        </span>
        <div class="flex items-center gap-1.5 text-xs font-medium">
          <span class="text-ink-high uppercase tracking-wider">{{ locale }}</span>
          <span class="text-ink-low">·</span>
          <NuxtLink
            v-for="l in otherLocales"
            :key="l.code"
            :to="switchLocalePath(l.code)"
            class="text-ink-low hover:text-ink-high uppercase tracking-wider transition-colors"
            @click="open = false"
          >
            {{ l.code }}
          </NuxtLink>
        </div>
      </div>

      <!-- Theme toggle — appears just before sign-out per user spec. Click
           flips dark↔light immediately, dropdown stays open so the user
           sees the change. -->
      <button
        type="button"
        class="w-full text-left px-3 py-2.5 text-xs text-ink-mid hover:text-ink-high
               hover:bg-bg-card transition-colors flex items-center gap-2
               border-b border-border-subtle"
        @click="toggleTheme"
      >
        <span
          class="w-4 inline-flex items-center justify-center"
          :class="isDark ? 'text-gold-bright' : 'text-accent-blue-bright'"
          aria-hidden="true"
        >
          <svg v-if="isDark" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
          <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        </span>
        <span>{{ isDark ? t('nav.switchToLight') : t('nav.switchToDark') }}</span>
      </button>

      <!-- Sign-out action -->
      <button
        type="button"
        class="w-full text-left px-3 py-2.5 text-xs text-ink-mid hover:text-ink-high
               hover:bg-bg-card transition-colors flex items-center gap-2"
        @click="handleSignOut"
      >
        <span class="glyph">↩</span>
        <span>{{ t('nav.logout') }}</span>
      </button>
    </div>
  </div>
</template>
