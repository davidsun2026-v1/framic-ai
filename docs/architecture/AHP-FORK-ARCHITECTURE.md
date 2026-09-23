# Framic AI — Agent Host Protocol Architecture

## Status

**Decision status:** Architecture baseline proposed for review  
**Repository:** davidsun2026-v1/framic-ai  
**AHP fork:** davidsun2026-v1/agent-host-protocol  
**AHP baseline verified:** 0.9.0  
**Upstream synchronization point:** 6b9f71845afffc8d4647a555496ae831a081f7a8

This document defines the boundary between Framic AI product infrastructure and the Agent Host Protocol (AHP). It does not authorize production deployment or database changes.

## Architectural principle

AHP is the agent-session protocol and synchronized execution-state layer. It is not Framic's identity system, billing system, credit ledger, asset database, or provider contract.

Framic remains responsible for:

- Supabase Auth identity and authorization context.
- Application profiles.
- Credits and financial accounting.
- Subscriptions and payments.
- Generation jobs and provider accounting.
- Asset ownership and persistence.
- Product-level audit and observability.

AHP is responsible for:

- Agent host/session state.
- Chat and turn state.
- Terminal resources.
- Client subscriptions and synchronized state.
- Reconnection and state replay.
- Agent-oriented tool/session coordination.

## System boundary

```
Framic Web
    |
    v
Framic application services
    |
    +--> Supabase Auth / PostgreSQL / Storage
    |
    +--> Generation domain
    |       |
    |       +--> provider adapter --> Replicate
    |
    +--> AHP host
            |
            +--> sessions
            +--> chats
            +--> terminals
            +--> resources
            +--> tools
```

The AHP host may request Framic application operations through explicit internal interfaces. It must not bypass those interfaces to mutate application data directly.

## Provider rule

Replicate remains an implementation provider behind the Framic provider abstraction. AHP does not become a Replicate protocol and must not contain provider-specific business accounting.

## Identity rule

Supabase Auth remains the identity authority. An AHP session is created in an authenticated Framic authorization context. AHP must not introduce a parallel password store or independent account authority.

## Production rule

No AHP integration is production-ready until repository, test, deployment, authentication, authorization, database, provider, and runtime evidence exists for the integrated path.

## Change control

Implementation work must use a feature/chore branch and pull request. Production Supabase changes require separate explicit authorization and migration evidence.
