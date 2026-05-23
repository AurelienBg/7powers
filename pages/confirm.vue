<script setup lang="ts">
const { t } = useI18n()
const user = useSupabaseUser()

// Supabase processes the magic-link tokens automatically when this page loads.
// Once `user` is populated, redirect home.
watchEffect(() => {
  if (user.value) {
    // Small delay so the user sees the confirmation flash.
    setTimeout(() => navigateTo('/'), 400)
  }
})
</script>

<template>
  <main class="mx-auto max-w-md px-6 py-24">
    <div class="card p-8 space-y-4 text-center">
      <div class="glyph text-3xl text-accent-blue-bright">⬡</div>
      <h1 class="text-xl font-semibold text-ink-high">
        {{ user ? t('confirm.success') : t('confirm.verifying') }}
      </h1>
      <p class="text-sm text-ink-mid">
        {{ user ? t('confirm.redirecting') : t('confirm.hint') }}
      </p>
    </div>
  </main>
</template>
