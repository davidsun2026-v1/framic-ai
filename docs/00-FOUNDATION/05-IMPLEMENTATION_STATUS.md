# Implementation Status

## Purpose
Single evidence-based ledger separating what exists from what is only designed.

**Verified baseline (2026-09-16):** the repository's own migration files were found, via direct production database introspection, to NOT match the real production schema. Real production already has a mature, working backend (auth trigger, token-ledger credits system, dual payment provider fulfillment, subscription renewal handling). App code (`apps/web`) has been partially corrected to read real production tables/columns (PR #8), but most capabilities below remain unverified at runtime — see "Manual Verification Pending."

| Capability | Status | Evidence rule |
|---|---|---|
| Product foundation | Partial | Charter/specification exist |
| Monorepo config | Partial | `package.json`, `turbo.json`, and `packages/types` exist; only one shared package currently exists |
| Web app | Partial | `apps/web` exists with Next.js config, auth callback/actions, Supabase clients, middleware, and working login/dashboard pages. **Never run via `next dev`/`next build`** — see Manual Verification Pending. |
| API | Planned | No `apps/api` |
| Shared packages | Partial | `packages/types` exists with `src/index.ts`; other planned shared packages do not exist |
| Supabase schema/migrations | Partial — REPOSITORY DOES NOT MATCH PRODUCTION | `supabase/migrations/20260910000000_init_schema.sql` exists in the repo, but verified (2026-09-16, direct DB introspection) to NOT match real production schema. Production uses `token_ledgers`, `view_user_balances`, `profiles.full_name`, `generated_assets.asset_type`/`storage_url`, none of which exist in this migration file. Do not trust this file as schema source of truth. |
| Authentication | Partial | Real production `handle_new_user()` trigger verified working. `apps/web` auth actions/callback/middleware exist and were smoke-tested via the Supabase Auth API during development, but never run in a live `next dev` session. |
| Profiles | Partial | Real production `profiles` table verified (columns: `full_name`, `avatar_url`, `tier_level`, `subscription_status`, `account_status`) — NOT `display_name` as the old migration file implies. Dashboard reads this table (PR #8). |
| Credits | Partial | Real production has a mature atomic token-ledger system verified via direct introspection: `token_ledgers`, `token_reservations`, `view_user_balances`, plus RPCs `get_user_balance`, `reserve_generation_tokens`, `settle_generation_tokens`, `release_generation_tokens`, `refund_generation_tokens`. This does NOT match `credit_wallets`/`credit_transactions` described in the repo's migration file — that schema does not exist in production. Only `get_user_balance` is wired into app code so far (`apps/web/app/api/balance/route.ts`). |
| Subscriptions | Partial | Real production has `subscription_plans`, `subscriptions`, and renewal RPCs (`apply_subscription_renewal`, `attach_paystack_subscription_identity`, `expire_stale_subscriptions`) verified via direct introspection. No app code reads/writes these yet. |
| Paystack | Partial | Real production has `fulfill_payment` and Paystack-specific RPCs verified via direct introspection (also `fulfill_flutterwave_payment` — production supports two providers, not documented anywhere before now). No app-side checkout/webhook code exists. |
| Replicate | Planned | Requirements only |
| Asset library | Partial | Real production `generated_assets` table verified (columns: `asset_type`, `storage_url`, `generation_status`, `tokens_consumed`) — NOT `type`/`public_url`/`status` as the old migration file implies. Dashboard reads this table (PR #8). |
| Generation | Planned | Real production has a full token-reservation generation flow verified via direct introspection (`generation_jobs` → `reserve_generation_tokens` → `settle_generation_tokens`/`release_generation_tokens` → `finalize_generation_job`). No `/generate` route or app-side integration exists. |
| Monitoring | Planned | Requirements only |
| Tests | Planned | Requirements only |
| CI/CD | Implemented | `.github/workflows/codeql.yml` verified passing on multiple merged PRs; branch protection on `main` requires the `Analyze (actions)` check. |
| Deployment | Unable To Verify | Repository structure alone does not verify a live production deployment. |

## Manual Verification Pending

The following have NEVER been runtime-tested and require a human (or an agent with an actual running dev environment, which this assistant does not have) to verify:

- [ ] `npm run dev` / `next dev` actually starts without error against real Supabase credentials
- [ ] `next build` succeeds (production build, not just CodeQL static analysis)
- [ ] A real signup through the `/login` UI actually creates a working session and lands on `/dashboard`
- [ ] The dashboard's balance display (`/api/balance`) returns a real, correct number for a real user
- [ ] PR #5 (Next.js 14.2.35 → 16.3.5, a 2-major-version jump) does not break the build or App Router behavior — must be tested before merging, not assumed safe from CodeQL passing alone

## Rule
This file must be updated whenever implementation status changes. Never mark an item complete because a README or specification describes it. Repository evidence and live production evidence can disagree — when they do, verify against the actual running system (2026-09-16 finding).
