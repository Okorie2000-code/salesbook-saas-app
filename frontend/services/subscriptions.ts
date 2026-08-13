import { api } from './api';
import type { SubscriptionPlan, Subscription, UsageItem } from '@/types';


export function getPlans(): Promise<SubscriptionPlan[]> {
  return api('/subscriptions/plans');
}

export function getMySubscription(): Promise<Subscription> {
  return api('/subscriptions/current');
}

export function getMyUsage(): Promise<{ plan: SubscriptionPlan | null; features: UsageItem[] }> {
  return api('/usage/me');
}

export function cancelSubscription(): Promise<{ message: string }> {
  return api('/subscriptions/cancel', { method: 'POST' });
}
