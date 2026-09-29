import 'server-only';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Server-only S3 helpers. Never import this from a Client Component.
// Credentials come from the AWS SDK default provider chain; the bucket and
// region come from AWS_S3_BUCKET and AWS_S3_REGION.
//
// Key layout: users/{user_id}/{generated|uploads|avatars}/{path}
// Every operation checks that the key belongs to the given user.

export type StorageKind = 'generated' | 'uploads' | 'avatars';

const KINDS: readonly string[] = ['generated', 'uploads', 'avatars'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SEGMENT = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const MAX_PATH_SEGMENTS = 4;
const MIN_SIGNED_SECONDS = 60;
const MAX_SIGNED_SECONDS = 3600;
const DEFAULT_SIGNED_SECONDS = 900;

export function buildStorageKey(input: { userId: string; kind: StorageKind; path: string }): string {
  if (!UUID.test(input.userId)) {
    throw new Error('Invalid user id for storage key');
  }
  if (!KINDS.includes(input.kind)) {
    throw new Error('Invalid storage kind');
  }

  const segments = input.path.split('/');
  if (segments.length > MAX_PATH_SEGMENTS || !segments.every((s) => SEGMENT.test(s))) {
    throw new Error('Invalid storage path');
  }

  return ['users', input.userId.toLowerCase(), input.kind, ...segments].join('/');
}

export function parseStorageKey(key: string): { userId: string; kind: StorageKind } | null {
  const parts = key.split('/');
  if (parts.length < 4 || parts.length > 3 + MAX_PATH_SEGMENTS || parts[0] !== 'users') {
    return null;
  }

  const [, userId, kind, ...rest] = parts;
  if (!UUID.test(userId) || !KINDS.includes(kind) || !rest.every((s) => SEGMENT.test(s))) {
    return null;
  }

  return { userId: userId.toLowerCase(), kind: kind as StorageKind };
}

function assertOwned(userId: string, key: string) {
  const parsed = parseStorageKey(key);
  if (!parsed || parsed.userId !== userId.toLowerCase()) {
    throw new Error('Storage key is invalid or not owned by this user');
  }
}

function getConfig() {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_S3_REGION;
  if (!bucket || !region) {
    throw new Error('Missing S3 configuration (AWS_S3_BUCKET, AWS_S3_REGION)');
  }
  return { bucket, region };
}

let cachedClient: S3Client | null = null;

function getClient(region: string) {
  cachedClient ??= new S3Client({ region });
  return cachedClient;
}

export async function putObject(input: {
  userId: string;
  key: string;
  body: Uint8Array;
  contentType: string;
}): Promise<{ bucket: string; key: string }> {
  assertOwned(input.userId, input.key);
  const { bucket, region } = getConfig();

  await getClient(region).send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: input.key,
      Body: input.body,
      ContentType: input.contentType,
      ServerSideEncryption: 'AES256',
    }),
  );

  return { bucket, key: input.key };
}

export async function getObject(input: {
  userId: string;
  key: string;
}): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  assertOwned(input.userId, input.key);
  const { bucket, region } = getConfig();

  const result = await getClient(region).send(
    new GetObjectCommand({ Bucket: bucket, Key: input.key }),
  );
  if (!result.Body) {
    throw new Error('S3 object had no body');
  }

  return {
    bytes: await result.Body.transformToByteArray(),
    contentType: result.ContentType ?? null,
  };
}

export async function deleteObject(input: { userId: string; key: string }): Promise<void> {
  assertOwned(input.userId, input.key);
  const { bucket, region } = getConfig();

  await getClient(region).send(new DeleteObjectCommand({ Bucket: bucket, Key: input.key }));
}

export async function getSignedGetUrl(input: {
  userId: string;
  key: string;
  expiresInSeconds?: number;
}): Promise<string> {
  assertOwned(input.userId, input.key);
  const { bucket, region } = getConfig();

  const requested = input.expiresInSeconds ?? DEFAULT_SIGNED_SECONDS;
  const expiresIn = Math.min(Math.max(requested, MIN_SIGNED_SECONDS), MAX_SIGNED_SECONDS);

  return getSignedUrl(getClient(region), new GetObjectCommand({ Bucket: bucket, Key: input.key }), {
    expiresIn,
  });
}
