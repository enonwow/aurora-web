import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  NwnKeyBifResourceReader,
  NWN_KEY_BIF_RESOURCE_TYPES
} from "../src/modules/runtime-settings/application/nwn-key-bif-resource-reader";
import { parseAuroraMdlVfxSource } from "../src/modules/vfx/domain/aurora-mdl-vfx-source.parser";

interface FixtureSourceSpec {
  slug: string;
  sourceTable: "visualeffects" | "vfx_persistent";
  sourceRow: number;
  sourceLabel: string;
  modelResref: string;
  progfxRow?: number;
}

const fixtures: FixtureSourceSpec[] = [
  { slug: "row44", sourceTable: "visualeffects", sourceRow: 44, sourceLabel: "VFX_IMP_ACID_S", modelResref: "vim_explacid" },
  { slug: "row50", sourceTable: "visualeffects", sourceRow: 50, sourceLabel: "VFX_IMP_DEATH", modelResref: "vim_negdeath" },
  { slug: "row210", sourceTable: "visualeffects", sourceRow: 210, sourceLabel: "VFX_BEAM_FIRE", modelResref: "vim_rayfire", progfxRow: 601 },
  { slug: "row216", sourceTable: "visualeffects", sourceRow: 216, sourceLabel: "VFX_BEAM_FIRE_LASH", modelResref: "vim_lashfire", progfxRow: 607 },
  { slug: "row181", sourceTable: "visualeffects", sourceRow: 181, sourceLabel: "VFX_IMP_MIRV", modelResref: "vpr_magmisl", progfxRow: 900 },
  { slug: "row1", sourceTable: "visualeffects", sourceRow: 1, sourceLabel: "VFX_DUR_DARKNESS", modelResref: "vdr_darkness" },
  { slug: "aoe0", sourceTable: "vfx_persistent", sourceRow: 0, sourceLabel: "VFX_PER_FOGACID", modelResref: "vps_fogacid" }
];

const repoRoot = resolve(__dirname, "../..");
const retailRoot = resolve("C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/data");
const keyPath = resolve(retailRoot, "nwn_base.key");
const evidenceRoot = resolve(
  repoRoot,
  "backend/docs/aurora-reverse/evidence/vfx-nwn-broad-proof-2026-07-16"
);

