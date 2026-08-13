import { Injectable, NotFoundException } from '@nestjs/common';
import { FlutterwaveProvider } from './providers/flutterwave.provider';
import { PaymentProvider } from './providers/payment-provider.interface';
import { PaystackProvider } from './providers/paystack.provider';

/**
 * Registry of available payment providers. The billing module asks for a
 * provider by code and receives the right implementation — to add a new
 * provider, implement the interface and register it here.
 */
@Injectable()
export class PaymentsService {
  private readonly providers = new Map<string, PaymentProvider>();

  constructor(paystack: PaystackProvider, flutterwave: FlutterwaveProvider) {
    this.register(paystack);
    this.register(flutterwave);
  }

  private register(provider: PaymentProvider) {
    this.providers.set(provider.code, provider);
  }

  /** Returns a provider implementation or throws a clear 404. */
  getProvider(code: string): PaymentProvider {
    const provider = this.providers.get(code);
    if (!provider) throw new NotFoundException(`Unsupported payment provider: ${code}`);
    return provider;
  }

  /** Codes of all supported providers, e.g. ["paystack", "flutterwave"]. */
  supportedProviders(): string[] {
    return [...this.providers.keys()];
  }
}
