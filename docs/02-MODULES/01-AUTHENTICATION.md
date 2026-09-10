# Authentication

## Purpose
Provide secure account identity and session management.

## Scope
Signup, login, logout, email verification, password recovery, session refresh, authorization boundaries, and future OAuth/MFA readiness.

## Authority
Supabase Auth is the identity/session authority. Application profile data is separate.

## Security
Never store plaintext passwords; never duplicate credential authority; protect server credentials; enforce authorization server-side.

## Acceptance
A user can authenticate, recover access, maintain a valid session, and access only authorized resources. All failures are observable without leaking secrets.

## Non-goals
Billing, credit accounting, generation, and profile business data.
