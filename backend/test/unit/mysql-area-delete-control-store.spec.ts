import { MySqlAreaDeleteControlStore } from "../../src/modules/areas/adapters/outbound/mysql/mysql-area-delete-control-store";
import { createAreaCreateIdempotencyEntry } from "../../src/modules/areas/domain/area-create-idempotency";
import type { DatabaseTransaction } from "../../src/database/database.service";
import type {
  AreaDeleteJournalRecord,
  AreaDeleteReceipt,
} from "../../src/modules/areas/domain/area-delete-transaction.types";

describe("MySQL Area Delete control store", () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(NOW)));
  afterEach(() => jest.useRealTimers());

  it("begins area_delete with bounded metadata and a byte-free recovery manifest", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) return [];
      if (statement.includes("INSERT INTO area_lifecycle_mutation_transactions")) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaDeleteControlStore(database as any);
    await store.begin(journalRecord());

    const insert = database.transactionQuery.mock.calls.find(([statement]) =>
      String(statement).includes("INSERT INTO area_lifecycle_mutation_transactions"));
    expect(insert?.[1]).toEqual(expect.arrayContaining([
      "area_delete", "crypt01", JSON.stringify({ previewSha256: "6".repeat(64) }),
    ]));
    expect(JSON.stringify(insert?.[1])).not.toContain("removed-bytes");
    expect(JSON.stringify(insert?.[1])).not.toContain("ifo-before");
    expect(JSON.stringify(insert?.[1])).not.toContain("ifo-after");
  });

  it("records exact readback and atomically retains idempotency before completion", async () => {
    const verified = receipt();
    let journalState = "ifo_committed";
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({
          state: journalState,
          receipt_json: journalState === "readback_verified" ? verified : null,
        })];
      }
      if (statement.includes("FROM area_lifecycle_mutation_idempotency")) return [];
      if (statement.includes("receipt_json = ?")) {
        journalState = "readback_verified";
        return { affectedRows: 1 };
      }
      if (statement.includes("INSERT INTO area_lifecycle_mutation_idempotency")) {
        return { affectedRows: 1 };
      }
      if (statement.includes("SET state = 'complete'")) return { affectedRows: 1 };
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaDeleteControlStore(database as any);
    await store.recordReadback("delete-1", lease(), verified);
    await store.finalize("delete-1", lease(), idempotency(verified));

    const calls = database.transactionQuery.mock.calls.map(([statement]) => String(statement));
    expect(calls.findIndex((sql) => sql.includes("INSERT INTO area_lifecycle_mutation_idempotency")))
      .toBeLessThan(calls.findIndex((sql) => sql.includes("SET state = 'complete'")));
    expect(calls.every((sql) => !sql.includes("operation = 'area_update'"))).toBe(true);
  });

  it("reads and lists only area_delete rows with durable preview identity", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_lifecycle_mutation_idempotency")) {
        return [{
          operation: "area_delete", module_id: "module:a",
          idempotency_key: "delete-key-1", command_hash: "7".repeat(64),
          transaction_id: "delete-1", result_json: receipt(), created_at: sqlNow(),
        }];
      }
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "staged" })];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaDeleteControlStore(database as any);

    await expect(store.read("module:a", "delete-key-1")).resolves.toEqual(
      idempotency(receipt()),
    );
    await expect(store.listRecoverable(10)).resolves.toEqual([
      expect.objectContaining({
        transactionId: "delete-1", previewSha256: "6".repeat(64), state: "staged",
      }),
    ]);
    for (const [statement] of database.query.mock.calls) {
      expect(String(statement)).toContain("area_delete");
    }
  });

  it("rejects receipt identity drift before a durable mutation", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "ifo_committed" })];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaDeleteControlStore(database as any);
    await expect(store.recordReadback("delete-1", lease(), {
      ...receipt(), survivorCount: 99,
    })).rejects.toThrow("AREA_DELETE_READBACK_CONFLICT");
    expect(database.transactionQuery.mock.calls.some(([statement]) =>
      String(statement).includes("UPDATE area_lifecycle_mutation_transactions"))).toBe(false);
  });
});

const NOW = "2026-08-12T21:30:00.000Z";
const sqlNow = () => "2026-08-12 21:30:00.000";

