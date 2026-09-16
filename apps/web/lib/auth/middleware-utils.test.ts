import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getSession = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: () => ({
    auth: { getSession },
  }),
}));

import { updateSession } from './middleware-utils';

describe('updateSession', () => {
  beforeEach(() => {
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
