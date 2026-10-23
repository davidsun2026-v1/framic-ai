# Repository Foundation: Monorepo Directory Layout

## 1. Architectural Layout Outline

This document defines the structural outline and service boundary contracts for the Framic AI monorepo established in **Commit 1 — Repository Foundation**.

```text
framic-ai/
├── apps/
│   ├── web/                          # User-facing Next.js 15+ creator workspace & studio
│   ├── api/                          # High-throughput API gateway & auth proxy
│   └── worker-generation/            # Dedicated background GPU media rendering worker
│
├── packages/
│   ├── types/                        # Core domain contracts, schemas, and typed interfaces
│   ├── config/                       # Shared linter, formatter, and base configurations
│   └── observability/                # Shared telemetry, logging, and Prometheus interfaces
│
├── docs/
│   ├── 00-FOUNDATION/                # Vision, technical specifications, and architecture decisions
│   ├── 01-PRODUCT/                   # Product blueprint, user personas, and core workflows
│   ├── 02-DESIGN/                    # Design system tokens, typography, and UI rules
│   ├── 03-SPECS/                     # Detailed technical specs and data flow models
│   ├── 04-INFRASTRUCTURE/            # Deployment topology, environment layouts, CI/CD specifications
│   ├── 05-DATABASE/                  # Relational models, entity relationships, and access policies
│   ├── 06-API/                       # API endpoint specifications, schemas, and contracts
│   └── 07-UI-UX/                     # Screen hierarchies, layouts, and interaction maps
│
├── deploy/
│   ├── docker/                       # Container configuration targets (deferred to Commit 10)
│   ├── k8s/                          # Cluster orchestration manifests (deferred to Commit 10)
│   └── monitoring/                   # Prometheus scrape & alerting rule targets (deferred to Commit 10)
│
├── supabase/
│   └── migrations/                   # Forward-only relational database schema migrations
│
├── .github/
│   └── workflows/                    # Continuous integration and delivery workflows
│
├── .env.example                      # Production environment template (no credentials committed)
├── .gitignore                        # Global repository ignore rules
├── package.json                      # Root workspace configuration
├── turbo.json                        # Monorepo build and pipeline orchestration
└── README.md                         # Top-level repository overview and structural index
```

---

## 2. Directory Responsibilities & Boundary Invariants

| Directory | Scope & Responsibility | Strict Invariants |
| :--- | :--- | :--- |
| `apps/web` | Host the web application interface, studio surfaces, and client interactions. | Isolated from backend database drivers; interacts via strict API contracts. |
| `apps/api` | Host the REST/RPC gateway, authentication validation, and token/credit orchestration. | Stateless service; communicates with workers via message broker. |
| `apps/worker-generation` | Process GPU-bound generation tasks asynchronously (text-to-image, video synthesis). | Runs isolated from public web traffic; pull-based queue consumer. |
| `packages/types` | Single source of truth for shared domain entities, status enums, and API schemas. | Zero runtime dependencies; pure TypeScript definitions. |
| `packages/config` | Shared toolchain settings (TypeScript base configs, Biome/ESLint standards). | Enforces uniform formatting and strict typing across all workspaces. |
| `packages/observability` | Standardized metrics naming conventions, logging contracts, and tracing definitions. | Pure contracts and abstractions for telemetry. |
| `deploy/` | Container definitions, orchestration manifests, and monitoring configurations. | Layout structure planned in Commit 1; implementation configurations in Commit 10. |

---

## 3. Structural Rules & Isolation Standards

1. **Independent Containerization**: Each service under `apps/` builds into an isolated container using pruned dependencies (`turbo prune`).
2. **Contract Centralization**: Inter-service messages and data structures must be sourced from `packages/types`.
3. **No Premature Implementation**: Implementation code, Dockerfile build instructions, and database DDL are strictly deferred until planning phases (Commits 1–9) are approved.
