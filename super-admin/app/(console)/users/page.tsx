'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
import { getUsers, updateUser } from '@/services/admin';
import type { AdminUser } from '@/types';
import { formatDate, labelStatus } from '@/utils/format';
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHeader,
  Pagination,
  Select,
  Table,
  TableSkeleton,
  type Column,
} from '@/components/ui';
import { toast } from '@/components/Toaster';
import { ApiError } from '@/services/api';

export default function AdminUsersPage() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getUsers({ page, limit: 15, search: search || undefined, role: role || undefined });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load users');
    } finally {
      setLoading(false);
    }
  }, [page, search, role]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleToggle = async (u: AdminUser) => {
    try {
      await updateUser(u.id, { isActive: !u.isActive });
      toast.success(u.isActive ? `${u.firstName} ${u.lastName} disabled` : `${u.firstName} ${u.lastName} enabled`);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update user');
    }
  };

  const handleRole = async (u: AdminUser, nextRole: string) => {
    try {
      await updateUser(u.id, { role: nextRole as AdminUser['role'] });
      toast.success('User role updated.');
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update role');
    }
  };

  const columns: Column<AdminUser>[] = [
    {
      key: 'name',
      header: 'User',
      render: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={`${u.firstName} ${u.lastName}`} />
          <div>
            <p className="font-medium text-slate-800">
              {u.firstName} {u.lastName}
            </p>
            <p className="text-xs text-slate-400">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'business',
      header: 'Business',
      render: (u) => <span className="text-slate-600">{u.business?.name ?? '—'}</span>,
    },
    {
      key: 'role',
      header: 'Role',
      render: (u) =>
        u.role === 'SUPER_ADMIN' ? (
          <Badge tone="brand">Super Admin</Badge>
        ) : (
          <Select
            value={u.role}
            onChange={(e) => handleRole(u, e.target.value)}
            className="w-36 py-1"
            aria-label={`Role for ${u.firstName} ${u.lastName}`}
          >
            <option value="BUSINESS_OWNER">Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="STAFF">Staff</option>
          </Select>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (u.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Disabled</Badge>),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (u) => <span className="text-slate-600">{formatDate(u.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'px-5 py-3 text-right',
      render: (u) =>
        u.role !== 'SUPER_ADMIN' ? (
          <Button variant="ghost" size="sm" onClick={() => handleToggle(u)}>
            {u.isActive ? 'Disable' : 'Enable'}
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Users" description="Every user account across the platform." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            aria-label="Search users"
          />
        </div>
        <Select
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-44"
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          <option value="BUSINESS_OWNER">Owner</option>
          <option value="MANAGER">Manager</option>
          <option value="STAFF">Staff</option>
          <option value="SUPER_ADMIN">Super Admin</option>
        </Select>
      </div>

      {error && <Alert tone="danger" title="Unable to load users">{error}</Alert>}

      <Card>
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.length === 0 ? (
          <EmptyState icon={<Users className="h-6 w-6" aria-hidden="true" />} title="No users found" />
        ) : (
          <>
            <Table columns={columns} rows={items} />
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </Card>
    </div>
  );
}
