# Provider Abstraction

## Purpose
Allow AI providers/models to change without rewriting product business logic.

## Contract
The generation domain supplies a normalized request. A provider adapter maps it to vendor APIs and returns normalized submission/status/result/error data.

## Required metadata
Provider, model/version, provider request ID, timestamps, status, normalized output references, and error classification.

## Rules
Credits, authorization, user ownership, and subscription logic remain domain responsibilities. Provider adapters never award credits or decide user entitlements.

## Acceptance
A second provider can be added behind the same domain contract without changing credit/accounting invariants.
