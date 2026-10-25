# Framic AI

> **Enterprise High-Performance AI Video & AI Image Generation Platform**  
> *Architected for scalable multi-tenant delivery, real-time token tracking, distributed inference pipelines, and microservice modularity.*

---

## 1. Executive Overview

**Framic AI** is a production-grade generative media engine focused on **AI Video Synthesis** and **AI Image Creation**. Designed from the ground up for high-throughput studios, digital creators, and enterprise media pipelines, Framic AI isolates visual generation into robust, scalable services governed by strict token economics and role-based workspace governance.

### Core Focus Areas
- **AI Video Synthesis**: Text-to-Video (T2V), Image-to-Video (I2V), Video-to-Video (V2V), frame-interpolation, camera motion conditioning, and multi-resolution upscaling (up to 4K).
- **AI Image Creation**: High-fidelity Text-to-Image (T2I), image conditioning, inpainting, outpainting, and multi-prompt batch synthesis.
- **Strict Token Economics**: Complete auditability of every generation request metered exclusively in **Tokens** with pre-flight balance holds, atomic debit execution, and team token pools.
- **Multi-Tenant Collaboration**: Organization hierarchies, team workspaces, permission tiers, token budget allocations, shared visual asset libraries, and export pipelines.
- **Enterprise Management Dashboard**: Real-time observability over active generation queues, GPU cluster saturation, team token consumption rates, and worker health.

### Explicit Scope Exclusions
- **No AI Chat or Conversational Interfaces**: Framic AI does not incorporate generic chatbot widgets, text assistants, or conversational LLM interfaces. All computing resources and UI surfaces are dedicated solely to visual asset generation and management.
- **No Mock or Placeholder Logic**: Every schema, pipeline definition, API contract, and container specification is defined for real-world deployment.

---

## 2. System Architecture & Modularity

Framic AI employs an asynchronous event-driven microservices architecture that decouples web ingress and studio controls from heavy GPU-bound inference processing.

```text
+-----------------------------------------------------------------------------------+
|                                 FRAMIC AI CLIENT                                  |
|   +--------------------------+  +--------------------------+  +-----------------+ |
|   |   AI Video Studio UI     |  |   AI Image Generator UI  |  | Team Dashboard  | |
|   +--------------------------+  +--------------------------+  +-----------------+ |
+-----------------------------------------+-----------------------------------------+
                                          | HTTPS / WebSockets / gRPC
                                          v
+-----------------------------------------------------------------------------------+
|                            API GATEWAY & EDGE INGRESS                             |
|  - TLS Termination & Rate Limiting                                                |
|  - JWT Authentication & RBAC Verification                                         |
|  - Pre-flight Token Ledger Verification & Reservation Lock                        |
|  - Prometheus Ingress Metrics Scraper                                             |
+-------------------+-----------------------------------+---------------------------+
                    |                                   |
         +----------v-----------+            +----------v-----------+
         | Video Queue Producer |            | Image Queue Producer |
         +----------+-----------+            +----------+-----------+
                    |                                   |
                    v                                   v
+-----------------------------------------------------------------------------------+
|                        DISTRIBUTED TASK BROKER (Redis / RabbitMQ)                 |
|  - video.render.priority                           - image.diffusion.standard     |
|  - video.upscale.batch                            - image.batch.queue            |
+-------------------+-----------------------------------+---------------------------+
                    |                                   |
         +----------v-----------+            +----------v-----------+
         |  GPU Video Workers   |            |  GPU Image Workers   |
         |  (ComfyUI / TensorRT)|            |  (Diffusers / SDXL)  |
         +----------+-----------+            +----------+-----------+
                    |                                   |
                    +-----------------+-----------------+
                                      |
                                      v
+-----------------------------------------------------------------------------------+
|                              PERSISTENCE & STORAGE LAYER                          |
|  - PostgreSQL Database: Users, Teams, Workspaces, Token Ledger, Job Metadata      |
|  - S3-Compatible Object Store: Raw Video Renders, High-Res Images, Model Weights  |
|  - Prometheus & Grafana: Telemetry, Latency Histograms, GPU VRAM & Worker Alarms |
+-----------------------------------------------------------------------------------+
```

---

## 3. Repository Workspace Layout

The repository is structured to maintain strict separation of concerns across core studio applications, backend services, infrastructure automation, and deployment pipelines:

```text
framic-ai/
├── apps/
│   ├── web/                          # User-facing Next.js 15+ creator workspace & studio
│   ├── api/                          # High-throughput API gateway & auth proxy
│   └── worker-generation/            # Dedicated background GPU media rendering worker
├── packages/
│   ├── types/                        # Core domain contracts, schemas, and typed interfaces
│   ├── config/                       # Shared linter, formatter, and base configurations
│   └── observability/                # Shared telemetry, logging, and Prometheus interfaces
├── docs/
│   ├── 00-FOUNDATION/                # Vision, technical specifications, and architecture decisions
│   ├── 01-PRODUCT/                   # Product blueprint, user personas, and core workflows
│   ├── 02-DESIGN/                    # Design system tokens, typography, and UI rules
│   ├── 03-SPECS/                     # Detailed technical specs and data flow models
│   ├── 04-INFRASTRUCTURE/            # Deployment topology, environment layouts, CI/CD specifications
│   ├── 05-DATABASE/                  # Relational models, entity relationships, and access policies
│   ├── 06-API/                       # API endpoint specifications, schemas, and contracts
│   └── 07-UI-UX/                     # Screen hierarchies, layouts, and interaction maps
├── deploy/
│   ├── docker/                       # Container configuration targets (deferred to Commit 10)
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
- [ ] **Commit 6 — Infrastructure Planning** (Kubernetes, Docker, Prometheus, and CI/CD specs)
- [ ] **Commit 7 — Database Planning** (Relational schemas for Users, Teams, Tokens, and Jobs)
- [ ] **Commit 8 — API Planning** (OpenAPI contracts, WebSockets, and service endpoints)
- [ ] **Commit 9 — UI/UX Planning** (Studio layouts, generation timeline, and token ledger dashboard)
- [ ] **Commit 10 — Implementation Phase** (Production application code and components)