function scriptedDatabase(handler: (statement: string, params: unknown[]) => unknown) {
  const transactionQuery = jest.fn(async (statement: string, params: unknown[] = []) =>
    handler(statement, params));
  const query = jest.fn(async (statement: string, params: unknown[] = []) =>
    handler(statement, params));
  const withTransaction = jest.fn(async (operation: (tx: DatabaseTransaction) => Promise<unknown>) =>
    operation({ query: transactionQuery as DatabaseTransaction["query"] }));
  return { query, transactionQuery, withTransaction };
}

function lockRow() {
  return {
    module_id: "module:a", lease_id: "lease-1", owner_transaction_id: "delete-1",
    fencing_token: 3, lease_expires_at: "2026-08-12 21:30:30.000",
  };
}

function journalRow(overrides: Record<string, unknown> = {}) {
  return {
    transaction_id: "delete-1", operation: "area_delete", module_id: "module:a",
    area_resref: "crypt01", actor_id: "actor-1", idempotency_key: "delete-key-1",
    command_hash: "7".repeat(64), expected_module_revision: "1".repeat(64),
    draft_revision: null, draft_normalized_sha256: null,
    lease_id: "lease-1", fencing_token: 3, state: "prepared",
    operation_metadata_json: { previewSha256: "6".repeat(64) },
    candidate_manifest_json: {
      areaId: "crypt01", previewSha256: "6".repeat(64), removedResources: [],
      moduleIfo: {
        key: "module.ifo", fileName: "module.ifo", resourceType: 2014,
        baselineSize: 10, baselineSha256: "9".repeat(64),
        candidateSize: 9, candidateSha256: "8".repeat(64),
      },
      survivorCount: 4,
    },
    receipt_json: null, diagnostics_json: [], created_at: sqlNow(), updated_at: sqlNow(),
    ...overrides,
  };
}

function lease() {
  return {
    moduleId: "module:a", leaseId: "lease-1", ownerTransactionId: "delete-1",
    fencingToken: 3, expiresAt: "2026-08-12T21:30:30.000Z",
  };
}

function journalRecord(): AreaDeleteJournalRecord {
  const removed = Buffer.from("removed-bytes");
  return {
    transactionId: "delete-1", moduleId: "module:a", areaResRef: "crypt01",
    actorId: "actor-1", idempotencyKey: "delete-key-1", commandHash: "7".repeat(64),
    expectedModuleRevision: "1".repeat(64), previewSha256: "6".repeat(64),
    leaseId: "lease-1", fencingToken: 3, createdAt: NOW,
    candidate: {
      areaId: "crypt01",
      preview: {
        schemaVersion: "area-delete-preview.v1", scanVersion: "area-delete-impact-scan.v1",
        moduleId: "module:a", areaResRef: "crypt01", moduleRevision: "1".repeat(64),
        targetResources: [], moduleIfo: {
          logicalKey: "module.ifo", resourceType: 2014, size: 10, sha256: "9".repeat(64),
        },
        membershipCount: 1, entryAreaResRef: "keep", findings: [], blockerCount: 0,
        warningCount: 0, previewSha256: "6".repeat(64), expiresAt: "2026-08-12T21:35:00.000Z",
      },
      removedResources: [{
        extension: "are", key: "crypt01.are", fileName: "crypt01.are",
        resourceType: 2012, bytes: removed, size: removed.length, sha256: "a".repeat(64),
      }],
      moduleIfo: {
        key: "module.ifo", fileName: "module.ifo", resourceType: 2014,
        baselineBytes: Buffer.from("ifo-before"), baselineSha256: "9".repeat(64),
        candidateBytes: Buffer.from("ifo-after"), candidateSha256: "8".repeat(64),
      },
      survivorCount: 4,
    },
  };
}

function receipt(): AreaDeleteReceipt {
  return {
    schemaVersion: "area-delete-receipt.v1", transactionId: "delete-1",
    areaResRef: "crypt01", moduleId: "module:a",
    previousModuleRevision: "1".repeat(64), newModuleRevision: "2".repeat(64),
    commandHash: "7".repeat(64), previewSha256: "6".repeat(64),
    scanVersion: "area-delete-impact-scan.v1", removedResources: [],
    moduleIfo: {
      key: "module.ifo", baselineSha256: "9".repeat(64),
      candidateSha256: "8".repeat(64), size: 9,
    },
    survivorCount: 4, blockerCount: 0, readbackStatus: "verified", warnings: [],
    deletedAt: NOW,
  };
}

function idempotency(result: AreaDeleteReceipt) {
  return createAreaCreateIdempotencyEntry({
    moduleId: "module:a", key: "delete-key-1", commandHash: "7".repeat(64),
    createdAt: NOW, result,
  });
}
