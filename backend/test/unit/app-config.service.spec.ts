import { AppConfigService } from "../../src/common/config/app-config.service";
import { AppConfigModule } from "../../src/common/config/app-config.module";

describe("AppConfigService", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NODE_ENV: "test",
      PORT: "4040",
      DATABASE_URL: "mysql://user:pass@localhost:3306/db",
      CORS_ALLOWED_ORIGINS: "http://a.local, http://b.local, http://a.local",
      CONTRACT_VERSION: "9.9.9",
      SWAGGER_ENABLED: "false",
      SWAGGER_PATH: "swagger-ui",
      SWAGGER_JSON_PATH: "swagger-json",
      AUTH_REPOSITORY_DRIVER: "memory",
      REDIS_URL: "redis://localhost:6379",
      PROCESSING_JOBS_REDIS_CHANNEL: "aurora.jobs",
      PROCESSING_JOBS_REDIS_DEAD_LETTER_CHANNEL: "aurora.jobs.dead",
      PROCESSING_JOBS_PAYLOAD_TTL_SECONDS: "1800",
      PROCESSING_JOBS_MAX_ATTEMPTS: "5",
      PROCESSING_JOBS_RETRY_BASE_DELAY_MS: "500",
      PROCESSING_JOBS_RETRY_MAX_DELAY_MS: "45000",
      PROCESSING_JOBS_INLINE_ENABLED: "false",
      SESSION_TTL_SECONDS: "7200",
      PROCESSING_CACHE_L1_MAX_ENTRIES: "111",
      PROCESSING_CACHE_L1_TTL_SECONDS: "222",
      PROCESSING_CACHE_L1_CATALOG_MAX_ENTRIES: "333",
      PROCESSING_CACHE_L1_AREA_MAX_ENTRIES: "444",
      PROCESSING_CACHE_L1_CATALOG_MAX_ENTRY_BYTES: "555",
      PROCESSING_CACHE_L1_AREA_MAX_ENTRY_BYTES: "666",
      PROCESSING_CACHE_L1_ADMISSION_HITS: "3",
      PROCESSING_CACHE_L1_ADMISSION_WINDOW_SECONDS: "60",
      RUNTIME_SETTINGS_FILE: "./tmp/runtime-settings.json",
      PROCESSING_GRAPH_SNAPSHOT_FILE: "./tmp/graph-snapshot.json"
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("reads parsed environment values through getters", () => {
    const config = new AppConfigService();

    expect(config.nodeEnv).toBe("test");
    expect(config.isTest).toBe(true);
    expect(config.port).toBe(4040);
    expect(config.databaseUrl).toBe("mysql://user:pass@localhost:3306/db");
    expect(config.contractVersion).toBe("9.9.9");
    expect(config.corsAllowedOrigins).toEqual(["http://a.local", "http://b.local"]);
    expect(config.swaggerEnabled).toBe(false);
    expect(config.swaggerPath).toBe("swagger-ui");
    expect(config.swaggerJsonPath).toBe("swagger-json");
    expect(config.authRepositoryDriver).toBe("memory");
    expect(config.redisUrl).toBe("redis://localhost:6379");
    expect(config.processingJobsRedisChannel).toBe("aurora.jobs");
    expect(config.processingJobsRedisDeadLetterChannel).toBe("aurora.jobs.dead");
    expect(config.processingJobsPayloadTtlSeconds).toBe(1800);
    expect(config.processingJobsMaxAttempts).toBe(5);
    expect(config.processingJobsRetryBaseDelayMs).toBe(500);
    expect(config.processingJobsRetryMaxDelayMs).toBe(45000);
    expect(config.processingJobsInlineEnabled).toBe(false);
    expect(config.sessionTtlSeconds).toBe(7200);
    expect(config.processingCacheL1MaxEntries).toBe(111);
    expect(config.processingCacheL1TtlSeconds).toBe(222);
    expect(config.processingCacheL1CatalogMaxEntries).toBe(333);
    expect(config.processingCacheL1AreaMaxEntries).toBe(444);
    expect(config.processingCacheL1CatalogMaxEntryBytes).toBe(555);
    expect(config.processingCacheL1AreaMaxEntryBytes).toBe(666);
    expect(config.processingCacheL1AdmissionHits).toBe(3);
    expect(config.processingCacheL1AdmissionWindowSeconds).toBe(60);
    expect(config.runtimeSettingsFile).toBe("./tmp/runtime-settings.json");
    expect(config.processingGraphSnapshotFile).toBe("./tmp/graph-snapshot.json");
  });

  it("parses boolean env aliases for true/false", () => {
    process.env = {
      ...process.env,
      SWAGGER_ENABLED: "on",
      ENABLE_BLOB_ASSET_LOOKUP_IN_TEST: "0"
    };

    const config = new AppConfigService();
    expect(config.swaggerEnabled).toBe(true);
    expect(config.enableBlobAssetLookupInTest).toBe(false);
  });

  it("uses localhost and 127.0.0.1 as default CORS origins", () => {
    process.env = {
      ...originalEnv
    };
    delete process.env.CORS_ALLOWED_ORIGINS;

    const config = new AppConfigService();
    expect(config.corsAllowedOrigins).toEqual([
      "http://localhost:5173",
      "http://127.0.0.1:5173"
    ]);
  });

  it("declares config module providers", () => {
    const providers = Reflect.getMetadata("providers", AppConfigModule) as unknown[];
    const exportsList = Reflect.getMetadata("exports", AppConfigModule) as unknown[];

    expect(providers).toContain(AppConfigService);
    expect(exportsList).toContain(AppConfigService);
  });
});
