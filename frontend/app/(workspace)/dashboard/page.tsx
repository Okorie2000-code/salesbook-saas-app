'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Banknote, CalendarDays, Plus, Receipt, Users, Wallet } from 'lucide-react';
import { getDashboard } from '@/services/dashboard';
import type { DashboardSummary } from '@/types';
import { formatCurrency, formatDateTime, labelStatus } from '@/utils/format';
import { StatCard } from '@/components/dashboard/StatCard';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { UsageBar } from '@/components/dashboard/UsageBar';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';

export default function DashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getDashboard()
      .then(setData)
      .catch(() => setError('We couldn\u2019t load your dashboard. Please try again.'));
  }, []);

  if (error) {
    return (
      <Alert tone="danger" title="Something went wrong">
        {error}
      </Alert>
    );
  }

  if (!data) {
    return (
      <div className="space-y-6">
        <StatCardSkeleton />
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <TableSkeleton rows={5} columns={3} />
          </Card>
          <Card>
            <TableSkeleton rows={4} columns={2} />
          </Card>
        </div>
      </div>
    );
  }

  const paymentBadge = (status: string) =>
    status === 'PAID' ? (
      <Badge tone="success">{labelStatus(status)}</Badge>
    ) : status === 'PARTIAL' ? (
      <Badge tone="warning">{labelStatus(status)}</Badge>
    ) : (
      <Badge tone="danger">{labelStatus(status)}</Badge>
    );

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Today's sales"
          value={formatCurrency(data.today.revenue)}
          sub={`${data.today.count} sale${data.today.count === 1 ? '' : 's'} today`}
          icon={Banknote}
        />
        <StatCard
          label="This month"
          value={formatCurrency(data.month.revenue)}
          sub={`${data.month.count} sale${data.month.count === 1 ? '' : 's'} this month`}
          icon={CalendarDays}
        />
        <StatCard
          label="All-time revenue"
          value={formatCurrency(data.allTime.revenue)}
          sub={`${data.allTime.count} sale${data.allTime.count === 1 ? '' : 's'} recorded`}
          icon={Wallet}
        />
        <StatCard
          label="Customers & products"
          value={String(data.customers)}
          sub={`${data.products} product${data.products === 1 ? '' : 's'}`}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent sales */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Recent sales"
            subtitle="Latest transactions"
            action={
              <Link href="/sales">
                <Button variant="secondary" size="sm">
                  View all
                </Button>
              </Link>
            }
          />
          {data.recentSales.length === 0 ? (
            <EmptyState
              icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
              title="No sales yet"
              description="Record your first sale to see it here."
              action={
                <Link href="/sales">
                  <Button size="sm">
                    <Plus className="h-4 w-4" aria-hidden="true" /> New sale
                  </Button>
                </Link>
              }
            />
          ) : (
            <CardBody className="p-0">
              <div className="divide-y divide-slate-100">
                {data.recentSales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800">{sale.saleNumber}</p>
                      <p className="truncate text-xs text-slate-400">
                        {sale.customer?.name ?? 'Walk-in customer'} · {formatDateTime(sale.createdAt)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold text-slate-800">{formatCurrency(sale.total)}</p>
                      {paymentBadge(sale.paymentStatus)}
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          )}
        </Card>

        {/* Subscription usage */}
        <Card>
          <CardHeader
            title="Subscription usage"
            subtitle={data.usage.plan ? data.usage.plan.name : 'No active plan'}
            action={
              <Link href="/subscription" className="text-xs font-medium text-brand-600 hover:underline">
                Manage
              </Link>
            }
          />
          <CardBody className="space-y-4">
            {data.usage.features.length === 0 ? (
              <p className="text-sm text-slate-400">No usage data yet.</p>
            ) : (
              data.usage.features.map((item) => <UsageBar key={item.key} item={item} />)
            )}
            <div className="border-t border-slate-100 pt-3">
              <Link href="/billing">
                <Button variant="secondary" size="sm" className="w-full">
                  View plans & upgrade
                </Button>
              </Link>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
