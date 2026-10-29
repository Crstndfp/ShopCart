import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// Load .env from current working directory, with fallback to project root
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api/v1'),

  // Microsoft SQL Server Database Connection
  DB_SERVER: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(1433),
  DB_NAME: z.string().default('ShopCartDB'),
  DB_USER: z.string().default('sa'),
  DB_PASSWORD: z.string().default('PentandraShopCart2026!'),
  DB_ENCRYPT: z.preprocess((val) => val === 'true', z.boolean().default(false)),
  DB_TRUST_SERVER_CERTIFICATE: z.preprocess((val) => val !== 'false', z.boolean().default(true)),
  DB_POOL_MIN: z.coerce.number().default(5),
  DB_POOL_MAX: z.coerce.number().default(25),

  // JWT Authentication & Rotation Secrets
  JWT_ACCESS_SECRET: z
    .string()
    .min(32, 'JWT_ACCESS_SECRET must have at least 32 characters')
    .default('shopcart_super_secret_access_jwt_key_2026_min_32_chars'),
  JWT_ACCESS_EXPIRATION: z.string().default('15m'),
  JWT_REFRESH_SECRET: z
    .string()
    .min(32, 'JWT_REFRESH_SECRET must have at least 32 characters')
    .default('shopcart_super_secret_refresh_jwt_key_2026_min_32_chars'),
  JWT_REFRESH_EXPIRATION_DAYS: z.coerce.number().default(7),

  // Background Worker Settings
  BACKGROUND_RESERVATION_CLEANUP_CRON: z.string().default('* * * * *'),
  CART_ABANDONED_THRESHOLD_HOURS: z.coerce.number().default(24),

  // Security & CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(900000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(100),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment variables configuration:');
  console.error(parsedEnv.error.flatten().fieldErrors);
  throw new Error('Invalid environment configuration');
}

export const env = parsedEnv.data;
export type EnvConfig = z.infer<typeof envSchema>;
