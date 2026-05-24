/**
 * Thin auth helper on top of @nuxtjs/supabase.
 * Centralizes magic-link send + sign-out so UI components don't talk to Supabase directly.
 */
export function useAuth() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()

  async function sendMagicLink(email: string, redirectTo?: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        // After clicking the link, Supabase redirects to our /confirm route,
        // which then sends the user back here.
        emailRedirectTo:
          redirectTo ??
          (typeof window !== 'undefined' ? `${window.location.origin}/confirm` : undefined)
      }
    })
    if (error) throw error
  }

  async function signInWithGoogle(redirectTo?: string) {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo:
          redirectTo ??
          (typeof window !== 'undefined' ? `${window.location.origin}/confirm` : undefined)
      }
    })
    if (error) throw error
  }

  /**
   * Phase B XRPL "Sign in with wallet" — alternative to magic-link / Google.
   *
   * Three-step dance:
   *   1. Connect the wallet via xrpl-connect (the user picks Crossmark /
   *      Xaman / etc in the modal that's already mounted in app.vue).
   *   2. Hit /api/auth/xrpl-challenge to get a server-issued nonce
   *      message; ask the wallet to signMessage() on it.
   *   3. POST the signature to /api/auth/xrpl-verify; receive an OTP we
   *      immediately redeem with supabase.auth.verifyOtp() to land in a
   *      real session (cookies + refresh token, identical to magic-link).
   *
   * The resulting Supabase user is identified by a pseudo-email
   * `{address}@wallet.7powers.app` — see xrpl-verify.post.ts for rationale.
   * That user has no real inbox (cannot receive recovery emails) — losing
   * the wallet seed means losing the account. The /login UI surfaces this
   * trade-off via tooltips so users opt in deliberately.
   */
  async function signInWithXrplWallet(): Promise<void> {
    const wallet = useXrplWallet()

    // (a) Ensure wallet is connected. If already linked from a prior
    // session, this is a no-op; otherwise open the picker and wait.
    if (!wallet.connected.value) {
      wallet.connect()
      // Wait up to 90s for the user to approve the connection in their
      // wallet (mobile Xaman QR scans take time).
      const start = Date.now()
      while (!wallet.connected.value) {
        if (Date.now() - start > 90_000) {
          throw new Error('Wallet connection timed out.')
        }
        if (wallet.error.value) {
          throw new Error(wallet.error.value.message)
        }
        await new Promise((r) => setTimeout(r, 250))
      }
    }
    const address = wallet.account.value?.address
    if (!address) throw new Error('Wallet connected but no address available.')

    // (b) Fetch the challenge.
    const challenge = await $fetch<{ message: string; nonce: string; expiresAt: string }>(
      '/api/auth/xrpl-challenge',
      { method: 'POST', body: { address } }
    )

    // (c) Have the wallet sign the message.
    const manager = wallet.account.value && (useNuxtApp().$xrplWallet as { manager?: unknown } | undefined)?.manager
    // We type the manager loosely because xrpl-connect's TS shim lives in
    // types/xrpl-connect.d.ts; signMessage is declared there.
    const m = manager as { signMessage: (msg: string) => Promise<{ message: string; signature: string; publicKey: string }> } | null
    if (!m || typeof m.signMessage !== 'function') {
      throw new Error('Wallet manager not ready.')
    }
    const signed = await m.signMessage(challenge.message)
    if (!signed.signature) {
      throw new Error(
        "This wallet didn't return a signature. Try Crossmark, or use magic-link / Google instead."
      )
    }

    // (d) Verify on the server + receive an OTP.
    const verifyRes = await $fetch<{ email: string; otp: string }>(
      '/api/auth/xrpl-verify',
      {
        method: 'POST',
        body: {
          address,
          signature: signed.signature,
          publicKey: signed.publicKey,
          message: challenge.message
        }
      }
    )

    // (e) Redeem the OTP — this is what gives us a real Supabase session.
    const { error: otpErr } = await supabase.auth.verifyOtp({
      email: verifyRes.email,
      token: verifyRes.otp,
      type: 'email'
    })
    if (otpErr) throw otpErr
  }

  async function signOut() {
    // PROTECT UNSYNCED WORK before wiping local state. We used to $reset
    // unconditionally, which lost any project that hadn't yet been pushed
    // to Supabase (e.g. anon project created right before login → user
    // hits "Logout" before the auto-push completes → project is dropped
    // locally AND never made it to the cloud).
    //
    // Strategy: push any local-only projects synchronously here. Errors
    // are logged but don't block the logout — the user explicitly asked
    // to sign out and we shouldn't strand them.
    if (typeof window !== 'undefined' && user.value) {
      const projectStore = useProjectStore()
      const { syncToCloud } = useProject()
      const unsynced = projectStore.projectList.filter(
        (p) => !projectStore.syncedLocalIds.includes(p.local_id)
      )
      if (unsynced.length > 0) {
        const previousCurrent = projectStore.currentProjectId
        for (const p of unsynced) {
          try {
            // syncToCloud uses store.currentProject — temporarily switch.
            projectStore.setCurrentProject(p.local_id)
            await syncToCloud()
            console.log('[signOut] pushed unsynced project before logout:', p.name)
          } catch (e) {
            console.warn('[signOut] failed to push unsynced project', p.local_id, e)
          }
        }
        projectStore.setCurrentProject(previousCurrent)
      }
    }

    // Now wipe per-user local state so the next account that logs in on
    // this browser doesn't inherit the previous user's projects / coach
    // threads via localStorage.
    if (typeof window !== 'undefined') {
      useProjectStore().$reset()
      useCoachStore().$reset()
    }
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const isAuthenticated = computed(() => !!user.value)

  return {
    user,
    isAuthenticated,
    sendMagicLink,
    signInWithGoogle,
    signInWithXrplWallet,
    signOut
  }
}
