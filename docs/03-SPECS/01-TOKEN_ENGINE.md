# Framic AI — Token Engine Specification

> **Commit 5 Deliverable (2 of 3)**: Authoritative specification of Token accounts, the append-only ledger, and the atomic reserve/settle/release operations.  
> Contracts: `packages/types/src/tokens.types.ts`. Lifecycle origin: Product Blueprint §5.  
> *Planning specification; SQL and service code are deferred to Commits 7 and 10.*

---

## 1. Model

Two account types hold Tokens, each with three buckets:

| Account | Owner | Purpose |
| :--- | :--- | :--- |
| Organization treasury | `ORGANIZATION` | Receives deposits; source of workspace allocations |
| Workspace pool | `WORKSPACE` | Spent by generation; held and settled by jobs |

| Bucket | Meaning |
| :--- | :--- |
| `available` | Spendable now |
| `reserved` | Held for in-flight jobs (reservation status `RESERVED`) |
| `consumed` | Irrevocably spent (reservation status `DEBITED`) |

All amounts are whole integers. Currency never appears in the engine. Payment and plan purchases happen outside it: a procurement service, after a verified external payment, calls `Deposit` with an external reference. The engine is payment-provider-agnostic.

### 1.1 Ledger entry deltas

| Entry | `availableDelta` | `reservedDelta` | `consumedDelta` | Account |
| :--- | :---: | :---: | :---: | :--- |
| `DEPOSIT` | +n | 0 | 0 | Organization (or workspace for promotional grants) |
| `ALLOCATE` | −n / +n | 0 | 0 | Two entries sharing a `transferId`: treasury −n, pool +n |
| `RESERVE` | −n | +n | 0 | Workspace pool |
| `SETTLE` | 0 | −n | +n | Workspace pool |
| `RELEASE` | +n | −n | 0 | Workspace pool |
| `REFUND` | +n | 0 | −n | Workspace pool |

These shapes are enforced by `LedgerEntrySchema` and must also be enforced by database constraints.

---

## 2. Invariants

Each invariant is a testable property and a reconciliation check.

| ID | Invariant |
| :--- | :--- |
| I1 | No bucket is ever negative. |
| I2 | Conservation: for each account, `available + reserved + consumed` equals the sum of its `DEPOSIT` and `ALLOCATE` deltas. |
| I3 | `reserved` equals the sum of `amount` over the account's reservations in status `RESERVED`. |
| I4 | A job has at most one reservation. A reservation moves only `RESERVED → DEBITED` or `RESERVED → RELEASED`, once. |
| I5 | The ledger is append-only: no `UPDATE` or `DELETE` is possible for any application role. Corrections are new entries. |
| I6 | An account's buckets equal the `*After` values of its latest entry, and `ledgerSequence` is contiguous. |
| I7 | `(accountId, idempotencyKey)` is unique; replays return the original result without new entries. |
| I8 | `SETTLE` requires verified persisted outputs for the job. No speculative billing. |
| I9 | A member's monthly usage (reservations `RESERVED` or `DEBITED` created in the current UTC month) never exceeds their `monthlyTokenCap`, when one is set. |

---

## 3. Operations

Every operation runs as **one database transaction** exposed as a single privileged procedure callable only by the API service role. Worker and client roles have no execute rights on any ledger procedure. Accounts are locked with `SELECT … FOR UPDATE`; when two accounts are involved they are locked in ascending `id` order to prevent deadlock. Serialization failures are retried up to 3 times by the caller.

### 3.1 Deposit
Preconditions: trusted procurement caller; external reference present. Steps: idempotency check → lock account → `available += n` → append `DEPOSIT` → update snapshot and `ledgerSequence`.

### 3.2 Allocate (treasury → pool)
Preconditions: caller holds `tokens.allocate_pool`; a Workspace Admin is bounded by their allocation cap (set by an Organization Owner; schema in Commit 7). Steps: lock both accounts → require treasury `available ≥ n` → append two `ALLOCATE` entries with one `transferId` → update both snapshots. Deallocation (pool → treasury) is the same operation with the direction reversed and requires pool `available ≥ n`.

### 3.3 Reserve (job authorization)
Preconditions: validated request; priced SKU; no existing reservation for the job. Steps, all atomic:
1. Idempotency lookup on `idempotencyKey`; return the existing reservation if present.
2. Lock the workspace pool.
3. Require `available ≥ amount`, else fail `INSUFFICIENT_TOKENS` (nothing written).
4. If the member has a cap: compute current-month usage (I9); require `usage + amount ≤ cap`, else `MEMBER_QUOTA_EXCEEDED`.
5. Insert reservation `RESERVED`; append `RESERVE`; update snapshot; set job `AUTHORIZED` and `reservationId`.

