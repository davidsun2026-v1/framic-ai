# Framic AI — Technical Specifications

## Purpose
Translate the product charter into implementation contracts without prescribing undocumented vendor behavior.

## 1. Identity and profiles
Identity is provided by Supabase Auth. Application data uses `public.profiles` linked to `auth.users`.

Required capabilities: signup, login, logout, email verification, recovery, session handling, authorization, and future MFA/OAuth readiness.

**Invariant:** no second password store or parallel authentication authority.

## 2. Credits
Credits are an auditable ledger. Required operations: read balance, add, deduct/reserve, refund, history, and sufficient-balance validation.

Every mutation records user, amount, reason, balance before/after, status, timestamp, and correlation/idempotency information. Mutations are atomic and cannot create a negative balance.

## 3. Subscriptions and payments
Subscription state represents verified entitlement. Paystack is the payment boundary. Payment events must be verified, idempotent, persisted, and reconciled before entitlement or credit grants occur.

## 4. Generation
Generation requests are authenticated, validated, costed, authorized, and recorded before provider execution. Required lifecycle: `requested → authorized → running → succeeded | failed | cancelled`.

Each attempt records user, generation type, model/provider, cost, external provider reference, timestamps, status, output/error metadata, and credit recovery state.

## 5. Provider contract
Replicate is an adapter behind a normalized internal generation contract. Provider-specific request/response formats do not leak into domain accounting.

## 6. Assets
Every generated/uploaded asset is owned by a user. Required metadata includes type, MIME type, size, storage reference, generation linkage, timestamps, and lifecycle state. Authorization and RLS protect access.

## 7. Dashboard
The dashboard reads authoritative profile, entitlement, credit, generation, and asset records. It must never rely on duplicated client state for financial or entitlement information.

## 8. API contract
All APIs validate input and return a stable envelope containing success/data or a structured error, timestamp, and request ID. Authorization is server-side. Payment and generation mutation endpoints support idempotency where retries are possible.

## 9. Observability
Critical events are correlated by request ID and domain IDs. Sentry and structured logs cover authentication, payment, credit, generation, webhook, storage, and authorization failures. Secrets and unnecessary sensitive payloads are never logged.

## 10. Database requirements
Core domains: profiles, subscriptions, credit transactions, payment records, generations, assets, and supporting idempotency/audit records. Versioned migrations and RLS are mandatory.

## 11. Security requirements
Server-only secrets; schema validation; least privilege; RLS; rate limiting; verified webhooks; replay protection; safe logging; HTTPS in production; dependency hygiene; no client-controlled financial state.

## 12. Testing requirements
Unit tests cover domain rules. Integration tests cover database/provider/payment boundaries. E2E tests cover critical flows and authorization. Percentage targets never replace explicit business-invariant tests.

## 13. Implementation order
EPIC-001 Foundation → EPIC-002 Authentication → EPIC-003 Profiles → EPIC-004 Credits. Then EPIC-005 Subscription and EPIC-006 Paystack plus EPIC-007 Replicate in dependency-safe parallelism. Then EPIC-009 Generation → EPIC-008 Assets → EPIC-010 Monitoring → EPIC-011 Deployment.

## 14. Explicit Phase 1 non-goals
Marketplace, team collaboration, shared workspaces, and video generation are not Phase 1 implementation requirements.

## 15. Evidence rule
This specification defines requirements, not implementation status. Only repository evidence can mark a requirement implemented.
