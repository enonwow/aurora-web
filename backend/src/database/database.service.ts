import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { AppConfigService } from "../common/config/app-config.service";
import * as schema from "./schema";

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool!: mysql.Pool;
  private database!: MySql2Database<typeof schema>;
  private initialized = false;

  constructor(private readonly config: AppConfigService) {}

  async onModuleInit(): Promise<void> {
    if (this.config.authRepositoryDriver === "memory") {
      return;
    }

    this.pool = mysql.createPool({
      uri: this.config.databaseUrl,
      connectionLimit: 10
    });
    this.database = drizzle(this.pool, { schema, mode: "default" });
    await this.ensureSchema();
    this.initialized = true;
    this.logger.log("Connected to MySQL and ensured schema.");
  }

  async onModuleDestroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }
    await this.pool.end();
  }

  get db(): MySql2Database<typeof schema> {
    if (!this.initialized) {
      throw new Error("DatabaseService is not initialized.");
    }
    return this.database;
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(128) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        display_name VARCHAR(255) NOT NULL,
        role ENUM('viewer', 'builder', 'dm', 'admin') NOT NULL,
        created_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        issued_at DATETIME(3) NOT NULL,
        expires_at DATETIME(3) NOT NULL,
        CONSTRAINT fk_sessions_user FOREIGN KEY (user_id)
          REFERENCES users(id)
          ON DELETE CASCADE
      ) ENGINE=InnoDB
    `);

    await this.pool.query(`
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)
    `);
  }
}
