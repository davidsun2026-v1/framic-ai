# Generation Credit Accounting Policy

**Status:** Product policy documented; application enforcement NOT VERIFIED  
**Applies to:** V1 text-to-image and text-to-video  
**Inference provider:** Replicate only

## 1. Customer billing rule

Framic charges customer credits only when a generation completes successfully, its output passes validation, the output is copied into Framic-controlled durable storage, and the generated asset is linked to the generation job.

A Replicate prediction marked `succeeded` is not, by itself, sufficient to charge the customer.

## 2. Reservation, settlement, and release

1. Validate the request and resolve its server-owned credit price.
2. Reserve credits before submitting the provider prediction.
3. Persist the reservation transaction ID against the corresponding generation job.
4. Keep the reservation pending while inference and asset delivery are unresolved.
5. After validated durable asset delivery, call `settle_credits(p_transaction_id)` exactly once.
6. On a terminal unsuccessful outcome, call `release_credits(p_transaction_id, p_release_idempotency_key)` exactly once.
7. Never let a client submit the authoritative credit amount or choose the settlement/release decision.

The exact live RPC contracts are in `docs/03-SPECS/SPEC-001-REPLICATE-API-PIPELINE.md`. Reconcile live generation-job columns before implementation.

## 3. State and accounting matrix

| Event | Reservation | Customer final charge | Provider cost |
|---|---|---|---|
| Rejected before reservation | None | 0 | 0 |
| Insufficient balance | None | 0 | 0 |
| Prediction accepted/processing | Pending | Not settled yet | Usage may accrue |
| Provider succeeded; output not persisted | Pending | Not settled yet | Usage incurred |
| Output validated, persisted, and linked | Settled | Reserved amount charged once | Reconcile actual usage |
| Provider failed | Released | 0 | Apply Replicate billing rules |
| Aborted before execution | Released | 0 | Replicate documents no charge |
| Canceled after execution starts | Released | 0 | May incur compute cost |
| Storage delivery permanently failed | Released | 0 | Provider usage may still be incurred |
| Duplicate webhook | No second mutation | No second charge/refund | No new prediction |
| Ambiguous submission timeout | Pending until reconciled | No final charge | Prediction may exist; do not duplicate blindly |

## 4. Separate accounting domains

Customer credits are Framic's commercial unit and must not be confused with Replicate USD usage, Paystack NGN/kobo payment amounts, storage costs, or internal estimates.

Provider-cost records should retain, where available, provider prediction ID, model/version, billing unit, provider usage metrics, observed cost, currency, and reconciliation status. Do not infer provider cost from customer credits.

## 5. Idempotency and recovery

- One client idempotency key maps to one Framic job/reservation.
- One Replicate prediction ID maps to one provider attempt.
- One webhook delivery ID is processed at most once.
- Settlement and release are mutually exclusive terminal financial outcomes.
- Duplicate/out-of-order events must not reverse a settled transaction or release a settled reservation.
- Reconcile an ambiguous provider submission before retrying.
- If storage upload fails, do not settle. Retry within a bounded policy; release if recovery is exhausted.
- Monitor pending reservations. Do not release while a provider prediction may still be running.

## 6. Commercial guardrails

- Payment-processing fees are included in Framic's listed price; Framic absorbs those fees under the current product direction.
- Target gross margin is 60% after direct inference and payment-processing costs, before general operating expenses.
- Subscription prices, monthly credit allowances, per-model credit costs, and final FX assumptions are not approved by this policy.
- Do not enable a model until its exact Replicate version, input schema, billing unit, current price, and cost bounds are verified.
- Recalculate credit costs when provider pricing, FX, payment fees, or model versions change.

## 7. Acceptance tests

See `docs/04-TESTING/GENERATION-BILLING-ACCEPTANCE.md`. Production release is blocked until financial, lifecycle, webhook-security, persistence, and idempotency tests pass.

