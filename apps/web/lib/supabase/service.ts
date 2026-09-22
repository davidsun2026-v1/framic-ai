import { createClient as createSupabaseClient } from '@supabase/supabase-js';

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
