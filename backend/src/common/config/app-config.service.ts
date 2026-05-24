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
    return this.env.AUTH_REPOSITORY_DRIVER;
  }

  get sessionTtlSeconds() {
    return this.env.SESSION_TTL_SECONDS;
  }

  get runtimeSettingsFile() {
    return this.env.RUNTIME_SETTINGS_FILE;
  }

  get processingGraphSnapshotFile() {
    return this.env.PROCESSING_GRAPH_SNAPSHOT_FILE;
  }
}
