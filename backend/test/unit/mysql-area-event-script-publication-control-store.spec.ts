import { createHash } from "node:crypto";
import type { DatabaseTransaction } from "../../src/database/database.service";
import { MySqlAreaEventScriptPublicationControlStore } from "../../src/modules/areas/adapters/outbound/mysql/mysql-area-event-script-publication-control-store";
import { createAreaCreateIdempotencyEntry } from "../../src/modules/areas/domain/area-create-idempotency";
import {
  createAreaEventScriptPublicationCandidateManifest,
  type AreaEventScriptPublicationCandidate,
  type AreaEventScriptPublicationJournalRecord,
  type AreaEventScriptPublicationReceipt,
} from "../../src/modules/areas/domain/area-event-script-publication.types";

describe("MySQL Area event-script publication control store", () => {
  beforeEach(() => jest.useFakeTimers().setSystemTime(new Date("2026-08-26T12:00:00.000Z")));
  afterEach(() => jest.useRealTimers());

  it("begins with one bounded byte-free candidate manifest", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) return [];
      if (statement.includes("INSERT INTO area_lifecycle_mutation_transactions")) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    await new MySqlAreaEventScriptPublicationControlStore(database as any).begin(journalRecord());

    const insert = database.transactionQuery.mock.calls.find(([statement]) =>
      String(statement).includes("INSERT INTO area_lifecycle_mutation_transactions"));
    expect(insert?.[1]).toEqual(expect.arrayContaining([
      "area_script_publish",
      "area_enter",
    ]));
    const manifestJson = (insert?.[1] ?? []).find((value) =>
      typeof value === "string" && value.startsWith('{"targetResRef"'));
    expect(JSON.parse(String(manifestJson))).toEqual(expect.objectContaining({
      targetResRef: "area_enter",
    }));
    expect(JSON.stringify(insert?.[1])).not.toContain("source-bytes");
  });

  it("records exact verified readback with one fenced compare-and-set", async () => {
    const verified = receiptFixture();
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "ifo_committed" })];
      }
      if (statement.includes("UPDATE area_lifecycle_mutation_transactions")) {
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });

    await new MySqlAreaEventScriptPublicationControlStore(database as any)
      .recordReadback("script-tx-1", lease(), verified);
    expect(database.transactionQuery).toHaveBeenCalledWith(
      expect.stringContaining("receipt_json = ?"),
      [JSON.stringify(verified), "script-tx-1", "module:a", "lease-1", 3],
    );
  });

  it("rejects a readback with another compiler receipt", async () => {
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "ifo_committed" })];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaEventScriptPublicationControlStore(database as any);
    await expect(store.recordReadback("script-tx-1", lease(), {
      ...receiptFixture(),
      compilerReceiptSha256: "f".repeat(64),
    })).rejects.toThrow("AREA_EVENT_SCRIPT_READBACK_CONFLICT");
  });

  it("atomically retains idempotency before completing the journal", async () => {
    const receipt = receiptFixture();
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_create_module_locks")) return [lockRow()];
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "readback_verified", receipt_json: receipt })];
      }
      if (statement.includes("FROM area_lifecycle_mutation_idempotency")) return [];
      if (
        statement.includes("INSERT INTO area_lifecycle_mutation_idempotency") ||
        statement.includes("UPDATE area_lifecycle_mutation_transactions")
      ) return { affectedRows: 1 };
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaEventScriptPublicationControlStore(database as any);

    await store.finalize("script-tx-1", lease(), idempotency(receipt));
    const calls = database.transactionQuery.mock.calls.map(([statement]) => String(statement));
    expect(calls.findIndex((sql) => sql.includes("INSERT INTO area_lifecycle_mutation_idempotency")))
      .toBeLessThan(calls.findIndex((sql) => sql.includes("UPDATE area_lifecycle_mutation_transactions")));
  });

  it("reads and lists only the area_script_publish operation scope", async () => {
    const receipt = receiptFixture();
    const database = scriptedDatabase((statement) => {
      if (statement.includes("FROM area_lifecycle_mutation_idempotency")) {
        return [{
          operation: "area_script_publish",
          module_id: "module:a",
          idempotency_key: "publish-1",
          command_hash: "a".repeat(64),
          transaction_id: "script-tx-1",
          result_json: receipt,
          created_at: "2026-08-26 12:00:00.000",
        }];
      }
      if (statement.includes("FROM area_lifecycle_mutation_transactions")) {
        return [journalRow({ state: "staged" })];
      }
      throw new Error(`Unexpected SQL: ${statement}`);
    });
    const store = new MySqlAreaEventScriptPublicationControlStore(database as any);

    await expect(store.read("module:a", "publish-1")).resolves.toEqual(idempotency(receipt));
    await expect(store.listRecoverable(10)).resolves.toEqual([
      expect.objectContaining({ transactionId: "script-tx-1", targetResRef: "area_enter", state: "staged" }),
    ]);
    expect(database.query.mock.calls.every(([sql]) =>
      String(sql).includes("area_script_publish"))).toBe(true);
  });
});

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
    owner_transaction_id: "script-tx-1",
    fencing_token: 3,
    lease_expires_at: "2026-08-26 12:00:30.000",
  };
}

