# Asset Library

## Purpose
Persist and present user-owned generated assets safely.

## Scope
Asset metadata, storage references, ownership, listing, retrieval, soft deletion, lifecycle state, and generation linkage.

## Rules
Every asset has an owner. Authorization is enforced server-side and through database policies. Storage URLs must not expose unauthorized assets.

## Acceptance
A completed generation can produce an owned asset with traceable metadata and safe retrieval/deletion behavior.

## Non-goals
AI inference and payment processing.
