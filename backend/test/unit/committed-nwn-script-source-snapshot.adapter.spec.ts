import { createHash } from "node:crypto";
import { CommittedNwnScriptSourceSnapshotAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/committed-nwn-script-source-snapshot.adapter";
import type { AtomicModuleSnapshotRepositoryPort } from "../../src/modules/areas/application/ports/atomic-module-snapshot.port";
import {
  buildModuleSnapshotContentKey,
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";

const MODULE_ID = "module:test";
const NOW = "2026-08-26T12:00:00.000Z";

describe("committed NWScript source snapshot adapter", () => {
  it("resolves one exact sorted include set from the requested immutable revision", async () => {
    const harness = createHarness({
      "z_shared.nss": { resourceType: 2009, bytes: Buffer.from("int Z = 1;", "utf8") },
      "a_shared.nss": { resourceType: 2009, bytes: Buffer.from("int A = 2;", "utf8") },
    });
    const adapter = new CommittedNwnScriptSourceSnapshotAdapter(harness.repository);

    const captured = await adapter.capture({
      moduleId: MODULE_ID,
      expectedModuleRevision: harness.manifest.revision,
      targetSourceSize: 16,
      includeResRefs: ["z_shared", "a_shared"],
    });

    expect(captured.moduleId).toBe(MODULE_ID);
    expect(captured.revision).toBe(harness.manifest.revision);
    expect(captured.includes.map((entry) => entry.resref)).toEqual([
      "a_shared",
      "z_shared",
    ]);
    expect(captured.includes[0].bytes.toString("utf8")).toBe("int A = 2;");
    expect(Object.isFrozen(captured)).toBe(true);
    captured.includes[0].bytes[0] = 0;
    expect(harness.contents.get("a_shared.nss")?.bytes.toString("utf8")).toBe(
      "int A = 2;",
    );
  });

  it("fails before include readback when the requested revision is stale", async () => {
    const harness = createHarness({
      "a_shared.nss": { resourceType: 2009, bytes: Buffer.from("int A = 2;") },
    });
    const adapter = new CommittedNwnScriptSourceSnapshotAdapter(harness.repository);

    await expect(
      adapter.capture({
        moduleId: MODULE_ID,
        expectedModuleRevision: "f".repeat(64),
        targetSourceSize: 16,
        includeResRefs: ["a_shared"],
      }),
    ).rejects.toThrow("AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT");
    expect(harness.repository.readContent).not.toHaveBeenCalled();
  });

  it.each([
    ["missing include", {}, "missing"],
    [
      "wrong resource type",
      { "shared.nss": { resourceType: 2010, bytes: Buffer.from("wrong") } },
      "shared",
    ],
    [
      "oversized include",
      { "shared.nss": { resourceType: 2009, bytes: Buffer.alloc(256 * 1024 + 1) } },
      "shared",
    ],
  ])("rejects %s", async (_label, objects, includeResRef) => {
    const harness = createHarness(objects);
    const adapter = new CommittedNwnScriptSourceSnapshotAdapter(harness.repository);

    await expect(
      adapter.capture({
        moduleId: MODULE_ID,
        expectedModuleRevision: harness.manifest.revision,
        targetSourceSize: 16,
        includeResRefs: [includeResRef],
      }),
    ).rejects.toThrow("AREA_EVENT_SCRIPT_INCLUDE_INVALID");
  });

  it("rejects content that does not match the committed descriptor", async () => {
    const harness = createHarness({
      "shared.nss": { resourceType: 2009, bytes: Buffer.from("expected") },
    });
    harness.repository.readContent.mockResolvedValueOnce({
      contentKey: buildModuleSnapshotContentKey(
        harness.manifest.objects[0].sha256,
      ),
      size: 5,
      sha256: harness.manifest.objects[0].sha256,
      bytes: Buffer.from("wrong"),
    });

    await expect(
      new CommittedNwnScriptSourceSnapshotAdapter(harness.repository).capture({
        moduleId: MODULE_ID,
        expectedModuleRevision: harness.manifest.revision,
        targetSourceSize: 16,
        includeResRefs: ["shared"],
      }),
    ).rejects.toThrow("AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE");
  });

  it("enforces the 8 MiB compiler-input budget across target and committed includes", async () => {
    const includeBytes = Buffer.alloc(256 * 1024, 0x61);
    const objects = Object.fromEntries(
      Array.from({ length: 32 }, (_, index) => [
        `shared_${index.toString().padStart(2, "0")}.nss`,
        { resourceType: 2009, bytes: includeBytes },
      ]),
    );
    const harness = createHarness(objects);

    await expect(
      new CommittedNwnScriptSourceSnapshotAdapter(harness.repository).capture({
        moduleId: MODULE_ID,
        expectedModuleRevision: harness.manifest.revision,
        targetSourceSize: 1,
        includeResRefs: Object.keys(objects).map((key) => key.slice(0, -4)),
      }),
    ).rejects.toThrow("AREA_EVENT_SCRIPT_INCLUDE_INVALID");
  });
});

function createHarness(
  objects: Record<string, { resourceType: number; bytes: Buffer }>,
) {
  const contents = new Map(
    Object.entries(objects).map(([logicalKey, value]) => {
      const digest = sha(value.bytes);
      return [logicalKey, {
        contentKey: buildModuleSnapshotContentKey(digest),
        size: value.bytes.length,
        sha256: digest,
        bytes: Buffer.from(value.bytes),
      }] as const;
    }),
  );
  const manifest = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: Object.entries(objects).map(([logicalKey, value]) => ({
      logicalKey,
      resourceType: value.resourceType,
      size: value.bytes.length,
      sha256: sha(value.bytes),
    })),
  });
  const head = Object.freeze({
    schemaVersion: "aurora-module-snapshot-head.v1" as const,
    moduleId: MODULE_ID,
    revision: manifest.revision,
    manifestKey: buildModuleSnapshotManifestKey(manifest),
    manifestSha256: hashModuleSnapshotManifest(manifest),
    quarantined: false,
    fencingToken: 1,
    updatedAt: NOW,
  });
  const repository = {
    readHead: jest.fn().mockResolvedValue(head),
    readManifest: jest.fn().mockResolvedValue(manifest),
    readContent: jest.fn(async (contentKey: string) => {
      const found = [...contents.values()].find((entry) => entry.contentKey === contentKey);
      return found ? { ...found, bytes: Buffer.from(found.bytes) } : null;
    }),
  } as unknown as jest.Mocked<AtomicModuleSnapshotRepositoryPort>;
  return { repository, manifest, contents };
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
