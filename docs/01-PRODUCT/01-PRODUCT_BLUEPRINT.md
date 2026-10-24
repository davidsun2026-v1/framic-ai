# Framic AI — Product Blueprint & Functional Specification

> **Commit 3 Deliverable**: Authoritative product specification establishing functional capabilities, user personas, end-to-end media workflows, token transaction lifecycles, and multi-tenant permission models for Framic AI.  
> *Governs the core generative platform; zero source code, mockups, or non-visual chatbot components.*

---

## 1. Executive Product Blueprint & Platform Scope

**Framic AI** is a purpose-built generative media platform designed for creators, creative studios, and enterprise production teams. The platform isolates computing power and interface controls exclusively to **AI Video Synthesis** and **AI Image Creation**, backed by an immutable double-entry token ledger and multi-tenant workspace governance.

### 1.1 Invariant System Boundaries
- **Visual Media Generation Exclusivity**: The platform provides zero conversational chatbots, general text assistants, or non-visual generative features. All GPU cycles, API surfaces, and interface components serve visual asset synthesis.
- **Strict Tokenized Accounting**: Financial transactions occur only at the boundary of token procurement. Internal usage, team quotas, and generation costs are calculated, reserved, and settled strictly in integer **Tokens**.
- **Deterministic Job Isolation**: Every generation execution is treated as an isolated, idempotent asynchronous job tracked through an explicit state machine with guaranteed cleanup.
- **Complete Asset Provenance**: Every output asset is intrinsically linked to its generation lineage (seed, prompt, model version, sampling steps, camera motion parameters, and token cost).

---

## 2. User Personas & Target Segments

```text
+----------------------------------------------------------------------------------------------------+
|                                    TARGET USER PERSONAS                                            |
+--------------------------------+-----------------------------------+-------------------------------+
|  1. Independent Digital Artist |  2. Creative Studio Lead          |  3. Enterprise Media Pipeline |
|  - Solo VFX artist / designer  |  - Production agency manager      |  - Automated content engineer |
|  - Needs precision controls    |  - Manages 5–50 team seats        |  - Programmatic API consumer  |
|  - Relies on camera motion     |  - Needs token pool governance    |  - High-volume batch rendering|
|  - Requires instant downloads  |  - Requires shared asset vaults   |  - Strict webhook SLAs        |
+--------------------------------+-----------------------------------+-------------------------------+
```

### 2.1 Persona 1: The Independent Digital Creator / VFX Artist
- **Profile**: Solo commercial illustrator, concept artist, motion designer, or indie filmmaker.
- **Primary Need**: Fine-grained parametric control over video motion trajectories, camera angles, aspect ratios, and seed consistency across multi-shot sequences.
- **Core Workflow**: Iterative image prompt synthesis → selecting best hero image → applying Image-to-Video (I2V) motion conditioning → upscaling to 4K for client delivery.
- **Pain Point Solved**: Eliminates unrecoverable generation failures where tokens/credits are lost due to server crashes or unusable artifacts.

### 2.2 Persona 2: The Creative Studio / Agency Lead
- **Profile**: Creative director or studio supervisor managing a team of 5 to 50 creators.
- **Primary Need**: Centralized token balance management with granular team member quotas, shared project asset libraries, and visibility into operational token consumption.
- **Core Workflow**: Provisioning team seats → establishing monthly token budgets per creator → reviewing shared asset vaults → managing team exports and parameter presets.
- **Pain Point Solved**: Prevents runaway credit consumption by junior team members through pre-flight token reservation limits and centralized workspace billing.

### 2.3 Persona 3: The Enterprise Media Pipeline Operator
- **Profile**: Technical director or pipeline engineer integrating generative capabilities into existing video publishing pipelines.
- **Primary Need**: Predictable queue latencies, headless API invocation, webhook notification callbacks, and high-volume batch synthesis.
- **Core Workflow**: Authenticating via API key → submitting batch image-to-video jobs → receiving webhook notifications on completion → pulling rendered video assets to external storage.
- **Pain Point Solved**: Provides deterministic job states and explicit failure classification codes without silent drops.

---

## 3. Capability Boundaries & Functional Matrix

### 3.1 AI Video Synthesis Engine
The video studio enables multi-dimensional generative motion synthesis backed by dedicated GPU inference clusters:

