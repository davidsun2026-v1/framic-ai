import type { SubscriptionPlanId } from '@framic/types';

// Canonical plan catalog.
//
// Plan IDs are constrained by the `plan_id_valid` CHECK constraint on
// public.subscriptions (supabase/migrations/20260910000000_init_schema.sql)
// and by SubscriptionPlanId in packages/types — both currently allow only
// 'starter' | 'pro' | 'business'. The project wiki's own Subscription and
// Pricing Audit section lists the plans the same way ("Starter creator Pro
// Business").
//
// Commit 10 asked for a "Studio" tier. That is applied here as the credit
// amount for the existing 'business' plan_id rather than a new plan_id —
// introducing 'studio' as a real plan_id requires a schema migration
// (new CHECK constraint value) plus updating SubscriptionPlanId in
// packages/types, and per the wiki's own rule ("Do not invent production
// prices" / plan catalog changes require product owner approval) that is
// a separate, explicitly-approved change, not something to fold in here
// silently. planDisplayName below is where a rename to "Studio" would
// land without touching the plan_id itself, if that's all that's wanted.
export const CREDIT_ALLOCATION: Record<SubscriptionPlanId, number> = {
  starter: 1000,
  pro: 3000,
  business: 10000,
};

export const PLAN_DISPLAY_NAMES: Record<SubscriptionPlanId, string> = {
  starter: 'Starter',
  pro: 'Pro',
  business: 'Business', // rename to "Studio" is a display-only change if plan_id stays 'business'
};

export function isSubscriptionPlanId(value: string): value is SubscriptionPlanId {
  return value === 'starter' || value === 'pro' || value === 'business';
}

// Maps a Paystack dashboard plan_code to our internal plan_id. This MUST be
// filled in with the real plan codes from https://dashboard.paystack.co/#/plans
// before going live — left empty because no Paystack plan codes have been
// provided yet. Until an entry exists for a given plan_code, charge.success
// events referencing it are recorded (payments/webhook_events) but credits
// are NOT granted and the event is flagged for manual reconciliation, so no
// silent misattribution is possible.
export const PAYSTACK_PLAN_CODE_TO_ID: Record<string, SubscriptionPlanId> = {
  // PLN_xxxxxxxxxxxxxxx: 'starter',
  // PLN_xxxxxxxxxxxxxxx: 'pro',
  // PLN_xxxxxxxxxxxxxxx: 'business',
};
