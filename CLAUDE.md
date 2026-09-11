# Framic AI — Agent Context

## Repository truth (verify before trusting this section)
Foundation/documentation phase. Do not claim a capability is implemented
because a doc describes it — see `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md`
for the evidence-based ledger, and reconcile it against actual files before
relying on it (it may lag behind `apps/web`).

## Stack
Next.js, TypeScript, Tailwind, shadcn/ui, Turborepo monorepo,
Supabase/PostgreSQL + Supabase Auth, Replicate (behind a provider adapter),
Paystack, Sentry, Vercel.

## Phases
- Phase 1 (MVP, in progress): auth, profiles, dashboard, credits,
  subscriptions, Paystack, text-to-image, image-to-image, asset library,
  monitoring, production release foundation.
- Phase 2 (not started): text-to-video, image-to-video, project workspaces.
- Phase 3 (not started): marketplace, team collaboration, shared assets.

## Non-negotiable invariants
1. No mock production payment success.
2. No client-controlled credit awards or deductions.
3. Credits are atomic and auditable.
4. Every generation attempt is tracked.
5. Every asset has an owner and authorization boundary.
6. Payment/subscription state comes from verified provider evidence only.
7. Secrets never enter client code or source control.
8. Production status is never claimed without repository evidence.

## Workflow rules
- Work from an issue/epic with explicit acceptance criteria (Linear).
- No direct commits to `main` — feature/fix/docs/chore branches, PR only.
- Update documentation in the same PR as the behavior/architecture change.
- Do not merge claims that were not verified (run the check, don't assume).
- Supabase migrations are reviewed like code — never run ad hoc against prod.

## Tooling available to agents
GitHub and Supabase are available via MCP (project config in `.mcp.json`;
see `docs/01-GETTING_STARTED/04-AI_AGENT_SETUP.md`). Use them to read/verify
repo and schema state — writes still go through the PR workflow above.

# Framic AI — CLAUDE.md

## Stack
Next.js, TypeScript, Tailwind, shadcn/ui, Supabase/Postgres,
Replicate, Paystack, Vercel, Sentry

## Current phase
Phase 1 MVP: auth, profiles, credits, subscriptions, Paystack,
text-to-image, asset library, generation history
(Phase 2/3 not started — video, teams, marketplace)

## Commands
npm run dev / build / lint / typecheck
supabase db diff / db push (never against prod directly)

## Hard rules
- No direct push to main — PR only
- Every generation touches credit_wallets + credit_transactions,
  no exceptions
- AI provider calls go through the provider-abstraction layer,
  never called directly
- RLS required on every new table
- Docs (README/spec/architecture/DB/API) updated in the same PR
  as the feature, not after
