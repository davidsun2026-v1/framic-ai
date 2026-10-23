# Framic AI — Product Vision, Architecture & Engineering Standards

> **Commit 2 Deliverable**: Definitive operational specification governing platform vision, strategic goals, high-level architecture, repository standards, security axioms, branding identity, and contribution policies.  
> *Contains planning specifications only; zero source code, SQL implementations, or installation tutorials.*

---

## 1. Product Vision

**Framic AI** is an enterprise-grade generative media engine engineered specifically for digital creators, creative agencies, and production studios. The platform isolates generative visual computation into deterministic, auditable workflows governed by strict token accounting and fine-grained workspace permissions.

### Core Tenets
- **Generative Media Isolation**: Computational resources and user interfaces are dedicated exclusively to AI Video Synthesis and AI Image Creation. Conversational text assistants, chatbots, and non-visual tooling are strictly prohibited.
- **Deterministic Token Economics**: Operational resource consumption is calculated and audited strictly in integer **Tokens**. Currency values are never exposed in generation paths or database execution layers.
- **Auditability Over Abstraction**: Every generation attempt, parameter configuration, token reservation, and settlement is permanently recorded in append-only ledgers to ensure end-to-end provenance.
- **Multi-Tenant Collaboration**: Studio workflows support organizational hierarchies, workspace-level token pool allocations, and role-based permissions designed for collaborative enterprise production teams.

---

## 2. Product Goals

### Strategic Objectives
1. **High-Throughput Generative Velocity**: Facilitate sub-minute synthesis for high-definition image generation and deterministic, queue-optimized video generation pipelines.
2. **Double-Entry Token Accounting**: Maintain financial-grade precision via an atomic pre-flight token reservation lock, automatic release on worker failure, and immutable ledger settlement upon render completion.
3. **Enterprise Team Governance**: Enable organization administrators to provision multi-seat workspaces, establish per-member generation quotas, and enforce role-based access controls across shared asset libraries.
4. **Cloud-Native Resilience & High Availability**: Architect stateless web and API gateway layers decoupled from stateful GPU worker pools via distributed message brokers, ensuring zero single points of failure.
5. **Continuous Telemetry & Observability**: Real-time export of operational metrics (latency histograms, queue depth, worker saturation, and token debit rates) via standardized Prometheus endpoints.

---

## 3. Architecture Overview

Framic AI follows **Microservices Best Practices** within a coordinated monorepo structure to promote modular maintenance and independent scaling.

```text
+-----------------------------------------------------------------------------------+
|                                 1. CLIENT TIER                                    |
|                            [ apps/web — Next.js 15+ ]                             |
|  - High-precision darkroom interface for Video Studio and Image Canvas           |
|  - Real-time generation progress and token balance hydration                     |
|  - Stateless edge rendering; zero client-side credentials or direct database access|
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / WSS
                                          v
+-----------------------------------------------------------------------------------+
|                            2. GATEWAY & API TIER                                  |
|                            [ apps/api — Service ]                                 |
|  - Ingress rate limiting, TLS termination, and request schema validation          |
|  - Cryptographic JWT session verification and RBAC role authorization             |
|  - Pre-flight atomic token balance checks and reservation locks                   |
|  - Job serialization and dispatch to distributed task queues                      |
|  - Native Prometheus metrics scraping endpoint (/metrics)                         |
+-------------------+-----------------------------------+---------------------------+
                    |                                   |
         (Enqueue Generation Job)             (Atomic Token Hold / DB State)
                    |                                   |
                    v                                   v
+------------------------------------+   +------------------------------------------+
|       3. QUEUE & BROKER TIER       |   |      4. DATA & PERSISTENCE TIER          |
|      [ Distributed Message Broker ]|   |       [ PostgreSQL / Supabase ]          |
|  - video.render.priority           |   |  - Relational tables: users, workspaces, |
|  - video.render.standard           |   |    token_ledgers, generation_jobs         |
|  - image.diffusion.standard        |   |  - Row Level Security (RLS) enforcement   |
|  - Worker lease timeouts & DLQ     |   |  - Private S3-compatible Object Storage  |
+-------------------+----------------+   +------------------------------------------+
                    |
          (Pull Task Lease & Lock)
                    |
                    v
+-----------------------------------------------------------------------------------+
|                           5. COMPUTE & WORKER TIER                                |
|                   [ apps/worker-generation — GPU Cluster ]                        |
|  - Scalable worker nodes equipped with hardware acceleration (CUDA/TensorRT)      |
|  - Pull-based queue consumer with heartbeat keepalive                             |
|  - Diffusion execution: T2V, I2V, frame interpolation, 4K super-resolution       |
|  - Direct-to-storage multipart render upload with signed URL generation           |
|  - Authenticated completion/failure webhooks back to API Gateway                  |
+-----------------------------------------------------------------------------------+
```

