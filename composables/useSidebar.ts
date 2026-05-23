/**
 * Shared sidebar open/close state.
 *
 * On desktop (≥ md), the sidebar is always visible — this state is ignored.
 * On mobile (< md), the sidebar acts as a slide-in drawer: closed by default,
 * opened via the hamburger button in the page top-left, dismissed by tapping
 * the backdrop or following a NuxtLink.
 *
 * useState provides cross-component SSR-safe reactive state.
 */
export function useSidebar() {
  const isOpen = useState<boolean>('sidebar-open', () => false)

  function open() {
    isOpen.value = true
  }
  function close() {
    isOpen.value = false
  }
  function toggle() {
    isOpen.value = !isOpen.value
  }

  return { isOpen, open, close, toggle }
}
