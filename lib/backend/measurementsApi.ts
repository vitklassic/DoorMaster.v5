import type { Tenant } from '@/lib/auth/tenant';
import type {
  Measurement,
  MeasurementDetails,
  Opening,
  OpeningInput,
  OpeningSide,
} from '@/lib/measurements/types';
import * as mock from './mockBackend';
import { supabase } from './supabaseClient';

type OpeningRow = {
  id: string;
  floor: string | null;
  room: string | null;
  photo_uri: string | null;
  height_mm: number | null;
  width_mm: number | null;
  thickness_mm: number | null;
  opening_side: OpeningSide | null;
  created_at: string;
};

type MeasurementRow = {
  id: string;
  home_name: string;
  object_address: string | null;
  client_name: string | null;
  floor: string | null;
  entrance: string | null;
  apartment: string | null;
  notes: string | null;
  created_at: string;
  openings: OpeningRow[];
};

type QueryResult<T> = { data: T | null; error: { message: string } | null };

const MEASUREMENT_COLUMNS = '*, openings(*)';

function unwrap<T>({ data, error }: QueryResult<T>): T {
  if (error) throw new Error(error.message);
  if (data === null) throw new Error('Пустой ответ сервера');
  return data;
}

function assertNoError(error: { message: string } | null): void {
  if (error) throw new Error(error.message);
}

function toOpening(row: OpeningRow): Opening {
  return {
    id: row.id,
    floor: row.floor,
    room: row.room,
    photoDataUrl: row.photo_uri,
    height: row.height_mm,
    width: row.width_mm,
    thickness: row.thickness_mm,
    side: row.opening_side,
  };
}

function toMeasurement(row: MeasurementRow): Measurement {
  return {
    id: row.id,
    homeName: row.home_name,
    address: row.object_address ?? '',
    clientName: row.client_name ?? '',
    floor: row.floor ?? '',
    entrance: row.entrance ?? '',
    apartment: row.apartment ?? '',
    notes: row.notes ?? '',
    createdAt: row.created_at,
    openings: [...row.openings].sort((a, b) => a.created_at.localeCompare(b.created_at)).map(toOpening),
  };
}

function detailsToRow(details: MeasurementDetails) {
  return {
    home_name: details.homeName,
    object_address: details.address,
    client_name: details.clientName,
    floor: details.floor,
    entrance: details.entrance,
    apartment: details.apartment,
    notes: details.notes,
  };
}

function openingToRow(opening: OpeningInput) {
  return {
    floor: opening.floor,
    room: opening.room,
    photo_uri: opening.photoDataUrl,
    height_mm: opening.height,
    width_mm: opening.width,
    thickness_mm: opening.thickness,
    opening_side: opening.side,
  };
}

export async function listMeasurements(tenant: Tenant): Promise<Measurement[]> {
  if (!supabase) return mock.mockListMeasurements(tenant);
  const rows = unwrap<MeasurementRow[]>(
    await supabase
      .from('measurements')
      .select(MEASUREMENT_COLUMNS)
      .eq('company_id', tenant.companyId)
      .order('created_at', { ascending: false })
  );
  return rows.map(toMeasurement);
}

export async function createMeasurement(tenant: Tenant, details: MeasurementDetails): Promise<Measurement> {
  if (!supabase) return mock.mockCreateMeasurement(tenant, details);
  const row = unwrap<MeasurementRow>(
    await supabase
      .from('measurements')
      .insert({ user_id: tenant.userId, company_id: tenant.companyId, ...detailsToRow(details) })
      .select(MEASUREMENT_COLUMNS)
      .single()
  );
  return toMeasurement(row);
}

export async function updateMeasurement(
  tenant: Tenant,
  measurementId: string,
  details: MeasurementDetails
): Promise<void> {
  if (!supabase) return mock.mockUpdateMeasurement(tenant, measurementId, details);
  const { error } = await supabase
    .from('measurements')
    .update(detailsToRow(details))
    .eq('id', measurementId)
    .eq('company_id', tenant.companyId);
  assertNoError(error);
}

export async function deleteMeasurement(tenant: Tenant, measurementId: string): Promise<void> {
  if (!supabase) return mock.mockDeleteMeasurement(tenant, measurementId);
  const { error } = await supabase
    .from('measurements')
    .delete()
    .eq('id', measurementId)
    .eq('company_id', tenant.companyId);
  assertNoError(error);
}

export async function addOpening(tenant: Tenant, measurementId: string, opening: OpeningInput): Promise<Opening> {
  if (!supabase) return mock.mockAddOpening(tenant, measurementId, opening);
  const row = unwrap<OpeningRow>(
    await supabase
      .from('openings')
      .insert({
        measurement_id: measurementId,
        ...openingToRow(opening),
      })
      .select('*')
      .single()
  );
  return toOpening(row);
}

export async function deleteOpening(tenant: Tenant, openingId: string): Promise<void> {
  if (!supabase) return mock.mockDeleteOpening(tenant, openingId);
  const { error } = await supabase
    .from('openings')
    .delete()
    .eq('id', openingId);
  assertNoError(error);
}

export async function updateOpening(tenant: Tenant, openingId: string, opening: OpeningInput): Promise<void> {
  if (!supabase) return mock.mockUpdateOpening(tenant, openingId, opening);
  const { error } = await supabase
    .from('openings')
    .update(openingToRow(opening))
    .eq('id', openingId);
  assertNoError(error);
}
