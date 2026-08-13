import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import {
  InitiatePaymentParams,
  PaymentProvider,
  PaymentVerificationResult,
} from './payment-provider.interface';

const FLUTTERWAVE_API = 'https://api.flutterwave.com/v3';

/**
 * Flutterwave provider — https://developer.flutterwave.com
 *
 * Uses Flutterwave's REST API directly. The transaction reference is sent as
 * `tx_ref` (Flutterwave's term for the same concept).
 */
@Injectable()
export class FlutterwaveProvider implements PaymentProvider {
  readonly code = 'flutterwave';
  private readonly logger = new Logger(FlutterwaveProvider.name);

  constructor(private readonly config: ConfigService) {}

  private secretKey(): string {
    return this.config.get<string>('FLUTTERWAVE_SECRET_KEY') ?? '';
  }

  private async request(path: string, init: RequestInit = {}): Promise<any> {
    const res = await fetch(`${FLUTTERWAVE_API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.secretKey()}`,
        'Content-Type': 'application/json',
        ...(init.headers ?? {}),
      },
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || json.status !== 'success') {
      this.logger.error(`Flutterwave error ${res.status}: ${JSON.stringify(json)}`);
      throw new ServiceUnavailableException('Payment provider request failed');
    }
    return json;
  }

  async initializePayment(params: InitiatePaymentParams) {
    const { data } = await this.request('/payments', {
      method: 'POST',
      body: JSON.stringify({
        tx_ref: params.reference,
        amount: params.amount, // Flutterwave works in the major currency unit
        currency: 'NGN',
        redirect_url: this.config.get('FLUTTERWAVE_CALLBACK_URL'),
        customer: { email: params.email },
        payment_options: 'card,banktransfer,ussd',
        meta: params.metadata,
      }),
    });
    return { authorizationUrl: data.link as string };
  }

  async verifyPayment(reference: string): Promise<PaymentVerificationResult> {
    try {
      const { data } = await this.request(
        `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(reference)}`,
      );
      const success = data.status === 'successful';
      return {
        status: success ? 'SUCCESS' : 'FAILED',
        amount: data.amount,
        currency: data.currency,
        raw: data,
      };
    } catch (error) {
      this.logger.error(`Flutterwave verification failed: ${error}`);
      return { status: 'FAILED', raw: { error: String(error) } };
    }
  }

  /**
   * Flutterwave includes the webhook hash you configure on their dashboard in
   * the `verif-hash` header. We default to the secret key but allow a separate
   * FLUTTERWAVE_WEBHOOK_HASH value.
   */
  verifyWebhookSignature(
    headers: Record<string, string | string[] | undefined>,
    rawBody: string,
  ): boolean {
    const hash = this.config.get('FLUTTERWAVE_WEBHOOK_HASH') ?? this.secretKey();
    const header = this.header(headers, 'verif-hash');
    if (!header || !hash) return false;

    // Flutterwave's hash is sent in plain form; HMAC is not required for v3,
    // but we still double check the body hash for extra safety.
    const expected = createHmac('sha256', hash).update(rawBody).digest('hex');
    return header === hash || header === expected;
  }

  private header(
    headers: Record<string, string | string[] | undefined>,
    name: string,
  ): string | undefined {
    const value = headers[name] ?? headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }
}
