<script setup lang="ts">
import type { PowerContext } from '~/stores/coach'
import type { PowerType } from '~/types/database'

const { t } = useI18n()
const route = useRoute()
const { currentProject } = useProject()

// ============================================================
// Open / close drawer state (shared via useState — easier than props)
// ============================================================

const isOpen = useState<boolean>('coach-open', () => false)
function close() { isOpen.value = false }

// ============================================================
// Derive powerContext from current route
// ============================================================

const powerContext = computed<PowerContext>(() => {
  // /project/[id]/power/[type] → type is the power context
  const type = route.params.type as string | undefined
  if (type && ['scale', 'network', 'counter', 'switching', 'branding', 'cornered', 'process'].includes(type)) {
    return type as PowerType
  }
  return 'general'
})

const {
  messages,
  isStreaming,
  errorMessage,
  errorCode,
  lastUsage,
  sendMessage,
  abortStream,
  clearThread
} = useCoach(powerContext)

// Derived total tokens for the most recent assistant response (input + output).
// Surfaced in the footer so the user can see how heavy their conversations are.
const totalTokens = computed(() => {
  const u = lastUsage.value
  if (!u) return null
  return (u.input_tokens ?? 0) + (u.output_tokens ?? 0)
})

// ============================================================
// Input handling
// ============================================================

const input = ref('')
const inputEl = ref<HTMLTextAreaElement | null>(null)
const messagesEl = ref<HTMLDivElement | null>(null)

async function submit() {
  if (!input.value.trim() || isStreaming.value) return
  const text = input.value
  input.value = ''
  await sendMessage(text)
}

function onKeydown(e: KeyboardEvent) {
  // Enter sends, Shift+Enter inserts a newline.
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    submit()
  }
}

// Auto-scroll to bottom on new messages / streaming deltas.
watch([messages, isStreaming], async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}, { deep: true })

// Auto-focus input when drawer opens.
watch(isOpen, async (open) => {
  if (open) {
    await nextTick()
    inputEl.value?.focus()
  }
})

// ============================================================
// Header label (which module the coach is currently "on")
// ============================================================

const contextLabel = computed(() => {
  const ctx = powerContext.value
  if (ctx === 'general') return t('coach.contextGeneral')
  return t(`powers.${ctx}`)
})

// Context-aware suggested prompts for the empty state.
// On a specific Power module, surface prompts about that Power.
// Falls back to general Helmer prompts on hub / market / etc.
const suggestedPrompts = computed<string[]>(() => {
  const ctx = powerContext.value
  if (ctx === 'general') {
    return [
      t('coach.suggestedPrompts.general.0'),
      t('coach.suggestedPrompts.general.1'),
      t('coach.suggestedPrompts.general.2'),
      t('coach.suggestedPrompts.general.3')
    ]
  }
  // Per-Power prompts — also include 1-2 generic Helmer ones for variety
  return [
    t(`coach.suggestedPrompts.${ctx}.0`),
    t(`coach.suggestedPrompts.${ctx}.1`),
    t(`coach.suggestedPrompts.${ctx}.2`),
    t('coach.suggestedPrompts.general.0')
  ]
})

async function useSuggestedPrompt(prompt: string) {
  // Auto-send: less friction than letting the user pre-edit. They can
  // always type a follow-up after seeing the response.
  await sendMessage(prompt)
}
</script>

