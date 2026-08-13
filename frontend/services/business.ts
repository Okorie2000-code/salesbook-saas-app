import { api } from './api';
import type { Business, AuthUser, Role } from '@/types';

export interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export async function getBusiness(): Promise<Business> {
  return api('/businesses/me');
}

export async function updateBusiness(payload: Partial<Business>): Promise<Business> {
  return api('/businesses/me', { method: 'PATCH', body: payload });
}

export async function getTeam(): Promise<TeamMember[]> {
  return api('/users');
}

export interface InviteUserPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Exclude<Role, 'SUPER_ADMIN'>;
}

/** Returns the created user plus the temporary password (shown once to the inviter). */
export async function inviteUser(payload: InviteUserPayload): Promise<{ user: TeamMember; temporaryPassword: string }> {
  return api('/users', { method: 'POST', body: payload });
}

/** Change role and/or enable/disable (owner only). */
export async function updateUser(userId: string, payload: { role?: Role; isActive?: boolean }): Promise<TeamMember> {
  return api(`/users/${userId}`, { method: 'PATCH', body: payload });
}
