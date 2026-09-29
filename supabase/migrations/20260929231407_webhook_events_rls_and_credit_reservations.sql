-- Framic AI — webhook_events lockdown + credit reservation RPCs
-- Applied live to gkvvecskbkwpcsuatklm as migration 20260929231407.
-- Also copy this file to supabase/migrations/ on main so repo ledger matches live.

-- 1. Table privileges aligned to existing RLS policies
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.credit_wallets TO authenticated;
GRANT SELECT ON TABLE public.credit_transactions TO authenticated;
GRANT SELECT ON TABLE public.subscriptions TO authenticated;
GRANT SELECT ON TABLE public.payments TO authenticated;
GRANT SELECT, UPDATE ON TABLE public.generated_assets TO authenticated;
GRANT SELECT ON TABLE public.generation_jobs TO authenticated;

REVOKE ALL ON TABLE public.webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON TABLE public.webhook_events TO service_role;

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_events_service_role_all ON public.webhook_events;
CREATE POLICY webhook_events_service_role_all
  ON public.webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Credit reservation, settlement, and release
CREATE OR REPLACE FUNCTION public.reserve_credits(
  p_user_id uuid,
  p_amount bigint,
  p_reason text,
  p_idempotency_key text,
  p_correlation_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(transaction_id uuid, balance_after bigint, duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_wallet public.credit_wallets%ROWTYPE;
  v_existing public.credit_transactions%ROWTYPE;
  v_transaction_id uuid;
BEGIN
  IF p_user_id IS NULL
     OR p_amount IS NULL OR p_amount <= 0
     OR p_reason IS NULL OR pg_catalog.btrim(p_reason) = ''
     OR p_idempotency_key IS NULL OR pg_catalog.btrim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Invalid reservation arguments' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_idempotency_key, 0)
  );

  SELECT ct.* INTO v_existing
  FROM public.credit_transactions AS ct
  WHERE ct.idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing.user_id IS DISTINCT FROM p_user_id
       OR v_existing.type <> 'deduction'
       OR v_existing.amount <> -p_amount
       OR v_existing.status NOT IN ('pending', 'completed') THEN
      RAISE EXCEPTION 'Idempotency key conflicts with an existing transaction';
    END IF;

    transaction_id := v_existing.id;
    balance_after := v_existing.balance_after;
    duplicate := true;
    RETURN NEXT;
    RETURN;
  END IF;

  SELECT cw.* INTO v_wallet
  FROM public.credit_wallets AS cw
  WHERE cw.user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit wallet not found for user %', p_user_id;
  END IF;

  IF v_wallet.balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  UPDATE public.credit_wallets AS cw
  SET balance = cw.balance - p_amount,
      updated_at = pg_catalog.now(),
      last_updated_at = pg_catalog.now()
  WHERE cw.id = v_wallet.id
  RETURNING cw.* INTO v_wallet;

  INSERT INTO public.credit_transactions (
    user_id, wallet_id, type, reason, amount,
    balance_before, balance_after, idempotency_key,
    correlation_id, status, metadata, created_by
  )
  VALUES (
    p_user_id, v_wallet.id, 'deduction', p_reason, -p_amount,
    v_wallet.balance + p_amount, v_wallet.balance, p_idempotency_key,
    p_correlation_id, 'pending', coalesce(p_metadata, '{}'::jsonb), 'system'
  )
  RETURNING id INTO v_transaction_id;

  transaction_id := v_transaction_id;
  balance_after := v_wallet.balance;
  duplicate := false;
  RETURN NEXT;
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_credits(
  p_transaction_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_transaction public.credit_transactions%ROWTYPE;
BEGIN
  IF p_transaction_id IS NULL THEN
    RAISE EXCEPTION 'Transaction ID is required' USING ERRCODE = '22023';
  END IF;

  SELECT ct.* INTO v_transaction
  FROM public.credit_transactions AS ct
  WHERE ct.id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit transaction not found';
  END IF;

  IF v_transaction.type <> 'deduction' THEN
    RAISE EXCEPTION 'Only deduction reservations can be settled';
  END IF;

  IF v_transaction.status = 'completed' THEN
    RETURN false;
  END IF;

  IF v_transaction.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending reservations can be settled';
  END IF;

  UPDATE public.credit_transactions
  SET status = 'completed'
  WHERE id = p_transaction_id;

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_credits(
  p_transaction_id uuid,
  p_release_idempotency_key text
)
RETURNS TABLE(transaction_id uuid, balance_after bigint, duplicate boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_original public.credit_transactions%ROWTYPE;
  v_refund public.credit_transactions%ROWTYPE;
  v_wallet public.credit_wallets%ROWTYPE;
  v_balance_before bigint;
  v_refund_id uuid;
BEGIN
  IF p_transaction_id IS NULL
     OR p_release_idempotency_key IS NULL
     OR pg_catalog.btrim(p_release_idempotency_key) = '' THEN
    RAISE EXCEPTION 'Invalid release arguments' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_release_idempotency_key, 0)
  );

  SELECT ct.* INTO v_original
  FROM public.credit_transactions AS ct
  WHERE ct.id = p_transaction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit reservation not found';
  END IF;

  IF v_original.type <> 'deduction' OR v_original.amount >= 0 THEN
    RAISE EXCEPTION 'Transaction is not a credit reservation';
  END IF;

  SELECT ct.* INTO v_refund
  FROM public.credit_transactions AS ct
  WHERE ct.idempotency_key = p_release_idempotency_key;

  IF FOUND THEN
    IF v_refund.type <> 'refund'
       OR v_refund.user_id IS DISTINCT FROM v_original.user_id
       OR v_refund.amount <> -v_original.amount
       OR v_refund.correlation_id IS DISTINCT FROM v_original.id THEN
      RAISE EXCEPTION 'Release idempotency key conflicts with an existing transaction';
    END IF;

    transaction_id := v_refund.id;
    balance_after := v_refund.balance_after;
    duplicate := true;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_original.status = 'rolled_back' THEN
    SELECT ct.* INTO v_refund
    FROM public.credit_transactions AS ct
    WHERE ct.correlation_id = v_original.id
      AND ct.type = 'refund'
    ORDER BY ct.created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Reservation is rolled back but its refund record is missing';
    END IF;

    transaction_id := v_refund.id;
    balance_after := v_refund.balance_after;
    duplicate := true;
    RETURN NEXT;
    RETURN;
  END IF;

  IF v_original.status <> 'pending' THEN
    RAISE EXCEPTION 'Only pending reservations can be released';
  END IF;

  SELECT cw.* INTO v_wallet
  FROM public.credit_wallets AS cw
  WHERE cw.id = v_original.wallet_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit wallet not found';
  END IF;

  v_balance_before := v_wallet.balance;

  UPDATE public.credit_wallets AS cw
  SET balance = cw.balance + (-v_original.amount),
      updated_at = pg_catalog.now(),
      last_updated_at = pg_catalog.now()
  WHERE cw.id = v_wallet.id
  RETURNING cw.* INTO v_wallet;

  UPDATE public.credit_transactions
  SET status = 'rolled_back'
  WHERE id = v_original.id;

  INSERT INTO public.credit_transactions (
    user_id, wallet_id, type, reason, amount,
    balance_before, balance_after, idempotency_key,
    correlation_id, status, metadata, created_by
  )
  VALUES (
    v_original.user_id, v_original.wallet_id, 'refund',
    'Released credit reservation', -v_original.amount,
    v_balance_before, v_wallet.balance, p_release_idempotency_key,
    v_original.id, 'completed', '{}'::jsonb, 'system'
  )
  RETURNING id INTO v_refund_id;

  transaction_id := v_refund_id;
  balance_after := v_wallet.balance;
  duplicate := false;
  RETURN NEXT;
END;
$function$;

REVOKE ALL ON FUNCTION public.reserve_credits(uuid, bigint, text, text, uuid, jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_credits(uuid, bigint, text, text, uuid, jsonb)
  TO service_role;

REVOKE ALL ON FUNCTION public.settle_credits(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_credits(uuid)
  TO service_role;

REVOKE ALL ON FUNCTION public.release_credits(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_credits(uuid, text)
  TO service_role;
