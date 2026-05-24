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
// Separate "what is this?" info popover, shown when the user clicks the (?)
// icon next to the unlinked CTA. Helps non-Web3 users figure out whether
// they should care.
const infoOpen = ref(false)
// Ref + computed position for the (?) popover. We teleport it to <body>
// (see template) because when WalletBadge is rendered inside the UserMenu
// dropdown, the parent's overflow-hidden was clipping the popover and
// making it unreadable. Teleport + fixed positioning gets us out of the
// stacking/clipping context entirely.
const infoTriggerEl = ref<HTMLButtonElement | null>(null)
const infoPopoverEl = ref<HTMLElement | null>(null)
const infoPosition = ref<{ top: number; left: number }>({ top: 0, left: 0 })

function openInfo() {
  if (!infoTriggerEl.value) return
  const rect = infoTriggerEl.value.getBoundingClientRect()
  const POPOVER_WIDTH = 288 // matches Tailwind w-72
  const POPOVER_HEIGHT_EST = 210
  const MARGIN = 8
  // Center horizontally on the trigger, clamp to viewport.
  let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2
  if (left < MARGIN) left = MARGIN
  if (left + POPOVER_WIDTH > window.innerWidth - MARGIN) {
    left = window.innerWidth - POPOVER_WIDTH - MARGIN
  }
  // Default: below the trigger. Flip above if not enough room.
  let top = rect.bottom + MARGIN
  if (top + POPOVER_HEIGHT_EST > window.innerHeight - MARGIN) {
    top = rect.top - POPOVER_HEIGHT_EST - MARGIN
    if (top < MARGIN) top = MARGIN
  }
  infoPosition.value = { top, left }
  infoOpen.value = true
}

function toggleInfo() {
  if (infoOpen.value) {
    infoOpen.value = false
  } else {
    openInfo()
  }
}

// Address to display: prefer the live session, fall back to the persisted
// metadata so the chip stays stable across reloads.
const displayAddress = computed(() => account.value?.address ?? linkedAddress.value ?? null)
const shortDisplayAddress = computed(() => shorten(displayAddress.value))

const tooltip = computed(() => {
  if (!displayAddress.value) return t('nav.walletLinkTooltip')
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
  // Close BOTH popovers on outside click. The linked-status dropdown lives
  // inside rootEl (normal containment check). The info popover is teleported
  // to <body>, so we have to additionally check it via its own ref.
  if (!menuOpen.value && !infoOpen.value) return
  const target = e.target as Node
  const inRoot = rootEl.value?.contains(target) ?? false
  const inInfoPopover = infoPopoverEl.value?.contains(target) ?? false
  if (!inRoot && !inInfoPopover) {
    menuOpen.value = false
    infoOpen.value = false
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
    <!-- State 1: no linked wallet → "Lier wallet" CTA + small (?) info icon
         that opens a short explanation popover. Tooltip on the CTA itself
         gives a one-line hint; the (?) gives a deeper explanation for users
         who've never heard of XRPL. -->
    <div
      v-if="!displayAddress"
      class="inline-flex items-center gap-1"
      :class="variant === 'sidebar' ? 'w-full' : ''"
    >
      <button
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
      <button
        ref="infoTriggerEl"
        type="button"
        class="w-5 h-5 inline-flex items-center justify-center rounded-full
               text-ink-low hover:text-ink-high hover:bg-bg-elevated
               border border-border-subtle hover:border-accent-blue/40
               text-[10px] font-semibold transition-colors shrink-0"
        :aria-label="t('nav.walletWhatIsThis')"
        @click.stop="toggleInfo"
      >
        ?
      </button>
    </div>

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

  <!-- Info popover — teleported to <body> with fixed positioning so it
       escapes any ancestor's `overflow-hidden` (notably the UserMenu
       dropdown that hosts this badge as variant=sidebar). Coordinates
       computed from the trigger's getBoundingClientRect on open. -->
  <Teleport to="body">
    <div
      v-if="infoOpen && !displayAddress"
      ref="infoPopoverEl"
      class="fixed z-[100] w-72 rounded-lg border border-accent-blue/40
             bg-bg-card shadow-xl text-sm overflow-hidden
             ring-1 ring-accent-blue/10"
      :style="{ top: infoPosition.top + 'px', left: infoPosition.left + 'px' }"
    >
      <div class="px-3.5 py-3 space-y-2.5">
        <div class="flex items-center gap-2">
          <span class="glyph text-lg text-accent-blue-bright">◈</span>
          <h4 class="text-sm font-semibold text-ink-high">{{ t('nav.walletInfoTitle') }}</h4>
        </div>
        <p class="text-xs text-ink-high/90 leading-relaxed">{{ t('nav.walletInfoBody') }}</p>
        <ul class="text-xs text-ink-mid space-y-1 list-disc list-inside leading-relaxed">
          <li>{{ t('nav.walletInfoBullet1') }}</li>
          <li>{{ t('nav.walletInfoBullet2') }}</li>
          <li>{{ t('nav.walletInfoBullet3') }}</li>
        </ul>
        <p class="text-[11px] text-ink-low italic pt-2 border-t border-border-subtle leading-snug">
          {{ t('nav.walletInfoFootnote') }}
        </p>
      </div>
    </div>
  </Teleport>
</template>
