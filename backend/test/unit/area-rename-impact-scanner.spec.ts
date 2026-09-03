import { createHash } from "node:crypto";
import { AreaRenameImpactScanner } from "../../src/modules/areas/application/area-rename-impact-scanner";
import type { AtomicModuleSnapshotRepositoryPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import {
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

const MODULE_ID = "workspace:rename-preview";
const SOURCE = "old_area";
const TARGET = "new_area";

describe("Area rename impact scanner", () => {
  it("produces a deterministic blocker-free preview for the four admitted identity surfaces", async () => {
    const first = scanner(cleanModule(), "2026-08-24T10:00:00.000Z");
    const second = scanner(cleanModule(), "2026-08-24T10:01:00.000Z");

    const left = await first.scan(command(first.revision));
    const right = await second.scan(command(second.revision));

    expect(left).toMatchObject({
      schemaVersion: "area-rename-preview.v1",
      scanVersion: "area-rename-impact-scan.v1",
      moduleId: MODULE_ID,
      areaResRef: SOURCE,
      targetAreaResRef: TARGET,
      moduleRevision: first.revision,
      sourceAreaRootResRef: SOURCE,
      oldMembershipCount: 1,
      newMembershipCount: 0,
      entryAreaResRef: SOURCE,
      entryAreaUpdated: true,
      blockerCount: 0,
      warningCount: 0,
      findings: [],
      expiresAt: "2026-08-24T10:05:00.000Z",
      scanBudgets: {
        maxObjects: 50_000,
        maxObjectBytes: 16 * 1024 * 1024,
        maxTotalBytes: 512 * 1024 * 1024,
        maxFindings: 256,
      },
    });
    expect(left.sourceResources.map((entry) => entry.logicalKey)).toEqual([
      "old_area.are", "old_area.gic", "old_area.git",
    ]);
    expect(left.targetResourceKeys).toEqual([
      "new_area.are", "new_area.gic", "new_area.git",
    ]);
    expect(left.previewSha256).toMatch(/^[a-f0-9]{64}$/u);
    expect(right.previewSha256).toBe(left.previewSha256);
    expect(right.expiresAt).not.toBe(left.expiresAt);
  });

  it("blocks exact tokens in single-byte, UTF-16LE, and UTF-16BE data but respects ResRef boundaries", async () => {
    const utf16be = Buffer.from(SOURCE, "utf16le");
    utf16be.swap16();
    const harness = scanner({
      ...cleanModule(),
      "ascii.bin": Buffer.from(`prefix:${SOURCE}:suffix`, "ascii"),
      "little.bin": Buffer.from(SOURCE, "utf16le"),
      "big.bin": utf16be,
      "boundary.bin": Buffer.from(`x${SOURCE}0 ${SOURCE}_tail`, "ascii"),
    });

    const preview = await harness.scan(command(harness.revision));

    expect(preview.findings.map((entry) => [entry.resourceKey, entry.fieldPath])).toEqual([
      ["ascii.bin", "$binary:single-byte"],
      ["big.bin", "$binary:utf-16be"],
      ["little.bin", "$binary:utf-16le"],
    ]);
    expect(preview.blockerCount).toBe(3);
  });

  it("blocks an additional old identity literal inside ARE while admitting the exact root field", async () => {
    const harness = scanner({
      ...cleanModule(),
      "old_area.are": buildGffBuffer([
        { label: "ResRef", type: "resref", value: SOURCE },
        { label: "Comments", type: "cexostring", value: SOURCE },
      ], "ARE ", 0),
    });

    const preview = await harness.scan(command(harness.revision));

    expect(preview.findings).toEqual([expect.objectContaining({
      code: "AREA_RENAME_STATIC_REFERENCE",
      resourceKey: "old_area.are",
      fieldPath: "$binary:single-byte",
    })]);
  });

  it("returns blockers for malformed required identities and companions", async () => {
    const harness = scanner({
      ...cleanModule(),
      "old_area.are": buildGffBuffer([
        { label: "resref", type: "resref", value: SOURCE },
      ], "ARE ", 0),
      "old_area.git": Buffer.from("not-git"),
      "module.ifo": buildGffBuffer([
        { label: "Mod_Entry_Area", type: "resref", value: SOURCE },
        { label: "Mod_Area_list", type: "list", value: [] },
      ], "IFO ", 0),
    });

    const preview = await harness.scan(command(harness.revision));

    expect(preview.findings.map((entry) => entry.code)).toEqual([
      "AREA_RENAME_COMPANION_INVALID",
      "AREA_RENAME_MEMBERSHIP_INVALID",
      "AREA_RENAME_SOURCE_IDENTITY_INVALID",
    ]);
  });

  it("fails closed for stale revision, target collision, missing source, and content mismatch", async () => {
    const stale = scanner(cleanModule());
    await expect(stale.scan(command("0".repeat(64)))).rejects.toMatchObject({
      code: "AREA_RENAME_MODULE_REVISION_CONFLICT",
      status: 412,
    });

    const collision = scanner({ ...cleanModule(), "new_area.are": areaAre(TARGET) });
    await expect(collision.scan(command(collision.revision))).rejects.toMatchObject({
      code: "AREA_RENAME_RESOURCE_COLLISION",
      status: 409,
    });

    const missing = scanner(Object.fromEntries(
      Object.entries(cleanModule()).filter(([key]) => key !== "old_area.gic"),
    ));
    await expect(missing.scan(command(missing.revision))).rejects.toMatchObject({
      code: "AREA_RENAME_SOURCE_MISSING",
      status: 404,
    });

    const corrupt = scanner(cleanModule());
    (corrupt.repository.readContent as jest.Mock).mockResolvedValue({
      contentKey: "sha256:bad",
      size: 3,
      sha256: "f".repeat(64),
      bytes: Buffer.from("bad"),
    });
    await expect(corrupt.scan(command(corrupt.revision))).rejects.toMatchObject({
      code: "AREA_RENAME_STORAGE_UNAVAILABLE",
      status: 503,
    });
  });
});

function command(expectedModuleRevision: string) {
  return {
    moduleId: MODULE_ID,
    areaResRef: SOURCE,
    targetAreaResRef: TARGET,
    expectedModuleRevision,
  } as const;
}

function cleanModule(): Record<string, Buffer> {
  return {
    "old_area.are": areaAre(SOURCE),
    "old_area.git": buildGffBuffer([], "GIT ", 0),
    "old_area.gic": buildGffBuffer([], "GIC ", 0),
    "keep01.are": areaAre("keep01"),
    "keep01.git": buildGffBuffer([], "GIT ", 0),
    "keep01.gic": buildGffBuffer([], "GIC ", 0),
    "module.ifo": moduleIfo(SOURCE),
  };
}

function areaAre(resRef: string): Buffer {
  return buildGffBuffer([{ label: "ResRef", type: "resref", value: resRef }], "ARE ", 0);
}

function moduleIfo(entryArea: string): Buffer {
  return buildGffBuffer([
    { label: "Mod_Entry_Area", type: "resref", value: entryArea },
    {
      label: "Mod_Area_list",
      type: "list",
      value: [SOURCE, "keep01"].map((area) => ({
        typeId: 6,
        fields: [{ label: "Area_Name", type: "resref" as const, value: area }],
      })),
    },
  ], "IFO ", 0);
}

function scanner(contents: Record<string, Buffer>, now = "2026-08-24T10:00:00.000Z") {
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
  const service = new AreaRenameImpactScanner(repository, { nowIso: () => now });
  return { revision: manifest.revision, repository, scan: service.scan.bind(service) };
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
