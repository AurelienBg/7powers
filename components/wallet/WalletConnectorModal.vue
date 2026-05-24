<script setup lang="ts">
/**
 * WalletConnectorModal — wraps the <xrpl-wallet-connector> Web Component
 * inside a <ClientOnly> guard (the element registers itself at import time
 * and would crash SSR otherwise).
 *
 * Mounted once globally from app.vue. UI surfaces (the header chip, the
 * sidebar footer chip, eventual /account page) trigger it via
 * useXrplWallet().connect().
 *
 * ⚠ Mount timing: <ClientOnly> defers its children's render until AFTER
 * the parent's onMounted fires. So `connectorEl.value` is still null in
 * onMounted. We watch the ref instead so registration happens the moment
 * the custom element actually lands in the DOM. Calling registerConnector
 * too early (before the element exists) is the root cause of the
 * "click 'Link wallet' does nothing" bug.
 */
const { registerConnector } = useXrplWallet()

// Ref to the actual custom element. Cast via unknown because Vue's typing
// doesn't know about the connector's custom methods (open/close/setWalletManager).
const connectorEl = ref<HTMLElement | null>(null)

// Wait for the ref to become non-null (post-ClientOnly hydration) instead
// of binding in onMounted. Triggers immediately if the element is already
// present at watch-creation time.
watch(connectorEl, (el) => {
  if (el) {
    registerConnector(el as unknown as Parameters<typeof registerConnector>[0])
  } else {
    registerConnector(null)
  }
}, { immediate: true })

onBeforeUnmount(() => {
  registerConnector(null)
})
</script>

<template>
  <ClientOnly>
    <!-- We hide the connector's default visible button via `display: none`
         on the element itself. The Web Component's lifecycle still fires
         (connectedCallback runs because the element is in the DOM tree),
         JS APIs like .open() / .setWalletManager() remain callable, and
         the modal it spawns on .open() is portaled to <body> with its
         own fixed positioning so it's visible despite the element being
         display:none.
         Why we DON'T use a position:fixed wrapper anymore: that wrapper
         created a containing block for descendant position:fixed elements,
         which clamped the wallet picker modal AND broke the runtime
         detection of installed extensions (Crossmark, GemWallet) — they
         disappeared from the picker even when installed. -->
    <xrpl-wallet-connector
      ref="connectorEl"
      primary-wallet="xaman"
      background-color="#0a0a0f"
      style="display: none"
    />
  </ClientOnly>
</template>
