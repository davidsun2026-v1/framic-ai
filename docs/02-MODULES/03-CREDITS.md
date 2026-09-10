# Credits System

## Purpose
Provide atomic, auditable usage accounting for AI generation.

## Scope
Balance, immutable transaction ledger, credit additions, deductions/reservations, refunds, history, and concurrency protection.

## Rules
No negative balances. A generation must have sufficient credits before provider execution. Every balance mutation records user, amount, reason, before/after balance, status, and correlation identifiers.

## Failure behavior
Failed/cancelled provider work follows an explicit refund policy and must not silently lose or create credits.

## Acceptance
Concurrent requests cannot overspend; every mutation is auditable and reproducible.

## Non-goals
Payment provider mechanics and AI provider mechanics.
