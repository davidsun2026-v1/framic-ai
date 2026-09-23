# Framic AI — AHP Mapping

## Purpose

Map AHP concepts to Framic concepts without duplicating responsibilities.

| AHP concept | Framic role | Authority |
|---|---|---|
| Root channel | Agent-host catalogue | AHP host |
| Session channel | Creator agent workspace session | AHP host |
| Chat channel | Conversation/turn stream | AHP host |
| Terminal channel | Long-running agent/process resource | AHP host |
| Changeset channel | Workspace change state where applicable | AHP host + application authorization |
| Resource APIs | Controlled workspace/resource access | Framic authorization boundary |
| Authentication | Session authorization bridge | Supabase Auth |
| MCP surface | Tool integration boundary | AHP + Framic authorization |
| Telemetry | Agent protocol telemetry | AHP; product telemetry remains Framic-owned |
| Automation channels | Future scheduled workflows | Deferred |
| Provider execution | AI generation | Framic generation domain |

## Generation mapping

A generation initiated from an AHP chat must follow the same Framic generation contract as a web-initiated generation:

1. Authenticate the user.
2. Authorize the requested operation.
3. Validate the generation request.
4. Resolve authoritative cost.
5. Reserve/deduct credits through the Framic accounting contract.
6. Create or update the generation job.
7. Dispatch through the provider adapter.
8. Reconcile provider completion/failure.
9. Settle or release accounting.
10. Persist the resulting asset.
11. Publish truthful state back to the AHP chat/session.

AHP state must never be used as a substitute for the financial ledger.

## Failure rule

A disconnected client must not cause generation accounting to disappear. Provider execution and accounting must be independently recoverable.

## Browser rule

The browser is an AHP client, not the authority for agent state. Client-side optimistic state must be reconciled against host state.
