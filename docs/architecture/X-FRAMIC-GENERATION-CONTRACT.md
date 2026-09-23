# Framic AI — First AHP Extension Contract

Status: **IMPLEMENTED AS A TYPE/VALIDATION CONTRACT; NOT WIRED TO AN AHP HOST**

This document freezes the first concrete Framic-specific AHP extension without changing the AHP fork or production infrastructure.

## Scope

The first extension is the generation operation. It gives an AHP client a stable request and state shape while keeping authentication, authorization, accounting, provider execution, and persistence inside Framic services.

The extension uses AHP's implementation-defined `x-` namespace:

- Channel scheme: `x-framic-generation:/<generation-job-id>`
- Command: `x-framic/generation/create`
- Notification: `x-framic/generation/updated`

These names are Framic contracts, not AHP-standard methods.

## Create request

The command params contain:

- `channel`: the AHP routing channel.
- `type`: `text_to_image | image_to_image | text_to_video | image_to_video`.
- `model`: provider-independent model identifier selected by Framic's generation domain.
- `prompt`: generation prompt.
- `inputAssetId`: optional Framic asset reference.
- `parameters`: generation parameters.
- `idempotencyKey`: caller retry key.

The request deliberately does **not** contain:

- credit balance;
- credit reservation amount;
- provider credentials;
- provider prediction identifiers;
- authoritative success/failure state.

Those values are server/domain concerns.

## Accepted result

The server returns:

- `channel`
- `generationJobId`
- `requestId`
- `state`

The server-created identifiers are authoritative correlation handles. The accepted result does not imply provider submission or successful generation.

## Published state

The notification state contains:

- `channel`
- `generationJobId`
- `requestId`
- `state`
- `statusReason`
- `providerJobId`
- `outputUrl`
- `creditsReserved`
- `creditsConsumed`

Financial values are informational projections of the authoritative Framic accounting state. The AHP client cannot set them.

## Lifecycle boundary

The intended server sequence is:

`request → authenticate → authorize → validate → calculate cost → reserve/authorize credits → persist generation job → submit through provider adapter → reconcile provider result → settle/release accounting → persist asset → publish state`.

AHP publication occurs after the corresponding Framic domain transition is accepted. AHP state must never be used as the financial source of truth.

## Error and retry rules

The first implementation contract requires:

1. repeated create requests with the same idempotency key resolve to the same generation attempt rather than creating duplicate billable work;
2. provider credentials never cross the AHP client boundary;
3. client-supplied accounting fields are rejected;
4. provider completion is not inferred from client state;
5. reconnect reads current Framic generation state rather than replaying financial mutations.

## Current implementation boundary

This commit adds only shared Zod schemas, TypeScript types, and contract tests. It does not:

- add an AHP host;
- alter AHP fork code;
- alter Supabase migrations or production data;
- submit requests to Replicate;
- implement billing/credit mutations;
- expose provider credentials.

The next implementation step is the server-side adapter that maps this contract to the existing Framic generation domain after that domain is directly verified.
