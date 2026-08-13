import { api } from './api';
import type {
  AdminDashboard,
  AdminBusiness,
  AdminBusinessDetail,
  AdminFeature,
  AdminSubscription,
  AdminUser,
  BusinessStatus,
  Paginated,
  PaymentTransaction,
  PlatformSettings,
  Role,
  SubscriptionPlan,
} from '@/types';

// --- Dashboard ---------------------------------------------------------------
export function getDashboard(): Promise<AdminDashboard> {
  return api('/admin/dashboard');
}

// --- Businesses --------------------------------------------------------------
export function getBusinesses(params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<Paginated<AdminBusiness>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  return api(`/admin/businesses?${qs.toString()}`);
}

export function getBusiness(id: string): Promise<AdminBusinessDetail> {
  return api(`/admin/businesses/${id}`);
}

export function updateBusinessStatus(id: string, status: BusinessStatus): Promise<AdminBusiness> {
  return api(`/admin/businesses/${id}/status`, { method: 'PATCH', body: { status } });
}

// --- Users -------------------------------------------------------------------
export function getUsers(params: { page?: number; limit?: number; search?: string; role?: string } = {}): Promise<Paginated<AdminUser>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.role) qs.set('role', params.role);
  return api(`/admin/users?${qs.toString()}`);
}

export function updateUser(id: string, payload: { role?: Role; isActive?: boolean }): Promise<AdminUser> {
  return api(`/admin/users/${id}`, { method: 'PATCH', body: payload });
}

// --- Subscriptions -------------------------------------------------------------
export function getSubscriptions(params: { page?: number; limit?: number; search?: string; status?: string } = {}): Promise<Paginated<AdminSubscription>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  return api(`/admin/subscriptions?${qs.toString()}`);
}

// --- Features -------------------------------------------------------------------
export function getFeatures(): Promise<AdminFeature[]> {
  return api('/admin/features');
}

// --- Plans -------------------------------------------------------------------
export function getPlans(): Promise<SubscriptionPlan[]> {
  return api('/admin/plans');
}

export interface PlanFeaturePayload {
  featureKey: string;
  limitValue?: number;
  boolValue?: boolean;
}

export interface PlanPayload {
  code: string;
  name: string;
  description?: string;
  price: number;
  currency?: string;
  billingInterval: 'MONTHLY' | 'YEARLY';
  isActive?: boolean;
  isDefault?: boolean;
  sortOrder?: number;
  features: PlanFeaturePayload[];
}

export function createPlan(payload: PlanPayload): Promise<SubscriptionPlan> {
  return api('/admin/plans', { method: 'POST', body: payload });
}

export function updatePlan(id: string, payload: Partial<PlanPayload>): Promise<SubscriptionPlan> {
  return api(`/admin/plans/${id}`, { method: 'PATCH', body: payload });
}

export function setPlanActive(id: string, isActive: boolean): Promise<SubscriptionPlan> {
  return api(`/admin/plans/${id}/status`, { method: 'PATCH', body: { isActive } });
}

// --- Payments ----------------------------------------------------------------
export function getPayments(params: { page?: number; limit?: number; search?: string; status?: string; provider?: string } = {}): Promise<Paginated<PaymentTransaction>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.provider) qs.set('provider', params.provider);
  return api(`/admin/payments?${qs.toString()}`);
}

export function getPayment(id: string): Promise<PaymentTransaction> {
  return api(`/admin/payments/${id}`);
}

// --- Settings ----------------------------------------------------------------
export function getSettings(): Promise<PlatformSettings[]> {
  return api('/admin/settings');
}

export function updateSettings(settings: { key: string; value: unknown }[]): Promise<PlatformSettings[]> {
  return api('/admin/settings', { method: 'PUT', body: { settings } });
}
