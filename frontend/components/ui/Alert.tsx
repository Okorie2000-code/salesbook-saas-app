'use client';

import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';

type Tone = 'info' | 'success' | 'warning' | 'danger';

const toneConfig: Record<Tone, { icon: typeof Info; classes: string }> = {
  info: { icon: Info, classes: 'bg-brand-50 text-brand-800 ring-brand-200' },
  success: { icon: CheckCircle2, classes: 'bg-success-50 text-success-800 ring-success-200' },
  warning: { icon: AlertTriangle, classes: 'bg-warning-50 text-warning-800 ring-warning-200' },
  danger: { icon: AlertCircle, classes: 'bg-danger-50 text-danger-800 ring-danger-200' },
};

export function Alert({
  tone = 'info',
  title,
  children,
  onDismiss,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}) {
  const { icon: Icon, classes } = toneConfig[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex items-start gap-3 rounded-lg px-4 py-3 text-sm ring-1 ring-inset', classes, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn('text-sm opacity-90', title && 'mt-0.5')}>{children}</div>}
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 opacity-60 transition-opacity hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
