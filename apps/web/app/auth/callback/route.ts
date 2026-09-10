import { NextRequest, NextResponse } from 'next/server';
import { exchangeCodeForSession } from '@/lib/auth/actions';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) return NextResponse.redirect(new URL('/login?error=no_code', request.nextUrl.origin));

  const result = await exchangeCodeForSession(code);
  if (!result.success) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(result.error || 'Unknown error')}`, request.nextUrl.origin)
    );
  }

  return NextResponse.redirect(new URL('/dashboard', request.nextUrl.origin));
}
