-- 0002 — projects.user_id now defaults to auth.uid()
--
-- Why: the client was passing user_id = useSupabaseUser().value.id on INSERT.
-- When the session token is refreshed (e.g. after supabase.auth.updateUser),
-- or when the user has multiple identity providers (magic-link AND Google
-- OAuth without account linking), the cached useSupabaseUser value can
-- briefly diverge from the JWT's `sub` claim. The RLS policy
-- `with check (user_id = auth.uid())` then rejects the INSERT with code
-- 42501 ("new row violates row-level security policy for table projects").
--
-- Fix: stop trusting the client for identity. Set the column default to
-- auth.uid() so the database itself derives the owner from the JWT. The
-- client INSERT now omits user_id entirely, making the mismatch
-- structurally impossible.
--
-- This also matches Supabase's own recommended pattern for owner-keyed
-- tables (see https://supabase.com/docs/guides/auth/row-level-security
-- → "Use auth.uid() in defaults to keep policies tight").

alter table public.projects
  alter column user_id set default auth.uid();

-- Sanity: the column stays NOT NULL — INSERTs from a non-authenticated
-- session still fail loudly (auth.uid() returns null → constraint
-- violation). That's the desired behavior.
