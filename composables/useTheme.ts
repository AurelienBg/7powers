/**
 * useTheme — light/dark mode toggle, persisted to localStorage.
 *
 * The .dark class on <html> is the source of truth. CSS variables defined
 * in main.css (under :root and .dark) flip every surface color based on
 * that class.
 *
 * To prevent FOUC (flash from default → user preference), nuxt.config.ts
 * injects a sync inline script in <head> that reads localStorage and
 * applies the class BEFORE the first paint. This composable then keeps
 * the state in sync after hydration.
 */

type Theme = 'light' | 'dark'
const STORAGE_KEY = 'sevenpowers:theme'

const _theme = ref<Theme>('dark')
let _initialized = false

function applyToDom(theme: Theme) {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

export function useTheme() {
  // First-call client-side init: sync ref to whatever the FOUC script set.
  if (!_initialized && typeof window !== 'undefined') {
    _initialized = true
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'light' || stored === 'dark') {
      _theme.value = stored
    } else {
      // No preference yet — keep the dark default (matches the brand).
      _theme.value = document.documentElement.classList.contains('dark') ? 'dark' : 'light'
    }
  }

  function setTheme(next: Theme) {
    _theme.value = next
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, next)
    }
    applyToDom(next)
  }

  function toggle() {
    setTheme(_theme.value === 'dark' ? 'light' : 'dark')
  }

  return {
    theme: readonly(_theme),
    isDark: computed(() => _theme.value === 'dark'),
    setTheme,
    toggle
  }
}
