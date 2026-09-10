# Framic AI — AI Creator Platform

Framic AI is a planned production SaaS for creator-grade AI image and video generation, with subscriptions, credits, payments, asset ownership, and auditable generation workflows.

> **Repository truth:** this repository currently contains the foundation documentation and monorepo configuration. The application, database implementation, integrations, tests, CI/CD, and production deployment are not yet implemented.

## Product vision

Build a unified creator workspace where users can:
- create AI images and, later, video;
- manage generated assets;
- purchase subscriptions/credits through real payment flows;
- consume credits through an auditable generation ledger;
- see truthful generation status and history.

## Product phases

### Phase 1 — MVP
Authentication, profiles, dashboard, credits, subscriptions, Paystack, text-to-image, image-to-image, asset library, monitoring, and production release foundation.

### Phase 2
Text-to-video, image-to-video, video extensions, and project workspaces.

### Phase 3
Marketplace, team collaboration, and shared asset permissions.

## Architecture direction

- Next.js + TypeScript + Tailwind + shadcn/ui
- Turborepo monorepo
- Supabase/PostgreSQL and Supabase Auth
- Replicate behind a provider adapter
- Paystack for payments
- Sentry for observability
- Vercel for application hosting

Supabase Auth is the identity authority; application profile data belongs in `public.profiles`. See the architecture decisions before implementing authentication.

## Non-negotiable invariants

1. No mock production payment success.
2. No client-controlled credit awards or deductions.
3. Credits are atomic and auditable.
4. Every generation attempt is tracked.
5. Every asset has an owner and authorization boundary.
6. Payment/subscription state comes from verified provider evidence.
7. Secrets never enter client code or source control.
8. Production status is never claimed without repository evidence.

## Repository structure

```text
framic-ai/
├── apps/                       # application workspaces (to be implemented)
│   ├── web/
│   └── api/
├── packages/                  # shared workspaces (to be implemented)
│   ├── ui/
│   ├── core/
│   ├── types/
│   └── utils/
├── docs/
│   ├── 00-FOUNDATION/
│   ├── 01-GETTING_STARTED/
│   ├── 02-MODULES/
│   ├── 03-OPERATIONS/
│   ├── 04-TESTING/
│   └── 05-ADVANCED/
├── .env.example
├── package.json
└── turbo.json
```

## Documentation

The documentation set is intentionally complete before implementation so future work is driven by explicit contracts rather than guesses. Start with:

- `docs/00-FOUNDATION/01-PROJECT_CHARTER.md` — product vision and scope
- `docs/00-FOUNDATION/02-TECHNICAL_SPECIFICATIONS.md` — technical requirements
- `docs/00-FOUNDATION/03-ARCHITECTURE.md` — system boundaries
- `docs/00-FOUNDATION/04-ARCHITECTURE_DECISIONS.md` — resolved architectural decisions
- `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md` — evidence-based status
- `docs/00-FOUNDATION/06-DOCUMENTATION_PLAN.md` — complete documentation inventory
- `docs/02-MODULES/` — module contracts
- `docs/03-OPERATIONS/` — security, database, deployment, incidents
- `docs/04-TESTING/` — verification and release gates

## Delivery model

Work is organized into these epics:

`EPIC-001 Foundation` → `EPIC-002 Authentication` → `EPIC-003 User Profiles` → `EPIC-004 Credits System` → payment/provider work → `EPIC-009 AI Generation` → `EPIC-008 Asset Library` → `EPIC-010 Monitoring` → `EPIC-011 Deployment`.

Some payment/provider work may proceed in parallel after their dependencies are satisfied.

## Verification rule

A command or feature is considered available only after its required files exist and the command has been run successfully. Documentation is not evidence of implementation.

## License

MIT. See `LICENSE`.

**Status:** Foundation / documentation phase — implementation not yet started.
