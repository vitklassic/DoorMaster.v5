import type { Tenant } from '@/lib/auth/tenant';
import * as mock from './mockBackend';
import { supabase } from './supabaseClient';

export type CompanyInstaller = { id: string; email: string };

type InstallerRow = { id: string; email: string };

export async function listCompanyInstallers(tenant: Tenant): Promise<CompanyInstaller[]> {
  if (!supabase) return mock.mockListCompanyInstallers(tenant);
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('company_id', tenant.companyId)
    .eq('role', 'installer')
    .order('email', { ascending: true });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) throw new Error('Пустой ответ сервера');
  return (data as InstallerRow[]).map((row) => ({ id: row.id, email: row.email }));
}

export function subscribeToCompanyInstallers(tenant: Tenant, onChange: () => void): () => void {
  if (!supabase) return mock.subscribeToMockChanges(onChange);

  const client = supabase;
  const channel = client
    .channel(`company-installers-${tenant.companyId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'profiles', filter: `company_id=eq.${tenant.companyId}` },
      onChange
    )
    .subscribe();

  return () => {
    void client.removeChannel(channel);
  };
}
