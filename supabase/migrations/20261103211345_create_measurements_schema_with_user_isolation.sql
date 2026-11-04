/*
# Create measurements schema with user isolation

1. New Tables
- `profiles` — user profile linked to auth.users (id, display_name, created_at)
- `measurements` — door measurement records (id, user_id, home_name, object_address, client_name, floor, entrance, apartment, notes, status, created_at, updated_at)
- `openings` — individual door openings within a measurement (id, measurement_id, floor, room, photo_uri, height_mm, width_mm, thickness_mm, opening_side, created_at)
2. Security
- Enable RLS on all tables.
- Grant CRUD to `authenticated` only (app requires sign-in).
- Owner-scoped policies on measurements via user_id.
- Openings scoped through parent measurement ownership.
- Profiles: users can read/update only their own profile.
3. Triggers
- `handle_new_user` — auto-creates a profile row when a new auth.user is created.
4. Important Notes
- user_id on measurements defaults to auth.uid() so inserts omitting it still pass RLS.
- Openings have no direct user_id; access is controlled through the parent measurement.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON profiles TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "delete_own_profile" ON profiles;
CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
  TO authenticated USING (auth.uid() = id);

CREATE TABLE IF NOT EXISTS measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  home_name text NOT NULL DEFAULT 'Новый замер',
  object_address text,
  client_name text,
  floor text,
  entrance text,
  apartment text,
  notes text,
  status text NOT NULL DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE measurements ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON measurements TO authenticated;

DROP POLICY IF EXISTS "select_own_measurements" ON measurements;
CREATE POLICY "select_own_measurements" ON measurements FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_measurements" ON measurements;
CREATE POLICY "insert_own_measurements" ON measurements FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_measurements" ON measurements;
CREATE POLICY "update_own_measurements" ON measurements FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_measurements" ON measurements;
CREATE POLICY "delete_own_measurements" ON measurements FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS openings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  measurement_id uuid NOT NULL REFERENCES measurements(id) ON DELETE CASCADE,
  floor text,
  room text,
  photo_uri text,
  height_mm integer,
  width_mm integer,
  thickness_mm integer,
  opening_side text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE openings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON openings TO authenticated;

DROP POLICY IF EXISTS "select_own_openings" ON openings;
CREATE POLICY "select_own_openings" ON openings FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_openings" ON openings;
CREATE POLICY "insert_own_openings" ON openings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_openings" ON openings;
CREATE POLICY "update_own_openings" ON openings FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_openings" ON openings;
CREATE POLICY "delete_own_openings" ON openings FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM measurements WHERE measurements.id = openings.measurement_id AND measurements.user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_measurements_user_id ON measurements(user_id);
CREATE INDEX IF NOT EXISTS idx_openings_measurement_id ON openings(measurement_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();