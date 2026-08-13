/**
 * Database seed — run with `npm run db:seed` (tsx prisma/seed.ts).
 *
 * Idempotent: safe to run multiple times. Seeds:
 *  - the canonical Feature definitions used by the usage system
 *  - the four subscription plans (FREE, STARTER, BUSINESS, PRO) with limits
 *  - the supported payment providers (Paystack, Flutterwave)
 *  - a SUPER_ADMIN account (credentials from the .env file)
 */
import { BillingInterval, FeatureKind, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const FEATURES = [
  { key: 'MAX_USERS', name: 'Maximum users', kind: FeatureKind.LIMIT, description: 'Maximum number of team members' },
  { key: 'MAX_PRODUCTS', name: 'Maximum products', kind: FeatureKind.LIMIT, description: 'Maximum number of products' },
  { key: 'MAX_CUSTOMERS', name: 'Maximum customers', kind: FeatureKind.LIMIT, description: 'Maximum number of customers' },
  { key: 'MAX_MONTHLY_SALES', name: 'Maximum monthly sales', kind: FeatureKind.LIMIT, description: 'Maximum number of sales per calendar month' },
  { key: 'ADVANCED_REPORTS', name: 'Advanced reports', kind: FeatureKind.BOOLEAN, description: 'Unlocks sales reports and analytics' },
  { key: 'EXPORT_DATA', name: 'Export data', kind: FeatureKind.BOOLEAN, description: 'Export sales and customer data' },
];

interface PlanSeed {
  code: string;
  name: string;
  description: string;
  price: number;
  billingInterval: BillingInterval;
  isDefault?: boolean;
  sortOrder: number;
  features: Record<string, number | boolean>;
}

const PLANS: PlanSeed[] = [
  {
    code: 'FREE',
    name: 'Free',
    description: 'For very small businesses getting started with digital records',
    price: 0,
    billingInterval: BillingInterval.MONTHLY,
    isDefault: true,
    sortOrder: 1,
    features: {
      MAX_USERS: 1,
      MAX_PRODUCTS: 20,
      MAX_CUSTOMERS: 50,
      MAX_MONTHLY_SALES: 100,
      ADVANCED_REPORTS: false,
      EXPORT_DATA: false,
    },
  },
  {
    code: 'STARTER',
    name: 'Starter',
    description: 'For growing businesses that need a small team and more capacity',
    price: 5000,
    billingInterval: BillingInterval.MONTHLY,
    sortOrder: 2,
    features: {
      MAX_USERS: 3,
      MAX_PRODUCTS: 100,
      MAX_CUSTOMERS: 500,
      MAX_MONTHLY_SALES: 1000,
      ADVANCED_REPORTS: true,
      EXPORT_DATA: false,
    },
  },
  {
    code: 'BUSINESS',
    name: 'Business',
    description: 'For established businesses with serious sales volume',
    price: 15000,
    billingInterval: BillingInterval.MONTHLY,
    sortOrder: 3,
    features: {
      MAX_USERS: 10,
      MAX_PRODUCTS: 1000,
      MAX_CUSTOMERS: 5000,
      MAX_MONTHLY_SALES: 10000,
      ADVANCED_REPORTS: true,
      EXPORT_DATA: true,
    },
  },
  {
    code: 'PRO',
    name: 'Pro',
    description: 'Maximum capacity for high-volume businesses',
    price: 50000,
    billingInterval: BillingInterval.MONTHLY,
    sortOrder: 4,
    features: {
      MAX_USERS: 999999,
      MAX_PRODUCTS: 10000,
      MAX_CUSTOMERS: 50000,
      MAX_MONTHLY_SALES: 100000,
      ADVANCED_REPORTS: true,
      EXPORT_DATA: true,
    },
  },
];

async function seedFeatures(): Promise<void> {
  for (const feature of FEATURES) {
    await prisma.feature.upsert({
      where: { key: feature.key },
      update: { name: feature.name, description: feature.description, kind: feature.kind },
      create: feature,
    });
  }
  console.log(`✓ Seeded ${FEATURES.length} features`);
}

async function seedPlans(): Promise<void> {
  const allFeatures = await prisma.feature.findMany();

  for (const plan of PLANS) {
    // Upsert the plan itself
    const savedPlan = await prisma.subscriptionPlan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        description: plan.description,
        price: plan.price,
        billingInterval: plan.billingInterval,
        isDefault: plan.isDefault ?? false,
        sortOrder: plan.sortOrder,
        isActive: true,
      },
      create: {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        billingInterval: plan.billingInterval,
        isDefault: plan.isDefault ?? false,
        sortOrder: plan.sortOrder,
      },
    });

    // Replace the plan's feature rows so the seed is always in sync
    await prisma.planFeature.deleteMany({ where: { planId: savedPlan.id } });
    for (const feature of allFeatures) {
      const value = plan.features[feature.key];
      if (value === undefined) continue;

      await prisma.planFeature.create({
        data: {
          planId: savedPlan.id,
          featureId: feature.id,
          limitValue: feature.kind === FeatureKind.LIMIT ? (value as number) : null,
          boolValue: feature.kind === FeatureKind.BOOLEAN ? (value as boolean) : null,
        },
      });
    }
  }
  console.log(`✓ Seeded ${PLANS.length} subscription plans`);
}

async function seedPaymentProviders(): Promise<void> {
  const providers = [
    { code: 'paystack', name: 'Paystack', sortOrder: 1 },
    { code: 'flutterwave', name: 'Flutterwave', sortOrder: 2 },
  ];
  for (const provider of providers) {
    await prisma.paymentProvider.upsert({
      where: { code: provider.code },
      update: { name: provider.name, sortOrder: provider.sortOrder, isActive: true },
      create: provider,
    });
  }
  console.log(`✓ Seeded ${providers.length} payment providers`);
}

async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL ?? 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ Super Admin already exists (${email})`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: Role.SUPER_ADMIN,
    },
  });
  console.log(`✓ Created Super Admin (${email})`);
}

async function main() {
  console.log('Seeding database…');
  await seedFeatures();
  await seedPlans();
  await seedPaymentProviders();
  await seedAdmin();
  console.log('Seed complete ✅');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
