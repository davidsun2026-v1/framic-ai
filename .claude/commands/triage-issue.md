# Command: `/triage-issue`

## Description
Analyzes a GitHub issue description or bug report, maps it against Framic AI's core invariants and repository truth, assigns an Epic category, and proposes a structured resolution path adhering strictly to our planning-first workflow.

## Usage
`/triage-issue [issue-number or issue-description]`

## Execution Steps

1. **Context & Invariant Check:**
   - Review the issue against Framic AI's non-negotiable invariants (e.g., no client-side credit deductions, atomic transactions, verified provider state).
   - Check if the affected modules actually exist in the local repository file tree or if they fall under un-implemented epics.

2. **Classification & Epic Mapping:**
   - Map the issue to the correct development phase:
     - `EPIC-001` (Foundation / Monorepo / Docs)
     - `EPIC-002` (Authentication / Supabase Auth)
     - `EPIC-003` (User Profiles)
     - `EPIC-004` (Credits System & Ledger Engine)
     - `EPIC-008` (Asset Library)
     - `EPIC-009` (AI Generation / Replicate Adapter)
     - `EPIC-010` / `EPIC-011` (Monitoring / Deployment)

3. **Output Format:**
   Provide a concise triage report using the following structure:
   - **Severity / Priority:** (Critical / High / Medium / Low)
   - **Target Epic:** (e.g., EPIC-004)
   - **Repository Impact:** (Which files or database schemas are affected)
   - **Proposed Resolution Plan:** (Step-by-step instructions following our strict planning-first rule — **no coding before plan approval**).
   - 
