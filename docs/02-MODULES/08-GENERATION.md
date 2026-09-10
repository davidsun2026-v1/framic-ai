# AI Generation

## Purpose
Orchestrate authenticated, credit-authorized AI generation from request to persisted result.

## Scope
Request validation, cost resolution, credit reservation/deduction, generation record creation, provider dispatch, asynchronous status, failure/refund handling, asset linkage, and history.

## Required lifecycle
`requested → authorized → running → succeeded|failed|cancelled` with timestamps and correlation IDs.

## Rules
Credits are secured before provider execution. Every attempt is tracked. Provider failure cannot produce a false success. Retries must be idempotent or explicitly reconciled.

## Acceptance
Users can submit supported generation requests and observe truthful status/results without credit bypass or untracked execution.

## Non-goals
Provider-specific API details; see Replicate.
