'use client';

import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Lock, Package, TrendingUp, Wallet } from 'lucide-react';
import { getSalesReport } from '@/services/dashboard';
import type { SalesReport } from '@/types';
import { formatCurrency, labelStatus } from '@/utils/format';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatCardSkeleton } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { ApiError } from '@/services/api';

const DAYS_AGO = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

export default function ReportsPage() {
  const [from, setFrom] = useState(DAYS_AGO(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<SalesReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (f: string, t: string) => {
    setLoading(true);
    setError('');
    try {
      setReport(await getSalesReport({ from: f, to: t }));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError('Reports are not included in your current plan. Upgrade your subscription to enable them.');
      } else {
        setError(err instanceof ApiError ? err.message : 'Unable to load the report');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(from, to);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => void load(from, to);

  if (loading) return <StatCardSkeleton count={4} />;

  if (error) {
    const isPlanError = error.includes('not included');
    return (
      <div className="space-y-5">
        <PageHeader title="Reports" description="Understand your revenue and sales performance." />
        <Card>
          <CardBody className="flex flex-col items-center py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              {isPlanError ? <Lock className="h-6 w-6" aria-hidden="true" /> : <BarChart3 className="h-6 w-6" aria-hidden="true" />}
            </span>
            <p className="mt-3 text-sm font-medium text-slate-700">
              {isPlanError ? 'Reports require an upgraded plan' : 'Something went wrong'}
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">{error}</p>
            {isPlanError && (
              <Button className="mt-5" size="sm" onClick={() => (window.location.href = '/billing')}>
                View plans & upgrade
              </Button>
            )}
            {!isPlanError && (
              <Button className="mt-5" variant="secondary" size="sm" onClick={handleRefresh}>
                Try again
              </Button>
            )}
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!report) return null;

  const maxDaily = Math.max(1, ...report.dailyTotals.map((d) => d.revenue));

  const summaryCards = [
    { label: 'Total sales', value: String(report.totalSales), icon: BarChart3 },
    { label: 'Revenue', value: formatCurrency(report.totalRevenue), icon: Wallet },
    { label: 'Average sale', value: formatCurrency(report.averageSale), icon: TrendingUp },
    { label: 'Discounts given', value: formatCurrency(report.totalDiscounts), icon: Package },
  ];

  return (
    <div className="space-y-5">
      <PageHeader title="Reports" description="Understand your revenue and sales performance." />

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">From</span>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">To</span>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </label>
            <Button variant="secondary" onClick={handleRefresh}>
              Apply
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-500">{card.label}</p>
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                <card.icon className="h-[18px] w-[18px]" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue by payment method */}
        <Card>
          <CardHeader title="Revenue by payment method" />
          {Object.keys(report.byMethod).length === 0 ? (
            <EmptyState icon={<Wallet className="h-6 w-6" aria-hidden="true" />} title="No payment data" />
          ) : (
            <CardBody className="space-y-3">
              {Object.entries(report.byMethod).map(([method, value]) => (
                <div key={method} className="flex items-center justify-between">
                  <Badge tone="neutral">{labelStatus(method)}</Badge>
                  <span className="text-sm text-slate-600">
                    {value.count} sale{value.count === 1 ? '' : 's'} ·{' '}
                    <strong className="text-slate-900">{formatCurrency(value.revenue)}</strong>
                  </span>
                </div>
              ))}
            </CardBody>
          )}
        </Card>

        {/* Top products */}
        <Card>
          <CardHeader title="Top products" subtitle="By quantity sold" />
          {report.topProducts.length === 0 ? (
            <EmptyState icon={<Package className="h-6 w-6" aria-hidden="true" />} title="No products sold" />
          ) : (
            <CardBody className="space-y-3">
              {report.topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between">
                  <span className="text-sm text-slate-700">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                      {i + 1}
                    </span>
                    {p.name}
                    <span className="ml-2 text-xs text-slate-400">×{p.quantity}</span>
                  </span>
                  <span className="text-sm font-medium text-slate-800">{formatCurrency(p.revenue)}</span>
                </div>
              ))}
            </CardBody>
          )}
        </Card>
      </div>

      {/* Daily revenue chart (pure CSS) */}
      <Card>
        <CardHeader title="Daily revenue" subtitle="Sales per day in the selected range" />
        <CardBody>
          {report.dailyTotals.length === 0 ? (
            <EmptyState icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />} title="No sales in this period" />
          ) : (
            <div className="flex h-48 items-end gap-1">
              {report.dailyTotals.map((d) => (
                <div
                  key={d.date}
                  className="group relative flex-1"
                  role="img"
                  aria-label={`${d.date}: ${formatCurrency(d.revenue)}`}
                >
                  <div
                    className="w-full rounded-t bg-brand-500 transition-colors group-hover:bg-brand-600"
                    style={{ height: `${Math.max(4, (d.revenue / maxDaily) * 100)}%` }}
                  />
                  <span className="pointer-events-none absolute -top-8 left-1/2 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] text-white group-hover:block">
                    {d.date}: {formatCurrency(d.revenue)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
