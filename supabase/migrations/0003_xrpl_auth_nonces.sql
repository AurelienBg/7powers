-- 0003 — XRPL sign-in nonce store (Phase B "Sign in with wallet")
--
-- Stores short-lived (5 min) challenge nonces per XRPL address while the
-- two-step sign-in dance is in flight:
--   1. Client requests challenge for address X → server stores (X, nonce)
--   2. Wallet signs the message containing X + nonce
--   3. Client posts back signature → server verifies signature against
--      stored nonce, then issues a Supabase session.
--
-- The table is auth.users-independent: at challenge time we don't even
-- know if the user exists yet. Verify step (server) uses the Supabase
-- Admin SDK to create-or-find the user using a pseudo-email derived from
-- the XRPL address (e.g. r…XoQT@wallet.7powers.app).
--
-- RLS: this table is ONLY touched by server endpoints with the service
-- role key. We deny all client access.

create table public.xrpl_auth_nonces (
  -- Lowercased XRPL classic address. PK so subsequent challenges for the
  -- same address upsert (replace stale unused nonces).
  address     text primary key,
  -- Random 32-char hex nonce baked into the signed message.
  nonce       text not null,
  -- Hard expiry so abandoned challenges don't sit forever. 5 min window.
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index xrpl_auth_nonces_expires_at_idx on public.xrpl_auth_nonces(expires_at);

alter table public.xrpl_auth_nonces enable row level security;

-- No client-side access. The server (service role) bypasses RLS.
create policy "xrpl_auth_nonces: deny all client access"
  on public.xrpl_auth_nonces for all
  to authenticated, anon
  using (false)
  with check (false);
