'use client';

/**
 * Console layout — guards every admin page behind the SUPER_ADMIN role.
 * Unauthenticated or non-admin users are redirected to /login.
 */
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, Settings, ShieldCheck } from 'lucide-react';
import { Sidebar } from '@/components/Sidebar';
import { Dropdown, MenuItem, MenuLabel, Spinner } from '@/components/ui';
import { useAuth } from '@/hooks/useAuth';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/businesses': 'Businesses',
  '/users': 'Users',
  '/plans': 'Plans',
  '/payments': 'Payments',
  '/settings': 'Platform settings',
};

export default function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Spinner label="Checking admin session…" />
      </div>
    );
  }

  if (!user) return null;

  const title = TITLES[pathname] ?? 'Super Admin';
  const name = `${user.firstName} ${user.lastName}`;

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile sidebar */}
      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => setMenuOpen(true)}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-900">
              <ShieldCheck className="h-4 w-4 text-brand-700" aria-hidden="true" />
              {title}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-slate-400 md:block">
              {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <Dropdown
              trigger={({ open, toggle }) => (
                <button
                  onClick={toggle}
                  aria-expanded={open}
                  aria-haspopup="menu"
                  className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-slate-100"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-900 text-xs font-semibold text-white">
                    {user.firstName[0] ?? 'A'}
                  </span>
                  <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 lg:block">
                    {name}
                  </span>
                </button>
              )}
            >
              {({ close }) => (
                <>
                  <MenuLabel>{user.email}</MenuLabel>
                  <MenuItem
                    onClick={() => {
                      close();
                      router.push('/settings');
                    }}
                    icon={<Settings className="h-4 w-4 text-slate-400" aria-hidden="true" />}
                  >
                    Platform settings
                  </MenuItem>
                  <MenuItem onClick={handleLogout} danger icon={<LogOut className="h-4 w-4" aria-hidden="true" />}>
                    Log out
                  </MenuItem>
                </>
              )}
            </Dropdown>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-5">{children}</main>
      </div>
    </div>
  );
}
