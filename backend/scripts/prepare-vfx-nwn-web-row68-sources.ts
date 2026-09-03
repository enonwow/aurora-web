import { createHash } from "node:crypto";
import { mkdir, stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  NWN_KEY_BIF_RESOURCE_TYPES,
  NwnKeyBifResourceReader
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { parseAuroraMdlVfxSource } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";
import { parseAuroraVisualEffectsTwoDa } from "../src/modules/vfx/domain/aurora-vfx-source.parser";
import { inspectAuroraMdlSource } from "../src/modules/runtime-settings/adapters/outbound/derived/aurora-mdl-ascii-to-glb.converter";

const NWN_ROOT = resolve(
  process.env.AURORA_NWN_ROOT ??
    "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights"
);
const KEY_FILES = ["nwn_base.key", "nwn_retail.key"] as const;
const options = parseArgs(process.argv.slice(2));
const SOURCE_ROW_ID = Number(options.rowId ?? 68);
const SOURCE_LABEL = options.label ?? "VFX_IMP_HEALING_M";
const FIXTURE_ID = options.fixtureId ?? "vfx-nwn-web-row68";
const REQUIRED_MODEL_REF = options.requiredModelRef ?? "vim_heal04";
const REPO_ROOT = resolve(__dirname, "../..");
const EVIDENCE_ROOT = resolve(
  REPO_ROOT,
  `backend/docs/aurora-reverse/evidence/${FIXTURE_ID}`
);
const SOURCE_ROOT = resolve(EVIDENCE_ROOT, "sources");

interface ReaderEntry {
  keyPath: string;
  reader: NwnKeyBifResourceReader;
}

interface LocatedResource {
  bytes: Buffer;
  keyPath: string;
  resref: string;
  resourceType: number;
}

async function main(): Promise<void> {
  const readers = await openRetailReaders();
  const visualEffects = await requireResource(
    readers,
    "visualeffects",
    NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA
  );
  const visualEffectsHash = sha256(visualEffects.bytes);
  const parsedTable = parseAuroraVisualEffectsTwoDa(visualEffects.bytes, {
    profile: "nwn-ee-retail-key-bif",
    sourceHash: visualEffectsHash,
    sourceLayer: "base_game",
    sourceObjectKey: `${normalizePath(visualEffects.keyPath)}::visualeffects.2da`
  });
  const sourceRow = parsedTable.rows.find((row) => row.rowId === SOURCE_ROW_ID);
  if (!sourceRow || sourceRow.label !== SOURCE_LABEL) {
    throw new Error(
      `Retail row ${SOURCE_ROW_ID} mismatch: ${sourceRow?.label ?? "missing"}.`
    );
  }

  const modelRefs = Array.from(
    new Set(
      sourceRow.phases.flatMap((phase) => Object.values(phase.modelNodeRefs))
    )
  ).sort();
  if (!modelRefs.includes(REQUIRED_MODEL_REF)) {
    throw new Error(
      `Retail row ${SOURCE_ROW_ID} does not reference required model ${REQUIRED_MODEL_REF}.`
    );
  }

  await mkdir(SOURCE_ROOT, { recursive: true });
  await writeFile(resolve(SOURCE_ROOT, "visualeffects.2da"), visualEffects.bytes);

  const modelReports = [];
  const textureRefs = new Map<string, string>();
  const chunkRefs = new Map<string, string>();
  for (const modelRef of modelRefs) {
    const model = await requireResource(readers, modelRef, NWN_KEY_BIF_RESOURCE_TYPES.MDL);
    const modelHash = sha256(model.bytes);
    await writeFile(resolve(SOURCE_ROOT, `${modelRef}.mdl`), model.bytes);
    const parsedModel = parseAuroraMdlVfxSource(model.bytes, {
      sourceModelObjectKey: `${normalizePath(model.keyPath)}::${modelRef}.mdl`,
      sourceModelFileName: `${modelRef}.mdl`,
      sourceModelHash: modelHash
    });
    const inspectedModel = inspectAuroraMdlSource(model.bytes);
    for (const emitter of parsedModel.emitters) {
      addResourceRef(textureRefs, emitter.texture);
      addResourceRef(chunkRefs, emitter.chunkName);
    }
    inspectedModel.textureReferences.forEach((ref) => addResourceRef(textureRefs, ref));
    modelReports.push({
      resref: modelRef,
      sourceKey: normalizePath(model.keyPath),
      sizeBytes: model.bytes.length,
      sha256: modelHash,
      sourceFormat: parsedModel.sourceFormat,
      emitterCount: parsedModel.emitters.length,
      lightCount: parsedModel.lights.length,
      staticGeometryCount: parsedModel.staticGeometryNodes.length,
      materialTextureRefs: inspectedModel.textureReferences,
      emitters: parsedModel.emitters.map((emitter) => ({
        nodeName: emitter.nodeName,
        parentNodeName: emitter.parentNodeName ?? null,
        texture: emitter.texture ?? null,
        chunkName: emitter.chunkName ?? null,
        emitterType: emitter.emitterType ?? null,
        renderMode: emitter.renderMode ?? null,
        blendMode: emitter.blendMode ?? null,
        simulation: emitter.simulation ?? null,
        transform: emitter.transform ?? null,
        sourceState: emitter.sourceState ?? null
      })),
      lights: parsedModel.lights,
      diagnostics: parsedModel.diagnostics
    });
  }

  const chunkReports = [];
  const parsedChunkRefs = new Set<string>();
  while (true) {
    const nextChunk = [...chunkRefs.entries()]
      .filter(([key]) => !parsedChunkRefs.has(key))
      .sort(([left], [right]) => left.localeCompare(right))[0];
    if (!nextChunk) break;
    const [chunkKey, chunkRef] = nextChunk;
    parsedChunkRefs.add(chunkKey);
    const located = await findResource(readers, chunkRef, NWN_KEY_BIF_RESOURCE_TYPES.MDL);
    if (!located) {
      chunkReports.push({ resref: chunkRef, found: false });
      continue;
    }
    const outputPath = resolve(SOURCE_ROOT, `${chunkRef}.mdl`);
    await writeFile(outputPath, located.bytes);
    const sourceHash = sha256(located.bytes);
    const parsedChunk = parseAuroraMdlVfxSource(located.bytes, {
      sourceModelObjectKey: `${normalizePath(located.keyPath)}::${chunkRef}.mdl`,
      sourceModelFileName: `${chunkRef}.mdl`,
      sourceModelHash: sourceHash
    });
    const inspectedChunk = inspectAuroraMdlSource(located.bytes);
    parsedChunk.emitters.forEach((emitter) => {
      addResourceRef(textureRefs, emitter.texture);
      addResourceRef(chunkRefs, emitter.chunkName);
    });
    inspectedChunk.textureReferences.forEach((ref) => addResourceRef(textureRefs, ref));
    chunkReports.push({
      resref: chunkRef,
      found: true,
      sourceKey: normalizePath(located.keyPath),
      path: normalizePath(outputPath),
      sizeBytes: located.bytes.length,
      sha256: sourceHash,
      emitterCount: parsedChunk.emitters.length,
      lightCount: parsedChunk.lights.length,
      staticGeometryCount: parsedChunk.staticGeometryNodes.length,
      emitterNames: parsedChunk.emitters.map((emitter) => emitter.nodeName),
      materialTextureRefs: inspectedChunk.textureReferences
    });
  }

  const textureReports = [];
  for (const textureRef of [...textureRefs.values()].sort((left, right) =>
    left.toLowerCase().localeCompare(right.toLowerCase())
  )) {
    const resources = [];
    for (const [extension, resourceType] of [
      ["tga", NWN_KEY_BIF_RESOURCE_TYPES.TGA],
      ["dds", NWN_KEY_BIF_RESOURCE_TYPES.DDS],
      ["txi", NWN_KEY_BIF_RESOURCE_TYPES.TXI]
    ] as const) {
      const located = await findResource(readers, textureRef, resourceType);
      if (!located) continue;
      const outputPath = resolve(SOURCE_ROOT, `${textureRef}.${extension}`);
      await writeFile(outputPath, located.bytes);
      resources.push({
        extension,
        sourceKey: normalizePath(located.keyPath),
        path: normalizePath(outputPath),
        sizeBytes: located.bytes.length,
        sha256: sha256(located.bytes)
      });
    }
    textureReports.push({ resref: textureRef, resources });
  }

  const report = {
    version: "aurora-vfx-retail-source-preparation/v1",
    generatedAt: new Date().toISOString(),
    fixtureId: FIXTURE_ID,
    status: "source-backed-retail-key-bif-ready",
    sourceAuthority: "installed-nwn-ee-retail-key-bif",
    nwnRoot: normalizePath(NWN_ROOT),
    searchedKeys: readers.map((entry) => normalizePath(entry.keyPath)),
    sourceTable: {
      path: normalizePath(resolve(SOURCE_ROOT, "visualeffects.2da")),
      sourceKey: normalizePath(visualEffects.keyPath),
      sizeBytes: visualEffects.bytes.length,
      sha256: visualEffectsHash,
      parserDiagnosticCount: parsedTable.diagnostics.length
    },
    selectedRow: sourceRow,
    modelRefs,
    models: modelReports,
    textures: textureReports,
    chunks: chunkReports
  };
  const reportPath = resolve(EVIDENCE_ROOT, "source-preparation.json");
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  process.stdout.write(`${JSON.stringify({ ...report, reportPath: normalizePath(reportPath) }, null, 2)}\n`);
}

function addResourceRef(target: Map<string, string>, value: string | undefined): void {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed === "****") return;
  const key = trimmed.toLowerCase();
  if (!target.has(key)) target.set(key, trimmed);
}

