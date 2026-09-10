# Critical Flows

## Purpose
Define release-critical behavior that must be proven end to end.

1. Signup → verified identity → profile.
2. Subscription purchase → verified Paystack event → entitlement → credit grant.
3. Generation request → authorization → sufficient credits → atomic deduction/reservation → provider → result/failure → refund when required.
4. Generation success → asset persistence → user-owned retrieval.
5. Unauthorized user → denied access to another user's profile, generation, credits, payment, or asset.

## Acceptance
Each flow has automated tests before the related epic is considered complete.
