# Supabase repository workflow

This directory is the version-controlled home for Framic AI's Supabase project.

## Current state

- `migrations/` contains the existing repository migration history.
- `config.toml` is present as a minimal, secret-free CLI configuration.
- The live FRAMIC AI Supabase project has not yet been identified through the currently connected Supabase account.
- The existing migration is therefore treated as repository history, not as a verified production baseline.

## Safe baseline procedure

Once the correct FRAMIC AI Supabase project is connected, use the Supabase CLI from the repository root:

```bash
supabase --help
supabase link --project-ref <FRAMIC_PROJECT_REF>
supabase db pull
```

Review the generated remote-schema migration before committing it. In particular, check for unexpected `DROP`, extension, auth, storage, function, trigger, and policy statements.

Then validate locally with:

```bash
supabase db reset
supabase migration list
```

Future schema changes must be created with:

```bash
supabase migration new <change_name>
```

Do not edit an already-applied migration. Do not invent RPC signatures, RLS policies, triggers, or token-accounting tables from application code alone.

## Production gate

No production Supabase schema is changed by this repository bootstrap. Production deployment should occur only after the target project is identified, the baseline is reviewed, migrations pass CI, and the pull request is approved.
