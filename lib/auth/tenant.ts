import type { UserRole } from '@/lib/auth/roles';

export type Tenant = {
  userId: string;
  companyId: string;
  role: UserRole;
};
