<script setup lang="ts">
const { t } = useI18n()
const localePath = useLocalePath()
const user = useSupabaseUser()
const supabase = useSupabaseClient()

const status = ref<'verifying' | 'success' | 'error'>('verifying')
const errorMessage = ref<string | null>(null)
const errorCode = ref<string | null>(null)

/**
 * On the /confirm page we explicitly try the PKCE exchange ourselves.
 * The global plugins/supabase-pkce.client.ts runs first and may have already
 * succeeded (user.value will be truthy on mount). If not, we try again here
 * and surface the actual error to the user instead of stalling on "Verifying…".
 */
onMounted(async () => {
  // Path 1: global plugin already exchanged → just redirect.
  if (user.value) {
    status.value = 'success'
    setTimeout(() => navigateTo(localePath('/')), 400)
    return
  }

  const url = new URL(window.location.href)
  const code = url.searchParams.get('code')
  const urlErr = url.searchParams.get('error_description') ?? url.searchParams.get('error')

  // Path 2: Supabase passed back an error directly (e.g. expired magic link).
  if (urlErr) {
    status.value = 'error'
    errorMessage.value = decodeURIComponent(urlErr)
    errorCode.value = url.searchParams.get('error_code')
    return
  }

  // Path 3: No code in URL — landed here without a verification attempt.
  if (!code) {
    // Wait a beat for the reactive user state to propagate from the global plugin.
    setTimeout(() => {
      if (user.value) {
        status.value = 'success'
        navigateTo(localePath('/'))
      } else {
        status.value = 'error'
        errorMessage.value = t('confirm.errors.noCode')
      }
    }, 600)
    return
  }

  // Path 4: We have a code → try to exchange. Idempotent: if the global plugin
  // already burned it, this returns an error but user.value may already be set.
  try {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      // Common cases: code already used (plugin already ran), code expired,
      // PKCE verifier missing (link opened in a different browser).
      if (user.value) {
        // Race: plugin already won, the user is in fact signed in.
        status.value = 'success'
        setTimeout(() => navigateTo(localePath('/')), 400)
        return
      }
      status.value = 'error'
      errorMessage.value = error.message
      errorCode.value = (error as { code?: string }).code ?? null
    } else {
      // Clean the code from the URL so it doesn't sit in history.
      url.searchParams.delete('code')
      window.history.replaceState({}, '', url.toString())
      status.value = 'success'
      setTimeout(() => navigateTo(localePath('/')), 400)
    }
  } catch (e) {
    status.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : t('confirm.errors.generic')
  }
})

// Reactive fallback: if user becomes truthy at any point, succeed.
watch(user, (newUser) => {
  if (newUser && status.value !== 'success') {
    status.value = 'success'
    setTimeout(() => navigateTo(localePath('/')), 400)
  }
})
</script>

<template>
  <main class="mx-auto max-w-md px-6 py-24">
    <div class="card p-8 space-y-4 text-center">
      <div class="flex justify-center">
        <Logo :size="56" />
      </div>

      <!-- Verifying -->
      <template v-if="status === 'verifying'">
        <h1 class="text-xl font-semibold text-ink-high">{{ t('confirm.verifying') }}</h1>
        <p class="text-sm text-ink-mid">{{ t('confirm.hint') }}</p>
      </template>

      <!-- Success -->
      <template v-else-if="status === 'success'">
        <h1 class="text-xl font-semibold text-ink-high">{{ t('confirm.success') }}</h1>
        <p class="text-sm text-ink-mid">{{ t('confirm.redirecting') }}</p>
      </template>

      <!-- Error -->
      <template v-else>
        <h1 class="text-xl font-semibold text-ink-high">{{ t('confirm.errorTitle') }}</h1>
        <p class="text-sm text-ink-mid">{{ t('confirm.errorBody') }}</p>
        <div v-if="errorMessage" class="card p-3 mt-4 text-left border-red-500/30 bg-red-500/5">
          <p class="text-xs uppercase tracking-wider text-red-300 mb-1">
            {{ t('confirm.errorDetailLabel') }}
          </p>
          <p class="text-xs font-mono text-red-200 break-words">{{ errorMessage }}</p>
          <p v-if="errorCode" class="text-[10px] font-mono text-red-300/70 mt-1">code: {{ errorCode }}</p>
        </div>
        <div class="pt-4 flex flex-col gap-2">
          <NuxtLink :to="localePath('/login')" class="btn-primary !px-4 !py-2 text-sm">
            {{ t('confirm.tryAgain') }}
          </NuxtLink>
          <NuxtLink :to="localePath('/')" class="text-xs text-ink-mid hover:text-ink-high transition-colors">
            ← {{ t('confirm.backHome') }}
          </NuxtLink>
        </div>
      </template>
    </div>
  </main>
</template>
