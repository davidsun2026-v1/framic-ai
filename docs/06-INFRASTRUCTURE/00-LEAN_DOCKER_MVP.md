# Framic AI — Lean Docker MVP Infrastructure Plan

**Canonical path:** `docs/06-INFRASTRUCTURE/00-LEAN_DOCKER_MVP.md`  
**Status:** PLANNED — architecture only; no container runtime is implemented by this document.  
**Scope:** Local development and isolated staging execution.  
**Related decisions:** ADR-002 (credits are a ledger), ADR-003 (provider abstraction), ADR-004 (repository truth), ADR-005 (production versus development).

## 1. Objective and constraints

Define the smallest useful container topology for developing and exercising Framic AI's asynchronous generation path without introducing a self-hosted inference fleet or changing production services.

The local Compose profile defines four logical services (App, Database, Redis, and Worker). The Database role must be Supabase-compatible for full application integration; it is not satisfied by a bare PostgreSQL image alone.

1. **App** — the existing Next.js web application.
2. **Database** — local PostgreSQL for isolated development and integration tests.
3. **Redis** — a disposable transport for asynchronous work.
4. **Worker** — a background job consumer and provider orchestrator.

This is a planning contract, not an assertion that the four service images, Dockerfiles, Compose manifests, or worker application currently exist.

## 2. Architecture overview

```text
 Browser / Studio
       |
       | HTTPS / app API
       v
+---------------------+
| App                 |
| Next.js             |
| Auth + validation   |
| Job creation        |
+----+-----------+----+
     |           |
     |           +----------------------+
     |                                  |
     v                                  v
+----------------+              +----------------+
| PostgreSQL     |              | Redis          |
| Durable state  |              | Queue transport|
| Credit ledger  |              | Retry metadata |
| Generation jobs|              +-------+--------+
+----------------+                      |
                                        v
                                +----------------+
                                | Worker         |
                                | Job consumer   |
                                | Provider adapter|
                                +-------+--------+
                                        |
                                        v
                               Managed inference API
                                    (Replicate)
```

PostgreSQL owns durable application and financial state. Redis transports work; it is not a source of truth. The worker orchestrates remote provider calls; Replicate (or another approved managed provider behind the adapter) performs inference.

## 3. Service responsibilities and boundaries

### 3.1 App

- Runs the existing Next.js application from `apps/web`.
- Authenticates requests and validates generation parameters.
- Resolves the authoritative model and price configuration.
- Performs the required atomic credit reservation through the approved database contract before acknowledging billable work.
- Creates the durable generation-job record, credit reservation, and transactional outbox event in one database transaction.
- Returns an asynchronous job identifier; it must not wait for a long-running provider inference request in the browser request path.
- A separate dispatcher publishes pending outbox events to Redis and records delivery. It retries safely until delivery is confirmed; duplicate publication is expected and consumers remain idempotent.

The app must not create an alternate credit balance or bypass the ledger.

### 3.2 Database

- Provides the PostgreSQL persistence and Supabase Auth/API compatibility required by the existing application.
- For full local application integration, use the Supabase CLI-managed local stack (or a separately configured isolated Supabase project). A plain PostgreSQL container does not provide Supabase Auth, PostgREST, or the Supabase API endpoints expected by a Supabase client.
- The Compose `db` role may represent the database dependency logically; the Supabase CLI stack can run its supporting services outside the four-service Compose file. Document the actual connection URLs and startup dependency when implementation is selected.
- Applies only repository-reviewed migrations against the isolated local database.
- Stores profiles, wallets, credit transactions, generation jobs, outbox events, webhook/audit events, and asset metadata according to the verified schema contract.
- Enforces transactional invariants and uniqueness constraints used for idempotency.

A local Supabase stack or isolated staging project is a development dependency, not a proposal to replace or modify production Supabase. Never point local reset or destructive migration commands at production.

### 3.3 Redis queue

- Provides transient asynchronous message transport between App and Worker.
- Supports acknowledgement, bounded retries, backoff, and dead-letter handling according to the selected queue library.
- Carries only the minimum job identifier and versioned routing metadata; do not place secrets, full prompts, or media payloads in queue messages.
- Must be treated as at-least-once delivery: duplicate delivery is expected and must be safe.
- Is not authoritative for job state, balances, reservations, or settlement.

The exact Redis queue library and message schema must be selected in a later implementation decision; this plan does not silently choose BullMQ or another dependency.

### 3.4 Worker

- Consumes queued job identifiers and reloads authoritative job state from PostgreSQL.
- Verifies the job is eligible to run and is not already completed, canceled, or claimed by another active attempt.
- Uses the provider adapter defined by ADR-003; it does not embed provider-specific business rules in shared domain logic.
- Submits work to managed inference APIs and records provider references and state transitions.
- Handles retryable and terminal failures distinctly.
- Uses idempotency keys and durable state transitions to prevent duplicate provider submissions and duplicate financial effects.
- Persists results through the approved storage path before marking an asset complete.

