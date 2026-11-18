# Framic AI — Generation Pipelines Specification

> **Commit 5 Deliverable (1 of 3)**: Backend-agnostic specification of the video and image generation pipelines, from request validation to persisted asset.  
> Companions: `01-TOKEN_ENGINE.md`, `02-INFERENCE_BACKEND_INTERFACE.md`. Contracts: `packages/types/src/generation.types.ts`, `worker.types.ts`, `ahp-generation.ts`.  
> *Planning specification; supersedes the provider-coupled flow in `01-REPLICATE_API_PIPELINE_SPEC.md` where they conflict (see ADR-003 in `docs/00-FOUNDATION/09-ARCHITECTURE_DECISIONS.md`).*

---

## 1. Scope and Invariants

1. Five generation types are accepted: `text_to_image`, `inpainting`, `text_to_video`, `image_to_video`, `video_upscale`. Each maps to exactly one priced SKU (§2).
2. A job cannot be enqueued without an atomic Token reservation (`01-TOKEN_ENGINE.md` §3).
3. No Tokens are settled until every output is confirmed persisted in private object storage.
4. Workers and inference backends never write to the Token ledger and never hold ledger credentials.
5. Execution targets are interchangeable behind the `InferenceBackend` interface: hosted APIs now, GPU pools later, with no change to gateway, ledger, or schema.
6. Every job is idempotent on its client-generated UUID `idempotencyKey` and ends in a terminal state with a classified outcome. There are no silent drops.

---

## 2. Accepted Configurations and SKU Resolution

| Type | Selecting parameters | SKU | Tokens |
| :--- | :--- | :--- | :---: |
| `text_to_image` | `STANDARD_1024`, `variations: 1`, steps 20–30 | `IMAGE_STANDARD` | 5 |
| `text_to_image` | `HIGH_2048`, `variations: 1`, steps 20–50 | `IMAGE_HIGH_RES` | 15 |
| `text_to_image` | `STANDARD_1024`, `variations: 4` | `IMAGE_BATCH_X4` | 18 |
| `inpainting` | 1024² pixel budget, mask required | `IMAGE_INPAINTING` | 8 |
| `text_to_video` | `720p`, 4 s, 24 fps (96 frames) | `VIDEO_STANDARD` | 50 |
| `text_to_video` | `1080p`, 4 s, 24 fps (96 frames) | `VIDEO_HD` | 100 |
| `image_to_video` | `720p`, 5 s, 24 fps (120 frames) | `VIDEO_I2V` | 75 |
| `image_to_video` | `1080p`, 5 s, 24 fps (120 frames) | `VIDEO_I2V_HD` | 125 |
| `video_upscale` | source 720p/1080p → 2160p | `VIDEO_UPSCALE_4K` | 120 |

Steps within a tier's range do not change price. `HIGH_2048` with `variations: 4` is rejected by schema.

### 2.1 Validation order (gateway)

1. **Schema**: `GenerationRequestSchema`; failure → `VALIDATION_FAILED` (400).
2. **Authentication and role**: caller holds `generation.execute` in `workspaceId`; viewers are rejected `FORBIDDEN` (403). API-key callers resolve to the key's workspace and must match `workspaceId`.
3. **Scope**: workspace not archived; `projectId` belongs to the workspace and is not archived.
4. **Model route**: `(type, model)` has exactly one active route (`02-INFERENCE_BACKEND_INTERFACE.md` §5); otherwise `VALIDATION_FAILED`.
5. **Priority**: `PRIORITY` is valid only for `text_to_video` and `image_to_video`; otherwise `VALIDATION_FAILED`.
6. **Input assets**: each referenced asset exists in the same workspace and is `ACTIVE`; constraints below; otherwise `VALIDATION_FAILED` with the offending field.
7. **Pricing**: resolve SKU and Tokens from the cost schedule; no SKU → `UNPRICED_CONFIGURATION` (422).
8. **Idempotency**: an existing job with the same key and an identical canonical request returns that job (HTTP 200); the same key with a different request returns `IDEMPOTENCY_KEY_REUSED` (409).
9. **Reservation** (Token engine): `INSUFFICIENT_TOKENS` (402) or `MEMBER_QUOTA_EXCEEDED` (403).

### 2.2 Input asset constraints

| Type | Constraint |
| :--- | :--- |
| `image_to_video` | Source is a PNG or JPEG image, ≤ 20 MB; output aspect ratio follows the source. |
| `inpainting` | Source image within a 1024² pixel budget; mask is a single-channel image with identical dimensions; white regenerates. |
| `video_upscale` | Source is a generated video asset in the same workspace at 720p or 1080p, 24 fps. |

### 2.3 Deferred capabilities

