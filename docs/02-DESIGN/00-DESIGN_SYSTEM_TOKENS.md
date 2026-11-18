# Framic AI — Design System Tokens

> **Commit 4 Deliverable (1 of 2)**: Authoritative visual tokens for the Digital Darkroom. Companion: `01-TYPOGRAPHY_AND_DARKROOM_AESTHETICS.md`.  
> *Planning specification. Token values here are the single source; implementation (Commit 10) must generate CSS/Tailwind configuration from them, never hand-copy.*

---

## 1. Principles

1. **The canvas is sacred.** UI chrome recedes so generated media is the brightest, most colourful thing on screen.
2. **Colour carries meaning, never decoration.** Gold means Tokens. Blue means an interactive action. Nothing else may use either.
3. **Separation by line, not by light.** Panels are distinguished by step-changes in surface and hairline borders, not shadows or glow.
4. **Calibrated for low light.** No pure white surfaces, no large bright fills, no saturated chrome.

Naming: `--fr-<category>-<name>`. Dark is the only theme; there is no light mode.

---

## 2. Colour Tokens

### 2.1 Surfaces

| Token | Value | Use |
| :--- | :--- | :--- |
| `--fr-surface-media` | `#050607` | Behind images/video (letterbox, canvas stage) |
| `--fr-surface-canvas` | `#08090A` | App background |
| `--fr-surface-panel` | `#0E1012` | Panels, rails, parameter rack |
| `--fr-surface-raised` | `#14171A` | Inputs, cards, popovers within a panel |
| `--fr-surface-hover` | `#1A1E22` | Hover/selected row on panel or raised |
| `--fr-scrim` | `rgba(5, 6, 7, 0.72)` | Behind dialogs and drawers |

### 2.2 Borders

| Token | Value | Use |
| :--- | :--- | :--- |
| `--fr-border-subtle` | `#1E2228` | Panel edges, dividers, table rules |
| `--fr-border-strong` | `#2A3038` | Inputs, buttons (secondary), focused containers |

### 2.3 Text

| Token | Value | Use |
| :--- | :--- | :--- |
| `--fr-text-primary` | `#E6E8EB` | Headings, values, body |
| `--fr-text-secondary` | `#9AA3AE` | Labels, supporting copy |
| `--fr-text-tertiary` | `#7A838F` | Hints, timestamps, placeholder |
| `--fr-text-disabled` | `#4A525C` | Disabled controls only (exempt from contrast rules) |
| `--fr-text-on-accent` | `#08090A` | Label on gold or blue fills |

### 2.4 Token Gold — reserved for Token accounting

| Token | Value | Use |
| :--- | :--- | :--- |
| `--fr-gold-500` | `#F5A623` | Balance figures, cost preview, ledger amounts, RESERVED/DEBITED indicators |
| `--fr-gold-400` | `#FFBD4A` | Hover on gold elements |
| `--fr-gold-surface` | `rgba(245, 166, 35, 0.12)` | Token chip background |
| `--fr-gold-border` | `rgba(245, 166, 35, 0.32)` | Token chip outline |

**Rule:** gold appears only on Token balances, Token costs, reservation/ledger states, and the pool-utilisation meter. It must never style a button, link, tab, warning, or decoration.

### 2.4.1 Precision Blue — reserved for interactive action

| Token | Value | Use |
| :--- | :--- | :--- |
| `--fr-blue-500` | `#4F6BFF` | Primary generation action fill, active slider track, selected state |
| `--fr-blue-400` | `#7A90FF` | Blue text, links, focus ring (readable on all surfaces) |
| `--fr-blue-600` | `#3F58E0` | Pressed state |
| `--fr-blue-surface` | `rgba(79, 107, 255, 0.14)` | Selected row / active tab background |

### 2.5 Status

| Token | Value | Use |
| :--- | :--- | :--- |
| `--fr-status-success` | `#3DD68C` | SUCCEEDED, healthy worker |
| `--fr-status-danger` | `#FF5C5C` | FAILED, destructive actions, validation errors |
| `--fr-status-warning` | `#FF8A4C` | QUEUED_BACKLOG, 80%/95% pool alerts text, degraded service |

Warning is orange, deliberately distinct from Token Gold.

### 2.6 Job State Mapping

| Job state | Chip colour | Token indicator beside it |
| :--- | :--- | :--- |
| `REQUESTED` | `text-secondary` on `surface-raised` | none |
| `QUEUED_BACKLOG` | `status-warning` | none (no hold yet) |
| `AUTHORIZED` / `QUEUED` | `text-secondary` on `surface-raised` | gold "reserved" |
| `RUNNING` | `blue-400` with blue-surface | gold "reserved" |
| `SUCCEEDED` | `status-success` | gold "debited" |
| `FAILED` | `status-danger` | "released — 0 Tokens" in `text-secondary` |
| `CANCELLED` | `text-tertiary` | "released — 0 Tokens" in `text-secondary` |

Job-state chips never use gold; the Token indicator beside them does.

### 2.7 Contrast Verification

Ratios computed from WCAG relative luminance (hand-calculated for this spec; Commit 10 must add an automated token contrast test that fails the build below these floors).

