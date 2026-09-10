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

  // Fallback profile & wallet creation if Supabase triggers didn't fire
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authData.user.id)
    .single();

  if (!profile) {
    await supabase.from('profiles').insert({ id: authData.user.id, email: authData.user.email, status: 'active' });
    await supabase.from('credit_wallets').insert({ user_id: authData.user.id, balance: 0 });
  }

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
