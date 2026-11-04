/*
# Add company tenancy

1. New Tables
- `companies` — company/organization records (id, name, created_at)
2. Modified Tables
- `profiles` — adds company_id FK to companies
- `measurements` — adds company_id FK with default to current_company_id()
3. New Functions (SECURITY DEFINER)
- `current_company_id()` — returns the company_id of the currently authenticated user
- `current_user_role()` — returns the role of the currently authenticated user
4. Security Changes
- RLS policies rewritten to be company-scoped on measurements, openings, profiles, companies
- handle_new_user updated to set company_id from invite_code metadata
5. Important Notes
- company_id on measurements defaults to current_company_id() so inserts omitting it pass RLS
*/

CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON companies TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'measurements' AND column_name = 'company_id'
  ) THEN
    ALTER TABLE measurements ADD COLUMN company_id uuid REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Backfill company_id on measurements from the owning user's profile
UPDATE measurements m
SET company_id = p.company_id
FROM profiles p
WHERE m.user_id = p.id AND m.company_id IS NULL AND p.company_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.current_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

REVOKE EXECUTE ON FUNCTION public.current_company_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;

-- Set default on measurements.company_id after function exists
ALTER TABLE measurements ALTER COLUMN company_id DROP DEFAULT;
ALTER TABLE measurements ALTER COLUMN company_id SET DEFAULT public.current_company_id();

CREATE INDEX IF NOT EXISTS idx_measurements_company_id ON measurements(company_id);
CREATE INDEX IF NOT EXISTS idx_profiles_company_id ON profiles(company_id);

-- Company policies
DROP POLICY IF EXISTS "select_own_company" ON companies;
CREATE POLICY "select_own_company" ON companies FOR SELECT
  TO authenticated USING (id = public.current_company_id());

DROP POLICY IF EXISTS "insert_company" ON companies;
CREATE POLICY "insert_company" ON companies FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_company" ON companies;
CREATE POLICY "update_own_company" ON companies FOR UPDATE
  TO authenticated USING (id = public.current_company_id()) WITH CHECK (id = public.current_company_id());

-- Profiles: company-scoped read, self-only update
DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (
    company_id = public.current_company_id()
    OR id = auth.uid()
  );

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

-- Measurements: company-scoped CRUD
DROP POLICY IF EXISTS "select_own_measurements" ON measurements;
CREATE POLICY "select_own_measurements" ON measurements FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "insert_own_measurements" ON measurements;
CREATE POLICY "insert_own_measurements" ON measurements FOR INSERT
  TO authenticated WITH CHECK (company_id = public.current_company_id());

DROP POLICY IF EXISTS "update_own_measurements" ON measurements;
CREATE POLICY "update_own_measurements" ON measurements FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id()) WITH CHECK (company_id = public.current_company_id());

DROP POLICY IF EXISTS "delete_own_measurements" ON measurements;
CREATE POLICY "delete_own_measurements" ON measurements FOR DELETE
  TO authenticated USING (company_id = public.current_company_id());

-- Openings: company-scoped through parent measurement
DROP POLICY IF EXISTS "select_own_openings" ON openings;
CREATE POLICY "select_own_openings" ON openings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.company_id = public.current_company_id())
  );

DROP POLICY IF EXISTS "insert_own_openings" ON openings;
CREATE POLICY "insert_own_openings" ON openings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.company_id = public.current_company_id())
  );

DROP POLICY IF EXISTS "update_own_openings" ON openings;
CREATE POLICY "update_own_openings" ON openings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.company_id = public.current_company_id())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.company_id = public.current_company_id())
  );

DROP POLICY IF EXISTS "delete_own_openings" ON openings;
CREATE POLICY "delete_own_openings" ON openings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.company_id = public.current_company_id())
  );

-- Updated handle_new_user: set company_id from invite_code metadata if valid
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_code text;
  company_uuid uuid;
BEGIN
  invite_code := NEW.raw_user_meta_data->>'invite_code';

  IF invite_code IS NOT NULL AND invite_code != '' THEN
    SELECT company_id INTO company_uuid FROM public.invite_codes WHERE code = invite_code AND is_valid = true AND expires_at > now() LIMIT 1;
  END IF;

  INSERT INTO public.profiles (id, display_name, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    company_uuid
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();