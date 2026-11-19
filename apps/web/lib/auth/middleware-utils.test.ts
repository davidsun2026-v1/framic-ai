import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const getSession = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getSession },
  }),
}));

import { updateSession } from './middleware-utils';

describe('updateSession', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    getSession.mockResolvedValue({ data: { session: null } });
  });

  it('redirects unauthenticated users from protected routes to login', async () => {
    const request = new NextRequest('http://localhost/dashboard');

    const response = await updateSession(request);

    expect(getSession).toHaveBeenCalledOnce();
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost/login');
  });
});
