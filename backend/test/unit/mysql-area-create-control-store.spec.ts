import {
  MySqlAreaCreateControlStore,
} from "../../src/modules/areas/adapters/outbound/mysql/mysql-area-create-control-store";
import {
  createAreaCreateIdempotencyEntry,
} from "../../src/modules/areas/domain/area-create-idempotency";
import type {
  DatabaseTransaction,
} from "../../src/database/database.service";
import type {
  AreaCreateJournalRecord,
  AreaCreateReceipt,
} from "../../src/modules/areas/domain/area-create-transaction.types";
import { areaTileProductionAdmissionFixture } from "./helpers/area-tile-production-admission-fixture";

describe("MySQL Area Create control store", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-07T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("acquires a missing lock transactionally with the first fencing token", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [];
      if (statement.includes("FROM area_create_transactions")) return [];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) return [];
      if (statement.includes("INSERT INTO area_create_module_locks")) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);

    const lease = await store.acquire("module:a", "transaction-1");

    expect(lease).toEqual(
      expect.objectContaining({
        moduleId: "module:a",
        ownerTransactionId: "transaction-1",
        fencingToken: 1,
        expiresAt: "2026-08-07T12:00:30.000Z",
      }),
    );
    expect(database.withTransaction).toHaveBeenCalledTimes(1);
    expect(database.transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining("FOR UPDATE"),
      ["module:a"],
    );
  });

  it("denies a normal writer when an expired owner has an unresolved journal", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ lease_expires_at: "2026-08-07 11:59:59.000" })];
      }
      if (statement.includes("FROM area_create_transactions")) {
        return [{ transaction_id: "transaction-1", state: "staged" }];
      }
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) return [];
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);

    await expect(store.acquire("module:a", "transaction-2")).resolves.toBeNull();
    expect(database.transactionQuery).not.toHaveBeenCalledWith(
      expect.stringContaining("UPDATE area_create_module_locks"),
      expect.anything(),
    );
  });

  it("allows only exact recovery takeover and advances the journal fencing identity", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ fencing_token: 7, lease_expires_at: "2026-08-07 11:59:59.000" })];
      }
      if (statement.includes("FROM area_create_transactions")) {
        return [{ transaction_id: "transaction-1", state: "staged" }];
      }
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) return [];
      if (
        statement.includes("UPDATE area_create_module_locks") ||
        statement.includes("UPDATE area_create_transactions")
      ) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);

    const lease = await store.acquire("module:a", "recovery-1", {
      recoveryOfTransactionId: "transaction-1",
    });

    expect(lease).toEqual(
      expect.objectContaining({
        ownerTransactionId: "transaction-1",
        fencingToken: 8,
      }),
    );
    expect(database.transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE area_create_transactions"),
      expect.arrayContaining([expect.any(String), 8, "transaction-1", "module:a"]),
    );
  });

  it("denies Create when an Area lifecycle mutation journal is unresolved", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ lease_expires_at: "2026-08-07 11:59:59.000" })];
      }
      if (statement.includes("FROM area_create_transactions")) return [];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [{ transaction_id: "update-1", state: "staged" }];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);

    await expect(store.acquire("module:a", "create-2")).resolves.toBeNull();
  });

  it("transfers exact recovery fencing to the owning lifecycle mutation table", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ fencing_token: 7, lease_expires_at: "2026-08-07 11:59:59.000" })];
      }
      if (statement.includes("FROM area_create_transactions")) return [];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [{ transaction_id: "update-1", state: "staged" }];
      }
      if (
        statement.includes("UPDATE area_create_module_locks") ||
        statement.includes("UPDATE area_lifecycle_mutation_transactions")
      ) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);

    const lease = await store.acquire("module:a", "recovery-1", {
      recoveryOfTransactionId: "update-1",
    });

    expect(lease).toEqual(expect.objectContaining({ ownerTransactionId: "update-1", fencingToken: 8 }));
    expect(database.transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining("UPDATE area_lifecycle_mutation_transactions"),
      expect.arrayContaining([expect.any(String), 8, "update-1", "module:a"]),
    );
  });

  it("releases only the exact unexpired lease and fencing token", async () => {
    const database = scriptedDatabase(() => ({ affectedRows: 1 }));
    const store = new MySqlAreaCreateControlStore(database as any);

    await expect(store.release(leaseFixture())).resolves.toBe(true);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining("fencing_token = ?"),
      ["module:a", "lease-1", "transaction-1", 3],
    );
  });

  it("begins with a byte-free manifest only after locking the exact lease", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ fencing_token: 3 })];
      }
      if (statement.includes("FROM area_create_transactions") && statement.includes("transaction_id = ?")) {
        return [];
      }
      if (statement.includes("INSERT INTO area_create_transactions")) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);

    await store.begin(journalRecord());

    const insertCall = database.transactionQuery.mock.calls.find(([statement]) =>
      String(statement).includes("INSERT INTO area_create_transactions"),
    );
    expect(insertCall).toBeDefined();
    const serializedManifest = String(insertCall?.[1]?.find((value: unknown) =>
      typeof value === "string" && value.includes('"areaId":"area_new"'),
    ));
    expect(serializedManifest).toContain('"baselineSize":6');
    expect(serializedManifest).toContain(
      '"policyVersion":"area-tile-production-admission-policy.v1"',
    );
    expect(serializedManifest).not.toContain("before");
    expect(serializedManifest).not.toContain("after");
    expect(serializedManifest).not.toContain('"data"');
  });

  it("atomically inserts idempotency and completes only a readback-verified journal", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ fencing_token: 3 })];
      }
      if (statement.includes("FROM area_create_transactions")) {
        return [
          journalRow({
            state: "readback_verified",
            receipt_json: receipt("transaction-1", "a".repeat(64)),
          }),
        ];
      }
      if (statement.includes("FROM area_create_idempotency")) return [];
      if (
        statement.includes("INSERT INTO area_create_idempotency") ||
        statement.includes("UPDATE area_create_transactions")
      ) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);
    const entry = idempotencyEntry("a".repeat(64));

    await store.finalize("transaction-1", leaseFixture(), entry);

    const calls = database.transactionQuery.mock.calls.map(([statement]) => String(statement));
    expect(calls.findIndex((sql) => sql.includes("INSERT INTO area_create_idempotency"))).toBeLessThan(
      calls.findIndex((sql) => sql.includes("UPDATE area_create_transactions")),
    );
    expect(database.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("atomically records the verified receipt with the readback journal state", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ fencing_token: 3 })];
      }
      if (statement.includes("FROM area_create_transactions")) {
        return [journalRow({ state: "ifo_committed", receipt_json: null })];
      }
      if (statement.includes("UPDATE area_create_transactions")) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);
    const verifiedReceipt = receipt("transaction-1", "a".repeat(64));

    await store.recordReadback("transaction-1", leaseFixture(), verifiedReceipt);

    expect(database.transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining("receipt_json = ?"),
      [
        JSON.stringify(verifiedReceipt),
        "transaction-1",
        "module:a",
        "lease-1",
        3,
      ],
    );
  });

  it("rejects readback bound to a different tile certification report", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ fencing_token: 3 })];
      }
      if (statement.includes("FROM area_create_transactions")) {
        return [journalRow({ state: "ifo_committed", receipt_json: null })];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);
    const verifiedReceipt = receipt("transaction-1", "a".repeat(64));

    await expect(store.recordReadback("transaction-1", leaseFixture(), {
      ...verifiedReceipt,
      tileProductionAdmission: {
        ...verifiedReceipt.tileProductionAdmission,
        reportSha256: "0".repeat(64),
      },
    })).rejects.toThrow("AREA_CREATE_READBACK_CONFLICT");
  });

  it("rejects a conflicting retained key before changing journal state", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) {
        return [lockRow({ fencing_token: 3 })];
      }
      if (statement.includes("FROM area_create_transactions")) {
        return [
          journalRow({
            state: "readback_verified",
            receipt_json: receipt("transaction-1", "a".repeat(64)),
          }),
        ];
      }
      if (statement.includes("FROM area_create_idempotency")) {
        return [
          {
            module_id: "module:a",
            idempotency_key: "key-1",
            command_hash: "9".repeat(64),
            transaction_id: "transaction-old",
            result_json: receipt("transaction-old", "9".repeat(64)),
            created_at: "2026-08-07 11:00:00.000",
          },
        ];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaCreateControlStore(database as any);

    await expect(
      store.finalize("transaction-1", leaseFixture(), idempotencyEntry("a".repeat(64))),
    ).rejects.toThrow("AREA_CREATE_IDEMPOTENCY_CONFLICT");
    expect(database.transactionQuery).not.toHaveBeenCalledWith(
      expect.stringContaining("UPDATE area_create_transactions"),
      expect.anything(),
    );
  });

  it("lists only expired non-terminal journals in stable recovery order", async () => {
    const database = scriptedDatabase(() => [
      journalRow({ transaction_id: "transaction-1", created_at: "2026-08-07 10:00:00.000" }),
      journalRow({ transaction_id: "transaction-2", created_at: "2026-08-07 11:00:00.000" }),
    ]);
    const store = new MySqlAreaCreateControlStore(database as any);

    const result = await store.listRecoverable(10);

    expect(result.map((entry) => entry.transactionId)).toEqual([
      "transaction-1",
      "transaction-2",
    ]);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining("lease_expires_at <= UTC_TIMESTAMP(3)"),
      [10],
    );
  });
});

