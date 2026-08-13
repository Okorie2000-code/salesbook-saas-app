'use client';

import { useState } from 'react';
import { Alert } from '@/components/ui/Alert';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cancelSale, updatePaymentStatus } from '@/services/sales';
import type { Sale, SalePaymentStatus } from '@/types';
import { formatCurrency, formatDateTime, labelStatus } from '@/utils/format';
import { ApiError } from '@/services/api';

export function SaleDetailModal({
  sale,
  onClose,
  onChanged,
}: {
  sale: Sale | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [paymentStatus, setPaymentStatus] = useState<SalePaymentStatus>('UNPAID');
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

  if (!sale) return null;

  const handleCancel = async () => {
    if (!window.confirm(`Cancel sale ${sale.saleNumber}? This cannot be undone.`)) return;
    setUpdating(true);
    try {
      await cancelSale(sale.id);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to cancel sale');
    } finally {
      setUpdating(false);
    }
  };

  const handlePaymentUpdate = async () => {
    setUpdating(true);
    try {
      await updatePaymentStatus(sale.id, paymentStatus, sale.paymentMethod ?? undefined);
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to update payment status');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <Modal open={!!sale} onClose={onClose} title={`Sale ${sale.saleNumber}`} wide>
      <div className="space-y-4">
        {error && <Alert tone="danger" className="mb-2">{error}</Alert>}

        {/* Header info */}
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-400">Date</p>
            <p className="font-medium text-slate-800">{formatDateTime(sale.createdAt)}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-400">Customer</p>
            <p className="font-medium text-slate-800">{sale.customer?.name ?? 'Walk-in'}</p>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-400">Status</p>
            <Badge tone={sale.status === 'COMPLETED' ? 'success' : sale.status === 'CANCELLED' ? 'danger' : 'warning'}>
              {labelStatus(sale.status)}
            </Badge>
          </div>
          <div className="rounded-lg bg-slate-50 p-3">
            <p className="text-xs text-slate-400">Sold by</p>
            <p className="font-medium text-slate-800">
              {sale.soldBy ? `${sale.soldBy.firstName} ${sale.soldBy.lastName}` : '—'}
            </p>
          </div>
        </div>

        {/* Line items */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2 font-medium">Item</th>
                <th className="px-4 py-2 font-medium">Qty</th>
                <th className="px-4 py-2 font-medium">Price</th>
                <th className="px-4 py-2 text-right font-medium">Line total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(sale.items ?? []).map((it) => (
                <tr key={it.id}>
                  <td className="px-4 py-2 text-slate-800">{it.productName}</td>
                  <td className="px-4 py-2 text-slate-600">{it.quantity}</td>
                  <td className="px-4 py-2 text-slate-600">{formatCurrency(it.unitPrice)}</td>
                  <td className="px-4 py-2 text-right font-medium text-slate-800">{formatCurrency(it.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
          <div className="flex justify-between text-slate-500">
            <span>Subtotal</span>
            <span>{formatCurrency(sale.subtotal)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Discount</span>
            <span>-{formatCurrency(sale.discount)}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Tax</span>
            <span>{formatCurrency(sale.tax)}</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2 text-base font-bold text-slate-900">
            <span>Total</span>
            <span>{formatCurrency(sale.total)}</span>
          </div>
        </div>

        {/* Payment status update */}
        {sale.status !== 'CANCELLED' && (
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg bg-slate-50 p-3">
            <div className="w-48">
              <span className="mb-1 block text-xs font-medium text-slate-500">Mark payment as</span>
              <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as SalePaymentStatus)}>
                <option value="UNPAID">Unpaid</option>
                <option value="PARTIAL">Partially paid</option>
                <option value="PAID">Paid</option>
              </Select>
            </div>
            <Button variant="secondary" size="sm" onClick={handlePaymentUpdate} loading={updating}>
              Update payment
            </Button>
            <Button variant="danger" size="sm" onClick={handleCancel} loading={updating}>
              Cancel sale
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
