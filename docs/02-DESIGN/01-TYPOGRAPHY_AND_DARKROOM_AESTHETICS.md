# Framic AI — Typography & Digital Darkroom Aesthetics

> **Commit 4 Deliverable (2 of 2)**: Typographic system, studio layout anatomy, component rules, and aesthetic constraints. Token values are defined in `00-DESIGN_SYSTEM_TOKENS.md`.  
> *Planning specification; zero application code.*

---

## 1. Typography

### 1.1 Typefaces

| Role | Family | Fallback stack | Notes |
| :--- | :--- | :--- | :--- |
| Interface | **Inter** (variable, weights 400–700) | `system-ui, -apple-system, "Segoe UI", sans-serif` | Self-hosted via the framework font loader; no third-party font requests at runtime |
| Data & code | **JetBrains Mono** (variable, weights 400–600) | `ui-monospace, "SF Mono", Menlo, Consolas, monospace` | Token amounts, seeds, timecodes, frame counts, job IDs, parameter values |

Both are licensed under the SIL Open Font License.

### 1.2 Type Scale

| Token | Size / line-height | Weight | Tracking | Use |
| :--- | :--- | :--- | :--- | :--- |
| `--fr-type-caption` | 11 / 16 | 500 | +0.04em, uppercase | Panel section labels, table headers |
| `--fr-type-small` | 12 / 16 | 400 | 0 | Hints, timestamps, metadata |
| `--fr-type-body-sm` | 13 / 20 | 400 | 0 | Dense studio controls (default in the rack) |
| `--fr-type-body` | 14 / 20 | 400 | 0 | Default body, forms |
| `--fr-type-label` | 13 / 16 | 500 | 0 | Control labels, button text |
| `--fr-type-title` | 16 / 24 | 600 | -0.005em | Panel titles, dialog titles |
| `--fr-type-heading` | 20 / 28 | 600 | -0.01em | Page headings |
| `--fr-type-display` | 28 / 36 | 600 | -0.015em | Dashboard headline figures |
| `--fr-type-mono` | 12 / 16 | 400 | 0 | Mono data at rack density |
| `--fr-type-mono-lg` | 14 / 20 | 500 | 0 | Token balance, cost preview |

Minimum rendered text size is 11 px, only for uppercase captions. Maximum line length for prose is 72 characters.

### 1.3 Numerics

- All numbers in columns, balances, timers, and counters use `font-variant-numeric: tabular-nums`.
- Token amounts are whole integers with locale thousands separators, followed by the unit word: `25,000 Tokens`. Never a currency symbol, decimal point, or abbreviation like "k".
- Timecodes use `HH:MM:SS:FF` at the clip's frame rate in mono. Durations in the queue use `m:ss`.
- Seeds display in full, in mono, with a copy affordance.

### 1.4 Logotype

`FRAMIC AI` in Inter 600, uppercase, tracking `+0.18em`, colour `text-primary`. Never gold or blue. Minimum clear space equals the cap-height on all sides.

### 1.5 Voice

Authoritative, technical, minimal, transparent. State facts and consequences: "Reserves 100 Tokens. Released in full if generation fails." No exclamation marks, emoji, humour, or marketing language. Errors name the cause and the token outcome: "Worker out of memory. 0 Tokens charged."

---

## 2. Digital Darkroom Aesthetic Rules

1. **Neutral surround.** No gradients, coloured glows, or tinted overlays on or adjacent to the media stage. The stage uses `surface-media`; chrome around it uses `surface-canvas`/`surface-panel` only.
2. **No bright masses.** No element larger than a control may be lighter than `surface-hover`. Pure white (`#FFFFFF`) is never used.
3. **Hairlines over fills.** Group with 1 px borders and spacing; avoid stacking filled cards. Maximum nesting of bordered containers is two.
4. **Accent economy.** At most one blue primary action is visible per panel. Gold appears only where Token meaning exists; a screen with no Token data has no gold.
5. **Media fidelity.** Previews render at their true aspect ratio on `surface-media`, never cropped, filtered, or overlaid, except transient inspection overlays (safe-area guides, mask brush) which are 1 px neutral lines at 60% opacity.
6. **Stillness.** No ambient animation. Motion communicates state change only (§4 of the tokens spec).
7. **Density with clarity.** The studio is a professional instrument: compact controls (28–32 px), 13 px rack text, generous panel padding (`space-5`) so density does not read as clutter.

---

## 3. Studio Layout Anatomy

```text
+--------------------------------------------------------------------------------------------+
| FRAMIC AI | Workspace ▾  Project ▾                          [ 12,450 Tokens ]  Team  ●  Account |  TOP BAR 48px
+----------+------------------------------------------------------+--------------------------+
|          |                                                      |  PARAMETER RACK          |
|  VAULT   |                MEDIA STAGE  (surface-media)          |  Model · Prompt          |
|  RAIL    |        preview / compare / mask-edit canvas          |  Negative prompt         |
|  240px   |                                                      |  Aspect · Resolution     |
|          |                                                      |  Seed · Steps · CFG      |
|  Projects|------------------------------------------------------|  Camera motion           |
|  Assets  |   TIMELINE / GENERATION HISTORY                      |  ----------------------  |
|  Presets |   clips · variations · lineage                       |  Cost  100 Tokens        |
|          |                                                      |  [ Generate video ]      |
+----------+------------------------------------------------------+--------------------------+
| JOB QUEUE  ▸ T2V 1080p  RUNNING 62%  reserved 100   ·  T2I ✓ debited 5      |  QUEUE BAR 40px
+--------------------------------------------------------------------------------------------+
```

