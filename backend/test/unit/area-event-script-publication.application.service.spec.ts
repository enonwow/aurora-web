import { createHash } from "node:crypto";
import { AppException } from "../../src/common/http/app-exception";
import { AreaEventScriptPublicationApplicationService } from "../../src/modules/areas/application/area-event-script-publication.application.service";
import type { AreaEventScriptPublicationApplicationDependencies } from "../../src/modules/areas/application/area-event-script-publication.application.service";
import type { NwnScriptCompileResult } from "../../src/modules/areas/application/ports/nwn-script-compiler.port";
import { AreaEventScriptSourceQueryError } from "../../src/modules/areas/application/ports/area-event-script-source-query.port";

const MODULE_ID = "module:test";
const REVISION = "a".repeat(64);
const NEW_REVISION = "b".repeat(64);
const NOW = "2026-08-26T12:00:00.000Z";

describe("AreaEventScriptPublicationApplicationService", () => {
  it("reads source only after canonical identity validation and authorization", async () => {
    const harness = createHarness();

    const result = await harness.service.readSource({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: REVISION,
      actorId: "admin-1",
    });

    expect(harness.dependencies.authorization.authorize.mock.invocationCallOrder[0])
      .toBeLessThan(
        harness.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped
          .mock.invocationCallOrder[0],
      );
    expect(harness.dependencies.sourceQuery.read).toHaveBeenCalledWith({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: REVISION,
    });
    expect(result).toEqual(expect.objectContaining({
      schemaVersion: "area-event-script-source-snapshot.v1",
      sourceText: "void main() {}\n",
    }));
    expect(harness.dependencies.telemetry.emit).toHaveBeenCalledWith({
      schemaVersion: "area-event-script-publication-telemetry.v1",
      operation: "read_source",
      outcome: "succeeded",
      resultCode: "AREA_EVENT_SCRIPT_SOURCE_READ",
      moduleRevision: REVISION,
      sourceBytes: 15,
      includeCount: 0,
      diagnosticCount: 0,
      resourceCount: 1,
      durationMs: expect.any(Number),
    });
    expect(JSON.stringify(harness.dependencies.telemetry.emit.mock.calls))
      .not.toContain(MODULE_ID);
    expect(JSON.stringify(harness.dependencies.telemetry.emit.mock.calls))
      .not.toContain("area_enter");
  });

  it("rejects an invalid source query before authorization", async () => {
    const harness = createHarness();

    const error = await capture(harness.service.readSource({
      moduleId: MODULE_ID,
      targetResRef: "AreaEnter",
      expectedModuleRevision: REVISION,
      actorId: "admin-1",
    }));

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: "AREA_EVENT_SCRIPT_SOURCE_INVALID" });
    expect(harness.dependencies.authorization.authorize).not.toHaveBeenCalled();
    expect(harness.dependencies.sourceQuery.read).not.toHaveBeenCalled();
  });

  it("maps a stale source query to the stable 412 contract", async () => {
    const harness = createHarness();
    harness.dependencies.sourceQuery.read.mockRejectedValueOnce(
      new AreaEventScriptSourceQueryError(
        "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT",
        "Committed module revision changed.",
      ),
    );

    const error = await capture(harness.service.readSource({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: REVISION,
      actorId: "admin-1",
    }));

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: "AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT" });
    expect((error as AppException).getStatus()).toBe(412);
  });

  it("sanitizes an unexpected infrastructure failure and its telemetry", async () => {
    const harness = createHarness();
    harness.dependencies.sourceQuery.read.mockRejectedValueOnce(
      new Error("C:\\private\\module\\area_enter.nss"),
    );

    const error = await capture(harness.service.readSource({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: REVISION,
      actorId: "admin-1",
    }));

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: "AREA_EVENT_SCRIPT_TRANSACTION_FAILED" });
    expect((error as AppException).message).not.toContain("private");
    expect(JSON.stringify(harness.dependencies.telemetry.emit.mock.calls))
      .not.toContain("private");
  });

  it("rejects a path/body identity mismatch before authorization or workspace access", async () => {
    const harness = createHarness();

    const error = await capture(harness.service.validate({
      moduleId: "module:other",
      targetResRef: "area_enter",
      actorId: "admin-1",
      body: commandBody(),
    }));

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: "AREA_EVENT_SCRIPT_SOURCE_INVALID" });
    expect(harness.dependencies.authorization.authorize).not.toHaveBeenCalled();
    expect(harness.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped)
      .not.toHaveBeenCalled();
  });

  it("authorizes before resolving the current workspace", async () => {
    const harness = createHarness();
    harness.dependencies.authorization.authorize.mockResolvedValueOnce(false);

    const error = await capture(harness.service.validate({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      actorId: "reader-1",
      body: commandBody(),
    }));

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: "AREA_EVENT_SCRIPT_PERMISSION_DENIED" });
    expect(harness.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped)
      .not.toHaveBeenCalled();
  });

  it("rejects a module outside the current workspace before source capture", async () => {
    const harness = createHarness();
    harness.dependencies.bootstrap.ensureCurrentWorkspaceBootstrapped.mockResolvedValueOnce({
      head: { moduleId: "module:other" },
    });

    const error = await capture(harness.service.validate({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      actorId: "admin-1",
      body: commandBody(),
    }));

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: "AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE" });
    expect(harness.dependencies.sourceSnapshot.capture).not.toHaveBeenCalled();
  });

  it("returns byte-free validation without invalidating committed caches", async () => {
    const harness = createHarness();

    const result = await harness.service.validate({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      actorId: "admin-1",
      body: commandBody(),
    });

    expect(result).toEqual(expect.objectContaining({
      schemaVersion: "area-event-script-validation-result.v1",
      status: "compiled",
      moduleId: MODULE_ID,
      moduleRevision: REVISION,
    }));
    expect(JSON.stringify(result)).not.toContain("void main");
    expect(harness.dependencies.caches.invalidateAreas).not.toHaveBeenCalled();
    expect(harness.dependencies.telemetry.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "validate",
        outcome: "succeeded",
        resultCode: "AREA_EVENT_SCRIPT_VALIDATED",
        moduleRevision: REVISION,
        sourceBytes: Buffer.byteLength(commandBody().sourceText, "utf8"),
        includeCount: 0,
        resourceCount: 2,
      }),
    );
  });

  it("invalidates all affected read caches only after verified publication", async () => {
    const harness = createHarness();

    const result = await harness.service.publish({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      ifMatchHeader: `"${REVISION}"`,
      body: commandBody(),
    });

    expect(result).toEqual(expect.objectContaining({ idempotency: "created" }));
    expect(result.receipt.newModuleRevision).toBe(NEW_REVISION);
    expect(harness.dependencies.caches.invalidateAreas).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.caches.invalidateEditing).toHaveBeenCalledTimes(1);
    expect(harness.dependencies.caches.invalidateCatalog).toHaveBeenCalledTimes(1);
  });

  it("maps a compiler rejection to a bounded 422 and preserves all caches", async () => {
    const harness = createHarness();
    harness.dependencies.compiler.compile.mockImplementationOnce(async (input) => ({
      ...compiled(input.target.bytes),
      status: "rejected",
      diagnostics: [{
        code: "NWNSCRIPT_COMPILE_ERROR",
        severity: "error",
        line: 1,
        message: "syntax error",
      }],
      artifacts: undefined,
    }));

    const error = await capture(harness.service.publish({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      ifMatchHeader: `"${REVISION}"`,
      body: commandBody(),
    }));

    expect(error).toBeInstanceOf(AppException);
    expect(error).toMatchObject({ code: "AREA_EVENT_SCRIPT_COMPILE_REJECTED" });
    expect((error as AppException).getStatus()).toBe(422);
    expect(harness.dependencies.caches.invalidateAreas).not.toHaveBeenCalled();
    expect(harness.dependencies.telemetry.emit).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "publish",
        outcome: "failed",
        resultCode: "AREA_EVENT_SCRIPT_COMPILE_REJECTED",
        sourceBytes: Buffer.byteLength(commandBody().sourceText, "utf8"),
        includeCount: 0,
      }),
    );
    expect(JSON.stringify(harness.dependencies.telemetry.emit.mock.calls))
      .not.toContain("syntax error");
  });
});

