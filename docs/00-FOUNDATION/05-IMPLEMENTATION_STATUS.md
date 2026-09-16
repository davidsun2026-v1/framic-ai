# Implementation Status

## Purpose

Single evidence-based ledger separating what exists from what is only designed.

This file is authoritative for implementation status and must be reconciled against the repository before any status claim is made. The operational AI startup and anti-hallucination rules are defined in `docs/00-PROJECT_STATE.md`.

## Status Classifications

- **Implemented** — verified implementation evidence exists.
- **Partial** — some implementation evidence exists, but the capability is incomplete.
- **Planned** — requirements/design exist but implementation evidence is absent.
- **Not Found** — the expected implementation or file was searched for and not found.
- **Unable To Verify** — evidence could not be established with available repository access.

Documentation, README claims, issue descriptions, TODOs, dependency declarations, and folder names do not by themselves establish implementation.

## Current Evidence Ledger

| Capability | Status | Verified evidence / rule |
|---|---|---|
| Product foundation | Partial | Foundation documentation exists; implementation remains in progress. |
| Monorepo config | Partial | Root `package.json` and `turbo.json` are present. |
| Web app | Partial | `apps/web` exists with Next.js configuration, package configuration, middleware, auth callback, Supabase client/server utilities, auth actions, and working login/dashboard pages (PRs #6, #7, #8). |
| API | Not Found | `apps/api` was not found in the verified repository structure. |
| Shared packages | Unable To Verify | Do not claim package implementation without current repository evidence. |
| Supabase schema/migrations | Partial | `supabase/migrations/20260910000000_init_schema.sql` exists in the repository, but has been verified via direct database introspection (2026-09-16) to NOT match the real production schema — production uses a different, more complete schema (`token_ledgers`, `view_user_balances`, `profiles.full_name`, etc.) not represented anywhere in this repo's migration history. Repository migration history requires reconciliation with production before it can be trusted as schema source of truth. |
| Authentication | Partial | `apps/web/lib/auth/actions.ts`, `apps/web/lib/auth/middleware-utils.ts`, `apps/web/app/auth/callback/route.ts` exist. Signup/signin/signout verified working end-to-end against the real production `handle_new_user()` trigger (2026-09-16). |
| Profiles | Partial | Real production `profiles` table verified via direct introspection (columns: `full_name`, `avatar_url`, `tier_level`, `subscription_status`, `account_status`). Dashboard reads this table (PR #8). No profile-editing UI exists yet. |
| Credits | Partial | Real production has a mature, atomic token-ledger system verified via direct introspection: `token_ledgers`, `token_reservations`, `view_user_balances`, and SECURITY DEFINER RPCs (`get_user_balance`, `reserve_generation_tokens`, `settle_generation_tokens`, `release_generation_tokens`, `refund_generation_tokens`, `calculate_generation_cost`). Only `get_user_balance` is currently wired into the app (`apps/web/app/api/balance/route.ts`, PR #8). The reservation/settlement flow is not yet used by any app code. |
| Subscriptions | Partial | Real production has `subscription_plans`, `subscriptions`, and RPCs (`apply_subscription_renewal`, `attach_paystack_subscription_identity`, `expire_stale_subscriptions`) verified via direct introspection. No app code reads or writes these yet. |
| Paystack | Partial | Real production has `fulfill_payment` and Paystack-specific RPCs verified via direct introspection. No app-side integration (checkout, webhook handler) exists in this repository yet. |
| Replicate | Planned | No verified implementation evidence established in this audit. |
| Asset library | Partial | Real production `generated_assets` table verified via direct introspection (columns: `asset_type`, `storage_url`, `generation_status`, `tokens_consumed`). Dashboard reads this table (PR #8). No upload/generation-triggered writes exist in app code yet. |
| Generation | Planned | Real production has a full token-reservation generation flow verified via direct introspection (`generation_jobs`, `reserve_generation_tokens` → `settle_generation_tokens`/`release_generation_tokens`, `finalize_generation_job`). No `/generate` route or app-side integration exists yet. |
| Monitoring | Planned | No verified implementation evidence established in this audit. |
| Tests | Planned | No verified implementation evidence established in this audit. |
| CI/CD | Implemented | `.github/workflows/codeql.yml` verified passing on multiple merged PRs (#1, #4, #6, #7, #8); branch protection on `main` requires the `Analyze (actions)` check. |
| Deployment | Unable To Verify | Repository structure alone does not verify a live production deployment. |

## Governance

1. Read `docs/00-PROJECT_STATE.md` before beginning work.
2. Verify the repository and implementation evidence before changing a status.
3. Cite exact repository paths for claims.
4. Never mark an item complete because a README, specification, issue, dependency, folder, or configuration describes it.
5. When evidence is unavailable, use `Unable To Verify` rather than guessing.
6. Update this ledger when implementation status changes.
7. Do not create duplicate memory/state/status files to compensate for missing verification.
8. **Repository evidence and live production evidence can disagree.** When they do, verify against the actual running system before trusting repository files alone — this repo's migration history was found to lag production by a wide margin (2026-09-16).

## Evidence Rule

**No evidence = no claim.**
