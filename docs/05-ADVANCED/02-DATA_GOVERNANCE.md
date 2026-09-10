# Data Governance

## Purpose
Control how user, payment, generation, and asset data is collected, used, retained, and removed.

## Principles
Data minimization; purpose limitation; least privilege; encryption in transit; secret isolation; auditable access; defined retention; safe deletion.

## Sensitive domains
Authentication credentials; payment references; user-generated prompts/assets; provider responses; operational logs.

## Rules
Do not log secrets or unnecessary sensitive payloads. Keep payment/provider credentials out of client code. Define retention and deletion behavior for assets and logs before production.

## Acceptance
Data flows have named owners, access boundaries, retention expectations, and deletion/recovery procedures.
