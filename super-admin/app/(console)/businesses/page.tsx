'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Search } from 'lucide-react';
import { getBusinesses, updateBusinessStatus } from '@/services/admin';
import type { AdminBusiness } from '@/types';
import { formatDate, labelStatus } from '@/utils/format';
import {
  Alert,
  Badge,
  Button,
  Card,
  ConfirmDialog,
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

const statusTone = (status: string) =>
  status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'warning' : 'danger';

export default function BusinessesPage() {
  const router = useRouter();
  const [items, setItems] = useState<AdminBusiness[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirm, setConfirm] = useState<{ business: AdminBusiness; next: 'SUSPENDED' | 'ACTIVE' | 'ARCHIVED' } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getBusinesses({ page, limit: 15, search: search || undefined, status: status || undefined });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load businesses');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleStatusConfirm = async () => {
    if (!confirm) return;
    const { business, next } = confirm;
    setConfirm(null);
    try {
      await updateBusinessStatus(business.id, next);
      toast.success(
        next === 'SUSPENDED'
          ? `${business.name} suspended`
          : next === 'ARCHIVED'
            ? `${business.name} archived`
            : `${business.name} reactivated`,
      );
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update business');
    }
  };

  const columns: Column<AdminBusiness>[] = [
    {
      key: 'name',
      header: 'Business',
      render: (b) => (
        <button onClick={() => router.push(`/businesses/${b.id}`)} className="text-left">
          <p className="font-medium text-brand-700 hover:underline">{b.name}</p>
          <p className="text-xs text-slate-400">{b.email ?? b.slug}</p>
        </button>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (b) => <span className="text-slate-600">{b.subscriptions?.[0]?.plan?.name ?? '—'}</span>,
    },
    {
      key: 'counts',
      header: 'Users / Products',
      render: (b) => `${b._count?.users ?? 0} / ${b._count?.products ?? 0}`,
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <Badge tone={statusTone(b.status)}>{labelStatus(b.status)}</Badge>,
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (b) => <span className="text-slate-600">{formatDate(b.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      className: 'px-5 py-3 text-right',
      render: (b) => (
        <div className="flex justify-end gap-1">
          {b.status === 'ACTIVE' ? (
            <Button variant="ghost" size="sm" onClick={() => setConfirm({ business: b, next: 'SUSPENDED' })}>
              Suspend
            </Button>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirm({ business: b, next: 'ACTIVE' })}>
              Reactivate
            </Button>
          )}
          {b.status !== 'ARCHIVED' && (
            <Button variant="ghost" size="sm" onClick={() => setConfirm({ business: b, next: 'ARCHIVED' })}>
              Archive
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Businesses"
        description="Every tenant on the platform — inspect, suspend or archive."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            placeholder="Search by name, email or slug…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            aria-label="Search businesses"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-44"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="ARCHIVED">Archived</option>
        </Select>
      </div>

      {error && <Alert tone="danger" title="Unable to load businesses">{error}</Alert>}

      <Card>
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-6 w-6" aria-hidden="true" />}
            title="No businesses found"
            description="Try a different search or filter."
          />
        ) : (
          <>
            <Table columns={columns} rows={items} />
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </Card>

      <ConfirmDialog
        open={!!confirm}
        title={
          confirm?.next === 'SUSPENDED'
            ? 'Suspend business'
            : confirm?.next === 'ARCHIVED'
              ? 'Archive business'
              : 'Reactivate business'
        }
        description={
          confirm
            ? confirm.next === 'SUSPENDED'
              ? `Suspend "${confirm.business.name}"? All its users will be locked out immediately.`
              : confirm.next === 'ARCHIVED'
                ? `Archive "${confirm.business.name}"? Its data is kept, but the business is removed from active use.`
                : `Reactivate "${confirm.business.name}"? Its users will be able to log in again.`
            : undefined
        }
        confirmText={
          confirm?.next === 'SUSPENDED' ? 'Suspend' : confirm?.next === 'ARCHIVED' ? 'Archive' : 'Reactivate'
        }
        danger={confirm?.next !== 'ACTIVE'}
        onConfirm={handleStatusConfirm}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
