import 'dotenv/config';
import { z } from 'zod';

/** Parses and validates environment variables once, at startup. */
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  REDIS_URL: z.string().optional().transform((v) => (v ? v : undefined)),
  CAMPAIGN_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(30),
  SPIKE_MIN_GAIN: z.coerce.number().int().positive().default(10_000),
  SPIKE_VIEWS_PER_MINUTE: z.coerce.number().positive().default(2_000),
  /** Proxy hops to trust for the client IP (set 1 behind Render/Heroku/Nginx). */
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Defaults to on, except under Jest. */
  RATE_LIMIT_ENABLED: z.enum(['true', 'false']).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const problems = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
  throw new Error(`Invalid environment configuration:\n${problems}`);
}

export const env = {
  ...parsed.data,
  RATE_LIMIT_ENABLED: parsed.data.RATE_LIMIT_ENABLED
    ? parsed.data.RATE_LIMIT_ENABLED === 'true'
    : parsed.data.NODE_ENV !== 'test',
};

export const corsOrigins = env.CORS_ORIGIN.split(',')
  .map((o) => o.trim())
  .filter(Boolean);
