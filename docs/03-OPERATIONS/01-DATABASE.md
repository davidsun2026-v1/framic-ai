# Database Architecture & Operations

## Purpose

Define the production PostgreSQL schema, Row-Level Security (RLS) policies, constraints, indexes, and operational characteristics for Framic AI's core data model.

**Invariants enforced by schema:**
- No negative credit balances
- No unauthorized asset access
- No untracked generation attempts
- No unverified payment events
- All financial mutations auditable and idempotent

---

## 1. Core Tables

### `auth.users` (Supabase-managed)

```sql
-- Supabase provides this table
-- DO NOT CREATE
-- Fields: id (uuid), email, encrypted_password, raw_user_meta_data, raw_app_meta_data, aud, role, confirmed_at, email_confirmed_at, phone_confirmed_at, last_sign_in_at, raw_recovered_password, created_at, updated_at, deleted_at

-- Required for application:
-- - auth.users.id (uuid): primary key, referenced by public.profiles
-- - auth.users.email (text): unique identity
-- - auth.users.confirmed_at (timestamptz): email verification status
```

---

### `public.profiles`

User application identity linked to Supabase Auth.

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Identity
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  
  -- Onboarding & Preferences
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step TEXT DEFAULT 'welcome',
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  
  -- Status & Role
  status TEXT NOT NULL DEFAULT 'active',
  -- allowed values: active, suspended, deleted
  role TEXT NOT NULL DEFAULT 'user',
  -- allowed values: user, admin
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ,
  
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
  CONSTRAINT status_valid CHECK (status IN ('active', 'suspended', 'deleted')),
  CONSTRAINT role_valid CHECK (role IN ('user', 'admin'))
);

CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_status ON public.profiles(status);
CREATE INDEX idx_profiles_created_at ON public.profiles(created_at DESC);

-- RLS: Users can read/update only their own profile
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Audit trigger to update updated_at
CREATE OR REPLACE FUNCTION update_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_profiles_updated_at();
```

---

### `public.credit_wallets`

Current credit balance snapshot per user (fast lookup).

```sql
CREATE TABLE public.credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Balance state
  balance BIGINT NOT NULL DEFAULT 0,
  -- stored in smallest unit (e.g., if 1 credit = 1 unit, store as integer)
  -- balance MUST NEVER be negative
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

CREATE INDEX idx_credit_wallets_user_id ON public.credit_wallets(user_id);
CREATE INDEX idx_credit_wallets_updated_at ON public.credit_wallets(updated_at DESC);

-- RLS: Users can view only their own wallet
ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.credit_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage wallets"
  ON public.credit_wallets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

---

### `public.credit_transactions`

Immutable ledger of all credit mutations (audit trail).

```sql
CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User & Wallet
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  
  -- Transaction Details
  type TEXT NOT NULL,
  -- allowed values: purchase, grant, deduction, refund, adjustment, bonus
  reason TEXT NOT NULL,
  -- e.g., 'subscription_grant_starter', 'generation_text_to_image', 'failed_generation_refund'
  
  amount BIGINT NOT NULL,
  -- positive for credits added, negative for debits
  
  -- Balance State
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  
  -- Correlation & Idempotency
  idempotency_key TEXT UNIQUE,
  -- allows safe retries; external system reference (e.g., payment ID, generation job ID)
  
  correlation_id UUID,
  -- links related transactions (e.g., subscription grant + initial bonus)
  
  status TEXT NOT NULL DEFAULT 'completed',
  -- allowed values: pending, completed, failed, rolled_back
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  -- flexible field for context: { "generation_job_id": "...", "subscription_plan": "pro", ... }
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'system',
  -- e.g., 'user_action', 'payment_webhook', 'admin_adjustment'
  
  CONSTRAINT amount_not_zero CHECK (amount != 0),
  CONSTRAINT balance_consistency CHECK (balance_after = balance_before + amount),
  CONSTRAINT type_valid CHECK (type IN ('purchase', 'grant', 'deduction', 'refund', 'adjustment', 'bonus')),
  CONSTRAINT status_valid CHECK (status IN ('pending', 'completed', 'failed', 'rolled_back'))
);

CREATE INDEX idx_credit_transactions_user_id ON public.credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_wallet_id ON public.credit_transactions(wallet_id);
CREATE INDEX idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
CREATE INDEX idx_credit_transactions_idempotency_key ON public.credit_transactions(idempotency_key);
CREATE INDEX idx_credit_transactions_correlation_id ON public.credit_transactions(correlation_id);
CREATE INDEX idx_credit_transactions_type ON public.credit_transactions(type);

-- Immutability: credit_transactions cannot be modified after creation
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Prevent updates/deletes on all roles
CREATE POLICY "Prevent all updates"
  ON public.credit_transactions FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Prevent all deletes"
  ON public.credit_transactions FOR DELETE
  USING (false);
```

