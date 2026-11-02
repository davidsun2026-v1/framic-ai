# TASK 01-C — Subscription Credit Economics & Profitability Stress Test

**Analysis date:** 2026-11-02  
**Repository:** `davidsun2026-v1/framic-ai`  
**Status:** Analytical baseline — founder review required before any price, credit, or product decision.  
**Change scope:** Documentation only. No application code, Supabase, provider account, or production system was changed.

## 1. Executive result

The current governed subscription matrix exists at `docs/02-MODULES/BILLING/SUBSCRIPTION_MATRIX.md` and is marked approved for v1 by the founder on 2026-10-08. Its current plans are:

| Plan | Monthly price | Monthly credits |
|---|---:|---:|
| Starter | ₦5,000 | 100 |
| Pro | ₦15,000 | 500 |
| Business | ₦50,000 | 2,000 |

The earlier provider-pricing report's statement that this matrix was absent was incorrect. The file was fetched directly from `main` during this task; it is the governed source for plan price and credit grants. The stale Subscription Governance paragraph in `docs/00-PROJECT_STATE.md` also says the matrix is absent and must be reconciled in a separate documentation correction.

**Critical product-economics finding:** the approved plan grants are only 100 / 500 / 2,000 credits. A previous discussion's 50,000-credit customer balance is not an approved subscription entitlement in the current matrix. It must not be used as a live plan assumption or copied into implementation.

The current evidence does not define what one Framic credit is worth in NGN, nor the provider-cost-to-credit conversion or model-specific customer deductions. Therefore this task can calculate provider-cost budgets and illustrative generation equivalents, but cannot honestly certify that the current credit allocations are profitable or sufficient.

## 2. Inputs and evidence classification

| Input | Value used | Evidence/status |
|---|---:|---|
| Starter plan | ₦5,000 / 100 credits | **Verified** in governed subscription matrix |
| Pro plan | ₦15,000 / 500 credits | **Verified** in governed subscription matrix |
| Business plan | ₦50,000 / 2,000 credits | **Verified** in governed subscription matrix |
| Paystack local transaction fee | 1.5% + ₦100, capped at ₦2,000; ₦100 waived below ₦2,500 | **Verified** from current Paystack pricing/support page |
| USD/NGN reference | ₦1,345.50 per USD (2 Nov 2026 market quote) | External indicative reference; **not** Framic's provider settlement rate |
| Target gross margin | 60% | Provisional planning target only; not located as an approved repository decision |
| Provider-cost ceiling | 40% of revenue after Paystack fee | Derived from the provisional 60% target |
| FX contingency | 0% in base case; 5% sensitivity recommended | Scenario assumption, not verified business policy |
| Refunds, taxes, VAT, chargebacks, payout/transfer fees | Excluded | Not established in current evidence |
| Replicate/ElevenLabs account-specific discounts and invoices | Not supplied | Unable to verify |

Paystack local fees are applied per transaction, not across monthly aggregate revenue. This model assumes each customer makes one successful local NGN payment per month. International-card pricing is different and excluded.

Official Paystack reference: https://support.paystack.com/en/articles/2130306  
Paystack pricing: https://paystack.com/pricing  
Indicative FX reference: https://www.investing.com/currencies/usd-ngn-historical-data

## 3. Per-plan unit economics — one successful local payment

Formula:
- Paystack fee = min(1.5% × plan price + ₦100, ₦2,000), for these plan prices.
- Net receipts = plan price − Paystack fee.
- Provider-cost ceiling = 40% × net receipts, if the provisional 60% gross-margin target is retained.
- USD budget = provider-cost ceiling ÷ ₦1,345.50.

| Plan | Gross revenue | Paystack fee | Net receipts | Max provider COGS (40% net) | Provider budget (USD) |
|---|---:|---:|---:|---:|---:|
| Starter | ₦5,000 | ₦175 | ₦4,825 | ₦1,930 | $1.43 |
| Pro | ₦15,000 | ₦325 | ₦14,675 | ₦5,870 | $4.36 |
| Business | ₦50,000 | ₦850 | ₦49,150 | ₦19,660 | $14.61 |

