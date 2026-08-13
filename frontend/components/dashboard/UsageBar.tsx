import { Check, X } from 'lucide-react';
import { cn } from '@/utils/cn';
import type { UsageItem } from '@/types';

/** Renders one limit (e.g. customers 450/500) with a progress bar. */
export function UsageBar({ item }: { item: UsageItem }) {
  if (item.kind === 'BOOLEAN') {
    return (
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
        <span className="text-sm text-slate-600">{item.name}</span>
        <span className={cn('inline-flex items-center gap-1 text-sm font-medium', item.enabled ? 'text-success-600' : 'text-slate-400')}>
          {item.enabled ? (
            <>
              <Check className="h-4 w-4" aria-hidden="true" /> Included
            </>
          ) : (
            <>
              <X className="h-4 w-4" aria-hidden="true" /> Not included
            </>
          )}
        </span>
      </div>
    );
  }

  const used = item.used ?? 0;
  const limit = item.limit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 90 ? 'bg-danger-500' : pct >= 70 ? 'bg-warning-500' : 'bg-brand-600';

  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-slate-600">{item.name}</span>
        <span className="font-medium text-slate-800">
          {used.toLocaleString()} <span className="text-slate-400">/ {limit.toLocaleString()}</span>
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-100"
        role="progressbar"
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-label={`${item.name}: ${used} of ${limit}`}
      >
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
