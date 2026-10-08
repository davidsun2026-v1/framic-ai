// paystack-webhook
// 1. Verify the Paystack HMAC-SHA512 signature.
// 2. Store the event idempotently in webhook_events.
// 3. Fulfil verified payments through the existing SECURITY DEFINER RPCs.
//
// Plan config mirrors docs/02-MODULES/BILLING/SUBSCRIPTION_MATRIX.md, which governs.
// Change both together.

const PAYSTACK_SECRET_KEY = Deno.env.get("PAYSTACK_SECRET_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
if (!PAYSTACK_SECRET_KEY) throw new Error("PAYSTACK_SECRET_KEY is required");
if (!SUPABASE_URL || !SERVICE_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
}

const CURRENCY = "NGN";
const PLANS: Record<string, { name: string; credits: number; priceKobo: number }> = {
  starter: { name: "Starter", credits: 100, priceKobo: 500000 },
  pro: { name: "Pro", credits: 500, priceKobo: 1500000 },
  business: { name: "Business", credits: 2000, priceKobo: 5000000 },
};
const TIMEOUT_MS = 8000;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Rec = Record<string, unknown>;

// Event is valid but needs no action. Marked `ignored`, answered 200.
class IgnoredEvent extends Error {}
// Needs human review; retrying will not help. Marked `failed`, answered 200.
class PermanentError extends Error {}

function obj(v: unknown): Rec {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Rec) : {};
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}
const enc = encodeURIComponent;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return toHex(new Uint8Array(digest));
}

async function providerEventId(eventName: string, payload: Rec, rawBody: string): Promise<string> {
  const data = obj(payload.data);
  if (typeof data.id === "number" || typeof data.id === "string") {
    return `${eventName}:${String(data.id)}`;
  }
  const reference = str(data.reference);
  if (reference) return `${eventName}:${reference}`;
  const code = str(data.subscription_code);
  if (code) return `${eventName}:${code}`;
  return `${eventName}:sha256:${await sha256Hex(rawBody)}`;
}

async function rest(
  path: string,
  init: { method?: string; body?: string; prefer?: string } = {},
): Promise<unknown> {
  const headers: Record<string, string> = {
    apikey: SERVICE_KEY!,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
  if (init.prefer) headers.Prefer = init.prefer;
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method: init.method ?? "GET",
    headers,
    body: init.body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`REST ${path.split("?")[0]} failed (${res.status}): ${text.slice(0, 300)}`);
  }
  return text ? JSON.parse(text) : null;
}

const rpc = (name: string, args: Rec) =>
  rest(`rpc/${name}`, { method: "POST", body: JSON.stringify(args) });

async function persistEvent(
  eventName: string,
  payload: Rec,
  rawSignature: string,
  eventKey: string,
): Promise<{ id: string; status: string }> {
  const rows = await rest("webhook_events", {
    method: "POST",
    prefer: "return=representation,resolution=ignore-duplicates",
    body: JSON.stringify({
      provider: "paystack",
      event_type: eventName,
      provider_event_id: eventKey,
      payload,
      raw_signature: rawSignature,
      status: "verified",
      verified_at: new Date().toISOString(),
    }),
  });
  if (Array.isArray(rows) && rows[0]?.id) {
    return { id: String(rows[0].id), status: String(rows[0].status) };
  }
  // Duplicate delivery: ignore-duplicates returns an empty list, so read the stored row.
  const existing = await rest(
    `webhook_events?provider_event_id=eq.${enc(eventKey)}&select=id,status&limit=1`,
  );
  if (Array.isArray(existing) && existing[0]?.id) {
    return { id: String(existing[0].id), status: String(existing[0].status) };
  }
  throw new Error("Webhook event was neither inserted nor found");
}

async function markEvent(
  id: string,
  status: "processed" | "ignored" | "failed",
  opts: { error?: string; userId?: string | null } = {},
) {
  const done = status !== "failed";
  await rest(`webhook_events?id=eq.${enc(id)}`, {
    method: "PATCH",
    body: JSON.stringify({
      status,
      processed_at: done ? new Date().toISOString() : null,
      processing_error: opts.error ? opts.error.slice(0, 500) : null,
      ...(opts.userId ? { user_id: opts.userId } : {}),
    }),
  });
}

