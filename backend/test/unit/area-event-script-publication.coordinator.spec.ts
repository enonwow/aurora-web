import { createHash } from "node:crypto";
import type { NwnScriptCompileResult } from "../../src/modules/areas/application/ports/nwn-script-compiler.port";
import type { AreaEventScriptPublicationTransactionDependencies } from "../../src/modules/areas/application/ports/area-event-script-publication.port";
import {
  AreaEventScriptPublicationCoordinator,
} from "../../src/modules/areas/application/area-event-script-publication.coordinator";
import {
  AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION,
  validateAndNormalizeAreaEventScriptSourceCommand,
} from "../../src/modules/areas/domain/area-event-script-source-command";
import type { AreaEventScriptPublicationReceipt } from "../../src/modules/areas/domain/area-event-script-publication.types";

const MODULE_ID = "module:test";
const REVISION = "a".repeat(64);
const NEW_REVISION = "b".repeat(64);
const NOW = "2026-08-26T12:00:00.000Z";
const TRANSACTION_ID = "script-tx-1";

describe("Area event-script publication coordinator", () => {
  it("compiles before locking, journals one fenced publication, and returns a byte-free verified receipt", async () => {
    const command = normalizedCommand();
    const dependencies = createDependencies(command.value.sourceBytes);
    const coordinator = new AreaEventScriptPublicationCoordinator(dependencies);

    const result = await coordinator.execute({
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      ifMatchHeader: `"${REVISION}"`,
      command: command.value,
      commandHash: command.commandHash,
    });

    expect(result.idempotency).toBe("created");
    expect(result.receipt).toEqual(expect.objectContaining({
      schemaVersion: "area-event-script-publication-receipt.v1",
      transactionId: TRANSACTION_ID,
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      previousModuleRevision: REVISION,
      newModuleRevision: NEW_REVISION,
      readbackStatus: "verified",
    }));
    expect(JSON.stringify(result.receipt)).not.toContain("void main");
    expect(JSON.stringify(result.receipt)).not.toContain("compiled-ncs");
    expect(dependencies.compiler.compile.mock.invocationCallOrder[0]).toBeLessThan(
      dependencies.lock.acquire.mock.invocationCallOrder[0],
    );
    expect(dependencies.journal.transition.mock.calls.map((call) => call[1])).toEqual([
      "staged",
      "resources_committed",
      "ifo_committed",
    ]);
    expect(dependencies.journal.recordReadback).toHaveBeenCalledTimes(1);
    expect(dependencies.journal.finalize).toHaveBeenCalledTimes(1);
    expect(dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("returns a structured byte-free validation result without acquiring the mutation lock", async () => {
    const command = normalizedCommand();
    const dependencies = createDependencies(command.value.sourceBytes);
    const result = await new AreaEventScriptPublicationCoordinator(dependencies).validate({
      actorId: "admin-1",
      command: command.value,
    });

    expect(result).toEqual(expect.objectContaining({
      schemaVersion: "area-event-script-validation-result.v1",
      status: "compiled",
      moduleId: MODULE_ID,
      moduleRevision: REVISION,
      targetResRef: "area_enter",
      artifacts: {
        ncs: expect.objectContaining({ size: expect.any(Number), sha256: expect.any(String) }),
        ndb: expect.objectContaining({ size: expect.any(Number), sha256: expect.any(String) }),
      },
    }));
    expect(JSON.stringify(result)).not.toContain("void main");
    expect(JSON.stringify(result)).not.toContain("compiled-ncs");
    expect(dependencies.lock.acquire).not.toHaveBeenCalled();
    expect(dependencies.storage.stage).not.toHaveBeenCalled();
  });

  it("does not acquire the lock or stage content when compilation is rejected", async () => {
    const command = normalizedCommand();
    const dependencies = createDependencies(command.value.sourceBytes);
    dependencies.compiler.compile.mockResolvedValueOnce(rejected(command.value.sourceBytes));

    await expect(
      new AreaEventScriptPublicationCoordinator(dependencies).execute({
        actorId: "admin-1",
        idempotencyKey: "publish-1",
        ifMatchHeader: `"${REVISION}"`,
        command: command.value,
        commandHash: command.commandHash,
      }),
    ).rejects.toThrow("AREA_EVENT_SCRIPT_COMPILE_REJECTED");
    expect(dependencies.lock.acquire).not.toHaveBeenCalled();
    expect(dependencies.storage.stage).not.toHaveBeenCalled();
  });

  it("rejects a revision change after compilation and before staging", async () => {
    const command = normalizedCommand();
    const dependencies = createDependencies(command.value.sourceBytes);
    dependencies.storage.readModuleState.mockResolvedValueOnce({
      moduleId: MODULE_ID,
      revision: "f".repeat(64),
      quarantined: false,
    });

    await expect(
      new AreaEventScriptPublicationCoordinator(dependencies).execute({
        actorId: "admin-1",
        idempotencyKey: "publish-1",
        ifMatchHeader: `"${REVISION}"`,
        command: command.value,
        commandHash: command.commandHash,
      }),
    ).rejects.toThrow("AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT");
    expect(dependencies.storage.stage).not.toHaveBeenCalled();
    expect(dependencies.lock.release).toHaveBeenCalledTimes(1);
  });

  it("replays a retained result without resolving sources, compiling, or locking", async () => {
    const command = normalizedCommand();
    const dependencies = createDependencies(command.value.sourceBytes);
    const receipt = receiptFixture(command.commandHash);
    dependencies.idempotency.read.mockResolvedValueOnce({
      moduleId: MODULE_ID,
      key: "publish-1",
      commandHash: command.commandHash,
      createdAt: NOW,
      result: receipt,
    });

    const result = await new AreaEventScriptPublicationCoordinator(dependencies).execute({
      actorId: "admin-1",
      idempotencyKey: "publish-1",
      ifMatchHeader: `"${REVISION}"`,
      command: command.value,
      commandHash: command.commandHash,
    });

    expect(result).toEqual({ idempotency: "replayed", receipt });
    expect(dependencies.sourceSnapshot.capture).not.toHaveBeenCalled();
    expect(dependencies.compiler.compile).not.toHaveBeenCalled();
    expect(dependencies.lock.acquire).not.toHaveBeenCalled();
  });

  it("authorizes before reading a potentially replayable idempotency result", async () => {
    const command = normalizedCommand();
    const dependencies = createDependencies(command.value.sourceBytes);
    dependencies.authorization.authorize.mockResolvedValueOnce(false);
    dependencies.idempotency.read.mockResolvedValueOnce({
      moduleId: MODULE_ID,
      key: "publish-1",
      commandHash: command.commandHash,
      createdAt: NOW,
      result: receiptFixture(command.commandHash),
    });

    await expect(
      new AreaEventScriptPublicationCoordinator(dependencies).execute({
        actorId: "unauthorized",
        idempotencyKey: "publish-1",
        ifMatchHeader: `"${REVISION}"`,
        command: command.value,
        commandHash: command.commandHash,
      }),
    ).rejects.toThrow("AREA_EVENT_SCRIPT_PERMISSION_DENIED");
    expect(dependencies.idempotency.read).not.toHaveBeenCalled();
  });

  it("restores the baseline when independent readback fails", async () => {
    const command = normalizedCommand();
    const dependencies = createDependencies(command.value.sourceBytes);
    dependencies.storage.readBack.mockResolvedValueOnce({
      verified: false,
      newModuleRevision: "",
      resources: [],
      diagnostics: ["readback mismatch"],
    });

    await expect(
      new AreaEventScriptPublicationCoordinator(dependencies).execute({
        actorId: "admin-1",
        idempotencyKey: "publish-1",
        ifMatchHeader: `"${REVISION}"`,
        command: command.value,
        commandHash: command.commandHash,
      }),
    ).rejects.toThrow("AREA_EVENT_SCRIPT_READBACK_FAILED");
    expect(dependencies.storage.compensate).toHaveBeenCalledTimes(1);
    expect(dependencies.storage.quarantine).not.toHaveBeenCalled();
    expect(dependencies.journal.transition.mock.calls.map((call) => call[1])).toContain(
      "compensated",
    );
  });
});

function normalizedCommand() {
  const result = validateAndNormalizeAreaEventScriptSourceCommand({
    schemaVersion: AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION,
    moduleId: MODULE_ID,
    targetResRef: "area_enter",
    expectedModuleRevision: REVISION,
    sourceText: "void main() {}\n",
    includeResRefs: ["shared"],
  });
  if (!result.valid) throw new Error("fixture invalid");
  return result;
}

function createDependencies(source: Buffer) {
  const compilation = compiled(source);
  const lease = Object.freeze({
    leaseId: "lease-1",
    moduleId: MODULE_ID,
    ownerTransactionId: TRANSACTION_ID,
    fencingToken: 1,
    expiresAt: "2026-08-26T12:01:00.000Z",
  });
  const dependencies = {
    authorization: { authorize: jest.fn().mockResolvedValue(true) },
    sourceSnapshot: {
      capture: jest.fn().mockResolvedValue({
        moduleId: MODULE_ID,
        revision: REVISION,
        includes: [{ resref: "shared", bytes: Buffer.from("int Shared = 1;") }],
      }),
    },
    compiler: { compile: jest.fn().mockResolvedValue(compilation) },
    lock: {
      acquire: jest.fn().mockResolvedValue(lease),
      release: jest.fn().mockResolvedValue(true),
    },
    idempotency: { read: jest.fn().mockResolvedValue(null) },
    storage: {
      readModuleState: jest.fn().mockResolvedValue({
        moduleId: MODULE_ID,
        revision: REVISION,
        quarantined: false,
      }),
      stage: jest.fn().mockResolvedValue(undefined),
      publish: jest.fn().mockResolvedValue("published"),
      readBack: jest.fn().mockImplementation(async (_tx, _module, candidate) => ({
        verified: true,
        newModuleRevision: NEW_REVISION,
        resources: candidate.resources.map(({ bytes: _bytes, ...resource }: { bytes: Buffer }) => resource),
        diagnostics: [],
      })),
      compensate: jest.fn().mockResolvedValue({ restored: true, diagnostics: [] }),
      quarantine: jest.fn().mockResolvedValue(undefined),
    },
    journal: {
      begin: jest.fn().mockResolvedValue(undefined),
      transition: jest.fn().mockResolvedValue(undefined),
      recordReadback: jest.fn().mockResolvedValue(undefined),
      finalize: jest.fn().mockResolvedValue(undefined),
    },
    ids: { nextTransactionId: jest.fn().mockReturnValue(TRANSACTION_ID) },
    clock: { nowIso: jest.fn().mockReturnValue(NOW) },
  };
  return dependencies as unknown as jest.Mocked<AreaEventScriptPublicationTransactionDependencies> & typeof dependencies;
}

function compiled(source: Buffer): NwnScriptCompileResult {
  const ncs = Buffer.from("compiled-ncs");
  const ndb = Buffer.from("compiled-ndb");
  return {
    schemaVersion: "area-nwscript-compile-result.v1",
    status: "compiled",
    targetResref: "area_enter",
    sourceSha256: sha(source),
    includeSetSha256: "2".repeat(64),
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

function rejected(source: Buffer): NwnScriptCompileResult {
  return {
    ...compiled(source),
    status: "rejected",
    diagnostics: [{
      code: "NWNSCRIPT_COMPILE_ERROR",
      severity: "error",
      line: 2,
      message: "syntax error",
    }],
    artifacts: undefined,
  };
}

function receiptFixture(commandHash: string): AreaEventScriptPublicationReceipt {
  const compilation = compiled(Buffer.from("void main() {}\n"));
  return {
    schemaVersion: "area-event-script-publication-receipt.v1",
    transactionId: TRANSACTION_ID,
    moduleId: MODULE_ID,
    targetResRef: "area_enter",
    previousModuleRevision: REVISION,
    newModuleRevision: NEW_REVISION,
    commandHash,
    sourceSha256: compilation.sourceSha256,
    includeSetSha256: compilation.includeSetSha256,
    executionProfileSha256: compilation.executionProfileSha256,
    provider: compilation.provider,
    compilerReceiptSha256: compilation.receiptSha256,
    resources: [],
    readbackStatus: "verified",
    warnings: [],
    publishedAt: NOW,
  };
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
