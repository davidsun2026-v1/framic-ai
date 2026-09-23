-- Framic AI — Paystack fulfillment RPCs
-- Created: 2026-09-23
-- Purpose: Atomic, idempotent server-side functions backing
-- apps/web/app/api/webhooks/paystack/route.ts (Commit 10).
--
-- Scope: subscription charge fulfillment (charge.success tied to a
-- recognized Paystack plan_code) and subscription lifecycle sync
-- (subscription.create / subscription.disable). One-off credit-pack
-- purchases (payments.type = 'credit_purchase') are intentionally NOT
-- handled here — no approved credit-purchase price/credit matrix exists
-- (see docs/02-MODULES/05-PAYSTACK.md, Non-goals).
--
-- Plan catalog note: this migration does NOT add a 'studio' plan_id.
-- public.subscriptions.plan_id_valid still constrains to
-- ('starter','pro','business'), and packages/types/src/index.ts types
-- SubscriptionPlanId the same way. The requested credit matrix
-- (1000 / 3000 / 10000) is applied to starter / pro / business
-- respectively. Renaming 'business' to 'studio' requires its own
-- migration plus a product-owner-approved plan catalog change.
--
-- Each function is independently idempotent (ON CONFLICT / idempotency
-- key), so the webhook route can safely retry the whole sequence on
-- partial failure without double-granting credits or duplicating rows.

-- ============================================================================
-- 1. grant_credits — generic atomic, idempotent ledger credit
-- ============================================================================
CREATE OR REPLACE FUNCTION public.grant_credits(
  p_user_id UUID,
  p_amount BIGINT,
  p_reason TEXT,
  p_idempotency_key TEXT,
  p_type TEXT DEFAULT 'grant',
  p_correlation_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
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
  IF p_amount = 0 THEN
    RAISE EXCEPTION 'p_amount must not be zero';
  END IF;

  -- Idempotency: if this key was already used, return the prior result
  -- instead of granting again.
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

  -- Lock (or create) the wallet row for this user to serialize concurrent
  -- grants/deductions against the same wallet.
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
    p_correlation_id, 'completed', p_metadata, p_created_by
  )
  RETURNING id INTO v_tx_id;

  RETURN QUERY SELECT v_tx_id, v_balance_after, false;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_credits(UUID, BIGINT, TEXT, TEXT, TEXT, UUID, JSONB, TEXT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.grant_credits(UUID, BIGINT, TEXT, TEXT, TEXT, UUID, JSONB, TEXT) TO service_role;

-- ============================================================================
-- 2. upsert_subscription_from_paystack — sync subscription lifecycle state
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_subscription_from_paystack(
  p_user_id UUID,
  p_plan_id TEXT,
  p_plan_name TEXT,
  p_monthly_credits BIGINT,
  p_status TEXT,
  p_paystack_customer_id TEXT DEFAULT NULL,
  p_paystack_authorization_id TEXT DEFAULT NULL,
  p_paystack_subscription_id TEXT DEFAULT NULL,
  p_renewal_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.subscriptions (
    user_id, plan_id, plan_name, monthly_credits, status,
    paystack_customer_id, paystack_authorization_id, paystack_subscription_id,
    current_period_start, renewal_date, last_verified_at
  ) VALUES (
    p_user_id, p_plan_id, p_plan_name, p_monthly_credits, p_status,
    p_paystack_customer_id, p_paystack_authorization_id, p_paystack_subscription_id,
    now(), p_renewal_date, now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    plan_id = EXCLUDED.plan_id,
    plan_name = EXCLUDED.plan_name,
    monthly_credits = EXCLUDED.monthly_credits,
    status = EXCLUDED.status,
    paystack_customer_id = COALESCE(EXCLUDED.paystack_customer_id, public.subscriptions.paystack_customer_id),
    paystack_authorization_id = COALESCE(EXCLUDED.paystack_authorization_id, public.subscriptions.paystack_authorization_id),
    paystack_subscription_id = COALESCE(EXCLUDED.paystack_subscription_id, public.subscriptions.paystack_subscription_id),
    renewal_date = COALESCE(EXCLUDED.renewal_date, public.subscriptions.renewal_date),
    last_verified_at = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_subscription_from_paystack(UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.upsert_subscription_from_paystack(UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, TIMESTAMPTZ) TO service_role;

-- ============================================================================
-- 3. set_subscription_status_by_paystack_id — lifecycle events (disable, etc.)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_subscription_status_by_paystack_id(
  p_paystack_subscription_id TEXT,
  p_status TEXT,
  p_cancellation_reason TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  UPDATE public.subscriptions
  SET status = p_status,
      cancelled_at = CASE WHEN p_status IN ('cancelled', 'suspended') THEN now() ELSE cancelled_at END,
      cancellation_reason = COALESCE(p_cancellation_reason, cancellation_reason),
      last_verified_at = now(),
      updated_at = now()
  WHERE paystack_subscription_id = p_paystack_subscription_id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_subscription_status_by_paystack_id(TEXT, TEXT, TEXT) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.set_subscription_status_by_paystack_id(TEXT, TEXT, TEXT) TO service_role;

-- ============================================================================
-- 4. upsert_payment_from_paystack — record/settle a payment row
-- ============================================================================
CREATE OR REPLACE FUNCTION public.upsert_payment_from_paystack(
  p_user_id UUID,
  p_paystack_reference TEXT,
  p_type TEXT,
  p_amount_kobo BIGINT,
  p_currency TEXT,
  p_status TEXT,
  p_paystack_authorization_id TEXT DEFAULT NULL,
  p_paystack_customer_id TEXT DEFAULT NULL,
  p_subscription_id UUID DEFAULT NULL,
  p_credits_awarded BIGINT DEFAULT NULL,
  p_webhook_event_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.payments (
    user_id, paystack_reference, paystack_authorization_id, paystack_customer_id,
    type, amount_kobo, currency, status, subscription_id, credits_awarded,
    metadata, verified_at, verification_attempts, webhook_event_id
  ) VALUES (
    p_user_id, p_paystack_reference, p_paystack_authorization_id, p_paystack_customer_id,
    p_type, p_amount_kobo, p_currency, p_status, p_subscription_id, p_credits_awarded,
    p_metadata, CASE WHEN p_status = 'success' THEN now() ELSE NULL END, 1, p_webhook_event_id
  )
  ON CONFLICT (paystack_reference) DO UPDATE SET
    status = EXCLUDED.status,
    subscription_id = COALESCE(EXCLUDED.subscription_id, public.payments.subscription_id),
    credits_awarded = COALESCE(EXCLUDED.credits_awarded, public.payments.credits_awarded),
    verified_at = CASE WHEN EXCLUDED.status = 'success' THEN now() ELSE public.payments.verified_at END,
    verification_attempts = public.payments.verification_attempts + 1,
    webhook_event_id = COALESCE(EXCLUDED.webhook_event_id, public.payments.webhook_event_id),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.upsert_payment_from_paystack(UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, UUID, BIGINT, TEXT, JSONB) FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.upsert_payment_from_paystack(UUID, TEXT, TEXT, BIGINT, TEXT, TEXT, TEXT, TEXT, UUID, BIGINT, TEXT, JSONB) TO service_role;
