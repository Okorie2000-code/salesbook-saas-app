/**
 * Small date helpers used across usage tracking and subscription billing.
 */

/** "YYYY-MM" key for a date — used by monthly usage counters. */
export function periodKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/** "ALL" key for lifetime counters (users, products, customers). */
export const ALL_TIME_PERIOD = 'ALL';

/** Start of the current calendar month. */
export function startOfMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** End of the current calendar month (exclusive). */
export function startOfNextMonth(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

/** Adds `days` to a date (used for trial periods and reset tokens). */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Adds `months` to a date (used for subscription period end). */
export function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, date.getDate());
}

/** Adds `years` to a date (for yearly billing intervals). */
export function addYears(date: Date, years: number): Date {
  return new Date(date.getFullYear() + years, date.getMonth(), date.getDate());
}

/** Start of today. */
export function startOfDay(date: Date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
