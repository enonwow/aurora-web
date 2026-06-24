import { Injectable } from "@nestjs/common";
import { envSchema, type EnvConfig } from "./env.schema";

@Injectable()
export class AppConfigService {
  private readonly env: EnvConfig;

  constructor() {
    this.env = envSchema.parse(process.env);
  }

  get nodeEnv() {
    return this.env.NODE_ENV;
  }

  get isTest() {
    return this.nodeEnv === "test";
  }

  get port() {
    return this.env.PORT;
  }

  get databaseUrl() {
    return this.env.DATABASE_URL;
  }

  get contractVersion() {
    return this.env.CONTRACT_VERSION;
  }

  get corsAllowedOrigins() {
    const values = this.env.CORS_ALLOWED_ORIGINS.split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
    return Array.from(new Set(values));
  }

  get swaggerEnabled() {
    return this.env.SWAGGER_ENABLED;
  }

  get swaggerPath() {
    return this.env.SWAGGER_PATH;
  }

  get swaggerJsonPath() {
    return this.env.SWAGGER_JSON_PATH;
  }

  get authRepositoryDriver() {
    return this.hostLocalRuntime ? "memory" : this.env.AUTH_REPOSITORY_DRIVER;
  }

  get hostLocalRuntime() {
    return this.env.AURORA_HOST_LOCAL_RUNTIME;
  }

  get localBlobMirrorPath() {
    return this.env.AURORA_LOCAL_BLOB_MIRROR;
  }

  get useMemoryInfrastructure() {
    return this.isTest || this.hostLocalRuntime;
  }

  get redisUrl() {
    return this.env.REDIS_URL;
  }

  get processingJobsRedisChannel() {
    return this.env.PROCESSING_JOBS_REDIS_CHANNEL;
  }

  get processingJobsRedisDeadLetterChannel() {
    return this.env.PROCESSING_JOBS_REDIS_DEAD_LETTER_CHANNEL;
  }

  get processingJobsPayloadTtlSeconds() {
    return this.env.PROCESSING_JOBS_PAYLOAD_TTL_SECONDS;
  }

  get processingJobsMaxAttempts() {
    return this.env.PROCESSING_JOBS_MAX_ATTEMPTS;
  }

  get processingJobsRetryBaseDelayMs() {
    return this.env.PROCESSING_JOBS_RETRY_BASE_DELAY_MS;
  }

  get processingJobsRetryMaxDelayMs() {
    return this.env.PROCESSING_JOBS_RETRY_MAX_DELAY_MS;
  }

  get processingJobsInlineEnabled() {
    return this.env.PROCESSING_JOBS_INLINE_ENABLED;
  }

  get sessionTtlSeconds() {
    return this.env.SESSION_TTL_SECONDS;
  }

  get processingCacheL1MaxEntries() {
    return this.env.PROCESSING_CACHE_L1_MAX_ENTRIES;
  }

  get processingCacheL1TtlSeconds() {
    return this.env.PROCESSING_CACHE_L1_TTL_SECONDS;
  }

  get processingCacheL1CatalogMaxEntries() {
    return this.env.PROCESSING_CACHE_L1_CATALOG_MAX_ENTRIES;
  }

  get processingCacheL1AreaMaxEntries() {
    return this.env.PROCESSING_CACHE_L1_AREA_MAX_ENTRIES;
  }

  get processingCacheL1CatalogMaxEntryBytes() {
    return this.env.PROCESSING_CACHE_L1_CATALOG_MAX_ENTRY_BYTES;
  }

  get processingCacheL1AreaMaxEntryBytes() {
    return this.env.PROCESSING_CACHE_L1_AREA_MAX_ENTRY_BYTES;
  }

  get processingCacheL1AdmissionHits() {
    return this.env.PROCESSING_CACHE_L1_ADMISSION_HITS;
  }

  get processingCacheL1AdmissionWindowSeconds() {
    return this.env.PROCESSING_CACHE_L1_ADMISSION_WINDOW_SECONDS;
  }

  get runtimeSettingsFile() {
    return this.env.RUNTIME_SETTINGS_FILE;
  }

  get processingGraphSnapshotFile() {
    return this.env.PROCESSING_GRAPH_SNAPSHOT_FILE;
  }

  get enableBlobAssetLookupInTest() {
    return this.env.ENABLE_BLOB_ASSET_LOOKUP_IN_TEST;
  }

  get derivedAssetConverterCommand() {
    return this.env.AURORA_DERIVED_ASSET_CONVERTER_COMMAND.trim();
  }

  get derivedAssetConverterArgs() {
    return this.env.AURORA_DERIVED_ASSET_CONVERTER_ARGS;
  }

  get derivedAssetConverterTimeoutMs() {
    return this.env.AURORA_DERIVED_ASSET_CONVERTER_TIMEOUT_MS;
  }

  get derivedAssetMaxModels() {
    return this.env.AURORA_DERIVED_ASSET_MAX_MODELS;
  }

  get derivedAssetOutputExtension() {
    return this.env.AURORA_DERIVED_ASSET_OUTPUT_EXTENSION;
  }
}
