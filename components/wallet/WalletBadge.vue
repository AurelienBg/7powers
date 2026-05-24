<script setup lang="ts">
/**
 * WalletBadge — XRPL wallet status indicator for the signed-in user.
 *
 * Two visual variants:
 *   - `header`  (default) — compact chip designed for the top nav. Hidden on
 *                            mobile (the sidebar exposes the same feature).
 *   - `sidebar`            — row layout matching the project layout's
 *                            sidebar footer. Visible on all breakpoints.
 *
 * Three logical states (same for both variants):
 *   1. No linked wallet                 → "Lier wallet" CTA (opens modal)
 *   2. Linked but offline this session  → shortened address + ↻
 *      (autoConnect re-handshake in flight, or wallet uninstalled)
 *   3. Linked AND live-connected        → shortened address + ◈ gold accent
 *
 * Clicking a linked chip opens a small menu to "Délier" (unlink+disconnect).
 * Hidden entirely for anonymous users — Phase A's "additional identity"
 * pattern requires being signed in first.
 */
const props = withDefaults(
  defineProps<{ variant?: 'header' | 'sidebar' }>(),
  { variant: 'header' }
)

const { t } = useI18n()
const { isAuthenticated } = useAuth()
const {
  connect,
  disconnect,
  connecting,
  connected,
  account,
  linkedAddress,
  error,
  shorten
} = useXrplWallet()

const menuOpen = ref(false)

// Address to display: prefer the live session, fall back to the persisted
// metadata so the chip stays stable across reloads.
const displayAddress = computed(() => account.value?.address ?? linkedAddress.value ?? null)
const shortDisplayAddress = computed(() => shorten(displayAddress.value))

const tooltip = computed(() => {
  if (!displayAddress.value) return t('nav.walletLink')
  if (connected.value) return t('nav.walletConnected', { address: displayAddress.value })
  return t('nav.walletReconnecting', { address: displayAddress.value })
})

async function handleUnlink() {
  menuOpen.value = false
  await disconnect()
}

// Close the dropdown when clicking outside.
const rootEl = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (!menuOpen.value) return
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    menuOpen.value = false
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

// ------------------------------------------------------------------
// Variant-driven class wiring. Keeping presentation in computed props
// avoids template branching for what is fundamentally the same logic.
// ------------------------------------------------------------------

// In header mode the chip is hidden on mobile (the sidebar exposes the
// same feature). In sidebar mode it's always visible.
const wrapperVisibilityClass = computed(() =>
  props.variant === 'header' ? 'hidden md:block' : 'block'
)

const buttonBaseClass = computed(() => {
  if (props.variant === 'sidebar') {
    // Full-width row matching adjacent footer rows in the sidebar
    return 'flex items-center gap-1.5 text-xs w-full text-left transition-colors'
  }
  // Header chip
  return [
    'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md',
    'border border-border-subtle hover:border-accent-blue',
    'text-ink-mid hover:text-ink-high transition-colors'
  ].join(' ')
})

const menuPositionClass = computed(() =>
  props.variant === 'header'
    // Pinned under the chip, right-aligned
    ? 'absolute right-0 top-full mt-1.5'
    // Anchored above the sidebar row to avoid being clipped off the bottom
    : 'absolute left-0 bottom-full mb-1.5'
)
</script>

<template>
  <div v-if="isAuthenticated" ref="rootEl" class="relative" :class="wrapperVisibilityClass">
    <!-- State 1: no linked wallet → "Lier wallet" CTA -->
    <button
      v-if="!displayAddress"
      type="button"
      :class="[
        buttonBaseClass,
        'disabled:opacity-50',
        variant === 'sidebar' ? 'text-ink-mid hover:text-ink-high' : ''
      ]"
      :disabled="connecting"
      :title="tooltip"
      @click="connect"
    >
      <span class="glyph text-accent-blue-bright">◈</span>
      <span v-if="connecting">{{ t('nav.walletConnecting') }}</span>
      <span v-else>{{ t('nav.walletLink') }}</span>
    </button>

    <!-- States 2 + 3: linked → show address, opens menu on click -->
    <button
      v-else
      type="button"
      :class="[buttonBaseClass, variant === 'header' ? 'font-mono' : '']"
      :title="tooltip"
      @click="menuOpen = !menuOpen"
    >
      <span
        class="glyph"
        :class="connected ? 'text-gold-bright' : 'text-ink-low'"
      >◈</span>
      <span :class="variant === 'sidebar' ? 'font-mono truncate flex-1 min-w-0' : ''">
        {{ shortDisplayAddress }}
      </span>
      <span v-if="!connected" class="text-ink-low text-[10px]">↻</span>
    </button>

    <!-- Dropdown for the linked chip — shared between variants -->
    <div
      v-if="menuOpen && displayAddress"
      class="w-56 rounded-lg border border-border-subtle bg-bg-elevated
             shadow-lg z-40 overflow-hidden text-sm"
      :class="menuPositionClass"
    >
      <div class="px-3 py-2 border-b border-border-subtle">
        <p class="text-[10px] uppercase tracking-wider text-ink-low">{{ t('nav.walletLinkedAddress') }}</p>
        <p class="text-xs font-mono text-ink-high break-all leading-relaxed">{{ displayAddress }}</p>
        <p
          class="text-[10px] mt-1"
          :class="connected ? 'text-emerald-400' : 'text-amber-400'"
        >
          {{ connected ? t('nav.walletStatusConnected') : t('nav.walletStatusOffline') }}
        </p>
      </div>
      <button
        type="button"
        class="w-full text-left px-3 py-2 text-xs text-ink-mid hover:text-ink-high
               hover:bg-bg-card transition-colors"
        @click="handleUnlink"
      >
        {{ t('nav.walletUnlink') }}
      </button>
    </div>

    <!-- Inline error surfacing — small, non-blocking. Header variant only;
         in the sidebar the dropdown already shows status. -->
    <p
      v-if="error && variant === 'header'"
      class="hidden md:block absolute right-0 top-full mt-1 text-[10px] text-red-400 max-w-[200px] truncate"
    >
      {{ error.message }}
    </p>
  </div>
</template>
