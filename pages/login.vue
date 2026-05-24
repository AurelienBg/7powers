<script setup lang="ts">
/**
 * /login — three auth methods, side by side, with trade-off tooltips.
 *
 *   • Google OAuth     → 1-click, full recovery if the account is lost
 *   • Magic link       → email-based, full recovery
 *   • XRPL wallet      → Web3-native, identity = wallet address, NO email,
 *                        ⚠ NO recovery if seed is lost
 *
 * The (?) tooltips on each method surface the differences so users opt
 * into the wallet flow consciously.
 */
const { t } = useI18n()
const { sendMagicLink, signInWithGoogle, signInWithXrplWallet, isAuthenticated } = useAuth()

const email = ref('')
const status = ref<'idle' | 'sending' | 'sent' | 'error' | 'oauth' | 'wallet'>('idle')
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

async function handleGoogle() {
  status.value = 'oauth'
  errorMessage.value = null
  try {
    await signInWithGoogle()
    // signInWithOAuth navigates away to Google — no UI update needed here.
  } catch (e) {
    status.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : t('login.genericError')
  }
}

async function handleWallet() {
  status.value = 'wallet'
  errorMessage.value = null
  try {
    await signInWithXrplWallet()
    // On success, isAuthenticated flips and watchEffect navigates home.
  } catch (e) {
    status.value = 'error'
    errorMessage.value = e instanceof Error ? e.message : t('login.genericError')
  }
}

// ============================================================
// Method-comparison tooltip — single popover shared by all three (?).
// State holds which method's tooltip is open, or null.
// ============================================================
type Method = 'google' | 'magiclink' | 'wallet'
const tooltipOpen = ref<Method | null>(null)

function toggleTooltip(m: Method) {
  tooltipOpen.value = tooltipOpen.value === m ? null : m
}

