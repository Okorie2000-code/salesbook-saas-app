'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Sparkles } from 'lucide-react';
import { cancelSubscription, getMySubscription, getMyUsage, getPlans } from '@/services/subscriptions';
import type { Subscription, SubscriptionPlan, UsageItem } from '@/types';
import { formatDate, labelStatus } from '@/utils/format';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/Skeleton';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { toast } from '@/components/ui/Toaster';
import { UsageBar } from '@/components/dashboard/UsageBar';
import { PlanCard } from '@/components/subscription/PlanCard';
import { ApiError } from '@/services/api';

const statusTone = (status: Subscription['status']) =>
  status === 'ACTIVE' || status === 'TRIAL'
    ? 'success'
    : status === 'PAST_DUE' || status === 'CANCELLED'
      ? 'warning'
      : 'danger';

export default function SubscriptionPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [current, setCurrent] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<{ plan: SubscriptionPlan | null; features: UsageItem[] }>({
    plan: null,
    features: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, c, u] = await Promise.all([getPlans(), getMySubscription(), getMyUsage()]);
      setPlans(p);
      setCurrent(c);
      setUsage(u);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load subscription details');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCancel = async () => {
    setCancelling(true);
    setConfirmCancel(false);
    try {
      await cancelSubscription();
      toast.success('Your subscription will end at the end of the current period.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Unable to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) return <PageLoading label="Loading subscription…" />;
  if (error) return <Alert tone="danger" title="Unable to load subscription">{error}</Alert>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscription"
        description="Manage your plan, usage and billing cycle."
        actions={
          current && !current.cancelAtPeriodEnd ? (
            <Button variant="danger" size="md" onClick={() => setConfirmCancel(true)} loading={cancelling}>
              Cancel subscription
            </Button>
          ) : undefined
        }
      />

      {/* Current subscription */}
      {current && (
        <Card>
          <CardHeader
            title="Your subscription"
            subtitle={current.plan.name}
            action={
              current.cancelAtPeriodEnd ? <Badge tone="warning">Cancels at period end</Badge> : undefined
            }
          />
          <CardBody>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Status</p>
                <div className="mt-1">
                  <Badge tone={statusTone(current.status)}>{labelStatus(current.status)}</Badge>
                </div>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Period start</p>
                <p className="mt-0.5 font-medium text-slate-800">{formatDate(current.currentPeriodStart)}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Renews / ends</p>
                <p className="mt-0.5 font-medium text-slate-800">{formatDate(current.currentPeriodEnd)}</p>
              </div>
              <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <p className="text-xs text-slate-400">Trial ends</p>
                <p className="mt-0.5 font-medium text-slate-800">
                  {current.trialEndsAt ? formatDate(current.trialEndsAt) : '—'}
                </p>
              </div>
            </div>

            {current.history && current.history.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">History</p>
                <ul className="space-y-1.5">
                  {current.history.map((h) => (
                    <li key={h.id} className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2 text-slate-600">
                        <CalendarClock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                        {labelStatus(h.action)}
                      </span>
                      <span className="text-xs text-slate-400">{formatDate(h.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {/* Usage vs limits */}
      <Card>
        <CardHeader
          title="Usage & limits"
          subtitle={usage.plan ? `${usage.plan.name} plan` : 'No plan'}
        />
        <CardBody className="space-y-4">
          {usage.features.length === 0 ? (
            <p className="text-sm text-slate-400">No usage data yet.</p>
          ) : (
            usage.features.map((item) => <UsageBar key={item.key} item={item} />)
          )}
          <div className="border-t border-slate-100 pt-3">
            <Button variant="secondary" size="sm" onClick={() => (window.location.href = '/billing')}>
              <Sparkles className="h-4 w-4" aria-hidden="true" /> Upgrade to increase limits
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Available plans */}
      <div>
        <h2 className="mb-3 text-lg font-semibold tracking-tight text-slate-900">Available plans</h2>
        <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              current={current?.planId === plan.id}
              onChoose={
                current?.planId === plan.id
                  ? undefined
                  : () => {
                      window.location.href = `/billing?plan=${plan.id}`;
                    }
              }
            />
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={confirmCancel}
        title="Cancel subscription"
        description="You will keep access until the end of the current period. After that, your account moves to the Free plan."
        confirmText="Cancel subscription"
        danger
        onConfirm={handleCancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </div>
  );
}
