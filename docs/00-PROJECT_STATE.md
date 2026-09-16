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

**Repository evidence and live production evidence can also disagree.** When they do, direct verification against the live running system (e.g. database introspection) is the tiebreaker, not the repository's own migration files or docs. Confirmed 2026-09-16: this repository's `supabase/migrations/` did not match the real production schema.

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

Note: real production has a `subscription_plans` table (verified 2026-09-16 via direct introspection), but its contents have not been read into this documentation and `SUBSCRIPTION_MATRIX.md` still does not exist. Do not cite plan names or pricing until that file is created from verified evidence.

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

Note: `apps/api` remains Not Found as of 2026-09-16. One backend-style route currently lives inside `apps/web/app/api/balance/route.ts` instead (a Next.js Route Handler, not a separate app). This is a reasonable interim pattern for a small route count but should be reconsidered if the API surface grows.

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

Status: Foundation complete; Authentication/Profiles/Credits/Billing/Asset Library partially built against a real production backend discovered 2026-09-16 (see `05-IMPLEMENTATION_STATUS.md` for full evidence).

Phase Completion:

- Foundation: In Progress
- Authentication: Partial — signup/signin/signout verified working against real production trigger; never runtime-tested via `next dev`
- Profiles: Partial — real table verified, read-only in dashboard, no edit UI
- Credits: Partial — real token-ledger backend verified, only balance read wired into app
- Billing: Partial — real backend RPCs verified (Paystack + Flutterwave), zero app-side integration
- AI Generation: Planned — real reservation-flow backend verified, no `/generate` route exists
- Asset Library: Partial — real table verified, read-only listing in dashboard
- Monitoring: Not Started
- Deployment: Unable To Verify

---

# Roadmap

## EPIC-001 Foundation

Status: In Progress

Tasks:

- [x] Monorepo configuration — `package.json`, `turbo.json` verified
- [ ] Shared package structure — only `packages/types` exists; incomplete
- [x] Web application scaffold — `apps/web` verified with working pages
- [ ] API application scaffold — `apps/api` Not Found
- [ ] Database migration foundation — file exists but does not match production (see Repository Truth Hierarchy note above); not trustworthy as-is
- [ ] Environment template — `.env.example` exists but describes a generic/stale configuration that does not match production; needs correction
- [x] Documentation baseline — this file + `05-IMPLEMENTATION_STATUS.md` now maintained as evidence-based

---

## EPIC-002 Authentication

Status: Partial

Tasks:

- [x] Supabase Auth integration — real `handle_new_user()` trigger verified working
- [x] Login page — `apps/web/app/login/page.tsx`
- [ ] Registration page — signup is a mode toggle within the login page, not a distinct page
- [ ] Password reset flow — no evidence found
- [x] Session handling — `apps/web/lib/auth/middleware-utils.ts`, `apps/web/app/auth/callback/route.ts`
- [x] Route protection — middleware guards `/dashboard`, `/generate`, `/settings`
- [ ] Authentication tests — none exist

---

## EPIC-003 Profiles

Status: Partial

Tasks:

- [x] Profiles table — verified in real production (`full_name`, `avatar_url`, `tier_level`, `subscription_status`, `account_status`)
- [ ] Profile API — Not Found
- [ ] Profile management UI — dashboard reads profile but has no edit UI
- [ ] Avatar support — column exists, no upload UI
- [ ] Profile tests — none exist

---

## EPIC-004 Credits System

Status: Partial

Tasks:

- [x] Credits schema — real production `token_ledgers`, `token_reservations`, `view_user_balances` verified
- [x] Ledger system — same as above
- [ ] Credit awarding — no app-level evidence of when/how tokens are granted
- [ ] Credit deductions — `reserve_generation_tokens`/`settle_generation_tokens` exist in the database but are not called from any app code yet
- [x] Audit history — RPCs write to `audit_logs`, verified via function definitions
- [ ] Credits tests — none exist

---

## EPIC-005 Billing & Subscriptions

Status: Partial

Tasks:

- [x] Subscription plans — `subscription_plans` table verified in real production
- [ ] Paystack integration — backend RPCs exist; no app-side checkout/integration code
- [ ] Webhook verification — no app-side webhook handler found
- [ ] Billing portal — Not Found
- [ ] Subscription sync — `apply_subscription_renewal` RPC exists; no verified app-level trigger/cron
- [ ] Billing tests — none exist

---

## EPIC-006 Asset Library

Status: Partial

Tasks:

- [x] Asset storage — `generated_assets` table verified (`asset_type`, `storage_url`, `generation_status`)
- [x] Asset ownership — RLS policies verified restricting rows to `user_id`
- [x] Asset listing — dashboard displays a user's assets (PR #8)
- [ ] Asset deletion — Not Found
- [ ] Asset search — Not Found
- [ ] Asset tests — none exist

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

Status: Planned — real production backend verified (`generation_jobs`, `reserve_generation_tokens` → `settle_generation_tokens`/`release_generation_tokens` → `finalize_generation_job`), no app-side route

Tasks:

- [ ] Text-to-image
- [ ] Image-to-image
- [ ] Generation queue
- [ ] Generation history
- [ ] Credit consumption
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

Status: Not Started

Tasks:

- [ ] Production build
- [ ] Environment configuration
- [ ] Database deployment
- [ ] Frontend deployment
- [ ] Backend deployment
- [ ] Smoke testing

---

# Current Work Item

Epic:
EPIC-002 Authentication (runtime verification) / EPIC-008 AI Generation (next build target)

Status:
Active

Last Completed Task:
Corrected `05-IMPLEMENTATION_STATUS.md` and this file's Roadmap/Phase sections to match verified 2026-09-16 evidence (PR #3 merge, this change)

Current Task:
Runtime verification of the Auth MVP — `next dev`/`next build` against real Supabase credentials, real signup through `/login`, confirm `/dashboard` balance display — see "Manual Verification Pending" in `05-IMPLEMENTATION_STATUS.md`. This requires a human or an environment with real credentials and network access; it cannot be performed from a sandboxed assistant session.

Next Task:
Once runtime-verified, begin EPIC-008 AI Generation: build `/generate` wired to the real, already-verified `reserve_generation_tokens` → `settle_generation_tokens`/`release_generation_tokens` flow.

Blockers:
- Runtime verification pending (needs a human-operated environment with real credentials)
- `supabase/migrations/` still not reconciled with real production schema
- PR #5 (Next.js 14→16) held pending the same runtime verification

---

# Last Verification

Verified By:
Direct repository inspection + live production Supabase database introspection

Verification Date:
2026-09-16

Verification Commit:
Merged via PRs #1, #3, #4, #6, #7, #8

Verification Confidence:
High for schema/backend claims (direct database introspection). Explicitly NOT verified: runtime behavior of `apps/web` (never run via `next dev`/`next build`).

---

# Change Control

Any implementation, architecture, documentation, migration, deployment, or configuration change must:

1. Be based on current repository evidence.
2. Preserve the source-of-truth hierarchy.
3. Update the appropriate authoritative documentation when behavior or architecture changes.
4. Avoid duplicate memory/state documents.
5. Use a feature/fix/docs/chore branch and pull request; do not commit directly to `main`.
6. Be reviewed against the actual resulting repository state before being considered complete.
