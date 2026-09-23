'use server';

import { createClient } from '@/lib/supabase/server';

export async function exchangeCodeForSession(code: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  return { success: !error, error: error?.message };
}

export async function signUpWithPassword(email: string, password: string) {
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback` },
  });

  if (authError || !authData.user) {
    return { success: false, error: authError?.message || 'User creation failed' };
  }

  // Profile and wallet are created server-side by the on_auth_user_created
  // trigger (see supabase/migrations/20260918000000_add_signup_trigger_and_balance_rpc.sql).
  // That migration was applied to the live database and merged into main
  // via PR #18 (merged 2026-09-22). No client-side insert needed or
  // attempted here.

  return { success: true, user: authData.user };
}

export async function signInWithPassword(email: string, password: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  return { success: !error, error: error?.message, user: data?.user, session: data?.session };
}

export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  return { success: !error, error: error?.message };
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}
