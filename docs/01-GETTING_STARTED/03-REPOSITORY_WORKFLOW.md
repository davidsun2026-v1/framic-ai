# Repository Workflow

## Purpose
Make changes auditable and keep implementation synchronized with Linear and documentation.

## Rules
- Work from an issue/epic with explicit acceptance criteria.
- Keep changes atomic and focused.
- Do not mix feature implementation with unrelated cleanup.
- Update documentation when behavior or architecture changes.
- Run applicable verification before merge.
- Do not merge claims that were not verified.

## Branching
Use short-lived feature/fix/docs/chore branches. The repository default branch is `main`; do not assume a `develop` branch exists.

## Commit
Use conventional, descriptive messages such as `feat(credits): implement atomic ledger`. One logical change per commit.

## Pull request
Explain scope, evidence, tests, migration impact, security impact, and documentation updates. No mock production paths.
