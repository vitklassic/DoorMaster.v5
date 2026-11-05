/*
# Fix openings realtime filter and anonymous invite validation

1. Changes
- Denormalizes `company_id` onto `openings` (backfilled from the parent measurement)
  so the client realtime filter on openings can match on a plain column
  (realtime subscriptions cannot use the old EXISTS-through-parent policies)
- Adds trigger `set_openings_company` keeping `openings.company_id` in sync with
  the parent measurement on INSERT and on UPDATE of `measurement_id`
2. Security
- Rewrites the 4 RLS policies on openings (select/insert/update/delete), replacing
  the EXISTS(...) subquery with `company_id = public.current_company_id()`
  (safe now that the trigger maintains the column)
3. Important Notes
- FIX C10: `is_valid_invite_code(text)` is now executable by `anon`.
  REASON: sign-up by invite code calls this RPC before any session exists,
  so the call runs as `anon`; without the grant, invite registration fails
  with a permission error. DO NOT revert this to authenticated-only —
  future audits must keep the anon grant or restore invite sign-up.
- company_id on openings is NOT NULL after backfill; rows whose parent
  measurement is missing fail the backfill and must be fixed manually
- Trigger raises an exception if the referenced measurement does not exist
*/

-- 1. Denormalize company_id onto openings

ALTER TABLE openings ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;

UPDATE openings o
SET company_id = m.company_id
FROM measurements m
WHERE o.measurement_id = m.id AND o.company_id IS NULL;

ALTER TABLE openings ALTER COLUMN company_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_openings_company_id ON openings(company_id);

-- Trigger: keep openings.company_id in sync with the parent measurement
CREATE OR REPLACE FUNCTION public.set_openings_company()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  parent_company_id uuid;
BEGIN
  SELECT company_id INTO parent_company_id
  FROM public.measurements
  WHERE id = NEW.measurement_id;

  IF parent_company_id IS NULL THEN
    RAISE EXCEPTION 'Measurement % not found for opening', NEW.measurement_id;
  END IF;

  NEW.company_id := parent_company_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_openings_company ON openings;
CREATE TRIGGER set_openings_company
  BEFORE INSERT OR UPDATE OF measurement_id ON openings
  FOR EACH ROW EXECUTE FUNCTION public.set_openings_company();

-- 2. Rewrite openings RLS policies on the denormalized column

DROP POLICY IF EXISTS "select_own_openings" ON openings;
CREATE POLICY "select_own_openings" ON openings FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "insert_own_openings" ON openings;
CREATE POLICY "insert_own_openings" ON openings FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

DROP POLICY IF EXISTS "update_own_openings" ON openings;
CREATE POLICY "update_own_openings" ON openings FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

DROP POLICY IF EXISTS "delete_own_openings" ON openings;
CREATE POLICY "delete_own_openings" ON openings FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());

-- 3. FIX C10: allow anonymous callers to validate invite codes during sign-up.
-- The RPC is invoked BEFORE a session exists (client calls it to check the code
-- during registration), so the grant to `anon` is required on purpose.
-- DO NOT REVOKE this in a future cleanup — see header note.
GRANT EXECUTE ON FUNCTION public.is_valid_invite_code(text) TO anon;
