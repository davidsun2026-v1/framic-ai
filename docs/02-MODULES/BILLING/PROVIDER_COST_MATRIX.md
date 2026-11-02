# Provider Cost Matrix — Research Baseline

**Reviewed:** 2026-11-02  
**Scope:** Public Replicate and ElevenLabs API pricing relevant to Framic AI.  
**Status:** Research baseline only — not an approved production model catalogue, subscription matrix, or customer-credit schedule.

This document records provider-side prices and billing units. It does not define Framic subscription prices, credit grants, customer deductions, or production model identifiers. Those remain separate decisions and must not be inferred from this document.

## 1. Replicate — Wan 2.2 corrections

Replicate lists these Wan 2.2 variants as distinct models with materially different prices. Do not map one model's rates onto another.

| Provider model | Configuration | Provider price | Billing unit |
|---|---|---:|---|
| `wan-video/wan-2.2-t2v-fast` | 480p | $0.05 | Output video |
| `wan-video/wan-2.2-t2v-fast` | 720p | $0.10 | Output video |
| `wan-video/wan-2.2-5b-fast` | 480p | $0.0125 | Output video |
| `wan-video/wan-2.2-5b-fast` | 720p | $0.025 | Output video |
| `wan-video/wan-2.2-i2v-fast` | 480p, base | $0.05 | Output video |
| `wan-video/wan-2.2-i2v-fast` | 480p, interpolate | $0.065 | Output video |
| `wan-video/wan-2.2-i2v-fast` | 720p, base | $0.11 | Output video |
| `wan-video/wan-2.2-i2v-fast` | 720p, interpolate | $0.145 | Output video |

### Required model-mapping correction

The former planning matrix incorrectly assigned the Wan 2.2 5B Fast rates ($0.0125/$0.025) to Wan 2.2 T2V Fast. This understated T2V Fast provider cost by 75% relative to its actual price (the correct price is 4x the mistaken amount).

The 5B Fast model must remain a separate provider-model record. The I2V Fast model must include both its `resolution` and `interpolate_output` dimensions in the cost key; a single flat price is insufficient.

Replicate's model pages expose the resolution/variant pricing and input schema:
- https://replicate.com/wan-video/wan-2.2-t2v-fast
- https://replicate.com/wan-video/wan-2.2-5b-fast
- https://replicate.com/wan-video/wan-2.2-i2v-fast

## 2. ElevenLabs — API pricing and metering

The current ElevenLabs API pricing page displays these headline prices:

| API capability | Displayed price | Published unit |
|---|---:|---|
| v3 TTS | $0.10 | 1,000 characters |
| v3 Conversational TTS | $0.05 | 1,000 characters |
| v2 Multilingual TTS | $0.10 | 1,000 characters |
| Flash / Turbo TTS | $0.05 | 1,000 characters |
| Scribe v2 | $0.22 | Hour |
| Scribe v2 Realtime | $0.39 | Hour |
| Speech Engine | $0.08 | Minute |
| Eleven Music | $0.15 | Minute shown on pricing card |
| Voice Isolator | $0.12 | Minute |
| Voice Changer | $0.12 | Minute |
| Sound Effects | $0.12 | Minute shown on pricing card |
| Dubbing v1, with watermark | $0.33 | Source-audio minute |
| Dubbing v1, without watermark | $0.50 | Source-audio minute |
| Dubbing v2 | $2.20 | Source-audio minute |

Official references:
- https://elevenlabs.io/pricing/api
- https://elevenlabs.io/api
- https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert

### Important official-page pricing conflict — TTS

The same official API pricing page contains inconsistent public figures: its model pricing cards display v3/v2 Multilingual at $0.10 and Conversational/Flash-Turbo at $0.05 per 1,000 characters, while a pricing FAQ on the page states $0.08 and $0.04 respectively for API usage.

Therefore, do not record a claimed 20% price reduction as verified. For provisional margin protection, use the higher visible model-card rates until Framic's actual API account billing, invoice, or written ElevenLabs confirmation establishes the applicable rate. Record the selected rate and evidence date before customer-credit prices are locked.

No standalone numeric API rate for Eleven v4 or v4 Turbo was established by the retrieved API pricing cards. Do not assign them the v3 or Turbo rate by assumption.

### Metering distinctions

ElevenLabs' API overview says:
- Text-to-Speech is billed per character.
- Speech-to-Text is billed per audio minute.
- Music and Sound Effects are billed per generation.
- Dubbing is billed per source-audio minute.

The pricing cards nevertheless present Music and Sound Effects as per-minute headline rates. These are not sufficient to derive a per-request charge without the provider's exact generation metering rules and request/response usage data. Sound Effects API responses expose a `character-cost` response header. Framic must capture actual billable usage from the API response or provider invoice rather than assume that generated duration alone determines the charge.

Dubbing v1 must distinguish watermark and no-watermark pricing. The API pricing FAQ lists $0.33/minute with watermark and $0.50/minute without watermark. Do not apply the $0.33 rate to both modes.

## 3. Framic economics — what is not approved by this document

The repository's current project-state governance says subscription plan names, prices, credit allocations, and limits must come from `docs/02-MODULES/BILLING/SUBSCRIPTION_MATRIX.md`. The current repository state records that this file is absent. This provider-cost research document does not replace it.

The following calculations remain open and must not be treated as verified launch economics:

1. Provider-cost-to-internal-credit conversion.
2. NGN/USD foreign-exchange rate and FX buffer.
3. Framic customer-credit denomination and sale value.
4. Target gross margin and retry/failure allowance.
5. Payment processing, taxes, storage, bandwidth, and other variable costs.
6. Customer-facing credit deductions for each model/configuration.
7. Subscription allocations and mixed-model usage stress tests.

A previous planning conversion of $1 provider cost to 8,250 Framic customer credits was not verified in the current repository evidence. Do not embed it in production code or treat it as approved until the source assumptions and arithmetic are added to the governed economics record and reviewed.

## 4. Required implementation inputs before launch

- Use a compound provider-cost key: provider + exact model ID/version + resolution + duration/frame count where billable + model options that change billing.
- For Wan 2.2 I2V Fast, include resolution and interpolation mode.
- For ElevenLabs, persist operation type and the provider-reported billable unit/usage; do not infer Music/SFX charges solely from output duration.
- Keep provider USD cost separate from Framic customer credits.
- Include FX, taxes, payment fees, storage/bandwidth, retries, and margin only in the later contribution-margin calculation.
- Recheck official prices and account-specific billing immediately before launch.

## 5. Verification boundary

**Verified from public provider pages:** the listed Wan 2.2 prices, ElevenLabs pricing-card values, displayed Dubbing v1 watermark distinction, and ElevenLabs' published metering categories.

**Not verified:** Framic's actual Replicate/ElevenLabs account rates, negotiated discounts, invoices, model versions actually configured in Framic, actual provider usage records, internal credit conversion, subscription economics, or production generation behavior.

No Supabase or production configuration is changed by this document.
