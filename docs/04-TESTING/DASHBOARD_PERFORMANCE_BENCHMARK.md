# Dashboard Performance Benchmark & Validation

**Validation date:** 2026-11-25  
**Scope:** Dashboard LCP/page load, image payload delivery, generated-assets query plans, and duplicate-index review.  
**Target database inspected:** Framic AI Supabase project `gkvvecskbkwpcsuatklm` (read-only inspection).  
**Branch:** `benchmark/dashboard-performance-validation`

## Executive result

This is a baseline and validation protocol, not a performance optimization claim.

- **Dashboard/live-schema compatibility: BROKEN.** The current `main` dashboard selects `profiles.full_name` and `generated_assets.asset_type, storage_url`; the live schema has `profiles.display_name` and `generated_assets.type, storage_bucket, storage_key, public_url, cdn_url`. The current query cannot be considered a successful live dashboard asset fetch.
- **Full-resolution delivery: NOT MEASURED.** The inspected source uses a plain `<img src={asset.storage_url}>` with no width/height transformation, `srcset`, or responsive image loader. If that URL were an original object URL, the code requests it without a thumbnail transform. In the live schema, however, `storage_url` does not exist and the query contract is invalid; a browser network capture is required to determine what a deployed build actually downloads.
- **Image payload/LCP/network totals: NOT MEASURED.** No authenticated browser session, representative assets, or performance trace was available during this repository/database audit.
- **Live database data: empty at inspection.** Counts returned zero rows for `generated_assets`, `profiles`, and `credit_wallets`. Consequently the live execution plan cannot represent a populated creator account.
- **Index changes: NOT APPLIED.** Existing duplicate single-column indexes and the possible composite dashboard index require staging workload evidence before any DDL.

## Repository evidence inspected

| Evidence | Result |
|---|---|
| `apps/web/app/dashboard/page.tsx` | **BROKEN contract:** selects `full_name`, `asset_type`, `storage_url`; renders `<img>` directly from `storage_url` |
| `supabase/migrations/20260910000000_init_schema.sql` | Defines `profiles.display_name`; defines assets with `type`, `storage_bucket`, `storage_key`, `file_size_bytes`, `public_url`, `cdn_url`, `dimensions`; creates standalone asset indexes |
| `apps/web/package.json` | Scripts exist for `build`, `lint`, `type-check`, and `test` |
| `.github/copilot-instructions.md` | **NOT FOUND** at the requested path on `main` (GitHub contents API returned 404) |

The requested SQL using `asset_type` and `storage_url` is not executable against the inspected live schema. The current canonical asset columns are `type` and storage metadata/URL fields listed above.

## Live database schema and index audit

Read-only introspection of project `gkvvecskbkwpcsuatklm` on 2026-11-25 found:

### Asset table

- `generated_assets.user_id uuid NOT NULL`
- `type text NOT NULL`
- `mime_type text NOT NULL`
- `storage_bucket text NOT NULL`
- `storage_key text NOT NULL`
- `file_size_bytes bigint NOT NULL`
- `public_url text NULL`
- `cdn_url text NULL`
- `dimensions jsonb NULL`
- `created_at timestamptz NOT NULL`
- Check constraints include supported types `image|video|audio`, source type, status, and positive file size.
- Existing indexes: primary key on `id`; separate btree indexes on `user_id`, `created_at DESC`, `generation_job_id`, `status`, and `storage_key`.
- No live composite `(user_id, created_at DESC)` index was found.

### Profiles and wallets

- `profiles_email_key` is the unique-constraint-generated index for `UNIQUE(email)`; `idx_profiles_email` is an additional non-unique index on the same key.
- `credit_wallets_user_id_key` is the unique-constraint-generated index for `UNIQUE(user_id)`; `idx_credit_wallets_user_id` is an additional non-unique index on the same key.
- The extra non-unique indexes are duplicate candidates, not automatic drop recommendations. Validate dependent queries, constraints, write overhead, and staged plans before proposing removal.
- The initial migration creates both redundant explicit indexes after declaring the unique constraints.

### Row counts and live plan

Read-only row counts at inspection:

| Table | Rows |
|---|---:|
| `generated_assets` | 0 |
| `profiles` | 0 |
| `credit_wallets` | 0 |

