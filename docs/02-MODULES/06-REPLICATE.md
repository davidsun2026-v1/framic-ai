# Replicate Integration

## Purpose
Provide the sole V1 inference adapter between Framic AI's normalized generation contract and Replicate.

## V1 scope
- Text-to-image and text-to-video only.
- Server-side prediction submission and status reconciliation.
- Verified webhook ingestion and event deduplication.
- Provider error, timeout, cancellation, and usage metadata handling.
- Durable output retrieval and handoff to Framic asset persistence.

No other inference provider is approved for the V1 execution path. OpenRouter prompt expansion, direct OpenAI inference, direct Kling/Luma APIs, and self-hosted inference are out of scope.

## Security
- Replicate credentials and webhook signing keys are server-only.
- Treat provider responses and output URLs as untrusted.
- Verify webhook signatures against the raw request body using Replicate's documented headers and HMAC procedure.
- Enforce timestamp tolerance, constant-time signature comparison, prediction/job correlation, and event idempotency.
- Do not expose credentials or log prompts, media, or full provider payloads.

## Model governance
A model is not enabled merely because its name appears in documentation. Each approved model needs a verified Replicate model path/version, current input schema, output contract, billing unit, current price evidence, and approved Framic credit price. See `docs/03-SPECS/SPEC-001-REPLICATE-API-PIPELINE.md`.

No final production model allowlist or credit schedule is approved by this module.

## Billing boundary
The adapter reports provider lifecycle and usage evidence. It does not calculate subscription entitlements or mutate customer balances. Customer reservation/settlement belongs to generation accounting and uses the verified Supabase RPC contract.

## Acceptance
A supported approved model can be invoked through the normalized internal contract; its lifecycle is reconciled; verified output is persisted durably; provider usage is reconciled independently from customer credits.

## Current status
**NOT VERIFIED:** executable Replicate submission/webhook routes, configured live credentials, approved model registry, and end-to-end runtime evidence have not been established.
