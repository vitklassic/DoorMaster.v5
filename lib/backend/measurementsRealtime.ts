import type { Tenant } from '@/lib/auth/tenant';
import { subscribeToMockChanges } from './mockBackend';
import { supabase } from './supabaseClient';

export function subscribeToCompanyMeasurements(tenant: Tenant, onChange: () => void): () => void {
  if (!supabase) return subscribeToMockChanges(onChange);

  const client = supabase;
  const filter = `company_id=eq.${tenant.companyId}`;
  const channel = client
    .channel(`company-measurements-${tenant.companyId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'measurements', filter }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'openings', filter }, onChange)
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
