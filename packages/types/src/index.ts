/**
 * Framic AI — Shared Type Definitions
 *
 * This package exports all shared TypeScript interfaces, types, and contracts
 * used across the monorepo. All domain models, API contracts, and database
 * schemas are defined here to maintain single source of truth.
 */

// ============================================================================
// USER & PROFILE TYPES
// ============================================================================

export interface UserProfile {
  id: string; // UUID from auth.users.id
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  onboardingCompleted: boolean;
  onboardingStep: 'welcome' | 'profile' | 'subscription' | 'complete';
  preferredLanguage: string;
  timezone: string;
  status: 'active' | 'suspended' | 'deleted';
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface CreateProfileInput {
  email: string;
  displayName?: string;
  timezone?: string;
  preferredLanguage?: string;
}

// ============================================================================
// CREDIT SYSTEM TYPES
// ============================================================================

export interface CreditWallet {
  id: string; // UUID
  userId: string; // UUID
  balance: number; // in smallest unit (e.g., 1 credit = 1 unit)
  createdAt: Date;
  updatedAt: Date;
  lastUpdatedAt: Date;
}

export type CreditTransactionType = 'purchase' | 'grant' | 'deduction' | 'refund' | 'adjustment' | 'bonus';
export type CreditTransactionStatus = 'pending' | 'completed' | 'failed' | 'rolled_back';

export interface CreditTransaction {
  id: string; // UUID
  userId: string; // UUID
  walletId: string; // UUID
  type: CreditTransactionType;
  reason: string;
  amount: number; // positive for additions, negative for debits
  balanceBefore: number;
  balanceAfter: number;
  idempotencyKey: string | null;
  correlationId: string | null; // UUID
  status: CreditTransactionStatus;
  metadata: Record<string, unknown>;
  createdAt: Date;
  createdBy: string; // e.g., 'user_action', 'payment_webhook', 'admin_adjustment'
}

export interface CreditReservationRequest {
  userId: string;
  amount: number;
  reason: string;
  idempotencyKey?: string;
}

export interface CreditReservationResult {
  success: boolean;
  transactionId?: string;
  error?: string;
  newBalance?: number;
}

// ============================================================================
// SUBSCRIPTION & PAYMENT TYPES
// ============================================================================

export type SubscriptionPlanId = 'starter' | 'pro' | 'business';
export type SubscriptionStatus = 'inactive' | 'active' | 'past_due' | 'cancelled' | 'suspended';

export interface SubscriptionPlan {
  id: SubscriptionPlanId;
  name: string;
  monthlyCredits: number;
  priceNaira: number; // in Naira (smallest unit: kobo, so multiply by 100)
  features: string[];
}

export interface Subscription {
  id: string; // UUID
  userId: string; // UUID
  planId: SubscriptionPlanId;
  planName: string;
  monthlyCredits: number;
  status: SubscriptionStatus;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  renewalDate: Date | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  paystackCustomerId: string | null;
  paystackAuthorizationId: string | null;
  paystackSubscriptionId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastVerifiedAt: Date | null;
}

export type PaymentType = 'subscription_charge' | 'credit_purchase';
export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned';

export interface Payment {
  id: string; // UUID
  userId: string; // UUID
  paystackReference: string; // unique reference from Paystack
  paystackAuthorizationId: string | null;
  paystackCustomerId: string | null;
  type: PaymentType;
  amountKobo: number;
  currency: string;
  status: PaymentStatus;
  description: string | null;
  subscriptionId: string | null; // UUID
  creditsAwarded: number | null;
  metadata: Record<string, unknown>;
  verifiedAt: Date | null;
  verificationAttempts: number;
  webhookEventId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    reference: string;
    amount: number;
    currency: string;
    status: string;
    authorization?: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
    };
    customer?: {
      id: number;
      customer_code: string;
      email: string;
      first_name: string;
      last_name: string;
      phone: string;
    };
    subscription?: {
      id: number;
      subscription_code: string;
      email: string;
      customer_id: number;
      plan: number;
      quantity: number;
      authorization: number;
      domain: string;
      start_date: string;
      status: string;
      created_at: string;
    };
    plan?: {
      id: number;
      name: string;
      plan_code: string;
      description: string;
      amount: number;
      interval: string;
      send_invoices: boolean;
      send_sms: boolean;
      hosted_page: boolean;
      currency: string;
      created_at: string;
    };
    paid_at: string;
    created_at: string;
  };
}

// ============================================================================
// GENERATION JOB TYPES
// ============================================================================

export type GenerationType = 'text_to_image' | 'image_to_image' | 'text_to_video' | 'image_to_video';
export type GenerationStatus = 'requested' | 'authorized' | 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'refunded';
export type GenerationProvider = 'replicate' | 'openai' | 'custom';

export interface GenerationJob {
  id: string; // UUID
  userId: string; // UUID
  type: GenerationType;
  model: string;
  provider: GenerationProvider;
  prompt: string;
  inputAssetId: string | null; // UUID, for image-to-* or video-to-*
  parameters: Record<string, unknown>;
  creditsReserved: number;
  creditsConsumed: number | null;
  costBreakdown: Record<string, number>;
  status: GenerationStatus;
  statusReason: string | null;
  providerJobId: string | null;
  providerStatus: string | null;
  providerResponse: Record<string, unknown>;
  outputUrl: string | null;
  generationDurationMs: number | null;
  requestId: string; // UUID
  idempotencyKey: string | null;
  requestedAt: Date;
  authorizedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGenerationJobRequest {
  type: GenerationType;
  model: string;
  prompt: string;
  inputAssetId?: string;
  parameters?: Record<string, unknown>;
}

// ============================================================================
// ASSET TYPES
// ============================================================================

export type AssetType = 'image' | 'video' | 'audio';
export type AssetSourceType = 'generated' | 'uploaded';
export type AssetStatus = 'active' | 'archived' | 'deleted';

export interface GeneratedAsset {
  id: string; // UUID
  userId: string; // UUID
  type: AssetType;
  mimeType: string;
  sourceType: AssetSourceType;
  generationJobId: string | null; // UUID
  storageBucket: string;
  storageKey: string;
  fileSizeBytes: number;
  publicUrl: string | null;
  cdnUrl: string | null;
  originalFilename: string | null;
  dimensions: {
    width?: number;
    height?: number;
  } | null;
  durationMs: number | null;
  metadata: Record<string, unknown>;
  status: AssetStatus;
  createdAt: Date;
  updatedAt: Date;
  archivedAt: Date | null;
  deletedAt: Date | null;
}

// ============================================================================
// WEBHOOK EVENT TYPES
// ============================================================================

export type WebhookProvider = 'paystack' | 'replicate' | 'custom';
export type WebhookStatus = 'received' | 'verified' | 'processed' | 'failed' | 'ignored';

export interface WebhookEvent {
  id: string; // UUID
  provider: WebhookProvider;
  eventType: string;
  providerEventId: string;
  payload: Record<string, unknown>;
  rawSignature: string | null;
  status: WebhookStatus;
  processedAt: Date | null;
  processingError: string | null;
  userId: string | null; // UUID
  createdAt: Date;
  verifiedAt: Date | null;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId: string;
}

// ============================================================================
// AUTH SESSION TYPES
// ============================================================================

export interface AuthSession {
  user: {
    id: string;
    email: string;
    emailConfirmedAt: Date | null;
    role: string;
  };
  session: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    expiresIn: number;
    tokenType: string;
  };
}

export type AuthUser = AuthSession['user'];