## 8. Live Credit Ledger Contract (read-only inspection, 2026-11-25)

**Target:** Supabase project `gkvvecskbkwpcsuatklm` (Framic AI).  
**Evidence boundary:** The following describes the live schema and function definitions inspected read-only on 2026-11-25. It is not a migration specification and does not prove that the application calls these functions.

### 8.1 Existing wallet and transaction tables

The live implementation uses `public.credit_wallets` and `public.credit_transactions`. Do not introduce a parallel `token_ledgers` or `token_reservations` subsystem for V1.

| Table | Live columns | Responsibility |
|---|---|---|
| `credit_wallets` | `id uuid`, `user_id uuid`, `balance bigint`, `created_at timestamptz`, `updated_at timestamptz`, `last_updated_at timestamptz` | One wallet per profile; `balance` is the remaining spendable balance |
| `credit_transactions` | `id uuid`, `user_id uuid`, `wallet_id uuid`, `type text`, `reason text`, `amount bigint`, `balance_before bigint`, `balance_after bigint`, `idempotency_key text`, `correlation_id uuid`, `status text`, `metadata jsonb`, `created_at timestamptz`, `created_by text` | Signed customer-credit movements and their lifecycle/audit metadata |

Observed constraints include a non-negative wallet balance, unique wallet `user_id`, unique transaction `idempotency_key`, non-zero transaction amount, `balance_after = balance_before + amount`, and constrained transaction types/statuses. The transaction status values are `pending`, `completed`, `failed`, and `rolled_back`; transaction types include `purchase`, `grant`, `deduction`, `refund`, `adjustment`, and `bonus`.

**Important accounting interpretation:** a reservation is implemented by subtracting credits from `credit_wallets.balance` immediately and inserting a negative `deduction` transaction with `status = 'pending'`. There is no separate `reserved_balance` column in the inspected wallet schema. Therefore, do not describe this implementation as moving an amount between separately stored available and reserved balance buckets. The pending transaction status identifies the provisional deduction while the wallet balance already reflects it.

### 8.2 Live RPC contracts

| Function | Exact identity arguments | Return | Observed behavior |
|---|---|---|---|
| `public.reserve_credits` | `(p_user_id uuid, p_amount bigint, p_reason text, p_idempotency_key text, p_correlation_id uuid, p_metadata jsonb)` | `TABLE(transaction_id uuid, balance_after bigint, duplicate boolean)` | Validates positive amount and required fields; serializes the idempotency key with an advisory transaction lock; locks the user's wallet row `FOR UPDATE`; rejects insufficient balance; subtracts the amount; inserts a negative pending deduction; returns the existing transaction for a matching retry |
| `public.settle_credits` | `(p_transaction_id uuid)` | `boolean` | Locks the transaction row; only a pending deduction can settle; changes its status to `completed`; returns false for an already completed deduction; does not subtract the wallet balance again |
| `public.release_credits` | `(p_transaction_id uuid, p_release_idempotency_key text)` | `TABLE(transaction_id uuid, balance_after bigint, duplicate boolean)` | Locks the original transaction; accepts only a pending deduction; restores the deducted amount to the wallet; marks the original deduction `rolled_back`; inserts a positive refund transaction linked by correlation ID; makes repeated release requests idempotent |
| `public.grant_credits` | `(p_user_id uuid, p_amount bigint, p_reason text, p_idempotency_key text, p_type text, p_correlation_id uuid, p_metadata jsonb, p_created_by text)` | `TABLE(transaction_id uuid, new_balance bigint, duplicate boolean)` | Separate grant/purchase/adjustment primitive; it is not part of generation settlement and must not be used to implement a generation refund |

The settlement path is not a second debit. Example for a 50-credit reservation from a 100-credit wallet:

| Stage | Wallet balance | Reservation transaction |
|---|---:|---|
| Before request | 100 | No row |
| After reserve | 50 | `amount = -50`, `status = pending` |
| After settle | 50 | Same row, `status = completed` |
| Instead, after release | 100 | Original row `rolled_back`; separate `refund` row `amount = +50` |

