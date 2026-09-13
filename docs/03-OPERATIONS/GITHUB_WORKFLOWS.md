# GitHub Workflow: Lock Closed Issues (`lock-closed-issues.yml`)

## Purpose
Automatically locks closed issues and pull requests that have had no activity for 30 days. This keeps the issue tracker clean and prevents unauthorized or outdated commentary on finalized items.

## Trigger Conditions
- **Scheduled:** Runs automatically once a day at midnight UTC (`0 0 * * *`).
- **Manual:** Can be triggered manually from the GitHub Actions tab (`workflow_dispatch`).

## Permissions Required
- `issues: write` — Required to apply the lock state to issues.
- `pull-requests: write` — Required to apply the lock state to pull requests.

## Key Configuration Parameters
- `closed-issue-days: 30` — Targets issues closed over 30 days ago.
- `closed-pull-request-days: 30` — Targets pull requests closed over 30 days ago.

