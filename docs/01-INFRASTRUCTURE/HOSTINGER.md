# Hostinger Infrastructure

## Purpose

This document records the production infrastructure boundary between Framic AI, Hostinger, and the repository.

GitHub remains the source of truth for application code and infrastructure documentation. Hostinger remains the source of truth for its live account configuration, domains, DNS, and hosting resources.

## Current Domains

| Domain | Role | Status |
|---|---|---|
| `strikegenai.com` | Existing Hostinger web domain / primary domain under consideration for Apple Pay verification | Requires live verification |
| `app-framicai.com` | Framic AI application subdomain/domain under consideration | Requires live verification |

Do not treat the table above as proof that DNS, hosting, or Apple Pay verification is currently configured. Live Hostinger evidence must be checked before marking a resource verified.

## Hostinger MCP

Framic AI does **not** require an MCP file in this repository merely to connect an AI client to Hostinger.

Hostinger provides an MCP service/connector that can expose supported Hostinger account operations to an authorized AI client. MCP authentication and account authorization are external configuration concerns and must not be committed to this repository.

### Security Rules

- Never commit Hostinger API tokens, OAuth credentials, passwords, or session secrets.
- Never place Hostinger credentials in `.env.example` with real values.
- Use the Hostinger-supported authentication flow for the connected AI client.
- Treat MCP access as privileged infrastructure access.
- Verify the exact scope of any requested infrastructure change before executing it.
- Do not modify production DNS or hosting configuration unless the change is explicitly approved.

## Infrastructure Source of Truth

Use the following authority order:

1. Live Hostinger configuration for actual domain/DNS/hosting state.
2. GitHub repository configuration for intended application behavior and documented infrastructure requirements.
3. This document for operational context and procedures.

If documentation conflicts with live infrastructure, live infrastructure must be reported as the current state and the documentation should be corrected.

## Verification Status Vocabulary

Use only these states when documenting infrastructure:

- `VERIFIED` — directly confirmed from the authoritative system.
- `PARTIAL` — some required evidence is confirmed, but the complete configuration is not.
- `NOT VERIFIED` — the required live evidence has not been checked.
- `BROKEN` — verified configuration does not satisfy the required contract.

## Change Procedure

Before a production Hostinger change:

1. Identify the exact domain/resource.
2. Inspect the current live configuration.
3. Record the intended change.
4. Confirm that the change is explicitly authorized.
5. Make the smallest required change.
6. Re-check the live configuration.
7. Record verification evidence in the appropriate documentation.

## Apple Pay Relationship

Apple Pay domain-association hosting is documented separately in:

`docs/01-INFRASTRUCTURE/APPLE-PAY-DOMAIN-VERIFICATION.md`

The association file itself is not application source code. It must be served from the exact `.well-known` URL required by the payment/Apple verification process.
