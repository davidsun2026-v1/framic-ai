-- Framic AI — Atomic Credit Grant RPC
-- Created: 2026-09-20
-- Purpose: Implement grant_credits(user_id, amount, reason, idempotency_key) RPC
--
-- This RPC provides atomically-safe credit grant operations with idempotency
-- guarantees. It is the authoritative server-side operation for granting credits
-- to user wallets (e.g., after successful Paystack payment verification).
--
-- Idempotency Behavior:
--   Same idempotency_key + same parameters (user, amount, reason)
--   → Returns already_processed; no mutation
--
--   Same idempotency_key + different parameters
--   → Returns conflict; no mutation
--
-- Atomicity Guarantee:
--   If wallet update succeeds but ledger insert fails, the entire transaction
--   rolls back automatically (PostgreSQL transaction semantics).
--   There is never a state where balance is updated without a ledger entry.
--
-- Concurrency Safety:
--   Wallet row is locked (SELECT ... FOR UPDATE) to prevent concurrent mutations.
--   Idempotency is checked twice: before lock (fast path) and after lock
--   (to catch race conditions).
--
-- Security:
--   - SECURITY DEFINER: runs with owner permissions
--   - search_path = public: prevents SQL injection via schema references
--   - Only service_role can execute
--   - All table references are explicitly schema-qualified

-- ============================================================================
-- grant_credits() — Atomic credit grant operation
-- ============================================================================

CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id UUID,
  p_amount BIGINT,
  p_reason TEXT,
  p_idempotency_key TEXT
)
RETURNS TABLE (
  status TEXT,
  transaction_id UUID,
  new_balance BIGINT,
  error_message TEXT
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
  v_existing_balance_after BIGINT;
BEGIN
  -- STEP 1: Validate input parameters
  
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT 'invalid_request'::TEXT, NULL::UUID, NULL::BIGINT, 'Amount must be positive'::TEXT;
    RETURN;
  END IF;
  
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RETURN QUERY SELECT 'invalid_request'::TEXT, NULL::UUID, NULL::BIGINT, 'Reason cannot be empty'::TEXT;
    RETURN;
  END IF;
  
  IF p_idempotency_key IS NULL OR TRIM(p_idempotency_key) = '' THEN
    RETURN QUERY SELECT 'invalid_request'::TEXT, NULL::UUID, NULL::BIGINT, 'Idempotency key required'::TEXT;
    RETURN;
  END IF;

  -- STEP 2: First idempotency check (before lock acquisition)
  
  SELECT id, user_id, amount, reason, balance_after
  FROM public.credit_transactions
  WHERE idempotency_key = p_idempotency_key
  INTO v_existing_id, v_existing_user_id, v_existing_amount, v_existing_reason, v_existing_balance_after;
  
  IF v_existing_id IS NOT NULL THEN
    -- Found existing transaction; validate compatibility
    
    IF v_existing_user_id != p_user_id THEN
      RETURN QUERY SELECT 'conflict'::TEXT, NULL::UUID, NULL::BIGINT, 'Idempotency key conflict: target user mismatch'::TEXT;
      RETURN;
    END IF;
    
    IF v_existing_amount != p_amount THEN
      RETURN QUERY SELECT 'conflict'::TEXT, NULL::UUID, NULL::BIGINT, 
        ('Idempotency key conflict: amount mismatch (existing: ' || v_existing_amount || ', requested: ' || p_amount || ')')::TEXT;
      RETURN;
    END IF;
    
    IF v_existing_reason != p_reason THEN
      RETURN QUERY SELECT 'conflict'::TEXT, NULL::UUID, NULL::BIGINT, 'Idempotency key conflict: reason mismatch'::TEXT;
      RETURN;
    END IF;
    
    -- All parameters match; idempotent retry of already-successful operation
    RETURN QUERY SELECT 'already_processed'::TEXT, v_existing_id, v_existing_balance_after, NULL::TEXT;
    RETURN;
  END IF;

  -- STEP 3: Lock wallet row (exclusive row-level lock)
  
  SELECT id, balance
  FROM public.credit_wallets
  WHERE user_id = p_user_id
  FOR UPDATE
  INTO v_wallet_id, v_balance_before;

  -- STEP 4: Verify wallet exists
  
  IF v_wallet_id IS NULL THEN
    RETURN QUERY SELECT 'wallet_not_found'::TEXT, NULL::UUID, NULL::BIGINT, 'User wallet not found'::TEXT;
    RETURN;
  END IF;

  -- STEP 5: Re-check idempotency after acquiring wallet lock
  -- (Race condition defense: another request may have completed this operation
  --  while we were waiting for the lock)
  
  SELECT id, user_id, amount, reason, balance_after
  FROM public.credit_transactions
  WHERE idempotency_key = p_idempotency_key
  INTO v_existing_id, v_existing_user_id, v_existing_amount, v_existing_reason, v_existing_balance_after;
  
  IF v_existing_id IS NOT NULL THEN
    -- Found existing transaction; re-validate compatibility
    
    IF v_existing_user_id != p_user_id THEN
      RETURN QUERY SELECT 'conflict'::TEXT, NULL::UUID, NULL::BIGINT, 'Idempotency key conflict: target user mismatch'::TEXT;
      RETURN;
    END IF;
    
    IF v_existing_amount != p_amount THEN
      RETURN QUERY SELECT 'conflict'::TEXT, NULL::UUID, NULL::BIGINT, 'Idempotency key conflict: amount mismatch'::TEXT;
      RETURN;
    END IF;
    
    IF v_existing_reason != p_reason THEN
      RETURN QUERY SELECT 'conflict'::TEXT, NULL::UUID, NULL::BIGINT, 'Idempotency key conflict: reason mismatch'::TEXT;
      RETURN;
    END IF;
    
    -- All parameters match; another request succeeded while we were waiting
    RETURN QUERY SELECT 'already_processed'::TEXT, v_existing_id, v_existing_balance_after, NULL::TEXT;
    RETURN;
  END IF;

  -- STEP 6: Calculate new balance
  
  v_balance_after := v_balance_before + p_amount;

  -- STEP 7: Update wallet
  -- (If this fails, the entire transaction rolls back; ledger insert never happens)
  
  UPDATE public.credit_wallets
  SET balance = v_balance_after,
      updated_at = now(),
      last_updated_at = now()
  WHERE id = v_wallet_id;

  -- STEP 8: Insert ledger transaction
  -- (If this fails, wallet update is rolled back automatically)
  
  INSERT INTO public.credit_transactions (
    id,
    user_id,
    wallet_id,
    type,
    reason,
    amount,
    balance_before,
    balance_after,
    idempotency_key,
    status,
    created_by
  )
  VALUES (
    gen_random_uuid(),
    p_user_id,
    v_wallet_id,
    'grant',
    p_reason,
    p_amount,
    v_balance_before,
    v_balance_after,
    p_idempotency_key,
    'completed',
    'payment_webhook'
  )
  RETURNING id INTO v_transaction_id;

  -- STEP 9: Return success
  
  RETURN QUERY SELECT 'granted'::TEXT, v_transaction_id, v_balance_after, NULL::TEXT;

EXCEPTION WHEN OTHERS THEN
  -- Catch unexpected database errors (FK violations, constraint violations, etc.)
  -- Return error; let transaction rollback naturally
  RETURN QUERY SELECT 'database_error'::TEXT, NULL::UUID, NULL::BIGINT, 
    ('Unexpected error: ' || SQLERRM)::TEXT;
  RETURN;
END;
$$;

-- ============================================================================
-- Security: Revoke from all public roles, grant only to service_role
-- ============================================================================

REVOKE EXECUTE ON FUNCTION public.grant_credits(UUID, BIGINT, TEXT, TEXT)
FROM PUBLIC, authenticated, anon;

GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, BIGINT, TEXT, TEXT)
TO service_role;
