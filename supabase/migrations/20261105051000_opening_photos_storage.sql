/*
# Opening photos via Supabase Storage

1. Changes
- Private bucket `opening-photos` for opening photos
  (idempotent insert — safe to re-run in the SQL Editor)
- Object path: {company_id}/{measurement_id}/{opening_id}.jpg; client uploads
  with upsert: true, so replacing a photo does not create new files
2. Security
- storage.objects policies (SELECT/INSERT/UPDATE/DELETE): the caller's company
  must equal the first folder of the object path = public.current_company_id();
  INSERT/UPDATE additionally require a .jpg extension
3. Important Notes
- openings.photo_uri keeps its name but now stores the Storage PATH, not a
  base64 data URL. Data URLs remain allowed only in the web mock mode
  (app runs without Supabase env) — this shrinks DB rows and realtime payloads
- Policy names are scoped to the bucket via bucket_id in the expression, and
  each policy is preceded by DROP POLICY IF EXISTS, so the script is idempotent
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('opening-photos', 'opening-photos', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "opening_photos_select" ON storage.objects;
CREATE POLICY "opening_photos_select" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
  );

DROP POLICY IF EXISTS "opening_photos_insert" ON storage.objects;
CREATE POLICY "opening_photos_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND lower(substring(name from '\.[a-zA-Z0-9]+$')) = '.jpg'
  );

DROP POLICY IF EXISTS "opening_photos_update" ON storage.objects;
CREATE POLICY "opening_photos_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
  )
  WITH CHECK (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND lower(substring(name from '\.[a-zA-Z0-9]+$')) = '.jpg'
  );

DROP POLICY IF EXISTS "opening_photos_delete" ON storage.objects;
CREATE POLICY "opening_photos_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
  );
