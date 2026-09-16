import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Service-role Supabase client. SERVER-ONLY — never import this file from a
// Client Component, and never expose SUPABASE_SERVICE_ROLE_KEY to the browser.
//
// This is required because several production RPCs (get_user_balance,
// reserve_generation_tokens, etc.) are deliberately NOT granted to the
// `authenticated` or `anon` Postgres roles — they are SECURITY DEFINER
// functions meant to be called only from a trusted server context.

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

// Verified against production: get_user_balance(p_user_id uuid) returns
// integer, STABLE SECURITY DEFINER, reads from view_user_balances and
// defaults to 0 if the user has no balance row yet.
export async function getUserBalance(userId: string): Promise<number> {
  const service = createServiceClient();
  const { data, error } = await service.rpc('get_user_balance', { p_user_id: userId });

  if (error) {
    throw new Error(`Failed to fetch balance: ${error.message}`);
  }

  return data ?? 0;
}
