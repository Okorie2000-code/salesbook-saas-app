'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Building2, CreditCard, Receipt, Users } from 'lucide-react';
import { getBusiness } from '@/services/admin';
import type { AdminBusinessDetail } from '@/types';
import { formatCurrency, formatDate, formatDateTime, labelStatus } from '@/utils/format';
import {
  Avatar,
  Badge,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  PageLoading,
} from '@/components/ui';
import { Alert } from '@/components/ui';

export default function BusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const [business, setBusiness] = useState<AdminBusinessDetail | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setBusiness(await getBusiness(params.id));
    } catch {
      setError('Business not found');
    }
  }, [params.id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) return <Alert tone="danger" title="Business not found">{error}</Alert>;
  if (!business) return <PageLoading label="Loading business…" />;

  const statusTone = (status: string) =>
    status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'warning' : 'danger';

  const paymentTone = (status: string) =>
    status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'warning';

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/businesses"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Businesses
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{business.name}</h1>
          <Badge tone={statusTone(business.status)}>{labelStatus(business.status)}</Badge>
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {business.email ?? '—'} · {business.phone ?? '—'} · joined {formatDate(business.createdAt)}
        </p>
      </div>

      {/* Counts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Customers', value: business._count.customers, icon: Users },
          { label: 'Products', value: business._count.products, icon: Building2 },
          { label: 'Sales', value: business._count.sales, icon: Receipt },
          { label: 'Team members', value: business.users.length, icon: Users },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <s.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Team */}
        <Card>
          <CardHeader title="Team members" subtitle={`${business.users.length} user${business.users.length === 1 ? '' : 's'}`} />
          {business.users.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" aria-hidden="true" />} title="No users" />
          ) : (
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100">
                {business.users.map((u) => (
                  <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar name={`${u.firstName} ${u.lastName}`} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {u.firstName} {u.lastName}
                        </p>
                        <p className="truncate text-xs text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {!u.isActive && <Badge tone="danger">Disabled</Badge>}
                      <Badge tone="brand">{labelStatus(u.role)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          )}
        </Card>

        {/* Subscription */}
        <Card>
          <CardHeader title="Subscription" />
          {business.subscriptions.length === 0 ? (
            <EmptyState icon={<CreditCard className="h-6 w-6" aria-hidden="true" />} title="No subscription" />
          ) : (
            <CardBody className="space-y-4">
              {business.subscriptions.map((sub) => (
                <div key={sub.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-slate-800">{sub.plan.name}</p>
                    <Badge
                      tone={
                        sub.status === 'ACTIVE' || sub.status === 'TRIAL'
                          ? 'success'
                          : sub.status === 'PAST_DUE'
                            ? 'warning'
                            : 'danger'
                      }
                    >
                      {labelStatus(sub.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Period ends {formatDate(sub.currentPeriodEnd)}</p>
                  {sub.history.length > 0 && (
                    <ul className="mt-3 space-y-1 border-t border-slate-100 pt-3">
                      {sub.history.map((h) => (
                        <li key={h.id} className="flex justify-between text-xs text-slate-500">
                          <span>{labelStatus(h.action)}</span>
                          <span>{formatDate(h.createdAt)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </CardBody>
          )}
        </Card>
      </div>

      {/* Payments */}
      <Card>
        <CardHeader title="Payment history" subtitle={`${business.payments.length} transaction${business.payments.length === 1 ? '' : 's'}`} />
        {business.payments.length === 0 ? (
          <EmptyState icon={<Receipt className="h-6 w-6" aria-hidden="true" />} title="No payments" />
        ) : (
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100">
              {business.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm font-medium text-slate-800">{p.reference}</p>
                    <p className="text-xs text-slate-400">
                      {p.provider} · {formatDateTime(p.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(p.amount)}</p>
                    <Badge tone={paymentTone(p.status)}>{labelStatus(p.status)}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        )}
      </Card>
    </div>
  );
}