These provider budgets are ceilings for all variable provider costs combined, not allowances per generation. They leave no allowance for non-provider variable costs (storage, egress, taxes, refunds, support, infrastructure, or chargebacks). Consequently, they are optimistic if the 60% target is intended to be contribution margin after all variable costs rather than gross margin after provider cost only.

## 4. Provider-cost exposure at 100 and 1,000 customers

Assumption: each scenario contains the stated number of customers on one plan, with one successful local Paystack payment per customer in the month.

| Customers / plan | Gross monthly revenue | Paystack fees | Net receipts | Max provider COGS at 40% of net | USD equivalent |
|---|---:|---:|---:|---:|---:|
| 100 Starter | ₦500,000 | ₦17,500 | ₦482,500 | ₦193,000 | $143.44 |
| 100 Pro | ₦1,500,000 | ₦32,500 | ₦1,467,500 | ₦587,000 | $436.27 |
| 100 Business | ₦5,000,000 | ₦85,000 | ₦4,915,000 | ₦1,966,000 | $1,461.17 |
| 1,000 Starter | ₦5,000,000 | ₦175,000 | ₦4,825,000 | ₦1,930,000 | $1,434.41 |
| 1,000 Pro | ₦15,000,000 | ₦325,000 | ₦14,675,000 | ₦5,870,000 | $4,362.69 |
| 1,000 Business | ₦50,000,000 | ₦850,000 | ₦49,150,000 | ₦19,660,000 | $14,611.67 |

### Mixed-plan portfolio illustration

If there are 100 customers on each of the three plans (300 customers total):
- Gross receipts: ₦7,000,000
- Paystack fees: ₦135,000
- Net receipts: ₦6,865,000
- Maximum provider COGS at the provisional 40% ceiling: ₦2,746,000 (about $2,041.62 at the reference FX rate).

At 1,000 customers on each plan (3,000 customers total), multiply those amounts by ten:
- Gross receipts: ₦70,000,000
- Paystack fees: ₦1,350,000
- Net receipts: ₦68,650,000
- Maximum provider COGS: ₦27,460,000 (about $20,416.20).

These are revenue and cost ceilings, not forecasts. They do not imply that customer usage will consume the full provider-cost budget.

## 5. Model-equivalent provider usage — illustrative only

The following converts each plan's provider-cost ceiling into the maximum number of identical provider billing units if the entire allowance were spent on one model. Fractions are rounded down. This is not a recommended plan entitlement and does not define a Framic credit deduction.

| Provider billing unit | Cost per unit | Starter ($1.43 budget) | Pro ($4.36 budget) | Business ($14.61 budget) |
|---|---:|---:|---:|---:|
| Wan 2.2 T2V Fast 480p | $0.05 | 28 | 87 | 292 |
| Wan 2.2 T2V Fast 720p | $0.10 | 14 | 43 | 146 |
| Wan 2.2 5B Fast 480p | $0.0125 | 114 | 349 | 1,168 |
| Wan 2.2 5B Fast 720p | $0.025 | 57 | 174 | 584 |
| Wan 2.2 I2V Fast 480p interpolated | $0.065 | 22 | 67 | 224 |
| Wan 2.2 I2V Fast 720p interpolated | $0.145 | 9 | 30 | 100 |

The counts use the provider-cost entries in `docs/02-MODULES/BILLING/PROVIDER_COST_MATRIX.md` as a research baseline. They are only meaningful if the provider's stated price applies to the exact output duration/settings used by Framic. Validate duration and model-version billing against actual prediction usage/invoices before using these counts as forecasts.

ElevenLabs TTS can similarly be expressed per 1,000 characters, but its official pricing page has conflicting card and FAQ rates. Until account invoices or written provider confirmation resolve that conflict, do not publish exact TTS quotas based on one selected rate. Music and Sound Effects are generation-metered; use provider-reported billable usage, not an assumed duration multiplier.

## 6. FX sensitivity

The base case uses ₦1,345.50/USD as an indicative market quote, not as an executable conversion rate. A 5% FX stress case uses ₦1,412.775/USD. The NGN provider-cost ceiling does not change, but its USD purchasing power falls by 4.76%.

