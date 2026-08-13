'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { ArrowLeft, MailCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { forgotPassword } from '@/services/auth';

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center rounded-xl bg-success-50 px-4 py-8 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-success-100 text-success-600">
          <MailCheck className="h-6 w-6" aria-hidden="true" />
        </span>
        <p className="mt-3 text-sm text-success-800">
          If an account exists for <strong>{email}</strong>, a password reset link has been sent.
          Check your inbox (and spam folder).
        </p>
        <Link href="/login" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-success-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back to login
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {error && <Alert tone="danger" title="Something went wrong">{error}</Alert>}
      <Field label="Email address" required>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@business.com"
          required
          autoComplete="email"
          autoFocus
        />
      </Field>
      <Button type="submit" className="w-full" loading={submitting}>
        Send reset link
      </Button>
      <p className="text-center text-sm text-slate-500">
        <Link href="/login" className="inline-flex items-center gap-1 font-medium text-brand-600 hover:text-brand-700">
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /> Back to login
        </Link>
      </p>
    </form>
  );
}
