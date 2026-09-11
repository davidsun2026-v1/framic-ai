# AI Agent Setup

## Purpose
Explain how AI coding agents (Claude Code, and anything else reading this
repo) get context and tool access, so setup isn't reverse-engineered from
scattered chat history.

## Two separate layers — do not confuse them

### 1. Account-level connectors (per person, not per repo)
Added in the Claude app's Connectors settings. Scoped to your Claude
account and your GitHub/Supabase OAuth grant. The repository has no
knowledge of these and can't "detect" them — nothing to check in here.

### 2. Repo-level context (checked into the repo, shared by everyone)
- **`CLAUDE.md`** (root) — auto-loaded project context: stack, phase,
  invariants, workflow rules. Keep it short; it's injected into every
  agent session.
- **`.mcp.json`** (root) — project-scoped MCP servers. Currently
  configures the GitHub MCP server (`https://api.githubcopilot.com/mcp/`,
  OAuth on first use) so any Claude Code session opened in this repo has
  read/PR-triage tooling without per-session setup.

## Adding Supabase to `.mcp.json`
Not yet added here because the exact server command depends on the
transport you choose (hosted vs. local, access token vs. OAuth). Confirm
the current invocation from Supabase's own MCP documentation before
adding it, then extend `.mcp.json`:

```json
{
  "mcpServers": {
    "github": { "type": "http", "url": "https://api.githubcopilot.com/mcp/" },
    "supabase": { "...": "see Supabase MCP docs for current config" }
  }
}
```

## Boundary that doesn't change
MCP tools (repo-level or account-level) are for read, browse, and triage.
Writes to `main` or to a Supabase project still go through the PR workflow
in `docs/01-GETTING_STARTED/03-REPOSITORY_WORKFLOW.md` — no exceptions for
agent-originated changes.

