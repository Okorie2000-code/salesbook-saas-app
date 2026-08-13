import Link from 'next/link';
import { BookOpen, CheckCircle2 } from 'lucide-react';

const SELLING_POINTS = [
  'Record sales, manage customers and track products in one place',
  'Understand your revenue with dashboards and reports',
  'Start free — upgrade when your business grows',
];

export function AuthShell({
  title,
  subtitle,
  children,
  accent = 'default',
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: 'default' | 'admin';
}) {
  return (
    <div className="flex min-h-screen">
      {/* Brand panel — desktop only */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-brand-900 p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-950" aria-hidden="true" />
        <div className="relative">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/20">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight">
              {accent === 'admin' ? 'Sales Book · Super Admin' : 'Sales Book'}
            </span>
          </Link>
        </div>
        <div className="relative">
          <h2 className="max-w-md text-2xl font-semibold leading-snug tracking-tight">
            {accent === 'admin'
              ? 'Run the whole platform from one console.'
              : 'The simple way to run your business sales.'}
          </h2>
          <ul className="mt-6 space-y-3">
            {SELLING_POINTS.map((point) => (
              <li key={point} className="flex items-start gap-2.5 text-sm text-brand-100">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" aria-hidden="true" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-brand-300">
          © {new Date().getFullYear()} Sales Book — SaaS for SMEs
        </p>
      </div>

      {/* Form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-4 py-10">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center justify-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white">
              <BookOpen className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-slate-900">Sales Book</span>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-card sm:p-8">
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{title}</h1>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
          <p className="mt-6 text-center text-xs text-slate-400 lg:hidden">
            © {new Date().getFullYear()} Sales Book — SaaS for SMEs
          </p>
        </div>
      </div>
    </div>
  );
}
