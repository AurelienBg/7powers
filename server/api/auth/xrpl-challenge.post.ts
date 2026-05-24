/**
 * Phase B XRPL sign-in — step 1 of 2: issue a challenge.
 *
 * Input:  { address: string }  (XRPL classic address, "r…")
 * Output: { message: string, nonce: string, expiresAt: string }
 *
 * The user's wallet (Crossmark / Xaman / etc) will then sign `message`,
 * and the resulting signature is posted back to /api/auth/xrpl-verify
 * which validates + provisions the Supabase session.
 *
 * The nonce is server-generated, stored in public.xrpl_auth_nonces
 * (5 min TTL), and embedded in the message. This binds the signed payload
 * to a specific server-issued challenge — without it, an attacker could
 * replay any past signature for that address.
 */
import { randomBytes } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'

interface ChallengeBody {
  address?: unknown
}

// Loose validation: XRPL classic addresses start with 'r' and are
// base58-encoded, typically 25-35 chars. We don't decode here — that's
// the verify step's job. This is just a sanity gate against junk input.
function looksLikeXrplAddress(s: unknown): s is string {
  return typeof s === 'string' && /^r[a-zA-Z0-9]{24,34}$/.test(s)
}

const NONCE_TTL_MS = 5 * 60 * 1000

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  if (!supabaseUrl || !serviceKey) {
    setResponseStatus(event, 500)
    return { error: 'Supabase service credentials missing on this deployment.' }
  }

  const body = await readBody<ChallengeBody>(event).catch(() => null)
  if (!body || !looksLikeXrplAddress(body.address)) {
    setResponseStatus(event, 400)
    return { error: 'Invalid or missing XRPL address.' }
  }

  // Lowercase the address for consistent storage / lookup. XRPL classic
  // addresses are case-sensitive by spec, but we normalize for the auth
  // pseudo-email and for the nonce store key.
  const address = body.address as string

  const nonce = randomBytes(16).toString('hex') // 32 hex chars
  const expiresAt = new Date(Date.now() + NONCE_TTL_MS)

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Upsert by address — a subsequent challenge for the same address
  // replaces an older unused nonce, so a user who clicks "Connect" twice
  // doesn't get stuck on a stale challenge.
  const { error } = await admin
    .from('xrpl_auth_nonces')
    .upsert({
      address,
      nonce,
      expires_at: expiresAt.toISOString()
    })

  if (error) {
    console.error('[xrpl-challenge] failed to store nonce:', error)
    setResponseStatus(event, 500)
    return { error: 'Could not issue challenge — try again.' }
  }

  // Human-readable message so the user understands what they're signing
  // in their wallet's prompt. Includes the address (defends against
  // wrong-account confusion) and nonce (binds to this challenge).
  const message =
    `Sign in to 7Powers\n\n` +
    `Address: ${address}\n` +
    `Nonce: ${nonce}\n` +
    `Expires: ${expiresAt.toISOString()}`

  return {
    message,
    nonce,
    expiresAt: expiresAt.toISOString()
  }
})
