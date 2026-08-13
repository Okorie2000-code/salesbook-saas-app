'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { createSale, type CreateSalePayload } from '@/services/sales';
import { getProducts } from '@/services/products';
import { getCustomers } from '@/services/customers';
import type { Customer, Product } from '@/types';
import { formatCurrency } from '@/utils/format';
import { ApiError } from '@/services/api';

interface LineItem {
  key: number;
  productId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
}

let nextKey = 1;

export function SaleFormModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState<LineItem[]>([
    { key: nextKey++, productName: '', unitPrice: 0, quantity: 1, discount: 0 },
  ]);
  const [discount, setDiscount] = useState(0);
  const [tax, setTax] = useState(0);
  const [paymentStatus, setPaymentStatus] = useState<'UNPAID' | 'PARTIAL' | 'PAID'>('UNPAID');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER'>('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      void getCustomers({ limit: 100 }).then((r) => setCustomers(r.items)).catch(() => setCustomers([]));
      void getProducts({ limit: 100 }).then((r) => setProducts(r.items)).catch(() => setProducts([]));
    }
  }, [open]);

  // Totals
  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0),
    [items],
  );
  const lineDiscounts = useMemo(
    () => items.reduce((sum, it) => sum + it.discount, 0),
    [items],
  );
  const taxable = subtotal - lineDiscounts - discount;
  const total = Math.max(0, taxable + (taxable * tax) / 100);

  const updateItem = (key: number, patch: Partial<LineItem>) =>
    setItems((list) => list.map((it) => (it.key === key ? { ...it, ...patch } : it)));

  const removeItem = (key: number) => {
    if (items.length === 1) return;
    setItems((list) => list.filter((it) => it.key !== key));
  };

  /** Picking a product fills in name + price automatically. */
  const onProductChange = (key: number, productId: string) => {
    const product = products.find((p) => p.id === productId);
    updateItem(key, {
      productId: product?.id,
      productName: product?.name ?? '',
      unitPrice: product?.price ?? 0,
    });
  };

  const addLine = () =>
    setItems((list) => [
      ...list,
      { key: nextKey++, productName: '', unitPrice: 0, quantity: 1, discount: 0 },
    ]);

  const handleSave = async () => {
    setError('');
    if (items.some((it) => !it.productName.trim() || it.quantity <= 0)) {
      setError('Every line needs a product name and a quantity greater than zero');
      return;
    }
    setSaving(true);
    try {
      const payload: CreateSalePayload = {
        customerId: customerId || undefined,
        items: items.map(({ productId, productName, unitPrice, quantity, discount: d }) => ({
          productId,
          productName,
          unitPrice,
          quantity,
          discount: d,
        })),
        discount,
        tax,
        paymentStatus,
        paymentMethod,
        notes: notes || undefined,
      };
      await createSale(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to record the sale');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record a new sale"
      wide
      footer={<ModalFooter onCancel={onClose} onConfirm={handleSave} confirmText="Save sale" loading={saving} />}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <Field label="Customer">
          <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">Walk-in customer (no record)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>

        {/* Line items */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Items</p>
          {items.map((it, index) => (
            <div key={it.key} className="flex flex-wrap items-end gap-2 rounded-lg bg-slate-50 p-2">
              <div className="min-w-[180px] flex-1">
                <span className="mb-1 block text-xs text-slate-400">Product #{index + 1}</span>
                <Select value={it.productId ?? ''} onChange={(e) => onProductChange(it.key, e.target.value)}>
                  <option value="">— Select product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatCurrency(p.price)})
                    </option>
                  ))}
                </Select>
              </div>
              <div className="w-24">
                <span className="mb-1 block text-xs text-slate-400">Price</span>
                <Input
                  type="number"
                  min={0}
                  value={it.unitPrice}
                  onChange={(e) => updateItem(it.key, { unitPrice: Number(e.target.value) })}
                />
              </div>
              <div className="w-20">
                <span className="mb-1 block text-xs text-slate-400">Qty</span>
                <Input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => updateItem(it.key, { quantity: Number(e.target.value) })}
                />
              </div>
              <div className="w-24">
                <span className="mb-1 block text-xs text-slate-400">Discount ₦</span>
                <Input
                  type="number"
                  min={0}
                  value={it.discount}
                  onChange={(e) => updateItem(it.key, { discount: Number(e.target.value) })}
                />
              </div>
              <div className="w-20 pb-1 text-right">
                <p className="text-sm font-semibold text-slate-800">
                  {formatCurrency(it.unitPrice * it.quantity - it.discount)}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => removeItem(it.key)} disabled={items.length === 1} aria-label={`Remove item ${index + 1}`}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={addLine}>
            + Add item
          </Button>
        </div>

        {/* Totals */}
        <div className="grid grid-cols-3 gap-3">
          <Field label="Order discount (₦)">
            <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Number(e.target.value))} />
          </Field>
          <Field label="Tax (%)">
            <Input type="number" min={0} value={tax} onChange={(e) => setTax(Number(e.target.value))} />
          </Field>
          <div className="flex flex-col justify-end">
            <p className="text-xs text-slate-400">
              Subtotal {formatCurrency(subtotal)} · Discounts {formatCurrency(lineDiscounts + discount)}
            </p>
            <p className="text-lg font-bold text-slate-900">Total {formatCurrency(total)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Payment status">
            <Select value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value as typeof paymentStatus)}>
              <option value="UNPAID">Unpaid</option>
              <option value="PARTIAL">Partially paid</option>
              <option value="PAID">Paid</option>
            </Select>
          </Field>
          <Field label="Payment method">
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
              <option value="CASH">Cash</option>
              <option value="BANK_TRANSFER">Bank transfer</option>
              <option value="CARD">Card</option>
              <option value="OTHER">Other</option>
            </Select>
          </Field>
        </div>

        <Field label="Notes">
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </Field>
      </div>
    </Modal>
  );
}