| Capability | Supported Modalities | Input Requirements | Output Specifications |
| :--- | :--- | :--- | :--- |
| **Text-to-Video (T2V)** | Text prompt + negative prompt | Descriptive prompt (1–500 chars), aspect ratio, camera motion | MP4 / WebM, 720p/1080p, 24/30 fps, 4–8 seconds duration |
| **Image-to-Video (I2V)** | Source image + motion prompt | Initial keyframe image (PNG/JPEG, max 20MB) + motion guidance | MP4 / WebM, matches input aspect ratio, smooth temporal flow |
| **Video-to-Video (V2V)** | Source video + style guidance | Input MP4 clip (max 10s, max 50MB) + style prompt + strength | Restyled video preserving original motion geometry |
| **Camera Trajectory Control** | Dynamic motion conditioning | Pan (L/R), Tilt (U/D), Zoom (In/Out), Roll (CW/CCW), Dolly | 6-DOF camera movement rendered into the latent motion field |
| **Temporal Frame Interpolation** | AI frame doubling/tripling | Existing generated video clip | Smooth 24 fps to 48/60 fps conversion without motion blur |
| **Video Super-Resolution** | AI spatial upscaling | Generated video clip (720p or 1080p) | 4K UHD (3840x2160) upscaled output with edge preservation |

### 3.2 AI Image Creation Engine
The image studio provides precise raster generation and conditioning:

| Capability | Modalities | Parameters & Conditioning | Output Specifications |
| :--- | :--- | :--- | :--- |
| **Text-to-Image (T2I)** | Text prompt + negative prompt | CFG scale (1.0–20.0), sampling steps (20–50), seed, sampler | 1024x1024 to 2048x2048 px, lossless PNG / WebP |
| **Image Conditioning** | ControlNet / Depth / Canny | Source reference image + conditioning weight (0.1–1.0) | Strict structural adherence to reference geometry |
| **Inpainting / Mask Fill** | Image + binary alpha mask | Brush mask overlay + replacement prompt | Seamless latent blend with surrounding image context |
| **Outpainting / Canvas Expand**| Image + directional offsets | Canvas expansion bounds (Top/Bottom/Left/Right) | Extended scene boundaries with consistent lighting |
| **Batch Prompt Synthesis** | Multi-seed generation | Batch count (1 to 4 parallel variations) | Grid of independent visual outputs with identical parameters |

### 3.3 Asset Vault & Management
- **Non-Destructive Lineage Tracking**: Every visual output preserves its generation recipe. Users can click "Remix / Re-run" to hydrate all parameters directly into the studio rack.
- **Tagging, Collections & Projects**: Workspaces support nested project folders, automated color tagging, and model-version filtering.
- **Export Formats**: Direct downloads supporting MP4 (H.264 / ProRes 422 proxy), lossless PNG, and optimized WebP.

---

## 4. End-to-End User Workflows & State Machines

### 4.1 Workflow A: Text-to-Video Generation with Camera Conditioning

```text
[ User Enters Studio ]
         |
         v
[ Selects Model: Framic Motion-X ]
         |
         v
[ Configures: Prompt, Negative Prompt, Aspect Ratio (16:9), Duration (4s), Camera: Dolly-Forward ]
         |
         v
[ UI Calculates Token Cost: 100 Tokens ]
         |
         v
[ User Clicks "Generate Video" ]
         |
         v
[ API Gateway: Pre-flight Verification ]
   ├── Balance < 100 Tokens? ──────> [ Return 402 Insufficient Balance Error ]
   └── Balance >= 100 Tokens?
         |
         v
[ Atomic DB Transaction: Hold 100 Tokens in RESERVED Status ]
         |
         v
[ Enqueue Job payload into 'video.render.priority' Broker ]
         |
         v
[ Client receives Job ID & initiates WebSocket subscription ]
         |
         v
[ GPU Worker pulls task lease, loads weights, performs latent diffusion ]
         |
         +── Worker Crashes / CUDA OOM? ──> [ Release Hold -> 0 Tokens Debited -> Mark FAILED ]
         |
         +── Worker Succeeds:
                  ├── Render MP4 written to Private S3 Bucket
                  ├── Signed URL generated
                  ├── DB Transaction: Settle RESERVED -> DEBITED in Token Ledger
                  └── Emit 'job.completed' event to WebSocket
                           |
                           v
              [ Client UI plays finished video ]
```

### 4.2 Generation Job State Machine

```text
               +-------------------------------------------+
               |                 REQUESTED                 |
               +---------------------+---------------------+
                                     |
                               (Pre-flight OK)
                                     |
                                     v
               +-------------------------------------------+
               |                AUTHORIZED                 |
               |        (Token Hold Placed in DB)          |
               +---------------------+---------------------+
                                     |
                               (Task Enqueued)
                                     |
                                     v
               +-------------------------------------------+
               |                  QUEUED                   |
               +---------------------+---------------------+
                                     |
                           (Worker Leases Task)
                                     |
                                     v
               +-------------------------------------------+
               |                 RUNNING                   |
               |    (Heartbeat emitted every 3 seconds)    |
               +----------+--------------------+-----------+
                          |                    |
                  (Render Success)      (Worker Crash / Timeout / OOM)
                          |                    |
                          v                    v
+-----------------------------------+   +------------------------------------+
|             SUCCEEDED             |   |               FAILED               |
|  - Upload asset to Object Storage |   |  - Release token reservation hold  |
|  - Settle tokens to DEBITED status|   |  - Write error classification code |
|  - Link asset to workspace vault  |   |  - Net token balance impact: ZERO  |
+-----------------------------------+   +------------------------------------+
```

