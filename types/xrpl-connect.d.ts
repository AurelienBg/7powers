/**
 * Minimal ambient type declarations for the `xrpl-connect` package, which
 * ships without bundled `.d.ts` files as of v0.8.2.
 *
 * Only declares the surface area we actually consume — wallet manager,
 * Xaman adapter, the event payloads, and the Web Component element. If we
 * later use signAndSubmit / transactions / additional adapters, extend
 * this file rather than declaring `any` at call sites.
 *
 * This is an *ambient* declaration file: no top-level `import`/`export`,
 * so it gets picked up globally by every TS file in the project without
 * needing to be referenced. Adding an `export` here would turn the file
 * into a module and the `xrpl-connect` shim would not be auto-applied.
 *
 * Upstream tracking: file an issue at
 * https://github.com/XRPL-Commons/xrpl-connect/issues if proper type
 * publishing hasn't shipped yet.
 */
declare module 'xrpl-connect' {
  // ---- Account / network types ----

  export interface NetworkInfo {
    name: string
    chainId?: string
  }

  export interface AccountInfo {
    address: string
    network: NetworkInfo
    /** Some adapters expose the wallet's public key (eg. Xaman). */
    publicKey?: string
  }

  // ---- Errors ----

  export type WalletErrorCode =
    | 'WALLET_NOT_FOUND'
    | 'CONNECTION_FAILED'
    | 'SIGN_FAILED'
    | 'NETWORK_MISMATCH'
    | 'UNKNOWN'
    | (string & {})

  export interface WalletError extends Error {
    code: WalletErrorCode
  }

  // ---- Adapters ----

  export interface WalletAdapter {
    readonly id: string
    readonly name: string
  }

  export class XamanAdapter implements WalletAdapter {
    readonly id: string
    readonly name: string
    constructor(options?: { apiKey?: string })
  }

  export class CrossmarkAdapter implements WalletAdapter {
    readonly id: string
    readonly name: string
    constructor()
  }

  export class GemWalletAdapter implements WalletAdapter {
    readonly id: string
    readonly name: string
    constructor()
  }

  export class WalletConnectAdapter implements WalletAdapter {
    readonly id: string
    readonly name: string
    constructor(options?: { projectId?: string })
  }

  // ---- Wallet manager ----

  export type WalletNetwork = 'mainnet' | 'testnet' | 'devnet'

  export interface WalletManagerOptions {
    adapters: WalletAdapter[]
    network?: WalletNetwork
    autoConnect?: boolean
  }

  export type WalletEvent = 'connect' | 'disconnect' | 'error' | 'accountChanged'

  export type WalletEventPayload<E extends WalletEvent> =
    E extends 'connect' ? AccountInfo :
    E extends 'disconnect' ? void :
    E extends 'error' ? WalletError :
    E extends 'accountChanged' ? AccountInfo :
    never

  export class WalletManager {
    constructor(options: WalletManagerOptions)
    readonly connected: boolean
    readonly account: AccountInfo | null
    on<E extends WalletEvent>(event: E, handler: (payload: WalletEventPayload<E>) => void): void
    off<E extends WalletEvent>(event: E, handler: (payload: WalletEventPayload<E>) => void): void
    disconnect(): Promise<void>
    sign(transaction: Record<string, unknown>): Promise<{ signed: string; hash?: string }>
    signAndSubmit(transaction: Record<string, unknown>): Promise<{ hash: string }>
  }
}

// The connector Web Component is registered globally by xrpl-connect at
// import time. Vue treats it as a custom element (configured via
// `vue.compilerOptions.isCustomElement` in nuxt.config.ts).
interface HTMLElementTagNameMap {
  'xrpl-wallet-connector': HTMLElement & {
    open: () => void
    close: () => void
    setWalletManager: (manager: unknown) => void
  }
}
