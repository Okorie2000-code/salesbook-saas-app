'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  CheckCircle2,
  CreditCard,
  Receipt,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { getDashboard } from '@/services/admin';
import type { AdminDashboard } from '@/types';
import { formatCurrency, formatDateTime, labelStatus } from '@/utils/format';
import { Badge, Card, CardBody, CardHeader, EmptyState, StatCardSkeleton } from '@/components/ui';
import { PageHeader } from '@/components/ui';
import { Alert } from '@/components/ui';

export default function AdminDashboardPage() {
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError('Unable to load platform statistics.'));
  }, []);

  if (error) return <Alert tone="danger" title="Something went wrong">{error}</Alert>;
  if (!data) return <StatCardSkeleton count={6} />;

  const statusTone = (status: string) =>
    status === 'ACTIVE' ? 'success' : status === 'SUSPENDED' ? 'warning' : 'danger';

  const paymentTone = (status: string) =>
    status === 'SUCCESS' ? 'success' : status === 'FAILED' ? 'danger' : 'warning';

  const statCards = [
    {
      label: 'Total businesses',
      value: String(data.businesses.total),
      sub: `${data.businesses.newThisMonth} new this month`,
      icon: Building2,
    },
    {
      label: 'Active businesses',
      value: String(data.businesses.active),
      sub: `${data.businesses.suspended} suspended`,
      icon: CheckCircle2,
    },
    {
      label: 'Total users',
      value: String(data.users),
      sub: 'non-admin accounts',
      icon: Users,
    },
    {
      label: 'Active subscriptions',
      value: String(data.subscriptions.active),
      sub: `${data.subscriptions.cancelled} cancelled`,
      icon: CreditCard,
    },
    {
      label: 'Revenue',
      value: formatCurrency(data.payments.revenue),
      sub: 'from successful payments',
      icon: Wallet,
    },
    {
      label: 'Failed payments',
      value: String(data.payments.failed),
      sub: `${data.payments.total} total · ${data.payments.pending} pending`,
      icon: XCircle,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform overview"
        description="A snapshot of every business, subscription and payment on the platform."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <div key={s.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{s.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <s.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-slate-400">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subscription distribution */}
        <Card>
          <CardHeader title="Subscription distribution" subtitle="Active plans across businesses" />
          {data.subscriptions.distribution.length === 0 ? (
            <EmptyState icon={<CreditCard className="h-6 w-6" aria-hidden="true" />} title="No subscription data" />
          ) : (
            <CardBody className="space-y-3">
              {data.subscriptions.distribution.map((d) => (
                <div key={d.plan} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">{d.plan}</span>
                  <Badge tone="brand">
                    {d.count} business{d.count === 1 ? '' : 'es'}
                  </Badge>
                </div>
              ))}
            </CardBody>
          )}
        </Card>

        {/* Recent businesses */}
        <Card>
          <CardHeader
            title="Recent businesses"
            subtitle="Newest sign-ups"
            action={
              <Link href="/businesses" className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
          />
          {data.recentBusinesses.length === 0 ? (
            <EmptyState icon={<Building2 className="h-6 w-6" aria-hidden="true" />} title="No businesses yet" />
          ) : (
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100">
                {data.recentBusinesses.map((b) => (
                  <div key={b.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">{b.name}</p>
                      <p className="text-xs text-slate-400">
                        {b.subscriptions?.[0]?.plan?.name ?? 'No plan'} · {formatDateTime(b.createdAt)}
                      </p>
                    </div>
                    <Badge tone={statusTone(b.status)}>{labelStatus(b.status)}</Badge>
                  </div>
                ))}
              </div>
            </CardBody>
          )}
        </Card>

        {/* Recent payments */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent payments"
            action={
              <Link href="/payments" className="text-xs font-medium text-brand-600 hover:underline">
                View all
              </Link>
            }
          />
          {data.recentPayments.length === 0 ? (
            <EmptyState icon={<Receipt className="h-6 w-6" aria-hidden="true" />} title="No payments yet" />
          ) : (
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100">
                {data.recentPayments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {p.business?.name ?? 'Unknown business'}
                      </p>
                      <p className="truncate text-xs text-slate-400">
                        {p.reference} · {p.plan?.name ?? 'Plan payment'} · {p.provider}
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
    </div>
  );
}
