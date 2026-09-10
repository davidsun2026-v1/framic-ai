# Deployment

## Purpose
Define a controlled path from verified code to production.

## Target
Vercel for application hosting, Supabase for backend services, with external providers configured through managed secrets.

## Release gates
Build; lint; type-check; unit/integration tests; critical-flow verification; migration review; environment validation; observability check; smoke test.

## Rules
Do not claim automatic deployment until a real workflow/project connection is verified. Do not run destructive database reset commands in production. Rollouts must be traceable to a commit.

## Acceptance
A production deployment can be traced to a verified commit and its database/application changes are reproducible.

## Non-goals
Provider-specific account administration.
