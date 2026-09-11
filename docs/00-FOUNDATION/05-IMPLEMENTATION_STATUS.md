# Implementation Status

## Purpose
Single evidence-based ledger separating what exists from what is only designed.

**Verified baseline:** repository currently contains root configuration and foundation documentation; the application, database migrations, integrations, tests, CI, and deployment implementation are not yet present.

| Capability | Status | Evidence rule |
|---|---|---|
| Product foundation | Partial | Charter/specification exist |
| Monorepo config | Partial | `package.json`, `turbo.json`, and `packages/types` exist; only one shared package currently exists |
| Web app | Partial | `apps/web` exists with Next.js config, auth callback/actions, Supabase clients, and middleware |
| API | Planned | No `apps/api` |
| Shared packages | Partial | `packages/types` exists with `src/index.ts`; other planned shared packages do not exist |
| Supabase schema/migrations | Partial | `supabase/migrations/20260910000000_init_schema.sql` exists with core schema, RLS, constraints, triggers, and relationships |
| Authentication | Partial | Supabase auth actions, callback route, server/client clients, and middleware exist |
| Profiles | Partial | `public.profiles` table, RLS policies, indexes, and profile creation path exist |
| Credits | Partial | `credit_wallets` and immutable `credit_transactions` schema exist |
| Subscriptions | Partial | `subscriptions` schema exists with plan/status/Paystack fields and RLS |
| Paystack | Planned | Requirements only |
| Replicate | Planned | Requirements only |
| Asset library | Partial | `generated_assets` schema, ownership relationship, indexes, and RLS exist |
| Generation | Partial | `generation_jobs` schema exists with lifecycle/status/provider fields, credit reservation fields, and RLS |
| Monitoring | Planned | Requirements only |
| Tests | Planned | Requirements only |
| CI/CD | Planned | No workflows |
| Deployment | Planned | Documentation/config claims must not be treated as deployment evidence |

## Rule
This file must be updated whenever implementation status changes. Never mark an item complete because a README or specification describes it.
