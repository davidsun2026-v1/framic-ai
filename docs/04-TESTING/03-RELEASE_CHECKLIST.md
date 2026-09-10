# Release Checklist

## Purpose
Final gate before production deployment.

### Repository
- [ ] Scope matches an approved Linear issue/epic.
- [ ] No unrelated changes.
- [ ] Documentation matches behavior.

### Quality
- [ ] Install succeeds.
- [ ] Build succeeds.
- [ ] Lint succeeds.
- [ ] Type-check succeeds.
- [ ] Relevant unit/integration/E2E tests succeed.

### Security
- [ ] Secrets absent from repository.
- [ ] Authorization tested.
- [ ] RLS policies tested.
- [ ] Webhooks/payment verification protected.

### Business invariants
- [ ] Credits cannot go negative or bypass the ledger.
- [ ] Payments require provider verification.
- [ ] Generations are tracked.
- [ ] Assets are user-owned.

### Operations
- [ ] Sentry/observability configured where implemented.
- [ ] Migration reviewed.
- [ ] Rollback/recovery plan known.
- [ ] Deployment commit recorded.

## Rule
A failed gate blocks release; do not mark it complete by assumption.
