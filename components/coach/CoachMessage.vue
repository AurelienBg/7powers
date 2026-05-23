<script setup lang="ts">
import type { CoachLocalMessage } from '~/stores/coach'

const props = defineProps<{
  message: CoachLocalMessage
  // Truthy while this assistant message is still being streamed in.
  streaming?: boolean
}>()

const isUser = computed(() => props.message.role === 'user')
</script>

<template>
  <div
    class="flex"
    :class="isUser ? 'justify-end' : 'justify-start'"
  >
    <div
      class="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
      :class="isUser
        ? 'bg-accent-blue/15 text-ink-high border border-accent-blue/30'
        : 'bg-bg-elevated text-ink-high border border-border-subtle'"
    >
      <span v-if="!isUser" class="glyph text-gold-bright mr-1.5 select-none">✦</span>
      <span>{{ message.content }}</span>
      <span
        v-if="streaming && !isUser"
        class="inline-block w-1.5 h-3.5 ml-0.5 bg-accent-blue-bright animate-pulse align-middle"
        aria-hidden="true"
      />
    </div>
  </div>
</template>
