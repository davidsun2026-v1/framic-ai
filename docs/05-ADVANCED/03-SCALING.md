# Scaling Principles

## Purpose
Capture future scaling constraints without prematurely implementing infrastructure.

## Principles
Keep stateless application boundaries; isolate provider calls; make payment/webhook and generation operations idempotent; use queues/background processing when workload requires it; avoid database hot spots; index by ownership and lifecycle fields; keep storage external to application compute.

## Growth path
Phase 1 prioritizes correctness and observability. Phase 2 introduces heavier video workloads and asynchronous processing. Phase 3 introduces collaboration and marketplace authorization complexity.

## Rule
Do not add infrastructure because it is fashionable. Introduce it when measured workload, reliability, or product requirements justify it.
