/**
 * Framic AI — Worker and inference-backend contracts
 *
 * Provider-agnostic seam between the generation worker and whatever executes
 * the model: a hosted API today, a GPU pool later. Specification:
 * docs/03-SPECS/02-INFERENCE_BACKEND_INTERFACE.md.
 *
 * Workers never write to the token ledger. They report outcomes to the API
 * gateway, which alone settles or releases reservations.
 */
import { z } from 'zod';
import { IsoTimestampSchema, UuidSchema } from './common.types';
import {
  GenerationFailureCodeSchema,
  GenerationRequestSchema,
  GenerationTypeSchema,
  QueueNameSchema,
} from './generation.types';
import type { GenerationRequest, GenerationType } from './generation.types';
import { AssetMimeTypeSchema } from './assets.types';
import type { AssetMimeType } from './assets.types';

export const WORKER_HEARTBEAT_INTERVAL_SECONDS = 3;

// ---------------------------------------------------------------------------
// Broker message
// ---------------------------------------------------------------------------

export const GenerationTaskEnvelopeSchema = z
  .object({
    jobId: UuidSchema,
    reservationId: UuidSchema,
    queueName: QueueNameSchema,
    workspaceId: UuidSchema,
    request: GenerationRequestSchema,
    /** Resolved asset locations the worker may read (signed, short-lived). */
    inputAssetUrls: z.record(UuidSchema, z.string().url()),
    /** Pre-signed multipart targets, one per expected output. */
    outputUploadTargets: z
      .array(
        z
          .object({
            storageKey: z.string(),
            uploadUrl: z.string().url(),
            expiresAt: IsoTimestampSchema,
          })
          .strict(),
      )
      .min(1),
    leaseTimeoutSeconds: z.number().int().positive(),
    enqueuedAt: IsoTimestampSchema,
  })
  .strict();
export type GenerationTaskEnvelope = z.infer<typeof GenerationTaskEnvelopeSchema>;

// ---------------------------------------------------------------------------
// Worker -> API callbacks (authenticated webhooks)
// ---------------------------------------------------------------------------

export const WorkerHeartbeatSchema = z
  .object({
    jobId: UuidSchema,
    workerId: z.string().min(1),
    leaseExpiresAt: IsoTimestampSchema,
    progressPercent: z.number().min(0).max(100),
    sentAt: IsoTimestampSchema,
  })
  .strict();
export type WorkerHeartbeat = z.infer<typeof WorkerHeartbeatSchema>;

export const PersistedOutputSchema = z
  .object({
    storageKey: z.string(),
    mimeType: AssetMimeTypeSchema,
    sizeBytes: z.number().int().positive(),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    durationMs: z.number().int().positive().nullable(),
    fps: z.number().positive().nullable(),
    seed: z.number().int(),
  })
  .strict();
export type PersistedOutput = z.infer<typeof PersistedOutputSchema>;

/** Sent only after every output is confirmed present in object storage. */
export const WorkerCompletionReportSchema = z
  .object({
    jobId: UuidSchema,
    workerId: z.string().min(1),
    backendId: z.string().min(1),
    modelVersion: z.string().min(1),
    outputs: z.array(PersistedOutputSchema).min(1),
    computeMs: z.number().int().nonnegative(),
    completedAt: IsoTimestampSchema,
  })
  .strict();
export type WorkerCompletionReport = z.infer<typeof WorkerCompletionReportSchema>;

export const WorkerFailureReportSchema = z
  .object({
    jobId: UuidSchema,
    workerId: z.string().min(1),
    failureCode: GenerationFailureCodeSchema,
    detail: z.string().max(2000),
    failedAt: IsoTimestampSchema,
  })
  .strict();
export type WorkerFailureReport = z.infer<typeof WorkerFailureReportSchema>;

// ---------------------------------------------------------------------------
// Inference backend interface
// ---------------------------------------------------------------------------

export type InferenceBackendKind = 'HOSTED_API' | 'GPU_POOL';

export interface InferenceBackendDescriptor {
  backendId: string;
  kind: InferenceBackendKind;
  supportedTypes: readonly GenerationType[];
  /** Model identifiers accepted in GenerationRequest.model. */
  supportedModels: readonly string[];
  /** Concurrent tasks one worker may hold against this backend. */
  maxConcurrency: number;
  /** Per-task wall-clock ceiling; exceeding it yields failure code TIMEOUT. */
  taskTimeoutSeconds: number;
}

/** Opaque, serialisable reference to an in-flight backend task. */
export interface InferenceHandle {
  backendId: string;
  backendJobId: string;
}

export type InferenceProgress =
  | { status: 'PENDING' }
  | { status: 'RUNNING'; progressPercent: number }
  | { status: 'SUCCEEDED' }
  | { status: 'FAILED'; failureCode: z.infer<typeof GenerationFailureCodeSchema>; detail: string };

export interface InferenceOutputRef {
  mimeType: AssetMimeType;
  /** Backend-hosted URL (HOSTED_API) or worker-local path (GPU_POOL). The worker copies it into private storage. */
  location: { kind: 'URL'; url: string; expiresAt: string | null } | { kind: 'LOCAL_PATH'; path: string };
  seed: number;
}

export interface InferenceResult {
  modelVersion: string;
  outputs: readonly InferenceOutputRef[];
  computeMs: number;
}

export interface InferenceTask {
  jobId: string;
  request: GenerationRequest;
  inputAssetUrls: Readonly<Record<string, string>>;
}

/**
 * Implemented once per execution target. The worker owns queue leasing,
 * heartbeats, storage upload and callbacks; a backend owns only execution.
 */
export interface InferenceBackend {
  describe(): InferenceBackendDescriptor;
  submit(task: InferenceTask, signal: AbortSignal): Promise<InferenceHandle>;
  poll(handle: InferenceHandle, signal: AbortSignal): Promise<InferenceProgress>;
  fetchResult(handle: InferenceHandle, signal: AbortSignal): Promise<InferenceResult>;
  cancel(handle: InferenceHandle): Promise<void>;
}

export const InferenceRouteSchema = z
  .object({
    type: GenerationTypeSchema,
    model: z.string().min(1),
    queueName: QueueNameSchema,
    backendId: z.string().min(1),
  })
  .strict();
export type InferenceRoute = z.infer<typeof InferenceRouteSchema>;
