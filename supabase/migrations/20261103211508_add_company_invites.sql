/*
# Add company invites

1. New Tables
- `invite_codes` — invitation codes for joining a company (id, company_id, code, is_valid, expires_at, created_by, created_at)
2. New Functions (SECURITY DEFINER)
- `create_invite_code()` — generates a random 8-char alphanumeric code for the caller's company, valid 7 days
- `is_valid_invite_code(p_code text)` — checks if a code is valid and not expired, returns the company_id
3. Security
- invite_codes table: RLS enabled, only members of the same company can view codes; only managers can create
- Functions revoke public execute, grant to authenticated
4. Important Notes
- Codes are 8 characters, uppercase alphanumeric
- TTL is 7 days from creation
- profiles table added to supabase_realtime for live installer list updates
*/

CREATE TABLE IF NOT EXISTS invite_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code text NOT NULL UNIQUE,
  is_valid boolean NOT NULL DEFAULT true,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON invite_codes TO authenticated;

DROP POLICY IF EXISTS "select_company_invites" ON invite_codes;
CREATE POLICY "select_company_invites" ON invite_codes FOR SELECT
  TO authenticated USING (company_id = public.current_company_id());

DROP POLICY IF EXISTS "insert_company_invites" ON invite_codes;
CREATE POLICY "insert_company_invites" ON invite_codes FOR INSERT
  TO authenticated WITH CHECK (
    company_id = public.current_company_id()
    AND public.current_user_role() = 'manager'
  );

DROP POLICY IF EXISTS "update_company_invites" ON invite_codes;
CREATE POLICY "update_company_invites" ON invite_codes FOR UPDATE
  TO authenticated USING (company_id = public.current_company_id())
  WITH CHECK (company_id = public.current_company_id());

CREATE INDEX IF NOT EXISTS idx_invite_codes_company_id ON invite_codes(company_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON invite_codes(code);

-- create_invite_code: generates a random 8-char code for the caller's company
CREATE OR REPLACE FUNCTION public.create_invite_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code text;
  company_uuid uuid;
BEGIN
  company_uuid := public.current_company_id();
  IF company_uuid IS NULL THEN
    RAISE EXCEPTION 'User is not associated with a company';
  END IF;

  new_code := upper(substring(md5(random()::text || now()::text) from 1 for 8));

  INSERT INTO public.invite_codes (company_id, code, created_by)
  VALUES (company_uuid, new_code, auth.uid());

  RETURN new_code;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_invite_code() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invite_code() TO authenticated;

-- is_valid_invite_code: checks validity and returns company_id
CREATE OR REPLACE FUNCTION public.is_valid_invite_code(p_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_uuid uuid;
BEGIN
  SELECT invite_codes.company_id INTO company_uuid
  FROM public.invite_codes
  WHERE invite_codes.code = p_code
    AND invite_codes.is_valid = true
    AND invite_codes.expires_at > now()
  LIMIT 1;

  RETURN company_uuid;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_valid_invite_code(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_valid_invite_code(text) TO authenticated;

-- Add profiles to realtime for live installer list
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;