| Plan | Base USD provider budget | USD budget with +5% FX stress |
|---|---:|---:|
| Starter | $1.43 | $1.37 |
| Pro | $4.36 | $4.15 |
| Business | $14.61 | $13.91 |

A further provider invoice currency conversion spread, card/FX charge, or settlement delay could reduce the effective budget further. Obtain the actual payment method and settlement evidence before locking an FX buffer.

## 7. Credit-allocation and margin blockers

The current plan credits (100 / 500 / 2,000) cannot be tested for profitability until the following are approved and evidenced:

1. **Credit denomination:** define the monetary meaning of one Framic customer credit. Do not assume 2 credits = ₦1 or any prior chat conversion.
2. **Provider-to-internal cost conversion:** define internal cost units separately from customer credits, with exact arithmetic and rounding rules.
3. **Model deduction table:** define customer credits per model, resolution, duration, interpolation/audio option, and other billable dimensions.
4. **Usage distribution:** estimate the share of users choosing low-cost, standard, and premium image/video/audio operations.
5. **Failed/aborted jobs:** define when provider cost is incurred, when customer credits are refunded, and how provider-billed failed attempts affect margin.
6. **FX buffer:** approve the reference rate source, refresh frequency, and contingency.
7. **Payment mix:** model local cards/transfers/USSD separately from international cards; current base case only models local NGN transactions.
8. **Other variable costs:** include storage, CDN egress, taxes, refunds, chargebacks, payout fees, and any platform usage costs.
9. **Plan policy:** decide whether unused monthly credits expire/roll over and whether customers may top up. No assumption is made here.
10. **Provider account evidence:** reconcile actual Replicate and ElevenLabs invoices/usage exports with API prediction/request IDs.

## 8. Decision table

| Question | Current finding | Decision needed |
|---|---|---|
| Are plan prices known? | Yes — ₦5k / ₦15k / ₦50k | None for this analysis |
| Are monthly credit grants known? | Yes — 100 / 500 / 2,000 | Confirm still intended after economics review |
| Is 50,000 credits a current plan grant? | No evidence in governed matrix | Do not use as an entitlement |
| Is Paystack local fee known? | 1.5% + ₦100, cap ₦2,000 | Confirm actual merchant contract/channel mix |
| Is current FX rate known? | Indicative public quote only | Approve operational FX source/buffer |
| Is 60% margin approved? | Not found in governed repo | Founder decision required |
| Are provider costs fully reconciled? | Public list prices only | Match provider invoices/usage |
| Are model customer deductions defined? | Not verified in this analysis | Define before launch |
| Can current plans be certified profitable? | No | Block launch pricing certification |

## 9. Recommended next gate

**TASK 01-D — Credit Denomination & Model Deduction Specification**

Before changing plan allocations or publishing a credit quota, define the credit denomination and per-model deduction schedule from the verified provider billing units. Then run the portfolio model with actual usage-mix assumptions and include all variable costs. Do not implement or change subscription plans, customer credits, or provider pricing until that specification is reviewed and approved.

## 10. Source and verification notes

Repository evidence fetched from `main`:
- `docs/02-MODULES/BILLING/SUBSCRIPTION_MATRIX.md` — approved v1 plans, prices, credits.
- `docs/02-MODULES/BILLING/PROVIDER_COST_MATRIX.md` — provider pricing research baseline (introduced on a separate, unmerged documentation PR; do not treat as production configuration).
- `docs/02-MODULES/05-PAYSTACK.md` — Paystack integration remains Planned; no checkout/webhook application code is evidenced in this module document.
- `docs/00-PROJECT_STATE.md` — governance and implementation-state document; its Subscription Governance paragraph is stale because it says the matrix does not exist, while the matrix file is present.

External sources:
- Paystack transaction pricing: https://support.paystack.com/en/articles/2130306
- Paystack pricing: https://paystack.com/pricing
- USD/NGN indicative market history (2 Nov 2026): https://www.investing.com/currencies/usd-ngn-historical-data

No live Supabase, Paystack dashboard, Replicate account, or ElevenLabs account was accessed for this analysis. No production data or configuration was modified.
