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

**Repository code and live production evidence can also disagree.** When they do, direct verification against the running system (e.g. database introspection) is the tiebreaker, not the repository's own migration files or docs. (Verified finding, 2026-09-16: this repo's `supabase/migrations/` did not match the real production schema. Update, 2026-09-20: the connected Supabase project's live schema now matches `supabase/migrations/20260910000000_init_schema.sql` table-for-table, which is strong evidence this connection is the correct FRAMIC AI project — see the Evidence Log below.)

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

Note: real production has `subscription_plans`/`subscriptions` tables and renewal RPCs (verified via direct database introspection, 2026-09-16), but `SUBSCRIPTION_MATRIX.md` still does not exist in this repository. Pricing/plan details therefore remain **Unable To Verify** from repository evidence alone, even though the underlying tables exist. A business document ("Framic AI — Subscription Tiers & Credit Unit Economics", supplied 2026-09-20) claims `docs/SUBSCRIPTION_TIERS.md` as its authoritative source; that file also does not exist in the repository. Per this section's own rule, an external document is not repository evidence — its pricing/tier figures remain **Unable To Verify** until a matching file exists in the repository at the governed path.

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

Note: `apps/api` remains Not Found as of 2026-09-16. One API route handler exists inside `apps/web/app/api/balance/route.ts` instead — this is Next.js Route Handler code living in the frontend app, not a separate backend application, and should be evaluated as such.

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

Status: Foundation substantially complete; Authentication working; several capabilities Partial due to a verified repository/production schema gap (see `05-IMPLEMENTATION_STATUS.md`).

Phase Completion:

