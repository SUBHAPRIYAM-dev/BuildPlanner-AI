import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform(Number),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z.string().optional(),
  JWT_SECRET: z.string().default('buildplanner_dev_jwt_secret_key_super_secure_12345'),
  JWT_REFRESH_SECRET: z.string().default('buildplanner_dev_refresh_secret_key_super_secure_67890'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  AI_PROVIDER: z.enum(['mock', 'openai', 'gemini']).default('mock'),
  OPENAI_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  FRONTEND_URL: z.string().default('http://localhost:5173')
});

export const env = envSchema.parse(process.env);
