<script setup lang="ts">
const { t, locale, locales, setLocale } = useI18n()
const { isAuthenticated, signOut, user } = useAuth()

const otherLocales = computed(() =>
  (locales.value as { code: string; name: string }[]).filter((l) => l.code !== locale.value)
)

async function handleSignOut() {
  await signOut()
  await navigateTo('/')
}
</script>

<template>
  <div class="min-h-screen flex flex-col bg-bg-base text-ink-high">
    <header class="border-b border-border-subtle">
      <div class="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between">
        <NuxtLink :to="localePath('/')" class="flex items-center gap-2.5">
          <Logo :size="28" mode="dark" />
          <span class="font-semibold tracking-tight">{{ t('app.name') }}</span>
        </NuxtLink>

        <nav class="flex items-center gap-2">
          <NuxtLink
            v-for="l in otherLocales"
            :key="l.code"
            :to="switchLocalePath(l.code)"
            class="text-xs uppercase tracking-wider text-ink-mid hover:text-ink-high px-2 py-1 transition-colors"
          >
            {{ l.code }}
          </NuxtLink>

          <span class="w-px h-4 bg-border-subtle mx-1" />

          <template v-if="isAuthenticated">
            <span class="text-xs text-ink-mid hidden md:inline">{{ user?.email }}</span>
            <button type="button" class="btn-ghost !py-1.5 !px-3 text-sm" @click="handleSignOut">
              {{ t('nav.logout') }}
            </button>
          </template>
          <template v-else>
            <NuxtLink :to="localePath('/login')" class="btn-ghost !py-1.5 !px-3 text-sm">
              {{ t('nav.login') }}
            </NuxtLink>
          </template>
        </nav>
      </div>
    </header>

    <main class="flex-1">
      <slot />
    </main>

    <footer class="border-t border-border-subtle py-6 mt-12">
      <div class="mx-auto max-w-6xl px-6 text-xs text-ink-low flex items-center justify-between">
        <span>{{ t('app.name') }} — {{ t('app.tagline') }}</span>
        <Logo :size="18" mode="dark" :show-seven="false" />
      </div>
    </footer>
  </div>
</template>