The worker is an orchestration process, not a GPU rendering container. No ComfyUI, CUDA, TensorRT, model weights, or self-hosted inference runtime is included in this MVP.

## 4. ADR-002 — credit ledger invariants

Every generation path must preserve ADR-002:

1. The authoritative credit balance and transaction history live in PostgreSQL through the approved ledger contract.
2. A billable job must obtain an atomic reservation/hold before provider submission.
3. The reservation operation must be concurrency-safe and idempotent.
4. Successful work settles the existing reservation exactly once.
5. Failed or canceled work follows the approved release/compensation operation exactly once.
6. Queue retries and worker restarts must never create a second debit or a second refund.
7. Redis message state must never be used to calculate or repair a user's balance.
8. Unknown jobs, invalid ownership, and missing reservations must fail closed; the worker must not invent a reservation or mutate credits.

**Contract gate:** The exact live/repository RPC names, signatures, and transaction semantics must be verified before implementation. This document does not declare any proposed reservation, settlement, or release RPC to exist.

## 5. Local Docker Compose topology

The planned Compose file belongs under `deploy/docker/` when implementation is authorized. The intended logical service graph is:

| Service | Local exposure | Persistence | Dependency / health gate |
|---|---|---|---|
| `app` | Browser-facing development port only | No authoritative local state | Wait for healthy database and Redis |
| `db` | Supabase-compatible local database dependency; loopback-only developer access if exposed | Persistent local database volume | Supabase local stack readiness / PostgreSQL health check |
| `redis` | No host port by default | Queue data may be ephemeral locally | Redis ping health check |
| `worker` | No public port | Durable state remains in PostgreSQL | Wait for healthy database and Redis |

Compose requirements:

- Use pinned, maintained image tags; do not use floating `latest` tags.
- Use a private Compose network for service-to-service traffic.
- Publish only the App port by default. Database access, if needed for a local developer tool, must bind to loopback.
- Do not publish Redis in the default profile.
- Configure health checks and service readiness; container start order alone is not readiness.
- The local Supabase CLI-managed stack is an explicit prerequisite for full Auth/API integration unless an isolated compatible Supabase endpoint is configured. Do not imply that a plain PostgreSQL container is a complete Supabase replacement.
- Use a named database volume and document how to reset local data safely.
- Run the App and Worker as non-root users where their base images support it.
- Apply resource limits where supported and set a bounded worker concurrency.
- Keep secrets in ignored local environment files or a secret manager; commit only variable names and safe placeholders.
- Do not mount the Docker socket into application containers.
- Do not log credentials, user prompts, uploaded media, or generated outputs.

## 6. Staging profile and production boundary

Staging must be isolated from production and must never reuse production credentials, queues, buckets, or database endpoints.

Two supported deployment shapes remain possible and must be chosen when staging is provisioned:

- **Compose staging:** run the same App and Worker images with isolated staging PostgreSQL and Redis services, private networking, durable database storage, and TLS-terminated ingress.
- **Managed staging dependencies:** run App and Worker containers while using dedicated staging-managed PostgreSQL/Supabase and Redis services. This is preferred where the platform already supplies managed database and queue services.

In either shape:

- use a separate staging project/database and separate storage bucket;
- use separate provider credentials and webhook secrets;
- restrict database and Redis ingress to private networks;
- use synthetic/test accounts and controlled provider spend;
- ensure staging webhooks cannot update production records;
- document backup, restore, retention, and cleanup policies before storing non-disposable data.

ADR-005 remains controlling: production authentication, payments, credit accounting, generation, and storage use real services and validation. This Compose plan does not authorize a production database migration or a production topology change.

## 7. Configuration and secret handling

Configuration categories (names must be reconciled with the actual application before implementation):

- App: `NODE_ENV`, application origin, Supabase URL and public key.
- Database: local PostgreSQL database name, user, password, and connection URL.
- Queue: Redis URL, queue namespace, retry limits, and worker concurrency.
- Provider: server-side Replicate credential and webhook verification secret.
- Storage: the approved Supabase Storage bucket and server-side access configuration.

Rules:

- Never commit real credentials, tokens, service-role keys, or webhook secrets.
- Do not expose service-role or provider secrets through `NEXT_PUBLIC_*` variables.
- Keep `.env.local` and other developer secret files ignored by Git.
- Provide a safe `.env.example` only after verifying the variable names consumed by code.
- Fail startup clearly when required configuration is absent; do not silently substitute fake provider success.

## 8. Reliability and failure handling