---

### `public.subscriptions`

User subscription state derived from verified Paystack events.

```sql
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Plan & Status
  plan_id TEXT NOT NULL,
  -- allowed values: starter, pro, business (defined by product requirements)
  plan_name TEXT NOT NULL,
  monthly_credits BIGINT NOT NULL,
  
  status TEXT NOT NULL DEFAULT 'inactive',
  -- allowed values: inactive, active, past_due, cancelled, suspended
  
  -- Dates
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  
  renewal_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Idempotency
  paystack_customer_id TEXT,
  paystack_authorization_id TEXT,
  paystack_subscription_id TEXT,
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  -- timestamp of last successful sync with Paystack
  
  CONSTRAINT plan_id_valid CHECK (plan_id IN ('starter', 'pro', 'business')),
  CONSTRAINT status_valid CHECK (status IN ('inactive', 'active', 'past_due', 'cancelled', 'suspended')),
  CONSTRAINT monthly_credits_positive CHECK (monthly_credits > 0)
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_renewal_date ON public.subscriptions(renewal_date);
CREATE INDEX idx_subscriptions_paystack_customer_id ON public.subscriptions(paystack_customer_id);
CREATE INDEX idx_subscriptions_created_at ON public.subscriptions(created_at DESC);

-- RLS: Users can view only their own subscription
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

---

### `public.payments`

Complete payment transaction log from Paystack (audit trail).

```sql
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Payment Details
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_authorization_id TEXT,
  paystack_customer_id TEXT,
  
  type TEXT NOT NULL,
  -- allowed values: subscription_charge, credit_purchase
  
  amount_kobo BIGINT NOT NULL,
  -- Paystack uses kobo (1 naira = 100 kobo)
  
  currency TEXT NOT NULL DEFAULT 'NGN',
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending',
  -- allowed values: pending, success, failed, abandoned
  
  description TEXT,
  
  -- Metadata
  subscription_id UUID REFERENCES public.subscriptions(id),
  -- null if this is a standalone credit purchase
  
  credits_awarded BIGINT,
  -- number of credits awarded if payment succeeded
  
  metadata JSONB DEFAULT '{}',
  -- flexible field for additional context from Paystack or application
  
  -- Verification
  verified_at TIMESTAMPTZ,
  verification_attempts SMALLINT DEFAULT 0,
  
  -- Idempotency
  webhook_event_id TEXT UNIQUE,
  -- reference to webhook event that triggered this record
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT amount_positive CHECK (amount_kobo > 0),
  CONSTRAINT status_valid CHECK (status IN ('pending', 'success', 'failed', 'abandoned')),
  CONSTRAINT type_valid CHECK (type IN ('subscription_charge', 'credit_purchase'))
);

CREATE INDEX idx_payments_user_id ON public.payments(user_id);
CREATE INDEX idx_payments_paystack_reference ON public.payments(paystack_reference);
CREATE INDEX idx_payments_status ON public.payments(status);
CREATE INDEX idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX idx_payments_verified_at ON public.payments(verified_at DESC);

-- RLS: Users can view only their own payments
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages payments"
  ON public.payments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

---

### `public.generation_jobs`

AI generation request lifecycle (text-to-image, image-to-image, video, etc.).

