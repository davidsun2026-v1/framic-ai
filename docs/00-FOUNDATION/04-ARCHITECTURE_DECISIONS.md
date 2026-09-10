# Architecture Decisions

## Purpose
Record decisions that must not be silently reinterpreted during implementation.

### ADR-001 — Authentication source of truth
**Decision:** Use Supabase Auth for identity/session management and `public.profiles` for application profile data. Do not create a second password store or parallel JWT authority unless a later ADR explicitly requires it.
**Reason:** The existing specification mixed custom credentials/JWTs with Supabase Auth. One identity authority reduces duplication and security risk.

### ADR-002 — Credits are a ledger
**Decision:** Credits are changed only through atomic, auditable transactions. A generation cannot consume more credits than available, and failed work receives a documented refund/compensation path.

### ADR-003 — Provider abstraction
**Decision:** Replicate is an implementation provider, not the business-domain contract. Provider-specific details remain behind an adapter.

### ADR-004 — Repository truth over documentation claims
**Decision:** Status documents may only call something implemented when repository evidence exists. Planned files must not be linked as though they already exist.

### ADR-005 — Production versus development
**Decision:** Development may use local substitutes where documented, but production payment, authentication, credit accounting, generation, and storage paths must use real services and real validation.
