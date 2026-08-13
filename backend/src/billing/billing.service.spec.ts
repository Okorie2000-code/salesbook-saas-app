import { TransactionStatus } from '@prisma/client';
import { BillingService } from './billing.service';

/**
 * Unit tests for the billing flow. Verifies that a subscription is ONLY
 * activated after the provider confirms the payment, and that a failed
 * verification never activates anything.
 */
describe('BillingService', () => {
  let service: BillingService;
  let prisma: any;
  let payments: any;
  let subscriptions: any;
  let audit: any;

  const pendingTransaction = {
    id: 'txn-1',
    businessId: 'biz-1',
    planId: 'plan-1',
    provider: 'paystack',
    reference: 'SB-ref-1',
    amount: 5000,
    status: TransactionStatus.PENDING,
    metadata: {},
    plan: { name: 'Starter' },
  };

  beforeEach(() => {
    prisma = {
      paymentTransaction: {
        findUnique: jest.fn(),
        update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...pendingTransaction, ...data })),
        create: jest.fn(),
      },
      subscriptionPlan: { findFirst: jest.fn() },
      paymentProvider: { findUnique: jest.fn() },
      $transaction: jest.fn((fn: (tx: any) => Promise<any>) => fn(prisma)),
    };
    payments = {
      getProvider: jest.fn(),
      supportedProviders: jest.fn().mockReturnValue(['paystack']),
    };
    subscriptions = { activatePlan: jest.fn().mockResolvedValue({}) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    service = new BillingService(prisma, payments, subscriptions, audit);
  });

  describe('verifyPayment', () => {
    it('activates the subscription when the provider confirms success', async () => {
      prisma.paymentTransaction.findUnique.mockResolvedValue(pendingTransaction);
      payments.getProvider.mockReturnValue({
        verifyPayment: jest.fn().mockResolvedValue({ status: 'SUCCESS', amount: 5000 }),
      });

      const result = await service.verifyPayment('SB-ref-1');

      expect(result.activated).toBe(true);
      expect(subscriptions.activatePlan).toHaveBeenCalledWith('biz-1', 'plan-1', expect.anything());
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_CONFIRMED' }));
    });

    it('does NOT activate when the provider reports failure', async () => {
      prisma.paymentTransaction.findUnique.mockResolvedValue(pendingTransaction);
      payments.getProvider.mockReturnValue({
        verifyPayment: jest.fn().mockResolvedValue({ status: 'FAILED', amount: 5000 }),
      });

      const result = await service.verifyPayment('SB-ref-1');

      expect(result.activated).toBe(false);
      expect(subscriptions.activatePlan).not.toHaveBeenCalled();
      expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'PAYMENT_FAILED' }));
    });

    it('does NOT activate when the amount does not match the transaction', async () => {
      prisma.paymentTransaction.findUnique.mockResolvedValue(pendingTransaction);
      payments.getProvider.mockReturnValue({
        verifyPayment: jest.fn().mockResolvedValue({ status: 'SUCCESS', amount: 1 }), // tampered amount
      });

      const result = await service.verifyPayment('SB-ref-1');

      expect(result.activated).toBe(false);
      expect(subscriptions.activatePlan).not.toHaveBeenCalled();
    });

    it('is idempotent for already-successful transactions', async () => {
      prisma.paymentTransaction.findUnique.mockResolvedValue({
        ...pendingTransaction,
        status: TransactionStatus.SUCCESS,
      });

      const result = await service.verifyPayment('SB-ref-1');

      expect(result.alreadyActivated).toBe(true);
      expect(payments.getProvider).not.toHaveBeenCalled();
    });
  });
});
