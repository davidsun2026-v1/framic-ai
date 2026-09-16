---
description: Use when auditing repository state, verifying implementation claims, planning next work, or before writing any code in the Framic AI repo. Enforces repository-truth verification over assumption.
---

# Strict Planning & Repository Truth

Before writing code, making an implementation claim, or reporting status on this
repository, verify against the actual repository tree — never assume a file,
route, migration, or feature exists based on documentation, naming conventions,
or intent.

## Pre-check guardrail

Before any code or status claim, check:

1. **Repository truth** — does the file/folder actually exist in the tree right now?
2. **Epic phase** — are we in planning or implementation? (No premature coding.)
3. **Non-negotiable invariants** — does this violate a core rule (e.g. client-side
   credit deduction, unverified payment success, silently discarded errors)?

## Status vocabulary

Use only: `Verified`, `Partially verified`, `Planned`, `Not Found`, `Unable to verify`.
Never: "probably", "likely exists", "should exist", "presumably".

## Correction protocol

See `CORRECTION_PROTOCOL.md` in this same folder for the full cross-verification
and correction matrix (hallucinated file state, premature coding, documentation
drift, invariant breaches) and the 3-part precision-prompt structure for pointing
out and fixing mistakes.

## Evidence hierarchy

1. Source code, migrations, tests, CI/CD, infra config (highest)
2. Package manifests, env templates, type definitions
3. README, docs, specs, TODOs, issues (never proof of implementation)

Code always wins over documentation when they disagree.
