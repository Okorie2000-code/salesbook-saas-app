'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Search } from 'lucide-react';
import { getSubscriptions } from '@/services/admin';
import type { AdminSubscription } from '@/types';
import { formatCurrency, formatDate, labelStatus } from '@/utils/format';
import {
  Alert,
  Badge,
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
import { ApiError } from '@/services/api';

const statusTone = (status: AdminSubscription['status']) =>
  status === 'ACTIVE' || status === 'TRIAL'
    ? 'success'
    : status === 'PAST_DUE' || status === 'CANCELLED'
      ? 'warning'
      : 'danger';

export default function SubscriptionsPage() {
  const [items, setItems] = useState<AdminSubscription[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getSubscriptions({ page, limit: 15, search: search || undefined, status: status || undefined });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load subscriptions');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<AdminSubscription>[] = [
    {
      key: 'business',
      header: 'Business',
      render: (s) => (
        <div>
          <p className="font-medium text-slate-800">{s.business.name}</p>
          <p className="text-xs text-slate-400">{s.business.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (s) => (
        <div>
          <p className="font-medium text-slate-800">{s.plan.name}</p>
          <p className="text-xs text-slate-400">
            {formatCurrency(s.plan.price, s.plan.currency)}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <Badge tone={statusTone(s.status)}>{labelStatus(s.status)}</Badge>,
    },
    {
      key: 'period',
      header: 'Period end',
      render: (s) => (
        <span className="text-slate-600">
          {formatDate(s.currentPeriodEnd)}
          {s.cancelAtPeriodEnd && (
            <span className="ml-2 text-xs text-warning-600">cancels</span>
          )}
        </span>
      ),
    },
    {
      key: 'created',
      header: 'Started',
      render: (s) => <span className="text-slate-600">{formatDate(s.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Subscriptions" description="Every business subscription and its billing period." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            placeholder="Search by business…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            aria-label="Search subscriptions"
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
          <option value="TRIAL">Trial</option>
          <option value="ACTIVE">Active</option>
          <option value="PAST_DUE">Past due</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="SUSPENDED">Suspended</option>
          <option value="EXPIRED">Expired</option>
        </Select>
      </div>

      {error && <Alert tone="danger" title="Unable to load subscriptions">{error}</Alert>}

      <Card>
        {loading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-6 w-6" aria-hidden="true" />}
            title="No subscriptions found"
            description="Businesses get a subscription when they sign up."
          />
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
