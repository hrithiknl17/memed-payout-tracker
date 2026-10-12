import type { ZodTypeAny, z } from 'zod';
import { HttpError } from '../utils/httpError';

/** Parses `data` with a Zod schema, throwing a 400 with field errors on failure. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map((i) => ({
      field: i.path.join('.') || '(body)',
      message: i.message,
    }));
    throw HttpError.badRequest('Validation failed', details);
  }
  return result.data;
}
