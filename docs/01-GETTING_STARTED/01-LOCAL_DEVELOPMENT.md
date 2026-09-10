# Local Development

## Purpose
Define the repeatable local workflow once implementation exists.

## Prerequisites
Node.js and Bun versions must match the root `package.json`; Git; local Supabase tooling; Docker only for services explicitly required by the implementation.

## Workflow
1. Clone repository.
2. Install dependencies.
3. Copy `.env.example` to local environment file.
4. Populate only required development credentials.
5. Start required local services.
6. Apply migrations.
7. Start the web/API workspace.
8. Run lint, type-check, and tests before committing.

## Evidence rule
Do not claim a command works until the corresponding package/script exists and has been executed successfully.

## Production separation
Never point local destructive migration/reset commands at production.
