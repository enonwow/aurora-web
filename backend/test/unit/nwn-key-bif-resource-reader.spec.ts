import { createHash } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES,
} from "../../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";

describe("NwnKeyBifResourceReader streamed descriptors", () => {
  it("hashes a multi-chunk BIF resource without changing exact read semantics", async () => {
    const root = await mkdtemp(join(tmpdir(), "aurora-key-bif-descriptor-"));
    try {
      const bytes = Buffer.alloc(2 * 1024 * 1024 + 137);
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = index % 251;
      const resources = [{
        resref: "ls_streamed",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TGA,
        bytes,
      }];
      const bifFileName = "descriptor_test.bif";
      const bif = buildFakeBif(resources);
      await writeFile(join(root, bifFileName), bif);
      await writeFile(join(root, "nwn_base.key"), buildFakeKey(
        bifFileName,
        bif.length,
        resources,
      ));

      const reader = await NwnKeyBifResourceReader.open(join(root, "nwn_base.key"), root);
      await expect(reader.describe("LS_STREAMED", NWN_KEY_BIF_RESOURCE_TYPES.TGA))
        .resolves.toEqual({
          sizeBytes: bytes.length,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        });
      await expect(reader.read("ls_streamed", NWN_KEY_BIF_RESOURCE_TYPES.TGA))
        .resolves.toEqual(bytes);
      await expect(reader.describe("missing", NWN_KEY_BIF_RESOURCE_TYPES.TGA))
        .resolves.toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("fails closed when the indexed BIF payload extends past the file boundary", async () => {
    const root = await mkdtemp(join(tmpdir(), "aurora-key-bif-invalid-descriptor-"));
    try {
      const resources = [{
        resref: "ls_invalid",
        resourceType: NWN_KEY_BIF_RESOURCE_TYPES.TGA,
        bytes: Buffer.from([1, 2, 3]),
      }];
      const bifFileName = "invalid_descriptor_test.bif";
      const bif = buildFakeBif(resources);
      bif.writeUInt32LE(bif.length + 1, 20 + 8);
      await writeFile(join(root, bifFileName), bif);
      await writeFile(join(root, "nwn_base.key"), buildFakeKey(
        bifFileName,
        bif.length,
        resources,
      ));

      const reader = await NwnKeyBifResourceReader.open(join(root, "nwn_base.key"), root);
      await expect(reader.describe("ls_invalid", NWN_KEY_BIF_RESOURCE_TYPES.TGA))
        .resolves.toBeNull();
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

function buildFakeBif(
  resources: Array<{ resref: string; resourceType: number; bytes: Buffer }>,
): Buffer {
  const headerSize = 20;
  const entrySize = 16;
  const dataOffset = headerSize + resources.length * entrySize;
  const totalSize = dataOffset + resources.reduce((sum, resource) => sum + resource.bytes.length, 0);
  const buffer = Buffer.alloc(totalSize);
  buffer.write("BIFF", 0, "ascii");
  buffer.write("V1  ", 4, "ascii");
  buffer.writeUInt32LE(resources.length, 8);
  buffer.writeUInt32LE(0, 12);
  buffer.writeUInt32LE(headerSize, 16);
  let cursor = dataOffset;
  resources.forEach((resource, index) => {
    const entryOffset = headerSize + index * entrySize;
    buffer.writeUInt32LE(index, entryOffset);
    buffer.writeUInt32LE(cursor, entryOffset + 4);
    buffer.writeUInt32LE(resource.bytes.length, entryOffset + 8);
    buffer.writeUInt32LE(resource.resourceType, entryOffset + 12);
    resource.bytes.copy(buffer, cursor);
    cursor += resource.bytes.length;
  });
  return buffer;
}

function buildFakeKey(
  bifFileName: string,
  bifSize: number,
  resources: Array<{ resref: string; resourceType: number; bytes: Buffer }>,
): Buffer {
  const fileTableOffset = 64;
  const keyTableOffset = fileTableOffset + 12;
  const fileNameOffset = keyTableOffset + resources.length * 22;
  const fileNameBytes = Buffer.from(`${bifFileName}\0`, "ascii");
  const buffer = Buffer.alloc(fileNameOffset + fileNameBytes.length);
  buffer.write("KEY ", 0, "ascii");
  buffer.write("V1  ", 4, "ascii");
  buffer.writeUInt32LE(1, 8);
  buffer.writeUInt32LE(resources.length, 12);
  buffer.writeUInt32LE(fileTableOffset, 16);
  buffer.writeUInt32LE(keyTableOffset, 20);
  buffer.writeUInt32LE(bifSize, fileTableOffset);
  buffer.writeUInt32LE(fileNameOffset, fileTableOffset + 4);
  buffer.writeUInt16LE(fileNameBytes.length, fileTableOffset + 8);
  fileNameBytes.copy(buffer, fileNameOffset);
  resources.forEach((resource, index) => {
    const entryOffset = keyTableOffset + index * 22;
    Buffer.from(resource.resref.toLowerCase().slice(0, 16), "ascii").copy(buffer, entryOffset);
    buffer.writeUInt16LE(resource.resourceType, entryOffset + 16);
    buffer.writeUInt32LE(index, entryOffset + 18);
  });
  return buffer;
}
