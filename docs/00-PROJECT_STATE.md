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

Status: Foundation

Phase Completion:

- Foundation: In Progress
- Authentication: Not Started
- Profiles: Not Started
- Credits: Not Started
- Billing: Not Started
- AI Generation: Not Started
- Asset Library: Not Started
- Monitoring: Not Started
- Deployment: Not Started

---

# Roadmap

## EPIC-001 Foundation

Status: In Progress

Tasks:

- [ ] Monorepo configuration
- [ ] Shared package structure
- [ ] Web application scaffold
- [ ] API application scaffold
- [ ] Database migration foundation
- [ ] Environment template
- [ ] Documentation baseline

---

## EPIC-002 Authentication

Status: Not Started

Tasks:

- [ ] Supabase Auth integration
- [ ] Login page
- [ ] Registration page
- [ ] Password reset flow
- [ ] Session handling
- [ ] Route protection
- [ ] Authentication tests

---

## EPIC-003 Profiles

Status: Not Started

Tasks:

- [ ] Profiles table
- [ ] Profile API
- [ ] Profile management UI
- [ ] Avatar support
- [ ] Profile tests

---

## EPIC-004 Credits System

Status: Not Started

Tasks:

- [ ] Credits schema
- [ ] Ledger system
- [ ] Credit awarding
- [ ] Credit deductions
- [ ] Audit history
- [ ] Credits tests

---

## EPIC-005 Billing & Subscriptions

Status: Not Started

Tasks:

- [ ] Subscription plans
- [ ] Paystack integration
- [ ] Webhook verification
- [ ] Billing portal
- [ ] Subscription sync
- [ ] Billing tests

---

## EPIC-006 Asset Library

Status: Not Started

Tasks:

- [ ] Asset storage
- [ ] Asset ownership
- [ ] Asset listing
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

Status: Not Started

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
EPIC-001 Foundation

Status:
Active

Last Completed Task:
Repository documentation baseline

Current Task:
Repository verification and implementation audit

Next Task:
Verify actual repository structure against documentation

Blockers:
None

---

# Last Verification

Verified By:
Repository Auditor

Verification Date:
2026-09-11

Verification Commit:
Pending — governance update branch

Verification Confidence:
Repository evidence reviewed for the current documentation/governance change

---

# Change Control

Any implementation, architecture, documentation, migration, deployment, or configuration change must:

1. Be based on current repository evidence.
2. Preserve the source-of-truth hierarchy.
3. Update the appropriate authoritative documentation when behavior or architecture changes.
4. Avoid duplicate memory/state documents.
5. Use a feature/fix/docs/chore branch and pull request; do not commit directly to `main`.
6. Be reviewed against the actual resulting repository state before being considered complete.
