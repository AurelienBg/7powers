<script setup lang="ts">
/**
 * WalletConnectorModal — wraps the <xrpl-wallet-connector> Web Component
 * inside a <ClientOnly> guard (the element registers itself at import time
 * and would crash SSR otherwise).
 *
 * Mounted once globally from the default layout. UI surfaces (the header
 * chip, eventual /account page) trigger it via useXrplWallet().connect().
 */
const { registerConnector } = useXrplWallet()

// Ref to the actual custom element. Cast via unknown because Vue's typing
// doesn't know about the connector's custom methods (open/close/setWalletManager).
const connectorEl = ref<HTMLElement | null>(null)

onMounted(() => {
  // Re-cast to the specific shape via unknown to satisfy TS strict mode.
  registerConnector(connectorEl.value as unknown as Parameters<typeof registerConnector>[0])
})

onBeforeUnmount(() => {
  registerConnector(null)
})
</script>

<template>
  <ClientOnly>
    <!-- The connector renders its own modal/overlay; we only need to mount
         the element somewhere stable. background-color matches our dark theme. -->
    <xrpl-wallet-connector
      ref="connectorEl"
      primary-wallet="xaman"
      background-color="#0a0a0f"
    />
  </ClientOnly>
</template>