### 3.4 Settle (job success)
Preconditions: reservation `RESERVED`; completion report received; **the API has verified each reported output** (object exists, size and sha256 match, asset rows created in the same transaction). Steps: lock pool → reservation `DEBITED` → append `SETTLE` for the full reserved amount → update snapshot → job `SUCCEEDED` with `tokensSettled`. Prices are fixed per SKU, so the settled amount always equals the reserved amount; partial settlement does not exist. Settling an already `DEBITED` reservation returns the original result (idempotent); settling a `RELEASED` reservation is rejected and alerted.

### 3.5 Release (job failure or cancellation)
Preconditions: reservation `RESERVED` (or already `RELEASED`: no-op success). Steps: lock pool → reservation `RELEASED` with `releaseReason` → append `RELEASE` → update snapshot → job `FAILED` or `CANCELLED`. Releasing a `DEBITED` reservation is rejected; use Refund.

### 3.6 Refund (compensation)
Preconditions: reservation `DEBITED`; amount ≤ settled amount minus prior refunds; caller is the system (automated delivery anomaly) or an Organization Owner. Authorization for Workspace Admins is an open decision (ADR-001). Steps: lock pool → append `REFUND` (`consumed −n`, `available +n`) with a mandatory reason and actor → update snapshot → audit log entry. The reservation status remains `DEBITED`; refunds are visible through the ledger.

---

## 4. Cost Resolution

- A pure function maps a validated request to `(PricingSku, tokens)` using `TOKEN_COST_SCHEDULE`. It lives in a shared package so the studio's cost preview and the gateway cannot disagree.
- The schedule is versioned (`TOKEN_COST_SCHEDULE_VERSION`). The job stores the version and reserved amount; later schedule changes never alter an in-flight job.
- A configuration without a SKU is `UNPRICED_CONFIGURATION`; it is never priced by approximation.
- Price does not depend on the model or backend (ADR-004). Backend cost variance is a commercial concern handled by route selection, not by changing user price.

---

## 5. Quotas and Alerts

- **Member cap**: `monthlyTokenCap` on `WorkspaceMembership`; usage window is the UTC calendar month; counted per I9. Releases return capacity immediately.
- **Pool utilisation** = `(reserved + consumed) ÷ (available + reserved + consumed)`. Alerts fire to Workspace Admins and Organization Owners at 80% and 95% (`POOL_ALERT_THRESHOLD_PERCENTS`), once per threshold until an allocation or deposit lowers utilisation below it.
- **Hard cutoff**: when the pool cannot cover a request, the gateway returns `INSUFFICIENT_TOKENS` (402) with the available and required amounts in `details`.

---

## 6. Reconciliation

- **Continuous**: after every transaction, the engine checks I1 and I6 for the touched account(s); violation aborts the transaction.
- **Nightly**: recompute every account from its ledger and compare to the snapshot (I2, I3, I6) and verify reservation/job agreement (I4). Any difference sets `framic_ledger_reconciliation_drift` > 0 and pages the on-call owner. The job never auto-corrects; corrections are explicit, audited ledger entries.
- **Sweep**: reservations `RESERVED` for jobs already terminal are released by the pipeline sweeper and counted.

---

## 7. Access Control

- Tenancy isolation by Row Level Security: members read ledger entries and reservations of their own workspace; Organization Owners read treasury and all workspaces in the organization; Viewers read the balance only.
- No client or worker role can write accounts, entries, or reservations. Administrative adjustments are ledger entries (`DEPOSIT`, `ALLOCATE`, `REFUND`) with actor and reason, mirrored into the audit log.
- Idempotency keys are retained for the life of the job plus 90 days.

---

## 8. Required Verification (Commit 10 gate)

1. Property tests over random operation sequences assert I1–I9.
2. A concurrency test of N parallel reservations against a pool of K Tokens never over-reserves and never deadlocks.
3. Idempotent replay of every operation yields identical results and no extra entries.
4. Fault injection between each step of Settle and Release proves atomicity (all or nothing).
5. Reconciliation detects a deliberately corrupted snapshot.
6. `LedgerEntrySchema` and the database constraints accept and reject the same entry shapes.
