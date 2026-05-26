import { z } from "zod";

function parseBooleanValue(input: unknown): unknown {
  if (typeof input === "boolean") {
    return input;
  }
  if (typeof input === "number") {
    if (input === 1) {
      return true;
    }
    if (input === 0) {
      return false;
    }
  }
  if (typeof input === "string") {
    const normalized = input.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  }
  return input;
}

function booleanEnvSchema(defaultValue: boolean) {
  return z.preprocess(parseBooleanValue, z.boolean()).default(defaultValue);
}

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("mysql://aurora:aurora@mysql:3306/aurora_web"),
  CORS_ALLOWED_ORIGINS: z.string().min(1).default("http://localhost:5173"),
  CONTRACT_VERSION: z.string().min(1).default("1.0.0"),
  SWAGGER_ENABLED: booleanEnvSchema(true),
  SWAGGER_PATH: z.string().min(1).default("docs"),
  SWAGGER_JSON_PATH: z.string().min(1).default("docs-json"),
  AUTH_REPOSITORY_DRIVER: z.enum(["mysql", "memory"]).default("mysql"),
  REDIS_URL: z.string().min(1).default("redis://redis:6379"),
  PROCESSING_JOBS_REDIS_CHANNEL: z.string().min(1).default("aurora.jobs"),
  PROCESSING_JOBS_REDIS_DEAD_LETTER_CHANNEL: z
    .string()
    .min(1)
    .default("aurora.jobs.dead"),
  PROCESSING_JOBS_PAYLOAD_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  PROCESSING_JOBS_MAX_ATTEMPTS: z.coerce.number().int().positive().default(3),
  PROCESSING_JOBS_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(1000),
  PROCESSING_JOBS_RETRY_MAX_DELAY_MS: z.coerce.number().int().positive().default(30000),
  PROCESSING_JOBS_INLINE_ENABLED: booleanEnvSchema(true),
  SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  PROCESSING_CACHE_L1_MAX_ENTRIES: z.coerce.number().int().positive().default(2000),
  PROCESSING_CACHE_L1_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  PROCESSING_CACHE_L1_CATALOG_MAX_ENTRIES: z.coerce.number().int().positive().default(1200),
  PROCESSING_CACHE_L1_AREA_MAX_ENTRIES: z.coerce.number().int().positive().default(800),
  PROCESSING_CACHE_L1_CATALOG_MAX_ENTRY_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(262144),
  PROCESSING_CACHE_L1_AREA_MAX_ENTRY_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1048576),
  PROCESSING_CACHE_L1_ADMISSION_HITS: z.coerce.number().int().positive().default(2),
  PROCESSING_CACHE_L1_ADMISSION_WINDOW_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(300),
  RUNTIME_SETTINGS_FILE: z.string().min(1).default("./config/runtime-settings.json"),
  PROCESSING_GRAPH_SNAPSHOT_FILE: z
    .string()
    .min(1)
    .default("./config/processing-graph-snapshot.json"),
  ENABLE_BLOB_ASSET_LOOKUP_IN_TEST: booleanEnvSchema(false)
});

export type EnvConfig = z.infer<typeof envSchema>;
