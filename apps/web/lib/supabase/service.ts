import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role Supabase client. SERVER-ONLY — never import this file from a
// Client Component, and never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
//
// This is required because production RPCs called from this file (currently
// get_user_balance, grant_credits, upsert_subscription_from_paystack,
// set_subscription_status_by_paystack_id, upsert_payment_from_paystack) are
// deliberately NOT granted to the `authenticated` or `anon` Postgres roles —
// they are SECURITY DEFINER functions meant to be called only from a
// trusted server context.

export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase service role configuration (SUPABASE_SERVICE_ROLE_KEY)');
  }

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Verified via direct pg_proc introspection (2026-09-20) of the connected
// Supabase project: get_user_balance(p_user_id uuid) returns bigint,
// STABLE SECURITY DEFINER, reads credit_wallets.balance directly and
// defaults to 0 if the user has no wallet row yet. It does NOT read from
// view_user_balances — that view does not exist in this database. Added
// by PR #18 (https://github.com/davidsun2026-v1/framic-ai/pull/18),
// currently open and not yet merged to main, though already applied to
// the live database.
export async function getUserBalance(userId: string): Promise<number> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('get_user_balance', { p_user_id: userId });

  if (error) {
    throw new Error(`Failed to fetch balance: ${error.message}`);
  }

  return data ?? 0;
}

// Resolves a Paystack customer's email to our internal user id. Returns
// null (not an error) when no matching profile exists — the caller decides
// how to handle an unrecognized payer (currently: record the webhook event
// with an error and skip fulfillment rather than guessing).
export async function findUserIdByEmail(email: string): Promise<string | null> {
  const service = createServiceClient();
  const { data, error } = await service.from('profiles').select('id').eq('email', email).maybeSingle();

  if (error) {
    throw new Error(`Failed to look up user by email: ${error.message}`);
  }

  return data?.id ?? null;
}

export interface GrantCreditsResult {
  transactionId: string;
  newBalance: number;
  duplicate: boolean;
}

// Calls public.grant_credits — atomic wallet update + immutable ledger
// insert, idempotent on idempotencyKey. Added in
// supabase/migrations/20260923120000_add_paystack_fulfillment_rpcs.sql.
export async function grantCredits(params: {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey: string;
  type?: 'purchase' | 'grant' | 'deduction' | 'refund' | 'adjustment' | 'bonus';
  correlationId?: string;
  metadata?: Record<string, unknown>;
}): Promise<GrantCreditsResult> {
  const service = createServiceClient();
  const { data, error } = await service
    .rpc('grant_credits', {
      p_user_id: params.userId,
      p_amount: params.amount,
      p_reason: params.reason,
      p_idempotency_key: params.idempotencyKey,
      p_type: params.type ?? 'grant',
      p_correlation_id: params.correlationId ?? null,
      p_metadata: params.metadata ?? {},
      p_created_by: 'payment_webhook',
    })
    .single();

  if (error) {
    throw new Error(`Failed to grant credits: ${error.message}`);
  }

  return {
    transactionId: data.transaction_id,
    newBalance: data.new_balance,
    duplicate: data.duplicate,
  };
}

// Calls public.upsert_subscription_from_paystack — idempotent on user_id
// (one subscription row per user, per the schema's UNIQUE constraint).
export async function upsertSubscriptionFromPaystack(params: {
  userId: string;
  planId: string;
  planName: string;
  monthlyCredits: number;
  status: string;
  paystackCustomerId?: string | null;
  paystackAuthorizationId?: string | null;
  paystackSubscriptionId?: string | null;
  renewalDate?: string | null;
}): Promise<string> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('upsert_subscription_from_paystack', {
    p_user_id: params.userId,
    p_plan_id: params.planId,
    p_plan_name: params.planName,
    p_monthly_credits: params.monthlyCredits,
    p_status: params.status,
    p_paystack_customer_id: params.paystackCustomerId ?? null,
    p_paystack_authorization_id: params.paystackAuthorizationId ?? null,
    p_paystack_subscription_id: params.paystackSubscriptionId ?? null,
    p_renewal_date: params.renewalDate ?? null,
  });

  if (error) {
    throw new Error(`Failed to upsert subscription: ${error.message}`);
  }

  return data;
}

// Calls public.set_subscription_status_by_paystack_id — used for
// subscription.disable and similar lifecycle-only events that don't carry
// a fresh plan/credit assignment. Returns null if no subscription row
// matches the given paystack_subscription_id (logged as processing_error
// by the caller, not thrown, since a webhook for an unrecognized
// subscription id shouldn't fail the whole request).
export async function setSubscriptionStatusByPaystackId(params: {
  paystackSubscriptionId: string;
  status: string;
  cancellationReason?: string | null;
}): Promise<string | null> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('set_subscription_status_by_paystack_id', {
    p_paystack_subscription_id: params.paystackSubscriptionId,
    p_status: params.status,
    p_cancellation_reason: params.cancellationReason ?? null,
  });

  if (error) {
    throw new Error(`Failed to update subscription status: ${error.message}`);
  }

  return data ?? null;
}

// Calls public.upsert_payment_from_paystack — idempotent on
// paystack_reference (UNIQUE in the schema).
export async function upsertPaymentFromPaystack(params: {
  userId: string;
  paystackReference: string;
  type: 'subscription_charge' | 'credit_purchase';
  amountKobo: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'abandoned';
  paystackAuthorizationId?: string | null;
  paystackCustomerId?: string | null;
  subscriptionId?: string | null;
  creditsAwarded?: number | null;
  webhookEventId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<string> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('upsert_payment_from_paystack', {
    p_user_id: params.userId,
    p_paystack_reference: params.paystackReference,
    p_type: params.type,
    p_amount_kobo: params.amountKobo,
    p_currency: params.currency,
    p_status: params.status,
    p_paystack_authorization_id: params.paystackAuthorizationId ?? null,
    p_paystack_customer_id: params.paystackCustomerId ?? null,
    p_subscription_id: params.subscriptionId ?? null,
    p_credits_awarded: params.creditsAwarded ?? null,
    p_webhook_event_id: params.webhookEventId ?? null,
    p_metadata: params.metadata ?? {},
  });

  if (error) {
    throw new Error(`Failed to upsert payment: ${error.message}`);
  }

  return data;
}
