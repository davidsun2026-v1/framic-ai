# Framic AI

> **Enterprise High-Performance AI Video & AI Image Generation Platform**  
> *Architected for scalable multi-tenant delivery, real-time token tracking, distributed inference pipelines, and microservice modularity.*

---

## 1. Executive Overview

**Framic AI** is a production-grade generative media engine focused on **AI Video Synthesis** and **AI Image Creation**. Designed from the ground up for high-throughput studios, digital creators, and enterprise media pipelines, Framic AI isolates visual generation into robust, scalable services governed by strict token economics and role-based workspace governance.

### Core Focus Areas
- **AI Video Generation**: Text-to-Video is a primary product workflow; additional video modes remain roadmap capabilities until verified in the application.
- **AI Image Generation**: Text-to-Image is a primary product workflow; image editing and batch features remain roadmap capabilities until verified in the application.
- **Credit Accounting**: Generation billing is governed by the ADR-002 ledger invariants: atomic reservation, exactly-once settlement, and exactly-once compensation.
- **Creator Workspace**: User-facing generation, job status, and generated-asset management are the intended product experience; broader team collaboration requires separate implementation evidence.
- **Operational Visibility**: Job state, queue health, provider outcomes, and credit-ledger transitions should be observable without exposing prompts or generated media in logs.

### Explicit Scope Exclusions
- **No AI Chat or Conversational Interfaces**: Framic AI does not incorporate generic chatbot widgets, text assistants, or conversational LLM interfaces. All computing resources and UI surfaces are dedicated solely to visual asset generation and management.
- **No Mock or Placeholder Logic**: Every schema, pipeline definition, API contract, and container specification is defined for real-world deployment.

---

## 2. System Architecture & Modularity

Framic AI is designed around an asynchronous generation path. The web application handles authenticated requests, validation, job creation, and user-facing status. Background work is delegated to a worker that orchestrates managed inference providers; the application does not require a self-hosted GPU inference fleet.

### Target generation flow

```text
Browser / Studio
      |
      v
Next.js App
  |       |
  |       +--> PostgreSQL / Supabase (authoritative jobs and credit ledger)
  |                    |
  |                    +--> Transactional outbox
  |                              |
  |                              v
  |                         Redis queue
  |                              |
  |                              v
  |                         Worker
  |                              |
  |                              v
  |                    Provider adapter
  |                              |
  |                              v
  |                    Managed inference API
  |                         (e.g. Replicate)
  |
  +--> Read job and asset status
```

### Runtime and accounting boundaries

- **PostgreSQL/Supabase is authoritative** for user/job state, credit reservations, settlement, and compensation. The exact database contract must be verified against repository migrations and the target Supabase project before runtime implementation.
- **Transactional outbox:** job creation and its dispatch event must be committed atomically with the reservation. A dispatcher publishes pending outbox events to Redis and marks them delivered only after a successful publish. Retries are expected; consumers must be idempotent.
- **Redis is transport only.** It may carry job identifiers and versioned routing metadata, but it is never the source of truth for balances, reservations, or job completion.
- **Worker is an orchestration process**, not a GPU rendering container. It reloads durable job state, enforces idempotency, calls a managed provider through the provider adapter, and records durable state transitions.
- **ADR-002 governs every billable generation:** reserve atomically before provider submission, settle or compensate exactly once, and fail closed for unknown jobs or missing reservations.
- **Local Docker planning:** the lean profile describes App, Database, Redis, and Worker as logical services. The Database dependency must be Supabase-compatible for full application integration. A plain PostgreSQL image alone does not provide Supabase Auth or API endpoints; use the Supabase CLI-managed local stack or a separately configured isolated Supabase project.
- **Staging must be isolated** from production databases, queues, storage buckets, provider credentials, and webhook secrets.

This is the target architecture described by the planning documents, not a claim that Dockerfiles, Compose manifests, the worker runtime, transactional outbox, or staging deployment have already been implemented. See [Lean Docker MVP Infrastructure Plan](docs/06-INFRASTRUCTURE/00-LEAN_DOCKER_MVP.md) for service boundaries, reliability requirements, and implementation gates.

---

## 3. Repository Workspace Layout

The repository is structured to maintain strict separation of concerns across core studio applications, backend services, infrastructure automation, and deployment pipelines:

