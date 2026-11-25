# AI Generation

## Purpose
Orchestrate authenticated, credit-authorized generation from request validation through provider execution to durable asset delivery.

## V1 scope
- Text-to-image.
- Text-to-video.
- Replicate as the sole inference provider.

Image-to-image, image-to-video, audio, and other modalities require separate product and model approval.

## Required logical lifecycle
`requested → reserved → submitted → processing → delivering → succeeded`

Terminal unsuccessful outcomes include `failed`, `canceled`, and `aborted`. Persist timestamps, correlation identifiers, provider prediction IDs, and the linked credit reservation.

These are logical states, not an assertion that the current database accepts these exact status strings. Reconcile with live constraints before implementation.

## Financial rules
- Resolve credit price server-side from an approved model/pricing registry.
- Reserve credits before submitting a provider prediction.
- Settle only after output validation, durable Framic storage, and asset/job association.
- Release on terminal unsuccessful outcomes or unrecoverable delivery failure.
- Use live `reserve_credits`, `settle_credits`, and `release_credits` signatures in the pipeline specification.
- Keep provider usage costs separate from customer credit transactions.
- Enforce idempotency for client requests, provider attempts, webhook events, settlement, and release.

## Reliability rules
- Never blindly retry an ambiguous provider submission.
- Reconcile missed webhooks using authoritative provider prediction status.
- Never mark a job succeeded merely because the provider returned success.
- Never settle credits before durable asset delivery.
- Duplicate/out-of-order events must not cause a second financial mutation or state regression.

## Acceptance
Users can submit approved generation requests and observe truthful status/results without credit bypass, duplicate billing, lost outputs, or untracked provider execution.

See `docs/03-SPECS/SPEC-001-REPLICATE-API-PIPELINE.md` and `docs/03-SPECS/SPEC-002-GENERATION-CREDIT-ACCOUNTING.md`.

## Current status
**NOT VERIFIED:** executable generation orchestration, Replicate integration, durable output delivery, and end-to-end settlement are not established by the current audit.
