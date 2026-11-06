import type { Tenant } from '@/lib/auth/tenant';
import { subscribeToMockChanges } from './mockBackend';
import { supabase } from './supabaseClient';

export function subscribeToCompanyMeasurements(tenant: Tenant, onChange: () => void): () => void {
  if (!supabase) return subscribeToMockChanges(onChange);

  const client = supabase;
  // T11: installer subscribes to own measurements only; openings stay on the
  // company filter — they just trigger a reload, and the data itself is
  // limited by RLS on the server (realtime respects SELECT policies).
  const measurementsFilter =
    tenant.role === 'installer' ? `user_id=eq.${tenant.userId}` : `company_id=eq.${tenant.companyId}`;
  const openingsFilter = `company_id=eq.${tenant.companyId}`;
  const channel = client
    .channel(`measurements-${tenant.role}-${tenant.userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'measurements', filter: measurementsFilter }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'openings', filter: openingsFilter }, onChange)
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
