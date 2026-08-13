import { api } from './api';
import type { Product, Paginated } from '@/types';

export interface ProductPayload {
  name: string;
  description?: string;
  sku?: string;
  category?: string;
  price: number;
  costPrice?: number;
  stockQuantity?: number;
}

export function getProducts(params: { page?: number; limit?: number; search?: string; category?: string; archived?: boolean } = {}): Promise<Paginated<Product>> {
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.limit) qs.set('limit', String(params.limit));
  if (params.search) qs.set('search', params.search);
  if (params.category) qs.set('category', params.category);
  if (params.archived !== undefined) qs.set('archived', String(params.archived));
  return api(`/products?${qs.toString()}`);
}

export function getProduct(id: string): Promise<Product> {
  return api(`/products/${id}`);
}

export function createProduct(payload: ProductPayload): Promise<Product> {
  return api('/products', { method: 'POST', body: payload });
}

export function updateProduct(id: string, payload: Partial<ProductPayload>): Promise<Product> {
  return api(`/products/${id}`, { method: 'PATCH', body: payload });
}

export function archiveProduct(id: string): Promise<Product> {
  return api(`/products/${id}/archive`, { method: 'PATCH' });
}

export function restoreProduct(id: string): Promise<Product> {
  return api(`/products/${id}/restore`, { method: 'PATCH' });
}
