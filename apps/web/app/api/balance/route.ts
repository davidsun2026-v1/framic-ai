import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUserBalance } from '@/lib/supabase/service';

// GET /api/balance — returns the authenticated user's real token balance.
// Calls get_user_balance() via the service-role client since that RPC is
// not granted to the `authenticated` Postgres role directly.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const balance = await getUserBalance(user.id);
    return NextResponse.json({ balance });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch balance' },
      { status: 500 },
    );
  }
}
