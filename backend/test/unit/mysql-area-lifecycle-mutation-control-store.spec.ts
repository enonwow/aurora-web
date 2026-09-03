import { MySqlAreaLifecycleMutationControlStore } from "../../src/modules/areas/adapters/outbound/mysql/mysql-area-lifecycle-mutation-control-store";
import { createAreaCreateIdempotencyEntry } from "../../src/modules/areas/domain/area-create-idempotency";
import type { DatabaseTransaction } from "../../src/database/database.service";
import type {
  AreaUpdateJournalRecord,
  AreaUpdateReceipt,
} from "../../src/modules/areas/domain/area-update-transaction.types";
import { areaTileProductionAdmissionFixture } from "./helpers/area-tile-production-admission-fixture";

describe("MySQL Area lifecycle mutation control store", () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date("2026-08-12T12:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("begins an Update with bounded metadata and a byte-free candidate manifest", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (
        statement.includes("FROM area_lifecycle_mutation_transactions") &&
        statement.includes("transaction_id = ?")
      ) return [];
      if (statement.includes("INSERT INTO area_lifecycle_mutation_transactions")) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaLifecycleMutationControlStore(database as any);

    await store.begin(journalRecord());

    const insert = database.transactionQuery.mock.calls.find(([statement]) =>
      String(statement).includes("INSERT INTO area_lifecycle_mutation_transactions"),
    );
    expect(insert).toBeDefined();
    expect(insert?.[1]).toEqual(expect.arrayContaining(["area_update", "crypt01"]));
    const jsonArguments = (insert?.[1] ?? []).filter((value) => typeof value === "string");
    expect(jsonArguments.some((value) => value.includes('"sourceAreaSha256"'))).toBe(true);
    expect(jsonArguments.some((value) => value.includes('"areaId":"crypt01"'))).toBe(true);
    expect(jsonArguments.some((value) =>
      value.includes('"policyVersion":"area-tile-production-admission-policy.v1"')
    )).toBe(true);
    expect(JSON.stringify(jsonArguments)).not.toContain("are-bytes");
    expect(JSON.stringify(jsonArguments)).not.toContain("ifo-before");
    expect(JSON.stringify(jsonArguments)).not.toContain("ifo-after");
  });

  it("records verified readback with one fenced compare-and-set", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "ifo_committed", receipt_json: null })];
      }
      if (statement.includes("UPDATE area_lifecycle_mutation_transactions")) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaLifecycleMutationControlStore(database as any);
    const verified = receipt("update-1");

    await store.recordReadback("update-1", lease(), verified);

    expect(database.transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining("receipt_json = ?"),
      [JSON.stringify(verified), "update-1", "module:a", "lease-1", 3],
    );
  });

  it("rejects Update readback bound to a different certified tile set", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "ifo_committed", receipt_json: null })];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaLifecycleMutationControlStore(database as any);
    const verified = receipt("update-1");

    await expect(store.recordReadback("update-1", lease(), {
      ...verified,
      tileProductionAdmission: {
        ...verified.tileProductionAdmission,
        tileIdSetSha256: "0".repeat(64),
      },
    })).rejects.toThrow("AREA_UPDATE_READBACK_CONFLICT");
  });

  it("atomically retains idempotency before completing a verified journal", async () => {
    const verified = receipt("update-1");
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "readback_verified", receipt_json: verified })];
      }
      if (statement.includes("FROM area_lifecycle_mutation_idempotency")) return [];
      if (
        statement.includes("INSERT INTO area_lifecycle_mutation_idempotency") ||
        statement.includes("UPDATE area_lifecycle_mutation_transactions")
      ) return { affectedRows: 1 };
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaLifecycleMutationControlStore(database as any);
    const entry = idempotency(verified);

    await store.finalize("update-1", lease(), entry);

    const calls = database.transactionQuery.mock.calls.map(([statement]) => String(statement));
    expect(
      calls.findIndex((sql) => sql.includes("INSERT INTO area_lifecycle_mutation_idempotency")),
    ).toBeLessThan(
      calls.findIndex((sql) => sql.includes("UPDATE area_lifecycle_mutation_transactions")),
    );
    expect(database.withTransaction).toHaveBeenCalledTimes(1);
  });

  it("reads only the area_update idempotency scope", async () => {
    const verified = receipt("update-1");
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_lifecycle_mutation_idempotency")) {
        return [{
          operation: "area_update",
          module_id: "module:a",
          idempotency_key: "update-key-1",
          command_hash: "7".repeat(64),
          transaction_id: "update-1",
          result_json: verified,
          created_at: "2026-08-12 12:00:00.000",
        }];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaLifecycleMutationControlStore(database as any);

    await expect(store.read("module:a", "update-key-1")).resolves.toEqual(
      idempotency(verified),
    );
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining("operation = 'area_update'"),
      ["module:a", "update-key-1"],
    );
  });

  it("lists expired Update journals only and maps their durable metadata", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "staged" })];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaLifecycleMutationControlStore(database as any);

    const rows = await store.listRecoverable(10);

    expect(rows).toEqual([
      expect.objectContaining({
        transactionId: "update-1",
        areaResRef: "crypt01",
        sourceAreaSha256: "a".repeat(64),
        candidateAreaSha256: "b".repeat(64),
        state: "staged",
      }),
    ]);
    expect(database.query).toHaveBeenCalledWith(
      expect.stringContaining("operation = 'area_update'"),
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
  return { query, transactionQuery, withTransaction };
}