---

## 5. Token Accounting & Transaction Lifecycle Engine

### 5.1 The Principle of Token Exclusivity
- No dollar or fiat currency values exist in runtime tables, studio UI components, or generation request payloads.
- All computational consumption is denominated in whole integer **Tokens**.
- Subscriptions and credit packs deposit verified blocks of Tokens into the workspace wallet via atomic database procedures.

### 5.2 Token Consumption Schedule

| Pipeline Type | Configuration & Quality | Resolution | Token Cost |
| :--- | :--- | :--- | :--- |
| **Image Standard** | 30 steps, standard CFG, 1 variation | 1024 x 1024 px | **5 Tokens** |
| **Image High-Res** | 50 steps, latent fix, 1 variation | 2048 x 2048 px | **15 Tokens** |
| **Image Inpainting** | Mask conditioning + 30 steps | 1024 x 1024 px | **8 Tokens** |
| **Image Batch (x4)** | 30 steps, 4 parallel seeds | 1024 x 1024 px | **18 Tokens** |
| **Video Standard** | 4 seconds @ 24 fps (96 frames) | 720p (1280x720) | **50 Tokens** |
| **Video HD** | 4 seconds @ 24 fps (96 frames) | 1080p (1920x1080) | **100 Tokens** |
| **Video Motion (I2V)** | 5 seconds @ 24 fps (120 frames) | 720p (1280x720) | **75 Tokens** |
| **Video Motion (I2V HD)**| 5 seconds @ 24 fps (120 frames) | 1080p (1920x1080) | **125 Tokens** |
| **Video 4K Upscale** | Temporal super-resolution | 3840 x 2160 px | **120 Tokens** |

### 5.3 Token Ledger Lifecycle States
1. **DEPOSIT**: Influx of tokens from plan renewals, top-up pack purchases, or promotional allocations.
2. **RESERVE**: Ephemeral hold created at request validation. Deducted from `available_balance` but not yet transferred to `consumed_balance`.
3. **SETTLE**: Irreversible debit executed only upon verified asset upload and generation success.
4. **RELEASE**: Cancellation of the reservation hold due to generation failure, worker timeout, or cancellation before worker pickup.
5. **REFUND**: Administrative or automated compensation adjustment in the event of downstream delivery anomalies.

---

## 6. Multi-Tenant Organization & RBAC Model

Framic AI supports hierarchical multi-tenancy structured as:
`Organization` → `Workspace` → `Project` → `Assets & Jobs`.

```text
[ Organization: Acme Media Corp ]
       |
       +---> [ Workspace: Feature Film VFX ]
       |           |
       |           +---> [ Member: Lead Artist (Creator Role) ]
       |           +---> [ Member: Director (Viewer Role) ]
       |           +---> [ Token Pool: 25,000 Tokens Allocated ]
       |
       +---> [ Workspace: Social Marketing ]
                   |
                   +---> [ Member: Motion Designer (Creator Role) ]
                   +---> [ Token Pool: 5,000 Tokens Allocated ]
```

### 6.1 Role-Based Permissions Matrix

| Platform Permission | Organization Owner | Workspace Admin | Creator / Artist | Viewer / Client |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Billing & Purchase Tokens** | Yes | No | No | No |
| **Allocate Workspace Token Pools** | Yes | Yes (Within Cap) | No | No |
| **Invite / Remove Team Members** | Yes | Yes | No | No |
| **Execute Video / Image Generation**| Yes | Yes | Yes | No |
| **Consume From Workspace Token Pool**| Yes | Yes | Yes (Up to Quota) | No |
| **View Workspace Assets & History** | Yes | Yes | Yes | Yes |
| **Download High-Res / Master Video** | Yes | Yes | Yes | Yes (If Allowed)|
| **Delete Assets / Archive Projects**| Yes | Yes | Own Assets Only | No |
| **Generate API Keys for Pipeline** | Yes | Yes | No | No |

### 6.2 Workspace Token Quotas
- Workspace Admins can enforce a **Max Monthly Token Cap** on individual creator accounts to prevent accidental depletion of shared pools.
- Alerts trigger at **80%** and **95%** pool consumption, notifying administrators before hard generation cutoffs occur.

---

## 7. Operational Blueprint Invariants

1. **No Speculative Billing**: If a worker does not confirm asset persistence in storage, no settlement transaction may occur.
2. **Deterministic Idempotency**: Every generation request carries a client-generated UUID `idempotency_key`. Repeating a request with the same key returns the existing job handle without double-reserving tokens.
3. **Graceful Degradation**: When GPU queues exceed defined depth thresholds, the API Gateway transitions low-priority requests to `QUEUED_BACKLOG` and informs clients of estimated wait times before placing token holds.
