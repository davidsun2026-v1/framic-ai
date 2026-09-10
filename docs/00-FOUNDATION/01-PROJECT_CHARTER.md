# Framic AI — Project Charter

## 1. Mission
Build a production subscription SaaS that gives creators a unified workspace for AI-generated image and video content, with real payments, credit-based usage, owned assets, and auditable generation workflows.

## 2. Product vision
Framic AI should deliver a creator-grade experience comparable to modern AI creation products while keeping every financially or operationally important action traceable.

## 3. Business model
- Recurring subscriptions with included credits.
- Additional credit purchases where supported.
- Future marketplace and enterprise revenue.

## 4. Product scope
### Phase 1 — MVP
Authentication, profiles, dashboard, credits, subscriptions, Paystack payments, text-to-image, image-to-image, asset library, monitoring, and deployment foundation.

### Phase 2
Text-to-video, image-to-video, video extensions, and project workspaces.

### Phase 3
Marketplace, team collaboration, and shared assets/permissions.

## 5. Technical direction
Next.js, TypeScript, Tailwind, shadcn/ui, Turborepo, Supabase/PostgreSQL, Supabase Auth, Replicate, Paystack, Sentry, and Vercel.

## 6. Architecture principles
1. Mobile-first.
2. API-first.
3. Modular domain boundaries.
4. Provider-agnostic AI contracts.
5. Atomic credit accounting.
6. Server-side authorization.
7. User-owned assets.
8. Auditable payment/subscription state.
9. Observable asynchronous generation.
10. Production-safe changes only.

## 7. Non-negotiable product invariants
- No fake production payment success.
- No client-controlled credits.
- Payment entitlement requires verified provider evidence.
- Every generation attempt is tracked.
- Every asset has an owner and access policy.
- Failed generation has deterministic recovery/refund behavior.
- Secrets are never committed or exposed to clients.
- Documentation must distinguish implemented behavior from planned behavior.

## 8. Success criteria
The MVP is complete only when the critical user journey works against real integrated systems and passes the release checklist: authenticate → obtain profile → purchase/receive entitlement → receive credits → generate → track → persist owned asset → observe truthful status.

## 9. Scope discipline
The 11 delivery epics are the execution structure: Foundation, Authentication, Profiles, Credits, Subscription, Paystack, Replicate, Asset Library, AI Generation, Monitoring, Deployment. New work must map to an epic or be explicitly approved as cross-cutting maintenance.
