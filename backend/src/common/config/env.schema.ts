import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("postgres://aurora:aurora@postgres:5432/aurora_web"),
  CORS_ALLOWED_ORIGINS: z.string().min(1).default("http://localhost:5173"),
  CONTRACT_VERSION: z.string().min(1).default("1.0.0"),
  SWAGGER_ENABLED: z.coerce.boolean().default(true),
  SWAGGER_PATH: z.string().min(1).default("docs"),
  SWAGGER_JSON_PATH: z.string().min(1).default("docs-json"),
  AUTH_REPOSITORY_DRIVER: z.enum(["postgres", "memory"]).default("postgres"),
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
    .default("./config/processing-graph-snapshot.json")
});

export type EnvConfig = z.infer<typeof envSchema>;
