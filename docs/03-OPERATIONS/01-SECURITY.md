# Security Baseline

## Purpose
Define mandatory controls for a production AI SaaS.

## Controls
- Supabase Auth for identity; server-side authorization.
- Row Level Security for user-owned database records.
- Server-only secrets and provider credentials.
- Strict input/schema validation.
- Rate limiting on authentication, generation, and payment endpoints.
- Secure webhook verification and replay/idempotency protection.
- Least-privilege service access.
- Safe structured logging with secret redaction.
- HTTPS in production.
- Dependency and supply-chain hygiene.
- No sensitive data in client bundles.

## Critical invariant
A client must never be able to award itself credits, confirm its own payment, access another user's assets, or submit an unauthorized generation.

## Acceptance
Security controls are tested at integration/E2E boundaries before production release.
