-- Framic AI — Initial Schema Migration
-- Created: 2026-09-10
-- Purpose: Initialize core tables for authentication, credits, payments, generation, and assets

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_step TEXT DEFAULT 'welcome',
  preferred_language TEXT DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  status TEXT NOT NULL DEFAULT 'active',
  role TEXT NOT NULL DEFAULT 'user',
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

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

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

-- ============================================================================
-- 2. CREDIT WALLETS TABLE
-- ============================================================================

CREATE TABLE public.credit_wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT balance_non_negative CHECK (balance >= 0)
);

CREATE INDEX idx_credit_wallets_user_id ON public.credit_wallets(user_id);
CREATE INDEX idx_credit_wallets_updated_at ON public.credit_wallets(updated_at DESC);

ALTER TABLE public.credit_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
  ON public.credit_wallets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage wallets"
  ON public.credit_wallets FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 3. CREDIT TRANSACTIONS TABLE (Immutable Ledger)
-- ============================================================================

CREATE TABLE public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.credit_wallets(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount BIGINT NOT NULL,
  balance_before BIGINT NOT NULL,
  balance_after BIGINT NOT NULL,
  idempotency_key TEXT UNIQUE,
  correlation_id UUID,
  status TEXT NOT NULL DEFAULT 'completed',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT DEFAULT 'system',
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

ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
  ON public.credit_transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert transactions"
  ON public.credit_transactions FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Prevent all updates"
  ON public.credit_transactions FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Prevent all deletes"
  ON public.credit_transactions FOR DELETE
  USING (false);

-- ============================================================================
-- 4. SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id TEXT NOT NULL,
  plan_name TEXT NOT NULL,
  monthly_credits BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'inactive',
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  renewal_date TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  paystack_customer_id TEXT,
  paystack_authorization_id TEXT,
  paystack_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  CONSTRAINT plan_id_valid CHECK (plan_id IN ('starter', 'pro', 'business')),
  CONSTRAINT status_valid CHECK (status IN ('inactive', 'active', 'past_due', 'cancelled', 'suspended')),
  CONSTRAINT monthly_credits_positive CHECK (monthly_credits > 0)
);

CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_renewal_date ON public.subscriptions(renewal_date);
CREATE INDEX idx_subscriptions_paystack_customer_id ON public.subscriptions(paystack_customer_id);
CREATE INDEX idx_subscriptions_created_at ON public.subscriptions(created_at DESC);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages subscriptions"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 5. PAYMENTS TABLE
-- ============================================================================

CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  paystack_reference TEXT NOT NULL UNIQUE,
  paystack_authorization_id TEXT,
  paystack_customer_id TEXT,
  type TEXT NOT NULL,
  amount_kobo BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'NGN',
  status TEXT NOT NULL DEFAULT 'pending',
  description TEXT,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  credits_awarded BIGINT,
  metadata JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ,
  verification_attempts SMALLINT DEFAULT 0,
  webhook_event_id TEXT UNIQUE,
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

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages payments"
  ON public.payments FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 6. GENERATED ASSETS TABLE
-- ============================================================================

CREATE TABLE public.generated_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  source_type TEXT NOT NULL,
  generation_job_id UUID,
  storage_bucket TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  public_url TEXT,
  cdn_url TEXT,
  original_filename TEXT,
  dimensions JSONB,
  duration_ms BIGINT,
  metadata JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active',
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

-- ============================================================================
-- 7. GENERATION JOBS TABLE
-- ============================================================================

CREATE TABLE public.generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  model TEXT NOT NULL,
  provider TEXT NOT NULL DEFAULT 'replicate',
  prompt TEXT NOT NULL,
  input_asset_id UUID REFERENCES public.generated_assets(id) ON DELETE SET NULL,
  parameters JSONB NOT NULL DEFAULT '{}',
  credits_reserved BIGINT NOT NULL,
  credits_consumed BIGINT,
  cost_breakdown JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'requested',
  status_reason TEXT,
  provider_job_id TEXT,
  provider_status TEXT,
  provider_response JSONB DEFAULT '{}',
  output_url TEXT,
  generation_duration_ms BIGINT,
  request_id UUID NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key TEXT,
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

ALTER TABLE public.generation_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own generations"
  ON public.generation_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role manages generations"
  ON public.generation_jobs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================================================
-- 8. WEBHOOK EVENTS TABLE (Immutable Log)
-- ============================================================================

CREATE TABLE public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_type TEXT NOT NULL,
  provider_event_id TEXT NOT NULL UNIQUE,
  payload JSONB NOT NULL,
  raw_signature TEXT,
  status TEXT NOT NULL DEFAULT 'received',
  processed_at TIMESTAMPTZ,
  processing_error TEXT,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role access only"
  ON public.webhook_events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Prevent updates"
  ON public.webhook_events FOR UPDATE
  USING (false)
  WITH CHECK (false);

CREATE POLICY "Prevent deletes"
  ON public.webhook_events FOR DELETE
  USING (false);

-- ============================================================================
-- 9. Add Foreign Key from generated_assets to generation_jobs
-- ============================================================================

ALTER TABLE public.generated_assets
ADD CONSTRAINT fk_generated_assets_generation_job_id
FOREIGN KEY (generation_job_id)
REFERENCES public.generation_jobs(id) ON DELETE SET NULL;
