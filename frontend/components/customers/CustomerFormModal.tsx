'use client';

import { useEffect, useState } from 'react';
import { Modal, ModalFooter } from '@/components/ui/Modal';
import { Field, Input, Textarea } from '@/components/ui/Input';
import { createCustomer, updateCustomer, type CustomerPayload } from '@/services/customers';
import type { Customer } from '@/types';
import { ApiError } from '@/services/api';

const empty: CustomerPayload = { name: '', email: '', phone: '', address: '', notes: '' };

export function CustomerFormModal({
  open,
  onClose,
  customer,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  customer?: Customer | null;
  onSaved: (customer: Customer) => void;
}) {
  const [form, setForm] = useState<CustomerPayload>(empty);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setError('');
      setForm(
        customer
          ? {
              name: customer.name,
              email: customer.email ?? '',
              phone: customer.phone ?? '',
              address: customer.address ?? '',
              notes: customer.notes ?? '',
            }
          : empty,
      );
    }
  }, [open, customer]);

  const set =
    (key: keyof CustomerPayload) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSave = async () => {
    setError('');
    if (!form.name.trim()) {
      setError('Customer name is required');
      return;
    }
    setSaving(true);
    try {
      const saved = customer
        ? await updateCustomer(customer.id, form)
        : await createCustomer(form);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit customer' : 'Add customer'}
      footer={<ModalFooter onCancel={onClose} onConfirm={handleSave} loading={saving} />}
    >
      <div className="space-y-4">
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
        <Field label="Full name" required>
          <Input value={form.name} onChange={set('name')} required placeholder="e.g. Chinedu Okafor" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email">
            <Input type="email" value={form.email} onChange={set('email')} placeholder="Optional" />
          </Field>
          <Field label="Phone">
            <Input value={form.phone} onChange={set('phone')} placeholder="Optional" />
          </Field>
        </div>
        <Field label="Address">
          <Input value={form.address} onChange={set('address')} placeholder="Optional" />
        </Field>
        <Field label="Notes">
          <Textarea value={form.notes} onChange={set('notes')} placeholder="Optional notes" />
        </Field>
      </div>
    </Modal>
  );
}
