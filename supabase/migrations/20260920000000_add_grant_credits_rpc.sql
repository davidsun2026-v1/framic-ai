-- Framic AI — Live-compatible atomic credit grant RPC
-- Reconciled against public.grant_credits on Framic Supabase project
-- gkvvecskbkwpcsuatklm on 2026-10-22.
--
-- The live RPC has eight input parameters and returns:
-- (transaction_id uuid, new_balance bigint, duplicate boolean).
-- Defaults are preserved for the final four arguments so trusted server
-- callers may supply explicit values or use the established defaults.
--
-- This migration is repository-only until separately reviewed and applied.
-- It does not mutate the live Supabase database.

-- Remove the obsolete four-argument overload defined by the earlier
-- repository contract. No repository callers for that overload were found.
DROP FUNCTION IF EXISTS public.grant_credits(UUID, BIGINT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id UUID,
  p_amount BIGINT,
  p_reason TEXT,
  p_idempotency_key TEXT,
  p_type TEXT DEFAULT 'grant',
  p_correlation_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::JSONB,
  p_created_by TEXT DEFAULT 'payment_webhook'
)
RETURNS TABLE (
  transaction_id UUID,
  new_balance BIGINT,
  duplicate BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_wallet_id UUID;
  v_balance_before BIGINT;
  v_balance_after BIGINT;
  v_transaction_id UUID;
  v_existing_id UUID;
  v_existing_user_id UUID;
  v_existing_amount BIGINT;
  v_existing_reason TEXT;
  v_existing_type TEXT;
  v_existing_correlation_id UUID;
  v_existing_metadata JSONB;
  v_existing_created_by TEXT;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'p_amount must not be zero';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'p_reason is required';
  END IF;
  IF p_idempotency_key IS NULL OR btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'p_idempotency_key is required';
  END IF;
  IF p_type IS NULL OR btrim(p_type) = '' THEN
    RAISE EXCEPTION 'p_type is required';
  END IF;
  IF p_created_by IS NULL OR btrim(p_created_by) = '' THEN
    RAISE EXCEPTION 'p_created_by is required';
  END IF;

  -- Fast idempotency path. A reused key must represent the same operation.
  SELECT id, user_id, amount, reason, type, correlation_id, metadata, created_by
    INTO v_existing_id, v_existing_user_id, v_existing_amount, v_existing_reason,
         v_existing_type, v_existing_correlation_id, v_existing_metadata, v_existing_created_by
  FROM public.credit_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_user_id IS DISTINCT FROM p_user_id
       OR v_existing_amount IS DISTINCT FROM p_amount
       OR v_existing_reason IS DISTINCT FROM p_reason
       OR v_existing_type IS DISTINCT FROM p_type
       OR v_existing_correlation_id IS DISTINCT FROM p_correlation_id
       OR COALESCE(v_existing_metadata, '{}'::JSONB) IS DISTINCT FROM COALESCE(p_metadata, '{}'::JSONB)
       OR COALESCE(v_existing_created_by, 'payment_webhook') IS DISTINCT FROM p_created_by THEN
      RAISE EXCEPTION 'Idempotency key conflict for grant_credits';
    END IF;

    RETURN QUERY
      SELECT v_existing_id, cw.balance, TRUE
      FROM public.credit_wallets cw
      WHERE cw.user_id = p_user_id;
    RETURN;
  END IF;

  -- Serialize mutations for this user's wallet.
  SELECT id, balance
    INTO v_wallet_id, v_balance_before
  FROM public.credit_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.credit_wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING id, balance INTO v_wallet_id, v_balance_before;
  END IF;

  -- Re-check idempotency after taking the wallet lock.
  SELECT id, user_id, amount, reason, type, correlation_id, metadata, created_by
    INTO v_existing_id, v_existing_user_id, v_existing_amount, v_existing_reason,
         v_existing_type, v_existing_correlation_id, v_existing_metadata, v_existing_created_by
  FROM public.credit_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF v_existing_id IS NOT NULL THEN
    IF v_existing_user_id IS DISTINCT FROM p_user_id
       OR v_existing_amount IS DISTINCT FROM p_amount
       OR v_existing_reason IS DISTINCT FROM p_reason
       OR v_existing_type IS DISTINCT FROM p_type
       OR v_existing_correlation_id IS DISTINCT FROM p_correlation_id
       OR COALESCE(v_existing_metadata, '{}'::JSONB) IS DISTINCT FROM COALESCE(p_metadata, '{}'::JSONB)
       OR COALESCE(v_existing_created_by, 'payment_webhook') IS DISTINCT FROM p_created_by THEN
      RAISE EXCEPTION 'Idempotency key conflict for grant_credits';
    END IF;

    RETURN QUERY
      SELECT v_existing_id, cw.balance, TRUE
      FROM public.credit_wallets cw
      WHERE cw.user_id = p_user_id;
    RETURN;
  END IF;

  v_balance_after := v_balance_before + p_amount;
  IF v_balance_after < 0 THEN
    RAISE EXCEPTION 'Insufficient balance: % + % would be negative', v_balance_before, p_amount;
  END IF;

  UPDATE public.credit_wallets
  SET balance = v_balance_after,
      updated_at = now(),
      last_updated_at = now()
  WHERE id = v_wallet_id;

  INSERT INTO public.credit_transactions (
    user_id, wallet_id, type, reason, amount,
    balance_before, balance_after, idempotency_key,
    correlation_id, status, metadata, created_by
  ) VALUES (
    p_user_id, v_wallet_id, p_type, p_reason, p_amount,
    v_balance_before, v_balance_after, p_idempotency_key,
    p_correlation_id, 'completed', COALESCE(p_metadata, '{}'::JSONB), p_created_by
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_transaction_id, v_balance_after, FALSE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_credits(
  UUID, BIGINT, TEXT, TEXT, TEXT, UUID, JSONB, TEXT
) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.grant_credits(
  UUID, BIGINT, TEXT, TEXT, TEXT, UUID, JSONB, TEXT
) TO service_role;
