/**
 * XRPL wallet plugin — initializes a single WalletManager for the app and
 * provides it (plus a reactive state slice) via Nuxt's `provide`.
 *
 * Client-only because xrpl-connect ships a Web Component and touches DOM
 * APIs (localStorage, custom elements registry). Importing it on the server
 * would crash Nitro.
 *
 * Phase A scope: Xaman only, mainnet by default. The wallet is purely an
 * *additional identity* linked to an existing Supabase account — it does NOT
 * replace magic-link/Google auth. That sign-in-with-XRPL flow is backlog.
 *
 * See composables/useXrplWallet.ts for the reactive façade consumed by
 * components, and components/wallet/* for the UI.
 */
import { WalletManager, XamanAdapter } from 'xrpl-connect'
import type { AccountInfo, WalletError } from 'xrpl-connect'

export interface XrplWalletState {
  manager: WalletManager | null
  account: AccountInfo | null
  connected: boolean
  error: WalletError | null
  // Surfaces "connecting…" while the modal is open and the user hasn't
  // approved yet. Helpful for UI button states.
  connecting: boolean
}

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const xamanApiKey = config.public.xamanApiKey as string
  const network = config.public.xrplNetwork as 'mainnet' | 'testnet' | 'devnet'

  // Reactive state shared via provide(). Components read this through
  // useXrplWallet() — never directly.
  const state = reactive<XrplWalletState>({
    manager: null,
    account: null,
    connected: false,
    error: null,
    connecting: false
  })

  // If no API key is configured (eg. local dev without .env), still build the
  // manager so the rest of the UI doesn't crash — but the Xaman flow will
  // fail loudly at connect time, which is the correct behavior.
  const manager = new WalletManager({
    adapters: [new XamanAdapter({ apiKey: xamanApiKey || '' })],
    network,
    // Auto-restore the previous wallet session from localStorage on page
    // load. Listeners MUST be attached before this fires (the manager emits
    // `connect` synchronously after construction if a session exists).
    autoConnect: true
  })

  manager.on('connect', (account: AccountInfo) => {
    state.account = account
    state.connected = true
    state.connecting = false
    state.error = null
  })

  manager.on('disconnect', () => {
    state.account = null
    state.connected = false
    state.connecting = false
  })

  manager.on('error', (error: WalletError) => {
    state.error = error
    state.connecting = false
    // eslint-disable-next-line no-console
    console.error('[xrplWallet] error:', error.code, error.message)
  })

  state.manager = manager

  return {
    provide: {
      xrplWallet: state
    }
  }
})
