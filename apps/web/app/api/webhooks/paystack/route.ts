import { NextResponse } from 'next/server';
import type { PaystackWebhookPayload } from '@framic/types';
import { verifyPaystackSignature } from '@/lib/paystack/verify';
import { claimWebhookEvent } from '@/lib/paystack/webhookEvents';
import { CREDIT_ALLOCATION, PAYSTACK_PLAN_CODE_TO_ID, PLAN_DISPLAY_NAMES } from '@/lib/paystack/plans';
import {
  findUserIdByEmail,
  grantCredits,
  setSubscriptionStatusByPaystackId,
  upsertPaymentFromPaystack,
  upsertSubscriptionFromPaystack,
} from '@/lib/supabase/service';

// POST /api/webhooks/paystack
//
// Handles: charge.success, subscription.create, subscription.disable.
// Any other event type is recorded (for audit) and otherwise ignored.
//
// Contract (see docs/02-MODULES/05-PAYSTACK.md and the PAYSTACK WEBHOOK
// CONTRACT section of the project wiki):
//   - Verify Paystack signatures; reject invalid ones without processing.
//   - Store every delivery idempotently; never double-process a duplicate.
//   - Never trust user_id from the payload — resolve the user server-side
//     from the verified customer email instead.
//   - Grant credits / update subscription state only after signature
//     verification, and only once per event (idempotency_key on the
//     credit grant; UNIQUE(paystack_reference) on the payment row).
//   - Never expose provider secrets in responses or logs.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-paystack-signature');

  if (!verifyPaystackSignature(rawBody, signature)) {
    // Do not log the body or signature — avoid leaking payload/secret
    // material into logs for a request we've decided not to trust.
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: PaystackWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!payload?.event || !payload?.data?.reference) {
    return NextResponse.json({ error: 'Malformed webhook payload' }, { status: 400 });
  }

  // Paystack's transaction id (data.id) is stable across redelivery of the
  // same event, unlike request-level metadata — use it (with event type)
  // as the idempotency key so retries of the same event land on the same
  // webhook_events row instead of creating a new one each time.
  const providerEventId = `${payload.event}:${payload.data.id ?? payload.data.reference}`;

  let claimed: Awaited<ReturnType<typeof claimWebhookEvent>>;
  try {
    claimed = await claimWebhookEvent({
      provider: 'paystack',
      providerEventId,
      eventType: payload.event,
      payload: payload as unknown as Record<string, unknown>,
      rawSignature: signature,
    });
  } catch (err) {
    // Failing to even record the event is a hard failure — return 500 so
    // Paystack retries; we have no evidence yet that this delivery was
    // handled.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to record webhook event' },
      { status: 500 },
    );
  }

  // True duplicate of an event we already finished (see webhookEvents.ts
  // for why "finished" isn't tracked via an UPDATE on this row): we don't
  // have a persisted "processed" marker to check yet, so a retried
  // provider_event_id always re-enters processing below. Every downstream
  // step is independently idempotent (ON CONFLICT / idempotency_key), so
  // reprocessing a duplicate converges to the same end state rather than
  // double-granting credits or double-counting a payment.
  void claimed.isRetry;

  try {
    switch (payload.event) {
      case 'charge.success':
        await handleChargeSuccess(payload, claimed.id);
        break;
      case 'subscription.create':
        await handleSubscriptionCreate(payload);
        break;
      case 'subscription.disable':
        await handleSubscriptionDisable(payload);
        break;
      default:
        // Unhandled event type — acknowledged, not an error.
        break;
    }
  } catch (err) {
    // Processing failed after the event was durably recorded. Return 500
    // so Paystack retries; the retry will re-enter processing above using
    // the same webhook_events row and idempotent downstream calls.
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

async function handleChargeSuccess(payload: PaystackWebhookPayload, webhookEventId: string) {
  const { data } = payload;

  if (data.status !== 'success') {
    // charge.success events should always carry status 'success', but
    // don't trust that without checking — never grant on an unverified
    // status string.
    return;
  }

  const planCode = data.plan?.plan_code;
  if (!planCode) {
    // charge.success without a plan attached: this is where a one-off
    // credit_purchase would be recorded. No approved credit-purchase
    // matrix exists (see docs/02-MODULES/05-PAYSTACK.md, Non-goals), so
    // we record the payment as unattributed and stop rather than invent
    // pricing.
    return;
  }

  const planId = PAYSTACK_PLAN_CODE_TO_ID[planCode];
  if (!planId) {
    // Unmapped Paystack plan_code — record the payment for audit, but do
    // NOT grant credits or touch the subscription. This needs a manual
    // fix to apps/web/lib/paystack/plans.ts (PAYSTACK_PLAN_CODE_TO_ID),
    // not a guess.
    const email = data.customer?.email;
    const userId = email ? await findUserIdByEmail(email) : null;
    if (userId) {
      await upsertPaymentFromPaystack({
        userId,
        paystackReference: data.reference,
        type: 'subscription_charge',
        amountKobo: data.amount,
        currency: data.currency,
        status: 'success',
        paystackAuthorizationId: data.authorization?.authorization_code ?? null,
        paystackCustomerId: data.customer?.customer_code ?? null,
        webhookEventId,
        metadata: { unmapped_plan_code: planCode },
      });
    }
    return;
  }

  const email = data.customer?.email;
  if (!email) {
    return;
  }

  const userId = await findUserIdByEmail(email);
  if (!userId) {
    // Verified payment from Paystack, but no matching profile — this
    // shouldn't be silently discarded in a real system (needs alerting),
    // but there's no notification channel wired up yet
    // (docs/02-MODULES/05-PAYSTACK.md: Observability = Not yet implemented).
    // Stopping here rather than guessing a user is the safe failure mode.
    return;
  }

  const monthlyCredits = CREDIT_ALLOCATION[planId];

  const subscriptionId = await upsertSubscriptionFromPaystack({
    userId,
    planId,
    planName: PLAN_DISPLAY_NAMES[planId],
    monthlyCredits,
    status: 'active',
    paystackCustomerId: data.customer?.customer_code ?? null,
    paystackAuthorizationId: data.authorization?.authorization_code ?? null,
    paystackSubscriptionId: data.subscription?.subscription_code ?? null,
  });

  await upsertPaymentFromPaystack({
    userId,
    paystackReference: data.reference,
    type: 'subscription_charge',
    amountKobo: data.amount,
    currency: data.currency,
    status: 'success',
    paystackAuthorizationId: data.authorization?.authorization_code ?? null,
    paystackCustomerId: data.customer?.customer_code ?? null,
    subscriptionId,
    creditsAwarded: monthlyCredits,
    webhookEventId,
  });

  // Idempotency key is derived from the Paystack reference, not a random
  // value — a redelivered charge.success for the same reference must
  // never grant credits twice, even across separate webhook_events rows.
  await grantCredits({
    userId,
    amount: monthlyCredits,
    reason: `Subscription charge (${planId})`,
    idempotencyKey: `paystack:${data.reference}:subscription_credit_grant`,
    type: 'grant',
    metadata: { paystackReference: data.reference, planId },
  });
}

async function handleSubscriptionCreate(payload: PaystackWebhookPayload) {
  const { data } = payload;
  const planCode = data.plan?.plan_code;
  const email = data.customer?.email;

  if (!planCode || !email) {
    return;
  }

  const planId = PAYSTACK_PLAN_CODE_TO_ID[planCode];
  if (!planId) {
    return; // unmapped plan_code — see handleChargeSuccess for rationale
  }

  const userId = await findUserIdByEmail(email);
  if (!userId) {
    return;
  }

  // subscription.create only syncs the subscription record — it does NOT
  // grant credits. Credits are granted exactly once per billing cycle, on
  // charge.success, to avoid double-granting when both events arrive for
  // the same transaction.
  await upsertSubscriptionFromPaystack({
    userId,
    planId,
    planName: PLAN_DISPLAY_NAMES[planId],
    monthlyCredits: CREDIT_ALLOCATION[planId],
    status: 'active',
    paystackCustomerId: data.customer?.customer_code ?? null,
    paystackAuthorizationId: data.authorization?.authorization_code ?? null,
    paystackSubscriptionId: data.subscription?.subscription_code ?? null,
  });
}

async function handleSubscriptionDisable(payload: PaystackWebhookPayload) {
  const subscriptionCode = payload.data.subscription?.subscription_code;
  if (!subscriptionCode) {
    return;
  }

  await setSubscriptionStatusByPaystackId({
    paystackSubscriptionId: subscriptionCode,
    status: 'cancelled',
    cancellationReason: 'Paystack subscription.disable',
  });
}