- Foundation: In Progress
- Authentication: Partial — working end-to-end against real production (PRs #6, #7), never runtime-tested via `next dev`
- Profiles: Partial — dashboard reads real `profiles` table, no edit UI
- Credits: Partial — `credit_wallets`/`credit_transactions` schema verified live; `get_user_balance` (balance read) is wired and merged to `main` via PR #18; no reserve/settle/release/refund RPC or `token_ledgers`/`token_reservations`/`view_user_balances`/`audit_logs` objects exist anywhere — see Evidence Log below
- Billing: Not Started — schema exists (`payments`/`subscriptions`/`webhook_events`, verified live on the connected Supabase project); no Paystack-related RPCs found on direct introspection; zero app-side code — see `docs/02-MODULES/05-PAYSTACK.md`
- AI Generation: Not Started — `generation_jobs` schema exists; no reservation RPC or `/generate` route exists
- Asset Library: Partial — dashboard reads real `generated_assets` table, no write path
- Monitoring: Not Started
- Deployment: Unable To Verify

---

# Roadmap

## EPIC-001 Foundation

Status: In Progress

Tasks:

- [x] Monorepo configuration
- [x] Shared package structure (`packages/types` only; others planned)
- [x] Web application scaffold
- [ ] API application scaffold (`apps/api` Not Found)
- [x] Database migration foundation (exists, but does not match real production — see `05-IMPLEMENTATION_STATUS.md`)
- [ ] Environment template (`.env.example` verified to describe a different, generic setup — needs reconciliation)
- [x] Documentation baseline

---

## EPIC-002 Authentication

Status: Partial

Tasks:

- [x] Supabase Auth integration
- [x] Login page
- [x] Registration page (combined with login page)
- [ ] Password reset flow
- [x] Session handling
- [x] Route protection
- [ ] Authentication tests

---

## EPIC-003 Profiles

Status: Partial

Tasks:

- [x] Profiles table (real production, verified via introspection)
- [ ] Profile API
- [ ] Profile management UI
- [ ] Avatar support
- [ ] Profile tests

---

## EPIC-004 Credits System

Status: Partial

Tasks:

- [x] Credits schema — verified live on the connected Supabase project (`gkvvecskbkwpcsuatklm`, `pg_class` introspection, 2026-09-20): `credit_wallets`, `credit_transactions` (immutable ledger — `UPDATE`/`DELETE` blocked by RLS policy). `token_ledgers`, `token_reservations`, `view_user_balances`, and `audit_logs` do **not** exist in this database and are not defined anywhere in `supabase/migrations/`. Prior claims that these were "real production" objects are corrected as of this entry.
- [x] Balance read — `get_user_balance(p_user_id uuid)` exists live (`pg_proc` introspection, 2026-09-20), `STABLE SECURITY DEFINER`, reads `credit_wallets.balance` directly (not `view_user_balances`). Added by PR #18 (https://github.com/davidsun2026-v1/framic-ai/pull/18) and merged to `main` (2026-09-22); the migration `supabase/migrations/20260918000000_add_signup_trigger_and_balance_rpc.sql` is present in the default branch.
- [ ] Reserve/settle/release/refund RPCs — **Not found.** No function by these or similar names exists live or in the repository. `pg_proc` on the connected project returns exactly four `public`-schema functions: `get_user_balance`, `handle_new_user`, `rls_auto_enable`, `update_profiles_updated_at`.
- [ ] Credit awarding — no app code calls any credit-mutation RPC, because none exist yet.
- [ ] Credit deductions — same; no RPC exists to call.
- [ ] Audit history — **Not found.** No `audit_logs` table exists. `credit_transactions` is the only ledger-style table and nothing in application code currently writes to it.
- [ ] Credits tests

---

## EPIC-005 Billing & Subscriptions

Status: Not Started (app-side)

Tasks:

- [x] Subscription plans (real production tables exist; pricing content remains Unable To Verify per Subscription Governance)
- [ ] Paystack integration (schema exists — `payments`/`subscriptions`/`webhook_events`, verified live; no Paystack-related RPCs found in `pg_proc` on direct introspection; no app-side checkout/webhook code — see `docs/02-MODULES/05-PAYSTACK.md`)
- [ ] Webhook verification
- [ ] Billing portal
- [ ] Subscription sync
- [ ] Billing tests

---

## EPIC-006 Asset Library

Status: Partial

Tasks:

- [ ] Asset storage (no upload path in app code)
- [x] Asset ownership (real production RLS + `user_id` column verified)
- [x] Asset listing (dashboard reads real `generated_assets` table)
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

Status: Not Started (app-side)

Tasks:

- [ ] Text-to-image
- [ ] Image-to-image
- [ ] Generation queue (`generation_jobs` schema exists; no reservation RPC exists — see EPIC-004 correction above — and no app code)
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

- [ ] Production build (never run — see `05-IMPLEMENTATION_STATUS.md` Manual Verification Pending)
- [ ] Environment configuration
- [ ] Database deployment
- [ ] Frontend deployment
- [ ] Backend deployment
- [ ] Smoke testing

---

# Current Work Item

Epic:
EPIC-004 Credits (documentation reconciliation)

Status:
Active

Last Completed Task:
Updated `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md` to match the EPIC-004 reconciliation already recorded in this document (PR #19) — it previously still described the pre-2026-09-20 narrative (unidentified Supabase project, "BROKEN / NOT VERIFIED" credits) and contradicted this file's own findings. Also corrected the PR #18 status references in this document (below) from "open, not yet merged" to merged, since PR #18 merged 2026-09-22.

Current Task:
None active — awaiting review of the `05-IMPLEMENTATION_STATUS.md` reconciliation PR.

Next Task:
Address the one remaining open drift item: live RLS policy count/names on `webhook_events` do not match `supabase/migrations/20260910000000_init_schema.sql` (migration defines three policies; live has zero). Then proceed to the Manual Verification Pending checklist (runtime `next dev`/`next build`, auth/balance smoke tests) in `05-IMPLEMENTATION_STATUS.md`.

Blockers:
None.

---

# Evidence Log — EPIC-004 Credits Reconciliation (2026-09-20)

**Repository SHA inspected:** `main` @ `0ba55429673ac14bc6a12db4e6b013b0424d658f`; this correction committed on branch `docs/paystack-module-and-state-correction-2`.

**Supabase project inspected:** `gkvvecskbkwpcsuatklm` (connected project; no credentials or connection strings recorded here).

**Queries run and results (secrets omitted):**

```sql
select relname, relkind from pg_class c join pg_namespace n on c.relnamespace=n.oid
where n.nspname='public' and relname in ('token_ledgers','token_reservations','view_user_balances','audit_logs');
-- result: [] (zero rows — none of the four objects exist in any form)

select p.proname, pg_get_function_identity_arguments(p.oid) as args
from pg_proc p join pg_namespace n on p.pronamespace=n.oid where n.nspname='public' order by p.proname;
-- result: get_user_balance(p_user_id uuid), handle_new_user(), rls_auto_enable(), update_profiles_updated_at()

select tgname, tgrelid::regclass from pg_trigger where not tgisinternal order by tgname;
-- result: on_auth_user_created (auth.users), profiles_updated_at_trigger (profiles),
--         plus Supabase-internal triggers on cron.job/storage.*/realtime.subscription (not application-relevant)
```

**Files inspected:** `supabase/migrations/20260910000000_init_schema.sql`, `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md`, `README.md`, `docs/02-MODULES/03-CREDITS.md`, `apps/web/lib/auth/actions.ts`, `apps/web/lib/supabase/service.ts`, PR #18 (state at time of audit: open, merged: false, base SHA unchanged since creation — PR #18 merged 2026-09-22, two days after this audit).

**Discrepancies found:**
- This document's EPIC-004 section and Phase Completion line claimed `token_ledgers`/`token_reservations`/`view_user_balances`/`audit_logs` and verified reserve/settle/release/refund RPCs exist in "real production." None exist on the connected project.
- `apps/web/lib/supabase/service.ts` contained a comment claiming `get_user_balance` was "verified against production" reading from `view_user_balances`, and referenced a second RPC `reserve_generation_tokens` — neither claim holds; corrected in this same change.
- `apps/web/lib/auth/actions.ts` still references a migration filename (`20260915000000_add_user_signup_trigger.sql`) that never existed; the real fix landed in PR #18 as a differently-named file — corrected in this same change.
- At time of this audit (2026-09-20), PR #18's migration had been applied directly to the live database but had not yet been merged into `main`. PR #18 merged 2026-09-22; `main`'s `supabase/migrations/` now contains that migration file, so the repository migration chain matches live database state for these objects as of this update.

**Documentation corrections made:** this file (EPIC-004, Phase Completion, Repository Truth Hierarchy note, Subscription Governance note), `apps/web/lib/auth/actions.ts` comment, `apps/web/lib/supabase/service.ts` comment — all in PR #19. `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md` reconciled separately in a follow-up PR after PR #19 left it out of sync.

**Unable to verify:** whether PR #18 was tested against a clean/non-production database before being applied (no test-database evidence found in the repository or PR); production build/type-check/lint/test execution (no CI workflow runs these — see Checks in the accompanying PR).

---

# Last Verification

Verified By:
Repository Auditor (direct GitHub + Supabase introspection)

Verification Date:
2026-09-22

Verification Commit:
See `05-IMPLEMENTATION_STATUS.md` for the full evidence ledger corresponding to this date, and the Evidence Log above for the EPIC-004-specific record.

Verification Confidence:
High for repository file evidence and production database schema/RPC evidence (direct introspection). Unable To Verify for runtime application behavior (never executed).

---

# Change Control

Any implementation, architecture, documentation, migration, deployment, or configuration change must:

1. Be based on current repository evidence.
2. Preserve the source-of-truth hierarchy.
3. Update the appropriate authoritative documentation when behavior or architecture changes.
4. Avoid duplicate memory/state documents.
5. Use a feature/fix/docs/chore branch and pull request; do not commit directly to `main`.
6. Be reviewed against the actual resulting repository state before being considered complete.
