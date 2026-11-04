import type { UserRole } from '@/lib/auth/roles';
import type { Tenant } from '@/lib/auth/tenant';
import type { Measurement, MeasurementDetails, Opening, OpeningInput } from '@/lib/measurements/types';

const STORAGE_KEY = 'door-mock-backend-v1';

export type MockAuthUser = { id: string; email: string; role: UserRole; companyId: string };

type MockUser = MockAuthUser & { password: string };
type MockRecord = { userId: string; companyId: string; measurement: Measurement };
type MockInvite = { code: string; companyId: string; createdBy: string; expiresAt: string };
type MockState = {
  users: MockUser[];
  measurements: MockRecord[];
  invites: MockInvite[];
  sessionUserId: string | null;
  recoveryEmail: string | null;
};

const EMPTY_STATE: MockState = {
  users: [],
  measurements: [],
  invites: [],
  sessionUserId: null,
  recoveryEmail: null,
};

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INVALID_INVITE_MESSAGE = 'Инвайт-код не найден или истек';

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function readState(): MockState {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_STATE;
  try {
    return { ...EMPTY_STATE, ...(JSON.parse(raw) as Partial<MockState>) };
  } catch {
    return EMPTY_STATE;
  }
}

function writeState(state: MockState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function subscribeToMockChanges(onChange: () => void): () => void {
  const handleStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) onChange();
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}

function findValidInvite(state: MockState, code: string): MockInvite | undefined {
  const normalized = code.trim().toUpperCase();
  const now = new Date().toISOString();
  return state.invites.find((item) => item.code === normalized && item.expiresAt > now);
}

function generateInviteCode(state: MockState): string {
  const taken = new Set(state.invites.map((item) => item.code));
  let code: string;
  do {
    code = Array.from({ length: 8 }, () => Math.floor(Math.random() * 16).toString(16)).join('').toUpperCase();
  } while (taken.has(code));
  return code;
}

function toAuthUser(user: MockUser): MockAuthUser {
  return { id: user.id, email: user.email, role: user.role, companyId: user.companyId };
}

function findRecord(state: MockState, tenant: Tenant, measurementId: string): MockRecord {
  const record = state.measurements.find(
    (item) => item.companyId === tenant.companyId && item.measurement.id === measurementId
  );
  if (!record) throw new Error('Замер не найден');
  return record;
}

function findOpeningRecord(state: MockState, tenant: Tenant, openingId: string): MockRecord {
  const record = state.measurements.find(
    (item) =>
      item.companyId === tenant.companyId &&
      item.measurement.openings.some((existing) => existing.id === openingId)
  );
  if (!record) throw new Error('Проем не найден');
  return record;
}

function replaceRecord(state: MockState, target: MockRecord, next: MockRecord): MockRecord[] {
  return state.measurements.map((item) => (item === target ? next : item));
}

export async function mockGetUser(): Promise<MockAuthUser | null> {
  const state = readState();
  const user = state.users.find((item) => item.id === state.sessionUserId);
  return user ? toAuthUser(user) : null;
}

export async function mockSignUp(email: string, password: string, inviteCode?: string): Promise<MockAuthUser> {
  const state = readState();
  if (state.users.some((item) => item.email === email)) {
    throw new Error('Пользователь с такой почтой уже есть');
  }
  const invite = inviteCode ? findValidInvite(state, inviteCode) : undefined;
  if (inviteCode && !invite) throw new Error(INVALID_INVITE_MESSAGE);
  const user: MockUser = {
    id: createId(),
    email,
    password,
    role: 'installer',
    companyId: invite ? invite.companyId : createId(),
  };
  writeState({ ...state, users: [...state.users, user], sessionUserId: user.id });
  return toAuthUser(user);
}

export async function mockSignIn(email: string, password: string): Promise<MockAuthUser> {
  const state = readState();
  const user = state.users.find((item) => item.email === email && item.password === password);
  if (!user) throw new Error('Неверная почта или пароль');
  writeState({ ...state, sessionUserId: user.id });
  return toAuthUser(user);
}

export async function mockSignOut(): Promise<void> {
  writeState({ ...readState(), sessionUserId: null });
}

