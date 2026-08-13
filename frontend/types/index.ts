// Shared types mirroring the backend API contract (see backend Swagger docs).

export type Role = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'MANAGER' | 'STAFF';
export type BusinessStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
export type SaleStatus = 'PENDING' | 'COMPLETED' | 'CANCELLED';
export type SalePaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID';
export type SalePaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'CARD' | 'OTHER';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type BillingInterval = 'MONTHLY' | 'YEARLY';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: Role;
  businessId: string | null;
}

export interface Business {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  status: BusinessStatus;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  isArchived: boolean;
  createdAt: string;
  totalSpent?: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  category?: string | null;
  price: number;
  costPrice?: number | null;
  stockQuantity?: number | null;
  isArchived: boolean;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  productId?: string | null;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount: number;
  lineTotal: number;
}

export interface Sale {
  id: string;
  saleNumber: string;
  status: SaleStatus;
  customerId?: string | null;
  customer?: Customer | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paymentStatus: SalePaymentStatus;
  paymentMethod?: SalePaymentMethod | null;
  soldById: string;
  soldBy?: { firstName: string; lastName: string };
  notes?: string | null;
  createdAt: string;
  items?: SaleItem[];
}

export interface Feature {
  key: string;
  name: string;
  kind: 'LIMIT' | 'BOOLEAN';
  description?: string | null;
}

export interface PlanFeature {
  id: string;
  limitValue?: number | null;
  boolValue?: boolean | null;
  feature: Feature;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  features?: PlanFeature[];
}

export interface Subscription {
  id: string;
  planId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string | null;
  history?: SubscriptionHistory[];
}

export interface SubscriptionHistory {
  id: string;
  action: string;
  fromPlanId?: string | null;
  toPlanId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface UsageItem {
  key: string;
  name: string;
  kind: 'LIMIT' | 'BOOLEAN';
  used?: number;
  limit?: number;
  remaining?: number;
  enabled?: boolean;
}

export interface PaymentTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  provider: string;
  status: TransactionStatus;
  plan?: { name: string; code: string } | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DashboardSummary {
  today: { revenue: number; count: number };
  month: { revenue: number; count: number };
  allTime: { revenue: number; count: number };
  customers: number;
  products: number;
  recentSales: Sale[];
  subscription: Subscription | null;
  usage: { plan: SubscriptionPlan | null; features: UsageItem[] };
}

export interface SalesReport {
  from: string;
  to: string;
  totalSales: number;
  totalRevenue: number;
  totalDiscounts: number;
  averageSale: number;
  byMethod: Record<string, { count: number; revenue: number }>;
  topProducts: { name: string; quantity: number; revenue: number }[];
  dailyTotals: { date: string; revenue: number; count: number }[];
}