```sql
CREATE TABLE public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Generation Details
  type TEXT NOT NULL,
  -- allowed values: text_to_image, image_to_image, text_to_video, image_to_video
  
  model TEXT NOT NULL,
  -- e.g., 'stable-diffusion-3', 'zeroscope-v2-576w'
  
  provider TEXT NOT NULL DEFAULT 'replicate',
  -- e.g., 'replicate', 'openai', 'custom'
  
  -- Request Metadata
  prompt TEXT NOT NULL,
  input_asset_id UUID REFERENCES public.generated_assets(id),
  -- null for text-to-* generation; references input image/video for image-to-* or video-to-*
  
  parameters JSONB NOT NULL DEFAULT '{}',
  -- model-specific parameters: { "num_inference_steps": 50, "guidance_scale": 7.5, ... }
  
  -- Credits & Cost
  credits_reserved BIGINT NOT NULL,
  credits_consumed BIGINT,
  -- reserved before execution, consumed after success/failure/refund
  
  cost_breakdown JSONB DEFAULT '{}',
  -- { "generation": 10, "storage": 2, "processing": 1 }
  
  -- Status Lifecycle
  status TEXT NOT NULL DEFAULT 'requested',
  -- allowed values: requested, authorized, queued, running, succeeded, failed, cancelled, refunded
  
  status_reason TEXT,
  -- e.g., 'insufficient_credits', 'provider_error', 'user_cancelled'
  
  -- Provider Reference
  provider_job_id TEXT,
  -- external provider reference (e.g., Replicate prediction ID)
  
  provider_status TEXT,
  -- replicate: starting, processing, succeeded, failed, canceled
  
  provider_response JSONB DEFAULT '{}',
  -- complete response from provider for debugging
  
  -- Output
  output_url TEXT,
  -- final URL to generated asset
  
  generation_duration_ms BIGINT,
  -- time from request to completion
  
  -- Audit & Correlation
  request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key TEXT,
  
  -- Timestamps
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  authorized_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT type_valid CHECK (type IN ('text_to_image', 'image_to_image', 'text_to_video', 'image_to_video')),
  CONSTRAINT status_valid CHECK (status IN ('requested', 'authorized', 'queued', 'running', 'succeeded', 'failed', 'cancelled', 'refunded')),
  CONSTRAINT credits_reserved_positive CHECK (credits_reserved > 0)
);

CREATE INDEX idx_generation_jobs_user_id ON public.generation_jobs(user_id);
CREATE INDEX idx_generation_jobs_status ON public.generation_jobs(status);
CREATE INDEX idx_generation_jobs_provider_job_id ON public.generation_jobs(provider_job_id);
CREATE INDEX idx_generation_jobs_requested_at ON public.generation_jobs(requested_at DESC);
CREATE INDEX idx_generation_jobs_request_id ON public.generation_jobs(request_id);
CREATE INDEX idx_generation_jobs_idempotency_key ON public.generation_jobs(idempotency_key);

-- RLS: Users can view only their own generation jobs
ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations"
  ON public.generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages generations"
  ON public.generation_jobs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

---

### `public.generated_assets`

Metadata for all generated (or uploaded) content owned by users.

```sql
CREATE TABLE public.generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Asset Details
  type TEXT NOT NULL,
  -- allowed values: image, video, audio
  
  mime_type TEXT NOT NULL,
  -- e.g., image/png, image/jpeg, video/mp4, audio/mpeg
  
  -- Source
  source_type TEXT NOT NULL,
  -- allowed values: generated, uploaded
  
  generation_job_id UUID REFERENCES public.generation_jobs(id) ON DELETE SET NULL,
  -- null for uploaded assets
  
  -- Storage & Location
  storage_bucket TEXT NOT NULL,
  -- e.g., 'framic-ai-prod', 's3-bucket-name'
  
  storage_key TEXT NOT NULL,
  -- path within bucket: 'users/{user_id}/assets/{asset_id}.{ext}'
  
  file_size_bytes BIGINT NOT NULL,
  
  public_url TEXT,
  -- signed or public URL to access the asset
  
  cdn_url TEXT,
  -- CDN URL if available
  
  -- Metadata
  original_filename TEXT,
  
  dimensions JSONB,
  -- { "width": 768, "height": 768 }
  
  duration_ms BIGINT,
  -- for video/audio assets
  
  metadata JSONB DEFAULT '{}',
  -- flexible field: { "model": "...", "prompt": "...", "generation_time": ... }
  
  -- Status & Lifecycle
  status TEXT NOT NULL DEFAULT 'active',
  -- allowed values: active, archived, deleted
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  archived_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  
  CONSTRAINT type_valid CHECK (type IN ('image', 'video', 'audio')),
  CONSTRAINT source_type_valid CHECK (source_type IN ('generated', 'uploaded')),
  CONSTRAINT status_valid CHECK (status IN ('active', 'archived', 'deleted')),
  CONSTRAINT file_size_positive CHECK (file_size_bytes > 0)
);

