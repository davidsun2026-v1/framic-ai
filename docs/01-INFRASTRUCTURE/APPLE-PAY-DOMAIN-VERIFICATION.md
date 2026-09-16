# Apple Pay Domain Verification

## Purpose

This document defines how Framic AI should document and verify Apple Pay domain association when the payment provider requires an Apple merchant-domain verification file.

This is an infrastructure/payment verification procedure, not an application feature implementation.

## Domain Candidates

Current domains discussed for the production setup:

- `strikegenai.com`
- `app-framicai.com`

The exact domain that must be registered/verified depends on the payment provider's Apple Pay configuration. Do not assume that both domains require verification until the provider configuration confirms it.

## Association File

The Apple-provided domain-association file must be preserved exactly as issued.

The uploaded association artifact must **not** be:

- renamed internally;
- reformatted;
- edited;
- converted to JSON;
- wrapped in HTML;
- modified with a file extension;
- committed as application source merely for convenience.

For web verification, the file must be served at the provider/Apple-required path:

```text
https://<verified-domain>/.well-known/apple-developer-merchantid-domain-association
```

Example for `strikegenai.com`:

```text
https://strikegenai.com/.well-known/apple-developer-merchantid-domain-association
```

Example for `app-framicai.com`:

```text
https://app-framicai.com/.well-known/apple-developer-merchantid-domain-association
```

Only publish the URL(s) actually required by the payment provider's Apple Pay configuration.

## Hostinger Deployment Requirement

If Hostinger serves the verified domain, create the `.well-known` directory under the domain's actual web root and place the association file there.

The resulting public request must return the association file directly over HTTPS.

The verification URL must not:

- redirect to another page;
- require authentication;
- return an HTML error page;
- add a file extension;
- rewrite the file into a different representation;
- expose a directory listing instead of the file.

## Verification Checklist

### Domain

- [ ] Exact domain confirmed from payment-provider Apple Pay configuration.
- [ ] Domain resolves to the intended production Hostinger site.
- [ ] HTTPS is enabled.

### File

- [ ] Apple-issued association file received.
- [ ] File contents preserved exactly.
- [ ] Filename is exactly `apple-developer-merchantid-domain-association`.
- [ ] No `.txt`, `.json`, or other extension is appended.

### Web Path

- [ ] `.well-known` directory exists in the correct web root.
- [ ] Association file is inside `.well-known`.
- [ ] Public URL returns the file directly.
- [ ] No authentication is required.
- [ ] No redirect occurs.

### Payment Provider

- [ ] Domain is registered in the provider's Apple Pay configuration.
- [ ] Provider reports the domain as verified.
- [ ] Production payment flow is tested after verification.

## Verification Evidence

Record evidence here after the live configuration has been checked.

| Item | Status | Evidence |
|---|---|---|
| `strikegenai.com` DNS/hosting | NOT VERIFIED | Live Hostinger inspection required |
| `app-framicai.com` DNS/hosting | NOT VERIFIED | Live Hostinger inspection required |
| Apple association file placement | NOT VERIFIED | Public HTTPS request required |
| Apple Pay domain registration | NOT VERIFIED | Payment provider dashboard required |
| Apple Pay domain verification | NOT VERIFIED | Provider verification result required |
| Production payment test | NOT VERIFIED | Controlled production test required |

## Repository Policy

The Apple association file is an external infrastructure artifact. Do not add a copy to the repository unless the payment provider or deployment architecture explicitly requires the application repository to serve it.

If the repository ever needs to serve the file directly, document the reason and deployment path before committing it.

## Secrets Policy

Never commit:

- Hostinger API tokens
- Hostinger passwords
- OAuth secrets
- Apple private keys
- Payment-provider secret keys
- Webhook signing secrets
- Production environment values

Only non-secret configuration and verification evidence belong in this documentation.

## Change Log

| Date | Change | Status |
|---|---|---|
| 2026-09-16 | Initial Apple Pay domain verification procedure documented | NOT VERIFIED |
