<script setup lang="ts">
/**
 * HelmerTooltip — inline ? icon that opens a popover with a Helmer term
 * definition + example. Used to provide micro-contextual learning without
 * sending the user away from their current flow.
 *
 * Usage:
 *   <HelmerTooltip term="benefit">
 *     The Benefit, in plain words
 *   </HelmerTooltip>
 *
 * Content is resolved from i18n keys:
 *   helmerTerms.{term}.title
 *   helmerTerms.{term}.body
 *   helmerTerms.{term}.example (optional)
 */

const props = defineProps<{
  term: string
  /** Hide the leading text slot and only render the ? trigger inline. */
  iconOnly?: boolean
}>()

const { t, te } = useI18n()
const isOpen = ref(false)
const wrapperEl = ref<HTMLElement | null>(null)

const title = computed(() => t(`helmerTerms.${props.term}.title`))
const body = computed(() => t(`helmerTerms.${props.term}.body`))
const exampleKey = computed(() => `helmerTerms.${props.term}.example`)
const hasExample = computed(() => te(exampleKey.value))
const example = computed(() => (hasExample.value ? t(exampleKey.value) : ''))

function toggle(e: MouseEvent) {
  e.stopPropagation()
  isOpen.value = !isOpen.value
}

function close() {
  isOpen.value = false
}

// Close on outside click + Escape key.
function handleDocClick(e: MouseEvent) {
  if (!isOpen.value) return
  if (wrapperEl.value && !wrapperEl.value.contains(e.target as Node)) {
    close()
  }
}
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  document.addEventListener('click', handleDocClick)
  document.addEventListener('keydown', handleKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocClick)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <span ref="wrapperEl" class="relative inline-flex items-baseline gap-1">
    <slot v-if="!iconOnly" />

    <button
      type="button"
      class="inline-flex items-center justify-center w-4 h-4 rounded-full
             text-[10px] font-medium leading-none
             bg-accent-blue/15 text-accent-blue-bright
             hover:bg-accent-blue/25 hover:text-accent-blue
             focus:outline-none focus:ring-1 focus:ring-accent-blue/50
             transition-colors align-middle ml-0.5 shrink-0"
      :aria-label="title"
      :aria-expanded="isOpen"
      :title="title"
      @click="toggle"
    >
      ?
    </button>

    <!-- Popover -->
    <Transition
      enter-active-class="transition duration-100 ease-out"
      enter-from-class="opacity-0 -translate-y-1"
      leave-active-class="transition duration-75 ease-in"
      leave-to-class="opacity-0 -translate-y-1"
    >
      <div
        v-if="isOpen"
        class="absolute top-full left-0 mt-1.5 z-30 w-72 p-3
               card !p-3 shadow-glow-blue
               text-left space-y-1.5"
        role="dialog"
        :aria-label="title"
      >
        <div class="flex items-start justify-between gap-2">
          <p class="text-xs uppercase tracking-wider text-accent-blue-bright">
            {{ title }}
          </p>
          <button
            type="button"
            class="text-ink-low hover:text-ink-high text-xs leading-none -mt-0.5"
            :aria-label="t('helmerTerms.close')"
            @click.stop="close"
          >
            ×
          </button>
        </div>
        <p class="text-xs text-ink-high leading-relaxed">{{ body }}</p>
        <p v-if="example" class="text-xs text-ink-mid leading-relaxed italic border-t border-border-subtle pt-1.5">
          {{ example }}
        </p>
      </div>
    </Transition>
  </span>
</template>
