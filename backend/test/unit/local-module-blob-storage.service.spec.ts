import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LocalModuleBlobStorageService } from "../../src/modules/runtime-settings/adapters/outbound/file/local-module-blob-storage.service";
import type { BlobStorageSettings } from "../../src/modules/runtime-settings/domain/runtime-settings.types";

describe("LocalModuleBlobStorageService immutable objects", () => {
  let root: string;
  let service: LocalModuleBlobStorageService;

  const settings: BlobStorageSettings = {
    endpoint: "",
    region: "local",
    bucket: "local",
    modulePrefix: "modules/current",
    accessKeyId: "",
    secretAccessKey: "",
    forcePathStyle: true
  };

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "aurora-immutable-blob-"));
    service = new LocalModuleBlobStorageService({
      localBlobMirrorPath: root
    } as never);
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it("uses exclusive creation and treats identical bytes as an idempotent replay", async () => {
    const bytes = Buffer.from("immutable-area");
    const digest = sha256(bytes);
    const file = { fileName: "__aurora/cas/object", resourceType: 0, bytes };

    await expect(
      service.putImmutableModuleObject(settings, file, digest)
    ).resolves.toEqual(expect.objectContaining({ status: "created", sha256: digest }));
    await expect(
      service.putImmutableModuleObject(settings, file, digest)
    ).resolves.toEqual(
      expect.objectContaining({ status: "already_exists", sha256: digest })
    );
  });

  it("rejects a collision and preserves the first writer's bytes", async () => {
    const original = Buffer.from("immutable-area");
    const replacement = Buffer.from("different-area");
    const key = "__aurora/cas/object";
    await service.putImmutableModuleObject(
      settings,
      { fileName: key, resourceType: 0, bytes: original },
      sha256(original)
    );

    await expect(
      service.putImmutableModuleObject(
        settings,
        { fileName: key, resourceType: 0, bytes: replacement },
        sha256(replacement)
      )
    ).rejects.toThrow("MODULE_BLOB_IMMUTABLE_CONFLICT");
    expect(await readFile(join(root, "modules", "current", "__aurora", "cas", "object")))
      .toEqual(original);
  });
});

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
