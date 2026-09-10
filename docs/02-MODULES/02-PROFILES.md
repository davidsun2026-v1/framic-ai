# User Profiles

## Purpose
Store application-level user identity and preferences linked to authenticated users.

## Scope
`public.profiles`, display identity, onboarding state, preferences, timestamps, role/authorization metadata where required.

## Ownership
Every profile maps to one `auth.users` identity. Users may read/update only fields permitted by policy.

## Security
Enforce database Row Level Security and server-side authorization. Never trust client-supplied user IDs.

## Acceptance
A newly authenticated account can obtain exactly one application profile and cannot access another user's profile.

## Non-goals
Credentials, payment processing, or generation execution.
