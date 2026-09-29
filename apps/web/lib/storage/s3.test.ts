import { describe, expect, it, vi } from 'vitest';
import { buildStorageKey, parseStorageKey } from './s3';

vi.mock('server-only', () => ({}));

const USER = '550e8400-e29b-41d4-a716-446655440000';
const OTHER = '550e8400-e29b-41d4-a716-446655440001';

describe('S3 storage keys', () => {
  it('builds keys under users/{user_id}/{kind}/', () => {
    expect(buildStorageKey({ userId: USER, kind: 'generated', path: 'job-1/out.png' })).toBe(
      `users/${USER}/generated/job-1/out.png`,
    );
    expect(buildStorageKey({ userId: USER, kind: 'avatars', path: 'me.png' })).toBe(
      `users/${USER}/avatars/me.png`,
    );
  });

  it('rejects traversal, empty segments and non-uuid user ids', () => {
    expect(() => buildStorageKey({ userId: USER, kind: 'uploads', path: '../x.png' })).toThrow();
    expect(() => buildStorageKey({ userId: USER, kind: 'uploads', path: 'a//b.png' })).toThrow();
    expect(() => buildStorageKey({ userId: 'not-a-uuid', kind: 'uploads', path: 'x.png' })).toThrow();
  });

  it('parses valid keys and identifies the owner', () => {
    expect(parseStorageKey(`users/${USER}/uploads/x.png`)).toEqual({ userId: USER, kind: 'uploads' });
    expect(parseStorageKey(`users/${OTHER}/uploads/x.png`)?.userId).toBe(OTHER);
  });

  it('rejects keys outside the layout', () => {
    expect(parseStorageKey('public/x.png')).toBeNull();
    expect(parseStorageKey(`users/${USER}/videos/x.mp4`)).toBeNull();
    expect(parseStorageKey(`users/${USER}/uploads/../x.png`)).toBeNull();
  });
});
