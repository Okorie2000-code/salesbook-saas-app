import { api } from './api';
import type { Sale, Paginated, SalePaymentStatus, SalePaymentMethod } from '@/types';

export interface SaleItemPayload {
  productId?: string;
  productName: string;
  unitPrice: number;
  quantity: number;
  discount?: number;
}

export interface CreateSalePayload {
  customerId?: string;
  items: SaleItemPayload[];
  discount?: number;
  tax?: number;
  paymentStatus?: SalePaymentStatus;
  paymentMethod?: SalePaymentMethod;
  notes?: string;
}

export function getSales(params: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  paymentStatus?: string;
  from?: string;
  to?: string;
  customerId?: string;
} = {}): Promise<Paginated<Sale>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.status) qs.set('status', params.status);
  if (params.paymentStatus) qs.set('paymentStatus', params.paymentStatus);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  if (params.customerId) qs.set('customerId', params.customerId);
  return api(`/sales?${qs.toString()}`);
}

export function getSale(id: string): Promise<Sale> {
  return api(`/sales/${id}`);
}

export function createSale(payload: CreateSalePayload): Promise<Sale> {
  return api('/sales', { method: 'POST', body: payload });
}

export function cancelSale(id: string): Promise<Sale> {
  return api(`/sales/${id}/cancel`, { method: 'PATCH' });
}

export function updatePaymentStatus(id: string, paymentStatus: SalePaymentStatus, paymentMethod?: SalePaymentMethod): Promise<Sale> {
  return api(`/sales/${id}/payment`, { method: 'PATCH', body: { paymentStatus, paymentMethod } });
}
