# Technical Specifications - CreatorOS Platform

## Overview

This document translates the Project Charter into technical specifications for implementation. It defines interfaces, data models, and API contracts that all modules must follow.

---

## 1. Authentication Module

### Interface: `IAuthService`

```typescript
interface IAuthService {
  signup(email: string, password: string): Promise<User>;
  login(email: string, password: string): Promise<AuthToken>;
  logout(userId: string): Promise<void>;
  refreshToken(token: string): Promise<AuthToken>;
  verifyEmail(token: string): Promise<boolean>;
  resetPassword(email: string): Promise<void>;
}
```

### Data Model: `User`

```typescript
interface User {
  id: string; // UUID
  email: string;
  passwordHash: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  subscription?: Subscription;
  credits: number;
  role: "user" | "admin";
}
```

### Requirements

- ✅ Multi-factor authentication support
- ✅ OAuth2 integration ready
- ✅ Email verification required
- ✅ Password reset via secure token
- ✅ Session management with JWT

---

## 2. Credits System Module

### Interface: `ICreditsService`

```typescript
interface ICreditsService {
  getUserCredits(userId: string): Promise<number>;
  deductCredits(userId: string, amount: number, reason: string): Promise<CreditTransaction>;
  addCredits(userId: string, amount: number, source: string): Promise<CreditTransaction>;
  getTransactionHistory(userId: string, limit?: number): Promise<CreditTransaction[]>;
  validateSufficientCredits(userId: string, requiredCredits: number): Promise<boolean>;
}
```

### Data Model: `CreditTransaction`

```typescript
interface CreditTransaction {
  id: string;
  userId: string;
  amount: number;
  type: "deduct" | "add" | "refund";
  reason: string; // e.g., "text_to_image_generation", "subscription_bonus"
  balanceBefore: number;
  balanceAfter: number;
  timestamp: Date;
  status: "completed" | "pending" | "failed";
}
```

### Non-Negotiable Rules

1. ✅ **No negative balances** - Validation before every deduction
2. ✅ **Atomic transactions** - All-or-nothing credit updates
3. ✅ **Full audit trail** - Every transaction logged with reason
4. ✅ **Real-time balance** - Users see accurate credits immediately
5. ✅ **Refund capability** - Failed generations refund credits

---

## 3. Billing & Subscription Module

### Interface: `IBillingService`

```typescript
interface IBillingService {
  createSubscription(userId: string, planId: string): Promise<Subscription>;
  cancelSubscription(subscriptionId: string): Promise<void>;
  renewSubscription(subscriptionId: string): Promise<Subscription>;
  processPayment(userId: string, amount: number, planId: string): Promise<PaymentRecord>;
  getInvoices(userId: string): Promise<Invoice[]>;
  validateSubscriptionActive(userId: string): Promise<boolean>;
}
```

### Data Model: `Subscription`

```typescript
interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: "active" | "canceled" | "expired" | "paused";
  startDate: Date;
  renewalDate: Date;
  canceledDate?: Date;
  monthlyCredits: number;
  bonusCredits: number;
}

interface SubscriptionPlan {
  id: string;
  name: string;
  monthlyPrice: number;
  monthlyCredits: number;
  features: string[];
  isActive: boolean;
}
```

### Data Model: `PaymentRecord`

```typescript
interface PaymentRecord {
  id: string;
  userId: string;
  planId: string;
  amount: number;
  currency: string; // NGN for Paystack
  status: "pending" | "completed" | "failed" | "refunded";
  paymentMethod: "paystack" | "card" | "bank_transfer";
  transactionId: string; // Paystack reference
  timestamp: Date;
  receiptUrl?: string;
}
```

### Non-Negotiable Rules

1. ✅ **No mock payments** - All payments must go through Paystack
2. ✅ **Real payment validation** - Verify each transaction with Paystack API
3. ✅ **Subscription auditable** - All changes logged with user action
4. ✅ **Automatic renewal** - Handled at renewal date
5. ✅ **Refund tracking** - All refunds recorded with reason

---

## 4. Asset Library Module

### Interface: `IAssetLibrary`

```typescript
interface IAssetLibrary {
  saveAsset(userId: string, asset: Asset): Promise<Asset>;
  getAsset(assetId: string, userId: string): Promise<Asset>;
  getUserAssets(userId: string, filters?: AssetFilters): Promise<Asset[]>;
  deleteAsset(assetId: string, userId: string): Promise<void>;
  updateAsset(assetId: string, userId: string, updates: Partial<Asset>): Promise<Asset>;
  getAssetUrl(assetId: string, userId: string): Promise<string>;
}
```

### Data Model: `Asset`