| Condition | Required behavior |
|---|---|
| PostgreSQL unavailable | App/Worker readiness fails; no billable work is accepted |
| Redis unavailable | App does not acknowledge queue-backed work as successfully enqueued |
| Worker stops mid-job | Durable job remains recoverable; lease/claim expiry permits controlled retry |
| Duplicate queue message | Worker reloads durable state and exits safely if already claimed/completed |
| Provider timeout or transient error | Bounded retry with backoff and idempotency protection |
| Terminal provider failure | Persist failure and invoke the approved compensation path once |
| Storage persistence failure | Do not mark the asset/job successful; retry or enter recoverable failure state |
| Poison message / exhausted retries | Record a durable failure and surface it for operator review |

Queue acknowledgement must occur only after the worker has safely persisted the relevant transition or durable retry state.

### 8.1 Database-to-queue publish gap

The App must not rely on a best-effort Redis publish performed after committing the job and reservation. That creates a crash window in which a valid reservation exists but no queue message is delivered. The job, reservation, and outbox event must be written atomically in one PostgreSQL transaction. A dispatcher reads undelivered outbox rows, publishes the job identifier to Redis, and marks the event delivered only after successful publication. If it crashes before marking delivery, it republishes; duplicate delivery is safe because the worker reloads durable state and enforces idempotency. Outbox age and retry exhaustion must be observable and recoverable. A database-polling dispatcher is an acceptable implementation alternative only if it provides equivalent durable retry and idempotency guarantees.

## 9. Observability and operations

The MVP should expose health/readiness checks for App, PostgreSQL, Redis, and Worker. Structured operational logs should include correlation/job identifiers and state transitions, but exclude secrets, prompts, and media. Metrics should cover queue depth, oldest queued-job age, worker concurrency, retry counts, provider latency, terminal failure counts, and reservation-to-settlement outcomes.

Prometheus/Grafana deployment is not required by this lean MVP and remains a separate, evidence-backed implementation decision.

## 10. Security baseline

- Only App ingress is public; database, Redis, and Worker remain private.
- Use least-privilege database roles for App and Worker.
- Validate authorization and job ownership server-side.
- Protect provider credentials and webhook verification secrets.
- Apply bounded request sizes, queue payload sizes, retry counts, and worker concurrency.
- Keep images patched and pinned; scan images in CI when the image build pipeline exists.
- Never run privileged containers unless a separately reviewed requirement justifies them.

## 11. Explicit non-goals

- Kubernetes or cluster orchestration.
- Self-hosted GPU inference, ComfyUI, CUDA, or model-weight hosting.
- RabbitMQ or multiple competing queue systems.
- Prometheus/Grafana deployment in this commit.
- Production database replacement or production Supabase migration.
- Payment, subscription, or credit-ledger redesign.
- Dockerfiles, Compose YAML, worker source code, or staging deployment implementation.

## 12. Implementation acceptance gates

Before runtime implementation is considered complete:

- [ ] Confirm actual workspace/package scripts and build contexts for App and Worker.
- [ ] Verify the authoritative database schema and ledger RPC signatures.
- [ ] Select and document the Redis queue library and versioned message contract.
- [ ] Define durable job claim/lease and idempotency semantics.
- [ ] Define the transactional outbox schema, dispatcher retry behavior, and recovery for undelivered events.
- [ ] Verify the local Supabase-compatible Auth/API dependency; do not treat plain PostgreSQL as a complete replacement.
- [ ] Add pinned Dockerfiles and Compose configuration under `deploy/docker/`.
- [ ] Add health checks, non-root users, private networking, and persistent database volume.
- [ ] Verify local migrations and a real end-to-end queued job using a controlled provider test.
- [ ] Prove duplicate delivery cannot double-submit or double-charge.
- [ ] Prove provider failure releases/compensates the reservation exactly once.
- [ ] Verify secrets are absent from images, logs, and Git history.
- [ ] Run relevant lint, type-check, tests, image build, and Compose smoke checks.

**Current status:** Documentation planning only. No container build, Compose execution, staging deployment, worker runtime, or production change is claimed.

## 13. Related documentation

- Architecture decisions: `docs/00-FOUNDATION/04-ARCHITECTURE_DECISIONS.md`
- System architecture: `docs/00-FOUNDATION/03-ARCHITECTURE.md`
- Replicate pipeline contract: `docs/03-SPECS/SPEC-001-REPLICATE-API-PIPELINE.md`
- CI and closed-thread requirements: `docs/03-SPECS/SPEC-002-CI-QUALITY-AND-THREAD-LOCKING.md`
- Implementation evidence ledger: `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md`
- Deployment baseline: `docs/03-OPERATIONS/03-DEPLOYMENT.md`
