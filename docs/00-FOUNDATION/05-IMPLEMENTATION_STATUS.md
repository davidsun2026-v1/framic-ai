# Implementation Status

## Purpose
Single evidence-based ledger separating what exists from what is designed, implemented, and runtime-verified.

**Verified baseline (2026-09-20):** the connected Supabase project (`gkvvecskbkwpcsuatklm`) has been directly introspected via `pg_class`/`pg_proc`/`pg_trigger`, and its live schema matches `supabase/migrations/20260910000000_init_schema.sql` table-for-table. This is strong evidence the connection is the correct FRAMIC AI project, superseding the earlier (2026-09-16) finding that no identifiable FRAMIC project was reachable. The application/documentation references to a token-ledger/RPC contract (`token_ledgers`, `token_reservations`, `view_user_balances`, `audit_logs`) were checked directly against this project and found not to exist anywhere — repository code and docs claiming otherwise have been corrected (see `docs/00-PROJECT_STATE.md`, EPIC-004).

See `docs/00-FOUNDATION/07-SUPABASE-CONTRACT-AUDIT.md` for the detailed reconciliation and exit criteria.

| Capability | Status | Evidence rule |
|---|---|---|
| Product foundation | VERIFIED | Charter/specification and foundation documents exist |
| Monorepo config | PARTIAL | Root configuration and initial workspace structure exist |
| Web app | PARTIAL | `apps/web` exists with Next.js configuration, auth callback/actions, Supabase clients, middleware, and application routes |
| API | PARTIAL | App Router API route exists (`/api/balance`); dedicated `apps/api` does not exist |
| Shared packages | PARTIAL | `packages/types` exists; other planned shared packages are not fully implemented |
| Supabase schema/migrations | PARTIAL | `supabase/migrations/20260910000000_init_schema.sql` and `20260918000000_add_signup_trigger_and_balance_rpc.sql` define the current schema/trigger/RPC set; verified live table-for-table on the connected project |
| Authentication | PARTIAL | Auth actions use real Supabase Auth methods. `on_auth_user_created` trigger is defined in `20260918000000_add_signup_trigger_and_balance_rpc.sql` and verified live via `pg_trigger`; never runtime-tested via `next dev` |
| Profiles | PARTIAL | `public.profiles` verified live via introspection; exact production columns confirmed for `full_name` (used by dashboard) |
| Credits | PARTIAL | Schema verified live: `credit_wallets`, `credit_transactions` (immutable ledger). Only RPC is `get_user_balance(p_user_id)`, verified live via `pg_proc`, added by `20260918000000_add_signup_trigger_and_balance_rpc.sql`. No reserve/settle/release/refund RPCs or `token_ledgers`/`token_reservations`/`view_user_balances`/`audit_logs` exist anywhere — prior claims to the contrary are corrected |
| Subscriptions | PARTIAL | `subscription_plans`/`subscriptions` schema verified live; pricing/plan content remains Unable To Verify per Subscription Governance (`docs/02-MODULES/BILLING/SUBSCRIPTION_MATRIX.md` does not exist) |
| Paystack | PLANNED | `payments`/`subscriptions`/`webhook_events` schema verified live; no Paystack-related RPCs found via `pg_proc`; zero application code (checkout/webhook) — see `docs/02-MODULES/05-PAYSTACK.md` |
| Replicate | NOT VERIFIED | Provider integration is not proven in the current repository |
| Asset library | PARTIAL | `generated_assets` schema verified live; dashboard reads it; no write path |
| Generation | NOT VERIFIED | `generation_jobs` schema exists; no reservation RPC exists (see Credits row above) and no app code |
| Monitoring | PLANNED | Requirements/documentation only |
| Tests | NOT VERIFIED | Test configuration exists, but required test execution evidence is pending |
| CI/CD | PARTIAL | CodeQL workflow exists and has prior passing evidence; application build/type-check verification remains a release gate |
| Deployment | NOT VERIFIED | Repository evidence alone does not prove a live production deployment |

