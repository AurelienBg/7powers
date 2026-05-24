/**
 * useXrplWallet — façade over the plugin-provided WalletManager state.
 *
 * Responsibilities:
 *   - Expose reactive `connected` / `account` / `error` / `connecting` to UI.
 *   - Provide `connect()` / `disconnect()` actions wired to the web component.
 *   - Bridge the wallet to Supabase auth: on (re)connection, if the user is
 *     signed in, persist the XRPL address to `user_metadata.xrpl_address` so
 *     it survives across devices and shows up in the header chip even before
 *     the wallet has had time to re-handshake.
 *
 * Phase A scope: wallet is an *additional identity*, not an auth method.
 * The "sign in with XRPL" flow is backlog (Phase B).
 */
import type { XrplWalletState } from '~/plugins/xrplWallet.client'

// The connector web component exposes `open()` / `close()` / `setWalletManager()`
// methods. We type only what we use.
interface XrplWalletConnectorElement extends HTMLElement {
  open: () => void
  close: () => void
  setWalletManager: (manager: unknown) => void
}

// Module-scoped ref to the mounted <xrpl-wallet-connector> custom element.
// The layout assigns this once when the modal mounts; pages then call
// useXrplWallet().connect() to open it.
const _connectorEl = ref<XrplWalletConnectorElement | null>(null)

export function useXrplWallet() {
  const nuxtApp = useNuxtApp()
  const supabase = useSupabaseClient()
  const supabaseUser = useSupabaseUser()

  // The plugin only runs client-side, so on the server `$xrplWallet` is
  // undefined. Return a stub so SSR doesn't crash; the real state takes
  // over on hydration.
  const state = (nuxtApp.$xrplWallet as XrplWalletState | undefined) ?? null

  const connected = computed(() => state?.connected ?? false)
  const account = computed(() => state?.account ?? null)
  const error = computed(() => state?.error ?? null)
  const connecting = computed(() => state?.connecting ?? false)

  /** XRPL address persisted on the Supabase user (survives reloads). */
  const linkedAddress = computed<string | null>(() => {
    const md = supabaseUser.value?.user_metadata as { xrpl_address?: unknown } | undefined
    return typeof md?.xrpl_address === 'string' ? md.xrpl_address : null
  })

  /** `r…XoQT` — short form for header chips. */
  function shorten(address: string | null | undefined): string {
    if (!address) return ''
    if (address.length <= 12) return address
    return `${address.slice(0, 6)}…${address.slice(-4)}`
  }

  /** Register the mounted connector element once. */
  function registerConnector(el: XrplWalletConnectorElement | null) {
    _connectorEl.value = el
    if (el && state?.manager) {
      el.setWalletManager(state.manager)
      console.log('[useXrplWallet] connector element registered + wallet manager attached')
    } else if (!el) {
      console.log('[useXrplWallet] connector element unregistered')
    }
  }

  /** Open the wallet selection modal. */
  function connect() {
    if (!state) {
      console.warn('[useXrplWallet] no state — plugin not initialized (server-side?)')
      return
    }
    state.connecting = true
    state.error = null
    if (!_connectorEl.value) {
      // The layout always mounts the connector — if we get here, something
      // upstream is broken. Reset the spinner so the UI isn't stuck.
      state.connecting = false
      console.warn('[useXrplWallet] connector element not mounted yet — click was a no-op')
      return
    }
    if (typeof _connectorEl.value.open !== 'function') {
      state.connecting = false
      console.error('[useXrplWallet] connector element has no .open() method', _connectorEl.value)
      return
    }
    console.log('[useXrplWallet] opening wallet picker…')
    _connectorEl.value.open()
  }

  /** Disconnect the wallet session AND clear the linked address on Supabase. */
  async function disconnect() {
    if (state?.manager) {
      try {
        await state.manager.disconnect()
      } catch (e) {
        console.error('[useXrplWallet] disconnect failed:', e)
      }
    }
    // Also unlink from the Supabase identity so the chip disappears.
    await unlinkFromAccount()
  }

  /**
   * Persist the currently-connected XRPL address to the Supabase user's
   * metadata. Idempotent: if the same address is already stored, skip.
   * No-op if the user isn't signed in.
   */
  async function linkToAccount(): Promise<void> {
    if (!supabaseUser.value) return
    const addr = account.value?.address
    if (!addr) return
    if (linkedAddress.value === addr) return

    const { error: updateError } = await supabase.auth.updateUser({
      data: { xrpl_address: addr }
    })
    if (updateError) {
      console.error('[useXrplWallet] failed to persist xrpl_address:', updateError)
    }
  }

  /** Clear the stored XRPL address on the Supabase user (best-effort). */
  async function unlinkFromAccount(): Promise<void> {
    if (!supabaseUser.value) return
    if (!linkedAddress.value) return

    const { error: updateError } = await supabase.auth.updateUser({
      data: { xrpl_address: null }
    })
    if (updateError) {
      console.error('[useXrplWallet] failed to clear xrpl_address:', updateError)
    }
  }

  // Auto-link whenever a connection lands AND the user is signed in.
  // watchEffect re-fires on either signal flipping, which covers:
  //   1. user signs in while wallet already connected → link
  //   2. user connects wallet while already signed in → link
  if (typeof window !== 'undefined') {
    watchEffect(() => {
      if (supabaseUser.value && account.value?.address) {
        void linkToAccount()
      }
    })
  }

  return {
    // state
    connected,
    account,
    error,
    connecting,
    linkedAddress,
    // helpers
    shorten,
    // actions
    registerConnector,
    connect,
    disconnect,
    linkToAccount,
    unlinkFromAccount
  }
}
