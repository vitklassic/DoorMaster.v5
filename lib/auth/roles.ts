export const USER_ROLES = ['installer', 'manager'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_LABELS: Record<UserRole, string> = {
  installer: 'Монтажник',
  manager: 'Менеджер',
};

export const ROLE_PERMISSIONS: Record<UserRole, { canEnterMeasurements: boolean; canViewTeamFeed: boolean }> = {
  installer: { canEnterMeasurements: true, canViewTeamFeed: false },
  manager: { canEnterMeasurements: false, canViewTeamFeed: true },
};
