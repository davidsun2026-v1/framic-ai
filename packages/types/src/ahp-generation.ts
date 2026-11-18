import { z } from 'zod';
import { PositiveTokenAmountSchema, TokenAmountSchema, UuidSchema, IsoTimestampSchema } from './common.types';
import {
  GenerationFailureCodeSchema,
  GenerationJobStateSchema,
  GenerationRequestSchema,
  GenerationTypeSchema,
} from './generation.types';
import type { GenerationJobState } from './generation.types';
import { PricingSkuSchema, TokenReservationStatusSchema } from './tokens.types';
import type { TokenReservationStatus } from './tokens.types';

export const FRAMIC_AHP_GENERATION_CHANNEL_PREFIX = 'x-framic-generation:/';
export const FRAMIC_AHP_GENERATION_CREATE_METHOD = 'x-framic/generation/create';
export const FRAMIC_AHP_GENERATION_UPDATED_NOTIFICATION = 'x-framic/generation/updated';

const ChannelSchema = z.string().startsWith(FRAMIC_AHP_GENERATION_CHANNEL_PREFIX);

/**
 * Token reservation status implied by each job state. The wire contract
 * rejects any envelope that disagrees, so a client can never observe a job
 * whose Tokens are in the wrong bucket.
 *   REQUESTED / QUEUED_BACKLOG  no hold exists yet
 *   AUTHORIZED / QUEUED / RUNNING  RESERVED
 *   SUCCEEDED  DEBITED
 *   FAILED / CANCELLED  RELEASED (net impact: zero)
 */
export const RESERVATION_STATUS_BY_JOB_STATE: Readonly<
  Record<GenerationJobState, TokenReservationStatus | null>
> = {
  REQUESTED: null,
  QUEUED_BACKLOG: null,
  AUTHORIZED: 'RESERVED',
  QUEUED: 'RESERVED',
  RUNNING: 'RESERVED',
  SUCCEEDED: 'DEBITED',
  FAILED: 'RELEASED',
  CANCELLED: 'RELEASED',
};

export const FramicGenerationTypeSchema = GenerationTypeSchema;
export const FramicGenerationStateSchema = GenerationJobStateSchema;

export const FramicGenerationRequestSchema = z
  .object({
    channel: ChannelSchema,
    request: GenerationRequestSchema,
  })
  .strict();

export const FramicGenerationAcceptedSchema = z
  .object({
    channel: ChannelSchema,
    generationJobId: UuidSchema,
    requestId: UuidSchema,
    state: GenerationJobStateSchema,
    pricingSku: PricingSkuSchema,
    tokensToReserve: PositiveTokenAmountSchema,
    /** Populated when state is QUEUED_BACKLOG. */
    estimatedWaitSeconds: z.number().int().nonnegative().nullable(),
  })
  .strict();

export const FramicGenerationStateSchemaEnvelope = z
  .object({
    channel: ChannelSchema,
    generationJobId: UuidSchema,
    requestId: UuidSchema,
    state: GenerationJobStateSchema,
    reservationStatus: TokenReservationStatusSchema.nullable(),
    failureCode: GenerationFailureCodeSchema.nullable(),
    statusReason: z.string().nullable(),
    tokensReserved: PositiveTokenAmountSchema,
    tokensSettled: TokenAmountSchema.nullable(),
    /** Assets are private; fetch signed URLs through the asset API. */
    outputAssetIds: z.array(UuidSchema),
    updatedAt: IsoTimestampSchema,
  })
  .strict()
  .superRefine((env, ctx) => {
    const fail = (path: string, message: string): void =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [path], message });
    if (env.reservationStatus !== RESERVATION_STATUS_BY_JOB_STATE[env.state]) {
      fail('reservationStatus', `State ${env.state} requires reservationStatus ${String(RESERVATION_STATUS_BY_JOB_STATE[env.state])}.`);
    }
    if ((env.state === 'SUCCEEDED') !== (env.tokensSettled !== null)) {
      fail('tokensSettled', 'tokensSettled is set if and only if state is SUCCEEDED.');
    }
    if (env.state === 'FAILED' && env.failureCode === null) {
      fail('failureCode', 'FAILED requires a failureCode.');
    }
    if (env.state === 'SUCCEEDED' && env.outputAssetIds.length === 0) {
      fail('outputAssetIds', 'SUCCEEDED requires at least one persisted output asset.');
    }
  });

export type FramicGenerationType = z.infer<typeof FramicGenerationTypeSchema>;
export type FramicGenerationState = z.infer<typeof FramicGenerationStateSchema>;
export type FramicGenerationRequest = z.infer<typeof FramicGenerationRequestSchema>;
export type FramicGenerationAccepted = z.infer<typeof FramicGenerationAcceptedSchema>;
export type FramicGenerationStateEnvelope = z.infer<typeof FramicGenerationStateSchemaEnvelope>;
