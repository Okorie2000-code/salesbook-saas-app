/**
 * Thin API client over fetch.
 *
 * - Attaches the JWT access token to every request.
 * - On a 401, automatically tries to refresh the token once and retries.
 * - Unwraps the backend envelope ({ success, data }) and throws ApiError with
 *   the backend's message on failure.
 */
function resolveApiBase(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL;
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === 'production') {
    // Fail loudly instead of silently calling a localhost URL in production.
    throw new Error('NEXT_PUBLIC_API_URL is required in production — set it in your Vercel project environment variables.');
  }
  // Local development fallback only — never used in production builds.
  return 'http://localhost:3002/api';
}

const API_BASE = resolveApiBase();

export const ACCESS_TOKEN_KEY = 'sb_access';
export const REFRESH_TOKEN_KEY = 'sb_refresh';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  }
  return accessToken;
}

export function setSession(access: string, refresh: string) {
  accessToken = access;
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, access);
    window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
  }
}

export function clearSession() {
  accessToken = null;
  if (typeof window !== 'undefined') {
    window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = typeof window !== 'undefined' ? window.localStorage.getItem(REFRESH_TOKEN_KEY) : null;
  if (!refreshToken) return null;

  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (!res.ok) {
    clearSession();
    return null;
  }
  const json = await res.json();
  setSession(json.data.accessToken, json.data.refreshToken);
  return json.data.accessToken as string;
}

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
}

export async function api<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const buildRequest = (token: string | null): RequestInit => ({
    method: options.method ?? 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const first = await fetch(`${API_BASE}${path}`, buildRequest(getAccessToken()));

  // One automatic retry after refreshing the token
  if (first.status === 401 && getAccessToken()) {
    refreshInFlight = refreshInFlight ?? refreshAccessToken();
    const newToken = await refreshInFlight;
    refreshInFlight = null;
    if (newToken) {
      const retry = await fetch(`${API_BASE}${path}`, buildRequest(newToken));
      return unwrap<T>(retry);
    }
  }

  return unwrap<T>(first);
}

async function unwrap<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const message = json?.message ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, Array.isArray(message) ? message.join(', ') : message);
  }
  return json.data as T;
}
