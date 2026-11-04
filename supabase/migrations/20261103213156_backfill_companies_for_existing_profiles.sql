/*
# Backfill companies for existing profiles without company_id

1. Changes
- Creates a company for each profile that has null company_id
- Updates those profiles to reference the new company
2. Important Notes
- This is a data fixup for users who registered before the company creation logic was added
- Each user gets their own company named after their display_name + "'s company"
*/

DO $$
DECLARE
  profile_record RECORD;
  new_company_id uuid;
BEGIN
  FOR profile_record IN
    SELECT id, display_name FROM public.profiles WHERE company_id IS NULL
  LOOP
    INSERT INTO public.companies (name, created_at)
    VALUES (COALESCE(profile_record.display_name || '''s company', 'My Company'), now())
    RETURNING id INTO new_company_id;

    UPDATE public.profiles
    SET company_id = new_company_id
    WHERE id = profile_record.id;
  END LOOP;
END $$;