async function verifyTransaction(reference: string): Promise<Rec> {
  const res = await fetch(`https://api.paystack.co/transaction/verify/${enc(reference)}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error(`Paystack verify failed (${res.status})`);
  const json = obj(await res.json());
  const data = obj(json.data);
  if (json.status !== true || data.reference !== reference) {
    throw new Error("Paystack verify returned an unexpected response");
  }
  return data;
}

type Outcome = { userId?: string | null };

async function handleChargeSuccess(eventId: string, data: Rec): Promise<Outcome> {
  const reference = str(data.reference);
  if (!reference) throw new IgnoredEvent("charge.success without a reference");

  // Never trust the webhook body for money: re-verify with Paystack.
  const tx = await verifyTransaction(reference);
  if (tx.status !== "success") {
    throw new Error(`Verified transaction status is ${String(tx.status)}`);
  }

  const amount = Number(tx.amount);
  const currency = str(tx.currency);
  const meta = obj(tx.metadata);
  const customerCode = str(obj(tx.customer).customer_code);
  const authCode = str(obj(tx.authorization).authorization_code);

  if (meta.type && meta.type !== "subscription_charge") {
    throw new IgnoredEvent(`Unsupported payment type: ${String(meta.type)}`);
  }

  // User and plan come from metadata our server set at checkout. Renewals fall back
  // to the subscription already linked to this Paystack customer.
  let userId = str(meta.user_id);
  let planId = str(meta.plan_id);
  if (!userId || !UUID_RE.test(userId) || !planId) {
    userId = null;
    planId = null;
    if (!customerCode) throw new IgnoredEvent("No user/plan metadata and no customer code");
    const subs = await rest(
      `subscriptions?paystack_customer_id=eq.${enc(customerCode)}&select=user_id,plan_id&limit=1`,
    );
    if (!Array.isArray(subs) || !subs[0]) {
      throw new IgnoredEvent("No user/plan metadata and no subscription for customer");
    }
    userId = String(subs[0].user_id);
    planId = String(subs[0].plan_id);
  }

  if (!Object.hasOwn(PLANS, planId)) throw new IgnoredEvent(`Unknown plan: ${planId}`);
  const plan = PLANS[planId];

  if (currency !== CURRENCY || amount !== plan.priceKobo) {
    throw new PermanentError(
      `Amount/currency mismatch for plan ${planId}: got ${amount} ${currency}, expected ${plan.priceKobo} ${CURRENCY}`,
    );
  }

  const profile = await rest(`profiles?id=eq.${enc(userId)}&select=id&limit=1`);
  if (!Array.isArray(profile) || !profile[0]) {
    throw new PermanentError("Payment verified but no matching user profile");
  }

  const paidAt = tx.paid_at ? new Date(String(tx.paid_at)) : new Date();
  const base = Number.isNaN(paidAt.getTime()) ? new Date() : paidAt;
  const renewal = new Date(base);
  renewal.setUTCMonth(renewal.getUTCMonth() + 1);

  const subscriptionId = await rpc("upsert_subscription_from_paystack", {
    p_user_id: userId,
    p_plan_id: planId,
    p_plan_name: plan.name,
    p_monthly_credits: plan.credits,
    p_status: "active",
    p_paystack_customer_id: customerCode,
    p_paystack_authorization_id: authCode,
    p_paystack_subscription_id: null,
    p_renewal_date: renewal.toISOString(),
  });

  await rpc("upsert_payment_from_paystack", {
    p_user_id: userId,
    p_paystack_reference: reference,
    p_type: "subscription_charge",
    p_amount_kobo: amount,
    p_currency: currency,
    p_status: "success",
    p_paystack_authorization_id: authCode,
    p_paystack_customer_id: customerCode,
    p_subscription_id: subscriptionId,
    p_credits_awarded: plan.credits,
    p_webhook_event_id: eventId,
    p_metadata: { plan_id: planId },
  });

  // Idempotent on the key, so retries and renewals never double-grant.
  await rpc("grant_credits", {
    p_user_id: userId,
    p_amount: plan.credits,
    p_reason: `${plan.name} plan credits`,
    p_idempotency_key: `paystack:${reference}`,
    p_type: "purchase",
    p_metadata: { reference, plan_id: planId, webhook_event_id: eventId },
    p_created_by: "payment_webhook",
  });

  return { userId };
}

async function handleSubscriptionCreate(data: Rec): Promise<Outcome> {
  const code = str(data.subscription_code);
  const customerCode = str(obj(data.customer).customer_code);
  if (!code || !customerCode) throw new IgnoredEvent("subscription.create missing codes");

  const updated = await rest(
    `subscriptions?paystack_customer_id=eq.${enc(customerCode)}&paystack_subscription_id=is.null`,
    {
      method: "PATCH",
      prefer: "return=representation",
      body: JSON.stringify({ paystack_subscription_id: code, updated_at: new Date().toISOString() }),
    },
  );
  if (Array.isArray(updated) && updated[0]) return { userId: String(updated[0].user_id) };

  const linked = await rest(
    `subscriptions?paystack_subscription_id=eq.${enc(code)}&select=user_id&limit=1`,
  );
  if (Array.isArray(linked) && linked[0]) return { userId: String(linked[0].user_id) };

  // charge.success may not have been processed yet; fail so Paystack retries.
  throw new Error("No subscription row for this customer yet");
}

async function setStatus(code: string | null, status: string, reason: string | null): Promise<Outcome> {
  if (!code) throw new IgnoredEvent("Event has no subscription code");
  const id = await rpc("set_subscription_status_by_paystack_id", {
    p_paystack_subscription_id: code,
    p_status: status,
    p_cancellation_reason: reason,
  });
  if (!id) throw new Error("No linked subscription for this code yet");
  return {};
}

async function dispatch(eventName: string, eventId: string, data: Rec): Promise<Outcome> {
  switch (eventName) {
    case "charge.success":
      return await handleChargeSuccess(eventId, data);
    case "subscription.create":
      return await handleSubscriptionCreate(data);
    case "subscription.disable":
      return await setStatus(str(data.subscription_code), "cancelled", "paystack_subscription_disabled");
    case "invoice.payment_failed":
      return await setStatus(str(obj(data.subscription).subscription_code), "past_due", null);
    default:
      throw new IgnoredEvent(`Unhandled event type: ${eventName}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "POST" } });
  }

  const receivedSignature = req.headers.get("x-paystack-signature");
  if (!receivedSignature) return new Response("Missing Paystack signature", { status: 401 });

  const rawBody = await req.text();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(PAYSTACK_SECRET_KEY),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  const expected = toHex(new Uint8Array(digest));
  if (!constantTimeEqual(receivedSignature.toLowerCase(), expected)) {
    return new Response("Invalid Paystack signature", { status: 401 });
  }

  let payload: Rec;
  try {
    payload = obj(JSON.parse(rawBody));
  } catch {
    return new Response("Invalid JSON payload", { status: 400 });
  }

  const eventName = typeof payload.event === "string" ? payload.event : "unknown";

  let row: { id: string; status: string };
  try {
    const eventKey = await providerEventId(eventName, payload, rawBody);
    row = await persistEvent(eventName, payload, receivedSignature, eventKey);
  } catch (error) {
    console.error("Could not persist webhook event", {
      event: eventName,
      error: error instanceof Error ? error.message : String(error),
    });
    return Response.json({ received: true, event: eventName, persisted: false }, { status: 500 });
  }

  // Only skip events that are finished. `verified`/`failed` events are retried.
  if (row.status === "processed" || row.status === "ignored") {
    return Response.json({ received: true, event: eventName, duplicate: true });
  }

  try {
    const outcome = await dispatch(eventName, row.id, obj(payload.data));
    await markEvent(row.id, "processed", { userId: outcome.userId });
    console.info("Processed Paystack event", { event: eventName, eventRowId: row.id });
    return Response.json({ received: true, event: eventName, processed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      if (error instanceof IgnoredEvent) {
        await markEvent(row.id, "ignored", { error: message });
        return Response.json({ received: true, event: eventName, ignored: true });
      }
      await markEvent(row.id, "failed", { error: message });
    } catch (markError) {
      console.error("Could not update webhook event status", {
        eventRowId: row.id,
        error: markError instanceof Error ? markError.message : String(markError),
      });
    }
    console.error("Paystack event processing failed", { event: eventName, eventRowId: row.id, error: message });
    if (error instanceof PermanentError) {
      // Retrying cannot fix this; it is recorded as `failed` for manual review.
      return Response.json({ received: true, event: eventName, needs_review: true });
    }
    return Response.json({ received: true, event: eventName, processed: false }, { status: 500 });
  }
});
