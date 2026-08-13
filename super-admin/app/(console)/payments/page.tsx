'use client';

import { useCallback, useEffect, useState } from 'react';
import { Receipt, Search } from 'lucide-react';
import { getPayments } from '@/services/admin';
import type { PaymentTransaction } from '@/types';
import { formatCurrency, formatDateTime, labelStatus } from '@/utils/format';
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

const statusTone = (status: string) =>
  status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'warning';

export default function PaymentsPage() {
  const [items, setItems] = useState<PaymentTransaction[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [provider, setProvider] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getPayments({
        page,
        limit: 15,
        search: search || undefined,
        status: status || undefined,
        provider: provider || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load payments');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, provider]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<PaymentTransaction>[] = [
    {
      key: 'business',
      header: 'Business',
      render: (p) => <p className="font-medium text-slate-800">{p.business?.name ?? '—'}</p>,
    },
    {
      key: 'reference',
      header: 'Reference',
      render: (p) => (
        <div>
          <p className="font-mono text-xs text-slate-700">{p.reference}</p>
          <p className="text-xs text-slate-400">{p.plan?.name ?? 'Plan payment'}</p>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (p) => <span className="font-medium text-slate-900">{formatCurrency(p.amount, p.currency)}</span>,
    },
    {
      key: 'provider',
      header: 'Provider',
      render: (p) => <Badge tone="neutral">{labelStatus(p.provider)}</Badge>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <Badge tone={statusTone(p.status)}>{labelStatus(p.status)}</Badge>,
    },
    {
      key: 'date',
      header: 'Date',
      render: (p) => <span className="text-slate-600">{formatDateTime(p.createdAt)}</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Payments" description="Every subscription payment processed on the platform." />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            placeholder="Search by reference or business…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            aria-label="Search payments"
          />
        </div>
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-40"
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          <option value="SUCCESS">Success</option>
          <option value="FAILED">Failed</option>
          <option value="PENDING">Pending</option>
        </Select>
        <Select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-44"
          aria-label="Filter by provider"
        >
          <option value="">All providers</option>
          <option value="PAYSTACK">Paystack</option>
          <option value="FLUTTERWAVE">Flutterwave</option>
        </Select>
      </div>

      {error && <Alert tone="danger" title="Unable to load payments">{error}</Alert>}

      <Card>
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
            title="No payments found"
            description="Try different filters."
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
