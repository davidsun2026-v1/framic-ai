import { createServiceClient } from '@/lib/supabase/service';

export type WebhookEventStatus = 'received' | 'verified' | 'processed' | 'failed' | 'ignored';

export interface ClaimedWebhookEvent {
  id: string;
  status: WebhookEventStatus;
  /** true if this event id already exists from a prior delivery attempt */
  isRetry: boolean;
}

const POSTGRES_UNIQUE_VIOLATION = '23505';

// Insert-or-claim a webhook_events row keyed by (provider, providerEventId).
// provider_event_id is UNIQUE in the schema, so a genuinely new delivery
// inserts cleanly; a retried delivery (Paystack re-sends on timeout/5xx, or
// the same event id if Paystack's own id isn't unique per attempt) hits the
// unique constraint and we re-read the existing row instead of failing.
export async function claimWebhookEvent(params: {
  provider: 'paystack' | 'replicate' | 'custom';
  providerEventId: string;
  eventType: string;
  payload: Record<string, unknown>;
  rawSignature: string | null;
}): Promise<ClaimedWebhookEvent> {
  const service = createServiceClient();

  const { data: inserted, error: insertError } = await service
    .from('webhook_events')
    .insert({
      provider: params.provider,
      provider_event_id: params.providerEventId,
      event_type: params.eventType,
      payload: params.payload,
      raw_signature: params.rawSignature,
      status: 'verified', // signature already checked by the caller before claiming
      verified_at: new Date().toISOString(),
    })
    .select('id, status')
    .single();

  if (!insertError) {
    return { id: inserted.id, status: inserted.status, isRetry: false };
  }

  if (insertError.code !== POSTGRES_UNIQUE_VIOLATION) {
    throw new Error(`Failed to record webhook event: ${insertError.message}`);
  }

  // Duplicate provider_event_id — read back the existing row rather than
  // treating this as an error.
  const { data: existing, error: selectError } = await service
    .from('webhook_events')
    .select('id, status')
    .eq('provider', params.provider)
    .eq('provider_event_id', params.providerEventId)
    .single();

  if (selectError || !existing) {
    throw new Error(
      `Webhook event insert conflicted but existing row could not be read back: ${selectError?.message ?? 'not found'}`,
    );
  }

  return { id: existing.id, status: existing.status, isRetry: true };
}

// The init migration defines a "Prevent updates" policy (FOR UPDATE
// USING (false)) on webhook_events alongside "Service role access only"
// (FOR ALL). Whether Postgres's OR-combination of permissive policies
// means service_role can still UPDATE despite that policy is NOT VERIFIED
// here — I have not tested it against the live table. Rather than rely on
// an unverified RLS interaction for a financial audit log, application
// code simply does not attempt to UPDATE webhook_events at all: fulfillment
// outcomes live on payments/subscriptions/credit_transactions instead,
// which are the actual source of truth for what was fulfilled. This
// function is a documented no-op placeholder for that decision, and a
// clear call site if a future migration adds a real, explicitly-tested
// completion path.
export async function markWebhookEventOutcome(_eventId: string, _outcome: 'processed' | 'failed', _error?: string) {
  return;
}
