# Framic AI — Inference Backend Interface Specification

> **Commit 5 Deliverable (3 of 3)**: Provider-agnostic seam between the generation worker and the system that actually runs a model: hosted APIs today, GPU worker pools later.  
> Contract: `InferenceBackend` and related types in `packages/types/src/worker.types.ts`.  
> *Planning specification; adapters are implemented in Commit 10.*

---

## 1. Layering

```text
API Gateway --task envelope--> Broker --lease--> Generation Worker (apps/worker-generation)
                                                    |  owns: lease, heartbeat, storage upload,
                                                    |        verification, callbacks
                                                    v
                                          InferenceBackend  (this spec)
                                           |                    |
                              HOSTED_API adapter        GPU_POOL adapter
                              (managed provider API)    (ComfyUI / Diffusers / TensorRT)
```

The worker is identical for every backend. A backend owns only model execution. Backends never see Tokens, workspaces, credentials of other backends, or storage credentials.

---

## 2. Interface Semantics

| Method | Contract |
| :--- | :--- |
| `describe()` | Returns the `InferenceBackendDescriptor`: `backendId`, `kind` (`HOSTED_API` \| `GPU_POOL`), `supportedTypes`, `supportedModels`, `maxConcurrency`, `taskTimeoutSeconds`. Pure and cheap. |
| `submit(task, signal)` | Starts execution and returns an `InferenceHandle` (`backendId`, `backendJobId`). Must not block until completion. If `task.jobId` was already submitted (re-leased task), the adapter returns the existing handle instead of creating a second task. Aborting `signal` cancels the submission attempt. |
| `poll(handle, signal)` | Returns `PENDING`, `RUNNING` with monotonic `progressPercent`, `SUCCEEDED`, or `FAILED` with a `GenerationFailureCode` and detail. Safe to call repeatedly; no side effects. |
| `fetchResult(handle, signal)` | Valid only after `SUCCEEDED`. Returns `modelVersion`, outputs (`mimeType`, `seed`, and a `location` of `URL` or `LOCAL_PATH`), and `computeMs`. |
| `cancel(handle)` | Best-effort termination on the backend. Idempotent. Used on task timeout and worker shutdown. |

Guarantees the worker relies on: handles are serialisable; `poll` after a terminal state keeps returning that state; a `URL` location is readable by the worker without extra credentials beyond what the adapter embedded; a `LOCAL_PATH` is readable by the worker process.

The worker, not the adapter, converts `InferenceResult` into persisted outputs and reports them. A backend failure never settles Tokens.

---

## 3. Hosted API Adapter

Adapter for managed inference providers (the current target; the Replicate-based design in `01-REPLICATE_API_PIPELINE_SPEC.md` becomes the first adapter).

| Concern | Rule |
| :--- | :--- |
| Submission | Maps the `GenerationRequest` to the provider's model and input schema through a per-model mapping table kept in the adapter. Parameters the provider cannot honour exactly cause `submit` to fail with `PROVIDER_ERROR`, never silent substitution. |
| Completion detection | The worker polls (default interval 2 s with jitter). Provider webhooks are an optional optimisation delivered to the worker, never to the gateway, and never required for correctness. |
| Output retrieval | Provider output URLs are short-lived (on the order of an hour). The worker copies outputs into private storage immediately after `SUCCEEDED`; no provider URL is ever stored or shown to a client. |
| Idempotent submission | Adapter records `jobId → backendJobId` through the worker heartbeat; a re-leased task resumes polling that provider task. |
| Cancellation | Calls the provider's cancel endpoint; failure to cancel is logged and does not block the job from failing. |
| Credentials | Provider tokens live only in worker environment configuration; never in task envelopes, job records, lineage, or logs. |

Error mapping:

| Provider outcome | Failure code |
| :--- | :--- |
| Safety or content-policy rejection | `PROVIDER_CONTENT_REJECTED` |
| Capacity, 5xx, rate limit, unknown failure | `PROVIDER_ERROR` |
| Exceeds `taskTimeoutSeconds` | `TIMEOUT` (worker-enforced) |
| Input asset rejected by provider as unreadable | `INVALID_INPUT_ASSET` |

Provider rate-limit responses are absorbed by bounded backoff within the task timeout; exhausting it fails the job. There is no automatic job retry.

---

## 4. GPU Pool Adapter (post-MVP)

| Concern | Rule |
| :--- | :--- |
| Execution | Runs ComfyUI/Diffusers/TensorRT pipelines on the worker's own GPUs; the handle is a local process or prompt identifier. |
| Admission | `maxConcurrency` derives from available VRAM per model; the worker leases no more tasks than it can run. |
| Memory errors | Allocation failures map to `CUDA_OOM`. |
| Outputs | `LOCAL_PATH` locations, copied to storage by the worker. |
| Models | Weights are pulled from the S3-compatible store into a local cache at startup; a worker advertises only models it has loaded. |
| Isolation | One task per GPU context unless the model matrix explicitly allows packing. |

Nothing in this section is provisioned for the MVP. The interface exists so that adding it changes configuration and one adapter, not the gateway, ledger, or database.

---

## 5. Capability Registry and Routing

Routing is data, not code: a table of `InferenceRoute` records `(type, model, queueName, backendId)`.

- Every `(type, model)` the gateway accepts has **exactly one** active route; the gateway rejects unknown or ambiguous models with `VALIDATION_FAILED`.
- A route's `backendId` must support the type and model (`describe()`), and its `queueName` must match the queue table in `00-GENERATION_PIPELINES.md` §4. Mismatches fail configuration validation at startup.
- Internal model identifiers are stable product names; provider model paths and versions live only in adapter mapping tables and are recorded as `modelVersion` in lineage.
- Price is independent of route (ADR-004). Choosing a model never changes the Token cost shown to users.

---

## 6. Migration from Hosted API to GPU Pool

1. Deploy workers with the GPU adapter registered under a new `backendId`.
2. Run the conformance suite (§7) against it.
3. Change the route's `backendId` for chosen `(type, model)` pairs; in-flight jobs finish on their original backend because the job records `backendId`.
4. Observe `framic_generation_job_duration_seconds` and failure rate by `backend_id`; roll back by restoring the route.

No change to request schemas, the Token engine, the job state machine, asset lineage (beyond the recorded `backendId`), or client contracts.

---

## 7. Conformance Suite

Every adapter must pass the same contract tests before it can be routed:

1. `submit` twice with the same `jobId` yields one backend task and equal handles.
2. `poll` progress never decreases; terminal states are stable.
3. `fetchResult` before success is rejected; after success, outputs match the requested type, resolution, duration, and frame rate.
4. `cancel` mid-run results in a terminal `FAILED` poll or a non-`RUNNING` state and is idempotent.
5. Timeout behaviour: a stalled task is failed as `TIMEOUT` by the worker and cancelled on the backend.
6. Failure mapping table in §3 (or its GPU equivalent) is exercised for each code.
7. No credential material appears in handles, results, or logs.
