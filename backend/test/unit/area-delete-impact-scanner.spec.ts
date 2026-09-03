import { createHash } from "node:crypto";
import { AreaDeleteImpactScanner } from "../../src/modules/areas/application/area-delete-impact-scanner";
import type { AtomicModuleSnapshotRepositoryPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import {
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MODULE_ID = "workspace:delete-preview";
const TARGET = "delete01";

describe("Area Delete impact scanner", () => {
  it("produces a deterministic blocker-free preview from one exact target triplet and membership", async () => {
    const contents = cleanModule();
    const first = scanner(contents, "2026-08-12T12:00:00.000Z");
    const second = scanner(contents, "2026-08-12T12:01:00.000Z");

    const left = await first.scan(command(first.revision));
    const right = await second.scan(command(second.revision));

    expect(left).toMatchObject({
      schemaVersion: "area-delete-preview.v1",
      moduleId: MODULE_ID,
      areaResRef: TARGET,
      moduleRevision: first.revision,
      membershipCount: 1,
      entryAreaResRef: "keep01",
      blockerCount: 0,
      warningCount: 0,
      findings: [],
      scanVersion: "area-delete-impact-scan.v1",
      expiresAt: "2026-08-12T12:05:00.000Z",
    });
    expect(left.targetResources.map((entry) => entry.logicalKey)).toEqual([
      "delete01.are",
      "delete01.gic",
      "delete01.git",
    ]);
    expect(left.previewSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(right.previewSha256).toBe(left.previewSha256);
    expect(right.expiresAt).not.toBe(left.expiresAt);
  });

  it("blocks deletion of the native module entry Area", async () => {
    const harness = scanner({ ...cleanModule(), "module.ifo": moduleIfo(TARGET) });

    const preview = await harness.scan(command(harness.revision));

    expect(preview.blockerCount).toBe(1);
    expect(preview.findings).toEqual([expect.objectContaining({
      code: "AREA_DELETE_ENTRY_AREA_REFERENCE",
      severity: "blocker",
      resourceKey: "module.ifo",
      fieldPath: "$.Mod_Entry_Area",
    })]);
  });

  it("finds nested inbound GIT linkage fields case-insensitively and ignores the deleted GIT itself", async () => {
    const inbound = buildGffBuffer([{
      label: "Door List",
      type: "list",
      value: [{
        typeId: 8,
        fields: [{ label: "LinkedTo", type: "cexostring", value: "DELETE01" }],
      }],
    }], "GIT ", 0);
    const selfReference = buildGffBuffer([{
      label: "TriggerList",
      type: "list",
      value: [{
        typeId: 1,
        fields: [{ label: "TransitionDestination", type: "resref", value: TARGET }],
      }],
    }], "GIT ", 0);
    const harness = scanner({
      ...cleanModule(),
      "delete01.git": selfReference,
      "keep01.git": inbound,
    });

    const preview = await harness.scan(command(harness.revision));

    expect(preview.findings).toEqual([expect.objectContaining({
      code: "AREA_DELETE_GIT_REFERENCE",
      resourceKey: "keep01.git",
      fieldPath: "$.Door List[0].LinkedTo",
    })]);
  });

  it("blocks source-script hits, compiled-script uncertainty, malformed GIT, and sorts findings deterministically", async () => {
    const harness = scanner({
      ...cleanModule(),
      "keep01.git": Buffer.from("broken-git"),
      "check_area.nss": Buffer.from("void main() { string s = \"delete01\"; }", "utf8"),
      "compiled_only.ncs": Buffer.from([1, 2, 3]),
    });

    const preview = await harness.scan(command(harness.revision));

    expect(preview.findings.map((entry) => entry.code)).toEqual([
      "AREA_DELETE_COMPILED_SCRIPT_UNINSPECTABLE",
      "AREA_DELETE_GIT_SCAN_INVALID",
      "AREA_DELETE_SCRIPT_SOURCE_REFERENCE",
    ]);
    expect(preview.blockerCount).toBe(3);
  });

  it("fails closed for a stale revision, missing triplet, and descriptor/content mismatch", async () => {
    const stale = scanner(cleanModule());
    await expect(stale.scan(command("0".repeat(64)))).rejects.toMatchObject({
      code: "AREA_DELETE_MODULE_REVISION_CONFLICT",
      status: 412,
    });

    const missing = scanner(Object.fromEntries(
      Object.entries(cleanModule()).filter(([key]) => key !== "delete01.gic"),
    ));
    await expect(missing.scan(command(missing.revision))).rejects.toMatchObject({
      code: "AREA_DELETE_SOURCE_MISSING",
      status: 404,
    });

    const corrupt = scanner(cleanModule());
    (corrupt.repository.readContent as jest.Mock).mockImplementation(async (contentKey: string) => ({
      contentKey,
      size: 7,
      sha256: "f".repeat(64),
      bytes: Buffer.from("corrupt"),
    }));
    await expect(corrupt.scan(command(corrupt.revision))).rejects.toMatchObject({
      code: "AREA_DELETE_STORAGE_UNAVAILABLE",
      status: 503,
    });
  });
});

function command(expectedModuleRevision: string) {
  return {
    moduleId: MODULE_ID,
    areaResRef: TARGET,
    expectedModuleRevision,
  } as const;
}

function cleanModule(): Record<string, Buffer> {
  return {
    "delete01.are": buildGffBuffer([{ label: "ResRef", type: "resref", value: TARGET }], "ARE ", 0),
    "delete01.git": buildGffBuffer([], "GIT ", 0),
    "delete01.gic": buildGffBuffer([], "GIC ", 0),
    "keep01.are": buildGffBuffer([{ label: "ResRef", type: "resref", value: "keep01" }], "ARE ", 0),
    "keep01.git": buildGffBuffer([], "GIT ", 0),
    "keep01.gic": buildGffBuffer([], "GIC ", 0),
    "module.ifo": moduleIfo("keep01"),
  };
}

function moduleIfo(entryArea: string): Buffer {
  return buildGffBuffer([
    { label: "Mod_Entry_Area", type: "resref", value: entryArea },
    {
      label: "Mod_Area_list",
      type: "list",
      value: [TARGET, "keep01"].map((area) => ({
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref" as const, value: area }],
      })),
    },
  ], "IFO ", 0);
}

function scanner(
  contents: Record<string, Buffer>,
  now = "2026-08-12T12:00:00.000Z",
) {
  const manifest = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(contents).map(([logicalKey, bytes]) => ({
      logicalKey,
      resourceType: resourceType(logicalKey),
      size: bytes.length,
      sha256: sha(bytes),
    })),
  });
  const byContentKey = new Map(manifest.objects.map((descriptor) => [
    descriptor.contentKey,
    contents[descriptor.logicalKey],
  ]));
  const repository: AtomicModuleSnapshotRepositoryPort = {
    bootstrap: jest.fn(),
    readHead: jest.fn(async () => ({
      schemaVersion: "aurora-module-snapshot-head.v1" as const,
      moduleId: MODULE_ID,
      revision: manifest.revision,
      manifestKey: buildModuleSnapshotManifestKey(manifest),
      manifestSha256: hashModuleSnapshotManifest(manifest),
      quarantined: false,
      fencingToken: 1,
      updatedAt: now,
    })),
    readManifest: jest.fn(async () => manifest),
    readContent: jest.fn(async (contentKey: string) => {
      const bytes = byContentKey.get(contentKey);
      return bytes ? { contentKey, size: bytes.length, sha256: sha(bytes), bytes } : null;
    }),
    putContentIfAbsent: jest.fn(),
    putManifestIfAbsent: jest.fn(),
    putStageIfAbsent: jest.fn(),
    readStage: jest.fn(),
    compareAndSetHead: jest.fn(),
    restoreBaseline: jest.fn(),
    quarantine: jest.fn(),
    quarantineModule: jest.fn(),
  };
  const service = new AreaDeleteImpactScanner(repository, { nowIso: () => now });
  return {
    revision: manifest.revision,
    repository,
    scan: service.scan.bind(service),
  };
}

function resourceType(key: string): number {
  if (key.endsWith(".are")) return 2012;
  if (key.endsWith(".git")) return 2023;
  if (key.endsWith(".gic")) return 2046;
  if (key.endsWith(".ifo")) return 2014;
  if (key.endsWith(".nss")) return 2009;
  if (key.endsWith(".ncs")) return 2010;
  return 0;
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
