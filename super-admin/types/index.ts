// Types mirroring the backend /admin API contract.

export type Role = 'SUPER_ADMIN' | 'BUSINESS_OWNER' | 'MANAGER' | 'STAFF';
export type BusinessStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED';
export type SubscriptionStatus = 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED' | 'EXPIRED' | 'SUSPENDED';
export type TransactionStatus = 'PENDING' | 'SUCCESS' | 'FAILED';
export type BillingInterval = 'MONTHLY' | 'YEARLY';

export interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  businessId: string | null;
  business?: { id: string; name: string } | null;
  createdAt: string;
}

export interface AdminBusiness {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  status: BusinessStatus;
  createdAt: string;
  _count?: { users?: number; customers?: number; products?: number; sales?: number };
  subscriptions?: { plan: { name: string } }[];
}

export interface AdminBusinessDetail extends AdminBusiness {
  users: { id: string; email: string; firstName: string; lastName: string; role: Role; isActive: boolean; createdAt: string }[];
  subscriptions: { id: string; plan: { name: string }; status: SubscriptionStatus; currentPeriodEnd: string; history: { id: string; action: string; createdAt: string }[] }[];
  payments: PaymentTransaction[];
  _count: { customers: number; products: number; sales: number };
}

export interface Feature {
  key: string;
  name: string;
  kind: 'LIMIT' | 'BOOLEAN';
  description: string | null;
}

export interface PlanFeature {
  id: string;
  limitValue: number | null;
  boolValue: boolean | null;
  feature: Feature;
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billingInterval: BillingInterval;
  isActive: boolean;
  isDefault: boolean;
  sortOrder: number;
  features?: PlanFeature[];
}

export interface AdminSubscription {
  id: string;
  status: SubscriptionStatus;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  trialEndsAt?: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  business: { id: string; name: string; email: string | null; status: BusinessStatus };
  plan: { id: string; name: string; code: string; price: number; currency: string };
  history: { id: string; action: string; createdAt: string }[];
}

export interface AdminFeature {
  id: string;
  key: string;
  name: string;
  description: string | null;
  kind: 'LIMIT' | 'BOOLEAN';
  planFeatures: {
    id: string;
    limitValue: number | null;
    boolValue: boolean | null;
    plan: { id: string; code: string; name: string };
  }[];
}

export interface PaymentTransaction {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  provider: string;
  status: TransactionStatus;
  createdAt: string;
  business?: { name: string } | null;
  plan?: { name: string; code: string } | null;
}

export interface AdminDashboard {
  businesses: { total: number; active: number; newThisMonth: number; suspended: number };
  users: number;
  subscriptions: { active: number; cancelled: number; distribution: { plan: string; count: number }[] };
  payments: { total: number; successful: number; failed: number; pending: number; revenue: number };
  recentBusinesses: AdminBusiness[];
  recentPayments: PaymentTransaction[];
}

export interface PlatformSettings {
  key: string;
  value: unknown;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
