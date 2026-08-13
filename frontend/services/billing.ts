import { api } from './api';
import type { PaymentTransaction } from '@/types';

export interface CheckoutPayload {
  planId: string;
  provider: 'PAYSTACK' | 'FLUTTERWAVE';
  billingInterval?: 'MONTHLY' | 'YEARLY';
}

export interface CheckoutResponse {
  reference: string | null;
  authorizationUrl: string | null;
  plan: { id: string; name: string; price: number };
  activated: boolean;
}

/** Create a payment transaction and return the provider redirect URL. */
export function createCheckout(payload: CheckoutPayload): Promise<CheckoutResponse> {
  return api('/billing/checkout', { method: 'POST', body: payload });
}

export function getTransactions(): Promise<PaymentTransaction[]> {
  return api('/billing/transactions');
}

export interface VerifyResponse {
  transaction: PaymentTransaction;
  activated: boolean;
  alreadyActivated?: boolean;
  reason?: string;
}

export function verifyTransaction(reference: string): Promise<VerifyResponse> {
  return api(`/billing/verify?reference=${encodeURIComponent(reference)}`);
}