CREATE INDEX idx_generated_assets_user_id ON public.generated_assets(user_id);
CREATE INDEX idx_generated_assets_generation_job_id ON public.generated_assets(generation_job_id);
CREATE INDEX idx_generated_assets_status ON public.generated_assets(status);
CREATE INDEX idx_generated_assets_created_at ON public.generated_assets(created_at DESC);
CREATE INDEX idx_generated_assets_storage_key ON public.generated_assets(storage_key);

-- RLS: Users can view/manage only their own assets
ALTER TABLE public.generated_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own assets"
  ON public.generated_assets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own assets"
  ON public.generated_assets FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages assets"
  ON public.generated_assets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

---

### `public.webhook_events`

Immutable log of all webhook deliveries (Paystack, Replicate callbacks) for idempotency and debugging.

```sql
CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Webhook Source
  provider TEXT NOT NULL,
  -- allowed values: paystack, replicate, custom
  
  event_type TEXT NOT NULL,
  -- paystack: charge.success, charge.failed, subscription.create, subscription.disable, etc.
  -- replicate: prediction.created, prediction.updated, prediction.succeeded, prediction.failed, etc.
  
  -- Delivery Details
  provider_event_id TEXT NOT NULL UNIQUE,
  -- external event ID from provider (idempotency key)
  
  payload JSONB NOT NULL,
  -- complete webhook payload (may contain sensitive data; treat carefully)
  
  raw_signature TEXT,
  -- raw webhook signature for verification audit
  
  -- Processing
  status TEXT NOT NULL DEFAULT 'received',
  -- allowed values: received, verified, processed, failed, ignored
  
  processed_at TIMESTAMPTZ,
  
  processing_error TEXT,
  -- error message if processing failed
  
  -- Related Entity
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  -- null if event is not user-specific
  
  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  
  CONSTRAINT provider_valid CHECK (provider IN ('paystack', 'replicate', 'custom')),
  CONSTRAINT status_valid CHECK (status IN ('received', 'verified', 'processed', 'failed', 'ignored'))
);

CREATE INDEX idx_webhook_events_provider ON public.webhook_events(provider);
CREATE INDEX idx_webhook_events_event_type ON public.webhook_events(event_type);
CREATE INDEX idx_webhook_events_provider_event_id ON public.webhook_events(provider_event_id);
CREATE INDEX idx_webhook_events_status ON public.webhook_events(status);
CREATE INDEX idx_webhook_events_user_id ON public.webhook_events(user_id);
CREATE INDEX idx_webhook_events_created_at ON public.webhook_events(created_at DESC);

-- RLS: Service role only; users should not access webhooks directly
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access only"
  ON public.webhook_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Immutability: webhook_events cannot be modified after creation
CREATE POLICY "Prevent updates"
  ON public.webhook_events FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Prevent deletes"
  ON public.webhook_events FOR DELETE
  USING (false);
```

---

## 2. Foreign Key Constraints

All foreign keys enforce `ON DELETE CASCADE` for user deletion (GDPR compliance) or `ON DELETE SET NULL` for optional relationships.

| Table | Column | References | Behavior |
|-------|--------|-----------|----------|
| `profiles` | `id` | `auth.users.id` | CASCADE |
| `credit_wallets` | `user_id` | `profiles.id` | CASCADE |
| `credit_transactions` | `user_id` | `profiles.id` | CASCADE |
| `credit_transactions` | `wallet_id` | `credit_wallets.id` | CASCADE |
| `subscriptions` | `user_id` | `profiles.id` | CASCADE |
| `payments` | `user_id` | `profiles.id` | CASCADE |
| `payments` | `subscription_id` | `subscriptions.id` | SET NULL |
| `generation_jobs` | `user_id` | `profiles.id` | CASCADE |
| `generation_jobs` | `input_asset_id` | `generated_assets.id` | SET NULL |
| `generated_assets` | `user_id` | `profiles.id` | CASCADE |
| `generated_assets` | `generation_job_id` | `generation_jobs.id` | SET NULL |
| `webhook_events` | `user_id` | `profiles.id` | SET NULL |

---

## 3. Critical Constraints Enforced by Schema

### Balance Integrity

```sql
-- credit_wallets.balance >= 0 (CHECK constraint prevents negative balances)
-- credit_transactions.balance_after = balance_before + amount (formula validation)
-- Application MUST verify sufficient balance before deduction
```

### Immutability

- `credit_transactions` cannot be updated or deleted (RLS policies prevent all updates/deletes)
- `webhook_events` cannot be updated or deleted (RLS policies prevent all updates/deletes)
- Both tables are append-only audit logs

