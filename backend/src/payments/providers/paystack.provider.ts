import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  InitiatePaymentParams,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment-provider.interface';

const PAYSTACK_API = 'https://api.paystack.co';

/**
 * Paystack provider — https://paystack.com/docs
 *
 * Uses Paystack's REST API directly (no SDK) so there is nothing extra to
 * install. Amounts are converted to kobo (Paystack's minor unit) on the way
 * out and back to naira on verification.
 */
@Injectable()
export class PaystackProvider implements PaymentProvider {
  readonly code = 'paystack';
  private readonly logger = new Logger(PaystackProvider.name);

  constructor(private readonly config: ConfigService) {}

  private secretKey(): string {
    return this.config.get<string>('PAYSTACK_SECRET_KEY') ?? '';
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    const res = await fetch(`${PAYSTACK_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey()}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status === false) {
      this.logger.error(`Paystack error ${res.status}: ${JSON.stringify(json)}`);
      throw new ServiceUnavailableException('Payment provider request failed');
    }
    return json;
  }

  async initializePayment(params: InitiatePaymentParams) {
    const { data } = await this.request('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: Math.round(params.amount * 100), // naira → kobo
        email: params.email,
        reference: params.reference,
        callback_url: this.config.get('PAYSTACK_CALLBACK_URL'),
        metadata: params.metadata,
      }),
    });
    return { authorizationUrl: data.authorization_url as string };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    try {
      const { data } = await this.request(`/transaction/verify/${encodeURIComponent(reference)}`);
      const success = data.status === 'success';
      return {
        status: success ? 'SUCCESS' : 'FAILED',
        amount: data.amount !== undefined ? data.amount / 100 : undefined, // kobo → naira
        currency: data.currency,
        raw: data,
      };
    } catch (error) {
      this.logger.error(`Paystack verification failed: ${error}`);
      return { status: 'FAILED', raw: { error: String(error) } };
    }
  }

  /**
   * Paystack signs webhooks with an HMAC-SHA512 of the raw body using the
   * secret key, sent in the `x-paystack-signature` header.
   */
  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean {
    const signature = this.header(headers, 'x-paystack-signature');
    if (!signature) return false;
    const expected = createHmac('sha512', this.secretKey()).update(rawBody).digest('hex');
    return signature === expected;
  }

  private header(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}