export async function mockListMeasurements(tenant: Tenant): Promise<Measurement[]> {
  return readState()
    .measurements.filter((item) => item.companyId === tenant.companyId)
    .map((item) => item.measurement)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function mockCreateInviteCode(tenant: Tenant): Promise<string> {
  const state = readState();
  const code = generateInviteCode(state);
  const invite: MockInvite = {
    code,
    companyId: tenant.companyId,
    createdBy: tenant.userId,
    expiresAt: new Date(Date.now() + INVITE_TTL_MS).toISOString(),
  };
  writeState({ ...state, invites: [...state.invites, invite] });
  return code;
}

export async function mockIsInviteCodeValid(code: string): Promise<boolean> {
  return Boolean(findValidInvite(readState(), code));
}

export async function mockListCompanyInstallers(tenant: Tenant): Promise<{ id: string; email: string }[]> {
  return readState()
    .users.filter((item) => item.companyId === tenant.companyId && item.role === 'installer')
    .map((item) => ({ id: item.id, email: item.email }))
    .sort((a, b) => a.email.localeCompare(b.email));
}

export async function mockCreateMeasurement(tenant: Tenant, details: MeasurementDetails): Promise<Measurement> {
  const state = readState();
  const measurement: Measurement = {
    ...details,
    id: createId(),
    createdAt: new Date().toISOString(),
    openings: [],
  };
  writeState({
    ...state,
    measurements: [...state.measurements, { userId: tenant.userId, companyId: tenant.companyId, measurement }],
  });
  return measurement;
}

export async function mockUpdateMeasurement(
  tenant: Tenant,
  measurementId: string,
  details: MeasurementDetails
): Promise<void> {
  const state = readState();
  const record = findRecord(state, tenant, measurementId);
  const next = { ...record, measurement: { ...record.measurement, ...details } };
  writeState({ ...state, measurements: replaceRecord(state, record, next) });
}

export async function mockDeleteMeasurement(tenant: Tenant, measurementId: string): Promise<void> {
  const state = readState();
  const record = findRecord(state, tenant, measurementId);
  writeState({ ...state, measurements: state.measurements.filter((item) => item !== record) });
}

export async function mockAddOpening(
  tenant: Tenant,
  measurementId: string,
  opening: OpeningInput
): Promise<Opening> {
  const state = readState();
  const record = findRecord(state, tenant, measurementId);
  const created: Opening = { ...opening, id: createId() };
  const next = {
    ...record,
    measurement: { ...record.measurement, openings: [...record.measurement.openings, created] },
  };
  writeState({ ...state, measurements: replaceRecord(state, record, next) });
  return created;
}

export async function mockDeleteOpening(tenant: Tenant, openingId: string): Promise<void> {
  const state = readState();
  const record = findOpeningRecord(state, tenant, openingId);
  const next = {
    ...record,
    measurement: {
      ...record.measurement,
      openings: record.measurement.openings.filter((existing) => existing.id !== openingId),
    },
  };
  writeState({ ...state, measurements: replaceRecord(state, record, next) });
}

export async function mockUpdateOpening(tenant: Tenant, openingId: string, opening: OpeningInput): Promise<void> {
  const state = readState();
  const record = findOpeningRecord(state, tenant, openingId);
  const next = {
    ...record,
    measurement: {
      ...record.measurement,
      openings: record.measurement.openings.map((existing) =>
        existing.id === openingId ? { ...opening, id: openingId } : existing
      ),
    },
  };
  writeState({ ...state, measurements: replaceRecord(state, record, next) });
}

export async function mockRequestPasswordReset(email: string): Promise<void> {
  writeState({ ...readState(), recoveryEmail: email });
}

export async function mockUpdatePassword(newPassword: string): Promise<MockAuthUser> {
  const state = readState();
  const user = state.users.find((item) => item.email === state.recoveryEmail);
  if (!user) throw new Error('Ссылка для сброса пароля недействительна. Запросите новую');
  const updated = { ...user, password: newPassword };
  writeState({
    ...state,
    users: state.users.map((item) => (item === user ? updated : item)),
    sessionUserId: user.id,
    recoveryEmail: null,
  });
  return toAuthUser(updated);
}
