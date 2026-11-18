/**
 * Framic AI — Token accounting contracts
 *
 * Integer Tokens only; no currency anywhere. Lifecycle and invariants:
 * docs/01-PRODUCT/01-PRODUCT_BLUEPRINT.md §5 and docs/03-SPECS/01-TOKEN_ENGINE.md.
 *
 * Every account tracks three buckets:
 *   available - spendable
 *   reserved  - held for in-flight jobs (RESERVED)
 *   consumed  - irrevocably spent (DEBITED)
 */
import { z } from 'zod';
import {
  IsoTimestampSchema,
  PositiveTokenAmountSchema,
  TokenAmountSchema,
  UuidSchema,
} from './common.types';

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const TokenAccountOwnerTypeSchema = z.enum(['ORGANIZATION', 'WORKSPACE']);
export type TokenAccountOwnerType = z.infer<typeof TokenAccountOwnerTypeSchema>;

export const TokenAccountSchema = z
  .object({
    id: UuidSchema,
    ownerType: TokenAccountOwnerTypeSchema,
    ownerId: UuidSchema,
    availableBalance: TokenAmountSchema,
    reservedBalance: TokenAmountSchema,
    consumedBalance: TokenAmountSchema,
    /** Monotonic; incremented by every ledger write, used for optimistic reconciliation. */
    ledgerSequence: z.number().int().nonnegative(),
    updatedAt: IsoTimestampSchema,
  })
  .strict();
export type TokenAccount = z.infer<typeof TokenAccountSchema>;

// ---------------------------------------------------------------------------
// Ledger (append-only)
// ---------------------------------------------------------------------------

/**
 * Blueprint §5.3 lifecycle (DEPOSIT, RESERVE, SETTLE, RELEASE, REFUND) plus
 * ALLOCATE, the paired transfer from an organization treasury to a workspace
 * pool required by Blueprint §6.1 ("Allocate Workspace Token Pools").
 */
export const LedgerEntryTypeSchema = z.enum([
  'DEPOSIT',
  'RESERVE',
  'SETTLE',
  'RELEASE',
  'REFUND',
  'ALLOCATE',
]);
export type LedgerEntryType = z.infer<typeof LedgerEntryTypeSchema>;

const delta = z.number().int().min(-Number.MAX_SAFE_INTEGER).max(Number.MAX_SAFE_INTEGER);

/**
 * Each entry records signed deltas to the three buckets of one account.
 *   DEPOSIT   available +n
 *   RESERVE   available -n, reserved +n
 *   SETTLE    reserved  -n, consumed +n
 *   RELEASE   reserved  -n, available +n
 *   REFUND    consumed  -n, available +n
 *   ALLOCATE  available +/-n (two entries sharing transferId: source -n, destination +n)
 */
export const LedgerEntrySchema = z
  .object({
    id: UuidSchema,
    accountId: UuidSchema,
    entryType: LedgerEntryTypeSchema,
    availableDelta: delta,
    reservedDelta: delta,
    consumedDelta: delta,
    availableAfter: TokenAmountSchema,
    reservedAfter: TokenAmountSchema,
    consumedAfter: TokenAmountSchema,
    reservationId: UuidSchema.nullable(),
    generationJobId: UuidSchema.nullable(),
    /** Shared by the two legs of an ALLOCATE. */
    transferId: UuidSchema.nullable(),
    actorUserId: UuidSchema.nullable(),
    idempotencyKey: UuidSchema,
    reason: z.string().max(500),
    createdAt: IsoTimestampSchema,
  })
  .strict()
  .superRefine((entry, ctx) => {
    const { entryType: t, availableDelta: a, reservedDelta: r, consumedDelta: c } = entry;
    const fail = (message: string): void =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, message });
    const n = Math.abs(a) + Math.abs(r) + Math.abs(c);
    if (n === 0) return fail('Ledger entry must move a non-zero amount.');
    switch (t) {
      case 'DEPOSIT':
        if (!(a > 0 && r === 0 && c === 0)) fail('DEPOSIT must only increase available.');
        break;
      case 'RESERVE':
        if (!(a < 0 && r === -a && c === 0)) fail('RESERVE must move n from available to reserved.');
        break;
      case 'SETTLE':
        if (!(r < 0 && c === -r && a === 0)) fail('SETTLE must move n from reserved to consumed.');
        break;
      case 'RELEASE':
        if (!(r < 0 && a === -r && c === 0)) fail('RELEASE must move n from reserved to available.');
        break;
      case 'REFUND':
        if (!(c < 0 && a === -c && r === 0)) fail('REFUND must move n from consumed to available.');
        break;
      case 'ALLOCATE':
        if (!(a !== 0 && r === 0 && c === 0)) fail('ALLOCATE must only change available.');
        if (entry.transferId === null) fail('ALLOCATE requires a transferId.');
        break;
    }
    if (t !== 'DEPOSIT' && t !== 'ALLOCATE' && entry.reservationId === null && t !== 'REFUND') {
      fail(`${t} requires a reservationId.`);
    }
  });