async function openRetailReaders(): Promise<ReaderEntry[]> {
  const readers: ReaderEntry[] = [];
  for (const keyFile of KEY_FILES) {
    const keyPath = resolve(NWN_ROOT, "data", keyFile);
    if (!(await existsAsFile(keyPath))) continue;
    readers.push({
      keyPath,
      reader: await NwnKeyBifResourceReader.open(keyPath, NWN_ROOT)
    });
  }
  if (readers.length === 0) {
    throw new Error(`No NWN KEY files found under ${NWN_ROOT}.`);
  }
  return readers;
}

async function requireResource(
  readers: ReaderEntry[],
  resref: string,
  resourceType: number
): Promise<LocatedResource> {
  const resource = await findResource(readers, resref, resourceType);
  if (!resource) {
    throw new Error(`Missing retail resource ${resref} type ${resourceType}.`);
  }
  return resource;
}

async function findResource(
  readers: ReaderEntry[],
  resref: string,
  resourceType: number
): Promise<LocatedResource | null> {
  for (const entry of readers) {
    const bytes = await entry.reader.read(resref, resourceType);
    if (bytes) {
      return { bytes, keyPath: entry.keyPath, resref, resourceType };
    }
  }
  return null;
}

async function existsAsFile(pathValue: string): Promise<boolean> {
  try {
    return (await stat(pathValue)).isFile();
  } catch {
    return false;
  }
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function normalizePath(pathValue: string): string {
  return pathValue.replace(/\\/gu, "/");
}

function parseArgs(args: string[]): Record<string, string> {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token?.startsWith("--")) continue;
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${token}.`);
    }
    parsed[token.slice(2)] = value;
    index += 1;
  }
  return parsed;
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
