# Incident Response

## Purpose
Provide a repeatable response for production failures without improvisation.

## Severity
- P0: security breach, payment corruption, credit corruption, or broad outage.
- P1: major production capability unavailable or materially incorrect.
- P2: limited degradation with workaround.
- P3: minor defect/documentation issue.

## Procedure
Detect → contain → preserve evidence → assess impact → mitigate → verify recovery → communicate → document root cause → create preventive work.

## Special cases
For credit/payment discrepancies, stop unsafe mutations first and reconcile against authoritative records. For security incidents, preserve evidence and rotate affected credentials as appropriate.

## Acceptance
Every material incident leaves an auditable timeline and follow-up corrective actions.
