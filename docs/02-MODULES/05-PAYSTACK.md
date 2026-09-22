# Paystack Integration

## Status
**Planned.** Database schema exists and is verified live. No application code exists — no checkout initiation, no webhook receiver, no verification logic. This module has not started implementation.

## Purpose
Handle real payment initiation and verification for subscriptions/credit purchases.

## Scope
Customer/payment initialization, callback/webhook handling, signature/verification checks, idempotency, payment records, failure states, and reconciliation.

## Data model
Verified against `supabase/migrations/20260910000000_init_schema.sql` and the connected Supabase project (`gkvvecskbkwpcsuatklm`, live, 0 rows in each table):

- **`public.payments`** — `paystack_reference` (unique), `paystack_authorization_id`, `paystack_customer_id`, `type` (`subscription_charge` | `credit_purchase`), `amount_kobo`, `currency` (default `NGN`), `status` (`pending` | `success` | `failed` | `abandoned`), `subscription_id` (FK → `subscriptions`), `credits_awarded`, `verified_at`, `verification_attempts`, `webhook_event_id` (unique).
- **`public.subscriptions`** — `plan_id` (`starter` | `pro` | `business`), `monthly_credits`, `status` (`inactive` | `active` | `past_due` | `cancelled` | `suspended`), `paystack_customer_id`, `paystack_authorization_id`, `paystack_subscription_id`, `renewal_date`, `last_verified_at`.
- **`public.webhook_events`** — immutable log (`UPDATE`/`DELETE` blocked by RLS policy in the migration file), `provider` constrained to include `'paystack'`, `provider_event_id` unique (duplicate-event rejection), `payload`, `raw_signature`, `status` (`received` | `verified` | `processed` | `failed` | `ignored`).

Matching TypeScript contracts are defined in `packages/types/src/index.ts`: `Payment`, `Subscription`, `SubscriptionPlan`, `WebhookEvent`, and `PaystackWebhookPayload` (full Paystack webhook shape: `event`, `data.reference`, `data.authorization`, `data.customer`, `data.subscription`, `data.plan`).

**Known drift:** live RLS policies on `webhook_events` currently number zero, though the migration file defines three (`Service role access only`, `Prevent updates`, `Prevent deletes`). Net effect is unchanged today (RLS default-denies with no policy; service role bypasses RLS regardless), but this should be reconciled before webhook write logic is built against it — see `docs/00-FOUNDATION/07-SUPABASE-CONTRACT-AUDIT.md`.

## Inputs / Outputs
- **Input (checkout initiation):** authenticated user request specifying `type` (`subscription_charge` | `credit_purchase`) and, for subscriptions, a `plan_id`. Output: a Paystack authorization/checkout URL, and a `pending` row in `payments`.
- **Input (webhook):** POST from Paystack with `x-paystack-signature` header and a `PaystackWebhookPayload` body. Output: a row in `webhook_events`, and — only after signature verification — an update to `payments`/`subscriptions` and a credit grant via the credits ledger (`credit_transactions`).

## Ownership
Not yet built, so ownership is not yet assigned in code. Per project convention (server-only secrets, service-role writes), checkout initiation and webhook handling belong server-side — either a Next.js Route Handler under `apps/web/app/api/` or a Supabase Edge Function, not yet decided in the repository.

## Rules
Never mark payment successful from the client alone. Never grant subscription or credits before verified provider evidence. Persist provider references and correlation IDs.

## Failure behavior
Not yet implemented. Required behavior per `docs/04-TESTING/02-CRITICAL_FLOWS.md`: a failed or unverifiable webhook must not grant entitlement; a duplicate `provider_event_id` must be rejected via the existing unique constraint rather than double-processed; failed verification must leave `payments.status` at `pending`/`failed`, never `success`.

## Security
Secrets server-side only; validate webhook authenticity; protect against replay and duplicate events.

## Observability
Not yet implemented. No logging/alerting exists for payment failures, verification retries, or webhook signature failures — `webhook_events.processing_error` is the only schema-level hook currently in place for this.

## Data dependencies
Depends on `EPIC-004 Credits` (`credit_transactions`, `credit_wallets`) for fulfillment — verify credit-grant plumbing is real before wiring Paystack success events to it, since `get_user_balance` was itself found broken (see `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md`).

## Acceptance
Successful and failed payment paths are verifiable, idempotent, auditable, and mapped to the correct user/account.

## Non-goals
Credit ledger rules and plan entitlement rules.
