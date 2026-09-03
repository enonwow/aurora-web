describe("DatabaseService", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("skips initialization when auth repository driver is memory", async () => {
    const pool = createPoolMock();
    const createPoolMockFn = jest.fn().mockReturnValue(pool);
    const drizzleMock = jest.fn().mockReturnValue({ marker: "db" });

    jest.doMock("mysql2/promise", () => ({
      createPool: createPoolMockFn
    }));
    jest.doMock("drizzle-orm/mysql2", () => ({
      drizzle: drizzleMock
    }));

    const { DatabaseService } = require("../../src/database/database.service");
    const service = new DatabaseService({
      authRepositoryDriver: "memory",
      databaseUrl: "mysql://unused"
    });

    await service.onModuleInit();

    expect(createPoolMockFn).not.toHaveBeenCalled();
    await service.onModuleDestroy();
    expect(pool.end).not.toHaveBeenCalled();
    expect(() => service.db).toThrow("DatabaseService is not initialized.");
  });

  it("initializes mysql pool, ensures schema and shuts down", async () => {
    const pool = createPoolMock();
    const createPoolMockFn = jest.fn().mockReturnValue(pool);
    const db = { marker: "db" };
    const drizzleMock = jest.fn().mockReturnValue(db);

    jest.doMock("mysql2/promise", () => ({
      createPool: createPoolMockFn
    }));
    jest.doMock("drizzle-orm/mysql2", () => ({
      drizzle: drizzleMock
    }));

    const { DatabaseService } = require("../../src/database/database.service");
    const service = new DatabaseService({
      authRepositoryDriver: "mysql",
      databaseUrl: "mysql://aurora:aurora@localhost:3306/aurora"
    });

    await service.onModuleInit();

    expect(createPoolMockFn).toHaveBeenCalledWith(
      expect.objectContaining({
        uri: "mysql://aurora:aurora@localhost:3306/aurora",
        connectionLimit: 10
      })
    );
    expect(drizzleMock).toHaveBeenCalledTimes(1);
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS area_create_module_locks")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS area_create_transactions")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS area_create_idempotency")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS area_lifecycle_mutation_transactions")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS area_lifecycle_mutation_idempotency")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS module_snapshot_heads")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS area_create_snapshot_stages")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS module_snapshot_quarantines")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS area_drafts")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("CREATE TABLE IF NOT EXISTS area_draft_idempotency")
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM information_schema.statistics"),
      ["sessions", "idx_sessions_user_id"]
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM information_schema.statistics"),
      ["processing_jobs", "idx_processing_jobs_status_created_at"]
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM information_schema.statistics"),
      ["processing_jobs", "idx_processing_jobs_status_retry"]
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM information_schema.statistics"),
      ["area_create_snapshot_stages", "idx_area_create_snapshot_stages_module"]
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM information_schema.statistics"),
      ["area_drafts", "idx_area_drafts_actor_updated"]
    );
    expect(pool.query).toHaveBeenCalledWith("CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`)");
    expect(pool.query).toHaveBeenCalledWith(
      "CREATE INDEX `idx_processing_jobs_status_created_at` ON `processing_jobs` (`status`, `created_at`)"
    );
    expect(pool.query).toHaveBeenCalledWith(
      "CREATE INDEX `idx_processing_jobs_status_retry` ON `processing_jobs` (`status`, `next_retry_at`)"
    );
    expect(pool.query).toHaveBeenCalledWith(
      "CREATE INDEX `idx_area_create_snapshot_stages_module` ON `area_create_snapshot_stages` (`module_id`)"
    );
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("FROM information_schema.columns"),
      ["system_maintenance", "lease_owner"]
    );
    expect(pool.query).toHaveBeenCalledWith(
      "ALTER TABLE `system_maintenance` ADD COLUMN `lease_owner` VARCHAR(64) NULL AFTER idempotency_key"
    );
    expect(pool.query).toHaveBeenCalledWith(
      "ALTER TABLE `system_maintenance` ADD COLUMN `audit_json` JSON NULL AFTER participants_json"
    );
    expect(service.db).toBe(db);

    const transactionResult = await service.withTransaction(async (transaction: any) => {
      await transaction.query("UPDATE area_create_transactions SET state = ?", ["complete"]);
      return "committed";
    });
    expect(transactionResult).toBe("committed");
    expect(pool.connection.beginTransaction).toHaveBeenCalledTimes(1);
    expect(pool.connection.query).toHaveBeenCalledWith(
      "UPDATE area_create_transactions SET state = ?",
      ["complete"]
    );
    expect(pool.connection.commit).toHaveBeenCalledTimes(1);
    expect(pool.connection.rollback).not.toHaveBeenCalled();
    expect(pool.connection.release).toHaveBeenCalledTimes(1);

    await service.onModuleDestroy();
    expect(pool.end).toHaveBeenCalledTimes(1);
  });

  it("rolls back and releases a failed database transaction", async () => {
    const pool = createPoolMock();
    jest.doMock("mysql2/promise", () => ({ createPool: jest.fn().mockReturnValue(pool) }));
    jest.doMock("drizzle-orm/mysql2", () => ({ drizzle: jest.fn().mockReturnValue({}) }));
    const { DatabaseService } = require("../../src/database/database.service");
    const service = new DatabaseService({
      authRepositoryDriver: "mysql",
      databaseUrl: "mysql://aurora:aurora@localhost:3306/aurora"
    });
    await service.onModuleInit();

    await expect(
      service.withTransaction(async () => {
        throw new Error("injected transaction failure");
      })
    ).rejects.toThrow("injected transaction failure");
    expect(pool.connection.commit).not.toHaveBeenCalled();
    expect(pool.connection.rollback).toHaveBeenCalledTimes(1);
    expect(pool.connection.release).toHaveBeenCalledTimes(1);
  });
});

function createPoolMock() {
  const connection = {
    beginTransaction: jest.fn().mockResolvedValue(undefined),
    query: jest.fn().mockResolvedValue([{}, undefined]),
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined),
    release: jest.fn()
  };
  const pool = {
    query: jest.fn().mockImplementation((statement: string) => {
      if (statement.includes("FROM information_schema.statistics")) {
        return Promise.resolve([[], undefined]);
      }
      if (statement.includes("FROM information_schema.columns")) {
        return Promise.resolve([[], undefined]);
      }
      return Promise.resolve([undefined, undefined]);
    }),
    getConnection: jest.fn().mockResolvedValue(connection),
    connection,
    end: jest.fn().mockResolvedValue(undefined)
  } as {
    query: jest.Mock;
    getConnection: jest.Mock;
    connection: typeof connection;
    end: jest.Mock;
  };
  return pool;
}
