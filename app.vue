<script setup lang="ts">
</script>

<template>
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>

  <!-- XRPL wallet connector — mounted once globally (across both `default`
       and `project` layouts) so any page can call useXrplWallet().connect()
       to open the wallet-selection modal. -->
  <WalletConnectorModal />
</template>
