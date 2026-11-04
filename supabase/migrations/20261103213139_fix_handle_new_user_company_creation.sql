/*
# Fix handle_new_user to create company from company_name

1. Modified Functions
- `handle_new_user()` — now creates a company row when `company_name` is in signup metadata (for managers registering a new company), in addition to the existing invite_code handling
2. Important Notes
- When a user signs up with company_name (no invite code), a new company is created and the profile gets its company_id
- When a user signs up with a valid invite_code, the profile gets the company_id from the invite
- When neither is provided, company_id stays null
- This fixes the auth error where users with null company_id could not sign in
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_code text;
  company_uuid uuid;
  company_name text;
BEGIN
  invite_code := NEW.raw_user_meta_data->>'invite_code';
  company_name := NEW.raw_user_meta_data->>'company_name';

  IF invite_code IS NOT NULL AND invite_code != '' THEN
    SELECT company_id INTO company_uuid
    FROM public.invite_codes
    WHERE invite_codes.code = invite_code
      AND invite_codes.is_valid = true
      AND invite_codes.expires_at > now()
    LIMIT 1;
  ELSIF company_name IS NOT NULL AND company_name != '' THEN
    INSERT INTO public.companies (name) VALUES (company_name) RETURNING id INTO company_uuid;
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