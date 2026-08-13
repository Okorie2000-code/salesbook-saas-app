'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Receipt, Search } from 'lucide-react';
import { getSales } from '@/services/sales';
import type { Sale } from '@/types';
import { formatCurrency, formatDateTime, labelStatus } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { SaleFormModal } from '@/components/sales/SaleFormModal';
import { SaleDetailModal } from '@/components/sales/SaleDetailModal';
import { ApiError } from '@/services/api';

const paymentTone = (status: Sale['paymentStatus']) =>
  status === 'PAID' ? 'success' : status === 'PARTIAL' ? 'warning' : 'danger';

export default function SalesPage() {
  const [items, setItems] = useState<Sale[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [detail, setDetail] = useState<Sale | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getSales({
        page,
        limit: 10,
        search: search || undefined,
        paymentStatus: paymentStatus || undefined,
      });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load sales');
    } finally {
      setLoading(false);
    }
  }, [page, search, paymentStatus]);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: Column<Sale>[] = [
    {
      key: 'number',
      header: 'Sale',
      render: (s) => (
        <button onClick={() => setDetail(s)} className="text-left">
          <p className="font-medium text-brand-700 hover:underline">{s.saleNumber}</p>
          <p className="text-xs text-slate-400">{formatDateTime(s.createdAt)}</p>
        </button>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (s) => (
        <span className="text-slate-700">{s.customer?.name ?? 'Walk-in'}</span>
      ),
    },
    {
      key: 'total',
      header: 'Total',
      render: (s) => <span className="font-medium text-slate-900">{formatCurrency(s.total)}</span>,
    },
    {
      key: 'payment',
      header: 'Payment',
      render: (s) => (
        <div className="flex flex-col items-start gap-1">
          <Badge tone={paymentTone(s.paymentStatus)}>{labelStatus(s.paymentStatus)}</Badge>
          {s.paymentMethod && (
            <span className="text-xs text-slate-400">{labelStatus(s.paymentMethod)}</span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) =>
        s.status === 'CANCELLED' ? <Badge tone="danger">Cancelled</Badge> : <Badge tone="success">Completed</Badge>,
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sales"
        description="Record and manage your sales transactions."
        actions={
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New sale
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            placeholder="Search by sale number or customer…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            aria-label="Search sales"
          />
        </div>
        <Select
          value={paymentStatus}
          onChange={(e) => {
            setPaymentStatus(e.target.value);
            setPage(1);
          }}
          className="w-full sm:w-44"
          aria-label="Filter by payment status"
        >
          <option value="">All payments</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
          <option value="UNPAID">Unpaid</option>
        </Select>
      </div>

      {error && <Alert tone="danger" title="Unable to load sales">{error}</Alert>}

      <Card>
        {loading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
            title="No sales yet"
            description="Record your first sale to start tracking revenue."
            action={
              <Button size="sm" onClick={() => setFormOpen(true)}>
                <Plus className="h-4 w-4" aria-hidden="true" /> New sale
              </Button>
            }
          />
        ) : (
          <>
            <Table columns={columns} rows={items} />
            <Pagination page={page} totalPages={totalPages} total={total} onChange={setPage} />
          </>
        )}
      </Card>

      <SaleFormModal open={formOpen} onClose={() => setFormOpen(false)} onSaved={() => void load()} />
      <SaleDetailModal sale={detail} onClose={() => setDetail(null)} onChanged={() => void load()} />
    </div>
  );
}