Image conditioning (ControlNet/depth/canny), outpainting, video-to-video, frame interpolation, batch sizes 2 and 3, 30 fps, durations of 6–8 s, and 2048 px inpainting or batch have no priced SKU and are not accepted. Adding one requires a cost-schedule extension and a new request variant (ADR-004).

---

## 3. Request Lifecycle

```text
Client --POST /generation--> API Gateway
  1. Validate (§2.1) ── any failure: respond, no job, no hold
  2. Create job REQUESTED (request snapshot, SKU, schedule version, requestId)
  3. Queue-depth check for the target queue
       depth over threshold and priority STANDARD ──> job QUEUED_BACKLOG, 202 with estimatedWaitSeconds
       (no hold yet; a promoter re-evaluates and continues at step 4 when depth falls)
  4. Reserve Tokens atomically ── job AUTHORIZED, reservation RESERVED
  5. Mint input read URLs and output upload targets (signed, short-lived)
  6. Publish GenerationTaskEnvelope to the routed queue ── job QUEUED
       publish fails ── release hold, job FAILED (ENQUEUE_FAILED)
  7. Respond 202 { generationJobId, requestId, state, pricingSku, tokensToReserve }
  8. Client subscribes to channel x-framic-generation:/{workspaceId}/{jobId}
  9. Worker leases the task ── API marks RUNNING (startedAt), emits job.running
 10. Worker executes (§5); heartbeats every 3 s emit job.progress
 11a. Success: worker persists outputs, sends completion report; API verifies objects,
      creates asset rows with lineage, settles reservation (DEBITED), job SUCCEEDED, emits job.completed
 11b. Failure: worker (or sweeper) reports a failure code; API releases the hold,
      job FAILED, emits job.failed. Net Token impact: zero.
```

Cancellation (`POST /generation/{id}/cancel`) is allowed in `REQUESTED`, `QUEUED_BACKLOG`, `AUTHORIZED`, and `QUEUED`. The API removes the task from the queue (or marks it so workers discard it on lease), releases any hold with reason `CANCELLED_BEFORE_PICKUP`, and sets `CANCELLED`. `RUNNING` jobs cannot be cancelled; they finish or fail.

The state machine is `GENERATION_JOB_TRANSITIONS`; any other transition is a defect and must be rejected and alerted.

---

## 4. Queue Topology

| Queue | Carries | Priority handling |
| :--- | :--- | :--- |
| `video.render.priority` | `text_to_video`, `image_to_video` with `priority: PRIORITY` | Drained before standard |
| `video.render.standard` | `text_to_video`, `image_to_video` with `priority: STANDARD` | Backlog-eligible |
| `video.upscale.batch` | `video_upscale` | Backlog-eligible |
| `image.diffusion.standard` | `text_to_image` (1 variation), `inpainting` | Backlog-eligible |
| `image.batch.queue` | `text_to_image` with 4 variations | Backlog-eligible |

Broker contract (implementation chosen in Commit 6, satisfying the lean containerized MVP): at-least-once delivery; per-message lease with explicit extension; dead-letter queue after the lease expires without completion; ordering is best-effort FIFO per queue. Consumers must be idempotent on `jobId`.

Backlog: each queue has a configured depth threshold. Only `STANDARD` requests are diverted to `QUEUED_BACKLOG`; `PRIORITY` always proceeds to reservation. Estimated wait = queue depth ÷ trailing-15-minute completion rate for that queue, rounded up to whole seconds.

---

## 5. Worker Execution Model

```text
lease task ─> API: RUNNING ─> resolve inputs ─> backend.submit ─> heartbeat(handle)
  ─> loop { backend.poll; heartbeat(progress) }  until SUCCEEDED | FAILED | task timeout
  ─> backend.fetchResult ─> copy each output into its pre-signed storage target
  ─> verify (size, sha256, decode probe: width, height, duration, fps)
  ─> completion report  (or failure report with a failure code)
```

| Concern | Rule |
| :--- | :--- |
| Heartbeat | Every `WORKER_HEARTBEAT_INTERVAL_SECONDS` (3 s) with progress and the `backendJobId` once known, so a re-leased task reuses the existing backend task instead of submitting twice. |
| Lease loss | No heartbeat for 3 consecutive intervals plus grace (default 15 s) → the sweeper fails the job `LEASE_EXPIRED` and releases the hold. A late completion report for a terminal job is ignored and logged. |
| Task timeout | Per-backend ceiling (`taskTimeoutSeconds`); initial defaults: images 300 s, video 900 s, upscale 1200 s, tuned from telemetry. Exceeding it → `backend.cancel`, failure `TIMEOUT`. |
| Storage upload | Up to 3 attempts with exponential backoff, then `STORAGE_PERSIST_FAILED`. |
| Verification | Probe results must match the request (resolution, duration, fps within one frame). Mismatch → `INVALID_OUTPUT` is reported as `PROVIDER_ERROR` with detail. |
| Callbacks | Authenticated (HMAC over the raw body with a per-worker credential, timestamped, replay window 300 s), at-least-once, idempotent per `jobId`. |
| Concurrency | Bounded by `maxConcurrency` of the backend descriptor; a worker never leases more than it can heartbeat. |

