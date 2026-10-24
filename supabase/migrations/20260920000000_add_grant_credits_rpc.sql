-- Framic AI — Atomic Credit Grant RPC
-- Contract reconciled against the live Framic Supabase database on 2026-10-22.
-- Signature: grant_credits(user_id, amount, reason, idempotency_key,
--                          type, correlation_id, metadata, created_by)
--
-- The function atomically updates credit_wallets and writes the matching
-- credit_transactions row. Repeated idempotency keys return the existing
-- transaction without applying the balance mutation again.
--
-- This migration intentionally mirrors the verified live eight-argument
-- contract. It does not apply itself to any database.

-- Remove the obsolete four-argument overload if it exists. Leaving it in place
-- can make calls ambiguous and would preserve a stale repository contract.
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
  v_tx_id UUID;
BEGIN
  IF p_amount IS NULL OR p_amount = 0 THEN
    RAISE EXCEPTION 'p_amount must not be zero';
  END IF;

  IF p_idempotency_key IS NULL OR TRIM(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'p_idempotency_key must not be empty';
  END IF;

  SELECT id INTO v_tx_id
  FROM public.credit_transactions
  WHERE idempotency_key = p_idempotency_key;

  IF v_tx_id IS NOT NULL THEN
    RETURN QUERY
      SELECT v_tx_id, cw.balance, true
      FROM public.credit_wallets cw
      WHERE cw.user_id = p_user_id;
    RETURN;
  END IF;

  SELECT id, balance INTO v_wallet_id, v_balance_before
  FROM public.credit_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_wallet_id IS NULL THEN
    INSERT INTO public.credit_wallets (user_id, balance)
    VALUES (p_user_id, 0)
    RETURNING id, balance INTO v_wallet_id, v_balance_before;
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
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_tx_id, v_balance_after, false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_credits(
  UUID, BIGINT, TEXT, TEXT, TEXT, UUID, JSONB, TEXT
) FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.grant_credits(
  UUID, BIGINT, TEXT, TEXT, TEXT, UUID, JSONB, TEXT
) TO service_role;