function scriptedDatabase(handler: (statement: string, params: unknown[]) => unknown) {
  const transactionQuery = jest.fn(async (statement: string, params: unknown[] = []) =>
    handler(statement, params),
  );
  const query = jest.fn(async (statement: string, params: unknown[] = []) =>
    handler(statement, params),
  );
  const withTransaction = jest.fn(async (operation: (tx: DatabaseTransaction) => Promise<unknown>) =>
    operation({ query: transactionQuery as DatabaseTransaction["query"] }),
  );
  return { query, withTransaction, transactionQuery };
}

function lockRow(overrides: Record<string, unknown> = {}) {
  return {
    module_id: "module:a",
    lease_id: "lease-1",
    owner_transaction_id: "transaction-1",
    fencing_token: 3,
    lease_expires_at: "2026-08-07 12:00:30.000",
    updated_at: "2026-08-07 12:00:00.000",
    ...overrides,
  };
}

function leaseFixture() {
  return {
    moduleId: "module:a",
    leaseId: "lease-1",
    ownerTransactionId: "transaction-1",
    fencingToken: 3,
    expiresAt: "2026-08-07T12:00:30.000Z",
  };
}

function journalRecord(): AreaCreateJournalRecord {
  return {
    transactionId: "transaction-1",
    moduleId: "module:a",
    actorId: "actor-1",
    idempotencyKey: "key-1",
    commandHash: "a".repeat(64),
    expectedModuleRevision: "revision-7",
    profileId: "profile-v1",
    profileFingerprintSha256: "d".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: areaTileProductionAdmissionFixture(),
    draftRevision: 1,
    draftNormalizedSha256: "f".repeat(64),
    leaseId: "lease-1",
    fencingToken: 3,
    candidate: {
      areaId: "area_new",
      resources: [
        {
          extension: "are",
          key: "modules/a/area_new.are",
          fileName: "area_new.are",
          resourceType: 2012,
          bytes: Buffer.from("are"),
          size: 3,
          sha256: "a".repeat(64),
        },
      ],
      moduleIfo: {
        key: "modules/a/module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineBytes: Buffer.from("before"),
        baselineSha256: "b".repeat(64),
        candidateBytes: Buffer.from("after"),
        candidateSha256: "c".repeat(64),
      },
    },
    createdAt: "2026-08-07T12:00:00.000Z",
  };
}

