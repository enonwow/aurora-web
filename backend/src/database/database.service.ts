import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { AppConfigService } from "../common/config/app-config.service";
import * as schema from "./schema";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private sqlClient!: ReturnType<typeof postgres>;
  private database!: PostgresJsDatabase<typeof schema>;
  private initialized = false;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.config.authRepositoryDriver === "memory") {
      return;
    }

    this.sqlClient = postgres(this.config.databaseUrl, {
      max: 10,
      prepare: false
    });
    this.database = drizzle(this.sqlClient, { schema });
    await this.ensureSchema();
    this.initialized = true;
    this.logger.log("Connected to PostgreSQL and ensured schema.");
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    await this.sqlClient.end({ timeout: 5 });
  }

  get db(): PostgresJsDatabase<typeof schema> {
    if (!this.initialized) {
      throw new Error("DatabaseService is not initialized.");
    }
    return this.database;
  }

  private async ensureSchema(): Promise<void> {
    await this.sqlClient`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        display_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('viewer', 'builder', 'dm', 'admin')),
        created_at TIMESTAMPTZ NOT NULL
      )
    `;

    await this.sqlClient`
      CREATE TABLE IF NOT EXISTS sessions (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        issued_at TIMESTAMPTZ NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL
      )
    `;

    await this.sqlClient`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `;
  }
}