The following schema-corrected query was run with `EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)` and a non-customer sentinel UUID:

```sql
SELECT id, type, public_url, cdn_url, storage_bucket, storage_key,
       file_size_bytes, dimensions, created_at
FROM public.generated_assets
WHERE user_id = '00000000-0000-0000-0000-000000000000'::uuid
ORDER BY created_at DESC
LIMIT 12;
```

Observed plan (empty table):

- `Limit` → `Sort` → `Seq Scan`
- Actual rows: 0
- Shared hit blocks: 3; shared read blocks: 0
- Planning time: 7.318 ms
- Execution time: 0.155 ms
- Sort method: quicksort, 25 KB

**Interpretation:** these timings are not a useful baseline for a populated account. The planner sees an empty relation; do not infer that a sequential scan is preferable at production scale or that an index would improve latency.

## Image delivery and thumbnail feasibility

The three live Storage buckets inspected (`assets`, `avatars`, `uploads`) are all **private**. `assets` and `uploads` allow JPEG, PNG, WebP, and GIF; each has a 20 MiB object limit. The `avatars` bucket allows JPEG, PNG, and WebP with a 2 MiB limit.

Supabase Storage supports on-demand image resizing and format optimization. For private buckets, the server can create a time-limited signed URL with transform options; the transform is bound into the signed URL. Official documentation:
- [Supabase Storage Image Transformations](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Supabase Storage signed URLs for private buckets](https://supabase.com/docs/guides/storage/serving/downloads)

Example server-side pattern (illustrative; do not expose service-role credentials to the browser):

```ts
const { data, error } = await supabase.storage
  .from(asset.storage_bucket)
  .createSignedUrl(asset.storage_key, 60 * 10, {
    transform: {
      width: 480,
      height: 480,
      resize: 'cover',
      quality: 75,
    },
  });
```

The live bucket privacy and file metadata support this approach, but **the project's image-transformation enablement/plan entitlement was not verified**. Confirm Storage → Settings → Enable Image Transformations and plan eligibility before implementation. A `cdn_url` column exists, but its URL contract and whether it represents resized variants were not established; do not assume it is a thumbnail URL.

Do not transform videos/audio as images. Keep original assets available for detail/download views; use thumbnail variants only for image cards.

## Repeatable browser benchmark procedure

Use a staging account with at least 12 representative assets (mix of JPEG/PNG/WebP and realistic source dimensions). Use the same browser, device profile, viewport, network throttling, account, and cache state for before/after runs.

1. Record commit SHA, deployment URL, browser/version, viewport, device profile, network profile, and whether cache is cold or warm.
2. Open DevTools Performance and Network; preserve the log and disable cache for cold runs.
3. Capture at least 5 cold and 5 warm navigations to the dashboard. Export a HAR and Performance trace for each run.
4. Record:
   - LCP (field value and element attribution)
   - navigation/page load timing and DOMContentLoaded
   - total transferred bytes and total resource count
   - image request count, image transferred bytes, and image request timing
   - API/database request timing and response payload bytes
5. For each image request, record content type, transferred bytes, natural dimensions, rendered dimensions, and URL class (original, transformed/signed, CDN). Redact signed query tokens before sharing HARs.
6. Report median and p75 for LCP and load timing; report median total transfer and image transfer. Keep cold and warm results separate.
7. Compare the same asset set before/after. A resized URL is only validated when response dimensions and transferred bytes are captured from the actual response, not inferred from URL parameters.

### Measurement table

| Metric | Baseline | Candidate | Evidence |
|---|---:|---:|---|
| LCP median / p75 | NOT MEASURED | Pending | Performance trace |
| Page load median / p75 | NOT MEASURED | Pending | HAR + Performance trace |
| Total transferred bytes | NOT MEASURED | Pending | HAR |
| Total image transferred bytes | NOT MEASURED | Pending | HAR |
| Image request count | NOT MEASURED | Pending | HAR |
| Image type/dimensions | NOT MEASURED | Pending | Response headers + naturalWidth/naturalHeight |
| Thumbnail transform response bytes | NOT MEASURED | Pending | HAR + image response |
| Dashboard data request duration | NOT MEASURED | Pending | Network timing + query plan |

No image-payload or browser timing values are asserted by this audit.

## Database benchmark procedure (staging only)

Do not use customer data or run candidate DDL in production for this benchmark. Seed staging with representative row counts and realistic per-user distributions. Run `ANALYZE public.generated_assets` after seeding.

The live column contract requires this query (the legacy `asset_type`/`storage_url` form in the request does not match the live schema):

```sql
EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT id, type, public_url, cdn_url, storage_bucket, storage_key,
       file_size_bytes, dimensions, created_at
FROM public.generated_assets
WHERE user_id = 'STAGING_TEST_USER_UUID'::uuid
ORDER BY created_at DESC
LIMIT 12;
```

Capture the complete plan, planning time, execution time, actual rows, rows removed by filter, sort method, shared hit/read blocks, and buffers. Repeat at least 10 times after one warm-up run; report median and p95. Keep staging data volume and cache state consistent.

Optional candidate index — staging only:

```sql
CREATE INDEX idx_generated_assets_user_created_at_bench
ON public.generated_assets (user_id, created_at DESC);

ANALYZE public.generated_assets;

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT JSON)
SELECT id, type, public_url, cdn_url, storage_bucket, storage_key,
       file_size_bytes, dimensions, created_at
FROM public.generated_assets
WHERE user_id = 'STAGING_TEST_USER_UUID'::uuid
ORDER BY created_at DESC
LIMIT 12;

-- After collecting results, remove the benchmark-only index:
DROP INDEX IF EXISTS public.idx_generated_assets_user_created_at_bench;
```

Do not merge a production migration based on a single plan or an empty-table result. Compare median/p95 latency and buffers under the same workload, plus insert/update overhead and index size. Promote an index only if repeatable staged results show a material improvement and query-plan behavior is stable.

### Duplicate/unique index inspection SQL

Run in staging and production read-only to compare definitions; do not drop indexes as part of this checklist:

```sql
SELECT t.relname AS table_name,
       i.relname AS index_name,
       ix.indisunique,
       ix.indisprimary,
       pg_get_indexdef(i.oid) AS index_definition
FROM pg_class AS t
JOIN pg_namespace AS n ON n.oid = t.relnamespace
JOIN pg_index AS ix ON ix.indrelid = t.oid
JOIN pg_class AS i ON i.oid = ix.indexrelid
WHERE n.nspname = 'public'
  AND t.relname IN ('profiles', 'credit_wallets', 'generated_assets')
ORDER BY t.relname, i.relname;
```

For duplicate review, compare the unique constraint backing index and non-unique index on the same key. Confirm no partial predicate, expression, collation, operator class, included columns, or workload requirement distinguishes them. Any removal must be a separate reviewed migration with a staging replay and benchmark.

## Build, lint, type-check, and tests

- Repository scripts exist in `apps/web/package.json`: `build`, `lint`, `type-check`, `test`.
- These commands were **NOT RUN** in this audit because the GitHub repository connector provides source access but not a local repository shell/runtime.
- No workflow runs were returned for the inspected recent commit SHA. This is not evidence of a passing or failing build.
- Run the repository's prescribed package manager from a clean checkout and record exact command, commit SHA, exit code, and logs before merge.

## Safety and evidence handling

- Do not include API keys, access tokens, signed URL query strings, service-role secrets, customer IDs, emails, prompts, or private asset URLs in the PR.
- Use synthetic staging user IDs and test assets.
- Redact signed URL tokens from HAR exports; preserve only the non-secret route shape and response measurements.
- No production DDL, index creation/removal, data writes, storage object reads, or application code changes were made for this audit.

## Current recommendation

1. Fix the dashboard's schema contract in a separate implementation PR after verifying the target code and tests; current main dashboard fields do not match the live database.
2. For private image assets, evaluate server-generated signed thumbnail URLs with Storage transformations after confirming the feature is enabled and measuring actual response sizes.
3. Do not add `(user_id, created_at DESC)` or remove duplicate single-column indexes until representative staging data and repeatable before/after plans justify the change.
4. Capture browser traces and image payload evidence against a deployed build after the dashboard query contract is corrected.
