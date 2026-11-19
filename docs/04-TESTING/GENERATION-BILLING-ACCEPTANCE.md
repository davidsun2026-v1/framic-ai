# Generation Billing Acceptance Tests

**Status:** Test requirements only; no passing runtime evidence claimed.  
**Scope:** V1 Replicate-only text-to-image and text-to-video.

## Preconditions

- Use an isolated staging Supabase project and staging Replicate credentials.
- Use an approved, currently priced Replicate model/version from the model registry.
- Use test users and disposable assets.
- Never run financial acceptance tests against production wallets.
- Record prediction IDs, Framic job IDs, reservation IDs, event IDs, asset IDs, and provider usage evidence. Do not record secrets or private media in logs.

## Required cases

| ID | Scenario | Expected result |
|---|---|---|
| GEN-BILL-001 | Valid request with sufficient credits | One job, one reservation, at most one provider prediction |
| GEN-BILL-002 | Insufficient credits | Rejected before provider call; no reservation |
| GEN-BILL-003 | Concurrent requests against limited balance | Wallet never negative; reservations are atomic |
| GEN-BILL-004 | Duplicate client idempotency key | Same logical job/reservation; no duplicate prediction |
| GEN-BILL-005 | Replicate accepted, then processing | Reservation remains pending; no final customer charge |
| GEN-BILL-006 | Replicate succeeds and output validates | Output copied to durable storage; asset linked; reservation settled once |
| GEN-BILL-007 | Replicate fails | Reservation released once; no customer charge |
| GEN-BILL-008 | Prediction aborted before execution | Reservation released; no customer charge |
| GEN-BILL-009 | Prediction canceled after execution begins | Reservation released; provider cost independently reconciled |
| GEN-BILL-010 | Invalid webhook signature | Reject event; no job or financial mutation |
| GEN-BILL-011 | Webhook timestamp outside tolerance | Reject replay; no financial mutation |
| GEN-BILL-012 | Duplicate webhook delivery | No second asset, settlement, or release |
| GEN-BILL-013 | Out-of-order webhook | No invalid state regression or second financial mutation |
| GEN-BILL-014 | Replicate output URL expired/inaccessible | No success state or settlement; recover or release |
| GEN-BILL-015 | Storage copy fails transiently | Keep job unresolved while bounded retry/reconciliation runs |
| GEN-BILL-016 | Storage copy fails permanently | Release reservation; never mark successful |
| GEN-BILL-017 | Provider submission response times out ambiguously | Reconcile before retry; no blind duplicate prediction |
| GEN-BILL-018 | Webhook never arrives | Poll/reconcile authoritative Replicate prediction state |
| GEN-BILL-019 | Settlement RPC called twice | First settles; second is harmless and does not charge twice |
| GEN-BILL-020 | Release RPC called twice | One release/refund only; no balance inflation |
| GEN-BILL-021 | Settle after release or release after settlement | Reject conflicting terminal mutation |
| GEN-BILL-022 | User requests another user's job/asset | Authorization denies access |
| GEN-BILL-023 | Provider usage reconciliation | Internal provider cost matches available provider usage/billing evidence within documented tolerance |

## Release gate

Every case must have an automated test or reproducible staging evidence, expected/actual result, relevant commit SHA, and test environment identifier. No production secrets or personal media may appear in evidence.

**Release status: NO-GO** until critical financial, webhook-security, persistence, and idempotency cases pass.
