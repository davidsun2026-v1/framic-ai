# Framic AI — AHP State Reconciliation

## Objective

Ensure an AHP client can disconnect, reconnect, or retry without creating duplicate execution or accounting.

## State authorities

| State | Authority |
|---|---|
| User identity | Supabase Auth |
| Credit balance/ledger | Framic accounting in Supabase |
| Subscription/payment | Framic billing data |
| Generation lifecycle | Framic generation domain |
| Provider lifecycle | Provider adapter + persisted generation state |
| Agent/session/chat state | AHP host |
| Browser rendering state | AHP client |

## Reconciliation principles

1. AHP actions are state transitions, not financial transactions.
2. Financial mutations require idempotent application operations.
3. Provider submission requires an idempotency strategy.
4. Provider callbacks/webhooks must be safe to repeat.
5. Client reconnect must reconcile against host state before allowing assumptions about current execution.
6. A failed client connection must not roll back a provider operation.
7. A failed provider operation must not be represented as a successful AHP result.

## Generation lifecycle

The intended cross-system lifecycle is:

```
AHP request
  -> Framic validation
  -> accounting authorization
  -> generation job
  -> provider submission
  -> provider event/result
  -> accounting settlement/release
  -> asset persistence
  -> AHP state publication
```

The exact database schema and RPC names are intentionally not fixed here. They must be established by the verified Framic generation/credits implementation before integration code is written.

## Reconnect

A reconnecting client should:

1. Re-establish the protocol connection.
2. Negotiate a compatible AHP version.
3. Restore subscriptions.
4. Obtain current host state/snapshot.
5. Apply any required ordered state updates.
6. Reconcile pending UI state against authoritative Framic generation/accounting state.

## Testing requirement

Before production use, tests must cover:

- duplicate generation requests,
- duplicate provider callbacks,
- disconnect during generation,
- reconnect after provider completion,
- credit reservation failure,
- provider failure,
- asset persistence failure,
- unauthorized session access.
