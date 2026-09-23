import { z } from 'zod';

export const FRAMIC_AHP_GENERATION_CHANNEL_PREFIX = 'x-framic-generation:/';
export const FRAMIC_AHP_GENERATION_CREATE_METHOD = 'x-framic/generation/create';
export const FRAMIC_AHP_GENERATION_UPDATED_NOTIFICATION = 'x-framic/generation/updated';

export const FramicGenerationTypeSchema = z.enum([
  'text_to_image',
  'image_to_image',
  'text_to_video',
  'image_to_video',
]);

export const FramicGenerationStateSchema = z.enum([
  'requested',
  'authorized',
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
  'refunded',
]);

export const FramicGenerationRequestSchema = z.object({
  channel: z.string().url(),
  type: FramicGenerationTypeSchema,
  model: z.string().min(1),
  prompt: z.string().min(1),
  inputAssetId: z.string().uuid().nullable().optional(),
  parameters: z.record(z.unknown()).default({}),
  idempotencyKey: z.string().min(1).max(255),
}).strict();

export const FramicGenerationAcceptedSchema = z.object({
  channel: z.string().url(),
  generationJobId: z.string().uuid(),
  requestId: z.string().uuid(),
  state: FramicGenerationStateSchema,
}).strict();

export const FramicGenerationStateSchemaEnvelope = z.object({
  channel: z.string().url(),
  generationJobId: z.string().uuid(),
  requestId: z.string().uuid(),
  state: FramicGenerationStateSchema,
  statusReason: z.string().nullable(),
  providerJobId: z.string().nullable(),
  outputUrl: z.string().url().nullable(),
  creditsReserved: z.number().int().positive(),
  creditsConsumed: z.number().int().nonnegative().nullable(),
}).strict();

export type FramicGenerationType = z.infer<typeof FramicGenerationTypeSchema>;
export type FramicGenerationState = z.infer<typeof FramicGenerationStateSchema>;
export type FramicGenerationRequest = z.infer<typeof FramicGenerationRequestSchema>;
export type FramicGenerationAccepted = z.infer<typeof FramicGenerationAcceptedSchema>;
export type FramicGenerationStateEnvelope = z.infer<typeof FramicGenerationStateSchemaEnvelope>;
