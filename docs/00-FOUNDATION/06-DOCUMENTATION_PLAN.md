# Documentation Plan

## Purpose
Define the complete documentation set so future implementation does not depend on guesswork.

## Structure

`00-FOUNDATION` — vision, requirements, architecture, decisions, status, documentation map.

`01-GETTING_STARTED` — local setup, environment, repository workflow.

`02-MODULES` — one contract document per product/system module.

`03-OPERATIONS` — security, database, deployment, incidents.

`03-SPECS` — versioned technical and policy specifications. Use `SPEC-NNN-...` filenames to avoid collisions with legacy numbered documents.

`04-TESTING` — test strategy, critical flows, release gates.

`05-ADVANCED` — provider abstraction, data governance, scaling.

`06-INFRASTRUCTURE` — local/staging infrastructure architecture and deployment planning.

## Completion rule
A module documentation file is complete when it defines purpose, scope, inputs/outputs, ownership, failure behavior, security rules, observability, data dependencies, acceptance criteria, and explicit non-goals. It may still be marked Planned until code exists.

## Canonical product modules
Authentication; Profiles; Credits; Subscriptions; Paystack; Replicate; Asset Library; Generation; Monitoring; Dashboard; API.

## Canonical epics
EPIC-001 Foundation through EPIC-011 Deployment. Documentation describes the target and acceptance boundaries; Linear tracks execution.


## Specification naming

Technical specifications in `docs/03-SPECS/` use stable `SPEC-NNN-...` identifiers rather than numeric prefixes that can collide with legacy document numbering. Current canonical specifications:

- `SPEC-001-REPLICATE-API-PIPELINE.md`
- `SPEC-002-CI-QUALITY-AND-THREAD-LOCKING.md`

## Infrastructure planning

The lean Docker MVP architecture is documented in `docs/06-INFRASTRUCTURE/00-LEAN_DOCKER_MVP.md`. Planning documentation is not evidence that Dockerfiles, Compose files, containers, or staging deployments have been implemented.