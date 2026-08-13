'use client';

/**
 * Admin auth context. On mount it loads /auth/me (auto-refreshing tokens) and
 * verifies the user actually has the SUPER_ADMIN role — the backend enforces
 * this on every /admin route too, but the UI should not even render.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { getAccessToken } from '@/services/api';
import * as authService from '@/services/auth';
import type { AdminUser } from '@/types';

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AdminUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const check = async () => {
      if (!getAccessToken()) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const me = await authService.getMe();
        // Only SUPER_ADMIN may use this console
        setUser(me.user.role === 'SUPER_ADMIN' ? me.user : null);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await authService.login(email, password);
    setUser(loggedIn);
    return loggedIn;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
