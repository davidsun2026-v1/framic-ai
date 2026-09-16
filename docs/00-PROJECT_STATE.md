# PROJECT STATE

## Purpose

This document is the operational source of truth for Framic AI.

Every AI agent, developer, reviewer, or auditor must read this file before performing work.

This file exists to prevent:

- Knowledge drift
- Assumptions
- Duplicate work
- Repository hallucinations
- Incorrect implementation claims
- Loss of project continuity across sessions
- Duplicate documentation that can drift out of sync

---

# AI Operations Protocol

## AI Startup Procedure

Before performing any development, audit, implementation, planning, database modification, documentation update, deployment work, or architectural change:

1. Read:
   - `docs/00-PROJECT_STATE.md`
   - `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md`

2. Verify repository state.

3. Verify current repository structure.

4. Verify current implementation evidence.

5. Verify latest migrations.

6. Verify current active epic.

7. Verify current module dependencies.

8. Verify deployment status.

9. Verify subscription configuration.

10. Continue only from verified repository evidence.

Never continue from memory.

This document is the command center. Do not create a separate memory/state file merely to duplicate information already governed here.

---

## Required Project Files

The following files must exist:

- `docs/00-PROJECT_STATE.md`
- `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md`

Recommended files, created only when the work genuinely requires them:

- `docs/04-TESTING/IMPLEMENTATION_CHECKLIST.md`
- `docs/04-TESTING/FRONTEND_STATUS.md`
- `docs/04-TESTING/BACKEND_STATUS.md`
- `docs/03-OPERATIONS/PRODUCTION_READINESS.md`
- `docs/02-MODULES/BILLING/SUBSCRIPTION_MATRIX.md`

The repository currently uses `docs/00-PROJECT_STATE.md` as the command center. Do not create `docs/00-FOUNDATION/00-PROJECT_STATE.md` as a duplicate unless the project structure is explicitly changed and the existing command-center role is intentionally migrated.

---

## Missing File Handling

If a required or recommended file does not exist:

1. Verify the path.
2. Confirm the file is absent from the repository.
3. Create the file only when it is genuinely needed by the current work or required by the project governance.
4. Use existing repository conventions for naming, location, structure, and formatting.
5. Document why the file was created.
6. Update this `PROJECT_STATE.md` when the new file materially changes the project documentation structure or operational source of truth.

Never assume a missing file exists.
Never create duplicate state, memory, or status files merely because a similar document would be convenient.

---

## Repository Audit Procedure

For every audit:

### Step 1
List actual repository contents.

### Step 2
Compare repository contents against documentation.

### Step 3
Identify discrepancies.

### Step 4
Cite exact file paths for implementation evidence.

### Step 5
Recommend corrections.

### Step 6
Provide proposed changes before commit.

### Status classifications

Use only:

- **Implemented** — verified implementation evidence exists.
- **Partial** — some implementation evidence exists, but the capability is incomplete.
- **Planned** — described by requirements/design but implementation evidence is absent.
- **Not Found** — the expected implementation or file was searched for and not found.
- **Unable To Verify** — evidence could not be established with the available repository/configuration access.

Documentation, README claims, issue descriptions, TODOs, dependency declarations, and folder names do not by themselves establish implementation.

---

# Repository Truth Hierarchy

Highest Authority:

1. Source Code
2. Database Migrations
3. Tests
4. CI/CD Workflows
5. Infrastructure Configuration

Lower Authority:

6. Package Configuration
7. Environment Templates
8. Generated Types

Non-Implementation Evidence:

9. Documentation
10. README Files
11. Issues
12. Discussions
13. TODO Comments

If code and documentation disagree:

**CODE WINS.**

Documentation must be corrected.

**Repository evidence and live production evidence can also disagree.** When they do, direct database/API introspection of the actual running system is the tiebreaker, not the repo's own migration files or docs (verified finding, 2026-09-16 — see `05-IMPLEMENTATION_STATUS.md`).

---

# Subscription Governance

Subscription data may only be sourced from:

`docs/02-MODULES/BILLING/SUBSCRIPTION_MATRIX.md`

If the file does not exist, or its contents cannot be verified:

**Status: Unable To Verify**

Do not invent:

- Plan names
- Pricing
- Credit allocations
- Limits
- Billing cycles

Do not treat README, UI copy, environment variables, code constants, or provider configuration as the subscription source of truth unless the repository explicitly establishes that authority.

