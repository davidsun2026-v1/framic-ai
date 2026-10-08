# Subscription Matrix

**Status:** Approved for v1 by the founder (David Sun), 2026-10-08.
**Role:** Single governed source of truth for plan identifiers, monthly credits, and prices.
Any code, webhook, or UI that grants credits or charges money must match this file.

## Plans

| plan_id | Display name | Monthly credits | Price (kobo) | Price (NGN) |
|---|---|---|---|---|
| `starter` | Starter | 100 | 500000 | ₦5,000 |
| `pro` | Pro | 500 | 1500000 | ₦15,000 |
| `business` | Business | 2000 | 5000000 | ₦50,000 |

## Rules

- Currency is `NGN`. Paystack amounts are in kobo (1 NGN = 100 kobo).
- `plan_id` values must match the `subscriptions.plan_id` database check: `starter`, `pro`, `business`.
- Credits and prices are server-controlled. Clients never supply them.
- Fulfilment must reject a payment whose verified amount (kobo) or currency differs from this table.
- Credit grants are idempotent: `grant_credits` with key `paystack:<reference>`.

## Not yet decided (PRODUCT OWNER DECISION REQUIRED)

Maximum resolution, maximum video duration, queue priority, commercial-use policy,
storage allowance, concurrent-job limit, and Paystack plan codes (test and live).
Do not invent these. Record them here when approved.

## Related

- `.env.example` carries the same figures as a local template only. This file governs.
- `docs/02-MODULES/04-SUBSCRIPTIONS.md`, `docs/02-MODULES/05-PAYSTACK.md`