```typescript
interface Asset {
  id: string;
  userId: string; // Ownership verified
  type: "image" | "video" | "audio";
  filename: string;
  mimeType: string;
  size: number;
  storageUrl: string;
  thumbnailUrl?: string;
  metadata: {
    width?: number;
    height?: number;
    duration?: number;
    generatedBy?: string; // e.g., "replicate", "user_upload"
    prompt?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  isPublic: boolean;
}
```

### Non-Negotiable Rules

1. ✅ **User ownership verification** - Every asset tied to owner
2. ✅ **Access control** - Non-owners cannot access private assets
3. ✅ **Storage scalability** - Cloud storage (S3/CDN compatible)
4. ✅ **Metadata tracking** - Generation info stored
5. ✅ **Soft delete only** - Assets archived, not deleted

---

## 5. Generation Module (Text-to-Image)

### Interface: `IGenerationService`

```typescript
interface IGenerationService {
  generateImage(userId: string, request: GenerationRequest): Promise<GenerationResult>;
  getGenerationStatus(generationId: string, userId: string): Promise<GenerationStatus>;
  cancelGeneration(generationId: string, userId: string): Promise<void>;
  getGenerationHistory(userId: string): Promise<Generation[]>;
}
```

### Data Model: `GenerationRequest`

```typescript
interface GenerationRequest {
  prompt: string;
  model: string; // e.g., "stable-diffusion-v2"
  negativePrompt?: string;
  width: number;
  height: number;
  numOutputs: number;
  guidanceScale: number;
  scheduler?: string;
}
```

### Data Model: `Generation`

```typescript
interface Generation {
  id: string;
  userId: string;
  type: "text_to_image" | "image_to_image" | "text_to_video";
  request: GenerationRequest;
  status: "pending" | "processing" | "completed" | "failed";
  creditsCost: number;
  creditsRefunded?: number;
  outputs: Asset[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  provider: "replicate"; // AI provider used
  externalId: string; // Provider's generation ID
}
```

### Credit Costs (Phase 1)

```typescript
const GENERATION_COSTS = {
  text_to_image: {
    cost_per_image: 10,
    base_cost: 5,
    size_multiplier: {
      "512x512": 1.0,
      "768x768": 1.5,
      "1024x1024": 2.0,
    },
  },
};
```

### Non-Negotiable Rules

1. ✅ **Pre-validation** - Check credits before generation starts
2. ✅ **Credit deduction BEFORE generation** - Not after
3. ✅ **Full tracking** - Every generation logged with prompt
4. ✅ **Error refund** - Failed generations refund credits
5. ✅ **Provider abstraction** - Easy to swap AI providers
6. ✅ **Async processing** - Non-blocking generation queues

---

## 6. Dashboard Module

### Interface: `IDashboardService`

```typescript
interface IDashboardService {
  getUserDashboard(userId: string): Promise<DashboardData>;
  getGenerationStats(userId: string, period: "day" | "week" | "month"): Promise<Stats>;
  getUpcomingRenewal(userId: string): Promise<RenewalInfo>;
}
```

### Data Model: `DashboardData`

```typescript
interface DashboardData {
  user: User;
  subscription: Subscription | null;
  creditBalance: number;
  creditUsageThisMonth: number;
  creditLimitThisMonth: number;
  recentGenerations: Generation[];
  recentAssets: Asset[];
  stats: Stats;
}

interface Stats {
  totalGenerations: number;
  totalCreditsUsed: number;
  averageGenerationTime: number; // milliseconds
  successRate: number; // percentage
}
```

### Requirements

- ✅ Real-time credit balance display
- ✅ Generation history with filters
- ✅ Subscription renewal countdown
- ✅ Usage analytics and trends

---

## 7. API Contract Standards

### All API Responses Must Follow

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: Date;
  requestId: string; // For logging/debugging
}
```

### Error Codes

```typescript
const ERROR_CODES = {
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  GENERATION_FAILED: "GENERATION_FAILED",
  INVALID_REQUEST: "INVALID_REQUEST",
  UNAUTHORIZED: "UNAUTHORIZED",
  USER_NOT_FOUND: "USER_NOT_FOUND",
  SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
  ASSET_NOT_FOUND: "ASSET_NOT_FOUND",
};
```

---

## 8. Logging & Monitoring Requirements

### Mandatory Log Events

```typescript
interface LogEvent {
  timestamp: Date;
  userId: string;
  action: string;
  resource: string;
  status: "success" | "failure";
  details: Record<string, any>;
  requestId: string;
  ipAddress: string;
  userAgent: string;
}

