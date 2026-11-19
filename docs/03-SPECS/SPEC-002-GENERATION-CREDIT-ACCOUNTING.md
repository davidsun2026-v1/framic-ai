# Generation Credit Accounting Policy

**Status:** Product policy documented; application enforcement NOT VERIFIED  
**Applies to:** V1 text-to-image and text-to-video  
**Inference provider:** Replicate only

## 1. Customer billing rule

Framic charges customer credits only when a generation completes successfully, its output passes validation, the output is copied into Framic-controlled durable storage, and the generated asset is linked to the generation job.

A Replicate prediction marked `succeeded` is not, by itself, sufficient to charge the customer.

## 2. Reservation, settlement, and release

1. Validate the request and resolve its server-owned credit price.
2. Reserve credits before submitting the provider prediction.
3. Persist the reservation transaction ID against the corresponding generation job.
4. Keep the reservation pending while inference and asset delivery are unresolved.
5. After validated durable asset delivery, call `settle_credits(p_transaction_id)` exactly once.
6. On a terminal unsuccessful outcome, call `release_credits(p_transaction_id, p_release_idempotency_key)` exactly once.
7. Never let a client submit the authoritative credit amount or choose the settlement/release decision.

The exact live RPC contracts are in `docs/03-SPECS/SPEC-001-REPLICATE-API-PIPELINE.md`. Reconcile live generation-job columns before implementation.

## 3. State and accounting matrix

| Event | Reservation | Customer final charge | Provider cost |
|---|---|---|---|
| Rejected before reservation | None | 0 | 0 |
| Insufficient balance | None | 0 | 0 |
| Prediction accepted/processing | Pending | Not settled yet | Usage may accrue |
| Provider succeeded; output not persisted | Pending | Not settled yet | Usage incurred |
| Output validated, persisted, and linked | Settled | Reserved amount charged once | Reconcile actual usage |
| Provider failed | Released | 0 | Apply Replicate billing rules |
| Aborted before execution | Released | 0 | Replicate documents no charge |
| Canceled after execution starts | Released | 0 | May incur compute cost |
| Storage delivery permanently failed | Released | 0 | Provider usage may still be incurred |
| Duplicate webhook | No second mutation | No second charge/refund | No new prediction |
| Ambiguous submission timeout | Pending until reconciled | No final charge | Prediction may exist; do not duplicate blindly |

## 4. Separate accounting domains

Customer credits are Framic's commercial unit and must not be confused with Replicate USD usage, Paystack NGN/kobo payment amounts, storage costs, or internal estimates.

Provider-cost records should retain, where available, provider prediction ID, model/version, billing unit, provider usage metrics, observed cost, currency, and reconciliation status. Do not infer provider cost from customer credits.

## 5. Idempotency and recovery

- One client idempotency key maps to one Framic job/reservation.
- One Replicate prediction ID maps to one provider attempt.
- One webhook delivery ID is processed at most once.
- Settlement and release are mutually exclusive terminal financial outcomes.
- Duplicate/out-of-order events must not reverse a settled transaction or release a settled reservation.
- Reconcile an ambiguous provider submission before retrying.
- If storage upload fails, do not settle. Retry within a bounded policy; release if recovery is exhausted.
- Monitor pending reservations. Do not release while a provider prediction may still be running.

## 6. Commercial guardrails

- Payment-processing fees are included in Framic's listed price; Framic absorbs those fees under the current product direction.
- Target gross margin is 60% after direct inference and payment-processing costs, before general operating expenses.
- Subscription prices, monthly credit allowances, per-model credit costs, and final FX assumptions are not approved by this policy.
- Do not enable a model until its exact Replicate version, input schema, billing unit, current price, and cost bounds are verified.
- Recalculate credit costs when provider pricing, FX, payment fees, or model versions change.

## 7. Acceptance tests

See `docs/04-TESTING/GENERATION-BILLING-ACCEPTANCE.md`. Production release is blocked until financial, lifecycle, webhook-security, persistence, and idempotency tests pass.
