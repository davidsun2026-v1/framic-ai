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

# Verification Rules

## Repository Truth Hierarchy

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

CODE WINS.

Documentation must be corrected.

---

# Repository Auditor Rule

Before any implementation work:

Required Reading Order:

1. PROJECT_STATE.md
2. IMPLEMENTATION_STATUS.md
3. Current Epic Document
4. Current Module Document
5. Latest Repository State

No work may begin from memory.

Repository state must be re-verified.

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

# Subscription Source Of Truth

Subscription pricing may only be defined in:

docs/02-MODULES/BILLING/SUBSCRIPTION_MATRIX.md

If pricing cannot be found there:

DO NOT ASSUME PRICING.

Status:
Unable To Verify

---

# Frontend Status

Authority Source:

apps/web

Evidence Required:

- UI pages
- Components
- Routing
- Build configuration

Without repository evidence:

Status = Unable To Verify

---

# Backend Status

Authority Source:

apps/api

Evidence Required:

- Routes
- Services
- Controllers
- Validation
- Tests

Without repository evidence:

Status = Unable To Verify

---

# Production Readiness

A deployment is only considered live when all are verified:

- [ ] Production frontend
- [ ] Production backend
- [ ] Production database
- [ ] Production environment variables
- [ ] Monitoring
- [ ] Billing verification
- [ ] Smoke tests
- [ ] Security review

Missing evidence means:

NOT LIVE

---

# Unverified Assumption Protocol

When information is unavailable:

STOP.

Do not:

- Assume
- Estimate
- Infer
- Extrapolate
- Guess

Instead:

Use one of:

- Verified
- Partially Verified
- Planned
- Not Found
- Unable To Verify

Unknown information remains unknown until repository evidence is found.

---

# Anti-Hallucination Rule

Never claim implementation because:

- README says so
- Documentation says so
- Issue says so
- TODO says so
- Dependency exists
- Folder exists
- Configuration exists

Only verified implementation evidence may change status.

Required evidence:

- Source code
- Database migrations
- Tests
- Workflows
- Deployment verification

No evidence = no claim.

---

# Last Verification

Verified By:
Repository Auditor

Verification Date:
YYYY-MM-DD

Verification Commit:
UNKNOWN

Verification Confidence:
Pending


