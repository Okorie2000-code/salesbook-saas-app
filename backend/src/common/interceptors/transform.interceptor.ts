import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, map } from 'rxjs';

/**
 * Recursively converts Prisma-specific values to JSON-friendly ones:
 * Decimal → number, Date → ISO string.
 */
function sanitize(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'object') {
    if (value instanceof Date) return value.toISOString();
    // Prisma.Decimal exposes toNumber()
    if (typeof (value as { toNumber?: unknown }).toNumber === 'function') {
      return (value as { toNumber: () => number }).toNumber();
    }
    if (Array.isArray(value)) return value.map(sanitize);
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) out[key] = sanitize(val);
    return out;
  }
  return value;
}

/**
 * Wraps every successful response in a consistent envelope:
 *   { success: true, data: … }
 */
@Injectable()
export class TransformInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(map((data) => ({ success: true, data: sanitize(data) })));
  }
}
