# Framic AI — Replicate API Integration & Asynchronous Pipeline Specification

> **Architectural Specification**: Production-grade engineering specification for Framic AI's managed inference integration layer.  
> Governs the architectural transition to an **API-first generation model** utilizing the Replicate API for visual synthesis, OpenRouter for prompt expansion, and Supabase for state, token ledgers, and asset persistence.  
> *Strictly excludes self-hosted GPU worker nodes, conversational chatbots, and placeholder configurations.*

---

## 1. Architectural Scope & Invariants

Framic AI operates on an **API-first, managed inference architecture**. The platform eliminates internal GPU cluster orchestration, local ComfyUI daemons, and custom hardware maintenance. All intensive generative diffusion tasks are delegated to enterprise managed inference providers.

```text
+----------------------------------------------------------------------------------------------------+
|                                      FRAMIC AI CLIENT TIER                                         |
|                                [ apps/web — Next.js 15+ App Router ]                               |
|   - AI Video Studio (T2V / I2V Parameter Rack)     - AI Image Studio (T2I / I2I Canvas)            |
|   - Live Token Balance & Reservation State         - Supabase Realtime Job Subscription Channel    |
+--------------------------------------------------+-------------------------------------------------+
                                                   |
                     (1) POST /api/generation/create (JWT + Idempotency Key)
                                                   v
+----------------------------------------------------------------------------------------------------+
|                                    NEXT.JS EDGE & API GATEWAY                                      |
|                                                                                                    |
|  1. Authenticate Session via Supabase Auth (Bearer Token / Cookie)                                 |
|  2. Validate Parameter Schema against Model Matrix via Zod                                         |
|  3. Execute Pre-flight Atomic Hold via Supabase RPC (Tokens RESERVED in Ledger)                     |
|  4. Generate HMAC-signed Webhook Callback URL                                                      |
|  5. Dispatch Prediction to Replicate REST API (https://api.replicate.com/v1/predictions)             |
|  6. Persist Job Record (`generation_jobs`) with Replicate `prediction_id` in Supabase               |
+--------------------------+-----------------------------------------------+-------------------------+
                           |                                               |
             (2) Dispatches Prediction                         (3) Atomically Holds Tokens
                           v                                               v
+----------------------------------------------------+   +-------------------------------------------+
|               REPLICATE API PLATFORM               |   |            SUPABASE POSTGRESQL            |
|                                                    |   |                                           |
|  - Manages Hardware & Cold-Starts                  |   |  - `public.profiles`                      |
|  - Runs Flux, Minimax, Kling, Luma, SDXL           |   |  - `public.credit_wallets`                |
|  - Executes Asynchronous Latent Diffusion          |   |  - `public.credit_transactions` (Ledger)  |
|  - Emits Webhook on State Transitions              |   |  - `public.generation_jobs`               |
+--------------------------+-------------------------+   |  - `public.generated_assets`              |
                           |                             |  - `public.webhook_events` (Audit log)    |
         (4) POST /api/webhooks/replicate                +---------------------+---------------------+
             (Payload + Signature Headers)                                     ^
                           |                                                   |
                           v                                                   |
+----------------------------------------------------+                         |
|        WEBHOOK RECEIVER & SETTLEMENT ENGINE        |                         |
|             [/api/webhooks/replicate]              |                         |
|                                                    |                         |
|  1. Verify Replicate HMAC Signature (`webhook-id`, |                         |
|     `webhook-timestamp`, `webhook-signature`)      |                         |
|  2. Idempotency Check in `public.webhook_events`   |                         |
|  3. Ingest Output Media: Replicate Temporary URL   |                         |
|     -> Persistent Supabase Storage Object Bucket   |                         |
|  4. Atomic Settlement via RPC:                     |                         |
|     - SUCCEEDED -> Transition Hold to DEBITED      |-------------------------+
|     - FAILED / CANCELED -> RELEASE Hold (0 Debited)|
|  5. Broadcast State Update to Client Realtime Topic|
+----------------------------------------------------+
```

