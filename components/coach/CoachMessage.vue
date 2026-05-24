<script setup lang="ts">
import { marked } from 'marked'
import type { CoachLocalMessage } from '~/stores/coach'

const props = defineProps<{
  message: CoachLocalMessage
  // Truthy while this assistant message is still being streamed in.
  streaming?: boolean
}>()

const isUser = computed(() => props.message.role === 'user')

// Configure marked once: GFM for sane parsing, breaks=true so single \n
// becomes a <br>, no raw HTML allowed (XSS safety — Claude's output is
// trusted but we still keep belt+suspenders).
marked.setOptions({
  gfm: true,
  breaks: true
})

// Render the assistant's markdown content to HTML. User messages stay plain
// text (whitespace-pre-wrap preserves their newlines).
const renderedHtml = computed(() => {
  if (isUser.value) return ''
  if (!props.message.content) return ''
  return marked.parse(props.message.content, { async: false }) as string
})
</script>

<template>
  <div
    class="flex"
    :class="isUser ? 'justify-end' : 'justify-start'"
  >
    <!-- User message: plain text with line-break preservation -->
    <div
      v-if="isUser"
      class="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap
             bg-accent-blue/15 text-ink-high border border-accent-blue/30"
    >
      {{ message.content }}
    </div>

    <!-- Assistant message: markdown-rendered with prose styling -->
    <div
      v-else
      class="max-w-[85%] rounded-lg px-3.5 py-2.5 text-sm leading-relaxed
             bg-bg-elevated text-ink-high border border-border-subtle"
    >
      <span class="glyph text-gold-bright mr-1.5 select-none align-baseline">✦</span>
      <span class="coach-prose" v-html="renderedHtml" />
      <span
        v-if="streaming"
        class="inline-block w-1.5 h-3.5 ml-0.5 bg-accent-blue-bright animate-pulse align-middle"
        aria-hidden="true"
      />
    </div>
  </div>
</template>

<style scoped>
/* Lightweight prose styling — Tailwind's @tailwindcss/typography would be
   overkill here. Just enough to make Claude's markdown render readable. */
.coach-prose :deep(p) {
  margin: 0 0 0.5rem;
}
.coach-prose :deep(p:last-child) {
  margin-bottom: 0;
}
.coach-prose :deep(strong) {
  font-weight: 600;
  color: rgb(var(--ink-high));
}
.coach-prose :deep(em) {
  font-style: italic;
  color: rgb(var(--ink-mid));
}
.coach-prose :deep(ul),
.coach-prose :deep(ol) {
  margin: 0.25rem 0 0.5rem;
  padding-left: 1.25rem;
}
.coach-prose :deep(ul) {
  list-style-type: disc;
}
.coach-prose :deep(ol) {
  list-style-type: decimal;
}
.coach-prose :deep(li) {
  margin-bottom: 0.15rem;
}
.coach-prose :deep(li > p) {
  margin: 0;
}
.coach-prose :deep(code) {
  font-family: 'Geist Mono', 'JetBrains Mono', ui-monospace, monospace;
  font-size: 0.85em;
  background: rgb(var(--bg-base) / 0.6);
  padding: 0.1em 0.35em;
  border-radius: 0.25rem;
  border: 1px solid rgb(var(--border-subtle));
}
.coach-prose :deep(pre) {
  background: rgb(var(--bg-base) / 0.6);
  border: 1px solid rgb(var(--border-subtle));
  border-radius: 0.375rem;
  padding: 0.5rem 0.75rem;
  overflow-x: auto;
  margin: 0.4rem 0;
}
.coach-prose :deep(pre code) {
  background: transparent;
  border: none;
  padding: 0;
  font-size: 0.85em;
}
.coach-prose :deep(a) {
  color: #5BA3E8;
  text-decoration: underline;
  text-decoration-color: rgba(91, 163, 232, 0.4);
}
.coach-prose :deep(a:hover) {
  color: #378ADD;
}
.coach-prose :deep(h1),
.coach-prose :deep(h2),
.coach-prose :deep(h3) {
  font-weight: 600;
  margin: 0.5rem 0 0.25rem;
  color: rgb(var(--ink-high));
}
.coach-prose :deep(h1) { font-size: 1rem; }
.coach-prose :deep(h2) { font-size: 0.95rem; }
.coach-prose :deep(h3) { font-size: 0.9rem; }
.coach-prose :deep(blockquote) {
  border-left: 2px solid rgb(var(--border-accent));
  padding-left: 0.6rem;
  margin: 0.4rem 0;
  color: rgb(var(--ink-mid));
  font-style: italic;
}
.coach-prose :deep(hr) {
  border: none;
  border-top: 1px solid rgb(var(--border-subtle));
  margin: 0.5rem 0;
}
</style>
