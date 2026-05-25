describe("DatabaseService", () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it("skips initialization when auth repository driver is memory", async () => {
    const sqlClient = createSqlClientMock();
    const postgresMock = jest.fn().mockReturnValue(sqlClient);
    const drizzleMock = jest.fn().mockReturnValue({ marker: "db" });

    jest.doMock("postgres", () => postgresMock);
    jest.doMock("drizzle-orm/postgres-js", () => ({
      drizzle: drizzleMock
    }));

    const { DatabaseService } = require("../../src/database/database.service");
    const service = new DatabaseService({
      authRepositoryDriver: "memory",
      databaseUrl: "postgres://unused"
    });

    await service.onModuleInit();

    expect(postgresMock).not.toHaveBeenCalled();
    await service.onModuleDestroy();
    expect(sqlClient.end).not.toHaveBeenCalled();
    expect(() => service.db).toThrow("DatabaseService is not initialized.");
  });

  it("initializes postgres client, ensures schema and shuts down", async () => {
    const sqlClient = createSqlClientMock();
    const postgresMock = jest.fn().mockReturnValue(sqlClient);
    const db = { marker: "db" };
    const drizzleMock = jest.fn().mockReturnValue(db);

    jest.doMock("postgres", () => postgresMock);
    jest.doMock("drizzle-orm/postgres-js", () => ({
      drizzle: drizzleMock
    }));

    const { DatabaseService } = require("../../src/database/database.service");
    const service = new DatabaseService({
      authRepositoryDriver: "postgres",
      databaseUrl: "postgres://aurora:aurora@localhost:5432/aurora"
    });

    await service.onModuleInit();

    expect(postgresMock).toHaveBeenCalledWith(
      "postgres://aurora:aurora@localhost:5432/aurora",
      expect.objectContaining({
        max: 10,
        prepare: false
      })
    );
    expect(drizzleMock).toHaveBeenCalledTimes(1);
    expect(sqlClient).toHaveBeenCalledTimes(3);
    expect(service.db).toBe(db);

    await service.onModuleDestroy();
    expect(sqlClient.end).toHaveBeenCalledWith({ timeout: 5 });
  });
});

function createSqlClientMock() {
  const sqlClient = jest.fn().mockResolvedValue(undefined) as jest.Mock & {
    end: jest.Mock;
  };
  sqlClient.end = jest.fn().mockResolvedValue(undefined);
  return sqlClient;
}
