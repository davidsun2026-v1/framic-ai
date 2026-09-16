# Supabase Contract Reconciliation Audit

**Date:** 2026-09-16  
**Repository:** `davidsun2026-v1/framic-ai`  
**Branch:** `chore/supabase-contract-reconciliation`  
**Authority order:** live Supabase target → repository migrations → application code → documentation

## Purpose

Establish a hard evidence map between the FRAMIC AI repository and its Supabase contract before additional credit, payment, or generation implementation is merged.

## Executive finding

The repository migration currently describes a legacy wallet/credit schema (`credit_wallets`, `credit_transactions`) while the repository's current application code and implementation-status evidence reference a different production contract based on `token_ledgers`, `token_reservations`, `view_user_balances`, and generation-token RPCs.

The repository currently contains only one migration, `supabase/migrations/20260910000000_init_schema.sql`. GitHub evidence does not contain the later signup-trigger migration referenced by `apps/web/lib/auth/actions.ts`, nor migrations defining the RPC/view contract used by the application service layer.

The connected Supabase account currently exposes the STRIKE GEN AI project, not an identifiable FRAMIC AI production project. Therefore this audit does **not** claim that FRAMIC's target production database has been inspected or modified.

## Contract matrix

| Contract | Repository evidence | Status | Required action |
|---|---|---|---|
| `public.profiles` | Defined by initial migration | PARTIAL | Reconcile against the actual FRAMIC target schema before changing application queries |
| `public.credit_wallets` | Defined by initial migration | PARTIAL | Treat as legacy until target production schema is verified |
| `public.credit_transactions` | Defined by initial migration | PARTIAL | Treat as legacy until target production schema is verified |
| `public.token_ledgers` | Referenced by implementation-status evidence as production contract | NOT VERIFIED | Verify on the actual FRAMIC Supabase project |
| `public.token_reservations` | Referenced by implementation-status evidence as production contract | NOT VERIFIED | Verify on the actual FRAMIC Supabase project |
| `view_user_balances` | Called/documented by `apps/web/lib/supabase/service.ts` | BROKEN IN REPOSITORY MIGRATION CHAIN | Add an exact migration only after target schema/signature is verified |
| `get_user_balance(uuid)` | Called by `apps/web/lib/supabase/service.ts` | BROKEN IN REPOSITORY MIGRATION CHAIN | Add exact function contract after target verification |
| `on_auth_user_created` | Referenced by auth actions | BROKEN IN REPOSITORY MIGRATION CHAIN | Add exact trigger/function migration after target verification |
| `reserve_generation_tokens` | Referenced in repository documentation | NOT VERIFIED | Verify exact signature and security model |
| `settle_generation_tokens` | Referenced in repository documentation | NOT VERIFIED | Verify exact signature and security model |
| `release_generation_tokens` | Referenced in repository documentation | NOT VERIFIED | Verify exact signature and security model |
| `refund_generation_tokens` | Referenced in repository documentation | NOT VERIFIED | Verify exact signature and security model |
| `finalize_generation_job` | Referenced in repository documentation | NOT VERIFIED | Verify exact signature and security model |
| `generation_jobs` | Defined by initial migration | PARTIAL | Reconcile exact production columns before runtime integration |
| `generated_assets` | Defined by initial migration | PARTIAL | Reconcile exact production columns before runtime integration |
| Paystack fulfillment | DB model exists; no app integration proven | NOT VERIFIED | Implement only against verified payment RPC/event contracts |

## Authentication evidence

`apps/web/lib/auth/actions.ts` contains real Supabase Auth calls:

- `supabase.auth.signUp(...)`
- `supabase.auth.signInWithPassword(...)`
- `supabase.auth.signOut()`
- `supabase.auth.getUser()`
- `supabase.auth.exchangeCodeForSession(...)`

Signup explicitly states that profile and wallet creation is delegated to an `on_auth_user_created` trigger and names `20260915000000_add_user_signup_trigger.sql`. That migration is not present in the repository's current migration directory.

**Status: BROKEN repository contract.**

## Balance API evidence

`apps/web/app/api/balance/route.ts` authenticates the request with the server Supabase client and then calls `getUserBalance(user.id)`.

`apps/web/lib/supabase/service.ts` implements `getUserBalance()` by calling `get_user_balance(p_user_id)` and documents that the RPC reads `view_user_balances`.

Neither `get_user_balance()` nor `view_user_balances` is defined by the repository's only migration.

**Status: BROKEN repository migration chain.**

## Why no speculative migration was added

It would be unsafe to invent RPC signatures, trigger behavior, token-reservation state transitions, or production table definitions from documentation alone. A migration that compiles but differs from the actual target production contract could create irreversible schema drift and break accounting behavior.

The correct next step is to obtain authoritative introspection of the **FRAMIC AI target Supabase project**, then encode that verified contract as forward-only migrations and update application code to match it.

## Production-safety gate

Until the target project is identified and introspected:

1. Do not modify production Supabase.
2. Do not replace the existing migration with guessed production SQL.
3. Do not mark credits, authentication, payments, or generation as fully verified.
4. Do not build generation billing on top of the legacy `credit_wallets` contract.
5. Do not claim that the repository migration is the production source of truth.

## Exit criteria

This audit can be closed only when all of the following are evidenced:

- [ ] FRAMIC AI target Supabase project identified by project/ref.
- [ ] Live table inventory captured.
- [ ] Exact columns/types/constraints captured for profiles, token ledger/reservations, generation jobs, assets, subscriptions, and payments.
- [ ] Exact RPC signatures and security properties captured.
- [ ] Auth signup trigger/function captured.
- [ ] RLS policies verified.
- [ ] Repository migrations reconciled with the verified target contract.
- [ ] Application queries/RPC calls match the verified signatures.
- [ ] CI validates migrations and application type contracts.
- [ ] Runtime smoke tests prove authentication and balance retrieval.

## Current decision

**NO-GO for Supabase contract completion.**

The repository is ready for reconciliation work, but not for claiming a verified production Supabase contract. The blocker is authoritative access to the actual FRAMIC target database schema/function definitions, not a missing conceptual design.
