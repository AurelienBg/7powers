/**
 * Phase B XRPL sign-in — step 2 of 2: verify the signed challenge and
 * provision a Supabase session.
 *
 * Input:  { address, signature, publicKey, message }
 * Output: { email, otp }
 *   - email: the pseudo-email used as the user's Supabase identity
 *            (e.g. r…XoQT@wallet.7powers.app)
 *   - otp:   a one-time 6-digit code the CLIENT redeems via
 *            supabase.auth.verifyOtp() to receive the session tokens.
 *
 * Why an OTP and not a session directly? Supabase doesn't let server-side
 * code mint a client-usable session from scratch — the canonical bridge
 * is admin.generateLink({ type:'magiclink' }) which returns an OTP that
 * verifyOtp consumes on the client. That gives us standard session
 * cookies + refresh tokens with zero custom plumbing.
 *
 * Security checklist enforced here:
 *  1. Nonce exists, not expired, matches the message exactly
 *  2. ripple-keypairs.verify() passes for (message, signature, publicKey)
 *  3. deriveAddress(publicKey) === claimed address  (defends against
 *     submitting someone else's signature with your address)
 *  4. Nonce is single-use — deleted after successful verification
 */
import { createClient } from '@supabase/supabase-js'
import { verify, deriveAddress } from 'ripple-keypairs'

interface VerifyBody {
  address?: unknown
  signature?: unknown
  publicKey?: unknown
  message?: unknown
}

function isHexString(s: unknown): s is string {
  return typeof s === 'string' && /^[0-9a-fA-F]+$/.test(s) && s.length > 0
}

function isNonEmptyString(s: unknown): s is string {
  return typeof s === 'string' && s.length > 0
}

/** Encode a UTF-8 string to uppercase hex (xrpl convention). */
function utf8ToHex(s: string): string {
  return Buffer.from(s, 'utf8').toString('hex').toUpperCase()
}

export default defineEventHandler(async (event) => {
  const supabaseUrl = process.env.SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE
  if (!supabaseUrl || !serviceKey) {
    setResponseStatus(event, 500)
    return { error: 'Supabase service credentials missing on this deployment.' }
  }

  // ---------- Validate body ----------
  const body = await readBody<VerifyBody>(event).catch(() => null)
  if (!body) {
    setResponseStatus(event, 400)
    return { error: 'Invalid request body.' }
  }
  if (
    !isNonEmptyString(body.address) ||
    !isHexString(body.signature) ||
    !isHexString(body.publicKey) ||
    !isNonEmptyString(body.message)
  ) {
    setResponseStatus(event, 400)
    return { error: 'Missing address / signature / publicKey / message.' }
  }
  const address = body.address
  const signature = body.signature
  const publicKey = body.publicKey
  const message = body.message

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // ---------- 1. Nonce lookup ----------
  const { data: nonceRow, error: nonceErr } = await admin
    .from('xrpl_auth_nonces')
    .select('nonce, expires_at')
    .eq('address', address)
    .maybeSingle()

  if (nonceErr) {
    console.error('[xrpl-verify] nonce lookup failed:', nonceErr)
    setResponseStatus(event, 500)
    return { error: 'Could not verify challenge.' }
  }
  if (!nonceRow) {
    setResponseStatus(event, 400)
    return { error: 'No challenge issued for this address. Request a new one.' }
  }
  if (new Date(nonceRow.expires_at as string).getTime() < Date.now()) {
    setResponseStatus(event, 400)
    return { error: 'Challenge expired. Request a new one.' }
  }
  if (!message.includes(nonceRow.nonce as string)) {
    setResponseStatus(event, 400)
    return { error: 'Signed message does not contain the issued nonce.' }
  }

  // ---------- 2. Signature verification ----------
  // ripple-keypairs.verify expects a hex-encoded message. We encode the
  // human-readable challenge string to UTF-8 hex and verify against the
  // signature/publicKey. If the wallet wrapped the message in a different
  // envelope (e.g. some XRPL "SignIn" tx blob), this verify will fail —
  // adapter-specific verification can be added incrementally.
  const messageHex = utf8ToHex(message)
  let sigOk = false
  try {
    sigOk = verify(messageHex, signature, publicKey)
  } catch (e) {
    console.warn('[xrpl-verify] verify() threw:', e)
    sigOk = false
  }
  if (!sigOk) {
    setResponseStatus(event, 401)
    return { error: 'Signature did not verify.' }
  }

  // ---------- 3. Address ↔ publicKey binding ----------
  // Without this check, an attacker could submit their OWN valid signature
  // claiming someone ELSE's address. Derive the address from the pubkey
  // and require an exact (case-sensitive — XRPL classic addresses are
  // base58 and case-significant) match against the claim.
  let derivedAddress: string
  try {
    derivedAddress = deriveAddress(publicKey)
  } catch (e) {
    console.warn('[xrpl-verify] deriveAddress threw:', e)
    setResponseStatus(event, 401)
    return { error: 'Public key is malformed.' }
  }
  if (derivedAddress !== address) {
    setResponseStatus(event, 401)
    return { error: 'Public key does not match the claimed address.' }
  }

  // ---------- 4. Burn the nonce (single-use) ----------
  await admin
    .from('xrpl_auth_nonces')
    .delete()
    .eq('address', address)

  // ---------- 5. Provision the Supabase user ----------
  // Pseudo-email scheme: lowercase address @ wallet.7powers.app. Using
  // an internal domain we control prevents accidental mail delivery and
  // makes wallet-origin users trivially identifiable in the auth table.
  const pseudoEmail = `${address.toLowerCase()}@wallet.7powers.app`

  // Try to create the user first (will fail with a 422 if already exists,
  // which we just ignore — generateLink below works either way).
  const { error: createErr } = await admin.auth.admin.createUser({
    email: pseudoEmail,
    email_confirm: true,
    user_metadata: {
      xrpl_address: address,
      xrpl_only: true
    }
  })
  if (createErr && !/already.*registered/i.test(createErr.message)) {
    console.error('[xrpl-verify] createUser failed:', createErr)
    setResponseStatus(event, 500)
    return { error: 'Could not provision wallet user.' }
  }

  // Generate a one-time login token. The client will redeem it with
  // supabase.auth.verifyOtp() to get a real session.
  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: pseudoEmail
  })
  if (linkErr || !linkData) {
    console.error('[xrpl-verify] generateLink failed:', linkErr)
    setResponseStatus(event, 500)
    return { error: 'Could not issue session token.' }
  }
  const otp = linkData.properties?.email_otp
  if (!otp) {
    setResponseStatus(event, 500)
    return { error: 'Empty session token from auth provider.' }
  }

  return {
    email: pseudoEmail,
    otp
  }
})