function journalRecord(): AreaEventScriptPublicationJournalRecord {
  return {
    transactionId: "script-tx-1",
    moduleId: "module:a",
    targetResRef: "area_enter",
    actorId: "admin-1",
    idempotencyKey: "publish-1",
    commandHash: "a".repeat(64),
    expectedModuleRevision: "b".repeat(64),
    leaseId: "lease-1",
    fencingToken: 3,
    candidate: candidateFixture(),
    createdAt: "2026-08-26T12:00:00.000Z",
  };
}

function journalRow(overrides: Record<string, unknown> = {}) {
  return {
    transaction_id: "script-tx-1",
    operation: "area_script_publish",
    module_id: "module:a",
    area_resref: "area_enter",
    actor_id: "admin-1",
    idempotency_key: "publish-1",
    command_hash: "a".repeat(64),
    expected_module_revision: "b".repeat(64),
    draft_revision: null,
    draft_normalized_sha256: null,
    lease_id: "lease-1",
    fencing_token: 3,
    state: "prepared",
    operation_metadata_json: {},
    candidate_manifest_json: createAreaEventScriptPublicationCandidateManifest(candidateFixture()),
    receipt_json: null,
    diagnostics_json: [],
    created_at: "2026-08-26 12:00:00.000",
    updated_at: "2026-08-26 12:00:00.000",
    ...overrides,
  };
}

function lease() {
  return {
    moduleId: "module:a",
    leaseId: "lease-1",
    ownerTransactionId: "script-tx-1",
    fencingToken: 3,
    expiresAt: "2026-08-26T12:00:30.000Z",
  };
}

function candidateFixture(): AreaEventScriptPublicationCandidate {
  const source = Buffer.from("source-bytes");
  return {
    expectedModuleRevision: "b".repeat(64),
    targetResRef: "area_enter",
    sourceSha256: sha(source),
    includeSetSha256: "c".repeat(64),
    executionProfileSha256: "d".repeat(64),
    provider: {
      providerId: "neverwinter-nim-official-script-compiler",
      executableSha256: "1".repeat(64),
      versionMarker: "neverwinter 2.1.2",
      versionOutputSha256: "2".repeat(64),
      languageSpecSha256: "3".repeat(64),
      runtimeLibrarySetSha256: "4".repeat(64),
      launcherFileSetSha256: "5".repeat(64),
    },
    compilerReceiptSha256: "e".repeat(64),
    diagnostics: [],
    resources: [
      resource("ncs", 2010, "ncs-bytes"),
      resource("ndb", 2064, "ndb-bytes"),
      resource("nss", 2009, "source-bytes"),
    ],
  };
}

function resource(extension: "ncs" | "ndb" | "nss", resourceType: number, value: string) {
  const bytes = Buffer.from(value);
  return { extension, logicalKey: `area_enter.${extension}`, resourceType, bytes, size: bytes.length, sha256: sha(bytes) };
}

function receiptFixture(): AreaEventScriptPublicationReceipt {
  const candidate = candidateFixture();
  return {
    schemaVersion: "area-event-script-publication-receipt.v1",
    transactionId: "script-tx-1",
    moduleId: "module:a",
    targetResRef: "area_enter",
    previousModuleRevision: "b".repeat(64),
    newModuleRevision: "f".repeat(64),
    commandHash: "a".repeat(64),
    sourceSha256: candidate.sourceSha256,
    includeSetSha256: candidate.includeSetSha256,
    executionProfileSha256: candidate.executionProfileSha256,
    provider: candidate.provider,
    compilerReceiptSha256: candidate.compilerReceiptSha256,
    resources: candidate.resources.map(({ bytes: _bytes, ...resource }) => resource),
    readbackStatus: "verified",
    warnings: [],
    publishedAt: "2026-08-26T12:00:00.000Z",
  };
}

function idempotency(result: AreaEventScriptPublicationReceipt) {
  return createAreaCreateIdempotencyEntry({
    moduleId: "module:a",
    key: "publish-1",
    commandHash: "a".repeat(64),
    createdAt: "2026-08-26T12:00:00.000Z",
    result,
  });
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
