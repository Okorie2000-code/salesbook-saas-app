'use client';

import { useEffect, useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { createProduct, updateProduct, type ProductPayload } from '@/services/products';
import type { Product } from '@/types';
import { ApiError } from '@/services/api';

const empty: ProductPayload = {
  name: '',
  description: '',
  sku: '',
  category: '',
  price: 0,
  costPrice: undefined,
  stockQuantity: undefined,
};

export function ProductFormModal({
  open,
  onClose,
  product,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  product?: Product | null;
  onSaved: (product: Product) => void;
}) {
  const [form, setForm] = useState<ProductPayload>(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        product
          ? {
              name: product.name,
              description: product.description ?? '',
              sku: product.sku ?? '',
              category: product.category ?? '',
              price: product.price,
              costPrice: product.costPrice ?? undefined,
              stockQuantity: product.stockQuantity ?? undefined,
            }
          : empty,
      );
    }
  }, [open, product]);

  const set = (key: keyof ProductPayload) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setForm((f) => ({
      ...f,
      [key]:
        key === 'price' || key === 'costPrice' || key === 'stockQuantity'
          ? value === ''
            ? undefined
            : Number(value)
          : value,
    }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('Product name is required');
      return;
    }
    setSaving(true);
    try {
      const saved = product
        ? await updateProduct(product.id, form)
        : await createProduct(form);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save product');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={product ? 'Edit product' : 'Add product'}
      footer={<ModalFooter onCancel={onClose} onConfirm={handleSave} loading={saving} />}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Product name" required>
          <Input value={form.name} onChange={set('name')} required placeholder="e.g. Premium Rice 50kg" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Selling price (₦)" required>
            <Input type="number" min={0} value={form.price} onChange={set('price')} required placeholder="0.00" />
          </Field>
          <Field label="Cost price (₦)">
            <Input type="number" min={0} value={form.costPrice ?? ''} onChange={set('costPrice')} placeholder="Optional" />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="SKU / Code">
            <Input value={form.sku ?? ''} onChange={set('sku')} placeholder="Optional" />
          </Field>
          <Field label="Category">
            <Input value={form.category ?? ''} onChange={set('category')} placeholder="e.g. Groceries" />
          </Field>
        </div>
        <Field label="Stock quantity" hint="Leave blank if you don't track stock">
          <Input type="number" min={0} value={form.stockQuantity ?? ''} onChange={set('stockQuantity')} placeholder="Optional" />
        </Field>
        <Field label="Description">
          <Textarea value={form.description ?? ''} onChange={set('description')} placeholder="Optional notes" />
        </Field>
      </div>
    </Modal>
  );
}
