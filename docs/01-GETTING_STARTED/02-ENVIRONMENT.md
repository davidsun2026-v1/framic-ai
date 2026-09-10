# Environment Policy

## Purpose
Define environment configuration without exposing secrets or creating undocumented dependencies.

## Rules
- `.env.example` documents names and safe placeholders only.
- Real secrets belong in local secret storage or the deployment provider.
- Client-exposed variables must be explicitly prefixed and contain no secrets.
- Service-role/provider secrets are server-only.
- Environment validation must fail fast when required values are absent or malformed.
- Production and development credentials must never be mixed.
- Example values are not evidence of live infrastructure.

## Required integration groups
Supabase; authentication/session; Replicate; Paystack; storage; Sentry; application/API; rate limiting; deployment.

## Change control
Adding an environment variable requires updating this document and `.env.example` in the same change.
