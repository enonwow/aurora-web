import type {
  CapturedCommittedModuleSnapshot,
  CommittedModuleSnapshotReaderPort,
} from "../../src/modules/module-snapshots/application/ports/committed-module-snapshot-reader.port";
import {
  AreaEventScriptCatalogApplicationService,
} from "../../src/modules/areas/application/area-event-script-catalog.application.service";
import type {
  AreaEventScriptCatalogTelemetryPort,
} from "../../src/modules/areas/application/ports/area-event-script-catalog-telemetry.port";

const HASH = "b".repeat(64);

function snapshot(): CapturedCommittedModuleSnapshot {
  return {
    moduleId: "module-current",
    revision: "c".repeat(64),
    capturedAt: "2026-08-24T12:00:00.000Z",
    listCommittedObjectDescriptors: () => Object.freeze([
      Object.freeze({ logicalKey: "alpha.nss", resourceType: 2009, size: 10, sha256: HASH }),
      Object.freeze({ logicalKey: "alpha.ncs", resourceType: 2010, size: 11, sha256: HASH }),
      Object.freeze({ logicalKey: "beta.nss", resourceType: 2009, size: 12, sha256: HASH }),
      Object.freeze({ logicalKey: "zeta.ncs", resourceType: 2010, size: 13, sha256: HASH }),
    ]),
    listModuleSnapshot: jest.fn(),
    getModuleObject: jest.fn(),
  };
}

describe("AreaEventScriptCatalogApplicationService", () => {
  it("captures one immutable revision, filters, paginates, and emits bounded telemetry", async () => {
    const captured = snapshot();
    const reader: CommittedModuleSnapshotReaderPort = {
      capture: jest.fn(async () => captured),
    };
    const telemetry: AreaEventScriptCatalogTelemetryPort = {
      record: jest.fn(),
    };
    const service = new AreaEventScriptCatalogApplicationService(reader, telemetry);

    await expect(service.query({ search: "a", limit: 2, offset: 1 })).resolves.toEqual({
      schemaVersion: "area-event-script-catalog.v1",
      moduleId: "module-current",
      moduleRevision: "c".repeat(64),
      coverage: "committed_module_only",
      items: [
        {
          resRef: "beta",
          artifactStatus: "source_only",
          freshness: null,
          source: { logicalKey: "beta.nss", resourceType: 2009, size: 12, sha256: HASH },
        },
        {
          resRef: "zeta",
          artifactStatus: "bytecode_only",
          freshness: null,
          bytecode: { logicalKey: "zeta.ncs", resourceType: 2010, size: 13, sha256: HASH },
        },
      ],
      total: 3,
      limit: 2,
      offset: 1,
      summary: {
        admittedCatalogCount: 3,
        sourceAndBytecode: 1,
        sourceOnly: 1,
        bytecodeOnly: 1,
        rejectedDescriptors: 0,
      },
      diagnostics: [
        "external_runtime_layers_not_resolved",
        "paired_freshness_unverified",
      ],
    });
    expect(reader.capture).toHaveBeenCalledTimes(1);
    expect(telemetry.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "area.event_script_catalog.query",
      result: "completed",
      moduleRevision: "c".repeat(64),
      admittedCatalogCount: 3,
      matchingCount: 3,
      returnedCount: 2,
      limit: 2,
      offset: 1,
      durationMs: expect.any(Number),
    }));
    expect(JSON.stringify((telemetry.record as jest.Mock).mock.calls)).not.toContain("alpha");
  });

  it("records only a stable result code when capture fails", async () => {
    const reader: CommittedModuleSnapshotReaderPort = {
      capture: jest.fn(async () => {
        throw new Error("MODULE_SNAPSHOT_READER_NOT_BOOTSTRAPPED: host detail");
      }),
    };
    const telemetry: AreaEventScriptCatalogTelemetryPort = { record: jest.fn() };
    const service = new AreaEventScriptCatalogApplicationService(reader, telemetry);

    await expect(service.query({ search: "", limit: 100, offset: 0 }))
      .rejects.toMatchObject({ code: "MODULE_SNAPSHOT_READER_NOT_BOOTSTRAPPED" });
    expect(telemetry.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "area.event_script_catalog.query",
      result: "failed",
      resultCode: "MODULE_SNAPSHOT_READER_NOT_BOOTSTRAPPED",
      durationMs: expect.any(Number),
    }));
    expect(JSON.stringify((telemetry.record as jest.Mock).mock.calls)).not.toContain("host detail");
  });
});