### Idempotency

- `credit_transactions.idempotency_key` UNIQUE — prevents duplicate credit grants
- `webhook_events.provider_event_id` UNIQUE — prevents duplicate event processing
- `payments.webhook_event_id` UNIQUE — links payment to triggering webhook

### Authorization (RLS)

- Users can read only their own profile, wallet, transactions, subscriptions, payments, generations, and assets
- Service role (API) can perform all operations
- Admin users can view all profiles (future use)

---

## 4. Indexes

Indexes optimize critical query paths:

- **User lookups:** `profiles(email)`, `credit_wallets(user_id)`
- **Pagination:** `credit_transactions(created_at DESC)`, `generated_assets(created_at DESC)`
- **Status queries:** `subscriptions(status)`, `generation_jobs(status)`, `webhook_events(status)`
- **Correlation:** `credit_transactions(correlation_id)`, `generation_jobs(request_id)`
- **Idempotency:** `credit_transactions(idempotency_key)`, `webhook_events(provider_event_id)`, `generation_jobs(idempotency_key)`
- **Provider references:** `payments(paystack_reference)`, `generation_jobs(provider_job_id)`, `subscriptions(paystack_customer_id)`

---

## 5. Initialization & Migration Strategy

### Migration Execution Order

1. **Create profiles** — depends on `auth.users` (Supabase-managed)
2. **Create credit_wallets** — depends on `profiles`
3. **Create credit_transactions** — depends on `credit_wallets` and `profiles`
4. **Create subscriptions** — depends on `profiles`
5. **Create payments** — depends on `subscriptions` and `profiles`
6. **Create generation_jobs** — depends on `profiles` and `generated_assets` (FK to input_asset_id is optional)
7. **Create generated_assets** — depends on `generation_jobs` (FK is optional)
8. **Create webhook_events** — depends on `profiles` (optional)

### Initial Data

No production data is seeded. Application initialization:
1. User signs up → `auth.users` created by Supabase
2. `public.profiles` row created via trigger or application insert
3. `public.credit_wallets` created with initial balance (0 or welcome bonus via transaction)

---

## 6. Operational Considerations

### Backup & Disaster Recovery

- All tables use `TIMESTAMPTZ` for audit timestamps (immutable, timezone-aware)
- `created_at` and `updated_at` fields enable time-series recovery
- Transaction logs (`credit_transactions`, `webhook_events`, `payments`) enable full audit replay

### Performance

- Indexes support common queries: user pagination, status filtering, date range queries
- `JSONB` columns avoid schema expansion without sacrificing queryability
- `created_at DESC` indexes support efficient pagination

### Monitoring & Alerts

- Track `credit_wallets.balance >= 0` violations (constraint violation = bug)
- Monitor `generation_jobs.status` transitions for stuck/failed generations
- Alert on webhook processing failures in `webhook_events.status = 'failed'`

---

## 7. Security Considerations

### Secrets & Sensitive Data

- `payments.metadata` may contain Paystack customer data; never log full payload
- `webhook_events.payload` may contain sensitive data; redact in logs
- Service role credentials required to read/write sensitive tables

### Input Validation

- All text fields validated by application layer before insertion
- JSONB fields validated by application schema (e.g., Zod) before insertion
- Email format checked by `CHECK` constraint
- Enum fields (`status`, `type`, `role`) validated by `CHECK` constraints

### Access Control

- RLS enforces user isolation at database layer
- Service role (API server) has full access; client cannot access directly
- Admin users (future) can view all profiles but cannot modify without explicit permission

---

## 8. Future Extensions

### Phase 2 & 3 Tables (not included in Phase 1)

- `teams` — team ownership, members, permissions
- `shared_assets` — permissions for shared asset access
- `generation_templates` — saved generation templates
- `marketplace_listings` — asset marketplace (Phase 3)

---

## Verification Checklist

Before production deployment, verify:

- [ ] All tables created with correct constraints
- [ ] RLS enabled on all tables with correct policies
- [ ] Indexes created for all query paths
- [ ] Foreign keys defined with correct cascade behavior
- [ ] Triggers set up for `updated_at` automation
- [ ] Test: User cannot read another user's data
- [ ] Test: Balance cannot go negative
- [ ] Test: Credit transactions are immutable
- [ ] Test: Webhook events are idempotent
- [ ] Test: Payment records linked to webhooks
- [ ] Test: Generation jobs transition correctly through statuses