Note: real production has a `subscription_plans` table (verified via direct introspection, 2026-09-16), but `SUBSCRIPTION_MATRIX.md` still does not exist in this repository. Plan names/pricing/limits remain **Unable To Verify** until that file is created from verified production data.

---

# Frontend / Backend Verification

## Frontend Verification

**Authority:** `apps/web`

Evidence examples:

- Pages
- Routes
- Components
- Layouts
- Build configuration
- Tests

No evidence = no claim.

## Backend Verification

**Authority:** `apps/api`

Evidence examples:

- Routes
- Services
- Controllers
- Middleware
- Validation
- Tests

No evidence = no claim.

If the expected application directory is absent, classify the capability as **Not Found** rather than assuming it exists elsewhere.

Note: `apps/api` remains **Not Found**. A small number of API routes exist inside `apps/web/app/api/` instead (e.g. `apps/web/app/api/balance/route.ts`) — this is Next.js Route Handler code within the frontend app, not a separate backend application, and should not be conflated with `apps/api` when auditing backend status.

---

# Production Verification

A project is not considered live or production-ready unless verified evidence exists for:

- Frontend deployment
- Backend deployment
- Production database
- Environment configuration
- Monitoring
- Billing
- Testing

If any required component cannot be verified:

**Status: Not Verified**

Do not claim production readiness.

Note: a real, populated production Supabase database has been verified to exist (2026-09-16, direct introspection — 35 tables, working RPCs, real schema). This satisfies "production database" evidence. Frontend/backend deployment, monitoring, and billing integration remain unverified — production readiness as a whole is still **Not Verified**.

---

# Anti-Hallucination Rule

When evidence is unavailable:

**STOP.**

Do not:

- Assume
- Guess
- Estimate
- Infer
- Extrapolate

Use only:

- Verified
- Partially Verified
- Planned
- Not Found
- Unable To Verify

Unknown information remains unknown until repository evidence is found.

Never claim implementation because:

- README says so
- Documentation says so
- Issue says so
- TODO says so
- Dependency exists
- Folder exists
- Configuration exists

Only verified implementation evidence may change status.

Required evidence includes the applicable source code, database migrations, tests, workflows, and deployment verification.

**No evidence = no claim.**

---

# Current Repository State

## Project

Framic AI

## Product Vision

Framic AI is a creator-focused AI platform providing:

- AI image generation
- AI video generation
- Asset management
- Subscription billing
- Credit consumption
- Creator monetization workflows
- Enterprise-grade scalability
- Auditable generation history

---

# Current Development Phase

Status: Foundation → Early Build

Phase Completion (corrected 2026-09-16 to match `05-IMPLEMENTATION_STATUS.md`; this section previously said every phase was "Not Started," which was already false by the time this file was written):

- Foundation: In Progress
- Authentication: Partial — signup/signin/signout verified working against real production trigger; never runtime-tested via `next dev`
- Profiles: Partial — real production table verified, read-only in dashboard, no edit UI
- Credits: Partial — mature production token-ledger backend verified; only balance read is wired into app code
- Billing: Not Started (app-side) — production has payment/subscription RPCs, but zero app-side integration
- AI Generation: Not Started — production has the full token-reservation flow; no `/generate` route exists
- Asset Library: Partial — production table verified, read-only listing in dashboard
- Monitoring: Not Started
- Deployment: Unable To Verify

---

# Roadmap

## EPIC-001 Foundation

Status: In Progress

Tasks:

- [x] Monorepo configuration
- [x] Shared package structure (`packages/types` only; others not yet created)
- [x] Web application scaffold
- [ ] API application scaffold (`apps/api` — Not Found)
- [x] Database migration foundation (exists, but does not match production — see `05-IMPLEMENTATION_STATUS.md`)
- [ ] Environment template (`.env.example` verified to reference unrelated/generic boilerplate, not the real stack — needs rewrite)
- [x] Documentation baseline

---

## EPIC-002 Authentication

Status: Partial

Tasks:

- [x] Supabase Auth integration
- [x] Login page
- [x] Registration page (same form as login, mode-toggled)
- [ ] Password reset flow
- [x] Session handling (middleware)
- [x] Route protection (middleware)
- [ ] Authentication tests

---

## EPIC-003 Profiles

Status: Partial

Tasks:

