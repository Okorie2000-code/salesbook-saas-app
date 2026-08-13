/**
 * Canonical feature keys used by the usage/limits system.
 * The list of features themselves lives in the database (Feature table) so the
 * Super Admin can extend it without code changes; these constants are the keys
 * the application code itself refers to.
 */
export const FEATURE_KEYS = {
  MAX_USERS: 'MAX_USERS',
  MAX_PRODUCTS: 'MAX_PRODUCTS',
  MAX_CUSTOMERS: 'MAX_CUSTOMERS',
  MAX_MONTHLY_SALES: 'MAX_MONTHLY_SALES',
  ADVANCED_REPORTS: 'ADVANCED_REPORTS',
  EXPORT_DATA: 'EXPORT_DATA',
} as const;

export type FeatureKey = (typeof FEATURE_KEYS)[keyof typeof FEATURE_KEYS];
