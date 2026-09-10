# Subscription System

## Purpose
Represent plans and the lifecycle of a user's entitlement.

## Scope
Plans, active subscription, status transitions, renewal/cancellation state, included credits, entitlement checks, and audit history.

## Rules
Subscription state must be derived from verified billing events, not client claims. Credit grants must be idempotent and tied to a valid entitlement event.

## Acceptance
A user's entitlement is deterministic, auditable, and resilient to repeated webhook/events.

## Non-goals
Direct payment API implementation; see Paystack module.
