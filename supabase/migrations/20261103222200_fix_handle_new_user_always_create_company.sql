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
    SELECT company_id INTO company_uuid FROM public.invite_codes WHERE code = invite_code AND is_valid = true AND expires_at > now() LIMIT 1;
  END IF;
  IF company_uuid IS NULL THEN
    INSERT INTO public.companies (name) VALUES (COALESCE(NULLIF(company_name, ''), 'Моя компания')) RETURNING id INTO company_uuid;
  END IF;
  INSERT INTO public.profiles (id, display_name, company_id)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)), company_uuid);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
