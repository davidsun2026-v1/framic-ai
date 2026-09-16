import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserBalance } from '@/lib/supabase/service';
import { signOut } from '@/lib/auth/actions';

// Column names below (full_name, asset_type, storage_url) are verified
// against the real production schema via direct database introspection —
// NOT against supabase/migrations/20260910000000_init_schema.sql, which
// does not match production and should not be trusted as schema truth
// until it is reconciled.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileResult, assetsResult, balanceResult] = await Promise.allSettled([
    supabase.from('profiles').select('email, full_name').eq('id', user.id).single(),
    supabase
      .from('generated_assets')
      .select('id, asset_type, storage_url, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(12),
    getUserBalance(user.id),
  ]);

  const profileError = profileResult.status === 'fulfilled' ? profileResult.value.error : profileResult.reason;
  const assetsError = assetsResult.status === 'fulfilled' ? assetsResult.value.error : assetsResult.reason;
  const balanceError = balanceResult.status === 'rejected' ? balanceResult.reason : null;

  const loadError = profileError || assetsError || balanceError;

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
        <div className="max-w-sm rounded-lg border border-red-900 bg-red-950/40 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold">Couldn't load your account</h1>
          <p className="text-sm text-neutral-400">
            Something went wrong loading your data. Please try refreshing the page.
          </p>
          <p className="mt-3 text-xs text-neutral-600">
            {loadError instanceof Error ? loadError.message : String(loadError)}
          </p>
        </div>
      </div>
    );
  }

  const profile = profileResult.status === 'fulfilled' ? profileResult.value.data : null;
  const assets = assetsResult.status === 'fulfilled' ? assetsResult.value.data : null;
  const balance = balanceResult.status === 'fulfilled' ? balanceResult.value : 0;

  const displayName = profile?.full_name || profile?.email || user.email;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <p className="text-sm text-neutral-400">Welcome back</p>
          <h1 className="text-lg font-semibold">{displayName}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm">
            <span className="text-neutral-400">Tokens: </span>
            <span className="font-semibold">{balance.toLocaleString()}</span>
          </div>

          {/* /generate doesn't exist yet — disabled rather than a dead link */}
          <button
            type="button"
            disabled
            title="Coming soon"
            className="cursor-not-allowed rounded-md bg-neutral-800 px-4 py-2 text-sm font-medium text-neutral-500"
          >
            + New generation
          </button>

          <form action={signOut}>
            <button
              type="submit"
              className="rounded-md border border-neutral-800 px-3 py-2 text-sm text-neutral-400 hover:text-white"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="p-6">
        <h2 className="mb-4 text-sm font-medium text-neutral-400">Your assets</h2>

        {!assets || assets.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-800 p-12 text-center text-neutral-500">
            No assets yet. Generate your first image or video to see it here.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="aspect-square overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
              >
                {asset.asset_type === 'image' && asset.storage_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.storage_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                    {asset.asset_type}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
