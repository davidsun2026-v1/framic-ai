# Test Strategy

## Purpose
Prevent undocumented behavior and production regressions.

## Layers
- Unit: pure business rules and utilities.
- Integration: Supabase/database, provider adapters, payments, and service boundaries.
- E2E: authenticated user journeys and critical business invariants.

## Critical coverage
Authentication; profile ownership; credit atomicity; payment verification/idempotency; generation lifecycle; asset ownership; authorization.

## Release principle
Coverage percentage is a signal, not a substitute for testing business invariants. Critical paths require explicit scenario tests.

## Acceptance
Every implemented epic has tests for success, validation failure, authorization failure, retry/idempotency where applicable, and failure recovery.
