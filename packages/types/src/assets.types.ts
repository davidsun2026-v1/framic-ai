/**
 * Framic AI — Asset vault contracts
 *
 * Assets live in private object storage and are reached only through
 * short-lived signed URLs. Every generated asset carries its full lineage.
 */
import { z } from 'zod';
import {
  IsoTimestampSchema,
  TokenAmountSchema,
  UuidSchema,
} from './common.types';
import { GenerationRequestSchema, GenerationTypeSchema } from './generation.types';
import { PricingSkuSchema } from './tokens.types';

export const AssetKindSchema = z.enum(['image', 'video']);
export type AssetKind = z.infer<typeof AssetKindSchema>;

export const AssetMimeTypeSchema = z.enum([
  'image/png',
  'image/jpeg',
  'image/webp',
  'video/mp4',
  'video/webm',
  'video/quicktime', // ProRes 422 proxy export
]);
export type AssetMimeType = z.infer<typeof AssetMimeTypeSchema>;

export const AssetStatusSchema = z.enum(['ACTIVE', 'ARCHIVED', 'DELETED']);
export type AssetStatus = z.infer<typeof AssetStatusSchema>;

/** Complete generation recipe; powers "Remix / Re-run". */
export const AssetLineageSchema = z
  .object({
    generationJobId: UuidSchema,
    generationType: GenerationTypeSchema,
    parentAssetIds: z.array(UuidSchema),
    request: GenerationRequestSchema,
    resolvedSeed: z.number().int(),
    modelVersion: z.string(),
    backendId: z.string(),
    pricingSku: PricingSkuSchema,
    tokensSettled: TokenAmountSchema,
  })
  .strict();
export type AssetLineage = z.infer<typeof AssetLineageSchema>;

export const AssetSchema = z
  .object({
    id: UuidSchema,
    workspaceId: UuidSchema,
    projectId: UuidSchema,
    createdByUserId: UuidSchema,
    kind: AssetKindSchema,
    mimeType: AssetMimeTypeSchema,
    storageBucket: z.string(),
    storageKey: z.string(),
    sizeBytes: z.number().int().positive(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    durationMs: z.number().int().positive().nullable(),
    fps: z.number().positive().nullable(),
    /** Null for user uploads; present for generated assets. */
    lineage: AssetLineageSchema.nullable(),
    tags: z.array(z.string().max(64)),
    status: AssetStatusSchema,
    createdAt: IsoTimestampSchema,
    updatedAt: IsoTimestampSchema,
    archivedAt: IsoTimestampSchema.nullable(),
    deletedAt: IsoTimestampSchema.nullable(),
  })
  .strict();
export type Asset = z.infer<typeof AssetSchema>;

export const SignedAssetUrlSchema = z
  .object({
    assetId: UuidSchema,
    url: z.string().url(),
    expiresAt: IsoTimestampSchema,
    purpose: z.enum(['PREVIEW', 'DOWNLOAD']),
  })
  .strict();
export type SignedAssetUrl = z.infer<typeof SignedAssetUrlSchema>;
