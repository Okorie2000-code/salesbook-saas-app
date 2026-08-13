import { api } from './api';
import type { DashboardSummary, SalesReport } from '@/types';

export function getDashboard(): Promise<DashboardSummary> {
  return api('/dashboard/summary');
}

export function getSalesReport(params: { from?: string; to?: string } = {}): Promise<SalesReport> {
  const qs = new URLSearchParams();
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  return api(`/sales/report?${qs.toString()}`);
}
