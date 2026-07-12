import { createHash } from "node:crypto";
import { copyFile, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, parse, resolve } from "node:path";

const RESOURCE_TYPE_NCS = 2010;
const MODULE_LAB_NAME = process.env.VFX_LAB_MODULE_FILE || "the_last_city — codex vfx_catalog_lab.mod";
const backendRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "vfx-catalog-lab-map"
);
const compiledScriptsDir = join(outputRoot, "compiled-scripts");

function getNwnUserRoot() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("USERPROFILE/HOME is required to locate Neverwinter Nights documents.");
  }
  return join(home, "Documents", "Neverwinter Nights");
}

function readErfEntries(bytes, sourcePath) {
  if (bytes.length < 160) {
    throw new Error(`ERF file is too small: ${sourcePath}`);
  }

  const signature = bytes.toString("ascii", 0, 4);
  const version = bytes.toString("ascii", 4, 8);
  if (!["MOD ", "HAK ", "ERF ", "NWM "].includes(signature)) {
    throw new Error(`Unsupported ERF signature ${JSON.stringify(signature)} in ${sourcePath}`);
  }
  if (version !== "V1.0" && version !== "V1.1") {
    throw new Error(`Unsupported ERF version ${JSON.stringify(version)} in ${sourcePath}`);
  }

  const keyEntrySize = version === "V1.1" ? 40 : 24;
  const resrefLength = version === "V1.1" ? 32 : 16;
  const entryCount = bytes.readUInt32LE(16);
  const localizedStringSize = bytes.readUInt32LE(12);
  const localizedStringOffset = bytes.readUInt32LE(20);
  const keyListOffset = bytes.readUInt32LE(24);
  const resourceListOffset = bytes.readUInt32LE(28);
  const localizedStrings =
    localizedStringSize > 0
      ? Buffer.from(bytes.subarray(localizedStringOffset, localizedStringOffset + localizedStringSize))
      : Buffer.alloc(0);

  const entries = [];
  for (let index = 0; index < entryCount; index += 1) {
    const keyOffset = keyListOffset + index * keyEntrySize;
    const resourceOffset = resourceListOffset + index * 8;
    const resref = bytes
      .subarray(keyOffset, keyOffset + resrefLength)
      .toString("ascii")
      .replace(/\0.*$/u, "")
      .trim()
      .toLowerCase();
    const type = bytes.readUInt16LE(keyOffset + resrefLength + 4);
    const dataOffset = bytes.readUInt32LE(resourceOffset);
    const size = bytes.readUInt32LE(resourceOffset + 4);
    entries.push({
      resref,
      type,
      bytes: Buffer.from(bytes.subarray(dataOffset, dataOffset + size))
    });
  }

  return {
    header: Buffer.from(bytes.subarray(0, 160)),
    localizedStrings,
    entries
  };
}

function buildErfV10FromEntries(originalHeader, localizedStrings, entries) {
  const keyEntrySize = 24;
  const resourceEntrySize = 8;
  const header = Buffer.from(originalHeader);
  const entryCount = entries.length;
  const localizedStringOffset = 160;
  const keyListOffset = localizedStringOffset + localizedStrings.length;
  const resourceListOffset = keyListOffset + entryCount * keyEntrySize;
  const resourceDataOffsetStart = resourceListOffset + entryCount * resourceEntrySize;

  header.writeUInt32LE(entryCount, 16);
  header.writeUInt32LE(localizedStringOffset, 20);
  header.writeUInt32LE(keyListOffset, 24);
  header.writeUInt32LE(resourceListOffset, 28);

  const keyTable = Buffer.alloc(entryCount * keyEntrySize);
  const resourceTable = Buffer.alloc(entryCount * resourceEntrySize);
  const payloads = [];
  let currentOffset = resourceDataOffsetStart;

  entries.forEach((entry, index) => {
    if (entry.resref.length > 16) {
      throw new Error(`Resource resref exceeds ERF V1.0 limit: ${entry.resref}`);
    }

    const keyOffset = index * keyEntrySize;
    const resourceOffset = index * resourceEntrySize;
    Buffer.from(entry.resref.toLowerCase(), "ascii").copy(keyTable, keyOffset);
    keyTable.writeUInt32LE(index, keyOffset + 16);
    keyTable.writeUInt16LE(entry.type, keyOffset + 20);
    keyTable.writeUInt16LE(0, keyOffset + 22);

    resourceTable.writeUInt32LE(currentOffset, resourceOffset);
    resourceTable.writeUInt32LE(entry.bytes.length, resourceOffset + 4);
    payloads.push(entry.bytes);
    currentOffset += entry.bytes.length;
  });

  return Buffer.concat([header, localizedStrings, keyTable, resourceTable, ...payloads]);
}

