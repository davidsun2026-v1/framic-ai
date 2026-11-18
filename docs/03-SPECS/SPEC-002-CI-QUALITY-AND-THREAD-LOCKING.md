# CI Quality and Closed-Thread Policy Requirements

**Specification version:** 1.0.0  
**Status:** Requirements baseline for PR #48; implementation and CI results must be verified separately.  
**Scope:** Repository lint configuration and automated locking of inactive, closed issues and pull requests.

## 1. Goals

- Keep CI linting executable and deterministic by aligning Biome configuration with the exact Biome version installed from the root package manifest.
- Automatically archive stale closed issues and pull requests without granting discussion permissions or locking active threads.
- Preserve a versioned acceptance contract so future tooling and policy changes can be reviewed against explicit requirements.

## 2. Requirements

### CI lint

- **CI-001 — Version/schema compatibility:** The checked-in Biome configuration MUST validate against the schema supported by the exact Biome version installed in CI. Dependency and configuration upgrades MUST be changed together.
- **CI-002 — Lint gate:** The existing CI lint command MUST execute Biome checks for the configured application and shared-package source files. A configuration parse/schema error MUST fail the check clearly; it MUST NOT be hidden by skipping lint.
- **CI-003 — Supported policy only:** Enabled custom lint rules and formatter options MUST be supported by the pinned Biome version. Unsupported rules MUST NOT be represented as active policy. If desired policy is unavailable in the pinned release, document the gap and upgrade the tool deliberately rather than silently pretending it is enforced.
- **CI-004 — Verification evidence:** A change is considered CI-verified only after the repository's lint command passes in CI. A syntactically plausible configuration or a local edit alone is not evidence of a passing run.

### Closed issue and pull-request locking

- **THREAD-001 — Workflow triggers:** The workflow MUST support a daily scheduled run and a manual `workflow_dispatch` run.
- **THREAD-002 — Scope:** Only issues and pull requests may be processed. Discussions MUST remain out of scope.
- **THREAD-003 — Inactivity threshold:** A closed issue or pull request may be locked only after at least 30 days without activity, using the action's inactivity semantics.
- **THREAD-004 — Least privilege:** The workflow MUST grant only `issues: write` and `pull-requests: write` permissions required for the selected resources. It MUST NOT grant `discussions: write`.
- **THREAD-005 — Lock reason and notice:** Locking MUST use the `resolved` reason and post a clear item-specific notice that explains the inactivity lock and, for issues, directs related reports to a new issue.
- **THREAD-006 — Safe execution:** Runs MUST avoid canceling an in-progress lock operation and MUST have a bounded execution time.

## 3. Acceptance criteria

1. The Biome CLI version installed in CI accepts `biome.json` without unknown-key or schema-deserialization errors.
2. The configured lint command runs against the intended source scope and exits successfully before the PR is considered passing.
3. The workflow YAML is a complete GitHub Actions workflow, not an isolated step fragment.
4. Workflow triggers, permissions, action inputs, 30-day values, lock reasons, comments, and `process-only` scope satisfy THREAD-001 through THREAD-006.
5. No requirement or implementation status is marked verified solely because this document exists.

## 4. Architecture and operational trade-offs

- Pinning the formatter/linter and keeping its schema aligned favors reproducible CI over adopting newer rules implicitly.
- The action is limited to issues and pull requests to minimize token scope and avoid requiring discussion permissions.
- A daily schedule reduces unnecessary runner usage compared with hourly polling. Manual dispatch supports controlled maintenance and troubleshooting.
- GitHub Actions scheduled runs may be delayed by platform load; the schedule is an eventual cleanup mechanism, not a real-time guarantee.
- Biome's inactivity calculation follows the action's documented update semantics, so comments or metadata changes can reset the inactivity window.

## 5. Out of scope

- Changing the product runtime, database, billing, generation pipeline, or user-facing Framic AI behavior.
- Locking discussions.
- Claiming the lint job passes before CI reports a successful run.
- Upgrading Biome or enabling rules not supported by the pinned release without a separately reviewed compatibility change.

## 6. Change control

This version defines the requirements baseline for the related workflow and lint-configuration change. Amend the version and acceptance criteria when behavior or policy changes materially. Implementation status remains governed by repository evidence and `docs/00-FOUNDATION/05-IMPLEMENTATION_STATUS.md`.
