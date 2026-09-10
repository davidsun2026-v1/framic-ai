# Framic AI Architecture

## Purpose
Define the target system boundaries before implementation.

## System
- `apps/web`: Next.js user-facing application.
- `apps/api`: server-side API and integration boundary.
- `packages/core`: business rules, including credits and generation orchestration.
- `packages/types`: shared contracts and database-facing types.
- `packages/ui`: reusable presentation components.
- `packages/utils`: infrastructure-neutral utilities.
- Supabase: PostgreSQL, Auth, Storage where selected, and Row Level Security.
- Replicate: provider adapter for AI inference.
- Paystack: payment provider.
- Sentry: error and performance monitoring.
- Vercel: application deployment.

## Data ownership
Supabase is the system of record for users' application data. Authentication uses Supabase Auth unless an ADR explicitly replaces it. Application profile data belongs in `public.profiles`, linked to `auth.users`.

## Core flow
Authentication → profile → credits/subscription → generation request → atomic credit reservation/deduction → provider execution → generation record update → asset persistence → audit/observability.

## Boundary rule
Providers are adapters. Product logic must not depend directly on vendor-specific request formats outside the adapter layer.

## Production rule
No mock payment, fake generation success, credit bypass, unowned asset, or untracked generation may reach production.
