import type { RequestHandler } from 'express';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';

/**
 * Per-IP request limits. Counters live in process memory, which is fine for a
 * single instance; with several instances behind a load balancer, plug in a
 * shared store (e.g. rate-limit-redis on the existing REDIS_URL).
 */
export function limiter(opts: { windowMs: number; limit: number; message: string; enabled?: boolean }): RequestHandler {
  const enabled = opts.enabled ?? env.RATE_LIMIT_ENABLED;
  return rateLimit({
    windowMs: opts.windowMs,
    limit: opts.limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => !enabled,
    handler: (_req, res) => {
      res.status(429).json({ error: opts.message });
    },
  });
}

/** Login and signup: slows down password guessing and account spam. */
export const authLimiter = limiter({
  windowMs: 15 * 60_000,
  limit: 20,
  message: 'Too many sign-in attempts. Please wait a few minutes and try again.',
});

/** Writes (submitting posts, view updates, reviews). */
export const writeLimiter = limiter({
  windowMs: 60_000,
  limit: 60,
  message: 'Too many requests. Please slow down and try again in a minute.',
});

/** Everything under /api: a generous ceiling against scraping and floods. */
export const apiLimiter = limiter({
  windowMs: 60_000,
  limit: 300,
  message: 'Too many requests. Please try again in a minute.',
});
