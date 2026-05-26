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
const { t } = useI18n()
const localePath = useLocalePath()
const { isAuthenticated, signOut, user } = useAuth()

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

      <!-- XRPL wallet — shown ONLY on mobile here (md:hidden). On desktop
           the wallet badge lives directly in the header next to the
           avatar, so duplicating it inside the dropdown is just noise.
           Mobile has no room for it in the header → keep it accessible
           via the burger menu. -->
      <div class="md:hidden px-3 py-2.5 border-b border-border-subtle">
        <p class="text-[10px] uppercase tracking-wider text-ink-low mb-1.5">
          {{ t('nav.userMenuWallet') }}
        </p>
        <WalletBadge variant="sidebar" />
      </div>

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
