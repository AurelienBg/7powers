/**
 * useCoachInjector — bus to push a prompt into the Coach drawer from any
 * page. Lets feature surfaces (per-question "✦ Help" buttons, "Critique
 * my answer" CTA on Power forms, etc.) trigger an AI ask without
 * duplicating Coach machinery.
 *
 * Flow:
 *   page code  →  useCoachInjector().ask("Help me score Q2…")
 *              →  sets useState('coach-pending-prompt') + opens drawer
 *   CoachChat  →  watches that state, consumes the prompt with
 *                 sendMessage() the moment the drawer is mounted +
 *                 not currently streaming, then clears it.
 *
 * Why a Nuxt useState (not a ref in this composable): the two consumers
 * live in different component trees (the page form, the CoachChat
 * Teleport drawer). useState gives us app-scoped reactive sharing
 * without props/emits gymnastics.
 */

export function useCoachInjector() {
  const drawerOpen = useState<boolean>('coach-open', () => false)
  // Pending prompt the drawer should auto-send the moment it's ready.
  // Cleared by CoachChat after consumption.
  const pendingPrompt = useState<string | null>('coach-pending-prompt', () => null)

  /** Open the drawer and queue a prompt for auto-send. */
  function ask(prompt: string): void {
    const trimmed = prompt.trim()
    if (!trimmed) return
    pendingPrompt.value = trimmed
    drawerOpen.value = true
  }

  return { ask, pendingPrompt, drawerOpen }
}