- [x] Profiles table (real production table verified; repo migration file does not match it)
- [ ] Profile API
- [ ] Profile management UI (dashboard reads profile, does not edit it)
- [ ] Avatar support
- [ ] Profile tests

---

## EPIC-004 Credits System

Status: Partial

Tasks:

- [x] Credits schema (real production `token_ledgers`/`token_reservations`; repo migration's `credit_wallets` does not exist in production)
- [x] Ledger system (verified via direct introspection: `reserve_generation_tokens`, `settle_generation_tokens`, `release_generation_tokens`, `refund_generation_tokens`)
- [ ] Credit awarding (app-side — not wired)
- [ ] Credit deductions (app-side — not wired)
- [x] Audit history (`audit_logs` table referenced by ledger functions)
- [ ] Credits tests

---

## EPIC-005 Billing & Subscriptions

Status: Not Started (app-side)

Tasks:

- [ ] Subscription plans (table exists in production; no `SUBSCRIPTION_MATRIX.md`, no app code)
- [ ] Paystack integration (production RPCs exist; no app-side checkout/webhook)
- [ ] Webhook verification
- [ ] Billing portal
- [ ] Subscription sync
- [ ] Billing tests

---

## EPIC-006 Asset Library

Status: Partial

Tasks:

- [x] Asset storage (real production `generated_assets` table verified)
- [x] Asset ownership (RLS own-row SELECT policy verified)
- [x] Asset listing (dashboard reads it)
- [ ] Asset deletion
- [ ] Asset search
- [ ] Asset tests

---

## EPIC-007 AI Providers

Status: Not Started

Tasks:

- [ ] Replicate integration
- [ ] Provider abstraction
- [ ] Provider failover
- [ ] Generation tracking
- [ ] Provider tests

---

## EPIC-008 AI Generation

Status: Not Started (app-side; production backend flow verified to already exist)

Tasks:

- [ ] Text-to-image
- [ ] Image-to-image
- [ ] Generation queue (production `generation_jobs` + reservation RPCs exist; no app integration)
- [ ] Generation history
- [ ] Credit consumption (app-side)
- [ ] Generation tests

---

## EPIC-009 Monitoring

Status: Not Started

Tasks:

- [ ] Sentry integration
- [ ] Structured logging
- [ ] Health checks
- [ ] Alerting
- [ ] Monitoring verification

---

## EPIC-010 Deployment

Status: Unable To Verify

Tasks:

- [ ] Production build (never run — see `05-IMPLEMENTATION_STATUS.md` Manual Verification Pending)
- [ ] Environment configuration
- [ ] Database deployment (production database itself verified to exist and be populated with real schema)
- [ ] Frontend deployment
- [ ] Backend deployment
- [ ] Smoke testing

---

# Current Work Item

Epic:
EPIC-002 Authentication (active development), with EPIC-001 Foundation still in progress in parallel

Status:
Partial

Last Completed Task:
PR #8 — corrected dashboard and added `/api/balance` route to read real production schema instead of the repo's non-matching migration file

Current Task:
Runtime verification of `apps/web` (`next dev`/`next build` against real credentials) — never yet performed; see "Manual Verification Pending" in `05-IMPLEMENTATION_STATUS.md`

Next Task:
Reconcile `supabase/migrations/` with the real production schema (baseline migration), and/or scope EPIC-008 generation flow against the production RPCs that already exist

Blockers:
- `supabase/migrations/20260910000000_init_schema.sql` does not match production and should not be trusted as schema source of truth
- PR #5 (Next.js 14→16, a 2-major-version dependency bump) needs runtime testing before merge, not just CI

---

# Last Verification

Verified By:
Repository Auditor (direct production database introspection performed this session)

Verification Date:
2026-09-16

Verification Commit:
Multiple — see merged PRs #1, #4, #6, #7, #8 and this reconciliation commit

Verification Confidence:
High for schema/backend claims (direct introspection). Unable To Verify for runtime application behavior (never executed).

---

# Change Control

Any implementation, architecture, documentation, migration, deployment, or configuration change must:

1. Be based on current repository evidence.
2. Preserve the source-of-truth hierarchy.
3. Update the appropriate authoritative documentation when behavior or architecture changes.
4. Avoid duplicate memory/state documents.
5. Use a feature/fix/docs/chore branch and pull request; do not commit directly to `main`.
6. Be reviewed against the actual resulting repository state before being considered complete.
