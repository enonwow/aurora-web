import { createHash } from "node:crypto";
import { CommittedAreaEventScriptSourceQueryAdapter } from "../../src/modules/areas/adapters/outbound/snapshot/committed-area-event-script-source-query.adapter";
import {
  buildModuleSnapshotContentKey,
  buildModuleSnapshotManifestKey,
  createModuleSnapshotManifest,
  hashModuleSnapshotManifest,
} from "../../src/modules/areas/domain/module-snapshot-manifest";

const MODULE_ID = "module:test";
const NOW = "2026-08-26T12:00:00.000Z";

describe("committed Area event-script source query adapter", () => {
  it("returns one exact lossless UTF-8 NSS source from the fenced revision", async () => {
    const bytes = Buffer.from("#include \"shared\"\nvoid main() {}\n", "utf8");
    const harness = createHarness("area_enter.nss", 2009, bytes);

    const result = await new CommittedAreaEventScriptSourceQueryAdapter(
      harness.repository,
    ).read({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: harness.manifest.revision,
    });

    expect(result).toEqual({
      schemaVersion: "area-event-script-source-snapshot.v1",
      moduleId: MODULE_ID,
      moduleRevision: harness.manifest.revision,
      targetResRef: "area_enter",
      sourceEncoding: "utf-8",
      sourceText: bytes.toString("utf8"),
      sourceSize: bytes.length,
      sourceSha256: sha(bytes),
    });
    expect(Object.isFrozen(result)).toBe(true);
  });

  it("fails before content read when the requested revision is stale", async () => {
    const harness = createHarness("area_enter.nss", 2009, Buffer.from("void main() {}"));

    await expect(new CommittedAreaEventScriptSourceQueryAdapter(harness.repository).read({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: "f".repeat(64),
    })).rejects.toThrow("AREA_EVENT_SCRIPT_MODULE_REVISION_CONFLICT");
    expect(harness.repository.readContent).not.toHaveBeenCalled();
  });

  it("distinguishes a missing NSS from an invalid committed descriptor", async () => {
    const missing = createHarness("other.nss", 2009, Buffer.from("void main() {}"));
    const wrongType = createHarness("area_enter.nss", 2010, Buffer.from("compiled"));

    await expect(new CommittedAreaEventScriptSourceQueryAdapter(missing.repository).read({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: missing.manifest.revision,
    })).rejects.toThrow("AREA_EVENT_SCRIPT_SOURCE_NOT_FOUND");
    await expect(new CommittedAreaEventScriptSourceQueryAdapter(wrongType.repository).read({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: wrongType.manifest.revision,
    })).rejects.toThrow("AREA_EVENT_SCRIPT_STORAGE_UNAVAILABLE");
  });

  it("rejects non-lossless UTF-8 source instead of replacing bytes", async () => {
    const harness = createHarness("area_enter.nss", 2009, Buffer.from([0xc3, 0x28]));

    await expect(new CommittedAreaEventScriptSourceQueryAdapter(harness.repository).read({
      moduleId: MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: harness.manifest.revision,
    })).rejects.toThrow("AREA_EVENT_SCRIPT_SOURCE_INVALID");
  });
});

function createHarness(logicalKey: string, resourceType: number, bytes: Buffer) {
  const digest = sha(bytes);
  const manifest = createModuleSnapshotManifest({
    moduleId: MODULE_ID,
    parentRevision: null,
    objects: [{ logicalKey, resourceType, size: bytes.length, sha256: digest }],
  });
  const content = {
    contentKey: buildModuleSnapshotContentKey(digest),
    size: bytes.length,
    sha256: digest,
    bytes: Buffer.from(bytes),
  };
  const repository = {
    readHead: jest.fn(async () => ({
      schemaVersion: "aurora-module-snapshot-head.v1" as const,
      moduleId: MODULE_ID,
      revision: manifest.revision,
      manifestKey: buildModuleSnapshotManifestKey(manifest),
      manifestSha256: hashModuleSnapshotManifest(manifest),
      quarantined: false,
      fencingToken: 1,
      updatedAt: NOW,
    })),
    readManifest: jest.fn(async () => manifest),
    readContent: jest.fn(async () => content),
  };
  return { manifest, repository };
}

function sha(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
