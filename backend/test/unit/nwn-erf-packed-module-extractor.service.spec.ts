import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { NwnErfPackedModuleExtractorService } from "../../src/modules/runtime-settings/adapters/outbound/nwn/nwn-erf-packed-module-extractor.service";

describe("NwnErfPackedModuleExtractorService", () => {
  const tempDir = path.resolve(
    tmpdir(),
    "aurora-web-backend-tests",
    "packed-module-extractor"
  );
  const modulePath = path.join(tempDir, "test.mod");
  const service = new NwnErfPackedModuleExtractorService();

  beforeAll(async () => {
    await mkdir(tempDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it("extracts resources from packed module and maps file names", async () => {
    const fileBuffer = buildErfV10File([
      { resref: "module", restype: 2014, bytes: Buffer.from("ifo-data") },
      { resref: "module", restype: 9999, bytes: Buffer.from([1, 2, 3]) }
    ]);
    await writeFile(modulePath, fileBuffer);

    const extracted = await service.extractFromPackedModule(modulePath);

    expect(extracted).toHaveLength(2);
    expect(extracted[0]).toMatchObject({
      fileName: "module.ifo",
      resourceType: 2014
    });
    expect(extracted[0].bytes.toString("utf-8")).toBe("ifo-data");

    expect(extracted[1]).toMatchObject({
      fileName: "module.r9999",
      resourceType: 9999
    });
    expect(extracted[1].bytes).toEqual(Buffer.from([1, 2, 3]));
  });

  it("throws on invalid signature", async () => {
    const invalidPath = path.join(tempDir, "invalid.mod");
    const invalidBuffer = Buffer.alloc(160);
    invalidBuffer.write("BAD!", 0, 4, "ascii");
    invalidBuffer.write("V1.0", 4, 4, "ascii");
    await writeFile(invalidPath, invalidBuffer);

    await expect(service.extractFromPackedModule(invalidPath)).rejects.toThrow(
      "Unsupported module signature"
    );
  });
});

function buildErfV10File(
  entries: Array<{ resref: string; restype: number; bytes: Buffer }>
): Buffer {
  const header = Buffer.alloc(160);
  const keyListOffset = 160;
  const keyEntrySize = 24;
  const resourceListOffset = keyListOffset + entries.length * keyEntrySize;
  const resourceListEntrySize = 8;
  const resourceDataOffsetStart =
    resourceListOffset + entries.length * resourceListEntrySize;

  header.write("MOD ", 0, 4, "ascii");
  header.write("V1.0", 4, 4, "ascii");
  header.writeUInt32LE(0, 8); // language_count
  header.writeUInt32LE(0, 12); // localized_string_size
  header.writeUInt32LE(entries.length, 16); // entry_count
  header.writeUInt32LE(0, 20); // offset_to_localized_strings
  header.writeUInt32LE(keyListOffset, 24); // offset_to_key_list
  header.writeUInt32LE(resourceListOffset, 28); // offset_to_resource_list

  const keyTable = Buffer.alloc(entries.length * keyEntrySize);
  const resourceTable = Buffer.alloc(entries.length * resourceListEntrySize);
  const payloadBuffers: Buffer[] = [];

  let currentOffset = resourceDataOffsetStart;

  entries.forEach((entry, index) => {
    const keyOffset = index * keyEntrySize;
    const resrefBytes = Buffer.from(entry.resref.toLowerCase(), "ascii");
    resrefBytes.copy(keyTable, keyOffset, 0, Math.min(resrefBytes.length, 16));
    keyTable.writeUInt32LE(index, keyOffset + 16); // resource_id
    keyTable.writeUInt16LE(entry.restype, keyOffset + 20);
    keyTable.writeUInt16LE(0, keyOffset + 22); // unused

    const resourceOffset = index * resourceListEntrySize;
    resourceTable.writeUInt32LE(currentOffset, resourceOffset);
    resourceTable.writeUInt32LE(entry.bytes.length, resourceOffset + 4);
    payloadBuffers.push(entry.bytes);
    currentOffset += entry.bytes.length;
  });

  return Buffer.concat([header, keyTable, resourceTable, ...payloadBuffers]);
}
