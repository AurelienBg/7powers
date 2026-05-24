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
    <!-- The <xrpl-wallet-connector> web component renders its OWN default
         button + dropdown UI when present in the DOM. We don't want that
         here — we trigger the modal programmatically via .open() from
         useXrplWallet().connect(). The default button was hovering in the
         page and intercepting clicks on adjacent nav links (e.g. clicking
         "Apprendre" landed on the wallet modal instead).
         Solution: position the element 1×1px off-screen with pointer-events
         disabled, so the JS interface stays live but the rendered UI can't
         catch any pointer events. The .open() call portals the modal to
         fixed positioning on top of everything when actually needed. -->
    <div
      aria-hidden="true"
      style="position: fixed; left: -9999px; top: -9999px; width: 1px; height: 1px; overflow: hidden; pointer-events: none;"
    >
      <xrpl-wallet-connector
        ref="connectorEl"
        primary-wallet="xaman"
        background-color="#0a0a0f"
      />
    </div>
  </ClientOnly>
</template>
