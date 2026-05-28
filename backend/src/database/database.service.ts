import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
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

  async query<T = unknown[]>(statement: string, params: unknown[] = []): Promise<T> {
    if (!this.initialized) {
      throw new Error("DatabaseService is not initialized.");
    }

    const [rows] = await this.pool.query(statement, params);
    return rows as T;
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

    await this.ensureIndexExists("sessions", "idx_sessions_user_id", ["user_id"]);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS processing_jobs (
        job_id VARCHAR(64) PRIMARY KEY,
        status ENUM('queued', 'running', 'completed', 'failed', 'cancelled') NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        started_at DATETIME(3) NULL,
        finished_at DATETIME(3) NULL,
        triggered_by VARCHAR(128) NOT NULL,
        task VARCHAR(64) NOT NULL,
        target_id VARCHAR(128) NOT NULL,
        options_json JSON NOT NULL,
        idempotency_key VARCHAR(128) NULL,
        trace_id VARCHAR(128) NULL,
        attempt_count INT NOT NULL DEFAULT 0,
        max_attempts INT NOT NULL DEFAULT 3,
        publish_count INT NOT NULL DEFAULT 0,
        last_published_at DATETIME(3) NULL,
        next_retry_at DATETIME(3) NULL,
        cancel_requested TINYINT(1) NOT NULL DEFAULT 0,
        cancelled_at DATETIME(3) NULL,
        cancelled_by VARCHAR(128) NULL,
        cancelled_reason TEXT NULL,
        result_json JSON NULL,
        error_json JSON NULL,
        CONSTRAINT ux_processing_jobs_idempotency_key UNIQUE (idempotency_key)
      ) ENGINE=InnoDB
    `);

    await this.ensureIndexExists("processing_jobs", "idx_processing_jobs_status_created_at", [
      "status",
      "created_at"
    ]);

    await this.ensureIndexExists("processing_jobs", "idx_processing_jobs_status_retry", [
      "status",
      "next_retry_at"
    ]);
  }

  private async ensureIndexExists(
    tableName: string,
    indexName: string,
    columns: readonly string[]
  ): Promise<void> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `
        SELECT 1 AS index_exists
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = ?
          AND index_name = ?
        LIMIT 1
      `,
      [tableName, indexName]
    );

    if (rows.length > 0) {
      return;
    }

    const table = this.quoteIdentifier(tableName);
    const index = this.quoteIdentifier(indexName);
    const columnList = columns.map((columnName) => this.quoteIdentifier(columnName)).join(", ");
    await this.pool.query(`CREATE INDEX ${index} ON ${table} (${columnList})`);
  }

  private quoteIdentifier(value: string): string {
    return `\`${value.replace(/`/gu, "``")}\``;
  }
}
