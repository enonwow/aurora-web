import { MemoryAuthRepository } from "../../src/modules/auth/adapters/outbound/memory/memory-auth.repository";
import { PostgresAuthRepository } from "../../src/modules/auth/adapters/outbound/postgres/postgres-auth.repository";
import type { SessionRecord, UserRecord } from "../../src/modules/auth/domain/auth.types";

describe("Auth repositories", () => {
  const user: UserRecord = {
    id: "user-1",
    username: "builder.user",
    passwordHash: "hash",
    displayName: "Builder User",
    role: "builder",
    createdAt: new Date("2026-05-25T10:00:00.000Z")
  };
  const session: SessionRecord = {
    token: "token-1",
    userId: "user-1",
    issuedAt: new Date("2026-05-25T10:00:00.000Z"),
    expiresAt: new Date("2026-05-25T12:00:00.000Z")
  };

  it("stores and resolves auth data in memory repository", async () => {
    const repository = new MemoryAuthRepository();

    await expect(repository.findUserByUsername(user.username)).resolves.toBeNull();
    await repository.upsertUser(user);
    await repository.upsertUser(user);
    await expect(repository.findUserByUsername(user.username)).resolves.toEqual(user);

    await repository.createSession(session);
    await expect(repository.findSessionWithUserByToken(session.token)).resolves.toEqual({
      session,
      user
    });

    await repository.deleteSession(session.token);
    await expect(repository.findSessionWithUserByToken(session.token)).resolves.toBeNull();
  });

  it("runs CRUD operations through postgres repository db API", async () => {
    const {
      db,
      insertValuesMock,
      deleteWhereMock,
      selectLimitMock
    } = createDatabaseMock();

    const repository = new PostgresAuthRepository({ db } as any);
    selectLimitMock
      .mockResolvedValueOnce([]) // upsertUser -> findUserByUsername
      .mockResolvedValueOnce([
        {
          id: user.id,
          username: user.username,
          passwordHash: user.passwordHash,
          displayName: user.displayName,
          role: user.role,
          createdAt: user.createdAt
        }
      ]) // direct findUserByUsername
      .mockResolvedValueOnce([
        {
          token: session.token,
          userId: session.userId,
          issuedAt: session.issuedAt,
          expiresAt: session.expiresAt,
          id: user.id,
          username: user.username,
          passwordHash: user.passwordHash,
          displayName: user.displayName,
          role: user.role,
          createdAt: user.createdAt
        }
      ]); // findSessionWithUserByToken

    await expect(repository.upsertUser(user)).resolves.toEqual(user);
    await expect(repository.findUserByUsername(user.username)).resolves.toEqual(user);

    await repository.createSession(session);
    await expect(repository.findSessionWithUserByToken(session.token)).resolves.toEqual({
      session,
      user
    });
    await repository.deleteSession(session.token);

    expect(insertValuesMock).toHaveBeenCalledTimes(2);
    expect(deleteWhereMock).toHaveBeenCalledTimes(1);
  });

  it("returns existing user without inserting in postgres repository", async () => {
    const { db, insertValuesMock, selectLimitMock } = createDatabaseMock();
    selectLimitMock.mockResolvedValueOnce([
      {
        id: user.id,
        username: user.username,
        passwordHash: user.passwordHash,
        displayName: user.displayName,
        role: user.role,
        createdAt: user.createdAt
      }
    ]);

    const repository = new PostgresAuthRepository({ db } as any);
    await expect(repository.upsertUser(user)).resolves.toEqual(user);
    expect(insertValuesMock).not.toHaveBeenCalled();
  });
});

function createDatabaseMock() {
  const insertValuesMock = jest.fn().mockResolvedValue(undefined);
  const insertMock = jest.fn().mockReturnValue({
    values: insertValuesMock
  });

  const selectLimitMock = jest.fn();
  const selectWhereMock = jest.fn().mockReturnValue({
    limit: selectLimitMock
  });
  const selectInnerWhereMock = jest.fn().mockReturnValue({
    limit: selectLimitMock
  });
  const selectInnerJoinMock = jest.fn().mockReturnValue({
    where: selectInnerWhereMock
  });
  const selectFromMock = jest.fn().mockReturnValue({
    where: selectWhereMock,
    innerJoin: selectInnerJoinMock
  });
  const selectMock = jest.fn().mockReturnValue({
    from: selectFromMock
  });

  const deleteWhereMock = jest.fn().mockResolvedValue(undefined);
  const deleteMock = jest.fn().mockReturnValue({
    where: deleteWhereMock
  });

  const db = {
    insert: insertMock,
    select: selectMock,
    delete: deleteMock
  };

  return {
    db,
    insertValuesMock,
    deleteWhereMock,
    selectLimitMock
  };
}
