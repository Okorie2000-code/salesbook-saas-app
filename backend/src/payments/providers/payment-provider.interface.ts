/**
 * Payment provider abstraction.
 *
 * Every provider (Paystack, Flutterwave, and any future one) implements this
 * interface. The billing module only talks to this interface — adding a new
 * provider means writing one class and registering it, never touching the
 * core billing logic.
 */
export interface InitiatePaymentParams {
  /** Amount in the major currency unit (e.g. ₦5,000 → 5000) */
  amount: number;
  email: string;
  /** Unique reference we generate and store on the transaction */
  reference: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentVerificationResult {
  /** Whether the provider confirmed the payment succeeded */
  status: 'SUCCESS' | 'FAILED';
  /** Amount in the major currency unit, if the provider returned it */
  amount?: number;
  currency?: string;
  /** The raw provider response, stored for the audit trail */
  raw?: unknown;
}

export interface PaymentProvider {
  /** Provider code used in the database and API, e.g. "paystack" */
  readonly code: string;

  /** Creates a payment session and returns the hosted checkout URL. */
  initializePayment(params: InitiatePaymentParams): Promise<{ authorizationUrl: string }>;

  /** Asks the provider whether a reference actually succeeded. */
  verifyPayment(reference: string): Promise<PaymentVerificationResult>;

  /**
   * Verifies the signature on an incoming webhook. `headers` are the raw
   * request headers, `rawBody` the exact bytes of the request body.
   */
  verifyWebhookSignature(headers: Record<string, string | string[] | undefined>, rawBody: string): boolean;
}
