import { MySqlAreaRenameControlStore } from "../../src/modules/areas/adapters/outbound/mysql/mysql-area-rename-control-store";
import { createAreaCreateIdempotencyEntry } from "../../src/modules/areas/domain/area-create-idempotency";
import type { DatabaseTransaction } from "../../src/database/database.service";
import type {
  AreaRenameJournalRecord,
  AreaRenameReceipt,
} from "../../src/modules/areas/domain/area-rename-transaction.types";

describe("MySQL Area rename control store", () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date(NOW)));
  afterEach(() => jest.useRealTimers());

  it("begins area_rename with bounded byte-free recovery identity", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) return [];
      if (statement.includes("INSERT INTO area_lifecycle_mutation_transactions")) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaRenameControlStore(database as any);
    await store.begin(journalRecord());

    const insert = database.transactionQuery.mock.calls.find(([statement]) =>
      String(statement).includes("INSERT INTO area_lifecycle_mutation_transactions"));
    expect(insert?.[1]).toEqual(expect.arrayContaining([
      "area_rename",
      "crypt01",
      JSON.stringify({ previewSha256: HASH_6, targetAreaResRef: "crypt02" }),
    ]));
    const manifestJson = insert?.[1]?.find((value: unknown) =>
      typeof value === "string" && value.includes('"areaId":"crypt01"')) as string;
    expect(JSON.parse(manifestJson)).toEqual(expect.objectContaining({
      entryAreaResRef: "crypt01",
    }));
    const serialized = JSON.stringify(insert?.[1]);
    expect(serialized).not.toContain("are-before");
    expect(serialized).not.toContain("are-after");
    expect(serialized).not.toContain("ifo-before");
    expect(serialized).not.toContain("ifo-after");
  });

  it("records exact readback then atomically retains idempotency before completion", async () => {
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
    const store = new MySqlAreaRenameControlStore(database as any);
    await store.recordReadback("rename-1", lease(), verified);
    await store.finalize("rename-1", lease(), idempotency(verified));

    const calls = database.transactionQuery.mock.calls.map(([statement]) => String(statement));
    expect(calls.findIndex((sql) => sql.includes("INSERT INTO area_lifecycle_mutation_idempotency")))
      .toBeLessThan(calls.findIndex((sql) => sql.includes("SET state = 'complete'")));
    expect(calls.every((sql) => !sql.includes("operation = 'area_delete'"))).toBe(true);
  });

  it("reads and lists only area_rename rows with source and target identity", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_lifecycle_mutation_idempotency")) {
        return [{
          operation: "area_rename",
          module_id: "module:a",
          idempotency_key: "rename-key-1",
          command_hash: HASH_7,
          transaction_id: "rename-1",
          result_json: receipt(),
          created_at: sqlNow(),
        }];
      }
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "staged" })];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaRenameControlStore(database as any);

    await expect(store.read("module:a", "rename-key-1")).resolves.toEqual(
      idempotency(receipt()),
    );
    await expect(store.listRecoverable(10)).resolves.toEqual([
      expect.objectContaining({
        transactionId: "rename-1",
        areaResRef: "crypt01",
        targetAreaResRef: "crypt02",
        previewSha256: HASH_6,
        state: "staged",
      }),
    ]);
    for (const [statement] of database.query.mock.calls) {
      expect(String(statement)).toContain("area_rename");
    }
  });

  it("rejects resource receipt drift before any durable update", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "ifo_committed" })];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaRenameControlStore(database as any);
    const drifted = {
      ...receipt(),
      resources: receipt().resources.map((entry, index) =>
        index === 0 ? { ...entry, targetKey: "other.are" } : entry,
      ),
    };
    await expect(
      store.recordReadback("rename-1", lease(), drifted),
    ).rejects.toThrow("AREA_RENAME_READBACK_CONFLICT");
    expect(database.transactionQuery.mock.calls.some(([statement]) =>
      String(statement).includes("UPDATE area_lifecycle_mutation_transactions"))).toBe(false);
  });
});

const NOW = "2026-08-24T22:45:00.000Z";
const sqlNow = () => "2026-08-24 22:45:00.000";
const HASH_1 = "1".repeat(64);
const HASH_2 = "2".repeat(64);
const HASH_6 = "6".repeat(64);
const HASH_7 = "7".repeat(64);
const HASH_8 = "8".repeat(64);
const HASH_9 = "9".repeat(64);

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
    module_id: "module:a",
    lease_id: "lease-1",
    owner_transaction_id: "rename-1",
    fencing_token: 3,
    lease_expires_at: "2026-08-24 22:45:30.000",
  };
}

