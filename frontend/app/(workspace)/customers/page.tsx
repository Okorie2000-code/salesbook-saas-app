'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, Pencil, Plus, Search, Users } from 'lucide-react';
import { archiveCustomer, getCustomer, getCustomers, restoreCustomer } from '@/services/customers';
import type { Customer, Sale } from '@/types';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Modal } from '@/components/ui/Modal';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toaster';
import { CustomerFormModal } from '@/components/customers/CustomerFormModal';
import { ApiError } from '@/services/api';

export default function CustomersPage() {
  const [items, setItems] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Purchase history modal state
  const [historyCustomer, setHistoryCustomer] = useState<(Customer & { sales: Sale[] }) | null>(null);

  // Archive confirmation state
  const [confirmTarget, setConfirmTarget] = useState<Customer | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getCustomers({ page, limit: 10, search: search || undefined, archived: showArchived });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load customers');
    } finally {
      setLoading(false);
    }
  }, [page, search, showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const openHistory = async (customer: Customer) => {
    try {
      const detail = await getCustomer(customer.id);
      setHistoryCustomer(detail);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to load purchase history');
    }
  };

  const handleArchiveConfirm = async () => {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setConfirmTarget(null);
    try {
      if (target.isArchived) {
        await restoreCustomer(target.id);
        toast.success(`${target.name} restored`);
      } else {
        await archiveCustomer(target.id);
        toast.success(`${target.name} archived`);
      }
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update customer');
    }
  };

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Customer',
      render: (c) => (
        <button onClick={() => openHistory(c)} className="text-left">
          <p className="font-medium text-slate-800 hover:text-brand-700 hover:underline">{c.name}</p>
          {c.email && <p className="text-xs text-slate-400">{c.email}</p>}
        </button>
      ),
    },
    { key: 'phone', header: 'Phone', render: (c) => <span className="text-slate-600">{c.phone ?? '—'}</span> },
    {
      key: 'spent',
      header: 'Total spent',
      render: (c) => <span className="font-medium text-slate-900">{formatCurrency(c.totalSpent ?? 0)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => (c.isArchived ? <Badge tone="danger">Archived</Badge> : <Badge tone="success">Active</Badge>),
    },
    {
      key: 'actions',
      header: '',
      className: 'px-5 py-3 text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(c);
              setModalOpen(true);
            }}
            aria-label={`Edit ${c.name}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmTarget(c)}>
            {c.isArchived ? (
              <>
                <ArchiveRestore className="h-3.5 w-3.5" aria-hidden="true" /> Restore
              </>
            ) : (
              <>
                <Archive className="h-3.5 w-3.5" aria-hidden="true" /> Archive
              </>
            )}
          </Button>
        </div>
      ),
    },
  ];

  const totalSpent = historyCustomer
    ? historyCustomer.sales.reduce((sum, s) => sum + s.total, 0)
    : 0;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="Manage your customers and view their purchase history."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add customer
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            placeholder="Search customers…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            aria-label="Search customers"
          />
        </div>
        <Button
          variant="secondary"
          size="md"
          onClick={() => setShowArchived((v) => !v)}
          className="sm:w-auto"
        >
          {showArchived ? 'Hide archived' : 'Show archived'}
        </Button>
      </div>

      {error && <Alert tone="danger" title="Unable to load customers">{error}</Alert>}

      <Card>
        {loading ? (
          <TableSkeleton rows={8} columns={5} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6" aria-hidden="true" />}
            title="No customers yet"
            description="Add your first customer to track who buys from you."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Add customer
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

      <CustomerFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={editing}
        onSaved={() => void load()}
      />

      {/* Archive confirmation */}
      <ConfirmDialog
        open={!!confirmTarget}
        title={confirmTarget?.isArchived ? 'Restore customer' : 'Archive customer'}
        description={
          confirmTarget
            ? confirmTarget.isArchived
              ? `Restore "${confirmTarget.name}"? It will be visible in your customer list again.`
              : `Archive "${confirmTarget.name}"? Their sales history is kept, but they will be hidden from the list.`
            : undefined
        }
        confirmText={confirmTarget?.isArchived ? 'Restore' : 'Archive'}
        danger={!confirmTarget?.isArchived}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setConfirmTarget(null)}
      />

      {/* Purchase history modal */}
      <Modal
        open={!!historyCustomer}
        onClose={() => setHistoryCustomer(null)}
        title={historyCustomer ? `Purchase history — ${historyCustomer.name}` : ''}
        wide
      >
        {historyCustomer && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Purchases</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-800">{historyCustomer.sales.length}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Total spent</p>
                <p className="mt-0.5 text-lg font-semibold text-slate-800">{formatCurrency(totalSpent)}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Last purchase</p>
                <p className="mt-0.5 text-sm font-medium text-slate-800">
                  {historyCustomer.sales.length ? formatDateTime(historyCustomer.sales[0].createdAt) : '—'}
                </p>
              </div>
            </div>

            {historyCustomer.sales.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">No purchases recorded yet.</p>
            ) : (
              <div className="max-h-72 divide-y divide-slate-100 overflow-y-auto">
                {historyCustomer.sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{sale.saleNumber}</p>
                      <p className="text-xs text-slate-400">{formatDateTime(sale.createdAt)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(sale.total)}</p>
                      <Badge tone={sale.paymentStatus === 'PAID' ? 'success' : sale.paymentStatus === 'PARTIAL' ? 'warning' : 'danger'}>
                        {sale.paymentStatus}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