function createHarness() {
  const lease = {
    leaseId: "lease-1",
    moduleId: MODULE_ID,
    ownerTransactionId: "script-tx-1",
    fencingToken: 1,
    expiresAt: "2026-08-26T12:01:00.000Z",
  };
  const dependencies = {
    bootstrap: {
      ensureCurrentWorkspaceBootstrapped: jest.fn(async () => ({
        head: { moduleId: MODULE_ID },
      })),
    },
    authorization: { authorize: jest.fn(async () => true) },
    sourceSnapshot: {
      capture: jest.fn(async () => ({
        moduleId: MODULE_ID,
        revision: REVISION,
        includes: [],
      })),
    },
    sourceQuery: {
      read: jest.fn(async () => ({
        schemaVersion: "area-event-script-source-snapshot.v1" as const,
        moduleId: MODULE_ID,
        moduleRevision: REVISION,
        targetResRef: "area_enter",
        sourceEncoding: "utf-8" as const,
        sourceText: "void main() {}\n",
        sourceSize: 15,
        sourceSha256: sha(Buffer.from("void main() {}\n")),
      })),
    },
    compiler: {
      compile: jest.fn(async (input: { target: { bytes: Buffer } }) =>
        compiled(input.target.bytes)),
    },
    lock: {
      acquire: jest.fn(async () => lease),
      release: jest.fn(async () => true),
    },
    idempotency: { read: jest.fn(async () => null) },
    storage: {
      readModuleState: jest.fn(async () => ({
        moduleId: MODULE_ID,
        revision: REVISION,
        quarantined: false,
      })),
      stage: jest.fn(async () => undefined),
      publish: jest.fn(async () => "published" as const),
      readBack: jest.fn(async (_transactionId, _moduleId, candidate) => ({
        verified: true,
        newModuleRevision: NEW_REVISION,
        resources: candidate.resources.map(({ bytes: _bytes, ...resource }) => resource),
        diagnostics: [],
      })),
      compensate: jest.fn(async () => ({ restored: true, diagnostics: [] })),
      quarantine: jest.fn(async () => undefined),
    },
    journal: {
      begin: jest.fn(async () => undefined),
      transition: jest.fn(async () => undefined),
      recordReadback: jest.fn(async () => undefined),
      finalize: jest.fn(async () => undefined),
      readJournal: jest.fn(async () => null),
      listRecoverable: jest.fn(async () => []),
    },
    ids: { nextTransactionId: () => "script-tx-1" },
    clock: { nowIso: () => NOW },
    caches: {
      invalidateAreas: jest.fn(),
      invalidateEditing: jest.fn(),
      invalidateCatalog: jest.fn(),
    },
    telemetry: { emit: jest.fn() },
  };
  const typed = dependencies as unknown as jest.Mocked<AreaEventScriptPublicationApplicationDependencies> &
    typeof dependencies;
  return {
    dependencies: typed,
    service: new AreaEventScriptPublicationApplicationService(typed),
  };
}