### Invariant System Principles
1. **Zero Self-Hosted GPU Nodes**: Computing infrastructure is 100% serverless/edge on the application side. All inference execution occurs on upstream managed hardware via Replicate.
2. **Strict Token Metering**: Every generation request calculates its cost in whole integer **Tokens**. Currency values are strictly absent from generation tables, RPC signatures, and API contracts.
3. **Double-Entry Reservation Holds**: No prediction may be dispatched to Replicate without a verified, pre-flight token hold in PostgreSQL. If Replicate fails or cancels, the hold is released back to available tokens with zero net charge.
4. **Permanent Asset Storage**: Replicate output URLs are temporary (expiring within 1 hour). The webhook settlement worker must synchronously stream output files to private Supabase Storage buckets prior to marking a job `succeeded`.
5. **No Conversational Chatbots**: OpenRouter is utilized solely as a headless, deterministic prompt transformation utility (e.g., expanding brief creative prompts into dense negative/positive conditioning vectors).

---

## 2. Supported Model Matrix & Modality Capabilities

Framic AI abstracts provider-specific model hashes into clean internal model identifiers defined in `@framic/types`:

### 2.1 Video Generation Models (Replicate)

| Internal Model Identifier | Upstream Replicate Model Path | Modality | Supported Outputs | Native Frame Rates & Durations | Token Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `video-minimax-01` | `minimax/video-01` | T2V, I2V | MP4 (720p, 1080p) | 25 fps, 6 seconds | **100 Tokens** |
| `video-kling-v1` | `kwaivgi/kling-v1` | T2V, I2V | MP4 (720p, 1080p) | 30 fps, 5s or 10s | **120 Tokens** |
| `video-luma-ray` | `luma/ray` | T2V, I2V | MP4 (720p) | 24 fps, 5 seconds | **80 Tokens** |
| `video-svd-xt` | `stability-ai/stable-video-diffusion` | I2V | MP4 (576x1024) | 25 frames, motion bucket | **50 Tokens** |

### 2.2 Image Generation Models (Replicate)

| Internal Model Identifier | Upstream Replicate Model Path | Modality | Output Formats | Aspect Ratios | Token Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `image-flux-pro-1.1` | `black-forest-labs/flux-1.1-pro` | T2I | Lossless PNG / WebP | 1:1, 16:9, 9:16, 4:3, 21:9 | **15 Tokens** |
| `image-flux-dev` | `black-forest-labs/flux-dev` | T2I, I2I | Lossless PNG / WebP | Custom resolutions up to 2MP | **8 Tokens** |
| `image-sdxl-turbo` | `stability-ai/sdxl` | T2I, I2I, Inpaint | Lossless PNG / WebP | 1024x1024 | **5 Tokens** |
| `image-upscale-clarity` | `philwang/face-clarity` | Super-Res | 4K PNG | 2x, 4x spatial scaling | **10 Tokens** |

### 2.3 Prompt Enhancement Engine (OpenRouter)
- **Model**: `anthropic/claude-3.5-haiku` or `meta-llama/llama-3.3-70b-instruct` via OpenRouter REST API.
- **Role**: Headless parameter synthesis. Takes a raw creative phrase (e.g., *"cyberpunk rain alley"*) and outputs structured prompt objects:
  - `positive_prompt`: Photorealistic composition, lighting, lens types (e.g., *"35mm anamorphic lens, Arri Alexa Mini, volumetric neon haze..."*).
  - `negative_prompt`: Exclusion vectors (e.g., *"low resolution, text, watermark, bad anatomy, flicker, blur"*).
  - `motion_guidance`: Camera trajectory cues for video models.
- **Token Cost**: **1 Token** (debited upon invocation).

---

## 3. End-to-End API Architecture & Next.js Routes

The API architecture is structured across dedicated Next.js App Router route handlers:

