# Paystack Integration

## Purpose
Handle real payment initiation and verification for subscriptions/credit purchases.

## Scope
Customer/payment initialization, callback/webhook handling, signature/verification checks, idempotency, payment records, failure states, and reconciliation.

## Rules
Never mark payment successful from the client alone. Never grant subscription or credits before verified provider evidence. Persist provider references and correlation IDs.

## Security
Secrets server-side only; validate webhook authenticity; protect against replay and duplicate events.

## Acceptance
Successful and failed payment paths are verifiable, idempotent, auditable, and mapped to the correct user/account.

## Non-goals
Credit ledger rules and plan entitlement rules.
