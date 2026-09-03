import { createHash } from "node:crypto";
import {
  AreaDeleteCandidateCompiler,
  AreaDeleteCompilerFailure,
} from "../../src/modules/areas/application/area-delete-candidate.compiler";
import { AreaDeletePreviewError } from "../../src/modules/areas/application/area-delete-impact-scanner";
import type { AtomicModuleSnapshotRepositoryPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import {
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import { moduleIfoContainsArea } from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-module-ifo-area-writer";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MODULE_ID = "workspace:delete-compiler";
const TARGET = "delete01";

describe("AreaDeleteCandidateCompiler", () => {
  it("recomputes the preview, loads exact removed bytes, and emits a preserve-first IFO candidate", async () => {
    const harness = createHarness();

    const candidate = await harness.compiler.compile(
      command(harness.revision, harness.preview.previewSha256),
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "admin-01",
      "delete-tx-01",
    );

    expect(harness.scanner.scan).toHaveBeenCalledWith({
      moduleId: MODULE_ID,
      areaResRef: TARGET,
      expectedModuleRevision: harness.revision,
    });
    expect(candidate.areaId).toBe(TARGET);
    expect(candidate.removedResources.map((entry) => entry.extension)).toEqual([
      "are",
      "gic",
      "git",
    ]);
    for (const resource of candidate.removedResources) {
      expect(createHash("sha256").update(resource.bytes).digest("hex")).toBe(resource.sha256);
    }
    expect(moduleIfoContainsArea(candidate.moduleIfo.baselineBytes, TARGET)).toBe(true);
    expect(moduleIfoContainsArea(candidate.moduleIfo.candidateBytes, TARGET)).toBe(false);
    expect(candidate.survivorCount).toBe(4);
  });

  it("rejects a stale preview and maps every blocker class before loading mutation bytes", async () => {
    const stale = createHarness();
    await expect(stale.compiler.compile(
      command(stale.revision, "0".repeat(64)),
      { moduleId: MODULE_ID, revision: stale.revision, quarantined: false },
      "admin-01",
      "delete-tx-01",
    )).rejects.toMatchObject({ code: "AREA_DELETE_PREVIEW_STALE", status: 412 });

    for (const [code, expected] of [
      ["AREA_DELETE_ENTRY_AREA_REFERENCE", "AREA_DELETE_ENTRY_AREA_BLOCKED"],
      ["AREA_DELETE_MEMBERSHIP_INVALID", "AREA_DELETE_MEMBERSHIP_INVALID"],
      ["AREA_DELETE_GIT_REFERENCE", "AREA_DELETE_REFERENCES_BLOCKED"],
      ["AREA_DELETE_COMPILED_SCRIPT_UNINSPECTABLE", "AREA_DELETE_SCAN_INCOMPLETE"],
    ] as const) {
      const harness = createHarness();
      harness.preview.findings = [{
        code,
        severity: "blocker",
        resourceKey: "module.ifo",
        fieldPath: "$",
        reason: "blocked",
      }];
      harness.preview.blockerCount = 1;
      await expect(harness.compiler.compile(
        command(harness.revision, harness.preview.previewSha256),
        { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
        "admin-01",
        "delete-tx-01",
      )).rejects.toMatchObject({ code: expected, status: 409 });
    }
  });

  it("fails closed when module state, manifest identity, or content changes after preview", async () => {
    const wrongState = createHarness();
    await expect(wrongState.compiler.compile(
      command(wrongState.revision, wrongState.preview.previewSha256),
      { moduleId: "workspace:other", revision: wrongState.revision, quarantined: false },
      "admin-01",
      "delete-tx-01",
    )).rejects.toBeInstanceOf(AreaDeleteCompilerFailure);

    const corrupt = createHarness();
    (corrupt.repository.readContent as jest.Mock).mockResolvedValue({
      contentKey: "bad",
      size: 3,
      sha256: "f".repeat(64),
      bytes: Buffer.from("bad"),
    });
    await expect(corrupt.compiler.compile(
      command(corrupt.revision, corrupt.preview.previewSha256),
      { moduleId: MODULE_ID, revision: corrupt.revision, quarantined: false },
      "admin-01",
      "delete-tx-01",
    )).rejects.toMatchObject({ code: "AREA_DELETE_STORAGE_UNAVAILABLE", status: 503 });
  });

  it.each([
    ["AREA_DELETE_ENTRY_AREA_REFERENCE", "AREA_DELETE_ENTRY_AREA_BLOCKED"],
    ["AREA_DELETE_MEMBERSHIP_INVALID", "AREA_DELETE_MEMBERSHIP_INVALID"],
    ["AREA_DELETE_GIT_REFERENCE", "AREA_DELETE_REFERENCES_BLOCKED"],
    ["AREA_DELETE_SCRIPT_SOURCE_REFERENCE", "AREA_DELETE_REFERENCES_BLOCKED"],
    ["AREA_DELETE_COMPILED_SCRIPT_UNINSPECTABLE", "AREA_DELETE_SCAN_INCOMPLETE"],
    ["AREA_DELETE_GIT_SCAN_INVALID", "AREA_DELETE_SCAN_INCOMPLETE"],
    ["AREA_DELETE_TARGET_RESOURCE_INVALID", "AREA_DELETE_SCAN_INCOMPLETE"],
    ["AREA_DELETE_REFERENCE_SCAN_TRUNCATED", "AREA_DELETE_SCAN_INCOMPLETE"],
  ] as const)("maps blocker %s to %s with deterministic diagnostics", async (code, expected) => {
    const harness = createHarness();
    harness.preview.findings = [{
      code, severity: "blocker", resourceKey: "other.git",
      fieldPath: "$.Door List[0].LinkedTo", reason: "blocked",
    }];
    harness.preview.blockerCount = 1;
    await expect(harness.compiler.compile(
      command(harness.revision, harness.preview.previewSha256),
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "admin-01", "delete-tx-01",
    )).rejects.toMatchObject({
      code: expected,
      status: 409,
      details: [`${code}:other.git:$.Door List[0].LinkedTo`],
    });
    expect(harness.repository.readHead).not.toHaveBeenCalled();
  });

  it.each([
    ["AREA_DELETE_SOURCE_MISSING", "AREA_DELETE_SOURCE_MISSING", 404],
    ["AREA_DELETE_RESOURCE_COLLISION", "AREA_DELETE_RESOURCE_COLLISION", 409],
    ["AREA_DELETE_MODULE_REVISION_CONFLICT", "AREA_DELETE_STORAGE_UNAVAILABLE", 412],
  ] as const)("maps scanner failure %s without losing status/details", async (source, expected, status) => {
    const harness = createHarness();
    harness.scanner.scan.mockRejectedValue(new AreaDeletePreviewError(
      source, status, "scan failed", ["detail-1"],
    ));
    await expect(harness.compiler.compile(
      command(harness.revision, harness.preview.previewSha256),
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "admin-01", "delete-tx-01",
    )).rejects.toMatchObject({ code: expected, status, message: "scan failed", details: ["detail-1"] });
  });

  it.each([
    { moduleId: "workspace:other", revision: "same", quarantined: false },
    { moduleId: MODULE_ID, revision: "other", quarantined: false },
    { moduleId: MODULE_ID, revision: "same", quarantined: true },
  ])("rejects locked module state outside command scope %#", async (partial) => {
    const harness = createHarness();
    const state = {
      moduleId: partial.moduleId,
      revision: partial.revision === "same" ? harness.revision : "0".repeat(64),
      quarantined: partial.quarantined,
    };
    await expect(harness.compiler.compile(
      command(harness.revision, harness.preview.previewSha256),
      state,
      "admin-01", "delete-tx-01",
    )).rejects.toMatchObject({ code: "AREA_DELETE_STORAGE_UNAVAILABLE", status: 503 });
    expect(harness.scanner.scan).not.toHaveBeenCalled();
  });

  it.each([
    ["missing", null],
    ["quarantined", { quarantined: true }],
    ["revision", { revision: "0".repeat(64) }],
    ["module", { moduleId: "workspace:other" }],
  ] as const)("rejects changed snapshot head: %s", async (_label, override) => {
    const harness = createHarness();
    const current = await harness.repository.readHead();
    harness.repository.readHead.mockClear();
    harness.repository.readHead.mockImplementation(async () =>
      (override === null ? null : { ...current!, ...override }) as never,
    );
    await expect(harness.compiler.compile(
      command(harness.revision, harness.preview.previewSha256),
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "admin-01", "delete-tx-01",
    )).rejects.toMatchObject({ code: "AREA_DELETE_STORAGE_UNAVAILABLE", status: 503 });
  });

  it("rejects missing/corrupt manifests and a missing target descriptor with distinct failures", async () => {
    const missingManifest = createHarness();
    missingManifest.repository.readManifest.mockImplementation(async () => null as never);
    await expect(missingManifest.compiler.compile(
      command(missingManifest.revision, missingManifest.preview.previewSha256),
      { moduleId: MODULE_ID, revision: missingManifest.revision, quarantined: false },
      "admin-01", "delete-tx-01",
    )).rejects.toMatchObject({ code: "AREA_DELETE_STORAGE_UNAVAILABLE" });

    const corrupt = createHarness();
    const baseline = await corrupt.repository.readManifest();
    corrupt.repository.readManifest.mockResolvedValue({ ...baseline!, revision: "0".repeat(64) });
    await expect(corrupt.compiler.compile(
      command(corrupt.revision, corrupt.preview.previewSha256),
      { moduleId: MODULE_ID, revision: corrupt.revision, quarantined: false },
      "admin-01", "delete-tx-01",
    )).rejects.toMatchObject({ code: "AREA_DELETE_STORAGE_UNAVAILABLE" });

    const sourceMissing = createHarness();
    const contents = moduleContents();
    delete contents[`${TARGET}.are`];
    installSnapshot(sourceMissing, contents);
    await expect(sourceMissing.compiler.compile(
      command(sourceMissing.revision, sourceMissing.preview.previewSha256),
      { moduleId: MODULE_ID, revision: sourceMissing.revision, quarantined: false },
      "admin-01", "delete-tx-01",
    )).rejects.toMatchObject({ code: "AREA_DELETE_SOURCE_MISSING", status: 404 });
  });

  it("rejects wrong target resource types and every retained-content integrity mismatch", async () => {
    const collision = createHarness();
    installSnapshot(collision, moduleContents(), { "delete01.are": 2023 });
    await expect(collision.compiler.compile(
      command(collision.revision, collision.preview.previewSha256),
      { moduleId: MODULE_ID, revision: collision.revision, quarantined: false },
      "admin-01", "delete-tx-01",
    )).rejects.toMatchObject({ code: "AREA_DELETE_RESOURCE_COLLISION", status: 409 });

    for (const retained of [
      null,
      { contentKey: "bad", size: 999, sha256: "f".repeat(64), bytes: Buffer.from("bad") },
      { contentKey: "bad", size: 3, sha256: "f".repeat(64), bytes: Buffer.from("bad") },
      { contentKey: "bad", size: 3, sha256: sha(Buffer.from("bad")), bytes: Buffer.from("bad") },
    ]) {
      const harness = createHarness();
      harness.repository.readContent.mockResolvedValue(retained);
      await expect(harness.compiler.compile(
        command(harness.revision, harness.preview.previewSha256),
        { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
        "admin-01", "delete-tx-01",
      )).rejects.toMatchObject({ code: "AREA_DELETE_STORAGE_UNAVAILABLE", status: 503 });
    }
  });

  it("maps an ambiguous IFO membership rebuild to the membership failure", async () => {
    const harness = createHarness();
    const contents = moduleContents();
    contents["module.ifo"] = buildGffBuffer([{
      label: "Mod_Area_list", type: "list",
      value: [TARGET, TARGET].map((area) => ({
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref" as const, value: area }],
      })),
    }], "IFO ", 0);
    installSnapshot(harness, contents);
    await expect(harness.compiler.compile(
      command(harness.revision, harness.preview.previewSha256),
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "admin-01", "delete-tx-01",
    )).rejects.toMatchObject({
      code: "AREA_DELETE_MEMBERSHIP_INVALID", status: 409,
      details: [expect.stringContaining("exactly one target Area membership")],
    });
  });
});

function createHarness() {
  const contents = moduleContents();
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
  const byKey = new Map(manifest.objects.map((descriptor) => [
    descriptor.contentKey,
    contents[descriptor.logicalKey],
  ]));
  const repository = {
    readHead: jest.fn(async () => ({
      schemaVersion: "aurora-module-snapshot-head.v1" as const,
      moduleId: MODULE_ID,
      revision: manifest.revision,
      manifestKey: buildModuleSnapshotManifestKey(manifest),
      manifestSha256: hashModuleSnapshotManifest(manifest),
      quarantined: false,
      fencingToken: 1,
      updatedAt: "2026-08-12T12:00:00.000Z",
    })),
    readManifest: jest.fn(async () => manifest),
    readContent: jest.fn(async (contentKey: string) => {
      const bytes = byKey.get(contentKey);
      return bytes ? { contentKey, size: bytes.length, sha256: sha(bytes), bytes } : null;
    }),
  };
  const preview = {
    schemaVersion: "area-delete-preview.v1",
    scanVersion: "area-delete-impact-scan.v1",
    moduleId: MODULE_ID,
    areaResRef: TARGET,
    moduleRevision: manifest.revision,
    targetResources: manifest.objects
      .filter((entry) => entry.logicalKey.startsWith(`${TARGET}.`))
      .map(({ contentKey: _contentKey, ...entry }) => entry),
    moduleIfo: (() => {
      const { contentKey: _contentKey, ...ifo } = manifest.objects.find((entry) => entry.logicalKey === "module.ifo")!;
      return ifo;
    })(),
    membershipCount: 1,
    entryAreaResRef: "keep01",
    findings: [] as Array<Record<string, unknown>>,
    blockerCount: 0,
    warningCount: 0,
    previewSha256: "a".repeat(64),
    expiresAt: "2026-08-12T12:05:00.000Z",
  };
  const scanner = { scan: jest.fn(async () => preview) };
  return {
    revision: manifest.revision,
    preview,
    repository,
    scanner,
    compiler: new AreaDeleteCandidateCompiler({
      repository: repository as unknown as Pick<AtomicModuleSnapshotRepositoryPort, "readHead" | "readManifest" | "readContent">,
      scanner: scanner as never,
    }),
  };
}

function command(expectedModuleRevision: string, previewSha256: string) {
  return {
    schemaVersion: "area-delete-command.v1" as const,
    moduleId: MODULE_ID,
    areaResRef: TARGET,
    expectedModuleRevision,
    preview: { sha256: previewSha256 },
    confirmation: { areaResRef: TARGET, policy: "block_on_references" as const },
    clientCommandId: "client-01",
  };
}

function moduleContents(): Record<string, Buffer> {
  return {
    "delete01.are": buildGffBuffer([], "ARE ", 0),
    "delete01.git": buildGffBuffer([], "GIT ", 0),
    "delete01.gic": buildGffBuffer([], "GIC ", 0),
    "keep01.are": buildGffBuffer([], "ARE ", 0),
    "keep01.git": buildGffBuffer([], "GIT ", 0),
    "keep01.gic": buildGffBuffer([], "GIC ", 0),
    "module.ifo": buildGffBuffer([
      { label: "Mod_Entry_Area", type: "resref", value: "keep01" },
      {
        label: "Mod_Area_list",
        type: "list",
        value: [TARGET, "keep01"].map((area) => ({
          typeId: 6,
          fields: [{ label: "Area_Name", type: "resref" as const, value: area }],
        })),
      },
    ], "IFO ", 0),
  };
}

function resourceType(logicalKey: string): number {
  if (logicalKey.endsWith(".are")) return 2012;
  if (logicalKey.endsWith(".git")) return 2023;
  if (logicalKey.endsWith(".gic")) return 2046;
  return 2014;
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function installSnapshot(
  harness: ReturnType<typeof createHarness>,
  contents: Record<string, Buffer>,
  typeOverrides: Record<string, number> = {},
): void {
  const manifest = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(contents).map(([logicalKey, bytes]) => ({
      logicalKey,
      resourceType: typeOverrides[logicalKey] ?? resourceType(logicalKey),
      size: bytes.length,
      sha256: sha(bytes),
    })),
  });
  const byKey = new Map(manifest.objects.map((entry) => [
    entry.contentKey,
    contents[entry.logicalKey],
  ]));
  harness.revision = manifest.revision;
  harness.preview.moduleRevision = manifest.revision;
  harness.repository.readHead.mockResolvedValue({
    schemaVersion: "aurora-module-snapshot-head.v1",
    moduleId: MODULE_ID,
    revision: manifest.revision,
    manifestKey: buildModuleSnapshotManifestKey(manifest),
    manifestSha256: hashModuleSnapshotManifest(manifest),
    quarantined: false,
    fencingToken: 1,
    updatedAt: "2026-08-12T12:00:00.000Z",
  });
  harness.repository.readManifest.mockResolvedValue(manifest);
  harness.repository.readContent.mockImplementation(async (contentKey: string) => {
    const bytes = byKey.get(contentKey);
    return bytes ? { contentKey, size: bytes.length, sha256: sha(bytes), bytes } : null;
  });
}