<template>
  <Teleport to="body">
    <!-- Backdrop on mobile only -->
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="isOpen"
        class="md:hidden fixed inset-0 z-40 bg-bg-base/70 backdrop-blur-sm"
        @click="close"
      />
    </Transition>

    <!-- Drawer -->
    <aside
      v-if="currentProject"
      class="fixed right-0 top-0 h-screen w-full md:w-[420px] z-50
             bg-bg-card border-l border-border-subtle flex flex-col
             transition-transform duration-200 ease-out"
      :class="isOpen ? 'translate-x-0' : 'translate-x-full'"
      :aria-hidden="!isOpen"
    >
      <!-- Header -->
      <div class="px-4 py-3 border-b border-border-subtle flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <span class="glyph text-xl text-gold-bright shrink-0">✦</span>
          <div class="min-w-0">
            <div class="text-sm font-medium text-ink-high">{{ t('coach.title') }}</div>
            <div class="text-xs text-ink-low truncate">
              {{ t('coach.contextLabel') }} {{ contextLabel }}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button
            v-if="messages.length > 0"
            type="button"
            class="text-xs text-ink-low hover:text-ink-high transition-colors px-2 py-1"
            :title="t('coach.clearThread')"
            @click="clearThread"
          >
            {{ t('coach.clearThread') }}
          </button>
          <button
            type="button"
            class="w-8 h-8 rounded inline-flex items-center justify-center
                   text-ink-mid hover:text-ink-high hover:bg-bg-elevated transition-colors"
            :aria-label="t('coach.close')"
            @click="close"
          >
            <span class="text-xl leading-none">×</span>
          </button>
        </div>
      </div>

      <!-- Messages -->
      <div
        ref="messagesEl"
        class="flex-1 overflow-y-auto px-4 py-4 space-y-3"
      >
        <!-- Empty state with suggested prompts -->
        <div v-if="messages.length === 0" class="space-y-4 py-4">
          <div class="text-center space-y-2">
            <span class="glyph text-4xl text-gold-bright">✦</span>
            <h3 class="text-base font-medium text-ink-high">{{ t('coach.emptyTitle') }}</h3>
            <p class="text-sm text-ink-mid leading-relaxed">{{ t('coach.emptyBody') }}</p>
          </div>

          <div class="space-y-2 pt-2">
            <p class="text-[10px] uppercase tracking-widest text-ink-low text-center">
              {{ t('coach.suggestedPromptsHeading') }}
            </p>
            <div class="space-y-1.5">
              <button
                v-for="(prompt, idx) in suggestedPrompts"
                :key="idx"
                type="button"
                class="w-full text-left px-3 py-2 rounded-lg
                       bg-bg-elevated border border-border-subtle
                       text-xs text-ink-high
                       hover:border-accent-blue hover:bg-bg-card
                       transition-colors"
                @click="useSuggestedPrompt(prompt)"
              >
                {{ prompt }}
              </button>
            </div>
          </div>
        </div>

        <CoachMessage
          v-for="(msg, idx) in messages"
          :key="msg.id"
          :message="msg"
          :streaming="isStreaming && idx === messages.length - 1 && msg.role === 'assistant'"
        />

        <!-- Error: structured display per error code, with raw message
             hidden behind a "show technical detail" toggle. Specific codes
             (billing / rate-limit / auth) get a clear human title + CTA. -->
        <div
          v-if="errorMessage"
          class="card p-3 space-y-2"
          :class="errorCode === 'billing' ? 'border-amber-500/40 bg-amber-500/[0.04]' : 'border-red-500/30 bg-red-500/5'"
        >
          <div class="flex items-start gap-2">
            <span class="glyph shrink-0" :class="errorCode === 'billing' ? 'text-amber-400' : 'text-red-400'">
              {{ errorCode === 'billing' ? '⏸' : '⚠' }}
            </span>
            <div class="space-y-1 min-w-0">
              <p class="text-xs font-medium" :class="errorCode === 'billing' ? 'text-amber-200' : 'text-red-300'">
                {{ t(`coach.errors.${errorCode || 'generic'}Title`) }}
              </p>
              <p class="text-xs text-ink-mid leading-relaxed">
                {{ t(`coach.errors.${errorCode || 'generic'}Body`) }}
              </p>
              <a
                v-if="errorCode === 'billing'"
                href="https://console.anthropic.com/settings/billing"
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-amber-300 hover:text-amber-200 underline-offset-2 hover:underline inline-flex items-center gap-1 pt-1"
              >
                <span>{{ t('coach.errors.billingCta') }}</span>
                <span class="glyph">↗</span>
              </a>
              <details class="pt-1">
                <summary class="text-[10px] text-ink-low cursor-pointer hover:text-ink-mid">
                  {{ t('coach.errors.technicalDetail') }}
                </summary>
                <p class="text-[10px] font-mono text-ink-low break-words mt-1">{{ errorMessage }}</p>
              </details>
            </div>
          </div>
        </div>
      </div>

      <!-- Input -->
      <div class="border-t border-border-subtle p-3 space-y-2">
        <textarea
          ref="inputEl"
          v-model="input"
          rows="2"
          class="w-full bg-bg-elevated border border-border-subtle rounded-lg px-3 py-2
                 text-sm text-ink-high placeholder:text-ink-low
                 focus:outline-none focus:border-accent-blue focus:ring-2 focus:ring-accent-blue/30
                 transition-colors resize-none"
          :placeholder="t('coach.inputPlaceholder')"
          :disabled="isStreaming"
          @keydown="onKeydown"
        />
        <div class="flex items-center justify-between gap-2">
          <!-- Left meta: hint when idle, token count when we have one -->
          <p class="text-[10px] text-ink-low flex items-center gap-2">
            <span>{{ t('coach.inputHint') }}</span>
            <span
              v-if="totalTokens !== null"
              class="tabular-nums"
              :title="t('coach.tokenUsageDetail', {
                input: lastUsage?.input_tokens ?? 0,
                output: lastUsage?.output_tokens ?? 0
              })"
            >
              · {{ t('coach.tokenUsage', { n: totalTokens }) }}
            </span>
          </p>

          <!-- Streaming → Stop button. Idle → Send. Keeping a single button
               slot avoids layout jitter when state flips. -->
          <button
            v-if="isStreaming"
            type="button"
            class="btn-ghost !px-4 !py-1.5 text-sm border border-amber-500/40 text-amber-300
                   hover:border-amber-400 hover:text-amber-200"
            @click="abortStream"
          >
            <span class="inline-flex items-center gap-1.5">
              <span class="w-2 h-2 bg-amber-400 rounded-sm"></span>
              <span>{{ t('coach.stopStreaming') }}</span>
            </span>
          </button>
          <button
            v-else
            type="button"
            class="btn-primary !px-4 !py-1.5 text-sm"
            :disabled="!input.trim()"
            @click="submit"
          >
            {{ t('coach.send') }}
          </button>
        </div>
      </div>
    </aside>
  </Teleport>
</template>
