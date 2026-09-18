# Vercel Deployment Requirements — Production Checklist

A reference document for configuring `vercel.json` and your project settings correctly, so builds don't fail and the deployment behaves predictably in production.

---

## 1. Before You Touch `vercel.json`

Most "build failed" issues on Vercel are **not** `vercel.json` problems — they're project-settings or code problems. Verify these first:

- [ ] `package.json` has correct `scripts.build`, `scripts.dev`, and (if relevant) `scripts.start`
- [ ] Node/Bun version pinned via `"engines"` in `package.json` or the `bunVersion` field
- [ ] Lockfile committed (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, or `bun.lockb`) and in sync with `package.json`
- [ ] Build succeeds **locally** with a clean install (`rm -rf node_modules && npm ci && npm run build`)
- [ ] No environment variables required at **build time** are missing from Vercel's dashboard (Project Settings → Environment Variables)
- [ ] `.env*` files are gitignored — secrets should never be committed

---

## 2. Minimal Production-Ready `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "framework": "nextjs",
  "buildCommand": "next build",
  "installCommand": "npm ci",
  "outputDirectory": ".next",
  "regions": ["iad1"],
  "trailingSlash": false,
  "cleanUrls": true
}
```

Adjust `framework`, `buildCommand`, and `outputDirectory` to match your actual stack — don't guess. If you use the framework preset detection (leave `framework` unset or `null`), Vercel infers build/output settings automatically for supported frameworks.

---

## 3. Field-by-Field Requirements

### `buildCommand` / `devCommand` / `installCommand`
- Only override these if your monorepo or custom tooling needs something other than the framework default.
- An **empty string** for `installCommand` skips install entirely — only use this if a prior step already installed dependencies.
- Test the exact override command locally before deploying; a typo here fails every build.

### `outputDirectory`
- Must match what your build command actually emits (e.g. `dist`, `build`, `.next`, `out`).
- Mismatches here are one of the most common causes of "Build succeeded, deployment shows 404."

### `framework`
- Set explicitly if auto-detection is unreliable (monorepos, unusual folder layout).
- Use `null` only if you intend "Other" — this disables framework-specific optimizations (ISR, image optimization defaults, etc.).

### `functions`
- Cannot mix with legacy `builds`.
- `memory` is not configurable here if Fluid Compute is enabled (Fluid is default for new projects) — set memory in the dashboard's Functions section instead.
- `maxDuration` must be within your plan's limit — check plan limits before setting this, or the deploy will be rejected.
- Glob patterns must actually match real files; a typo silently applies to nothing (no error, just doesn't work — verify manually).

### `regions` / `functionFailoverRegions`
- Hobby plan: single region only.
- Pro/Enterprise: multi-region.
- `functionFailoverRegions` is Enterprise-only.
- Per-function overrides in `functions` take precedence over the project-level `regions`.

### `images`
- `sizes` is required if you configure this block at all.
- `remotePatterns` must allowlist every external domain you optimize images from, or Image Optimization will fail at runtime (not build time) — test this against real image URLs from your CMS/storage provider.
- `dangerouslyAllowSVG` defaults to `false`; only enable with a strict `contentSecurityPolicy` if you truly need SVG optimization.

### `redirects` / `rewrites` / `headers`
- Evaluated in this order: **redirects → filesystem → rewrites/headers**. A `rewrites` `source` that matches a real file is ignored (filesystem wins).
- Avoid catch-all rewrites (`"source": "/(.*)"`) that could unintentionally proxy user-controlled paths to external destinations — this is a known vector for open-redirect / SSRF-style misconfiguration. Review the "Enhancing Security for Redirects and Rewrites" guidance before shipping wildcard rules.
- `permanent: true` (308) is cached aggressively by browsers — don't use it for anything not truly permanent.

### `crons`
- `path` max 512 chars, `schedule` max 256 chars — both must start with valid cron syntax / `/`.
- Cron jobs only run against the **production** deployment.

### `proxy` (Routing Middleware)
- `entrypoint` must reference a real file ending in `.js` or `.ts`.
- If omitted, Vercel looks for `middleware.ts`/`middleware.js` at the project root by default — don't define both a default middleware file and a conflicting `proxy` entrypoint.

---

## 4. Common Causes of Build Failures (in order of frequency)

1. **Node/package manager version mismatch** — local Node version differs from what Vercel uses. Pin it explicitly.
2. **Missing build-time environment variables** — code references `process.env.X` at build time but `X` isn't set in the target environment (Production/Preview/Development each have separate variable sets in Vercel's dashboard).
3. **Case-sensitive import errors** — works on macOS/Windows locally (case-insensitive filesystem), fails on Vercel's Linux build environment.
4. **Lockfile drift** — `package.json` and lockfile out of sync; `npm ci` (which Vercel effectively mirrors) fails where `npm install` would silently "fix" it locally.
5. **`outputDirectory` mismatch** — build "succeeds" but Vercel can't find the output.
6. **Monorepo root misconfiguration** — Project Settings → Root Directory not pointing at the correct package, or `installCommand` not accounting for workspace hoisting.
7. **Exceeding function size/duration limits** — large dependencies bundled into a single function, or `maxDuration` unset and defaulting below what a long-running route needs.
8. **Ignored Build Step (`ignoreCommand`) misconfigured** — accidentally skips builds that should run, so a real code change never deploys.

---

## 5. Pre-Deployment Checklist (Real Production Platform)

**Build & Config**
- [ ] `vercel.json` validated against `$schema` (editor autocomplete/type-checking enabled)
- [ ] No conflicting legacy `builds` property alongside `functions`/`rewrites`/`redirects`
- [ ] Preview deployment tested with the exact `vercel.json` that will ship to production

**Environment**
- [ ] All required env vars set for **Production**, **Preview**, and **Development** environments separately in the dashboard
- [ ] Secrets never referenced in `vercel.json` `env`/`build.env` (deprecated — use dashboard instead)

**Routing & Security**
- [ ] No wildcard rewrite/redirect unintentionally exposes an open proxy
- [ ] Security headers (`X-Content-Type-Options`, `X-Frame-Options`, etc.) applied via the `headers` config
- [ ] `trailingSlash` behavior decided explicitly (not left as `undefined`, which risks duplicate-content indexing)

**Functions**
- [ ] `maxDuration` set appropriately for any long-running API routes
- [ ] Region(s) chosen based on where your database/data sources live, to minimize latency
- [ ] Failover regions configured if on Enterprise and high availability is required

**Post-Deploy Verification**
- [ ] Production URL smoke-tested after deploy (not just preview)
- [ ] Cron jobs (if any) confirmed firing against production only
- [ ] Build logs reviewed for warnings, not just pass/fail status

---

## 6. Quick Reference: What Overrides What

| Setting in `vercel.json` | Overrides |
|---|---|
| `buildCommand` | Dashboard Build Command, `package.json` build script |
| `devCommand` | Dashboard Development Command |
| `installCommand` | Dashboard Install Command |
| `outputDirectory` | Dashboard Output Directory |
| `framework` | Dashboard Framework Preset |
| Per-function `regions` (in `functions`) | Project-level `regions` |

---

*Source: Vercel's official Project Configuration documentation (`vercel.json` reference). Field behaviors change over time — re-check the live docs before relying on exact limits (plan-based duration caps, region lists, etc.) for a production cutover.*
