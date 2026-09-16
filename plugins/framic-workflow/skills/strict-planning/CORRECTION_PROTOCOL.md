The Cross-Verification & Correction Protocol
1. The Pre-Check Guardrail (Stopping Errors Before They Start)
Before Claude writes any code or generates a response, it must evaluate the request against three mandatory context anchors:
 * Repository Truth: Does the file/folder actually exist in the local tree? (Never assume a file exists based on documentation).
 * Epic Phase: Are we in the planning phase or implementation phase? (No coding before Commit 10).
 * Non-Negotiable Invariants: Does this action violate core rules (e.g., client-side credit deduction, unverified payments)?
2. Mutual Error Correction Matrix
When a mistake occurs on either side, use this standardized syntax to locate, point out, and fix the issue immediately.
| Scenario | Who Catches It? | Action / Syntax to Correct | Corrective Action |
|---|---|---|---|
| Hallucinated File State (Claude claims a file/route exists when it doesn't) | You (User) | "Check file tree: [path] does not exist yet. Look at actual repository state." | Claude halts, rescinds the statement, and inspects the actual directory tree. |
| Premature Coding (Claude starts writing implementation code during planning) | You (User) | "Stop. Violation of Rule: No premature coding before Commit 10. Revert to planning." | Claude immediately drops the code block and provides an architectural plan instead. |
| Documentation Drift (Docs don't match the actual migration or types) | Claude or You | "Drift detected between README.md and supabase/migrations/." | Synchronize both files in the same atomic update. |
| Invariant Breach (A proposed schema or action violates security/atomic rules) | Either | "Security Invariant Violation: [Name invariant]. Redesign." | Refactor the schema/code to comply with atomic server-side enforcement. |
3. Step-by-Step Correction Workflow
When you need to point out a mistake to Claude, use this 3-Part Precision Prompt Structure to get an immediate, accurate fix:
 * Point to the Exact Position: Name the exact file, line, or block (e.g., "In apps/web/middleware.ts, line 14...").
 * State the Rule or Truth: Reference the broken constraint or repository truth (e.g., "...you assumed Supabase Auth handles profile creation client-side, but our spec requires database triggers.").
 * Command the Correction: Give the precise operational fix (e.g., "Rewrite the function to use a server-side Supabase RPC call.").
Where to Store This Protocol
You can add this directly into your local plugin workspace under:
plugins/framic-workflow/skills/strict-planning/CORRECTION_PROTOCOL.md

