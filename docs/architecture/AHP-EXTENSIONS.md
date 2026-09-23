# Framic AI — AHP Extensions

## Extension policy

Framic-specific protocol additions use the reserved AHP `x-` namespace. AHP defines `x-` names as implementation-defined extensions whose semantics are agreed by peers.

Framic extensions must be additive and capability-gated. They must not redefine standard AHP methods.

## Proposed namespace

Use `x-framic-` for Framic-specific commands, notifications, action types, or channel schemes.

No `x-framic-` protocol element is implemented by this architecture document. Names become normative only after a reviewed specification and implementation.

## Candidate extension areas

Potential future extensions include:

- `x-framic-generation` — generation lifecycle metadata.
- `x-framic-credits` — non-authoritative presentation of accounting state.
- `x-framic-assets` — asset references.
- `x-framic-provider` — provider execution metadata.
- `x-framic-workspace` — Framic workspace context.

These are design placeholders, not implemented contracts.

## Non-negotiable boundary

An extension must not allow a client to:

- Set its own credit balance.
- Mark a generation successful without provider evidence.
- Bypass authorization.
- Submit provider credentials.
- Write directly to protected Supabase tables.
- Convert AHP state into financial truth.

## Versioning

Framic extensions must declare compatibility independently of the AHP protocol version. Standard AHP negotiation remains the compatibility baseline.
