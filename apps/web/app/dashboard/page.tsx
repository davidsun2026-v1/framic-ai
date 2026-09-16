import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/lib/auth/actions';

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const [profileResult, walletResult, assetsResult] = await Promise.all([
    supabase.from('profiles').select('email, display_name').eq('id', user.id).single(),
    supabase.from('credit_wallets').select('balance').eq('user_id', user.id).single(),
    supabase
      .from('generated_assets')
      .select('id, type, public_url, cdn_url, created_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  // Previously, query errors were silently discarded and rendered as an
  // empty/zero state indistinguishable from a genuinely new user. Now we
  // surface a real error state instead.
  const loadError = profileResult.error || walletResult.error || assetsResult.error;

  if (loadError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-950 px-4 text-white">
        <div className="max-w-sm rounded-lg border border-red-900 bg-red-950/40 p-6 text-center">
          <h1 className="mb-2 text-lg font-semibold">Couldn't load your account</h1>
          <p className="text-sm text-neutral-400">
            Something went wrong loading your data. Please try refreshing the page.
          </p>
          <p className="mt-3 text-xs text-neutral-600">{loadError.message}</p>
        </div>
      </div>
    );
  }

  const profile = profileResult.data;
  const wallet = walletResult.data;
  const assets = assetsResult.data;

  const displayName = profile?.display_name || profile?.email || user.email;
  const balance = wallet?.balance ?? 0;

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <header className="flex items-center justify-between border-b border-neutral-800 px-6 py-4">
        <div>
          <p className="text-sm text-neutral-400">Welcome back</p>
          <h1 className="text-lg font-semibold">{displayName}</h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm">
            <span className="text-neutral-400">Credits: </span>
            <span className="font-semibold">{balance.toLocaleString()}</span>
          </div>

          {/* /generate doesn't exist yet — disabled rather than a dead link (Codex P1) */}
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
                {asset.type === 'image' && (asset.cdn_url || asset.public_url) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.cdn_url || asset.public_url || ''}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-neutral-500">
                    {asset.type}
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