| Pairing | Ratio | Requirement |
| :--- | :--- | :--- |
| `text-primary` on canvas / panel | ≈ 16 : 1 / 15.5 : 1 | ≥ 4.5 : 1 |
| `text-secondary` on canvas / panel | ≈ 7.8 : 1 / 7.4 : 1 | ≥ 4.5 : 1 |
| `text-tertiary` on canvas / panel | ≈ 5.2 : 1 / 4.9 : 1 | ≥ 4.5 : 1 |
| `gold-500` on canvas / panel | ≈ 9.8 : 1 / 9.3 : 1 | ≥ 4.5 : 1 |
| `blue-400` text on panel | ≈ 6.5 : 1 | ≥ 4.5 : 1 |
| `blue-500` as non-text fill/border on canvas | ≈ 4.6 : 1 | ≥ 3 : 1 |
| `text-on-accent` on `blue-500` | ≈ 4.6 : 1 | ≥ 4.5 : 1 |
| `text-on-accent` on `gold-500` | ≈ 9.8 : 1 | ≥ 4.5 : 1 |

`blue-500` must not be used for body-size text on panels (≈ 4.4 : 1); use `blue-400`. White text on `blue-500` is prohibited (≈ 4.3 : 1); labels on accent fills use `text-on-accent`.

---

## 3. Spacing, Radius, Elevation

**Spacing** (4 px base): `--fr-space-0: 0`, `-1: 2px`, `-2: 4px`, `-3: 8px`, `-4: 12px`, `-5: 16px`, `-6: 20px`, `-7: 24px`, `-8: 32px`, `-9: 40px`, `-10: 48px`, `-11: 64px`.

**Radius** (tight, precise): `--fr-radius-sm: 2px` (chips, badges), `--fr-radius-md: 4px` (inputs, buttons), `--fr-radius-lg: 6px` (panels, cards, dialogs), `--fr-radius-full: 9999px` (sliders thumbs, avatars only). Media is never rounded.

**Elevation** (no ambient shadows):

| Level | Treatment |
| :--- | :--- |
| 0 — canvas | `surface-canvas` |
| 1 — panel | `surface-panel` + 1 px `border-subtle` |
| 2 — raised | `surface-raised` + 1 px `border-strong` |
| 3 — overlay (menus, dialogs, toasts) | `surface-raised` + `border-strong` + `--fr-shadow-overlay: 0 8px 24px rgba(0, 0, 0, 0.6)` over `--fr-scrim` where modal |

**Z-index**: `base 0`, `sticky 10`, `drawer 20`, `overlay 30`, `dialog 40`, `toast 50`.

---

## 4. Motion

| Token | Value | Use |
| :--- | :--- | :--- |
| `--fr-duration-instant` | `80ms` | Hover, press feedback |
| `--fr-duration-fast` | `140ms` | Toggles, tabs, tooltips |
| `--fr-duration-base` | `220ms` | Panel and drawer transitions |
| `--fr-duration-slow` | `360ms` | Dialog entry, large layout changes |
| `--fr-ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default |
| `--fr-ease-exit` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving |

Rules: opacity and transform only (no animated shadows or blurs); no looping decorative animation; running jobs use a determinate thin progress bar driven by `job.progress` events, falling back to a static "Running" chip, never an infinite spinner over media. Under `prefers-reduced-motion: reduce`, all durations collapse to `0ms` except progress value updates.

---

## 5. Layout Tokens

| Token | Value |
| :--- | :--- |
| Breakpoints | `sm 640`, `md 1024`, `lg 1440`, `xl 1920` (px) |
| Studio minimum width | `1024px`; below it the studio shows review-only mode (vault, job status, token ledger) |
| Control height | `28px` compact, `32px` default, `40px` primary action |
| Hit target | ≥ `32px` on pointer devices, ≥ `44px` on touch |
| Focus ring | `2px solid var(--fr-blue-400)`, offset `2px`, on every focusable element; never removed |
| Icon grid | `16px` and `20px`, `1.5px` stroke, `currentColor` |

---

## 6. Reference CSS Custom Properties

```css
:root {
  color-scheme: dark;

  --fr-surface-media: #050607;
  --fr-surface-canvas: #08090a;
  --fr-surface-panel: #0e1012;
  --fr-surface-raised: #14171a;
  --fr-surface-hover: #1a1e22;
  --fr-scrim: rgba(5, 6, 7, 0.72);

  --fr-border-subtle: #1e2228;
  --fr-border-strong: #2a3038;

  --fr-text-primary: #e6e8eb;
  --fr-text-secondary: #9aa3ae;
  --fr-text-tertiary: #7a838f;
  --fr-text-disabled: #4a525c;
  --fr-text-on-accent: #08090a;

  --fr-gold-500: #f5a623;
  --fr-gold-400: #ffbd4a;
  --fr-gold-surface: rgba(245, 166, 35, 0.12);
  --fr-gold-border: rgba(245, 166, 35, 0.32);

  --fr-blue-500: #4f6bff;
  --fr-blue-400: #7a90ff;
  --fr-blue-600: #3f58e0;
  --fr-blue-surface: rgba(79, 107, 255, 0.14);

  --fr-status-success: #3dd68c;
  --fr-status-danger: #ff5c5c;
  --fr-status-warning: #ff8a4c;

  --fr-radius-sm: 2px;
  --fr-radius-md: 4px;
  --fr-radius-lg: 6px;
  --fr-shadow-overlay: 0 8px 24px rgba(0, 0, 0, 0.6);

  --fr-duration-instant: 80ms;
  --fr-duration-fast: 140ms;
  --fr-duration-base: 220ms;
  --fr-duration-slow: 360ms;
  --fr-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --fr-ease-exit: cubic-bezier(0.4, 0, 1, 1);
}
```

---

## 7. Governance

- Adding, removing, or changing a token value requires a change to this document in the same pull request.
- A colour literal in application code (hex, rgb, hsl) is a review failure; only token references are allowed.
- Gold and Blue usage rules in §2.4 are enforced in review and by a lint rule introduced in Commit 10.