function lockRow() {
  return {
    module_id: "module:a",
    lease_id: "lease-1",
    owner_transaction_id: "update-1",
    fencing_token: 3,
    lease_expires_at: "2026-08-12 12:00:30.000",
    updated_at: "2026-08-12 12:00:00.000",
  };
}

function journalRow(overrides: Record<string, unknown> = {}) {
  return {
    transaction_id: "update-1",
    operation: "area_update",
    module_id: "module:a",
    area_resref: "crypt01",
    actor_id: "actor-1",
    idempotency_key: "update-key-1",
    command_hash: "7".repeat(64),
    expected_module_revision: "1".repeat(64),
    draft_revision: 3,
    draft_normalized_sha256: "d".repeat(64),
    lease_id: "lease-1",
    fencing_token: 3,
    state: "prepared",
    operation_metadata_json: {
      sourceAreaSha256: "a".repeat(64),
      candidateAreaSha256: "b".repeat(64),
      setFingerprintSha256: "e".repeat(64),
    },
    candidate_manifest_json: {
      areaId: "crypt01",
      tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
      resources: [],
      moduleIfo: {
        key: "module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineSize: 3,
        baselineSha256: "9".repeat(64),
        candidateSize: 3,
        candidateSha256: "9".repeat(64),
      },
    },
    receipt_json: null,
    diagnostics_json: [],
    created_at: "2026-08-12 12:00:00.000",
    updated_at: "2026-08-12 12:00:00.000",
    ...overrides,
  };
}

function lease() {
  return {
    moduleId: "module:a",
    leaseId: "lease-1",
    ownerTransactionId: "update-1",
    fencingToken: 3,
    expiresAt: "2026-08-12T12:00:30.000Z",
  };
}

function journalRecord(): AreaUpdateJournalRecord {
  return {
    transactionId: "update-1",
    moduleId: "module:a",
    areaResRef: "crypt01",
    actorId: "actor-1",
    idempotencyKey: "update-key-1",
    commandHash: "7".repeat(64),
    expectedModuleRevision: "1".repeat(64),
    sourceAreaSha256: "a".repeat(64),
    candidateAreaSha256: "b".repeat(64),
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
    draftRevision: 3,
    draftNormalizedSha256: "d".repeat(64),
    leaseId: "lease-1",
    fencingToken: 3,
    candidate: {
      areaId: "crypt01",
      sourceAreaSha256: "a".repeat(64),
      candidateAreaSha256: "b".repeat(64),
      setFingerprintSha256: "e".repeat(64),
      projectedDraft: {
        areaResRef: "crypt01",
        name: "Crypt",
        width: 2,
        height: 2,
        tilesetResRef: "tin01",
        tilesetFingerprint: "e".repeat(64),
        areaFingerprint: "a".repeat(64),
        tiles: [],
      },
      unchangedCompanions: {
        gitSha256: "c".repeat(64),
        gicSha256: "f".repeat(64),
        moduleIfoSha256: "9".repeat(64),
      },
      resources: [{
        extension: "are",
        key: "crypt01.are",
        fileName: "crypt01.are",
        resourceType: 2012,
        bytes: Buffer.from("are-bytes"),
        size: 9,
        sha256: "b".repeat(64),
      }],
      moduleIfo: {
        key: "module.ifo",
        fileName: "module.ifo",
        resourceType: 2014,
        baselineBytes: Buffer.from("ifo-before"),
        baselineSha256: "9".repeat(64),
        candidateBytes: Buffer.from("ifo-after"),
        candidateSha256: "9".repeat(64),
      },
    },
    createdAt: "2026-08-12T12:00:00.000Z",
  };
}

function idempotency(result: AreaUpdateReceipt) {
  return createAreaCreateIdempotencyEntry({
    moduleId: "module:a",
    key: "update-key-1",
    commandHash: "7".repeat(64),
    createdAt: "2026-08-12T12:00:00.000Z",
    result,
  });
}

function receipt(transactionId: string): AreaUpdateReceipt {
  return {
    schemaVersion: "area-update-receipt.v1",
    transactionId,
    areaResRef: "crypt01",
    moduleId: "module:a",
    previousModuleRevision: "1".repeat(64),
    newModuleRevision: "2".repeat(64),
    sourceAreaSha256: "a".repeat(64),
    candidateAreaSha256: "b".repeat(64),
    draft: { id: "draft-1", revision: 3, normalizedSha256: "d".repeat(64) },
    setFingerprintSha256: "e".repeat(64),
    tileProductionAdmission: areaTileProductionAdmissionFixture("tin01"),
    commandHash: "7".repeat(64),
    validatorVersion: "validator-v1",
    resources: [],
    moduleIfo: { key: "module.ifo", size: 3, sha256: "9".repeat(64) },
    unchangedCompanions: {
      gitSha256: "c".repeat(64),
      gicSha256: "f".repeat(64),
      moduleIfoSha256: "9".repeat(64),
    },
    readbackStatus: "verified",
    warnings: [],
    updatedAt: "2026-08-12T12:00:00.000Z",
  };
}