### 5.1 Output formats

| Type | Master output | Notes |
| :--- | :--- | :--- |
| Images | PNG (lossless) | WebP derived on export; variations are separate assets sharing a `generationJobId` and distinct seeds |
| Videos | MP4 (H.264), 24 fps | WebM and ProRes 422 proxy are export transforms, not generation outputs |
| Upscale | MP4 (H.264), 3840×2160 | New asset; `parentAssetIds` references the source |

Each asset stores its full lineage (`AssetLineage`): accepted request, resolved seed, model version, backend, SKU, Tokens settled. "Remix / Re-run" rehydrates the studio rack from it.

---

## 6. Failure Classification

| Failure code | Cause | Detected by | Tokens |
| :--- | :--- | :--- | :---: |
| `ENQUEUE_FAILED` | Broker publish failed or no worker route | Gateway | 0 |
| `WORKER_CRASH` | Worker process died mid-task and reported by supervisor | Sweeper / supervisor | 0 |
| `LEASE_EXPIRED` | Heartbeats stopped | Sweeper | 0 |
| `CUDA_OOM` | GPU out of memory | GPU backend | 0 |
| `TIMEOUT` | Task exceeded `taskTimeoutSeconds` or queue age limit (default 60 min) | Worker / sweeper | 0 |
| `PROVIDER_ERROR` | Hosted API error, capacity, or invalid output | Hosted backend | 0 |
| `PROVIDER_CONTENT_REJECTED` | Safety filter rejected prompt or output | Backend | 0 |
| `INVALID_INPUT_ASSET` | Input asset unreadable or violates §2.2 at execution time | Worker | 0 |
| `STORAGE_PERSIST_FAILED` | Output could not be stored and verified | Worker | 0 |

Every failure releases the reservation. There is no automatic job retry: a failed job is terminal, and the client may submit a new request with a new `idempotencyKey`. Only the storage upload has a local retry (§5).

### 6.1 Sweeper

Runs every 60 s and enforces: `AUTHORIZED` without a published task for > 60 s → `ENQUEUE_FAILED`; `RUNNING` with an expired lease → `LEASE_EXPIRED`; `QUEUED` older than the queue age limit → `TIMEOUT`; reservations in `RESERVED` whose job is terminal → released and alerted. Sweeper actions go through the same API operations as workers.

---

## 7. Realtime Contract

Channel: `x-framic-generation:/{workspaceId}/{jobId}`. Notification method: `x-framic/generation/updated`, payload `FramicGenerationStateEnvelope`. Event types map to `GENERATION_JOB_EVENT_TYPES` (`job.authorized`, `job.queued`, `job.running`, `job.progress`, `job.completed`, `job.failed`, `job.cancelled`).

The envelope schema rejects inconsistent combinations (for example `SUCCEEDED` without `DEBITED`), so a client can never observe Tokens in the wrong state. Clients that miss events recover via `GET /generation/{id}`, which is authoritative.

Outbound webhooks for pipeline users deliver the same envelope on `job.completed`, `job.failed`, and `job.cancelled`, signed per subscription, retried with exponential backoff for 24 hours.

---

## 8. Observability

Metrics are exported through `packages/observability` in Prometheus format:

| Metric | Labels |
| :--- | :--- |
| `framic_generation_jobs_total` | `type`, `state`, `failure_code` |
| `framic_generation_job_duration_seconds` (histogram) | `type`, `backend_id` |
| `framic_queue_depth` | `queue` |
| `framic_queue_wait_seconds` (histogram) | `queue` |
| `framic_worker_heartbeat_lag_seconds` | `backend_id` |
| `framic_tokens_total` | `operation` (`reserved`, `settled`, `released`, `refunded`) |
| `framic_ledger_reconciliation_drift` | none (must be 0) |

Alerts: queue wait p95 over target, any non-zero ledger drift, failure rate by `backend_id` above threshold, sweeper actions per hour above baseline.

---

## 9. Security

- All media in private buckets; clients receive short-lived signed URLs only (preview and download TTLs set in Commit 6).
- Worker credentials permit only: dequeue, callback signing, and write access to pre-signed output targets. No database or ledger access.
- Backend credentials (hosted API tokens) exist only in worker environments and are never written to jobs, logs, or lineage.
- Prompts and input assets are tenant data: logs record IDs and hashes, never prompt text.
- Content-safety rejections are surfaced as `PROVIDER_CONTENT_REJECTED` with no Token charge and recorded in the audit log.