```text
apps/web/app/api/
├── generation/
│   ├── create/route.ts           # POST: Validate, hold tokens, dispatch to Replicate
│   ├── cancel/route.ts           # POST: Cancel running prediction & release hold
│   └── [id]/status/route.ts      # GET: Polling fallback / authoritative job state
├── webhooks/
│   └── replicate/route.ts        # POST: Webhook receiver, HMAC verification, asset upload
├── enhance-prompt/route.ts       # POST: Headless prompt expansion via OpenRouter
└── balance/route.ts              # GET: Authenticated user token wallet status
```

---

## 4. Asynchronous Request & Webhook Execution Flow

### 4.1 Step 1: Client Request Ingestion (`POST /api/generation/create`)
The user triggers generation from the Studio rack.

```typescript
// Incoming Client Request Contract
export interface CreateGenerationRequest {
  model: string;                      // e.g., 'video-minimax-01'
  type: 'text_to_video' | 'image_to_video' | 'text_to_image' | 'image_to_image';
  prompt: string;
  negativePrompt?: string;
  inputAssetId?: string;              // UUID for I2V/I2I
  parameters: {
    aspectRatio?: '16:9' | '9:16' | '1:1' | '4:3';
    durationSeconds?: number;
    fps?: number;
    seed?: number;
    guidanceScale?: number;
    numInferenceSteps?: number;
  };
  idempotencyKey: string;             // Client-generated UUID
}
```

**Gateway Execution Logic**:
1. Authenticate the caller using `supabase.auth.getUser()`. Extract `user_id`.
2. Look up the internal model configuration and determine authoritative `tokenCost`.
3. Invoke the atomic pre-flight token reservation RPC:
   ```sql
   SELECT * FROM public.reserve_generation_tokens(
     p_user_id => :user_id,
     p_amount => :tokenCost,
     p_idempotency_key => :idempotencyKey,
     p_metadata => jsonb_build_object('model', :model, 'type', :type)
   );
   ```
   - If insufficient balance: return HTTP 402 with code `INSUFFICIENT_TOKENS`.
   - If success: receive `reservation_id` and proceed.
4. Insert initial row into `public.generation_jobs` with status `'authorized'`.
5. Construct the webhook URL with an HMAC token:
   ```text
   https://api.framic.ai/api/webhooks/replicate?job_id=<job_uuid>&token=<secure_token>
   ```
6. Dispatch prediction to Replicate:
   ```text
   POST https://api.replicate.com/v1/predictions
   Authorization: Bearer process.env.REPLICATE_API_TOKEN
   Content-Type: application/json

   {
     "version": "<replicate_model_version_id>",
     "input": { ...mapped_parameters },
     "webhook": "https://api.framic.ai/api/webhooks/replicate?job_id=<job_uuid>",
     "webhook_events_filter": ["start", "completed"]
   }
   ```
7. Update `public.generation_jobs`:
   - Set `provider_job_id` = `replicate_prediction.id`
   - Set `status` = `'queued'`
8. Return HTTP 202 Accepted to client with `jobId`, `tokenCost`, and `status: "queued"`.

---

### 4.2 Step 2: Webhook Handler (`POST /api/webhooks/replicate`)
Replicate invokes this endpoint when the prediction transitions to `processing`, `succeeded`, `failed`, or `canceled`.

```typescript
// Incoming Replicate Webhook Payload Contract
export interface ReplicateWebhookPayload {
  id: string;                         // Replicate prediction ID
  version: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  input: Record<string, unknown>;
  output: string | string[] | null;   // URL or array of URLs
  error: string | null;
  logs: string | null;
  metrics?: {
    predict_time?: number;
    total_time?: number;
  };
}
```

**Webhook Processing & Security Invariants**:
1. **Cryptographic Verification**:
   - Extract headers: `webhook-id`, `webhook-timestamp`, `webhook-signature`.
   - Construct signature payload: `${webhookId}.${webhookTimestamp}.${rawBody}`.
   - Compute HMAC SHA-256 with `process.env.REPLICATE_WEBHOOK_SIGNING_KEY`.
   - Reject with HTTP 401 if signatures do not match or if timestamp is older than 300 seconds.
