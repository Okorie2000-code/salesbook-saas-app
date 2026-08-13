'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import { createPlan, getPlans, setPlanActive, updatePlan, type PlanPayload } from '@/services/admin';
import type { SubscriptionPlan } from '@/types';
import { formatCurrency, labelStatus } from '@/utils/format';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  Input,
  Modal,
  PageHeader,
  Select,
  Spinner,
  Table,
  type Column,
} from '@/components/ui';
import { toast } from '@/components/Toaster';
import { ApiError } from '@/services/api';

const FEATURE_KEYS = [
  'MAX_USERS',
  'MAX_PRODUCTS',
  'MAX_CUSTOMERS',
  'MAX_MONTHLY_SALES',
  'ADVANCED_REPORTS',
  'EXPORT_DATA',
];

const FEATURE_NAMES: Record<string, string> = {
  MAX_USERS: 'Maximum users',
  MAX_PRODUCTS: 'Maximum products',
  MAX_CUSTOMERS: 'Maximum customers',
  MAX_MONTHLY_SALES: 'Maximum monthly sales',
  ADVANCED_REPORTS: 'Advanced reports',
  EXPORT_DATA: 'Data export',
};

interface FormState {
  code: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  limits: Record<string, number>;
  bools: Record<string, boolean>;
}

const emptyForm = (): FormState => ({
  code: '',
  name: '',
  description: '',
  price: 0,
  currency: 'NGN',
  billingInterval: 'MONTHLY',
  isActive: true,
  isDefault: false,
  sortOrder: 0,
  limits: { MAX_USERS: 1, MAX_PRODUCTS: 20, MAX_CUSTOMERS: 100, MAX_MONTHLY_SALES: 50 },
  bools: { ADVANCED_REPORTS: false, EXPORT_DATA: false },
});

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionPlan | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setPlans(await getPlans());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load plans');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (plan: SubscriptionPlan) => {
    setEditing(plan);
    const limits: Record<string, number> = {};
    const bools: Record<string, boolean> = {};
    for (const pf of plan.features ?? []) {
      if (pf.feature.kind === 'LIMIT') limits[pf.feature.key] = pf.limitValue ?? 0;
      else bools[pf.feature.key] = pf.boolValue ?? false;
    }
    setForm({
      code: plan.code,
      name: plan.name,
      description: plan.description ?? '',
      price: Number(plan.price),
      currency: plan.currency,
      billingInterval: plan.billingInterval,
      isActive: plan.isActive,
      isDefault: plan.isDefault,
      sortOrder: plan.sortOrder,
      limits,
      bools,
    });
    setModalOpen(true);
  };

  const handleToggle = async (plan: SubscriptionPlan) => {
    try {
      await setPlanActive(plan.id, !plan.isActive);
      toast.success(plan.isActive ? `${plan.name} deactivated` : `${plan.name} activated`);
      void load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to update plan');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload: PlanPayload = {
        code: form.code,
        name: form.name,
        description: form.description || undefined,
        price: form.price,
        currency: form.currency,
        billingInterval: form.billingInterval,
        isActive: form.isActive,
        isDefault: form.isDefault,
        sortOrder: form.sortOrder,
        features: FEATURE_KEYS.map((key) =>
          key.startsWith('MAX_')
            ? { featureKey: key, limitValue: form.limits[key] }
            : { featureKey: key, boolValue: form.bools[key] },
        ),
      };
      if (editing) await updatePlan(editing.id, payload);
      else await createPlan(payload);
      toast.success(editing ? 'Plan updated.' : 'Plan created.');
      setModalOpen(false);
      void load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to save plan');
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<SubscriptionPlan>[] = [
    {
      key: 'name',
      header: 'Plan',
      render: (p) => (
        <div>
          <p className="font-medium text-slate-800">
            {p.name} <span className="ml-1 text-xs text-slate-400">{p.code}</span>
          </p>
          {p.isDefault && <Badge tone="brand">Default</Badge>}
        </div>
      ),
    },
    {
      key: 'price',
      header: 'Price',
      render: (p) => (
        <span className="font-medium text-slate-900">
          {formatCurrency(p.price, p.currency)}{' '}
          <span className="text-xs text-slate-400">/ {labelStatus(p.billingInterval)}</span>
        </span>
      ),
    },
    {
      key: 'features',
      header: 'Key limits',
      render: (p) => {
        const limits = (p.features ?? []).filter((f) => f.feature.kind === 'LIMIT');
        return (
          <div className="max-w-[240px]">
            {limits.slice(0, 3).map((f) => (
              <p key={f.id} className="truncate text-xs text-slate-500">
                {f.feature.name}: {f.limitValue?.toLocaleString()}
              </p>
            ))}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => (p.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="neutral">Inactive</Badge>),
    },
    {
      key: 'actions',
      header: '',
      className: 'px-5 py-3 text-right',
      render: (p) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
            Edit
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleToggle(p)}>
            {p.isActive ? 'Deactivate' : 'Activate'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Plans"
        description="Pricing and limits stored in the database — changes apply instantly to all businesses."
        actions={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden="true" /> New plan
          </Button>
        }
      />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        {loading ? (
          <Spinner label="Loading plans…" />
        ) : plans.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-6 w-6" aria-hidden="true" />}
            title="No plans yet"
            description="Create your first subscription plan."
          />
        ) : (
          <Table columns={columns} rows={plans} />
        )}
      </Card>

      {/* Create / edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit plan — ${editing.name}` : 'New plan'}
        wide
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? 'Save changes' : 'Create plan'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Plan name" required>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Starter" />
            </Field>
            <Field label="Code" required hint="Uppercase, e.g. STARTER">
              <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="STARTER" />
            </Field>
          </div>
          <Field label="Description">
            <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional short description" />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Price (₦)" required>
              <Input type="number" min={0} value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))} />
            </Field>
            <Field label="Billing interval">
              <Select value={form.billingInterval} onChange={(e) => setForm((f) => ({ ...f, billingInterval: e.target.value as 'MONTHLY' | 'YEARLY' }))}>
                <option value="MONTHLY">Monthly</option>
                <option value="YEARLY">Yearly</option>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Sort order">
              <Input type="number" value={form.sortOrder} onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </Field>
            <Field label="Status">
              <Select value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === 'true' }))}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </Field>
          </div>

          <div className="rounded-lg border border-slate-200 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">Feature limits</p>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} />
                Default plan (new sign-ups)
              </label>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURE_KEYS.map((key) =>
                key.startsWith('MAX_') ? (
                  <div key={key} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-600">{FEATURE_NAMES[key]}</span>
                    <Input
                      type="number"
                      min={0}
                      className="w-24 py-1"
                      value={form.limits[key] ?? 0}
                      onChange={(e) => setForm((f) => ({ ...f, limits: { ...f.limits, [key]: Number(e.target.value) } }))}
                      aria-label={`${FEATURE_NAMES[key]} limit`}
                    />
                  </div>
                ) : (
                  <label key={key} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span className="text-sm text-slate-600">{FEATURE_NAMES[key]}</span>
                    <input
                      type="checkbox"
                      checked={form.bools[key] ?? false}
                      onChange={(e) => setForm((f) => ({ ...f, bools: { ...f.bools, [key]: e.target.checked } }))}
                    />
                  </label>
                ),
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
