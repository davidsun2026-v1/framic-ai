-- Framic AI — Signup trigger + balance RPC
-- Created: 2026-09-18
-- Purpose: Close two verified gaps between apps/web and the live schema:
--   1. apps/web/lib/auth/actions.ts assumes an on_auth_user_created trigger
--      creates a profiles + credit_wallets row on signup. No such trigger
--      exists live (verified: zero rows in pg_trigger matching %signup%/%auth_user%).
--   2. apps/web/lib/supabase/service.ts calls get_user_balance(p_user_id),
--      which does not exist live (verified: zero rows in pg_proc matching
--      %balance%/%reserve%/%token%).
--
-- This migration does NOT invent pricing, plan names, or credit grant
-- amounts — new wallets start at 0 balance, per Subscription Governance in
-- docs/00-PROJECT_STATE.md (no SUBSCRIPTION_MATRIX.md exists to source
-- a starting grant from).

-- ============================================================================
-- 1. SIGNUP TRIGGER — create profile + wallet when a new auth.users row lands
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Locked down like update_profiles_updated_at(): no direct public execution.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 2. get_user_balance — the RPC apps/web/lib/supabase/service.ts already calls
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id UUID)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT balance FROM public.credit_wallets WHERE user_id = p_user_id),
    0
  );
$$;

-- Only the service-role client (apps/web/lib/supabase/service.ts) calls this.
REVOKE EXECUTE ON FUNCTION public.get_user_balance(UUID) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_balance(UUID) TO service_role;