```text
framic-ai/
├── apps/
│   ├── web/                          # User-facing Next.js 15+ creator workspace & studio
│   ├── api/                          # High-throughput API gateway & auth proxy
│   └── worker-generation/            # Planned background provider-orchestration worker (not GPU inference)
├── packages/
│   ├── types/                        # Core domain contracts, schemas, and typed interfaces
│   ├── config/                       # Shared linter, formatter, and base configurations
│   └── observability/                # Shared telemetry, logging, and Prometheus interfaces
├── docs/
│   ├── 00-FOUNDATION/                # Vision, technical specifications, and architecture decisions
│   ├── 01-PRODUCT/                   # Product blueprint, user personas, and core workflows
│   ├── 02-DESIGN/                    # Design system tokens, typography, and UI rules
│   ├── 03-SPECS/                     # Detailed technical specs and data flow models
│   ├── 04-TESTING/                   # Test strategy, critical flows, and release gates
│   ├── 05-ADVANCED/                  # Provider abstraction, data governance, and scaling
│   └── 06-INFRASTRUCTURE/            # Lean Docker MVP and infrastructure planning
├── deploy/
│   ├── docker/                       # Docker implementation targets (deferred to Commit 10)
│   ├── k8s/                          # Cluster orchestration manifests (deferred to Commit 10)
│   └── monitoring/                   # Prometheus scrape & alerting rule targets (deferred to Commit 10)
├── supabase/
│   └── migrations/                   # Forward-only relational database schema migrations
├── .github/
│   └── workflows/                    # Continuous integration and delivery workflows
├── .env.example                      # Production environment template (no credentials committed)
├── .gitignore                        # Global repository ignore rules
├── package.json                      # Root workspace configuration
├── turbo.json                        # Monorepo build and pipeline orchestration
└── README.md                         # Top-level repository overview and structural index
```

---

## 4. Tokenomics & Usage Rules

In Framic AI, computational workloads are strictly metered and billed in **Tokens**. Currency values are never exposed inside generation workflows or database operation models.

### Base Token Consumption Model

| Action / Capability | Resolution / Specs | Frame Count / Quality | Token Cost |
| :--- | :--- | :--- | :--- |
| **Standard Image Generation** | 1024 x 1024 px | 30 steps, standard CFG | 5 Tokens |
| **High-Resolution Image** | 2048 x 2048 px | 50 steps, detail enhancement | 15 Tokens |
| **Image Inpainting / Fill** | 1024 x 1024 px | Masked area conditioning | 8 Tokens |
| **Text-to-Video Synthesis** | 720p @ 24 fps | 4 seconds (96 frames) | 50 Tokens |
| **Text-to-Video Synthesis** | 1080p @ 24 fps | 4 seconds (96 frames) | 100 Tokens |
| **Image-to-Video Motion** | 720p @ 24 fps | 5 seconds (120 frames) | 75 Tokens |
| **Video Upscaling (4K)** | 3840 x 2160 px | AI Frame Super-Resolution | 120 Tokens |

### Atomic Token Reservation Workflow
1. **Pre-flight Lock**: When a generation request is submitted, the API Gateway checks the workspace token balance. If sufficient, the estimated token cost is placed into a `RESERVED` status within an atomic database transaction.
2. **Inference Execution**: The task is dispatched to the worker queue. If the job completes successfully, the reserved tokens are committed to `DEBITED` status in the ledger.
3. **Fault-Tolerant Rollback**: If an inference worker crashes, encounters an unrecoverable CUDA out-of-memory (OOM) error, or times out, the reservation lock is immediately released and zero tokens are deducted from the workspace balance.

---

## 5. Sequential Roadmap Status

This repository is constructed following an explicit 10-step sequence:

- [x] **Commit 1 — Repository Foundation** (`README.md`, `docs/00-FOUNDATION/00-REPOSITORY_LAYOUT.md`, and deploy targets)
- [x] **Commit 2 — Documentation** (`docs/00-FOUNDATION/08-PRODUCT_VISION_AND_STANDARDS.md` covering Vision, Goals, Architecture, Security, Standards, Branding, and Contributions)
- [x] **Commit 3 — Product Blueprint** (`docs/01-PRODUCT/01-PRODUCT_BLUEPRINT.md` covering Functional Matrix, Personas, Workflows, State Machines, and Token Lifecycle)
- [ ] **Commit 4 — Design System Specs** (UI tokens, typography, visual dark-room aesthetics)
- [ ] **Commit 5 — Technical Specifications** (Video & Image generation pipelines, Token engine)
- [ ] **Commit 6 — Infrastructure Planning** (`docs/06-INFRASTRUCTURE/00-LEAN_DOCKER_MVP.md`; Compose architecture and operational boundaries)
- [ ] **Commit 7 — Database Planning** (Relational schemas for Users, Teams, Tokens, and Jobs)
- [ ] **Commit 8 — API Planning** (OpenAPI contracts, WebSockets, and service endpoints)
- [ ] **Commit 9 — UI/UX Planning** (Studio layouts, generation timeline, and token ledger dashboard)
- [ ] **Commit 10 — Implementation Phase** (Production application code and components)
