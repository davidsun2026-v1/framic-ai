# Framic AI — Replicate-Only Generation Pipeline Specification

**Status:** Architecture direction documented; implementation/runtime NOT VERIFIED  
**V1 modalities:** Text-to-image and text-to-video  
**Inference provider:** Replicate only

## 1. Scope and provider boundary

Framic AI uses Replicate as its sole V1 inference provider. Supabase/PostgreSQL owns application state, credit accounting, generation metadata, webhook event records, and asset metadata. Framic-controlled storage owns durable generated files.

OpenRouter, direct OpenAI inference, direct Kling/Luma APIs, self-hosted GPU workers, and other inference providers are not part of the V1 execution path. Prompt editing may be a local deterministic application feature; it must not silently call another paid inference provider.

V1 supports text-to-image and text-to-video only. Image-to-image, image-to-video, audio, upscaling, and other modalities require separate approval and model verification.

## 2. Non-negotiable invariants

1. Provider credentials and webhook signing keys are server-side only.
2. The client cannot choose arbitrary Replicate model paths/versions, hardware, provider prices, or Framic credit costs.
3. Each request resolves against a server-owned allowlist and validated model input schema.
4. Reserve credits before provider submission and link the reservation to one Framic job and idempotency key.
5. A provider prediction marked succeeded is not a successful Framic generation until output is validated and copied to durable Framic storage.
6. Settle customer credits exactly once only after durable asset delivery and job association.
7. Release the reservation on terminal unsuccessful outcomes or unrecoverable delivery failure.
8. Provider costs and customer credits are separate accounting domains. A canceled run may cost Framic even when the customer reservation is released.
9. Verify webhook authenticity, replay protection, event deduplication, job ownership, and state transitions.
10. Documentation is not implementation evidence.

## 3. Required request lifecycle

This is the target architecture, not a claim that these routes currently exist.

1. Authenticate the user with Supabase Auth.
2. Validate modality, prompt, input references, model ID, and model-specific parameters.
3. Resolve the model and authoritative credit price from a server-side registry.
4. Enforce idempotency, request limits, and user ownership.
5. Create the generation job and reserve credits using the verified live RPC contract.
6. Submit a prediction to Replicate with the verified model/version and validated input.
7. Persist the Replicate prediction ID and safe provider metadata.
8. Process verified webhooks; use polling/reconciliation for missed or delayed events.
9. On provider success, validate output type, MIME type, size, dimensions/duration, and output count.
10. Copy the output to Framic-controlled storage before the provider's temporary output retention expires.
11. Create and verify the generated asset record and job relationship.
12. Settle the reservation exactly once; mark the job succeeded only after durable delivery and settlement.
13. On terminal failure or unrecoverable delivery failure, release exactly once and record provider outcome/cost.

Do not keep a synchronous HTTP request open during inference. Return an accepted job identifier and expose authenticated job status once those endpoints are implemented.

## 4. Verified live Supabase credit contract

The connected Framic project inspected read-only on 2026-11-25 is project ref `gkvvecskbkwpcsuatklm`, region `eu-west-1`.

| Function | Exact live signature | Observed semantics |
|---|---|---|
| `reserve_credits` | `(p_user_id uuid, p_amount bigint, p_reason text, p_idempotency_key text, p_correlation_id uuid, p_metadata jsonb)` | Locks wallet, checks balance, subtracts reserved amount, inserts pending negative deduction, returns transaction ID/balance/duplicate |
| `settle_credits` | `(p_transaction_id uuid)` | Marks pending deduction completed; repeated settlement of completed transaction returns false |
| `release_credits` | `(p_transaction_id uuid, p_release_idempotency_key text)` | Restores pending reservation and records refund with idempotency checks |
| `grant_credits` | Eight-argument live function | Payment/admin credit grant primitive; not a generation settlement substitute |

The three generation-relevant functions were observed as SECURITY DEFINER, with an empty search_path and EXECUTE granted to service_role and postgres owner. Application code must use exact names/types and call them only from trusted server-side code.

Reservation immediately reduces the wallet's available balance and creates a pending deduction. Settlement does not deduct a second time; it finalizes that pending deduction. Release restores the reserved amount and creates a refund record.

The live generation-job and asset table columns must be checked before implementation. Do not infer production columns from old migrations or this document. These RPCs exist, but no executable generation path using them was verified in this audit.

## 5. Replicate integration and webhook security

- Use Replicate's documented predictions API and only model/version entries in the approved model registry.
- Validate against the selected model's current input schema.
- Configure webhook events needed for lifecycle tracking and retain a provider-status reconciliation path.
- Verify the raw request body using Replicate's `webhook-id`, `webhook-timestamp`, and `webhook-signature` headers.
- Replicate documents the signed content as `{webhook-id}.{webhook-timestamp}.{raw-body}`. Retrieve the signing key from `GET https://api.replicate.com/v1/webhooks/default/secret`; decode the Base64 key portion after `whsec_`; compute HMAC-SHA256; compare accepted signatures in constant time; enforce timestamp tolerance.
- Replicate reuses the webhook delivery ID on retries. Persist a unique delivery identity and process events idempotently.
- Verify signature before trusting payload fields; then correlate prediction ID to the expected Framic job.
- Replicate documents that API-created prediction inputs/outputs are automatically deleted after one hour. Persist required outputs promptly.
- Do not log prompts, uploaded media, generated outputs, secrets, or full webhook payloads without an approved privacy-safe telemetry policy.

