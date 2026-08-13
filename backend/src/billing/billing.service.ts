import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, TransactionStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { AuthUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { CheckoutDto } from './dto/checkout.dto';

/**
 * The billing flow:
 *   1. checkout()  → validates plan + provider, stores a PENDING transaction,
 *                    creates the payment session with the provider
 *   2. the user pays on the provider's hosted page
 *   3. the provider redirects back (frontend calls verify()) OR sends a
 *      webhook — both call verifyPayment() below
 *   4. verifyPayment() asks the PROVIDER for the truth (never trusts the
 *      frontend), then activates the subscription and records the transaction
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly subscriptions: SubscriptionsService,
    private readonly audit: AuditService,
  ) {}

  /** Payment history for a business (billing page). */
  async listTransactions(businessId: string) {
    return this.prisma.paymentTransaction.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      include: { plan: { select: { name: true, code: true } } },
    });
  }

  /** Step 1 — create the payment session for a plan + provider. */
  async checkout(businessId: string, user: AuthUser, dto: CheckoutDto) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: { id: dto.planId, isActive: true },
    });
    if (!plan) throw new BadRequestException('That plan is not available');

    const providerDb = await this.prisma.paymentProvider.findUnique({
      where: { code: dto.provider },
    });
    if (!providerDb || !providerDb.isActive) {
      throw new BadRequestException('That payment provider is not available');
    }

    const price = Number(plan.price);

    // Free plans are activated immediately — nothing to pay
    if (price <= 0) {
      await this.subscriptions.activatePlan(businessId, plan.id);
      return { reference: null, authorizationUrl: null, plan, activated: true };
    }

    const reference = `SB-${randomBytes(16).toString('hex')}`;
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        businessId,
        planId: plan.id,
        amount: price,
        currency: plan.currency,
        provider: providerDb.code,
        reference,
      },
    });

    const provider = this.payments.getProvider(providerDb.code);
    const { authorizationUrl } = await provider.initializePayment({
      amount: price,
      email: user.email,
      reference,
      metadata: { businessId, planId: plan.id, planCode: plan.code },
    });

    await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: { metadata: { authorizationUrl } },
    });

    return { reference, authorizationUrl, plan, activated: false };
  }

  /** Steps 3–4 — verify with the provider and activate the subscription. */
  async verifyPayment(reference: string, ipAddress?: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { reference },
      include: { plan: true },
    });
    if (!transaction) throw new NotFoundException('Transaction not found');

    // Idempotent: already-confirmed transactions are returned as-is
    if (transaction.status === TransactionStatus.SUCCESS) {
      return { transaction, activated: true, alreadyActivated: true };
    }

    const provider = this.payments.getProvider(transaction.provider);
    const result = await provider.verifyPayment(reference);

    const amountMatches =
      result.amount === undefined || Math.abs(result.amount - Number(transaction.amount)) < 1;

    if (result.status === 'SUCCESS' && amountMatches) {
      const updated = await this.prisma.$transaction(async (tx) => {
        const saved = await tx.paymentTransaction.update({
          where: { id: transaction.id },
          data: { status: TransactionStatus.SUCCESS, metadata: { ...(transaction.metadata as object), verified: result.raw as Prisma.InputJsonValue } },
        });
        if (transaction.planId) {
          await this.subscriptions.activatePlan(transaction.businessId, transaction.planId, tx);
        }
        return saved;
      });

      await this.audit.log({
        businessId: transaction.businessId,
        action: 'PAYMENT_CONFIRMED',
        entityType: 'PaymentTransaction',
        entityId: transaction.id,
        metadata: { reference, provider: transaction.provider, amount: Number(transaction.amount) },
        ipAddress,
      });

      return { transaction: updated, activated: true, alreadyActivated: false };
    }

    // Payment failed or amount mismatch — record it, do NOT activate anything
    const updated = await this.prisma.paymentTransaction.update({
      where: { id: transaction.id },
      data: {
        status: TransactionStatus.FAILED,
        metadata: { ...(transaction.metadata as object), verified: result.raw as Prisma.InputJsonValue, reason: 'Payment not confirmed by provider' },
      },
    });

    await this.audit.log({
      businessId: transaction.businessId,
      action: 'PAYMENT_FAILED',
      entityType: 'PaymentTransaction',
      entityId: transaction.id,
      metadata: { reference, provider: transaction.provider, result: result.raw as Prisma.InputJsonValue },
      ipAddress,
    });

    return { transaction: updated, activated: false, reason: 'Payment could not be confirmed' };
  }

  /** Steps 3–4 (webhook path) — signature-verified, then same logic. */
  async handleWebhook(providerCode: string, headers: Record<string, string | string[] | undefined>, rawBody: string, ipAddress?: string) {
    const provider = this.payments.getProvider(providerCode);
    if (!provider.verifyWebhookSignature(headers, rawBody)) {
      throw new BadRequestException('Invalid webhook signature');
    }

    let reference: string | undefined;
    try {
      const body = JSON.parse(rawBody);
      // Paystack sends data.reference; Flutterwave sends data.tx_ref
      reference = body?.data?.reference ?? body?.data?.tx_ref;
    } catch {
      reference = undefined;
    }
    if (!reference) return { received: true, ignored: true };

    await this.verifyPayment(reference, ipAddress);
    return { received: true };
  }
}