2. **Idempotency Check**:
   - Query `public.webhook_events` for `provider = 'replicate'` and `provider_event_id = :id`.
   - If already recorded with status `'processed'`: return HTTP 200 immediately.
3. **Handle Terminal State**:
   - **Case A: `succeeded`**:
     1. Retrieve temporary media URL from `payload.output`.
     2. Download media buffer from Replicate CDN.
     3. Stream buffer directly to private Supabase Storage bucket (`generated-media/${userId}/${jobId}.mp4`).
     4. Generate permanent CDN URL.
     5. Insert record into `public.generated_assets`.
     6. Settle token hold via atomic RPC:
        ```sql
        SELECT * FROM public.settle_generation_tokens(
          p_job_id => :job_id,
          p_asset_id => :asset_id
        );
        ```
     7. Update `public.generation_jobs` to status `'succeeded'`.
   - **Case B: `failed` or `canceled`**:
     1. Extract error details from `payload.error`.
     2. Release token reservation hold via atomic RPC:
        ```sql
        SELECT * FROM public.release_generation_tokens(
          p_job_id => :job_id,
          p_reason => :payload.error
        );
        ```
     3. Update `public.generation_jobs` to status `'failed'` or `'cancelled'`.
     4. Net balance impact: **Zero tokens debited**.
4. Log processed webhook in `public.webhook_events` with status `'processed'`.
5. Return HTTP 200 OK to Replicate.

---

## 5. Supabase Token Reservation & Ledger RPC Contract

The token ledger guarantees double-entry bookkeeping and zero race conditions under high concurrency.

```sql
-- Conceptual RPC Definitions for Token Reservation & Settlement

-- 1. Reserve tokens prior to upstream provider submission
CREATE OR REPLACE FUNCTION public.reserve_generation_tokens(
  p_user_id UUID,
  p_amount BIGINT,
  p_idempotency_key TEXT,
  p_metadata JSONB DEFAULT '{}'::jsonb
) RETURNS TABLE (
  success BOOLEAN,
  reservation_id UUID,
  available_balance BIGINT,
  error_code TEXT
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_wallet RECORD;
  v_res_id UUID;
BEGIN
  -- Row lock wallet
  SELECT * INTO v_wallet FROM public.credit_wallets 
  WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::UUID, 0::BIGINT, 'WALLET_NOT_FOUND';
    RETURN;
  END IF;

  IF v_wallet.balance < p_amount THEN
    RETURN QUERY SELECT false, NULL::UUID, v_wallet.balance, 'INSUFFICIENT_BALANCE';
    RETURN;
  END IF;

  -- Create reservation hold
  INSERT INTO public.credit_transactions (
    user_id, wallet_id, type, amount, balance_before, balance_after,
    status, idempotency_key, metadata
  ) VALUES (
    p_user_id, v_wallet.id, 'deduction', -p_amount,
    v_wallet.balance, v_wallet.balance - p_amount,
    'pending', p_idempotency_key, p_metadata
  ) RETURNING id INTO v_res_id;

  -- Decrement wallet available balance
  UPDATE public.credit_wallets 
  SET balance = balance - p_amount, updated_at = now()
  WHERE id = v_wallet.id;

  RETURN QUERY SELECT true, v_res_id, (v_wallet.balance - p_amount), 'OK';
END;
$$;

-- 2. Settle reserved tokens upon verified output asset upload
CREATE OR REPLACE FUNCTION public.settle_generation_tokens(
  p_job_id UUID,
  p_asset_id UUID
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Mark transaction completed
  UPDATE public.credit_transactions
  SET status = 'completed', metadata = metadata || jsonb_build_object('asset_id', p_asset_id)
  WHERE id = (SELECT credit_transaction_id FROM public.generation_jobs WHERE id = p_job_id);

  UPDATE public.generation_jobs
  SET status = 'succeeded', completed_at = now()
  WHERE id = p_job_id;

  RETURN true;
END;
$$;

-- 3. Release reserved tokens upon provider error or cancellation
CREATE OR REPLACE FUNCTION public.release_generation_tokens(
  p_job_id UUID,
  p_reason TEXT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tx RECORD;
BEGIN
  -- Retrieve pending transaction
  SELECT * INTO v_tx FROM public.credit_transactions
  WHERE id = (SELECT credit_transaction_id FROM public.generation_jobs WHERE id = p_job_id);

  IF FOUND AND v_tx.status = 'pending' THEN
    -- Refund balance back to wallet
    UPDATE public.credit_wallets
    SET balance = balance + ABS(v_tx.amount), updated_at = now()
    WHERE id = v_tx.wallet_id;

    -- Update transaction state to rolled_back
    UPDATE public.credit_transactions
    SET status = 'rolled_back', metadata = metadata || jsonb_build_object('release_reason', p_reason)
    WHERE id = v_tx.id;
  END IF;

  UPDATE public.generation_jobs
  SET status = 'failed', status_reason = p_reason, completed_at = now()
  WHERE id = p_job_id;

  RETURN true;
END;
$$;
```