## Supabase contract findings

### Verified in repository

- `supabase/migrations/20260910000000_init_schema.sql` exists and defines `profiles`, `credit_wallets`, `credit_transactions`, `subscriptions`, `payments`, `generated_assets`, `generation_jobs`, and `webhook_events`.
- `supabase/migrations/20260918000000_add_signup_trigger_and_balance_rpc.sql` exists and defines the `on_auth_user_created` trigger (`handle_new_user()`) and `get_user_balance(p_user_id)` RPC.
- RLS policies and core constraints are defined for those tables in the init migration.
- `apps/web/lib/supabase/client.ts`, `server.ts`, and `service.ts` exist.
- `apps/web/lib/auth/actions.ts` calls real Supabase Auth methods.

### Resolved repository contracts (previously broken)

1. `apps/web/lib/auth/actions.ts` previously referenced a non-existent `20260915000000_add_user_signup_trigger.sql`. The actual trigger now ships in `20260918000000_add_signup_trigger_and_balance_rpc.sql`, verified live, and the code comment has been corrected.
2. `apps/web/lib/supabase/service.ts` previously claimed `get_user_balance` read from `view_user_balances`. Verified live via `pg_proc`: it reads `credit_wallets.balance` directly. `view_user_balances` does not exist. Comment corrected.
3. Repository documentation previously referenced `token_ledgers`, `token_reservations`, and token-generation RPCs. Verified live via `pg_class`/`pg_proc`: none of these objects exist. Documentation corrected in `docs/00-PROJECT_STATE.md` (EPIC-004).

### Known open drift (not yet resolved)

- Live RLS policy count/names on `webhook_events` do not match `20260910000000_init_schema.sql` (migration defines three policies; live has zero). Net security behavior is unaffected today (RLS default-denies with no policy; service role bypasses RLS regardless), but this should be reconciled before webhook write logic is built — see `docs/00-FOUNDATION/07-SUPABASE-CONTRACT-AUDIT.md`.

### Production verification boundary

The connected Supabase project (`gkvvecskbkwpcsuatklm`) is confirmed, via direct introspection matching the repository's own migration schema table-for-table, to be the FRAMIC AI project referenced by this repository. Object-level facts stated above (tables, RPCs, triggers) are Verified by direct introspection. Runtime application behavior (e.g. `next dev`/`next build`, end-to-end auth/balance smoke tests) remains **NOT VERIFIED** — see Manual Verification Pending below.

## Manual Verification Pending

The following remain release gates:

- [x] Identify the authoritative FRAMIC AI Supabase project/ref. — Resolved 2026-09-20: `gkvvecskbkwpcsuatklm` confirmed via table-for-table schema match.
- [x] Introspect live tables, columns, constraints, indexes, RLS policies, functions, views, and auth triggers. — Done via `pg_class`/`pg_proc`/`pg_trigger` (see `docs/00-PROJECT_STATE.md` Evidence Log).
- [ ] Reconcile the live contract with repository migrations. — Object-level reconciliation done for tables/RPC/trigger; RLS policy drift on `webhook_events` still open (see above).
- [x] Verify `get_user_balance()` signature. — Verified live: `get_user_balance(p_user_id uuid)`, `STABLE SECURITY DEFINER`. No token reservation/settlement RPCs exist to verify — confirmed not found.
- [x] Verify signup creates the required application profile/wallet state. — Verified live: `on_auth_user_created` trigger inserts `profiles` + `credit_wallets` rows.
- [ ] Run `npm run dev` against valid development credentials.
- [ ] Run type-check, lint, tests, and production build successfully.
- [ ] Perform a real authentication smoke test.
- [ ] Perform a real balance-read smoke test.

## Rule

Documentation is never implementation evidence. A capability becomes VERIFIED only when the required repository artifacts and/or live system behavior have been directly evidenced. When repository and production contracts disagree, the actual target production system must be inspected before modifying the migration chain.
