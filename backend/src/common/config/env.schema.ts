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

const optionalSha256EnvSchema = z
  .string()
  .trim()
  .transform((value) => value.toLowerCase())
  .refine((value) => value === "" || /^[a-f0-9]{64}$/u.test(value), {
    message: "Expected an empty value or a lowercase-normalized SHA-256.",
  })
  .default("");

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  AURORA_BIND_HOST: z.string().min(1).default("0.0.0.0"),
  DATABASE_URL: z
    .string()
    .min(1)
    .default("mysql://aurora:aurora@mysql:3306/aurora_web"),
  CORS_ALLOWED_ORIGINS: z
    .string()
    .min(1)
    .default("http://localhost:5173,http://127.0.0.1:5173"),
  CONTRACT_VERSION: z.string().min(1).default("1.0.0"),
  RUNTIME_BUILD_COMMIT: z.string().default(""),
  RUNTIME_BUILD_IMAGE_DIGEST: z.string().default(""),
  RUNTIME_BUILD_BUILT_AT: z.string().datetime().or(z.literal("")).default(""),
  SWAGGER_ENABLED: booleanEnvSchema(true),
  SWAGGER_PATH: z.string().min(1).default("docs"),
  SWAGGER_JSON_PATH: z.string().min(1).default("docs-json"),
  AUTH_REPOSITORY_DRIVER: z.enum(["mysql", "memory"]).default("mysql"),
  AURORA_RUNTIME_PATH_MODE: z.enum(["host", "docker"]).default("host"),
  NWN_USER_DIR_HOST: z.string().default(""),
  NWN_INSTALL_DIR_HOST: z.string().default(""),
  AURORA_REFERENCE_DIR_HOST: z.string().default(""),
  AURORA_HOST_LOCAL_RUNTIME: booleanEnvSchema(false),
  AURORA_LOCAL_BLOB_MIRROR: z.string().default("../.codex-tmp/module-blob-mirror"),
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
  PROCESSING_CACHE_L2_AREA_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  PROCESSING_CACHE_L2_TILE_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  RUNTIME_SETTINGS_FILE: z.string().min(1).default("./config/runtime-settings.json"),
  PROCESSING_GRAPH_SNAPSHOT_FILE: z
    .string()
    .min(1)
    .default("./config/processing-graph-snapshot.json"),
  ENABLE_BLOB_ASSET_LOOKUP_IN_TEST: booleanEnvSchema(false),
  AURORA_DERIVED_ASSET_CONVERTER_COMMAND: z.string().default(""),
  AURORA_DERIVED_ASSET_CONVERTER_ARGS: z
    .string()
    .default("[\"--input\",\"{source}\",\"--output\",\"{output}\"]"),
  AURORA_DERIVED_ASSET_CONVERTER_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(30_000),
  AURORA_DERIVED_ASSET_MAX_MODELS: z.coerce.number().int().positive().default(200),
  AURORA_DERIVED_ASSET_OUTPUT_EXTENSION: z.enum(["glb", "gltf"]).default("glb"),
  AURORA_AREA_CERTIFICATION_REPORT_PATH: z.string().max(4096).default(""),
  AURORA_ITEM_GENERATOR_SOURCE_DIRS: z.string().default(""),
  AURORA_NWNSCRIPT_COMPILER_PATH: z.string().trim().max(4096).default(""),
  AURORA_NWNSCRIPT_COMPILER_SHA256: optionalSha256EnvSchema,
  AURORA_NWNSCRIPT_COMPILER_VERSION_MARKER: z.string().trim().max(256).default(""),
  AURORA_NWNSCRIPT_LANGUAGE_SPEC_PATH: z.string().trim().max(4096).default(""),
  AURORA_NWNSCRIPT_LANGUAGE_SPEC_SHA256: optionalSha256EnvSchema,
  AURORA_NWNSCRIPT_RUNTIME_LIBRARY_DIRS: z.string().max(32768).default(""),
  AURORA_NWNSCRIPT_COMPILER_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .min(1)
    .max(30_000)
    .default(10_000),
  AURORA_NWNSCRIPT_COMPILER_OUTPUT_BYTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(64 * 1024)
    .default(64 * 1024),
  AURORA_NWNSCRIPT_COMPILER_ARTIFACT_BYTES: z.coerce
    .number()
    .int()
    .min(1)
    .max(4 * 1024 * 1024)
    .default(4 * 1024 * 1024),
}).superRefine((value, context) => {
  const required = [
    value.AURORA_NWNSCRIPT_COMPILER_PATH,
    value.AURORA_NWNSCRIPT_COMPILER_SHA256,
    value.AURORA_NWNSCRIPT_COMPILER_VERSION_MARKER,
    value.AURORA_NWNSCRIPT_LANGUAGE_SPEC_PATH,
    value.AURORA_NWNSCRIPT_LANGUAGE_SPEC_SHA256,
  ];
  const configuredCount = required.filter((entry) => entry.length > 0).length;
  const hasRuntimeDirectories = value.AURORA_NWNSCRIPT_RUNTIME_LIBRARY_DIRS.trim().length > 0;
  if (
    (configuredCount > 0 && configuredCount !== required.length) ||
    (configuredCount === 0 && hasRuntimeDirectories)
  ) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["AURORA_NWNSCRIPT_COMPILER_PATH"],
      message:
        "NWScript compiler path, hashes, version marker, and language specification must all be configured together.",
    });
  }
});

export type EnvConfig = z.infer<typeof envSchema>;
