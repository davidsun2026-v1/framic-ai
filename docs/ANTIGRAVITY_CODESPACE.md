# Antigravity on GitHub Codespaces

**Status:** operator runbook  
**Audience:** anyone opening this repo in a GitHub Codespace  
**Owner:** David Sun (`davidsun2026-v1`)  
**Last verified against public docs:** 2026-09-30  
**Canonical product docs:** [Getting Started](https://antigravity.google/docs/getting-started/), [CLI install & auth](https://antigravity.google/docs/cli/install/), [Download](https://antigravity.google/download/)

This file is the Codespace install path. It is not a claim that Antigravity is part of the product stack.

## Decision

Install **Antigravity CLI (`agy`)** only.

Do not install Antigravity 2.0 (desktop) or Antigravity IDE in a stock Codespace. Those are GUI tarballs. A Codespace is a headless Linux VM with a VS Code web UI. There is no project sidebar, no “New Project” modal, and no desktop session unless you explicitly enable Codespaces Desktop / VNC.

| Surface | Use in Codespace |
| --- | --- |
| Antigravity CLI (`agy`) | Yes. Official Linux installer. Remote/SSH auth is documented. |
| Antigravity 2.0 desktop | No. Needs a display. |
| Antigravity IDE | No. Needs a display. |
| `apt install antigravity` from Google’s Linux repo | No. Legacy 1.x path. Do not mix with the 2.x CLI. |
| Third-party `curl \| sudo bash` “install everything” scripts | No. Not official. Not required here. |

## Requirements

- GitHub Codespace (Ubuntu-class image)
- Architecture `x86_64` / `amd64` or `aarch64` / `arm64`
- Outbound HTTPS to `antigravity.google`
- Either a Google account that can sign in to Antigravity, or a `GEMINI_API_KEY` for headless auth

Check the machine:

```bash
uname -m
echo "$CODESPACES $GITHUB_CODESPACE_TOKEN" | awk '{print (NF? "codespace-env-present":"not-a-codespace-env")}'
```

## Install

Run in the Codespace terminal. Do not use `sudo`.

```bash
curl -fsSL https://antigravity.google/cli/install.sh | bash
export PATH="$HOME/.local/bin:$PATH"
agy --version
```

The official installer writes `~/.local/bin/agy` and may append that directory to the shell profile.

If the next shell still says `agy: command not found`:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
which agy
agy --version
```

## First run

Start the TUI from the repository root, not from `$HOME`.

```bash
cd /workspaces/<repo>
agy
```

First launch asks for:

1. Color scheme
2. Rendering mode — prefer **Inline** if Alt-Screen breaks in the Codespace web terminal
3. Workspace trust — confirm only the repo you intend the agent to index

Codespace equivalent of the desktop “New Project” flow: the current folder **is** the project. There is no separate project picker.

## Auth

A Codespace cannot open a local system browser for OAuth. Use one of the two official remote paths.

### A. Google account (URL + code)

1. Run `agy`.
2. Copy the authorization URL it prints.
3. Open that URL on your laptop.
4. Sign in.
5. Paste the code back into the Codespace terminal.

This is the documented remote/SSH flow, not a workaround.

### B. Gemini API key (headless)

Use this when you do not want an interactive Google login.

```bash
mkdir -p ~/.gemini/antigravity-cli
cat > ~/.gemini/antigravity-cli/settings.json <<'EOF'
{
  "modelProvider": "gemini"
}
EOF
export GEMINI_API_KEY="your-api-key"
```

Persist the export in `~/.bashrc` only for a personal Codespace. Prefer a **Codespace secret** named `GEMINI_API_KEY` so rebuilds pick it up.

If `modelProvider` is `gemini` and `GEMINI_API_KEY` is unset, the CLI will not start.

Do not commit the key. Do not put it in this file.

## Survive rebuilds

Codespace home is not a durable install target. Pin the installer on the repo.

`.devcontainer/devcontainer.json`:

```json
{
  "postCreateCommand": "curl -fsSL https://antigravity.google/cli/install.sh | bash"
}
```

If `postCreateCommand` already exists, append the curl line; do not replace an existing bootstrap.

Keep auth out of git:

- Codespace secret: `GEMINI_API_KEY` when using path B
- Never commit `~/.gemini/` or keyring files

## What the pasted desktop docs map to

The public Getting Started page describes the **desktop/IDE** surface. In a Codespace those UI actions do not exist. Use this map.

| Desktop / IDE action | Codespace action |
| --- | --- |
| Download `.tar.gz` / Replace app | `curl …/cli/install.sh \| bash` |
| New Project + Add Folder | `cd /workspaces/<repo>` then `agy` |
| Chat input + mode picker | TUI prompt at the bottom of `agy` |
| `/goal` | Type `/goal` inside `agy` |
| `/grill-me` | Type `/grill-me` inside `agy` |
| `/schedule` | Type `/schedule` inside `agy` (may not match desktop Scheduled Tasks) |
| `/browser` | Do not assume Chrome debugging works in a stock Codespace |
| Conversation picker `Ctrl+K` | CLI TUI keybindings, not VS Code |

## Verify

```bash
uname -m
which agy
agy --version
```

Expected:

- `which agy` → `$HOME/.local/bin/agy`
- `agy --version` → a version string (docs listed CLI around `v1.2.11` on 2026-09-30; treat the live binary as source of truth)

Then run `agy` once and confirm either the OAuth URL or a signed-in / API-key header.

## Out of scope

- Installing Antigravity 2.0 or IDE tarballs under `/opt`
- Community Linux helpers that wrap Google tarballs
- Claiming Antigravity is a Framic-AI runtime dependency
- Storing tokens, cookies, or API keys in the repo

## Failure checklist

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `agy: command not found` | `~/.local/bin` not on `PATH` | Export PATH, reload `~/.bashrc` |
| Installer curl fails | Network / DNS inside Codespace | Retry; confirm outbound HTTPS |
| CLI waits on a browser | Treating Codespace as a local desktop | Use URL + code, or API key path |
| CLI exits immediately with Gemini provider set | Missing `GEMINI_API_KEY` | Set the secret / export |
| Blank or broken TUI | Alt-Screen vs web terminal | Restart `agy`, choose Inline |
| Desktop/IDE binary “installed” but never opens | No display server | Uninstall that path; use `agy` only |

## References

- https://antigravity.google/docs/getting-started/
- https://antigravity.google/docs/cli/install/
- https://antigravity.google/docs/cli/getting-started
- https://antigravity.google/download/
- https://github.com/google-antigravity/antigravity-cli
