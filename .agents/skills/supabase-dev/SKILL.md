---
name: supabase-dev
description: Develop, apply, and verify DoorMaster Supabase changes safely. Use for SQL migrations, idempotent PostgreSQL/PostgREST changes, RLS and RPC policies, Supabase CLI linking and remote db push, Storage buckets, Auth settings, live-database smoke checks, and diagnosing anon-versus-authenticated access. Especially use before applying migrations or declaring that the remote database is configured.
---

# Supabase development

Work from the repository containing `supabase/migrations/`. Read `Docs/process/STATUS.md` and inspect existing migrations before changing anything.

## Workflow

1. Record the project ref, migration filenames, and current Git state. Never print or commit credentials; never read secrets merely to display them.
2. Prefer the Supabase CLI over manual SQL Editor steps:
   - Require an access token through the environment or CLI login, never in source files.
   - Link once: `npx supabase link --project-ref <project-ref>`.
   - Preview: `npx supabase db push --remote --dry-run`.
   - Apply only with the owner's explicit approval: `npx supabase db push --remote --yes`.
   - Confirm history: `npx supabase migration list --remote`.
   - CLI flags vary by version; check `npx supabase db push --help` if a command fails.
3. If CLI access is unavailable, create one complete, idempotent SQL file for manual execution. Label it **not applied** until the owner confirms success. Do not claim live verification from a REST check alone.
4. Make every migration safe to retry using [references/migrations.md](references/migrations.md). Preserve tenant isolation through `company_id` and RLS.
5. Verify both schema and runtime behavior. Run the read-only smoke script without reading `.env` into the conversation:

   ```bash
   python .agents/skills/supabase-dev/scripts/verify_supabase.py \
     --url "$EXPO_PUBLIC_SUPABASE_URL" \
     --anon-key "$EXPO_PUBLIC_SUPABASE_ANON_KEY"
   ```

   Pass `--table <name>` for additional exposed tables and `--user-jwt "$SUPABASE_USER_JWT"` to test an authenticated session. The script requests `limit=0`; it does not mutate data.
6. Report separately: migration files created, migrations actually applied, schema checks passed, runtime checks passed, and remaining manual steps.

## Security invariants

- Use only `EXPO_PUBLIC_SUPABASE_URL` and the publishable/anon key in Expo. Never ship service-role, database passwords, Management API tokens, or CLI access tokens to the client.
- Treat `401`/`403` as auth or permission failures; treat REST `404` as an unexposed/missing object until proven otherwise. A private Storage bucket returning `404` to anon is expected, not proof that it is absent.
- Verify private buckets and privileged grants with SQL or an authorized CLI session, not by weakening RLS or making the bucket public.
- Use `SECURITY DEFINER` only with a fixed `search_path`, explicit tenant checks, and minimal `EXECUTE` grants.
- Do not create test users or mutate live data unless the owner explicitly asks.

## Auth checklist

Check Site URL, allowed redirect URLs (current web origin plus `doormaster://`), email-confirmation intent, and SMTP readiness. Distinguish code readiness from dashboard configuration.
