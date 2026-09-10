# API Contract

## Purpose
Define a consistent server contract for web and future clients.

## Response envelope
Successful responses return `success`, `data`, `timestamp`, and `requestId`. Errors return `success=false`, a stable error code/message, `timestamp`, and `requestId`.

## Rules
Validate all inputs with explicit schemas. Authenticate and authorize on the server. Never expose internal stack traces or secrets. Use idempotency for operations that can be retried, especially payments and generation submission.

## Resource families
Auth; profiles; credits; subscriptions; payments; generations; assets; health/observability.

## Acceptance
Clients can distinguish validation, authentication, authorization, conflict, provider, and internal failures using stable semantics.

## Non-goals
Vendor-specific API documentation.
