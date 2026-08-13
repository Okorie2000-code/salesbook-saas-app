import { api, setSession, clearSession } from './api';
import type { AdminUser } from '@/types';

interface LoginResponse {
  user: AdminUser;
  accessToken: string;
  refreshToken: string;
}

export interface MeResponse {
  user: AdminUser;
  business: null;
  subscription: unknown;
}

export async function login(email: string, password: string): Promise<AdminUser> {
  const data = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  setSession(data.accessToken, data.refreshToken);
  return data.user;
}

export async function getMe(): Promise<MeResponse> {
  return api('/auth/me');
}

export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    // ignore — always clear locally
  } finally {
    clearSession();
  }
}
