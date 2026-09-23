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

// webhook_events blocks UPDATE for everyone except... actually it blocks
// UPDATE outright via "Prevent updates" (USING (false)) even for service
// role, per the live migration. So completion state is tracked by issuing
// a fresh row only when reprocessing (isRetry + not yet 'processed') is
// needed; for the common case (new event, processed successfully in one
// pass) we simply leave status at 'verified' and rely on payments/
// subscriptions/credit_transactions as the source of truth for what was
// fulfilled. This function is a no-op placeholder documenting that
// decision so a future migration adding a real completion path (e.g. a
// SECURITY DEFINER function that bypasses the UPDATE-block deliberately)
// has a clear call site to wire up.
export async function markWebhookEventOutcome(_eventId: string, _outcome: 'processed' | 'failed', _error?: string) {
  // Intentionally not implemented — see comment above. Do not add a raw
  // UPDATE against webhook_events from application code; the table's own
  // RLS policy blocks it by design (immutable event log), and bypassing
  // that from here would fight the schema instead of extending it.
  return;
}
