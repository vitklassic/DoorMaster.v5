/*
# Measurement status model

1. Changes
- CHECK constraint on measurements.status: 'draft', 'active', 'done', 'archived'
  (the DEFAULT 'draft' already exists on the column)
- Composite index idx_measurements_company_status on (company_id, status)
  for the manager feed status filters
- RPC set_measurement_status(p_measurement_id uuid, p_status text) —
  company-scoped status transition with a server-side transition table
2. Security
- The RPC verifies the measurement belongs to public.current_company_id()
  and validates the transition; invalid transitions raise an exception,
  so a user of another company cannot change the status (C5, standard TS p.5)
- Status changes only through the RPC; the company-scoped UPDATE policy
  on measurements is left unchanged (RPC is the source of truth)
3. Important Notes
- Allowed transitions: draft->active; active->done|draft; done->archived|active; archived->done
- Unknown status values are rejected by the RPC
- updated_at is refreshed on every status change
*/

ALTER TABLE measurements ADD CONSTRAINT measurements_status_check
  CHECK (status IN ('draft', 'active', 'done', 'archived'));

CREATE INDEX IF NOT EXISTS idx_measurements_company_status ON measurements(company_id, status);

CREATE OR REPLACE FUNCTION public.set_measurement_status(p_measurement_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_status text;
  owner_company_id uuid;
BEGIN
  SELECT status, company_id INTO current_status, owner_company_id
  FROM public.measurements
  WHERE id = p_measurement_id;

  IF owner_company_id IS NULL THEN
    RAISE EXCEPTION 'Замер не найден';
  END IF;

  IF owner_company_id != public.current_company_id() THEN
    RAISE EXCEPTION 'Нет доступа к замеру';
  END IF;

  IF p_status NOT IN ('draft', 'active', 'done', 'archived') THEN
    RAISE EXCEPTION 'Неизвестный статус';
  END IF;

  IF NOT (
    (current_status = 'draft' AND p_status = 'active')
    OR (current_status = 'active' AND p_status IN ('done', 'draft'))
    OR (current_status = 'done' AND p_status IN ('archived', 'active'))
    OR (current_status = 'archived' AND p_status = 'done')
  ) THEN
    RAISE EXCEPTION 'Недопустимый переход статуса';
  END IF;

  UPDATE public.measurements
  SET status = p_status, updated_at = now()
  WHERE id = p_measurement_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.set_measurement_status(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_measurement_status(uuid, text) TO authenticated;
