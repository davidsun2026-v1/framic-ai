# Implementation Status

## Purpose
Single evidence-based ledger separating repository artifacts, live infrastructure contracts, implemented code, and runtime verification.

**Evidence refresh:** 2026-11-19  
**Repository:** `davidsun2026-v1/framic-ai`  
**Documentation branch:** `docs/replicate-only-billing-contract`  
**Supabase target inspected read-only:** Framic AI, project ref `gkvvecskbkwpcsuatklm`, region `eu-west-1`.

## Capability status

| Capability | Status | Evidence |
|---|---|---|
| Product foundation | VERIFIED | Charter, technical specifications, and foundation documents exist |
| Monorepo config | PARTIAL | Root configuration and workspace structure exist |
| Web application | PARTIAL | `apps/web` contains Next.js configuration, auth, Supabase clients, and application routes |
| API | PARTIAL | Balance API exists; generation submission API not verified |
| Supabase live project identity | VERIFIED | Connected project ref is `gkvvecskbkwpcsuatklm` |
| Supabase core tables | VERIFIED | Live inventory includes profiles, credit_wallets, credit_transactions, subscriptions, payments, generation_jobs, generated_assets, webhook_events |
| Live credit reservation primitives | VERIFIED | Live `reserve_credits`, `settle_credits`, and `release_credits` definitions/signatures inspected |
| Credit reservation wired to generation | NOT VERIFIED | No executable generation submission path invoking these RPCs was found |
| Authentication | PARTIAL | Repository auth actions use Supabase Auth; full staging/runtime acceptance not established here |
| Profiles | PARTIAL | Live table exists; full application query contract and user-flow behavior not verified in this task |
| Subscriptions | PARTIAL | Live table and migration exist; recurring customer lifecycle not verified |
| Paystack | PARTIAL | Live `paystack-webhook` Edge Function exists; checkout-to-subscription/credit fulfillment not end-to-end tested here |
| Replicate credentials/provider setup | NOT VERIFIED | Repository contains an environment variable name; live secret configuration was not inspected |
| Replicate generation route | NOT VERIFIED | No executable submission route found in inspected repository paths/search |
| Replicate webhook route | NOT VERIFIED | No deployed Replicate generation/webhook Edge Function in live function inventory; app webhook route not verified |
| Replicate model registry | NOT VERIFIED | No approved production model/version, schema, or cost registry verified |
| Generation runtime | NOT VERIFIED | Live generation_jobs table exists; no end-to-end prediction evidence |
| Asset persistence | PARTIAL | Live generated_assets table and storage migration exist; generated-output delivery path not verified |
| Monitoring | PLANNED | Requirements/documentation only |
| CI/CD | PARTIAL | Workflow configuration exists; current run status not evaluated in this task |
| Deployment | NOT VERIFIED | No production generation deployment evidence established |

## Verified live credit RPC contracts

| Function | Signature | Observed behavior |
|---|---|---|
| `reserve_credits` | `(p_user_id uuid, p_amount bigint, p_reason text, p_idempotency_key text, p_correlation_id uuid, p_metadata jsonb)` | Wallet row lock, sufficient-balance check, pending negative deduction, idempotency |
| `settle_credits` | `(p_transaction_id uuid)` | Pending deduction becomes completed; repeat settlement returns false |
| `release_credits` | `(p_transaction_id uuid, p_release_idempotency_key text)` | Pending reservation is restored and refund recorded; idempotency enforced |
| `grant_credits` | Eight arguments; see live introspection | Payment/admin credit grant primitive; not generation settlement |

The three generation-relevant functions are SECURITY DEFINER, set an empty search_path, and had EXECUTE granted to service_role and postgres owner when inspected. These are database primitives; application integration is NOT VERIFIED.

## Repository and documentation findings

- The previous `SPEC-001-REPLICATE-API-PIPELINE.md` described OpenRouter prompt expansion, several unverified models, and invented generation RPC signatures. This conflicted with Replicate-only V1 and the live Supabase signatures.
- The previous Replicate module lacked a sole-provider boundary and webhook/model verification requirements.
- `docs/00-FOUNDATION/07-SUPABASE-CONTRACT-AUDIT.md` contains older project-access findings. Do not treat its 2026-09-16 connection statement as current evidence for the connected project inspected on 2026-11-19.
- Six live migrations were reported applied, including credit reservations, Paystack fulfillment, storage buckets, and profile/asset column restrictions.
- The live Edge Function inventory contained `hello-world`, `smooth-worker`, and `paystack-webhook`; no Replicate generation or webhook function appeared.
- Row counts for the eight inspected core tables were zero at inspection time. This is a point-in-time observation, not a permanent invariant.

## Release decision

**NO-GO for production generation billing.**

Credit primitives exist, but Replicate execution, webhook verification, model allowlist, durable output delivery, end-to-end settlement, and acceptance tests are not verified.

## Rules
1. Documentation is not implementation evidence.
2. Do not invent model IDs, prices, RPC signatures, routes, environment values, or runtime behavior.
3. Do not modify production Supabase without separate explicit authorization.
4. Do not mark generation or billing VERIFIED until staging proves the complete lifecycle.
5. Provider costs and customer credits are separate accounting domains.
