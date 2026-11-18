# Framic AI — Architecture Decisions: Enterprise Alignment Addendum

> Addendum to `04-ARCHITECTURE_DECISIONS.md`, recorded with Commits 4–5. Where this addendum conflicts with earlier documents, **this addendum governs** until the older document is amended. Status of each decision: **Proposed** until the owner approves the pull request.

---

## ADR-001 — Enterprise Token/Workspace domain model

**Decision.** The domain model is Organization → Workspace → Project, with integer Tokens held in organization treasury accounts and workspace pools, spent via atomic `RESERVED → DEBITED | RELEASED` reservations on an append-only ledger.

**Supersedes.** The per-user credit wallet, subscriptions, Paystack payments and webhooks, Naira pricing, and provider-specific job fields formerly in `packages/types`, and the `credit_wallets` / `credit_transactions` RPC contract in `01-REPLICATE_API_PIPELINE_SPEC.md` §5.

**Consequences.** Payments live outside the engine; a procurement service deposits verified blocks of Tokens. The existing `supabase/migrations` (profiles with `token_balance`, signup trigger) are interim and are replaced by Commit 7. Job states are uppercase per the Blueprint.

**Open.** Who may authorize Refunds beyond Organization Owner and the system (Workspace Admin?). Where an Organization Owner sets the allocation cap for Workspace Admins.

---

## ADR-002 — Lean containerized MVP for infrastructure (Commit 6)

**Decision.** Commit 6 plans a container-based MVP: Docker images per application and a Compose topology (web, api, worker-generation, broker, observability), Prometheus metrics and basic Grafana dashboards, and a CI pipeline building and testing images. Kubernetes manifests, GPU node pools, and autoscaling are out of MVP scope and remain deferred under `deploy/k8s/`. Managed Supabase (PostgreSQL, Auth, Storage) is the data tier.

**Consequences.** Architecture diagrams in the README show the target enterprise topology; Commit 6 documents the MVP subset and the promotion path. The broker choice (Redis Streams or RabbitMQ) is made in Commit 6 against the contract in `00-GENERATION_PIPELINES.md` §4.

---

## ADR-003 — Provider-agnostic inference backend

**Decision.** Generation executes behind the `InferenceBackend` interface (`02-INFERENCE_BACKEND_INTERFACE.md`). The MVP registers one `HOSTED_API` adapter; a `GPU_POOL` adapter is added later without changing the gateway, ledger, or schema.

**Supersedes.** In `01-REPLICATE_API_PIPELINE_SPEC.md`: the gateway dispatching directly to the provider and receiving provider webhooks; the "zero self-hosted GPU" invariant (now "none provisioned in the MVP"); per-model Token costs in §2 (replaced by SKU pricing, ADR-004); user-scoped wallets and `profiles`-based flow (replaced by workspace pools); job status strings in lowercase. The document remains valid as the design source for the hosted adapter's model mapping, error handling, and signature verification, and should be amended in Commit 6 or 8.

---

## ADR-004 — Priced-SKU-only generation and flat pricing

**Decision.** The gateway accepts only configurations that map to a SKU in the Product Blueprint cost schedule. Price is independent of model and backend. Capabilities and parameters with no SKU (image conditioning, outpainting, video-to-video, interpolation, batch of 2–3, 30 fps, 6–8 s video, 2048 px inpainting/batch) are deferred, not approximated.

**Consequences.** Product and Blueprint §3 describe more capability than is billable today. Extending the schedule requires a new `TOKEN_COST_SCHEDULE_VERSION` and request variant.

**Open (business).** With flat SKU pricing, a high-cost provider model sold at a flat SKU price changes margin. Either restrict routes to models whose provider cost fits the SKU or approve model-based multipliers as a schedule extension.

---

## ADR-005 — Planning gate and the contracts exception

**Decision.** Commit 10 (application code, SQL, services) stays withheld until Commits 6–9 are approved, per the contribution rules in `08-PRODUCT_VISION_AND_STANDARDS.md`. `packages/types` is the repository's Contract Authority and is exempt as a contract-only package: type definitions, schemas, and constant tables, with no I/O and no business logic beyond schema validation.

**Consequences.** Any function that computes (cost resolution, permission checks, state transition guards) is specified, not implemented, until Commit 10.
