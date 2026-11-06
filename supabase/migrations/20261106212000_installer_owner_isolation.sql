/*
# T11 / C20: installer sees only own measurements

1. Changes
- measurements RLS: manager keeps company-wide access; installer is limited
  to rows with user_id = auth.uid() (SELECT/UPDATE/DELETE). INSERT is allowed
  only as yourself inside your own company.
- openings RLS inherits the same rule through the parent measurement.
- storage.objects (bucket opening-photos): installer reaches only photos whose
  measurement (2nd folder of the object path) belongs to them; manager — the
  whole company. The .jpg requirement on writes is kept.
2. Security
- Helpers public.current_company_id() / public.current_user_role() already
  exist (SECURITY DEFINER, STABLE), so policies do not recurse into profiles.
- Realtime postgres_changes respect SELECT policies: installers stop
  receiving other people's measurements/openings automatically.
3. Important Notes
- Idempotent: every CREATE POLICY is preceded by DROP POLICY IF EXISTS,
  safe to run once via SQL Editor (also duplicated as t11-migration.sql).
- T12 will tighten DELETE further (originals are never deleted); this
  migration only fixes the owner boundary (C20).
*/

-- measurements: manager = whole company, installer = own rows only

DROP POLICY IF EXISTS "select_own_measurements" ON measurements;
CREATE POLICY "select_own_measurements" ON measurements FOR SELECT
  TO authenticated USING (
    company_id = public.current_company_id()
    AND (public.current_user_role() = 'manager' OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_measurements" ON measurements;
CREATE POLICY "insert_own_measurements" ON measurements FOR INSERT
  TO authenticated WITH CHECK (
    company_id = public.current_company_id()
    AND user_id = auth.uid()
  );

DROP POLICY IF EXISTS "update_own_measurements" ON measurements;
CREATE POLICY "update_own_measurements" ON measurements FOR UPDATE
  TO authenticated
  USING (
    company_id = public.current_company_id()
    AND (public.current_user_role() = 'manager' OR user_id = auth.uid())
  )
  WITH CHECK (
    company_id = public.current_company_id()
    AND (public.current_user_role() = 'manager' OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "delete_own_measurements" ON measurements;
CREATE POLICY "delete_own_measurements" ON measurements FOR DELETE
  TO authenticated USING (
    company_id = public.current_company_id()
    AND (public.current_user_role() = 'manager' OR user_id = auth.uid())
  );

-- openings: inherit the owner boundary through the parent measurement

DROP POLICY IF EXISTS "select_own_openings" ON openings;
CREATE POLICY "select_own_openings" ON openings FOR SELECT
  TO authenticated USING (
    company_id = public.current_company_id()
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id = openings.measurement_id AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "insert_own_openings" ON openings;
CREATE POLICY "insert_own_openings" ON openings FOR INSERT
  TO authenticated WITH CHECK (
    company_id = public.current_company_id()
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id = openings.measurement_id AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "update_own_openings" ON openings;
CREATE POLICY "update_own_openings" ON openings FOR UPDATE
  TO authenticated
  USING (
    company_id = public.current_company_id()
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id = openings.measurement_id AND m.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    company_id = public.current_company_id()
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id = openings.measurement_id AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "delete_own_openings" ON openings;
CREATE POLICY "delete_own_openings" ON openings FOR DELETE
  TO authenticated USING (
    company_id = public.current_company_id()
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id = openings.measurement_id AND m.user_id = auth.uid()
      )
    )
  );

-- storage opening-photos: path is {company_id}/{measurement_id}/{opening_id}.jpg
-- installer reaches only photos of own measurements (measurement = folder 2)

DROP POLICY IF EXISTS "opening_photos_select" ON storage.objects;
CREATE POLICY "opening_photos_select" ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id::text = (storage.foldername(name))[2]
          AND m.company_id = public.current_company_id()
          AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "opening_photos_insert" ON storage.objects;
CREATE POLICY "opening_photos_insert" ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND lower(substring(name from '\.[a-zA-Z0-9]+$')) = '.jpg'
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id::text = (storage.foldername(name))[2]
          AND m.company_id = public.current_company_id()
          AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "opening_photos_update" ON storage.objects;
CREATE POLICY "opening_photos_update" ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id::text = (storage.foldername(name))[2]
          AND m.company_id = public.current_company_id()
          AND m.user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND lower(substring(name from '\.[a-zA-Z0-9]+$')) = '.jpg'
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id::text = (storage.foldername(name))[2]
          AND m.company_id = public.current_company_id()
          AND m.user_id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "opening_photos_delete" ON storage.objects;
CREATE POLICY "opening_photos_delete" ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'opening-photos'
    AND (storage.foldername(name))[1] = public.current_company_id()::text
    AND (
      public.current_user_role() = 'manager'
      OR EXISTS (
        SELECT 1 FROM public.measurements m
        WHERE m.id::text = (storage.foldername(name))[2]
          AND m.company_id = public.current_company_id()
          AND m.user_id = auth.uid()
      )
    )
  );