---

## 4. Repository Standards

To ensure software longevity, maintainability, and seamless teamwork across distributed contributors:

### Architectural Boundaries
- **Monorepo Independence**: Applications in `apps/` must never import directly from sibling applications. Cross-cutting logic must be packaged into `packages/`.
- **Contract Authority**: Domain types, generation parameter interfaces, and API payload definitions are maintained authoritatively in `packages/types`.
- **Strict Typing Invariant**: TypeScript strict mode is enabled across all workspaces (`noImplicitAny: true`, `strictNullChecks: true`). Type assertions (`as any`) are strictly disallowed.

### Code Quality & Hygiene
- **Zero Placeholder Policy**: No mockups, fake environment variables, stubbed functions, or unresolved TODO comments may be committed.
- **Predictable File Naming**:
  - Components and modules: `kebab-case.tsx` / `kebab-case.ts`
  - Domain types: PascalCase within `*.types.ts`
  - Unit/integration tests: Colocated `*.test.ts` / `*.spec.ts`

---

## 5. Security Principles

1. **Principle of Least Privilege**: Services, database roles, and background workers operate with minimal necessary permissions. Worker nodes have zero direct write access to billing or token ledgers.
2. **Zero Client Secrets**: Database credentials, service-role keys, provider API keys, and signing secrets must never be exposed to browser bundles or committed to source control.
3. **Atomic Pre-Flight Holds**: No generative workload may be enqueued without verified balance availability and an atomic database reservation lock.
4. **Tenant Isolation**: Multi-tenant data segregation is enforced at the database layer via PostgreSQL Row Level Security (RLS) and verified at the API Gateway.
5. **Private Media Storage**: All rendered video files and high-resolution images are stored in private object buckets accessed exclusively via short-lived, cryptographically signed URLs.
6. **Immutable Audit Trails**: Balance changes, administrative adjustments, and membership modifications are written to append-only audit ledgers.

---

## 6. Branding & Visual Identity

- **Brand Name**: Framic AI (Logotype: **FRAMIC AI**)
- **Design Philosophy**: The Digital Darkroom. Tailored for visual artists, editors, and filmmakers working in calibrated, low-light environments.
- **Color Aesthetics**:
  - Deep true-black canvas (`#08090A`) and charcoal panels (`#0E1012`) to eliminate visual glare.
  - Subtle structural borders (`#1E2228`, `#2A3038`) for clean spatial separation without cognitive fatigue.
  - Functional Gold (`#F5A623`) reserved exclusively for token accounting, balance indicators, and credit ledgers.
  - Precision Blue (`#4F6BFF`) for primary generation actions, active parameter sliders, and focus highlights.
- **Tone & Voice**: Authoritative, technical, minimal, and transparent. Avoid marketing hyperbole or playful jargon.

---

## 7. Contribution Guidelines

- **Sequential Roadmap Discipline**: All development must adhere strictly to the sequential 10-commit development roadmap. Implementation code is disallowed until Commits 1 through 9 are finalized and approved.
- **Branching Model**:
  - `main`: Production-verified baseline.
  - Topic branches: Named by scope (e.g., `docs/commit-2-spec`, `infra/ci-pipeline-spec`).
- **Commit Formatting**: Follow the Conventional Commits specification:
  - Format: `<type>(<scope>): <subject>`
  - Types: `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`
- **Verification Rule**: Documentation is never accepted as implementation evidence. Features become verified only when accompanied by real code, test execution, and runtime proof.
