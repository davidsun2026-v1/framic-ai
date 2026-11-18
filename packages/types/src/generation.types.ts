/**
 * Framic AI — Generation request, job, and state-machine contracts
 *
 * Only configurations that map to a priced SKU in TOKEN_COST_SCHEDULE are
 * accepted (see ADR-004 in docs/00-FOUNDATION/09-ARCHITECTURE_DECISIONS.md).
 * Cross-field rules mirror docs/03-SPECS/00-GENERATION_PIPELINES.md §2.
 */
import { z } from 'zod';
import {
  IsoTimestampSchema,
  PositiveTokenAmountSchema,
  TokenAmountSchema,
  UuidSchema,
} from './common.types';
import { PricingSkuSchema } from './tokens.types';

// ---------------------------------------------------------------------------
// Types and shared parameters
// ---------------------------------------------------------------------------

export const GenerationTypeSchema = z.enum([
  'text_to_image',
  'inpainting',
  'text_to_video',
  'image_to_video',
  'video_upscale',
]);
export type GenerationType = z.infer<typeof GenerationTypeSchema>;

export type GenerationMediaKind = 'image' | 'video';
export const GENERATION_TYPE_MEDIA: Readonly<Record<GenerationType, GenerationMediaKind>> = {
  text_to_image: 'image',
  inpainting: 'image',
  text_to_video: 'video',
  image_to_video: 'video',
  video_upscale: 'video',
};

export const AspectRatioSchema = z.enum(['16:9', '9:16', '1:1', '4:3', '3:4']);
export type AspectRatio = z.infer<typeof AspectRatioSchema>;

export const SamplerSchema = z.enum([
  'euler',
  'euler_ancestral',
  'dpmpp_2m',
  'dpmpp_2m_karras',
  'ddim',
]);
export type Sampler = z.infer<typeof SamplerSchema>;

export const VideoResolutionSchema = z.enum(['720p', '1080p']);
export type VideoResolution = z.infer<typeof VideoResolutionSchema>;

const SeedSchema = z.number().int().min(0).max(4_294_967_295);
const channel = z.number().min(-1).max(1).default(0);

/** Normalised camera conditioning, -1..1 per channel (Blueprint §3.1). */
export const CameraMotionSchema = z
  .object({
    pan: channel, // -1 left .. 1 right
    tilt: channel, // -1 down .. 1 up
    zoom: channel, // -1 out .. 1 in
    roll: channel, // -1 counter-clockwise .. 1 clockwise
    dolly: channel, // -1 backward .. 1 forward
  })
  .strict();
export type CameraMotion = z.infer<typeof CameraMotionSchema>;

export const GenerationPrioritySchema = z.enum(['STANDARD', 'PRIORITY']);
export type GenerationPriority = z.infer<typeof GenerationPrioritySchema>;

const baseShape = {
  workspaceId: UuidSchema,
  projectId: UuidSchema,
  /** Client-generated; repeating it returns the existing job without a second reservation. */
  idempotencyKey: UuidSchema,
  model: z.string().min(1).max(128),
  priority: GenerationPrioritySchema.default('STANDARD'),
  seed: SeedSchema.optional(),
} as const;

// ---------------------------------------------------------------------------
// Request variants
// ---------------------------------------------------------------------------

export const TextToImageRequestSchema = z
  .object({
    ...baseShape,
    type: z.literal('text_to_image'),
    prompt: z.string().trim().min(1).max(1000),
    negativePrompt: z.string().trim().max(1000).optional(),
    aspectRatio: AspectRatioSchema.default('1:1'),
    /** Pixel budget: 1024^2 or 2048^2; aspectRatio reshapes within it. */
    resolutionTier: z.enum(['STANDARD_1024', 'HIGH_2048']).default('STANDARD_1024'),
    steps: z.number().int().min(20).max(50).default(30),
    cfgScale: z.number().min(1).max(20).default(7),
    sampler: SamplerSchema.default('dpmpp_2m_karras'),
    variations: z.union([z.literal(1), z.literal(4)]).default(1),
  })
  .strict();

export const InpaintingRequestSchema = z
  .object({
    ...baseShape,
    type: z.literal('inpainting'),
    sourceAssetId: UuidSchema,
    /** Binary alpha mask asset; white = regenerate. */
    maskAssetId: UuidSchema,
    prompt: z.string().trim().min(1).max(1000),
    negativePrompt: z.string().trim().max(1000).optional(),
    steps: z.number().int().min(20).max(30).default(30),
    cfgScale: z.number().min(1).max(20).default(7),
    sampler: SamplerSchema.default('dpmpp_2m_karras'),
  })
  .strict();

export const TextToVideoRequestSchema = z
  .object({
    ...baseShape,
    type: z.literal('text_to_video'),
    prompt: z.string().trim().min(1).max(500),
    negativePrompt: z.string().trim().max(500).optional(),
    aspectRatio: z.enum(['16:9', '9:16', '1:1']).default('16:9'),
    resolution: VideoResolutionSchema.default('720p'),
    fps: z.literal(24),
    durationSeconds: z.literal(4),
    camera: CameraMotionSchema.optional(),
  })
  .strict();

export const ImageToVideoRequestSchema = z
  .object({
    ...baseShape,
    type: z.literal('image_to_video'),
    /** Keyframe asset (PNG/JPEG, max 20 MB); output aspect ratio follows it. */
    sourceAssetId: UuidSchema,
    motionPrompt: z.string().trim().min(1).max(500),
    resolution: VideoResolutionSchema.default('720p'),
    fps: z.literal(24),
    durationSeconds: z.literal(5),
    camera: CameraMotionSchema.optional(),
  })
  .strict();