async function main() {
  if (!existsSync(compiledScriptsDir)) {
    throw new Error(`Compiled scripts directory does not exist: ${compiledScriptsDir}`);
  }

  const nwnRoot = getNwnUserRoot();
  const labModulePath = join(nwnRoot, "modules", MODULE_LAB_NAME);
  if (!existsSync(labModulePath)) {
    throw new Error(`Lab module not found: ${labModulePath}`);
  }

  const compiledFiles = (await readdir(compiledScriptsDir))
    .filter((fileName) => extname(fileName).toLowerCase() === ".ncs")
    .sort((a, b) => a.localeCompare(b));
  if (compiledFiles.length === 0) {
    throw new Error(`No .ncs files found in ${compiledScriptsDir}`);
  }

  const compiledEntries = [];
  for (const fileName of compiledFiles) {
    const resref = parse(fileName).name.toLowerCase();
    if (resref.length > 16) {
      throw new Error(`Compiled script resref exceeds ERF V1.0 limit: ${resref}`);
    }
    compiledEntries.push({
      resref,
      type: RESOURCE_TYPE_NCS,
      bytes: await readFile(join(compiledScriptsDir, fileName))
    });
  }

  const moduleBytes = await readFile(labModulePath);
  const erf = readErfEntries(moduleBytes, labModulePath);
  const compiledKeys = new Set(
    compiledEntries.map((entry) => `${entry.resref}:${entry.type}`)
  );
  const mergedEntries = [
    ...erf.entries.filter((entry) => !compiledKeys.has(`${entry.resref}:${entry.type}`)),
    ...compiledEntries
  ];

  const generatedAt = new Date().toISOString();
  const backupPath = `${labModulePath}.pre-vfxlab-ncs-${generatedAt.replace(/[:.]/g, "-")}.bak`;
  await copyFile(labModulePath, backupPath);
  const repacked = buildErfV10FromEntries(erf.header, erf.localizedStrings, mergedEntries);
  await writeFile(labModulePath, repacked);

  const finalModuleBytes = await readFile(labModulePath);
  const finalErf = readErfEntries(finalModuleBytes, labModulePath);
  const finalKeys = new Set(
    finalErf.entries.map((entry) => `${entry.resref}:${entry.type}`)
  );
  const missingCompiledScripts = compiledEntries
    .filter((entry) => !finalKeys.has(`${entry.resref}:${entry.type}`))
    .map((entry) => entry.resref);

  const summary = {
    version: "aurora-vfx-catalog-lab-compiled-injection/v1",
    generatedAt,
    labModulePath,
    backupPath,
    compiledScriptsDir,
    compiledScriptCount: compiledEntries.length,
    originalEntryCount: erf.entries.length,
    finalEntryCount: finalErf.entries.length,
    missingCompiledScripts,
    labSha256: createHash("sha256").update(finalModuleBytes).digest("hex")
  };
  await writeFile(
    join(outputRoot, "compiled-injection-summary.json"),
    JSON.stringify(summary, null, 2),
    "utf-8"
  );
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
