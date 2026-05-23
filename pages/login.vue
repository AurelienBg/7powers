<script setup lang="ts">
const { t } = useI18n()
const { sendMagicLink, isAuthenticated } = useAuth()

const email = ref('')
const status = ref<'idle' | 'sending' | 'sent' | 'error'>('idle')
const errorMessage = ref<string | null>(null)

// If already authenticated, bounce away from the login page.
watchEffect(() => {
  if (isAuthenticated.value) navigateTo('/')
})

async function submit() {
  if (!email.value.includes('@')) {
    errorMessage.value = t('login.invalidEmail')
    status.value = 'error'
    return
  }
  status.value = 'sending'
  errorMessage.value = null
  try {
    await sendMagicLink(email.value)
    status.value = 'sent'
  } catch (e) {
    status.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : t('login.genericError')
  }
}
</script>

<template>
  <main class="mx-auto max-w-md px-6 py-24">
    <div class="card p-8 space-y-6">
      <div class="flex items-center gap-3 text-ink-mid">
        <Logo :size="40" mode="dark" />
        <span class="tracking-widest text-xs uppercase">{{ t('app.name') }}</span>
      </div>

      <div class="space-y-2">
        <h1 class="text-2xl font-semibold text-ink-high">
          {{ t('login.title') }}
        </h1>
        <p class="text-sm text-ink-mid">
          {{ t('login.subtitle') }}
        </p>
      </div>

      <form v-if="status !== 'sent'" class="space-y-4" @submit.prevent="submit">
        <div class="space-y-2">
          <label for="email" class="text-xs uppercase tracking-wider text-ink-mid">
            {{ t('login.emailLabel') }}
          </label>
          <input
            id="email"
            v-model="email"
            type="email"
            autocomplete="email"
            required
            class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-4 py-2.5
                   text-ink-high placeholder:text-ink-low
                   focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                   transition-colors"
            :placeholder="t('login.emailPlaceholder')"
          >
        </div>

        <button
          type="submit"
          class="btn-primary w-full"
          :disabled="status === 'sending'"
        >
          <span v-if="status === 'sending'">{{ t('login.sending') }}</span>
          <span v-else>{{ t('login.sendLink') }}</span>
        </button>

        <p v-if="errorMessage" class="text-sm text-red-400">
          {{ errorMessage }}
        </p>
      </form>

      <div v-else class="space-y-3">
        <div class="card p-4 border-accent-blue/40">
          <p class="text-sm text-ink-high">
            <span class="glyph text-accent-blue-bright mr-2">✦</span>
            {{ t('login.sentTitle') }}
          </p>
          <p class="text-xs text-ink-mid mt-2">
            {{ t('login.sentBody', { email }) }}
          </p>
        </div>
        <button type="button" class="btn-ghost w-full" @click="status = 'idle'">
          {{ t('login.useDifferentEmail') }}
        </button>
      </div>

      <p class="text-xs text-ink-low text-center">
        {{ t('login.localFirstHint') }}
      </p>
    </div>
  </main>
</template>
