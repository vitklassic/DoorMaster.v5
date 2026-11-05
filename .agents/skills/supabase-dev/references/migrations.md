# Idempotent migrations and verification

## Patterns

Use fully qualified object names where practical. Retry safety does not replace reviewing the dry run.

```sql
-- Column
ALTER TABLE public.openings ADD COLUMN IF NOT EXISTS company_id uuid;

-- Constraint: PostgreSQL has no ADD CONSTRAINT IF NOT EXISTS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'measurements_status_check'
      AND conrelid = 'public.measurements'::regclass
  ) THEN
    ALTER TABLE public.measurements
      ADD CONSTRAINT measurements_status_check
      CHECK (status IN ('draft', 'active', 'done', 'archived'));
  END IF;
END
$$;

-- Index
CREATE INDEX IF NOT EXISTS idx_measurements_company_status
  ON public.measurements(company_id, status);

-- Policy
DROP POLICY IF EXISTS "opening_photos_select" ON storage.objects;
CREATE POLICY "opening_photos_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
  );

-- Function and least-privilege execution
CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public AS $$ /* existing implementation */ $$;
REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;

-- Trigger
DROP TRIGGER IF EXISTS trigger_name ON public.measurements;
CREATE TRIGGER trigger_name BEFORE UPDATE ON public.measurements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Private bucket; DO UPDATE also repairs an incorrect public flag on retry
INSERT INTO storage.buckets (id, name, public)
VALUES ('opening-photos', 'opening-photos', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;
```

Before adding a column as `NOT NULL`, backfill existing rows and verify no nulls remain. For enum values, prefer `ALTER TYPE ... ADD VALUE IF NOT EXISTS`; remember transaction limitations in older PostgreSQL versions.

## Privileged SQL verification

Run through an authorized SQL/CLI session and inspect results; execution alone is not verification.

```sql
SELECT version, name FROM supabase_migrations.schema_migrations
ORDER BY version DESC LIMIT 10;

SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint WHERE conrelid = 'public.measurements'::regclass;

SELECT policyname, cmd, roles, qual, with_check
FROM pg_policies WHERE schemaname = 'public'
ORDER BY tablename, policyname;

SELECT id, public FROM storage.buckets WHERE id = 'opening-photos';

SELECT p.proname, p.prosecdef, p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'set_measurement_status';
```

Expected Storage object path: `company_id/measurement_id/opening_id.jpg`. Verify SELECT/INSERT/UPDATE/DELETE policies are bucket-scoped and company-scoped.

## PostgREST interpretation

- HTTP 200 with `limit=0`: route exists and request privileges are accepted; it does not prove RLS correctness.
- HTTP 401/403: inspect key type, JWT expiry, grants, and API configuration.
- HTTP 404: check table exposure and object existence; for private Storage as anon this is normally expected.
- RLS correctness requires two companies or authorized security tests. An empty result from one account is not sufficient evidence.

## Manual fallback

If the owner must use SQL Editor, provide one file containing the entire migration, state that it is safe to retry, and ask for the exact error if it fails. Never ask the owner to paste secrets into chat.
