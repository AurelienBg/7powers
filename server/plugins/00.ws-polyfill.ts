/**
 * WebSocket polyfill for Node.js < 22.
 *
 * @supabase/realtime-js is initialized eagerly by createClient(), and reads
 * `globalThis.WebSocket` to detect environment support. Node 22+ exposes this
 * natively; on Node 20 (and earlier), it doesn't, and the constructor throws:
 *
 *   "Node.js 20 detected without native WebSocket support."
 *
 * Polyfilling here, in a Nitro plugin, makes the global available at server
 * startup — BEFORE the @nuxtjs/supabase Nuxt plugin instantiates the client.
 *
 * No effect in the browser (native WebSocket exists) and no effect on Node 22+
 * (the typeof check is a no-op). When the runtime drops Node 20 support, this
 * file can be deleted.
 *
 * Filename prefix `00.` keeps it ordered first among Nitro plugins.
 */
export default defineNitroPlugin(async () => {
  if (typeof globalThis.WebSocket === 'undefined') {
    const wsModule = await import('ws')
    // ws exports both `default` (constructor) and `WebSocket` named export.
    // Some bundler outputs differ — fall back through both.
    const WebSocketImpl = (wsModule as { WebSocket?: unknown; default?: unknown }).WebSocket
      ?? (wsModule as { WebSocket?: unknown; default?: unknown }).default
      ?? wsModule
    // @ts-expect-error - ws WebSocket signature differs slightly from the browser global,
    // but is API-compatible for what realtime-js uses (open/close/send/onmessage/onerror).
    globalThis.WebSocket = WebSocketImpl
  }
})