async function main(): Promise<void> {
  const reader = await NwnKeyBifResourceReader.open(keyPath, retailRoot);
  const [visualeffects, progfx, persistent] = await Promise.all([
    requiredResource(reader, "visualeffects", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA),
    requiredResource(reader, "progfx", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA),
    requiredResource(reader, "vfx_persistent", NWN_KEY_BIF_RESOURCE_TYPES.TWO_DA)
  ]);
  const keyBytes = await import("node:fs/promises").then(({ readFile }) => readFile(keyPath));
  const manifests = [];

  for (const fixture of fixtures) {
    const fixtureRoot = resolve(evidenceRoot, fixture.slug);
    const sourceRoot = resolve(fixtureRoot, "sources");
    await mkdir(sourceRoot, { recursive: true });
    const tableBytes = fixture.sourceTable === "visualeffects" ? visualeffects : persistent;
    const tableName = `${fixture.sourceTable}.2da`;
    const modelBytes = await requiredResource(reader, fixture.modelResref, NWN_KEY_BIF_RESOURCE_TYPES.MDL);
    const parsed = parseAuroraMdlVfxSource(modelBytes, {
      sourceModelFileName: `${fixture.modelResref}.mdl`,
      sourceModelObjectKey: `nwn_base.key/${fixture.modelResref}.mdl`
    });
    const primaryRows = findRows(tableBytes, [fixture.sourceRow]);
    const progfxRows = fixture.progfxRow === undefined ? [] : findRows(progfx, [fixture.progfxRow]);
    if (primaryRows.length !== 1 || !primaryRows[0]?.includes(fixture.sourceLabel)) {
      throw new Error(`Retail row mismatch for ${fixture.slug}: ${JSON.stringify(primaryRows)}`);
    }

    const resources: Array<{ resref: string; type: string; path: string; sha256: string; sizeBytes: number }> = [];
    await writeResource(resolve(sourceRoot, tableName), tableBytes, tableName, "2da", resources);
    if (fixture.progfxRow !== undefined) {
      await writeResource(resolve(sourceRoot, "progfx.2da"), progfx, "progfx", "2da", resources);
    }
    await writeResource(
      resolve(sourceRoot, `${fixture.modelResref}.mdl`),
      modelBytes,
      fixture.modelResref,
      "mdl",
      resources
    );

    const textureRefs = [...new Set(parsed.emitters.map((emitter) => emitter.texture?.trim().toLowerCase()).filter(isTextureRef))];
    const missingTextureResources: string[] = [];
    for (const textureRef of textureRefs) {
      let found = false;
      for (const [extension, resourceType] of [
        ["tga", NWN_KEY_BIF_RESOURCE_TYPES.TGA],
        ["dds", NWN_KEY_BIF_RESOURCE_TYPES.DDS],
        ["txi", NWN_KEY_BIF_RESOURCE_TYPES.TXI]
      ] as const) {
        const bytes = await reader.read(textureRef, resourceType);
        if (!bytes) continue;
        found = true;
        await writeResource(resolve(sourceRoot, `${textureRef}.${extension}`), bytes, textureRef, extension, resources);
      }
      if (!found) missingTextureResources.push(textureRef);
    }

    const manifest = {
      version: "aurora-vfx-nwn-broad-source-manifest/v1",
      fixtureId: fixture.slug,
      sourceProfile: "nwn-ee-retail-key-bif",
      retail: {
        keyPath,
        keySha256: sha256(keyBytes),
        dataRoot: retailRoot
      },
      source: {
        table: tableName,
        rowId: fixture.sourceRow,
        label: fixture.sourceLabel,
        rawRow: primaryRows[0],
        ...(fixture.progfxRow === undefined
          ? {}
          : { progfxRowId: fixture.progfxRow, progfxRawRow: progfxRows[0] })
      },
      model: {
        resref: fixture.modelResref,
        sourceFormat: parsed.sourceFormat,
        emitterCount: parsed.emitters.length,
        lightCount: parsed.lights.length,
        staticGeometryCount: parsed.staticGeometryNodes.length,
        emitters: parsed.emitters.map((emitter) => ({
          nodeName: emitter.nodeName,
          emitterType: emitter.emitterType,
          renderMode: emitter.renderMode,
          blendMode: emitter.blendMode,
          texture: emitter.texture,
          chunkName: emitter.chunkName,
          p2p: emitter.simulation?.p2p
        })),
        lights: parsed.lights.map((light) => light.nodeName)
      },
      resources,
      missingTextureResources
    };
    await writeFile(resolve(fixtureRoot, "source-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
    manifests.push(manifest);
  }

  await mkdir(evidenceRoot, { recursive: true });
  await writeFile(
    resolve(evidenceRoot, "source-index.json"),
    `${JSON.stringify({ version: "aurora-vfx-nwn-broad-source-index/v1", fixtures: manifests }, null, 2)}\n`
  );
  process.stdout.write(`${JSON.stringify({ evidenceRoot, fixtureCount: manifests.length }, null, 2)}\n`);
}

async function requiredResource(
  reader: NwnKeyBifResourceReader,
  resref: string,
  resourceType: number
): Promise<Buffer> {
  const bytes = await reader.read(resref, resourceType);
  if (!bytes) throw new Error(`Missing retail resource ${resref} type ${resourceType}`);
  return bytes;
}

function findRows(bytes: Buffer, rowIds: number[]): string[] {
  const wanted = new Set(rowIds);
  return bytes
    .toString("latin1")
    .split(/\r?\n/u)
    .filter((line) => {
      const match = /^\s*(\d+)\s+/u.exec(line);
      return match ? wanted.has(Number.parseInt(match[1] ?? "", 10)) : false;
    });
}

function isTextureRef(value: string | undefined): value is string {
  return Boolean(value && value !== "null" && value !== "****");
}

async function writeResource(
  path: string,
  bytes: Buffer,
  resref: string,
  type: string,
  resources: Array<{ resref: string; type: string; path: string; sha256: string; sizeBytes: number }>
): Promise<void> {
  await writeFile(path, bytes);
  resources.push({ resref, type, path, sha256: sha256(bytes), sizeBytes: bytes.length });
}

function sha256(bytes: Buffer): string {
  return createHash("sha256").update(bytes).digest("hex");
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