function journalRow(overrides: Record<string, unknown> = {}) {
  return {
    transaction_id: "transaction-1",
    module_id: "module:a",
    actor_id: "actor-1",
    idempotency_key: "key-1",
    command_hash: "a".repeat(64),
    expected_module_revision: "revision-7",
    profile_id: "profile-v1",
    profile_fingerprint_sha256: "d".repeat(64),
    set_fingerprint_sha256: "e".repeat(64),
    draft_revision: 1,
    draft_normalized_sha256: "f".repeat(64),
    lease_id: "lease-1",
    fencing_token: 3,
    state: "staged",
    candidate_manifest_json: {
      areaId: "area_new",
      tileProductionAdmission: areaTileProductionAdmissionFixture(),
      resources: [],
      moduleIfo: {
        key: "module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineSize: 6,
        baselineSha256: "b".repeat(64),
        candidateSize: 5,
        candidateSha256: "c".repeat(64),
      },
    },
    receipt_json: null,
    diagnostics_json: [],
    created_at: "2026-08-07 12:00:00.000",
    updated_at: "2026-08-07 12:00:00.000",
    ...overrides,
  };
}

function idempotencyEntry(commandHash: string) {
  return createAreaCreateIdempotencyEntry({
    moduleId: "module:a",
    key: "key-1",
    commandHash,
    createdAt: "2026-08-07T12:00:00.000Z",
    result: receipt("transaction-1", commandHash),
  });
}

function receipt(transactionId: string, commandHash: string): AreaCreateReceipt {
  return {
    schemaVersion: "area-create-receipt.v1",
    transactionId,
    areaId: "area_new",
    resRef: "area_new",
    name: "Area",
    tag: "Area_Tag",
    moduleId: "module:a",
    previousModuleRevision: "revision-7",
    newModuleRevision: "revision-8",
    profileId: "profile-v1",
    profileFingerprintSha256: "d".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: areaTileProductionAdmissionFixture(),
    draftNormalizedSha256: "f".repeat(64),
    commandHash,
    validatorVersion: "validator-v1",
    resources: [],
    moduleIfo: { key: "module.ifo", size: 1, sha256: "b".repeat(64) },
    readbackStatus: "verified",
    warnings: [],
    createdAt: "2026-08-07T12:00:00.000Z",
  };
}
