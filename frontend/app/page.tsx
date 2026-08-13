import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Package,
  Receipt,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';

const FEATURES = [
  {
    icon: Receipt,
    title: 'Record sales in seconds',
    description: 'Add products, quantities and discounts to a sale and get totals automatically.',
  },
  {
    icon: Users,
    title: 'Know your customers',
    description: 'Keep a customer directory with purchase history and total spending.',
  },
  {
    icon: Package,
    title: 'Track your products',
    description: 'Catalog products and services with prices and stock levels.',
  },
  {
    icon: BarChart3,
    title: 'See how you\u2019re doing',
    description: 'Dashboards and reports for today, this month and all-time revenue.',
  },
  {
    icon: ShieldCheck,
    title: 'Bring your team',
    description: 'Invite staff with roles so everyone works in the same workspace — securely.',
  },
  {
    icon: Wallet,
    title: 'Simple, flexible plans',
    description: 'Start free, then pick a plan that fits — upgrade or downgrade anytime.',
  },
];

const PLANS = [
  {
    name: 'Free',
    price: '₦0',
    period: 'forever',
    features: ['1 user', '20 products', '100 customers', '50 monthly sales'],
    highlight: false,
  },
  {
    name: 'Starter',
    price: '₦5,000',
    period: '/month',
    features: ['3 users', '100 products', '500 customers', '1,000 monthly sales', 'Advanced reports'],
    highlight: false,
  },
  {
    name: 'Business',
    price: '₦15,000',
    period: '/month',
    features: ['10 users', 'Unlimited products', '5,000 customers', '10,000 monthly sales', 'Advanced reports', 'Data export'],
    highlight: true,
  },
  {
    name: 'Pro',
    price: '₦50,000',
    period: '/month',
    features: ['Unlimited users', 'Unlimited everything', 'Priority support', 'Data export'],
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <BookOpen className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="text-base font-semibold tracking-tight text-slate-900">Sales Book</span>
          </div>
          <nav className="flex items-center gap-2" aria-label="Main">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-700"
            >
              Get started
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-20 text-center sm:pt-24">
        <span className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-medium text-brand-700">
          Built for small and medium businesses
        </span>
        <h1 className="mx-auto mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Run your business sales,{' '}
          <span className="text-brand-600">the simple way</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-500">
          Sales Book helps SMEs record sales, manage customers and products, and understand
          their revenue — all in one place.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-3 text-base font-medium text-white shadow-card transition-colors hover:bg-brand-700 sm:w-auto"
          >
            Start free trial
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <Link
            href="#features"
            className="inline-flex w-full items-center justify-center rounded-lg border border-slate-300 bg-white px-6 py-3 text-base font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto"
          >
            See features
          </Link>
        </div>
        <p className="mt-4 text-xs text-slate-400">14-day free trial · No credit card required</p>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-slate-100 bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-5">
          <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Everything your business needs
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-sm text-slate-500">
            A complete sales toolkit that grows with you — no complicated setup.
          </p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-slate-200 bg-white p-6 shadow-card transition-shadow hover:shadow-pop"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <f.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{f.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Simple pricing that grows with you
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500">
          Start free, upgrade when you need more. Plans are managed by your platform admin.
        </p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-xl border bg-white p-6 ${
                plan.highlight ? 'border-brand-600 shadow-pop ring-1 ring-brand-600' : 'border-slate-200 shadow-card'
              }`}
            >
              {plan.highlight && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-2.5 py-0.5 text-[11px] font-medium text-white">
                  Most popular
                </span>
              )}
              <h3 className="font-semibold text-slate-900">{plan.name}</h3>
              <p className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-semibold tracking-tight text-slate-900">{plan.price}</span>
                <span className="text-sm text-slate-400">{plan.period}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-600">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={`mt-6 inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  plan.highlight
                    ? 'bg-brand-600 text-white hover:bg-brand-700'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                Choose {plan.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        © {new Date().getFullYear()} Sales Book — Multi-tenant SaaS for SMEs
      </footer>
    </div>
  );
}
