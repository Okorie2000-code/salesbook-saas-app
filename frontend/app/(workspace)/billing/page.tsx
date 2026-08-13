'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { CreditCard, Receipt } from 'lucide-react';
import { createCheckout, getTransactions, verifyTransaction } from '@/services/billing';
import { getPlans } from '@/services/subscriptions';
import type { PaymentTransaction, SubscriptionPlan } from '@/types';
import { formatCurrency, formatDateTime, labelStatus } from '@/utils/format';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { TableSkeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageHeader } from '@/components/ui/PageHeader';
import { Alert } from '@/components/ui/Alert';
import { PlanCard } from '@/components/subscription/PlanCard';
import { ApiError } from '@/services/api';
import { cn } from '@/utils/cn';

function BillingContent() {
  const params = useSearchParams();
  const preselected = params.get('plan');

  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(preselected);
  const [provider, setProvider] = useState<'PAYSTACK' | 'FLUTTERWAVE'>('PAYSTACK');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [p, t] = await Promise.all([getPlans(), getTransactions()]);
      setPlans(p);
      setTransactions(t);
      // If a plan was preselected but doesn't exist, fall back to the first plan
      if (preselected && !p.some((plan) => plan.id === preselected)) {
        setSelectedPlan(p[0]?.id ?? null);
      } else if (!selectedPlan && p.length > 0) {
        setSelectedPlan(p[0].id);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to load billing details');
    } finally {
      setLoading(false);
    }
  }, [preselected, selectedPlan]);

  useEffect(() => {
    void load();
  }, [load]);

  // If we came back from the payment provider with a reference, verify it
  useEffect(() => {
    const reference = params.get('reference');
    if (reference) {
      setNotice('Verifying your payment…');
      verifyTransaction(reference)
        .then(() => setNotice('Payment confirmed. Your subscription has been updated.'))
        .catch((err) => setError(err instanceof ApiError ? err.message : 'Unable to verify payment'))
        .finally(() => void load());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const handleCheckout = async () => {
    if (!selectedPlan) return;
    setCheckingOut(true);
    setError('');
    setNotice('');
    try {
      const result = await createCheckout({ planId: selectedPlan, provider });
      if (result.activated) {
        setNotice('This plan is free — it has been activated immediately.');
        void load();
      } else if (result.authorizationUrl) {
        // Redirect the user to the provider's hosted payment page
        window.location.href = result.authorizationUrl;
      } else {
        setError('No payment URL was returned. Please try again.');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to start checkout');
    } finally {
      setCheckingOut(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-64 rounded-xl border border-slate-200 bg-white shadow-card" />
          ))}
        </div>
        <Card>
          <TableSkeleton rows={4} columns={3} />
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing"
        description="Choose a plan and manage your subscription payments."
      />

      {notice && <Alert tone="success">{notice}</Alert>}
      {error && (
        <Alert tone="danger" title="Something went wrong" onDismiss={() => setError('')}>
          {error}
        </Alert>
      )}

      {/* Choose a plan */}
      <div>
        <h2 className="mb-1 text-lg font-semibold tracking-tight text-slate-900">Choose a plan</h2>
        <p className="mb-4 text-sm text-slate-500">
          Pick a plan, then pay securely with Paystack or Flutterwave. Your subscription activates after the payment is verified.
        </p>
        <div className="grid gap-4 pt-2 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onChoose={() => setSelectedPlan(plan.id)}
            />
          ))}
        </div>
      </div>

      {/* Payment details */}
      <Card>
        <CardHeader title="Payment details" subtitle="Your subscription is only activated after the payment is verified by the provider" />
        <CardBody>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Selected plan</p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {plans.find((p) => p.id === selectedPlan)?.name ?? 'Select a plan above'}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-slate-700">Payment provider</p>
              <div className="flex gap-3">
                {(['PAYSTACK', 'FLUTTERWAVE'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setProvider(p)}
                    aria-pressed={provider === p}
                    className={cn(
                      'rounded-lg border px-4 py-2 text-sm font-medium transition-colors',
                      provider === p
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50',
                    )}
                  >
                    {p === 'PAYSTACK' ? 'Paystack' : 'Flutterwave'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5">
            <Button onClick={handleCheckout} loading={checkingOut} disabled={!selectedPlan}>
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              {provider === 'PAYSTACK' ? 'Pay with Paystack' : 'Pay with Flutterwave'}
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Transaction history */}
      <Card>
        <CardHeader title="Payment history" subtitle="All your subscription payments" />
        {transactions.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-6 w-6" aria-hidden="true" />}
            title="No payments yet"
            description="Your subscription payments will appear here."
          />
        ) : (
          <CardBody className="p-0">
            <div className="divide-y divide-slate-100">
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{t.reference}</p>
                    <p className="text-xs text-slate-400">
                      {t.plan?.name ?? 'Plan payment'} · {t.provider} · {formatDateTime(t.createdAt)}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-sm font-semibold text-slate-800">{formatCurrency(t.amount)}</p>
                    <Badge
                      tone={
                        t.status === 'SUCCESS' ? 'success' : t.status === 'FAILED' ? 'danger' : 'warning'
                      }
                    >
                      {labelStatus(t.status)}
                    </Badge>
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

export default function BillingPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" />}>
      <BillingContent />
    </Suspense>
  );
}
