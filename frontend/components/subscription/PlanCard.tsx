'use client';

import { Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { cn } from '@/utils/cn';
import type { SubscriptionPlan } from '@/types';
import { formatCurrency } from '@/utils/format';

export function PlanCard({
  plan,
  current,
  onChoose,
  loading,
}: {
  plan: SubscriptionPlan;
  current?: boolean;
  onChoose?: () => void;
  loading?: boolean;
}) {
  const limitFeatures = (plan.features ?? []).filter((f) => f.feature.kind === 'LIMIT');
  const booleanFeatures = (plan.features ?? []).filter((f) => f.feature.kind === 'BOOLEAN');

  return (
    <div
      className={cn(
        'relative flex flex-col rounded-xl border bg-white p-5 shadow-card transition-shadow',
        current ? 'border-brand-600 ring-1 ring-brand-600' : 'border-slate-200 hover:shadow-pop',
      )}
    >
      {current && (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2">
          <Badge tone="brand" className="gap-1">
            <Sparkles className="h-3 w-3" aria-hidden="true" /> Current plan
          </Badge>
        </span>
      )}

      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{plan.name}</h3>
      </div>
      <p className="mt-2 flex items-baseline gap-1">
        <span className="text-2xl font-semibold tracking-tight text-slate-900">
          {formatCurrency(plan.price)}
        </span>
        <span className="text-sm text-slate-400">/ {plan.billingInterval.toLowerCase()}</span>
      </p>
      {plan.description && <p className="mt-1 text-sm text-slate-500">{plan.description}</p>}

      <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-600">
        {limitFeatures.map((f) => (
          <li key={f.id} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            <span>
              {f.feature.name}:{' '}
              <span className="font-medium text-slate-800">
                {f.limitValue === null || f.limitValue === undefined || f.limitValue >= 100000
                  ? 'Unlimited'
                  : f.limitValue.toLocaleString()}
              </span>
            </span>
          </li>
        ))}
        {booleanFeatures.map((f) => (
          <li key={f.id} className="flex items-start gap-2">
            {f.boolValue ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
            ) : (
              <X className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" aria-hidden="true" />
            )}
            {f.feature.name}
          </li>
        ))}
      </ul>

      {onChoose && (
        <Button
          className="mt-5 w-full"
          variant={current ? 'secondary' : 'primary'}
          onClick={onChoose}
          disabled={current}
          loading={loading}
        >
          {current ? 'Current plan' : 'Choose this plan'}
        </Button>
      )}
    </div>
  );
}