function candidateManifest() {
  return {
    areaId: "crypt01",
    targetAreaId: "crypt02",
    previewSha256: HASH_6,
    resources: (["are", "gic", "git"] as const).map((extension, index) => ({
      extension,
      sourceKey: `crypt01.${extension}`,
      targetKey: `crypt02.${extension}`,
      resourceType: [2012, 2046, 2023][index]!,
      baselineSize: 10 + index,
      baselineSha256: HASH_9,
      candidateSize: 11 + index,
      candidateSha256: HASH_8,
    })),
    moduleIfo: {
      key: "module.ifo" as const,
      resourceType: 2014 as const,
      baselineSize: 20,
      baselineSha256: HASH_9,
      candidateSize: 21,
      candidateSha256: HASH_8,
    },
    entryAreaUpdated: true,
    entryAreaResRef: "crypt01",
    survivorCount: 4,
    baselineRevision: HASH_1,
    successorRevision: HASH_2,
  };
}

function journalRow(overrides: Record<string, unknown> = {}) {
  return {
    transaction_id: "rename-1",
    operation: "area_rename",
    module_id: "module:a",
    area_resref: "crypt01",
    actor_id: "actor-1",
    idempotency_key: "rename-key-1",
    command_hash: HASH_7,
    expected_module_revision: HASH_1,
    lease_id: "lease-1",
    fencing_token: 3,
    state: "prepared",
    operation_metadata_json: { previewSha256: HASH_6, targetAreaResRef: "crypt02" },
    candidate_manifest_json: candidateManifest(),
    receipt_json: null,
    diagnostics_json: [],
    created_at: sqlNow(),
    updated_at: sqlNow(),
    ...overrides,
  };
}

function lease() {
  return {
    moduleId: "module:a",
    leaseId: "lease-1",
    ownerTransactionId: "rename-1",
    fencingToken: 3,
    expiresAt: "2026-08-24T22:45:30.000Z",
  };
}

function journalRecord(): AreaRenameJournalRecord {
  const manifest = candidateManifest();
  return {
    transactionId: "rename-1",
    moduleId: "module:a",
    areaResRef: "crypt01",
    targetAreaResRef: "crypt02",
    actorId: "actor-1",
    idempotencyKey: "rename-key-1",
    commandHash: HASH_7,
    expectedModuleRevision: HASH_1,
    previewSha256: HASH_6,
    leaseId: "lease-1",
    fencingToken: 3,
    createdAt: NOW,
    candidate: {
      areaId: "crypt01",
      targetAreaId: "crypt02",
      preview: {
        previewSha256: HASH_6,
        entryAreaResRef: "crypt01",
      } as AreaRenameJournalRecord["candidate"]["preview"],
      resources: manifest.resources.map((resource, index) => ({
        ...resource,
        baselineBytes: Buffer.from(`${resource.extension}-before`),
        candidateBytes: Buffer.from(`${resource.extension}-after`),
        baselineSize: 10 + index,
        candidateSize: 11 + index,
      })),
      moduleIfo: {
        ...manifest.moduleIfo,
        baselineBytes: Buffer.from("ifo-before"),
        candidateBytes: Buffer.from("ifo-after"),
      },
      entryAreaUpdated: true,
      survivorCount: 4,
      baselineManifest: { revision: HASH_1 } as never,
      successorManifest: { revision: HASH_2 } as never,
    },
  };
}

function receipt(): AreaRenameReceipt {
  const manifest = candidateManifest();
  return {
    schemaVersion: "area-rename-receipt.v1",
    transactionId: "rename-1",
    moduleId: "module:a",
    areaResRef: "crypt01",
    targetAreaResRef: "crypt02",
    previousModuleRevision: HASH_1,
    newModuleRevision: HASH_2,
    commandHash: HASH_7,
    previewSha256: HASH_6,
    scanVersion: "area-rename-impact-scan.v1",
    resources: manifest.resources,
    moduleIfo: {
      key: "module.ifo",
      baselineSize: manifest.moduleIfo.baselineSize,
      baselineSha256: manifest.moduleIfo.baselineSha256,
      candidateSize: manifest.moduleIfo.candidateSize,
      candidateSha256: manifest.moduleIfo.candidateSha256,
    },
    entryAreaUpdated: true,
    blockerCount: 0,
    warningCount: 0,
    readbackStatus: "verified",
    warnings: [],
    renamedAt: NOW,
  };
}

function idempotency(result: AreaRenameReceipt) {
  return createAreaCreateIdempotencyEntry({
    moduleId: "module:a",
    key: "rename-key-1",
    commandHash: HASH_7,
    createdAt: NOW,
    result,
  });
}
