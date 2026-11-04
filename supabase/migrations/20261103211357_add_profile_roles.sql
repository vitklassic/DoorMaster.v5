/*
# Add profile roles

1. Modified Tables
- `profiles` — adds `role` column (text, default 'installer', CHECK constraint limits to 'installer' or 'manager')
2. Security
- No new policies needed; existing profile policies already cover SELECT/INSERT/UPDATE/DELETE.
- The role column is protected by RLS: users can only update their own profile.
3. Important Notes
- Existing profile rows get 'installer' as default.
- The CHECK constraint ensures only valid role values are accepted.
- In debug mode, the app may override the role client-side (FORCE_MANAGER_ROLE flag).
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE profiles ADD COLUMN role text NOT NULL DEFAULT 'installer';
    ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('installer', 'manager'));
  END IF;
END $$;