// Close on outside click.
const rootEl = ref<HTMLElement | null>(null)
function onDocClick(e: MouseEvent) {
  if (!tooltipOpen.value) return
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) {
    tooltipOpen.value = null
  }
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <main class="mx-auto max-w-md px-6 py-24">
    <div ref="rootEl" class="card p-8 space-y-6">
      <div class="flex items-center gap-3 text-ink-mid">
        <Logo :size="40" />
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

      <template v-if="status !== 'sent'">
        <!-- Google OAuth -->
        <div class="relative">
          <div class="flex items-stretch gap-2">
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-3 px-4 py-2.5
                     bg-bg-elevated border border-border-subtle rounded-lg
                     text-ink-high hover:border-accent-blue hover:bg-bg-card
                     focus:outline-none focus:ring-2 focus:ring-accent-blue/30
                     transition-colors disabled:opacity-50"
              :disabled="status === 'oauth' || status === 'sending' || status === 'wallet'"
              @click="handleGoogle"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84c-.21 1.13-.84 2.08-1.78 2.72v2.26h2.88c1.69-1.55 2.66-3.84 2.66-6.62z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.46-.8 5.96-2.18l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33C2.45 15.98 5.48 18 9 18z"/>
                <path fill="#FBBC05" d="M3.96 10.71A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.28-1.71V4.96H.96A8.98 8.98 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33z"/>
                <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0 5.48 0 2.45 2.02.96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
              </svg>
              <span>
                <span v-if="status === 'oauth'">{{ t('login.redirecting') }}</span>
                <span v-else>{{ t('login.signInWithGoogle') }}</span>
              </span>
            </button>
            <button
              type="button"
              class="w-8 inline-flex items-center justify-center rounded-lg
                     text-ink-low hover:text-ink-high hover:bg-bg-elevated
                     border border-border-subtle hover:border-accent-blue/40
                     text-xs font-semibold transition-colors shrink-0"
              :aria-label="t('login.methodInfo')"
              @click.stop="toggleTooltip('google')"
            >
              ?
            </button>
          </div>
          <p
            v-if="tooltipOpen === 'google'"
            class="mt-2 text-xs text-ink-mid leading-relaxed bg-bg-elevated border border-accent-blue/30 rounded-md px-3 py-2"
          >
            {{ t('login.methods.google') }}
          </p>
        </div>

        <!-- OR divider -->
        <div class="relative flex items-center">
          <div class="flex-1 border-t border-border-subtle" />
          <span class="px-3 text-xs uppercase tracking-wider text-ink-low">{{ t('login.or') }}</span>
          <div class="flex-1 border-t border-border-subtle" />
        </div>

        <!-- Magic link form -->
        <form class="space-y-4" @submit.prevent="submit">
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <label for="email" class="text-xs uppercase tracking-wider text-ink-mid">
                {{ t('login.emailLabel') }}
              </label>
              <button
                type="button"
                class="w-5 h-5 inline-flex items-center justify-center rounded-full
                       text-ink-low hover:text-ink-high hover:bg-bg-elevated
                       border border-border-subtle hover:border-accent-blue/40
                       text-[10px] font-semibold transition-colors shrink-0"
                :aria-label="t('login.methodInfo')"
                @click.stop="toggleTooltip('magiclink')"
              >
                ?
              </button>
            </div>
            <p
              v-if="tooltipOpen === 'magiclink'"
              class="text-xs text-ink-mid leading-relaxed bg-bg-elevated border border-accent-blue/30 rounded-md px-3 py-2"
            >
              {{ t('login.methods.magiclink') }}
            </p>
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
            :disabled="status === 'sending' || status === 'oauth' || status === 'wallet'"
          >
            <span v-if="status === 'sending'">{{ t('login.sending') }}</span>
            <span v-else>{{ t('login.sendLink') }}</span>
          </button>
        </form>

        <!-- OR divider 2 -->
        <div class="relative flex items-center">
          <div class="flex-1 border-t border-border-subtle" />
          <span class="px-3 text-xs uppercase tracking-wider text-ink-low">{{ t('login.or') }}</span>
          <div class="flex-1 border-t border-border-subtle" />
        </div>

        <!-- XRPL wallet sign-in (Phase B) -->
        <div class="relative">
          <div class="flex items-stretch gap-2">
            <button
              type="button"
              class="flex-1 inline-flex items-center justify-center gap-3 px-4 py-2.5
                     bg-bg-elevated border border-accent-blue/30 rounded-lg
                     text-ink-high hover:border-accent-blue hover:bg-bg-card
                     focus:outline-none focus:ring-2 focus:ring-accent-blue/30
                     transition-colors disabled:opacity-50"
              :disabled="status === 'oauth' || status === 'sending' || status === 'wallet'"
              @click="handleWallet"
            >
              <span class="glyph text-accent-blue-bright text-base">◈</span>
              <span>
                <span v-if="status === 'wallet'">{{ t('login.walletConnecting') }}</span>
                <span v-else>{{ t('login.signInWithXrplWallet') }}</span>
              </span>
            </button>
            <button
              type="button"
              class="w-8 inline-flex items-center justify-center rounded-lg
                     text-ink-low hover:text-ink-high hover:bg-bg-elevated
                     border border-border-subtle hover:border-accent-blue/40
                     text-xs font-semibold transition-colors shrink-0"
              :aria-label="t('login.methodInfo')"
              @click.stop="toggleTooltip('wallet')"
            >
              ?
            </button>
          </div>
          <p
            v-if="tooltipOpen === 'wallet'"
            class="mt-2 text-xs text-ink-mid leading-relaxed bg-bg-elevated border border-accent-blue/30 rounded-md px-3 py-2"
          >
            {{ t('login.methods.wallet') }}
          </p>
        </div>

        <!-- Generic error surface (any method) -->
        <p v-if="errorMessage" class="text-sm text-red-400">
          {{ errorMessage }}
        </p>
      </template>

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
