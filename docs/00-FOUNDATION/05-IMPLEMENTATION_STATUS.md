# Implementation Status

## Purpose
Single evidence-based ledger separating what exists from what is designed, implemented, and runtime-verified.

**Verified baseline (2026-09-16):** the repository contains a substantial foundation and an initial Supabase schema migration. The current application code also references a newer production-style token/RPC contract. Those contracts are not fully represented by the repository migration chain. The authoritative FRAMIC AI production Supabase project is not currently identifiable through the connected Supabase account, so no production-schema claim is made here without direct target-project evidence.

See `docs/00-FOUNDATION/07-SUPABASE-CONTRACT-AUDIT.md` for the detailed reconciliation and exit criteria.

| Capability | Status | Evidence rule |
|---|---|---|
| Product foundation | VERIFIED | Charter/specification and foundation documents exist |
| Monorepo config | PARTIAL | Root configuration and initial workspace structure exist |
| Web app | PARTIAL | `apps/web` exists with Next.js configuration, auth callback/actions, Supabase clients, middleware, and application routes |
| API | PARTIAL | App Router API route exists (`/api/balance`); dedicated `apps/api` does not exist |
| Shared packages | PARTIAL | `packages/types` exists; other planned shared packages are not fully implemented |
| Supabase schema/migrations | PARTIAL / DRIFT | `supabase/migrations/20260910000000_init_schema.sql` defines the initial wallet/credit schema, while current application/status evidence references a token-ledger/RPC contract not represented by that migration |
| Authentication | PARTIAL | Auth actions use real Supabase Auth methods. Signup references an `on_auth_user_created` trigger migration that is absent from the repository migration directory |
| Profiles | PARTIAL | Initial repository schema defines `public.profiles`; exact target production columns are not verified for the FRAMIC target project |
| Credits | BROKEN / NOT VERIFIED | App balance path calls `get_user_balance`; the repository migration does not define that RPC or `view_user_balances`. Token-ledger/reservation production claims require direct target-project verification |
| Subscriptions | PARTIAL | Initial subscription schema exists; executable provider renewal flow is not verified for the FRAMIC target project |
| Paystack | NOT VERIFIED | Payment schema exists, but no complete app-side checkout/webhook fulfillment flow is proven |
| Replicate | NOT VERIFIED | Provider integration is not proven in the current repository |
| Asset library | PARTIAL | `generated_assets` schema exists; exact target production contract is not verified |
| Generation | NOT VERIFIED | `generation_jobs` schema exists, but executable provider submission and token settlement flow is not proven |
| Monitoring | PLANNED | Requirements/documentation only |
| Tests | NOT VERIFIED | Test configuration exists, but required test execution evidence is pending |
| CI/CD | PARTIAL | CodeQL workflow exists and has prior passing evidence; application build/type-check verification remains a release gate |
| Deployment | NOT VERIFIED | Repository evidence alone does not prove a live production deployment |

## Supabase contract findings

### Verified in repository

- `supabase/migrations/20260910000000_init_schema.sql` exists.
- The migration defines `profiles`, `credit_wallets`, `credit_transactions`, `subscriptions`, `payments`, `generated_assets`, `generation_jobs`, and `webhook_events`.
- RLS policies and core constraints are defined for those tables.
- `apps/web/lib/supabase/client.ts`, `server.ts`, and `service.ts` exist.
- `apps/web/lib/auth/actions.ts` calls real Supabase Auth methods.

### Broken repository contracts

1. `apps/web/lib/auth/actions.ts` references `20260915000000_add_user_signup_trigger.sql`, but that migration is not present in `supabase/migrations/`.
2. `apps/web/lib/supabase/service.ts` calls `get_user_balance(p_user_id)` and documents `view_user_balances`, but neither is defined by the repository's only migration.
3. Repository documentation references `token_ledgers`, `token_reservations`, and token-generation RPCs, but the migration chain does not define those objects.

### Production verification boundary

The connected Supabase account currently exposes the STRIKE GEN AI project. It does not provide an identifiable FRAMIC AI production project in the available project list. Therefore FRAMIC production schema, RPCs, triggers, RLS, and deployed migrations remain **NOT VERIFIED** from the current connection.

No speculative production migration has been created.

## Manual Verification Pending

The following remain release gates:

- [ ] Identify the authoritative FRAMIC AI Supabase project/ref.
- [ ] Introspect live tables, columns, constraints, indexes, RLS policies, functions, views, and auth triggers.
- [ ] Reconcile the live contract with repository migrations.
- [ ] Verify `get_user_balance()` and all token reservation/settlement RPC signatures.
- [ ] Verify signup creates the required application profile/wallet state.
- [ ] Run `npm run dev` against valid development credentials.
- [ ] Run type-check, lint, tests, and production build successfully.
- [ ] Perform a real authentication smoke test.
- [ ] Perform a real balance-read smoke test.

## Rule

Documentation is never implementation evidence. A capability becomes VERIFIED only when the required repository artifacts and/or live system behavior have been directly evidenced. When repository and production contracts disagree, the actual target production system must be inspected before modifying the migration chain.