## 6. Provider billing versus customer billing

Replicate bills Framic according to the billing mechanics of each model or deployment and the usage actually incurred. Framic credits are a separate customer-facing commercial policy; a customer-credit release does not reverse or establish the absence of a provider charge.

For public models, Replicate's documented general rule is that active processing time is billable while setup and idle time are free; a failed run is generally not charged under that rule. This general statement must not be interpreted as a guarantee that every failed *chained* run has zero provider cost. A model may invoke one or more downstream models, and those downstream calls can incur their own usage charges even when the parent prediction or overall workflow ultimately fails. Canceled official-model runs may also be charged for time already run. Private models and deployments can follow different instance-time billing mechanics.

For every root prediction and any downstream prediction that can be identified, Framic's provider-cost reconciliation should retain the model/version, prediction or attempt identity, terminal status, available usage metrics, and observed billed amount/currency. Reconcile the actual provider usage/invoice evidence rather than assuming that the root prediction's terminal status determines the total cost of the chain. Where provider usage details are unavailable, mark the cost as unresolved rather than recording zero. These provider expenses remain separate from customer credit transactions.

Framic's success-only customer policy remains:
- Successful, validated, durably stored output: settle the customer reservation once.
- Failed/canceled/aborted prediction or unsuccessful delivery: release the customer reservation once, subject to safe terminal-state reconciliation.
- Provider costs incurred by unsuccessful or unrecovered generations are recorded as Framic operating expense unless separately recovered under an approved commercial policy.

**Accounting distinction:** releasing customer credits is not evidence that Replicate charged Framic zero. A failed parent prediction does not, by itself, establish that its downstream model calls were free.

## 7. Model registry and pricing gate

No production model or credit price is approved by this specification.

Before enabling a model, record:
- internal Framic model ID and modality;
- exact Replicate owner/model path and immutable version identifier where required;
- public/private/deployment classification;
- current input schema and supported ranges;
- output contract, MIME type, dimensions/duration, and output count;
- provider billing unit, current price, currency, source URL, and verification date;
- expected cost bounds, cancellation semantics, and downstream model dependencies;
- Framic credit price, FX assumption, payment fee treatment, target gross margin, and review date;
- acceptance-test evidence.

Do not reuse the old illustrative model list or token costs (5, 8, 15, 50, 80, 100, 120) as production configuration. They are not an approved model allowlist or price schedule.

## 8. Failure, retry, and reconciliation rules

| Condition | Customer credit action | Required behavior |
|---|---|---|
| Invalid request / insufficient balance | No reservation | Reject before provider call |
| Provider submission definitively rejected | Release | Mark failed; record safe provider response |
| Submission outcome ambiguous | Keep pending until reconciled | Do not blindly create a second prediction |
| Provider processing | Keep pending | Track status and enforce deadline |
| Provider succeeded, output invalid | Release | Never mark success |
| Storage copy failed | Keep pending during bounded recovery; release if unrecoverable | Do not settle |
| Durable output stored and linked | Settle once | Then mark succeeded |
| Failed/canceled/aborted prediction | Release once | Reconcile provider billing separately |
| Duplicate webhook | No second mutation | Return success after idempotent handling |
| Missing webhook | No premature settlement/release | Poll provider and reconcile |

Retries must be bounded and safe. A retry that can create another paid prediction requires an explicit attempt record and deliberate accounting. Never retry an ambiguous submission blindly.

## 9. Security and operational controls

- Keep `REPLICATE_API_TOKEN` and the Replicate webhook signing key in server-side secret storage.
- Never put secrets in `NEXT_PUBLIC_*`, client bundles, logs, URLs, or error responses.
- Apply request-size limits, authenticated ownership checks, per-user rate limits, and provider-spend limits.
- Enforce unique client idempotency keys and unique webhook delivery IDs.
- Use least-privilege service-role access; browser roles must not execute financial RPCs.
- Alert on stuck reservations, spend anomalies, failed webhook processing, orphaned predictions, storage failures, and job/ledger mismatches.
- Define retention and deletion rules for prompts, inputs, outputs, and provider metadata.

## 10. Production exit criteria

- [ ] Executable generation route submits real Replicate predictions.
- [ ] Webhook route verifies signatures against raw bytes.
- [ ] Prediction IDs are durably correlated to Framic jobs.
- [ ] Reservation precedes provider submission using the exact live RPC contract.
- [ ] Output is validated and persisted before settlement.
- [ ] Failure/cancel/timeout/storage-failure paths release safely.
- [ ] Duplicate events and ambiguous submissions are idempotent.
- [ ] Reconciliation handles missed webhooks and stuck jobs.
- [ ] Approved model registry contains current schemas and prices.
- [ ] Automated tests cover concurrency, duplicates, transitions, storage and provider failures.
- [ ] Staging proves one real image and one real video generation end-to-end.
- [ ] Provider invoices/usage reconcile to internal provider-cost records.
- [ ] Security review verifies secrets, RLS, RPC grants, rate limits, and log redaction.

**Release decision: NO-GO.** This specification aligns design; it does not certify working generation implementation.
