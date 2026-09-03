import { createHash } from "node:crypto";
import {
  AreaRenameCandidateCompiler,
} from "../../src/modules/areas/application/area-rename-candidate.compiler";
import { AreaRenameImpactScanner } from "../../src/modules/areas/application/area-rename-impact-scanner";
import type { AtomicModuleSnapshotRepositoryPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import {
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import {
  readExactAreaRootResRef,
  readExactModuleAreaIdentity,
} from "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-resref-rename-writer";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MODULE_ID = "workspace:rename-compiler";
const SOURCE = "old_area";
const TARGET = "new_area";

describe("AreaRenameCandidateCompiler", () => {
  it("recomputes preview and builds one preserve-first successor manifest", async () => {
    const harness = createHarness();
    const preview = await harness.scanner.scan(scanCommand(harness.revision));

    const candidate = await harness.compiler.compile(
      command(harness.revision, preview.previewSha256),
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "admin-01",
      "rename-tx-01",
    );

    expect(candidate.resources.map((entry) => [entry.extension, entry.sourceKey, entry.targetKey])).toEqual([
      ["are", "old_area.are", "new_area.are"],
      ["gic", "old_area.gic", "new_area.gic"],
      ["git", "old_area.git", "new_area.git"],
    ]);
    expect(readExactAreaRootResRef(candidate.resources[0]!.candidateBytes)).toBe(TARGET);
    expect(candidate.resources[1]!.candidateBytes).toEqual(candidate.resources[1]!.baselineBytes);
    expect(candidate.resources[2]!.candidateBytes).toEqual(candidate.resources[2]!.baselineBytes);
    expect(readExactModuleAreaIdentity(candidate.moduleIfo.candidateBytes, SOURCE)?.membershipCount).toBe(0);
    expect(readExactModuleAreaIdentity(candidate.moduleIfo.candidateBytes, TARGET)).toMatchObject({
      membershipCount: 1,
      entryAreaResRef: TARGET,
    });
    expect(candidate.entryAreaUpdated).toBe(true);
    expect(candidate.successorManifest.parentRevision).toBe(candidate.baselineManifest.revision);
    expect(candidate.successorManifest.objects.map((entry) => entry.logicalKey)).toEqual([
      "keep01.are", "keep01.gic", "keep01.git", "module.ifo",
      "new_area.are", "new_area.gic", "new_area.git",
    ]);
    const baselineSurvivor = candidate.baselineManifest.objects.find((entry) => entry.logicalKey === "keep01.are");
    const successorSurvivor = candidate.successorManifest.objects.find((entry) => entry.logicalKey === "keep01.are");
    expect(successorSurvivor).toEqual(baselineSurvivor);
    expect(candidate.survivorCount).toBe(4);
  });

  it("preserves a different native entry Area", async () => {
    const harness = createHarness(moduleContents("keep01"));
    const preview = await harness.scanner.scan(scanCommand(harness.revision));

    const candidate = await harness.compiler.compile(
      command(harness.revision, preview.previewSha256),
      { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
      "admin-01",
      "rename-tx-02",
    );

    expect(candidate.entryAreaUpdated).toBe(false);
    expect(readExactModuleAreaIdentity(candidate.moduleIfo.candidateBytes, TARGET)?.entryAreaResRef)
      .toBe("keep01");
  });

  it("rejects stale preview and maps reference or incomplete-scan blockers", async () => {
    const stale = createHarness();
    await expect(stale.compiler.compile(
      command(stale.revision, "0".repeat(64)),
      { moduleId: MODULE_ID, revision: stale.revision, quarantined: false },
      "admin-01", "rename-tx-01",
    )).rejects.toMatchObject({ code: "AREA_RENAME_PREVIEW_STALE", status: 412 });

    for (const [findingCode, expectedCode] of [
      ["AREA_RENAME_STATIC_REFERENCE", "AREA_RENAME_REFERENCES_BLOCKED"],
      ["AREA_RENAME_SCAN_BUDGET_EXCEEDED", "AREA_RENAME_SCAN_INCOMPLETE"],
      ["AREA_RENAME_SOURCE_IDENTITY_INVALID", "AREA_RENAME_IDENTITY_INVALID"],
      ["AREA_RENAME_MEMBERSHIP_INVALID", "AREA_RENAME_MEMBERSHIP_INVALID"],
    ] as const) {
      const harness = createHarness();
      const clean = await harness.scanner.scan(scanCommand(harness.revision));
      const blocked = {
        ...clean,
        findings: [{
          code: findingCode,
          severity: "blocker" as const,
          resourceKey: "other.bin",
          fieldPath: "$binary",
          reason: "blocked",
        }],
        blockerCount: 1,
      };
      const scanner = { scan: jest.fn(async () => blocked) };
      const compiler = new AreaRenameCandidateCompiler({ repository: harness.repository, scanner });
      await expect(compiler.compile(
        command(harness.revision, clean.previewSha256),
        { moduleId: MODULE_ID, revision: harness.revision, quarantined: false },
        "admin-01", "rename-tx-01",
      )).rejects.toMatchObject({ code: expectedCode, status: 409 });
    }
  });

  it("fails closed when locked state or immutable content differs", async () => {
    const wrongState = createHarness();
    await expect(wrongState.compiler.compile(
      command(wrongState.revision, "0".repeat(64)),
      { moduleId: "workspace:other", revision: wrongState.revision, quarantined: false },
      "admin-01", "rename-tx-01",
    )).rejects.toMatchObject({ code: "AREA_RENAME_STORAGE_UNAVAILABLE", status: 503 });

    const corrupt = createHarness();
    const preview = await corrupt.scanner.scan(scanCommand(corrupt.revision));
    corrupt.repository.readContent.mockResolvedValue({
      contentKey: "bad", size: 3, sha256: "f".repeat(64), bytes: Buffer.from("bad"),
    });
    await expect(corrupt.compiler.compile(
      command(corrupt.revision, preview.previewSha256),
      { moduleId: MODULE_ID, revision: corrupt.revision, quarantined: false },
      "admin-01", "rename-tx-01",
    )).rejects.toMatchObject({ code: "AREA_RENAME_STORAGE_UNAVAILABLE", status: 503 });
  });
});

function scanCommand(expectedModuleRevision: string) {
  return { moduleId: MODULE_ID, areaResRef: SOURCE, targetAreaResRef: TARGET, expectedModuleRevision };
}

function command(expectedModuleRevision: string, previewSha256: string) {
  return {
    schemaVersion: "area-rename-command.v1" as const,
    moduleId: MODULE_ID,
    areaResRef: SOURCE,
    targetAreaResRef: TARGET,
    expectedModuleRevision,
    preview: { sha256: previewSha256 },
    confirmation: {
      sourceAreaResRef: SOURCE,
      targetAreaResRef: TARGET,
      policy: "block_on_references" as const,
    },
    clientCommandId: "client-01",
  };
}

function createHarness(contents = moduleContents(SOURCE)) {
  const manifest = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(contents).map(([logicalKey, bytes]) => ({
      logicalKey, resourceType: resourceType(logicalKey), size: bytes.length, sha256: sha(bytes),
    })),
  });
  const byKey = new Map(manifest.objects.map((entry) => [entry.contentKey, contents[entry.logicalKey]]));
  const repository = {
    readHead: jest.fn(async () => ({
      schemaVersion: "aurora-module-snapshot-head.v1" as const,
      moduleId: MODULE_ID,
      revision: manifest.revision,
      manifestKey: buildModuleSnapshotManifestKey(manifest),
      manifestSha256: hashModuleSnapshotManifest(manifest),
      quarantined: false,
      fencingToken: 1,
      updatedAt: "2026-08-24T10:00:00.000Z",
    })),
    readManifest: jest.fn(async () => manifest),
    readContent: jest.fn(async (contentKey: string) => {
      const bytes = byKey.get(contentKey);
      return bytes ? { contentKey, size: bytes.length, sha256: sha(bytes), bytes } : null;
    }),
  };
  const scanner = new AreaRenameImpactScanner(repository, { nowIso: () => "2026-08-24T10:00:00.000Z" });
  return {
    revision: manifest.revision,
    repository,
    scanner,
    compiler: new AreaRenameCandidateCompiler({
      repository: repository as Pick<AtomicModuleSnapshotRepositoryPort, "readHead" | "readManifest" | "readContent">,
      scanner,
    }),
  };
}

function moduleContents(entryArea: string): Record<string, Buffer> {
  return {
    "old_area.are": buildGffBuffer([{ label: "ResRef", type: "resref", value: SOURCE }], "ARE ", 0),
    "old_area.git": buildGffBuffer([], "GIT ", 0),
    "old_area.gic": buildGffBuffer([], "GIC ", 0),
    "keep01.are": buildGffBuffer([{ label: "ResRef", type: "resref", value: "keep01" }], "ARE ", 0),
    "keep01.git": buildGffBuffer([], "GIT ", 0),
    "keep01.gic": buildGffBuffer([], "GIC ", 0),
    "module.ifo": buildGffBuffer([
      { label: "Mod_Entry_Area", type: "resref", value: entryArea },
      { label: "Mod_Entry_X", type: "float", value: 1.25 },
      { label: "Mod_Entry_Y", type: "float", value: 2.5 },
      { label: "Mod_Entry_Z", type: "float", value: 0 },
      { label: "Mod_Entry_Dir_X", type: "float", value: 0 },
      { label: "Mod_Entry_Dir_Y", type: "float", value: 1 },
      {
        label: "Mod_Area_list", type: "list",
        value: [SOURCE, "keep01"].map((area, index) => ({
          typeId: 6 + index,
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
