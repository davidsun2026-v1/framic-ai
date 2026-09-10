# Database

## Purpose
Define database ownership, migration discipline, authorization, and recovery expectations.

## Core domains
Profiles; subscriptions; credit transactions; payments; generations; assets; supporting audit/idempotency records.

## Rules
Migrations are versioned and reviewable. Production schema changes are never made ad hoc. User-owned tables require Row Level Security. Monetary and credit changes use transactional operations. Foreign keys and uniqueness constraints enforce invariants where possible.

## Recovery
Backups, restore testing, migration rollback/forward strategy, and incident procedures must be documented before production launch.

## Acceptance
Schema state is reproducible from migrations and authorization is testable.

## Non-goals
Vendor dashboard configuration.
