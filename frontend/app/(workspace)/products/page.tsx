'use client';

import { useCallback, useEffect, useState } from 'react';
import { Archive, ArchiveRestore, Package, Pencil, Plus, Search } from 'lucide-react';
import { archiveProduct, getProducts, restoreProduct } from '@/services/products';
import type { Product } from '@/types';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Table, type Column } from '@/components/ui/Table';
import { Pagination } from '@/components/ui/Pagination';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toaster';
import { ProductFormModal } from '@/components/products/ProductFormModal';
import { ApiError } from '@/services/api';

const LOW_STOCK_THRESHOLD = 5;

function StockBadge({ product }: { product: Product }) {
  const stock = product.stockQuantity;
  if (stock === null || stock === undefined) {
    return <span className="text-slate-400">Not tracked</span>;
  }
  if (stock === 0) return <Badge tone="danger">Out of stock</Badge>;
  if (stock <= LOW_STOCK_THRESHOLD) return <Badge tone="warning">{stock} low</Badge>;
  return <span className="font-medium text-slate-700">{stock}</span>;
}

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Product | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await getProducts({ page, limit: 10, search: search || undefined, archived: showArchived });
      setItems(result.items);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load products');
    } finally {
      setLoading(false);
    }
  }, [page, search, showArchived]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleArchiveConfirm = async () => {
    if (!confirmTarget) return;
    const target = confirmTarget;
    setConfirmTarget(null);
    try {
      if (target.isArchived) {
        await restoreProduct(target.id);
        toast.success(`${target.name} restored`);
      } else {
        await archiveProduct(target.id);
        toast.success(`${target.name} archived`);
      }
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update product');
    }
  };

  const columns: Column<Product>[] = [
    {
      key: 'name',
      header: 'Product',
      render: (p) => (
        <div>
          <p className="font-medium text-slate-800">{p.name}</p>
          {p.sku && <p className="text-xs text-slate-400">{p.sku}</p>}
        </div>
      ),
    },
    { key: 'category', header: 'Category', render: (p) => <span className="text-slate-600">{p.category ?? '—'}</span> },
    {
      key: 'price',
      header: 'Price',
      render: (p) => <span className="font-medium text-slate-900">{formatCurrency(p.price)}</span>,
    },
    {
      key: 'stock',
      header: 'Stock',
      render: (p) => <StockBadge product={p} />,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (p.isArchived ? <Badge tone="danger">Archived</Badge> : <Badge tone="success">Active</Badge>),
    },
    {
      key: 'actions',
      header: '',
      className: 'px-5 py-3 text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditing(p);
              setModalOpen(true);
            }}
            aria-label={`Edit ${p.name}`}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" /> Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setConfirmTarget(p)}>
            {p.isArchived ? (
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

  return (
    <div className="space-y-5">
      <PageHeader
        title="Products"
        description="Manage your product catalog, pricing and stock levels."
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" /> Add product
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <Input
            placeholder="Search products…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
            aria-label="Search products"
          />
        </div>
        <Button variant="secondary" size="md" onClick={() => setShowArchived((v) => !v)}>
          {showArchived ? 'Hide archived' : 'Show archived'}
        </Button>
      </div>

      {error && <Alert tone="danger" title="Unable to load products">{error}</Alert>}

      <Card>
        {loading ? (
          <TableSkeleton rows={8} columns={6} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Package className="h-6 w-6" aria-hidden="true" />}
            title="No products yet"
            description="Add your first product to start selling."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" aria-hidden="true" /> Add product
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

      <ProductFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        product={editing}
        onSaved={() => void load()}
      />

      <ConfirmDialog
        open={!!confirmTarget}
        title={confirmTarget?.isArchived ? 'Restore product' : 'Archive product'}
        description={
          confirmTarget
            ? confirmTarget.isArchived
              ? `Restore "${confirmTarget.name}"? It will be available for new sales again.`
              : `Archive "${confirmTarget.name}"? It will be hidden from the list, but existing sales keep their records.`
            : undefined
        }
        confirmText={confirmTarget?.isArchived ? 'Restore' : 'Archive'}
        danger={!confirmTarget?.isArchived}
        onConfirm={handleArchiveConfirm}
        onCancel={() => setConfirmTarget(null)}
      />
    </div>
  );
}
