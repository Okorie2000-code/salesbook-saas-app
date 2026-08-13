import { api, setSession, clearSession } from './api';
import type { AuthUser } from '@/types';

export interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  businessName: string;
}

/** Register a new business + owner account and store the returned session. */
export async function register(payload: RegisterPayload): Promise<AuthUser> {
  const data = await api<LoginResponse>('/auth/register', {
    method: 'POST',
    body: payload,
  });
  setSession(data.accessToken, data.refreshToken);
  return data.user;
}

/** Login and store the returned session. */
export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await api<LoginResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  setSession(data.accessToken, data.refreshToken);
  return data.user;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return api('/auth/forgot-password', { method: 'POST', body: { email } });
}

export async function resetPassword(token: string, password: string): Promise<{ message: string }> {
  return api('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return api('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword },
  });
}

export interface MeResponse {
  user: AuthUser;
  business: { id: string; name: string; status: string } | null;
  subscription: unknown | null;
}

export async function getMe(): Promise<MeResponse> {
  return api('/auth/me');
}

export async function updateProfile(payload: Partial<{ firstName: string; lastName: string; phone: string }>): Promise<AuthUser> {
  return api('/auth/me', { method: 'PATCH', body: payload });
}

/** Clear the stored session. The server keeps the refresh token invalidated via logout. */
export async function logout(): Promise<void> {
  try {
    await api('/auth/logout', { method: 'POST' });
  } catch {
    // Ignore network errors on logout — we always clear locally.
  } finally {
    clearSession();
  }
}
