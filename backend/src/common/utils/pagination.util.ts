/** Shared pagination metadata builder for list endpoints. */
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function buildPaginated<T>(items: T[], total: number, page: number, limit: number): Paginated<T> {
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
  };
}

/** Parses page/limit query params with sane defaults and clamps. */
export function parsePagination(page?: number, limit?: number): { page: number; limit: number; skip: number } {
  const safePage = Math.max(page ?? 1, 1);
  const safeLimit = Math.min(Math.max(limit ?? 20, 1), 100);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}
