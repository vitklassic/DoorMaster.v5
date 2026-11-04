import type { Tenant } from '@/lib/auth/tenant';
import * as mock from './mockBackend';
import { supabase } from './supabaseClient';

const GENERIC_INVITE_ERROR = 'Не удалось создать инвайт-код. Попробуйте еще раз';

export async function createInviteCode(tenant: Tenant): Promise<string> {
  if (!supabase) return mock.mockCreateInviteCode(tenant);
  const { data, error } = await supabase.rpc('create_invite_code');
  if (error || typeof data !== 'string') throw new Error(GENERIC_INVITE_ERROR);
  return data;
}

export async function isInviteCodeValid(code: string): Promise<boolean> {
  if (!supabase) return mock.mockIsInviteCodeValid(code);
  const { data, error } = await supabase.rpc('is_valid_invite_code', { p_code: code });
  if (error || typeof data !== 'boolean') throw new Error(GENERIC_INVITE_ERROR);
  return data;
}