Settlement and release are mutually exclusive terminal outcomes for the original pending deduction. The reservation's `correlation_id` is supplied by the caller; the release refund's `correlation_id` points to the original reservation transaction.

### 8.3 Security and row access observed

- The four inspected RPCs are `SECURITY DEFINER`.
- `reserve_credits`, `settle_credits`, and `release_credits` pin `search_path` to the empty path and schema-qualify database objects.
- Their observed EXECUTE grants are to `service_role` and `postgres`; no EXECUTE grant to `anon` or `authenticated` was returned by the privilege inspection.
- The inspected `grant_credits` definition instead sets `search_path = public`. It is not a generation RPC, but its security configuration should be separately reviewed before broadening or reusing it.
- RLS policies on both wallet and transaction tables allow authenticated users to SELECT only rows where `auth.uid() = user_id`. No client-side write policy was returned in the inspected policy list.
- Supabase `service_role` bypasses RLS. Keep its credential server-only, and do not treat RLS as a substitute for restricting privileged RPC access.

These are point-in-time observations, not authorization to change production privileges. Any security remediation requires a separately reviewed migration and staging tests.

### 8.4 Auditability limitation

The live transaction table is not strictly append-only: `settle_credits` updates the original pending deduction's status to `completed`, and `release_credits` updates it to `rolled_back`. Release also appends a separate refund row. The current design therefore preserves transaction rows and their balance snapshots, but mutates lifecycle status on the reservation row.

Do not call this a fully immutable ledger or a formal double-entry journal. The inspected schema has no paired debit/credit account journal. For V1, document the actual behavior; any move to immutable event history or double-entry accounting requires a deliberate future design, migration plan, reconciliation strategy, and tests—not a second ledger created alongside the current one.

### 8.5 Migration-history reconciliation blocker

The connected live project reports these applied migration versions:

| Version | Name |
|---|---|
| `20260910000000` | `init_schema` |
| `20260918090309` | `add_signup_trigger_and_balance_rpc` |
| `20260923082727` | `add_paystack_fulfillment_rpcs` |
| `20260929231407` | `webhook_events_rls_and_credit_reservations` |
| `20260930090837` | `create_private_storage_buckets` |
| `20261008012801` | `restrict_profile_and_asset_columns` |

The current repository migration directory does not yet provide a verified, complete, one-to-one replay path for this live history. In particular, the live reservation migration `20260929231407` was not found at the expected path on the inspected `main` branch. Recover the original migration from its source branch/commit and reconcile all version/name differences before attempting a local reset or migration-chain repair. Do not recreate historical migrations from memory or apply speculative SQL to production.

### 8.6 Implementation and release gates

Before generation billing is implemented or marked verified:

1. Recover and review the exact source migrations for every live migration version; verify a clean replay against an isolated Supabase local/staging database.
2. Verify the generation-job schema can persist the reservation transaction ID, client idempotency key, provider prediction ID, and terminal outcome without inventing columns or states.
3. Implement server-only orchestration that resolves price from a server-owned approved model registry; never accept authoritative cost from the browser.
4. Prove that the job record, reservation reference, and dispatch/outbox intent cannot become inconsistent. If they cannot be committed atomically with the existing contract, document and test the recovery protocol before provider submission.
5. Prove concurrency, duplicate request, duplicate webhook, ambiguous provider submission, repeated settlement, repeated release, settle-after-release, and release-after-settle behavior in isolated staging.
6. Reconcile Replicate provider expenditure independently from customer credit transactions, including provider-billed failed/chained runs where applicable.
7. Keep production generation billing **NO-GO** until the complete staging acceptance matrix in `docs/04-TESTING/GENERATION-BILLING-ACCEPTANCE.md` has reproducible passing evidence.

No production schema change is authorized by this contract.

