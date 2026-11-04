import type { UserRole } from '@/lib/auth/roles';
import { isInviteCodeValid } from './inviteApi';
import * as mock from './mockBackend';
import { INVALID_INVITE_MESSAGE } from './mockBackend';
import { supabase } from './supabaseClient';

export type AuthUser = { id: string; email: string; role: UserRole; companyId: string };

const GENERIC_AUTH_ERROR = 'Не удалось выполнить действие. Проверьте соединение и попробуйте еще раз';

function parseRole(value: unknown): UserRole {
  if (value === 'installer' || value === 'manager') return value;
  throw new Error(GENERIC_AUTH_ERROR);
}

function translateAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return 'Неверная почта или пароль';
  if (/already (registered|exists)/i.test(message)) return 'Пользователь с такой почтой уже есть';
  if (/password/i.test(message)) return 'Пароль слишком короткий: минимум 6 символов';
  return GENERIC_AUTH_ERROR;
}

async function ensureCompanyId(profileId: string): Promise<string> {
  if (!supabase) throw new Error(GENERIC_AUTH_ERROR);
  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', profileId)
    .maybeSingle();
  if (profile?.company_id) return profile.company_id;

  const companyName = `${profileId.slice(0, 8)} company`;
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .insert({ name: companyName })
    .select('id')
    .single();
  if (companyError || !company) throw new Error(GENERIC_AUTH_ERROR);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ company_id: company.id })
    .eq('id', profileId);
  if (updateError) throw new Error(GENERIC_AUTH_ERROR);

  return company.id;
}

async function withRole(user: { id: string; email?: string | null }): Promise<AuthUser> {
  if (!supabase) throw new Error(GENERIC_AUTH_ERROR);
  const { data, error } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) throw new Error(GENERIC_AUTH_ERROR);
  const companyId = data.company_id ?? (await ensureCompanyId(user.id));
  return {
    id: user.id,
    email: user.email ?? '',
    role: parseRole(data.role),
    companyId,
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (!supabase) return mock.mockGetUser();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error(GENERIC_AUTH_ERROR);
  return data.session ? withRole(data.session.user) : null;
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  if (!supabase) return mock.mockSignIn(email, password);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.user) throw new Error(GENERIC_AUTH_ERROR);
  return withRole(data.user);
}

export async function signUp(
  email: string,
  password: string,
  companyName: string,
  inviteCode: string
): Promise<AuthUser> {
  if (!supabase) return mock.mockSignUp(email, password, inviteCode || undefined);
  if (inviteCode && !(await isInviteCodeValid(inviteCode))) throw new Error(INVALID_INVITE_MESSAGE);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: inviteCode ? { invite_code: inviteCode } : { company_name: companyName },
    },
  });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.user || !data.session) {
    throw new Error('Аккаунт создан, но вход не выполнен. Попробуйте войти');
  }
  return withRole(data.user);
}

export async function signOut(): Promise<void> {
  if (!supabase) return mock.mockSignOut();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error(GENERIC_AUTH_ERROR);
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!supabase) return mock.mockRequestPasswordReset(email);
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin });
  if (error) throw new Error(GENERIC_AUTH_ERROR);
}

export async function updatePassword(newPassword: string): Promise<AuthUser> {
  if (!supabase) return mock.mockUpdatePassword(newPassword);
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(translateAuthError(error.message));
  if (!data.user) throw new Error(GENERIC_AUTH_ERROR);
  return withRole(data.user);
}

export function subscribeToAuthChanges(onChange: (event: string, user: AuthUser | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    (async () => {
      const user = session ? await withRole(session.user) : null;
      onChange(event, user);
    })().catch(() => onChange(event, null));
  });
  return () => data.subscription.unsubscribe();
}
