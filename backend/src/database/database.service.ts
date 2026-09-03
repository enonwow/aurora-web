import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import * as mysql from "mysql2/promise";
import { AppConfigService } from "../common/config/app-config.service";
import * as schema from "./schema";

export interface DatabaseTransaction {
  query<T = unknown[]>(statement: string, params?: unknown[]): Promise<T>;
}

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

  async withTransaction<T>(
    operation: (transaction: DatabaseTransaction) => Promise<T>
  ): Promise<T> {
    if (!this.initialized) {
      throw new Error("DatabaseService is not initialized.");
    }
    const connection = await this.pool.getConnection();
    let began = false;
    try {
      await connection.beginTransaction();
      began = true;
      const transaction: DatabaseTransaction = {
        query: async <TResult = unknown[]>(
          statement: string,
          params: unknown[] = []
        ): Promise<TResult> => {
          const [rows] = await connection.query(statement, params);
          return rows as TResult;
        }
      };
      const result = await operation(transaction);
      await connection.commit();
      return result;
    } catch (error) {
      if (began) {
        try {
          await connection.rollback();
        } catch (rollbackError) {
          throw new AggregateError(
            [error, rollbackError],
            "Database transaction failed and rollback also failed."
          );
        }
      }
      throw error;
    } finally {
      connection.release();
    }
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

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS system_maintenance (
        singleton_id TINYINT PRIMARY KEY,
        state ENUM('idle', 'preflight', 'rebuilding', 'publishing', 'failed') NOT NULL,
        operation_id VARCHAR(64) NULL,
        idempotency_key VARCHAR(128) NULL,
        lease_owner VARCHAR(64) NULL,
        phase VARCHAR(128) NOT NULL,
        triggered_by VARCHAR(128) NULL,
        started_at DATETIME(3) NULL,
        updated_at DATETIME(3) NOT NULL,
        fencing_token BIGINT NOT NULL DEFAULT 0,
        candidate_runtime_fingerprint VARCHAR(64) NULL,
        active_runtime_fingerprint VARCHAR(64) NULL,
        staging_generation VARCHAR(64) NULL,
        active_generation VARCHAR(64) NULL,
        previous_generation VARCHAR(64) NULL,
        candidate_settings_json JSON NULL,
        previous_settings_json JSON NULL,
        participants_json JSON NOT NULL,
        audit_json JSON NOT NULL,
        error_code VARCHAR(128) NULL,
        error_message TEXT NULL
      ) ENGINE=InnoDB
    `);
    await this.ensureColumnExists(
      "system_maintenance",
      "lease_owner",
      "VARCHAR(64) NULL AFTER idempotency_key"
    );
    await this.ensureColumnExists(
      "system_maintenance",
      "audit_json",
      "JSON NULL AFTER participants_json"
    );

    await this.pool.query(`
      INSERT IGNORE INTO system_maintenance (
        singleton_id,
        state,
        phase,
        updated_at,
        fencing_token,
        participants_json,
        audit_json
      ) VALUES (1, 'idle', 'idle', UTC_TIMESTAMP(3), 0, JSON_ARRAY(), JSON_ARRAY())
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS area_create_module_locks (
        module_id VARCHAR(128) PRIMARY KEY,
        lease_id VARCHAR(64) NULL,
        owner_transaction_id VARCHAR(64) NULL,
        fencing_token BIGINT UNSIGNED NOT NULL DEFAULT 0,
        lease_expires_at DATETIME(3) NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS area_create_transactions (
        transaction_id VARCHAR(64) PRIMARY KEY,
        module_id VARCHAR(128) NOT NULL,
        actor_id VARCHAR(128) NOT NULL,
        idempotency_key VARCHAR(128) NOT NULL,
        command_hash CHAR(64) NOT NULL,
        expected_module_revision VARCHAR(256) NOT NULL,
        profile_id VARCHAR(128) NOT NULL,
        profile_fingerprint_sha256 CHAR(64) NOT NULL,
        set_fingerprint_sha256 CHAR(64) NOT NULL,
        draft_revision BIGINT UNSIGNED NOT NULL,
        draft_normalized_sha256 CHAR(64) NOT NULL,
        lease_id VARCHAR(64) NOT NULL,
        fencing_token BIGINT UNSIGNED NOT NULL,
        state ENUM(
          'prepared',
          'staged',
          'resources_committed',
          'ifo_committed',
          'readback_verified',
          'complete',
          'compensation_pending',
          'compensated',
          'quarantine_required'
        ) NOT NULL,
        candidate_manifest_json JSON NOT NULL,
        receipt_json JSON NULL,
        diagnostics_json JSON NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB
    `);
    await this.ensureColumnExists(
      "area_create_transactions",
      "receipt_json",
      "JSON NULL AFTER candidate_manifest_json"
    );
    await this.ensureIndexExists(
      "area_create_transactions",
      "idx_area_create_transactions_module_state",
      ["module_id", "state"]
    );
    await this.ensureIndexExists(
      "area_create_transactions",
      "idx_area_create_transactions_recovery",
      ["state", "created_at"]
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS area_create_idempotency (
        module_id VARCHAR(128) NOT NULL,
        idempotency_key VARCHAR(128) NOT NULL,
        command_hash CHAR(64) NOT NULL,
        transaction_id VARCHAR(64) NOT NULL,
        result_json JSON NOT NULL,
        created_at DATETIME(3) NOT NULL,
        expires_at DATETIME(3) NOT NULL,
        PRIMARY KEY (module_id, idempotency_key)
      ) ENGINE=InnoDB
    `);
    await this.ensureIndexExists(
      "area_create_idempotency",
      "idx_area_create_idempotency_expires_at",
      ["expires_at"]
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS area_lifecycle_mutation_transactions (
        transaction_id VARCHAR(64) PRIMARY KEY,
        operation VARCHAR(32) NOT NULL,
        module_id VARCHAR(128) NOT NULL,
        area_resref VARCHAR(16) NOT NULL,
        actor_id VARCHAR(128) NOT NULL,
        idempotency_key VARCHAR(128) NOT NULL,
        command_hash CHAR(64) NOT NULL,
        expected_module_revision CHAR(64) NOT NULL,
        draft_revision BIGINT UNSIGNED NULL,
        draft_normalized_sha256 CHAR(64) NULL,
        lease_id VARCHAR(64) NOT NULL,
        fencing_token BIGINT UNSIGNED NOT NULL,
        state ENUM(
          'prepared',
          'staged',
          'resources_committed',
          'ifo_committed',
          'readback_verified',
          'complete',
          'compensation_pending',
          'compensated',
          'quarantine_required'
        ) NOT NULL,
        operation_metadata_json JSON NOT NULL,
        candidate_manifest_json JSON NOT NULL,
        receipt_json JSON NULL,
        diagnostics_json JSON NOT NULL,
        created_at DATETIME(3) NOT NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB
    `);
    await this.ensureIndexExists(
      "area_lifecycle_mutation_transactions",
      "idx_area_lifecycle_mutation_module_state",
      ["module_id", "state"]
    );
    await this.ensureIndexExists(
      "area_lifecycle_mutation_transactions",
      "idx_area_lifecycle_mutation_recovery",
      ["operation", "state", "created_at"]
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS area_lifecycle_mutation_idempotency (
        operation VARCHAR(32) NOT NULL,
        module_id VARCHAR(128) NOT NULL,
        idempotency_key VARCHAR(128) NOT NULL,
        command_hash CHAR(64) NOT NULL,
        transaction_id VARCHAR(64) NOT NULL,
        result_json JSON NOT NULL,
        created_at DATETIME(3) NOT NULL,
        expires_at DATETIME(3) NOT NULL,
        PRIMARY KEY (operation, module_id, idempotency_key)
      ) ENGINE=InnoDB
    `);
    await this.ensureIndexExists(
      "area_lifecycle_mutation_idempotency",
      "idx_area_lifecycle_mutation_idempotency_expires_at",
      ["expires_at"]
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS module_snapshot_heads (
        module_id VARCHAR(128) PRIMARY KEY,
        schema_version VARCHAR(64) NOT NULL,
        revision CHAR(64) NOT NULL,
        manifest_key VARCHAR(1024) NOT NULL,
        manifest_sha256 CHAR(64) NOT NULL,
        quarantined TINYINT(1) NOT NULL DEFAULT 0,
        fencing_token BIGINT UNSIGNED NOT NULL DEFAULT 0,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS area_create_snapshot_stages (
        transaction_id VARCHAR(64) PRIMARY KEY,
        schema_version VARCHAR(64) NOT NULL,
        module_id VARCHAR(128) NOT NULL,
        lease_id VARCHAR(64) NOT NULL,
        fencing_token BIGINT UNSIGNED NOT NULL,
        base_revision CHAR(64) NOT NULL,
        base_manifest_key VARCHAR(1024) NOT NULL,
        base_manifest_sha256 CHAR(64) NOT NULL,
        successor_revision CHAR(64) NOT NULL,
        successor_manifest_key VARCHAR(1024) NOT NULL,
        successor_manifest_sha256 CHAR(64) NOT NULL,
        candidate_logical_keys_json JSON NOT NULL,
        created_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB
    `);
    await this.ensureIndexExists(
      "area_create_snapshot_stages",
      "idx_area_create_snapshot_stages_module",
      ["module_id"]
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS module_snapshot_quarantines (
        module_id VARCHAR(128) PRIMARY KEY,
        transaction_id VARCHAR(64) NOT NULL,
        diagnostics_json JSON NOT NULL,
        updated_at DATETIME(3) NOT NULL
      ) ENGINE=InnoDB
    `);

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS area_drafts (
        actor_id VARCHAR(128) NOT NULL,
        draft_id VARCHAR(128) NOT NULL,
        title VARCHAR(255) NOT NULL,
        revision BIGINT UNSIGNED NOT NULL,
        updated_at DATETIME(3) NOT NULL,
        normalized_sha256 CHAR(64) NOT NULL,
        source_json JSON NOT NULL,
        document_json JSON NOT NULL,
        PRIMARY KEY (actor_id, draft_id)
      ) ENGINE=InnoDB
    `);
    await this.ensureIndexExists(
      "area_drafts",
      "idx_area_drafts_actor_updated",
      ["actor_id", "updated_at", "draft_id"]
    );

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS area_draft_idempotency (
        actor_id VARCHAR(128) NOT NULL,
        draft_id VARCHAR(128) NOT NULL,
        idempotency_key VARCHAR(128) NOT NULL,
        operation ENUM('save', 'delete') NOT NULL,
        command_hash CHAR(64) NOT NULL,
        result_json JSON NOT NULL,
        created_at DATETIME(3) NOT NULL,
        PRIMARY KEY (actor_id, draft_id, idempotency_key)
      ) ENGINE=InnoDB
    `);
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

  private async ensureColumnExists(
    tableName: string,
    columnName: string,
    definition: string
  ): Promise<void> {
    const [rows] = await this.pool.query<mysql.RowDataPacket[]>(
      `
        SELECT 1 AS column_exists
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = ?
          AND column_name = ?
        LIMIT 1
      `,
      [tableName, columnName]
    );
    if (rows.length > 0) {
      return;
    }
    const table = this.quoteIdentifier(tableName);
    const column = this.quoteIdentifier(columnName);
    await this.pool.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  private quoteIdentifier(value: string): string {
    return `\`${value.replace(/`/gu, "``")}\``;
  }
}