const REQUIRED_LOGS = [
  "user.signup",
  "user.login",
  "user.logout",
  "subscription.created",
  "subscription.renewed",
  "subscription.canceled",
  "payment.initiated",
  "payment.completed",
  "payment.failed",
  "credits.deducted",
  "credits.refunded",
  "generation.started",
  "generation.completed",
  "generation.failed",
  "asset.uploaded",
  "asset.deleted",
];
```

### Sentry Integration

- ✅ All errors automatically tracked
- ✅ Error rate monitoring
- ✅ Performance monitoring (generation times)
- ✅ Payment failure alerts
- ✅ Credit system anomalies

---

## 9. Database Schema (Supabase)

### Core Tables

```sql
-- Users Table
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR UNIQUE NOT NULL,
  password_hash VARCHAR NOT NULL,
  email_verified BOOLEAN DEFAULT false,
  role VARCHAR DEFAULT 'user',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Subscriptions Table
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'active',
  start_date TIMESTAMP DEFAULT NOW(),
  renewal_date TIMESTAMP NOT NULL,
  canceled_date TIMESTAMP,
  monthly_credits INTEGER,
  bonus_credits INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Credit Transactions Table
CREATE TABLE credit_transactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  amount INTEGER NOT NULL,
  type VARCHAR NOT NULL, -- 'add', 'deduct', 'refund'
  reason VARCHAR NOT NULL,
  balance_before INTEGER,
  balance_after INTEGER,
  status VARCHAR DEFAULT 'completed',
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Generations Table
CREATE TABLE generations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR NOT NULL,
  status VARCHAR DEFAULT 'pending',
  credits_cost INTEGER,
  credits_refunded INTEGER,
  provider VARCHAR NOT NULL,
  external_id VARCHAR,
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Assets Table
CREATE TABLE assets (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type VARCHAR NOT NULL,
  filename VARCHAR NOT NULL,
  mime_type VARCHAR NOT NULL,
  size INTEGER,
  storage_url VARCHAR NOT NULL,
  thumbnail_url VARCHAR,
  metadata JSONB,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Payment Records Table
CREATE TABLE payment_records (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  plan_id VARCHAR,
  amount DECIMAL NOT NULL,
  currency VARCHAR DEFAULT 'NGN',
  status VARCHAR NOT NULL,
  payment_method VARCHAR,
  transaction_id VARCHAR UNIQUE,
  receipt_url VARCHAR,
  timestamp TIMESTAMP DEFAULT NOW()
);
```

---

## 10. Environment Variables Required

```bash
# Authentication
JWT_SECRET=<secure-random-string>
JWT_EXPIRY=7d

# Database
SUPABASE_URL=<your-supabase-url>
SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-key>

# Payments
PAYSTACK_SECRET_KEY=<your-paystack-key>
PAYSTACK_PUBLIC_KEY=<your-paystack-public>

# AI Provider
REPLICATE_API_TOKEN=<your-replicate-token>

# Storage
AWS_S3_BUCKET=<your-s3-bucket>
AWS_S3_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>

# Monitoring
SENTRY_DSN=<your-sentry-dsn>
ENVIRONMENT=production

# Email
SENDGRID_API_KEY=<your-sendgrid-key>

# Third-party APIs
NEXT_PUBLIC_API_URL=https://api.creatorosprod.com
```

---

## 11. Implementation Order (Recommended)

### Phase 1: Foundation
1. User authentication & profile
2. Supabase setup & schema
3. Credits system (with validation)
4. Dashboard with user profile

### Phase 2: Payments
5. Subscription plans setup
6. Paystack integration
7. Payment processing & validation
8. Invoice generation

### Phase 3: AI Integration
9. Generation service (text-to-image)
10. Replicate API integration
11. Asset library & storage
12. Generation history & tracking

### Phase 4: Polish
13. Error handling & recovery
14. Sentry monitoring setup
15. Email notifications
16. Analytics & reporting

---

## 12. Testing Requirements

### Unit Tests Required

- ✅ Credit deduction logic (positive and negative cases)
- ✅ Payment validation (Paystack response handling)
- ✅ Subscription renewal logic
- ✅ Generation cost calculation
- ✅ User ownership verification

### Integration Tests Required

- ✅ Full signup → subscription → generation flow
- ✅ Credit lifecycle (add → deduct → refund)
- ✅ Payment processing end-to-end
- ✅ Generation with Replicate API
- ✅ Asset save and retrieval

### Load Tests Required

- ✅ Concurrent generation handling
- ✅ Credit transaction throughput (100+ TPS)
- ✅ Dashboard load under 2s

---

## 13. Security Requirements

- ✅ All passwords hashed with bcrypt (salt rounds: 12)
- ✅ JWTs signed with HS256
- ✅ HTTPS only (no HTTP)
- ✅ CORS configured for frontend origin only
- ✅ Rate limiting on auth endpoints (5 requests/minute)
- ✅ SQL injection prevention (parameterized queries)
- ✅ XSS protection (Content Security Policy headers)
- ✅ CSRF tokens on state-changing operations

---

This technical specification provides the blueprint for implementing the CreatorOS platform while adhering to all non-negotiable rules defined in the Project Charter.
