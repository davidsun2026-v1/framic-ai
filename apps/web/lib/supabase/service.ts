import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { GrantCreditsInput, GrantCreditsRpcResult } from '@framic/types/src';

// Service-role Supabase client. SERVER-ONLY — never import this file from a
// Client Component, and never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
//
// This is required because production RPCs called from this file (currently
// get_user_balance) are deliberately NOT granted to the `authenticated` or
// `anon` Postgres roles — they are SECURITY DEFINER functions meant to be
// called only from a trusted server context.

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


/**
 * Apply an atomic credit-ledger mutation through the verified live eight-argument
 * grant_credits RPC. This utility is server-only and must only be called after
 * the server has independently verified the event that authorizes the mutation.
 */
export async function grantCredits(input: GrantCreditsInput): Promise<GrantCreditsRpcResult> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('grant_credits', {
    p_user_id: input.userId,
    p_amount: input.amount,
    p_reason: input.reason,
    p_idempotency_key: input.idempotencyKey,
    p_type: input.type ?? 'grant',
    p_correlation_id: input.correlationId ?? null,
    p_metadata: input.metadata ?? {},
    p_created_by: input.createdBy ?? 'payment_webhook',
  });

  if (error) {
    throw new Error(`Failed to grant credits: ${error.message}`);
  }

  const result = Array.isArray(data) ? data[0] : data;
  if (!result) {
    throw new Error('grant_credits returned no result');
  }

  return result as GrantCreditsRpcResult;
}
