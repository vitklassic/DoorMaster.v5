/*
# Fix handle_new_user: reject invalid invite codes, set role correctly

1. Modified Functions
- `handle_new_user()` — now raises an error if invite_code is provided but not found/invalid, instead of silently creating a new company. Sets role to 'installer' for invite-code users, 'manager' for company creators.
2. Important Notes
- Invite-code users get installer role and the inviter's company_id
- Company creators get manager role and a new company
- Invalid invite codes raise an exception, preventing account creation
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
  new_role text;
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

    IF company_uuid IS NULL THEN
      RAISE EXCEPTION 'Инвайт-код не найден или истек';
    END IF;

    new_role := 'installer';
  ELSE
    INSERT INTO public.companies (name)
    VALUES (COALESCE(NULLIF(company_name, ''), 'Моя компания'))
    RETURNING id INTO company_uuid;

    new_role := 'manager';
  END IF;

  INSERT INTO public.profiles (id, display_name, role, company_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    new_role,
    company_uuid
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();