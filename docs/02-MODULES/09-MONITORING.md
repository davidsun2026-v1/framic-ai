# Monitoring

## Purpose
Make failures, performance, security-relevant events, and business-critical workflows observable.

## Scope
Sentry errors/traces, structured application logs, request IDs, generation IDs, payment references, credit transaction IDs, and operational alerts.

## Rules
Never log passwords, access tokens, provider secrets, payment secrets, or unnecessary sensitive payloads. Errors must retain enough context to diagnose without exposing protected data.

## Critical events
Authentication failures; payment verification failures; credit mutation failures; generation failures; webhook failures; storage failures; unexpected authorization denials.

## Acceptance
Critical failures can be correlated across request, database, provider, and user-facing generation/payment records.

## Non-goals
Business analytics dashboards beyond operational requirements.