export const VideoUpscaleRequestSchema = z
  .object({
    ...baseShape,
    type: z.literal('video_upscale'),
    /** Generated video asset at 720p or 1080p. */
    sourceAssetId: UuidSchema,
    targetResolution: z.literal('2160p'),
  })
  .strict();

export const GenerationRequestSchema = z
  .discriminatedUnion('type', [
    TextToImageRequestSchema,
    InpaintingRequestSchema,
    TextToVideoRequestSchema,
    ImageToVideoRequestSchema,
    VideoUpscaleRequestSchema,
  ])
  .superRefine((req, ctx) => {
    if (req.type !== 'text_to_image') return;
    if (req.resolutionTier === 'STANDARD_1024' && req.steps > 30) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['steps'],
        message: 'STANDARD_1024 supports at most 30 steps; use HIGH_2048 for up to 50.',
      });
    }
    if (req.variations === 4 && req.resolutionTier !== 'STANDARD_1024') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['variations'],
        message: 'Batch of 4 is priced for STANDARD_1024 only.',
      });
    }
  });
export type GenerationRequest = z.infer<typeof GenerationRequestSchema>;

// ---------------------------------------------------------------------------
// Job state machine (Blueprint §4.2 and §7.3)
// ---------------------------------------------------------------------------

export const GENERATION_JOB_STATES = [
  'REQUESTED',
  'QUEUED_BACKLOG',
  'AUTHORIZED',
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
] as const;
export const GenerationJobStateSchema = z.enum(GENERATION_JOB_STATES);
export type GenerationJobState = z.infer<typeof GenerationJobStateSchema>;

/**
 * Legal transitions. QUEUED_BACKLOG precedes the token hold: when queue depth
 * exceeds its threshold, low-priority jobs wait without reserving Tokens.
 * RUNNING never returns to QUEUED and cannot be cancelled: a crash fails the
 * job and releases the hold immediately.
 */
export const GENERATION_JOB_TRANSITIONS: Readonly<
  Record<GenerationJobState, readonly GenerationJobState[]>
> = {
  REQUESTED: ['AUTHORIZED', 'QUEUED_BACKLOG', 'CANCELLED'],
  QUEUED_BACKLOG: ['AUTHORIZED', 'CANCELLED'],
  AUTHORIZED: ['QUEUED', 'FAILED', 'CANCELLED'],
  QUEUED: ['RUNNING', 'FAILED', 'CANCELLED'],
  RUNNING: ['SUCCEEDED', 'FAILED'],
  SUCCEEDED: [],
  FAILED: [],
  CANCELLED: [],
};

export const GenerationFailureCodeSchema = z.enum([
  'WORKER_CRASH',
  'CUDA_OOM',
  'TIMEOUT',
  'LEASE_EXPIRED',
  'PROVIDER_ERROR',
  'PROVIDER_CONTENT_REJECTED',
  'INVALID_INPUT_ASSET',
  'STORAGE_PERSIST_FAILED',
  'ENQUEUE_FAILED',
]);
export type GenerationFailureCode = z.infer<typeof GenerationFailureCodeSchema>;

// ---------------------------------------------------------------------------
// Job record and events
// ---------------------------------------------------------------------------

export const QUEUE_NAMES = [
  'video.render.priority',
  'video.render.standard',
  'video.upscale.batch',
  'image.diffusion.standard',
  'image.batch.queue',
] as const;
export const QueueNameSchema = z.enum(QUEUE_NAMES);
export type QueueName = z.infer<typeof QueueNameSchema>;

export const GenerationJobSchema = z
  .object({
    id: UuidSchema,
    workspaceId: UuidSchema,
    projectId: UuidSchema,
    requestedByUserId: UuidSchema,
    /** Set when submitted through a pipeline API key. */
    apiKeyId: UuidSchema.nullable(),
    type: GenerationTypeSchema,
    state: GenerationJobStateSchema,
    failureCode: GenerationFailureCodeSchema.nullable(),
    statusReason: z.string().max(1000).nullable(),
    pricingSku: PricingSkuSchema,
    scheduleVersion: z.string(),
    reservationId: UuidSchema.nullable(),
    tokensReserved: PositiveTokenAmountSchema,
    tokensSettled: TokenAmountSchema.nullable(),
    /** Immutable snapshot of the accepted request (provenance). */
    request: GenerationRequestSchema,
    queueName: QueueNameSchema.nullable(),
    backendId: z.string().nullable(),
    backendJobId: z.string().nullable(),
    resolvedSeed: z.number().int().nullable(),
    outputAssetIds: z.array(UuidSchema),
    idempotencyKey: UuidSchema,
    requestId: UuidSchema,
    requestedAt: IsoTimestampSchema,
    authorizedAt: IsoTimestampSchema.nullable(),
    queuedAt: IsoTimestampSchema.nullable(),
    startedAt: IsoTimestampSchema.nullable(),
    completedAt: IsoTimestampSchema.nullable(),
    updatedAt: IsoTimestampSchema,
  })
  .strict();
export type GenerationJob = z.infer<typeof GenerationJobSchema>;

export const GENERATION_JOB_EVENT_TYPES = [
  'job.authorized',
  'job.queued',
  'job.running',
  'job.progress',
  'job.completed',
  'job.failed',
  'job.cancelled',
] as const;
export const GenerationJobEventTypeSchema = z.enum(GENERATION_JOB_EVENT_TYPES);
export type GenerationJobEventType = z.infer<typeof GenerationJobEventTypeSchema>;
