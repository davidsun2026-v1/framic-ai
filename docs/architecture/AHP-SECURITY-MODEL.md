# Framic AI — AHP Security Model

## Identity

Supabase Auth is the Framic identity authority.

The AHP host receives an authenticated identity context and derives authorization from Framic application policy.

## Trust boundaries

```
Browser/client
   |
   | authenticated protocol traffic
   v
AHP host
   |
   | authorized internal operation
   v
Framic application services
   |
   +--> Supabase
   |
   +--> provider adapters
```

Client-supplied AHP state is untrusted input. Provider responses are untrusted input. Neither may directly establish financial or authorization truth.

## Credential rules

Provider credentials and service-role credentials are server-only.

Credentials must never be placed in:

- AHP channel state.
- Chat messages.
- Terminal output.
- Client-visible notifications.
- Generated asset metadata intended for public clients.

## Authorization

Every operation that can affect:

- credits,
- billing,
- generation,
- assets,
- user data,
- provider execution,

must pass through Framic authorization and validation.

AHP subscriptions determine what state a client receives; they do not grant business permissions.

## Auditability

Security-sensitive operations require correlation identifiers that allow the AHP event, Framic operation, database record, and provider operation to be reconciled without exposing secrets.

## Reconnection

Reconnection must restore authorized state only. A stale client must not be able to replay an action outside the current authorization context.