export type LedgerEntry = z.infer<typeof LedgerEntrySchema>;

// ---------------------------------------------------------------------------
// Reservations
// ---------------------------------------------------------------------------

export const TokenReservationStatusSchema = z.enum(['RESERVED', 'DEBITED', 'RELEASED']);
export type TokenReservationStatus = z.infer<typeof TokenReservationStatusSchema>;

export const ReleaseReasonSchema = z.enum([
  'WORKER_CRASH',
  'CUDA_OOM',
  'TIMEOUT',
  'PROVIDER_ERROR',
  'ENQUEUE_FAILED',
  'CANCELLED_BEFORE_PICKUP',
  'LEASE_EXPIRED',
  'STORAGE_PERSIST_FAILED',
]);
export type ReleaseReason = z.infer<typeof ReleaseReasonSchema>;

export const TokenReservationSchema = z
  .object({
    id: UuidSchema,
    accountId: UuidSchema, // workspace pool
    workspaceId: UuidSchema,
    generationJobId: UuidSchema,
    userId: UuidSchema, // member whose monthly quota is charged
    amount: PositiveTokenAmountSchema,
    status: TokenReservationStatusSchema,
    idempotencyKey: UuidSchema,
    reservedAt: IsoTimestampSchema,
    debitedAt: IsoTimestampSchema.nullable(),
    releasedAt: IsoTimestampSchema.nullable(),
    releaseReason: ReleaseReasonSchema.nullable(),
  })
  .strict();
export type TokenReservation = z.infer<typeof TokenReservationSchema>;

// ---------------------------------------------------------------------------
// Cost schedule (Blueprint §5.2, schedule version 1.0.0)
// ---------------------------------------------------------------------------

export const PRICING_SKUS = [
  'IMAGE_STANDARD',
  'IMAGE_HIGH_RES',
  'IMAGE_INPAINTING',
  'IMAGE_BATCH_X4',
  'VIDEO_STANDARD',
  'VIDEO_HD',
  'VIDEO_I2V',
  'VIDEO_I2V_HD',
  'VIDEO_UPSCALE_4K',
] as const;
export const PricingSkuSchema = z.enum(PRICING_SKUS);
export type PricingSku = z.infer<typeof PricingSkuSchema>;

export const TOKEN_COST_SCHEDULE_VERSION = '1.0.0';

export const TOKEN_COST_SCHEDULE: Readonly<Record<PricingSku, number>> = {
  IMAGE_STANDARD: 5, // 1024x1024, 30 steps, 1 variation
  IMAGE_HIGH_RES: 15, // 2048x2048, 50 steps
  IMAGE_INPAINTING: 8, // 1024x1024, masked conditioning
  IMAGE_BATCH_X4: 18, // 1024x1024, 4 parallel seeds
  VIDEO_STANDARD: 50, // 720p, 4 s @ 24 fps
  VIDEO_HD: 100, // 1080p, 4 s @ 24 fps
  VIDEO_I2V: 75, // 720p, 5 s @ 24 fps
  VIDEO_I2V_HD: 125, // 1080p, 5 s @ 24 fps
  VIDEO_UPSCALE_4K: 120, // 3840x2160
};

// ---------------------------------------------------------------------------
// Quotas and alerts (Blueprint §6.2)
// ---------------------------------------------------------------------------

/** Percentages of pool consumption at which administrators are notified. */
export const POOL_ALERT_THRESHOLD_PERCENTS = [80, 95] as const;

export interface TokenPoolAlert {
  id: string;
  workspaceId: string;
  thresholdPercent: (typeof POOL_ALERT_THRESHOLD_PERCENTS)[number];
  poolAllocated: number;
  poolConsumed: number;
  raisedAt: string;
}
