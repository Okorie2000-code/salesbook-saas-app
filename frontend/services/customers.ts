import { api } from './api';
import type { Customer, Paginated, Sale } from '@/types';

export interface CustomerPayload {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  notes?: string;
}

export function getCustomers(params: { page?: number; limit?: number; search?: string; archived?: boolean } = {}): Promise<Paginated<Customer>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.archived !== undefined) qs.set('archived', String(params.archived));
  return api(`/customers?${qs.toString()}`);
}

export function getCustomer(id: string): Promise<Customer & { sales: Sale[] }> {
  return api(`/customers/${id}`);
}

export function createCustomer(payload: CustomerPayload): Promise<Customer> {
  return api('/customers', { method: 'POST', body: payload });
}

export function updateCustomer(id: string, payload: Partial<CustomerPayload>): Promise<Customer> {
  return api(`/customers/${id}`, { method: 'PATCH', body: payload });
}

export function archiveCustomer(id: string): Promise<Customer> {
  return api(`/customers/${id}/archive`, { method: 'PATCH' });
}

export function restoreCustomer(id: string): Promise<Customer> {
  return api(`/customers/${id}/restore`, { method: 'PATCH' });
}
