'use client';

/**
 * Landing page for the Super Admin console.
 * Redirects authenticated SUPER_ADMIN users to the dashboard and everyone
 * else to the login page.
 */
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) router.replace(user ? '/dashboard' : '/login');
  }, [loading, user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <Spinner label="Loading…" />
    </div>
  );
}
