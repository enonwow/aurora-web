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
    expect(pool.query).toHaveBeenCalledTimes(9);
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
    expect(pool.query).toHaveBeenCalledWith("CREATE INDEX `idx_sessions_user_id` ON `sessions` (`user_id`)");
    expect(pool.query).toHaveBeenCalledWith(
      "CREATE INDEX `idx_processing_jobs_status_created_at` ON `processing_jobs` (`status`, `created_at`)"
    );
    expect(pool.query).toHaveBeenCalledWith(
      "CREATE INDEX `idx_processing_jobs_status_retry` ON `processing_jobs` (`status`, `next_retry_at`)"
    );
    expect(service.db).toBe(db);

    await service.onModuleDestroy();
    expect(pool.end).toHaveBeenCalledTimes(1);
  });
});

function createPoolMock() {
  const pool = {
    query: jest.fn().mockImplementation((statement: string) => {
      if (statement.includes("FROM information_schema.statistics")) {
        return Promise.resolve([[], undefined]);
      }
      return Promise.resolve([undefined, undefined]);
    }),
    end: jest.fn().mockResolvedValue(undefined)
  } as {
    query: jest.Mock;
    end: jest.Mock;
  };
  return pool;
}