---

## 6. Fault Tolerance, Polling Fallback & Error Classification

### 6.1 Missed Webhook Recovery (Reconciliation Cron)
Webhooks delivered over public networks may occasionally encounter network timeouts or edge gateway drops.
- **Background Cron Engine**: A scheduled service runs every **60 seconds**.
- **Query Criteria**: Selects all jobs in `public.generation_jobs` where `status IN ('queued', 'running')` and `created_at < NOW() - INTERVAL '3 minutes'`.
- **Reconciliation Action**: Queries `GET https://api.replicate.com/v1/predictions/{provider_job_id}`:
  - If Replicate reports `succeeded`: Dispatches payload directly to the internal settlement handler.
  - If Replicate reports `failed`: Releases token hold and marks job `failed`.
  - If prediction has exceeded 15 minutes: Cancels prediction on Replicate, releases hold, and logs `TIMEOUT_EXCEEDED`.

### 6.2 Error Classification Codes

| Error Code | Classification | Trigger Cause | System Action | Net Token Cost |
| :--- | :--- | :--- | :--- | :--- |
| `ERR_NSFW_CONTENT` | Content Violation | Safety filter flagged prompt/latent output | Reject, release hold, alert user | **0 Tokens** |
| `ERR_PROVIDER_TIMEOUT` | Upstream Timeout | Inference exceeded maximum duration | Terminate, release hold | **0 Tokens** |
| `ERR_PROVIDER_CAPACITY`| High Concurrency | Replicate GPU capacity unavailable | Back off, retry or release hold | **0 Tokens** |
| `ERR_STORAGE_UPLOAD` | Internal Ingestion | Transfer to Supabase Storage failed | Retry upload (3x), then release | **0 Tokens** |
| `ERR_INVALID_PARAMS` | Client Validation | Dimension/frame count unsupported | Reject at Gateway (pre-hold) | **0 Tokens** |

---

## 7. Production Environment Configuration

All provider credentials and signing secrets are strictly server-side environment variables:

```bash
# --- REPLICATE API CREDENTIALS ---
REPLICATE_API_TOKEN=r8_************************************
REPLICATE_WEBHOOK_SIGNING_KEY=whsec_************************************

# --- OPENROUTER API CREDENTIALS ---
OPENROUTER_API_KEY=sk-or-v1-************************************

# --- SUPABASE PERSISTENCE & STORAGE ---
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_STORAGE_BUCKET=generated-media

# --- PLATFORM INGRESS CONFIGURATION ---
NEXT_PUBLIC_APP_URL=https://app.framic.ai
WEBHOOK_BASE_URL=https://api.framic.ai
```
