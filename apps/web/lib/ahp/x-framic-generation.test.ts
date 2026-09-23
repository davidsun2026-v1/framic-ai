import { describe, expect, it } from 'vitest';
import {
  FRAMIC_AHP_GENERATION_CHANNEL_PREFIX,
  FRAMIC_AHP_GENERATION_CREATE_METHOD,
  FRAMIC_AHP_GENERATION_UPDATED_NOTIFICATION,
  FramicGenerationAcceptedSchema,
  FramicGenerationRequestSchema,
  FramicGenerationStateSchemaEnvelope,
} from '../../../../packages/types/src/ahp-generation';

const validRequest = {
  channel: 'https://example.invalid/x-framic-generation/550e8400-e29b-41d4-a716-446655440000',
  type: 'text_to_image',
  model: 'provider-defined-model',
  prompt: 'A cinematic city at night',
  parameters: { aspectRatio: '16:9' },
  idempotencyKey: 'req-123',
};

describe('Framic AHP generation contract', () => {
  it('uses the reserved x- extension namespace', () => {
    expect(FRAMIC_AHP_GENERATION_CHANNEL_PREFIX).toMatch(/^x-framic-/);
    expect(FRAMIC_AHP_GENERATION_CREATE_METHOD).toMatch(/^x-framic\//);
    expect(FRAMIC_AHP_GENERATION_UPDATED_NOTIFICATION).toMatch(/^x-framic\//);
  });

  it('accepts a generation request without exposing provider credentials', () => {
    expect(FramicGenerationRequestSchema.parse(validRequest)).toEqual(validRequest);
  });

  it('requires an idempotency key for generation creation', () => {
    const { idempotencyKey: _ignored, ...withoutIdempotencyKey } = validRequest;
    expect(() => FramicGenerationRequestSchema.parse(withoutIdempotencyKey)).toThrow();
  });

  it('does not accept client-controlled credit amounts on the request', () => {
    expect(() =>
      FramicGenerationRequestSchema.parse({
        ...validRequest,
        creditsReserved: 10,
      }),
    ).toThrow();
  });

  it('does not accept provider credentials on the request', () => {
    expect(() =>
      FramicGenerationRequestSchema.parse({
        ...validRequest,
        apiKey: 'secret',
      }),
    ).toThrow();
  });

  it('accepts the server-created generation identity', () => {
    const accepted = {
      channel: validRequest.channel,
      generationJobId: '550e8400-e29b-41d4-a716-446655440000',
      requestId: '550e8400-e29b-41d4-a716-446655440001',
      state: 'requested',
    };

    expect(FramicGenerationAcceptedSchema.parse(accepted)).toEqual(accepted);
  });

  it('requires authoritative accounting fields on published state', () => {
    const state = {
      channel: validRequest.channel,
      generationJobId: '550e8400-e29b-41d4-a716-446655440000',
      requestId: '550e8400-e29b-41d4-a716-446655440001',
      state: 'authorized',
      statusReason: null,
      providerJobId: null,
      outputUrl: null,
      creditsReserved: 12,
      creditsConsumed: null,
    };

    expect(FramicGenerationStateSchemaEnvelope.parse(state)).toEqual(state);
  });
});
