-- Framic AI — Signup test credit grant (100 credits)
-- Created: 2026-11-14
-- Purpose: Phase 1 testing. New users start with 100 credits instead of 0.
--
-- Builds on the existing schema (it does NOT add a profiles table or a
-- token_balance column; both would duplicate what already exists):
--   - 20260910000000_init_schema.sql: profiles (id -> auth.users ON DELETE
--     CASCADE, email, created_at), credit_wallets, credit_transactions ledger
--   - 20260918000000_add_signup_trigger_and_balance_rpc.sql: handle_new_user()
--     and on_auth_user_created trigger (wallet created at balance 0)
--
-- The on_auth_user_created trigger is unchanged; only the function body is
-- replaced. The grant is written to the credit_transactions ledger in the same
-- transaction, so balance_before/balance_after stay consistent with the wallet.
--
-- TO REMOVE LATER: set v_signup_grant to 0 (or delete the grant block) in a
-- new migration once real plans and pricing are defined.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_signup_grant CONSTANT BIGINT := 100;
  v_wallet_id UUID;
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.credit_wallets (user_id, balance)
  VALUES (NEW.id, v_signup_grant)
  ON CONFLICT (user_id) DO NOTHING
  RETURNING id INTO v_wallet_id;

  -- v_wallet_id is NULL if the wallet already existed: no double grant.
  IF v_wallet_id IS NOT NULL THEN
    INSERT INTO public.credit_transactions (
      user_id, wallet_id, type, reason, amount,
      balance_before, balance_after, idempotency_key, status, created_by
    )
    VALUES (
      NEW.id, v_wallet_id, 'grant', 'signup_test_grant', v_signup_grant,
      0, v_signup_grant, 'signup_test_grant:' || NEW.id::TEXT, 'completed', 'system'
    )
    ON CONFLICT (idempotency_key) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- Optional backfill for existing users who still have a zero-balance wallet
-- and no signup grant. Run manually if wanted:
--
-- WITH granted AS (
--   UPDATE public.credit_wallets w
--   SET balance = balance + 100, updated_at = now(), last_updated_at = now()
--   WHERE w.balance = 0
--     AND NOT EXISTS (SELECT 1 FROM public.credit_transactions t
--                     WHERE t.user_id = w.user_id)
--   RETURNING w.id, w.user_id
-- )
-- INSERT INTO public.credit_transactions
--   (user_id, wallet_id, type, reason, amount, balance_before, balance_after,
--    idempotency_key, status, created_by)
-- SELECT user_id, id, 'grant', 'signup_test_grant', 100, 0, 100,
--        'signup_test_grant:' || user_id::TEXT, 'completed', 'system'
-- FROM granted;