function commandBody() {
  return {
    schemaVersion: "area-event-script-source-command.v1",
    moduleId: MODULE_ID,
    targetResRef: "area_enter",
    expectedModuleRevision: REVISION,
    sourceText: "void main() {}\n",
    includeResRefs: [],
  };
}

function compiled(source: Buffer): NwnScriptCompileResult {
  const ncs = Buffer.from("compiled-ncs");
  const ndb = Buffer.from("compiled-ndb");
  return {
    schemaVersion: "area-nwscript-compile-result.v1",
    status: "compiled",
    targetResref: "area_enter",
    sourceSha256: sha(source),
    includeSetSha256: sha(Buffer.from("[]")),
    executionProfileSha256: "3".repeat(64),
    provider: {
      providerId: "neverwinter-nim-official-script-compiler",
      executableSha256: "4".repeat(64),
      versionMarker: "neverwinter 2.1.2",
      versionOutputSha256: "5".repeat(64),
      languageSpecSha256: "6".repeat(64),
      runtimeLibrarySetSha256: "7".repeat(64),
      launcherFileSetSha256: "8".repeat(64),
    },
    diagnostics: [],
    artifacts: {
      ncs: { bytes: ncs, size: ncs.length, sha256: sha(ncs) },
      ndb: { bytes: ndb, size: ndb.length, sha256: sha(ndb) },
    },
    receiptSha256: "9".repeat(64),
  };
}

async function capture(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    throw new Error("Expected operation to fail.");
  } catch (error) {
    return error;
  }
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
