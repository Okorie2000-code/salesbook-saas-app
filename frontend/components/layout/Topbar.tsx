'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut, Menu, Settings, User } from 'lucide-react';
import { Dropdown, MenuItem, MenuLabel } from '@/components/ui/Dropdown';
import { useAuth } from '@/hooks/useAuth';

const TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/sales': 'Sales',
  '/products': 'Products',
  '/customers': 'Customers',
  '/reports': 'Reports',
  '/subscription': 'Subscription',
  '/billing': 'Billing',
  '/settings': 'Settings',
  '/profile': 'Profile',
};

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const title = TITLES[pathname] ?? 'Sales Book';
  const name = user ? `${user.firstName} ${user.lastName}` : 'Account';

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-5">
      <div className="flex min-w-0 items-center gap-2">
        <button
          onClick={onMenuClick}
          className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 lg:hidden"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
          <span className="truncate font-medium text-slate-900">{title}</span>
        </nav>
        <span className="text-sm font-medium text-slate-900 sm:hidden">{title}</span>
      </div>

      <div className="flex items-center gap-3">
        <span className="hidden text-xs text-slate-400 md:block">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        <div className="h-5 w-px bg-slate-200" aria-hidden="true" />
        <Dropdown
          trigger={({ open, toggle }) => (
            <button
              onClick={toggle}
              aria-expanded={open}
              aria-haspopup="menu"
              className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-slate-100"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-semibold text-white">
                {user ? (user.firstName[0] ?? '?') : '?'}
              </span>
              <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 lg:block">
                {name}
              </span>
            </button>
          )}
        >
          {({ close }) => (
            <>
              <MenuLabel>{user?.email ?? name}</MenuLabel>
              <MenuItem
                onClick={() => {
                  close();
                  router.push('/profile');
                }}
                icon={<User className="h-4 w-4 text-slate-400" aria-hidden="true" />}
              >
                Profile
              </MenuItem>
              <MenuItem
                onClick={() => {
                  close();
                  router.push('/settings');
                }}
                icon={<Settings className="h-4 w-4 text-slate-400" aria-hidden="true" />}
              >
                Settings
              </MenuItem>
              <MenuItem onClick={handleLogout} danger icon={<LogOut className="h-4 w-4" aria-hidden="true" />}>
                Log out
              </MenuItem>
            </>
          )}
        </Dropdown>
      </div>
    </header>
  );
}