| Region | Width / height | Behaviour |
| :--- | :--- | :--- |
| Top bar | 48 px | Token balance chip is always visible; shows workspace pool available Tokens |
| Vault rail | 240 px, collapsible to 48 px | Projects tree, assets, presets; drag source to the stage |
| Media stage | flexible | Single, compare (split), or mask-edit; always `surface-media` |
| Timeline / history | 200–320 px, resizable | Generations in order with lineage links; "Remix / Re-run" hydrates the rack |
| Parameter rack | 320 px | Scrolls independently; Generate action pinned at the bottom |
| Queue bar | 40 px, expandable | Live job states with Token indicator per job |

The Team Dashboard (admins) and Token Ledger use the same top bar and canvas with a single-column content area, max width 1200 px.

---

## 4. Component Specifications

### 4.1 Token Balance Chip
`surface: gold-surface`, `border: gold-border`, text `gold-500` in `type-mono-lg`, label "Tokens" in `text-secondary`. Opens the ledger drawer. When the pool crosses 80% or 95% utilisation, the chip gains a `status-warning` dot (the figure stays gold).

### 4.2 Cost Preview
Shown above the Generate button, updated on every parameter change from the shared pricing function: `Cost  100 Tokens` (value gold, mono). If the member's available quota or the pool cannot cover it, the line becomes `status-danger` text: "Insufficient Tokens: 40 available, 100 required" and the button is disabled with an explanation, not hidden.

### 4.3 Generate Button
40 px height, `blue-500` fill, `text-on-accent` label (weight 600), radius-md. States: hover `blue-500` + 6% lightening via overlay, pressed `blue-600`, disabled `surface-raised` with `text-disabled`, submitting shows a determinate-less label change "Reserving Tokens…" for up to the API response, then hands over to the queue bar. Label names the action: "Generate video", "Generate image", "Upscale to 4K".

### 4.4 Job Status Chip
`radius-sm`, 20 px height, `type-caption` text, colours per the job-state mapping. Always paired with a Token indicator text ("reserved 100", "debited 100", "released — 0 Tokens").

### 4.5 Sliders and Numeric Inputs
Track `border-strong`, filled portion `blue-500`, thumb `text-primary` circle 12 px with a 2 px `surface-canvas` ring. Value shown in an adjacent mono input; arrow keys step, Shift+arrow steps ×10, double-click resets to default. Parameters with token consequences show the effect inline ("Batch of 4: 18 Tokens").

### 4.6 Progress
2 px determinate bar, track `border-subtle`, fill `blue-500`, no animation other than width. Beside it: percent in mono and elapsed time.

### 4.7 Inputs
`surface-raised`, 1 px `border-strong`, radius-md, 32 px height (multi-line prompt min 96 px). Focus: ring per layout tokens. Prompt fields show a live character counter in mono against the type's limit (500 video, 1000 image).

### 4.8 Ledger Table
Columns: Time, Type (DEPOSIT / RESERVE / SETTLE / RELEASE / REFUND / ALLOCATE), Job, Member, Amount (signed, gold for amounts, mono, right-aligned), Available after. Rows 32 px, `border-subtle` rules, no zebra striping. Entries are never editable or deletable in the UI.

### 4.9 Empty, Loading, Error
Empty: one line of `text-secondary` and one action. Loading: skeleton blocks in `surface-raised` with no shimmer. Errors: inline, `status-danger` text with the cause, the Token outcome, and a recovery action.

---

## 5. Accessibility Requirements

- Contrast floors in the tokens spec §2.7 apply to every pairing; new pairings must be added to that table.
- Every control is keyboard reachable in visual order; the Generate action has the shortcut `Ctrl/⌘ + Enter` while a prompt field has focus.
- State is never conveyed by colour alone: job chips carry text, Token indicators carry text, errors carry an icon and text.
- Live regions announce job state changes ("Video generation succeeded. 100 Tokens debited.") politely; failures are announced assertively.
- Respect `prefers-reduced-motion` and `prefers-contrast: more` (the latter switches `text-tertiary` to `text-secondary` and `border-subtle` to `border-strong`).
- Media has text alternatives derived from the prompt; video has captions-off by default and no autoplay with sound.

---

## 6. Open Items for Commit 9 (UI/UX Planning)

- Screen-by-screen wireframes and interaction maps for Video Studio, Image Canvas, Asset Vault, Team Dashboard, and Token Ledger.
- Compare/split-view and mask-brush interaction details.
- Touch and small-viewport review mode behaviours beyond the 1024 px studio minimum.
