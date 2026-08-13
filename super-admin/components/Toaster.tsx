'use client';

/**
 * Lightweight toast system. Usage:
 *   import { toast } from '@/components/Toaster';
 *   toast.success('Saved'); toast.error('Failed'); toast.info('Heads up');
 *
 * The <Toaster /> component is mounted once in the root layout.
 */
import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '@/utils/cn';

type ToastTone = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

type Listener = (toast: Omit<ToastItem, 'id'>) => void;

let listener: Listener | null = null;
let counter = 0;

function publish(tone: ToastTone, message: string) {
  listener?.({ tone, message });
}

export const toast = {
  success: (message: string) => publish('success', message),
  error: (message: string) => publish('error', message),
  info: (message: string) => publish('info', message),
};

const toneStyles: Record<ToastTone, { icon: typeof Info; ring: string }> = {
  success: { icon: CheckCircle2, ring: 'border-success-200' },
  error: { icon: AlertCircle, ring: 'border-danger-200' },
  info: { icon: Info, ring: 'border-slate-200' },
};

export function Toaster() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    listener = (t) => {
      const id = ++counter;
      setToasts((prev) => [...prev, { id, ...t }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, 4500);
    };
    return () => {
      listener = null;
    };
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => {
        const { icon: Icon, ring } = toneStyles[t.tone];
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 shadow-pop',
              ring,
              'animate-[toastIn_0.15s_ease-out]',
            )}
            role="status"
          >
            <Icon
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                t.tone === 'success' && 'text-success-600',
                t.tone === 'error' && 'text-danger-600',
                t.tone === 'info' && 'text-brand-600',
              )}
              aria-hidden="true"
            />
            <p className="flex-1 text-sm text-slate-700">{t.message}</p>
            <button
              onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
              className="shrink-0 rounded p-0.5 text-slate-400 transition-colors hover:text-slate-600"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
