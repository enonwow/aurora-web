import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/verify-area-lighting-oracle-module-fixture.mjs"
);

const RESOURCE_TYPES = {
  are: 2012,
  git: 2023,
  gic: 2046,
  ifo: 2014,
  ncs: 2010
};

const FIELD_TYPE = {
  FLOAT: 8,
  RESREF: 11
};

describe("verify-area-lighting-oracle-module-fixture", () => {
  it("proves the disposable light lab module is its own no-global-input fixture", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-fixture-proof-"));
    const modulesDir = join(tempRoot, "modules");
    const artifactDir = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers");
    await mkdir(modulesDir, { recursive: true });
    await mkdir(artifactDir, { recursive: true });

    const mainModulePath = join(modulesDir, "als_oracle.mod");
    const referenceModulePath = join(modulesDir, "als_refplc.mod");
    await writeFile(
      mainModulePath,
      buildModule({
        areaOnEnter: "als_autorun",
        moduleEntryArea: "als_light_lab",
        compiledScripts: ["als_shcamp", "als_autorun", "als_refplc"]
      })
    );
    await writeFile(
      referenceModulePath,
      buildModule({
        areaOnEnter: "als_refplc",
        moduleEntryArea: "als_light_lab",
        compiledScripts: ["als_refplc"]
      })
    );

    const summaryPath = join(artifactDir, "compiled-driver-module-injection-summary.json");
    await writeFile(
      summaryPath,
      `${JSON.stringify(
        {
          outputModulePath: mainModulePath,
          sourceModulePath: join(modulesDir, "source_lab.mod"),
          stageArea: {
            baseAreaResref: "enon_test_effect",
            requiredAreaResref: "als_light_lab",
            oracleAreaResref: "als_light_lab",
            sourceBaseAreaPreserved: false
          },
          runtimeAutostart: {
            scriptResref: "als_autorun"
          },
          safety: {
            isolatedRuntimeModule: true,
            copiesFullSourceModuleEntries: false
          },
          referenceModules: [
            {
              moduleFile: "als_refplc.mod",
              utilityScriptResref: "als_refplc",
              lane: "placeables-2da-light",
              artifact: "retail-ref-placeable-lightcolor.png",
              outputModulePath: referenceModulePath,
              safeCapture: {
                script: "backend/scripts/capture-area-lighting-retail-oracle-window.ps1",
                flags: ["-NoFocus", "-NoTopMost", "-NoEscape"],
                usesGlobalCursor: false,
                usesGlobalKeyboard: false,
                usesForegroundWindow: false,
                usesTopmost: false
              }
            }
          ],
          drivers: [
            { kind: "driver", resref: "als_shcamp" },
            { kind: "utility", resref: "als_autorun" },
            { kind: "utility", resref: "als_refplc" }
          ]
        },
        null,
        2
      )}\n`
    );

    const outputPath = join(artifactDir, "oracle-module-fixture-no-input-proof.json");
    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "--repoRoot", tempRoot, "--summary", summaryPath, "--out", outputPath],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const proof = JSON.parse(await readFile(outputPath, "utf8"));
    expect(cli).toMatchObject({
      status: "fixture-ready-runtime-capture-required",
      ownLocationResref: "als_light_lab",
      referenceModuleCount: 1,
      usesGlobalCursor: false,
      usesForegroundWindow: false,
      canonicalParityPromoted: false
    });
    expect(proof.fixture).toMatchObject({
      ownLocationResref: "als_light_lab",
      baseAreaResref: "enon_test_effect",
      sourceBaseAreaPreserved: false,
      areaOnEnter: "als_autorun",
      prepared: true,
      compiledScriptCount: 3,
      compiledScriptsPresent: 3,
      missingCompiledScripts: []
    });
    expect(proof.fixture.moduleStart).toMatchObject({
      area: "als_light_lab",
      x: 9.5,
      z: 0,
      dirX: 0,
      dirY: 1
    });
    expect(proof.fixture.moduleStart.y).toBeCloseTo(3.8);
    expect(proof.fixture.moduleIsolation).toMatchObject({
      sourceRuntimeFieldsPresent: [],
      sourceHakListStripped: true,
      sourceCustomTlkStripped: true
    });
    expect(proof.referenceModules[0]).toMatchObject({
      lane: "placeables-2da-light",
      utilityScriptResref: "als_refplc",
      valid: true,
      areaOnEnter: "als_refplc",
      missingCompiledScripts: []
    });
    expect(proof.safety).toMatchObject({
      launchesRetailProcess: false,
      capturesRuntimeArtifacts: false,
      isolatedRuntimeModule: true,
      copiesFullSourceModuleEntries: false,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesForegroundWindow: false,
      usesTopmost: false,
      canonicalParityPromoted: false
    });
    expect(proof.proofScope).toMatchObject({
      provesOwnDisposableModuleFixture: true,
      provesNoMouseOrForegroundCaptureInPreparedCapturePath: true,
      provesRetailPixels: false,
      provesRetailLightParity: false
    });
  });
});

function buildModule({
  areaOnEnter,
  moduleEntryArea,
  compiledScripts
}: {
  areaOnEnter: string;
  moduleEntryArea: string;
  compiledScripts: string[];
}): Buffer {
  const entries = [
    {
      resref: "als_light_lab",
      type: RESOURCE_TYPES.are,
      bytes: buildGff("ARE ", [
        { label: "OnEnter", typeId: FIELD_TYPE.RESREF, value: areaOnEnter },
        { label: "Tag", typeId: FIELD_TYPE.RESREF, value: "als_light_lab" },
        { label: "ResRef", typeId: FIELD_TYPE.RESREF, value: "als_light_lab" }
      ])
    },
    {
      resref: "als_light_lab",
      type: RESOURCE_TYPES.git,
      bytes: Buffer.from("git")
    },
    {
      resref: "als_light_lab",
      type: RESOURCE_TYPES.gic,
      bytes: Buffer.from("gic")
    },
    {
      resref: "module",
      type: RESOURCE_TYPES.ifo,
      bytes: buildGff("IFO ", [
        { label: "Mod_Entry_Area", typeId: FIELD_TYPE.RESREF, value: moduleEntryArea },
        { label: "Mod_Entry_X", typeId: FIELD_TYPE.FLOAT, value: 9.5 },
        { label: "Mod_Entry_Y", typeId: FIELD_TYPE.FLOAT, value: 3.8 },
        { label: "Mod_Entry_Z", typeId: FIELD_TYPE.FLOAT, value: 0 },
        { label: "Mod_Entry_Dir_X", typeId: FIELD_TYPE.FLOAT, value: 0 },
        { label: "Mod_Entry_Dir_Y", typeId: FIELD_TYPE.FLOAT, value: 1 }
      ])
    },
    ...compiledScripts.map((resref) => ({
      resref,
      type: RESOURCE_TYPES.ncs,
      bytes: Buffer.from(`compiled:${resref}`)
    }))
  ];
  return buildErf(entries);
}

type ErfEntry = {
  resref: string;
  type: number;
  bytes: Buffer;
};

function buildErf(entries: ErfEntry[]): Buffer {
  const header = Buffer.alloc(160);
  Buffer.from("MOD ", "ascii").copy(header, 0);
  Buffer.from("V1.0", "ascii").copy(header, 4);
  const localizedStrings = Buffer.alloc(0);
  const keyEntrySize = 24;
  const resourceEntrySize = 8;
  const localizedStringOffset = 160;
  const keyListOffset = localizedStringOffset + localizedStrings.length;
  const resourceListOffset = keyListOffset + entries.length * keyEntrySize;
  let currentDataOffset = resourceListOffset + entries.length * resourceEntrySize;
  const keyTable = Buffer.alloc(entries.length * keyEntrySize);
  const resourceTable = Buffer.alloc(entries.length * resourceEntrySize);
  const payloads: Buffer[] = [];

  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(entries.length, 16);
  header.writeUInt32LE(localizedStringOffset, 20);
  header.writeUInt32LE(keyListOffset, 24);
  header.writeUInt32LE(resourceListOffset, 28);

  entries.forEach((entry, index) => {
    const keyOffset = index * keyEntrySize;
    const resourceOffset = index * resourceEntrySize;
    Buffer.from(entry.resref, "ascii").copy(keyTable, keyOffset);
    keyTable.writeUInt32LE(index, keyOffset + 16);
    keyTable.writeUInt16LE(entry.type, keyOffset + 20);
    resourceTable.writeUInt32LE(currentDataOffset, resourceOffset);
    resourceTable.writeUInt32LE(entry.bytes.length, resourceOffset + 4);
    currentDataOffset += entry.bytes.length;
    payloads.push(entry.bytes);
  });

  return Buffer.concat([header, localizedStrings, keyTable, resourceTable, ...payloads]);
}

type GffField = {
  label: string;
  typeId: number;
  value: string | number;
};

function buildGff(fileType: string, fields: GffField[]): Buffer {
  const headerSize = 56;
  const structOffset = headerSize;
  const fieldOffset = structOffset + 12;
  const labelOffset = fieldOffset + fields.length * 12;
  const fieldDataChunks: Buffer[] = [];
  const fieldEntries = fields.map((field, index) => {
    let dataOrOffset: number;
    if (field.typeId === FIELD_TYPE.RESREF) {
      const valueBytes = Buffer.from(String(field.value), "ascii");
      const payload = Buffer.alloc(1 + valueBytes.length);
      payload.writeUInt8(valueBytes.length, 0);
      valueBytes.copy(payload, 1);
      dataOrOffset = fieldDataChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      fieldDataChunks.push(payload);
    } else if (field.typeId === FIELD_TYPE.FLOAT) {
      const inline = Buffer.allocUnsafe(4);
      inline.writeFloatLE(Number(field.value), 0);
      dataOrOffset = inline.readUInt32LE(0);
    } else {
      throw new Error(`Unsupported test field type ${field.typeId}`);
    }
    return {
      typeId: field.typeId,
      labelIndex: index,
      dataOrOffset
    };
  });
  const labelTable = Buffer.alloc(fields.length * 16);
  fields.forEach((field, index) => {
    Buffer.from(field.label, "ascii").copy(labelTable, index * 16);
  });
  const fieldData = Buffer.concat(fieldDataChunks);
  const fieldDataOffset = labelOffset + labelTable.length;
  const fieldIndicesOffset = fieldDataOffset + fieldData.length;
  const fieldIndices = Buffer.alloc(fields.length * 4);
  fields.forEach((_, index) => fieldIndices.writeUInt32LE(index, index * 4));
  const listIndicesOffset = fieldIndicesOffset + fieldIndices.length;
  const header = Buffer.alloc(headerSize);
  Buffer.from(fileType, "ascii").copy(header, 0);
  Buffer.from("V3.2", "ascii").copy(header, 4);
  header.writeUInt32LE(structOffset, 8);
  header.writeUInt32LE(1, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fields.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(fields.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  const struct = Buffer.alloc(12);
  struct.writeUInt32LE(0, 0);
  struct.writeUInt32LE(0, 4);
  struct.writeUInt32LE(fields.length, 8);
  const fieldTable = Buffer.alloc(fields.length * 12);
  fieldEntries.forEach((field, index) => {
    const offset = index * 12;
    fieldTable.writeUInt32LE(field.typeId, offset);
    fieldTable.writeUInt32LE(field.labelIndex, offset + 4);
    fieldTable.writeUInt32LE(field.dataOrOffset, offset + 8);
  });
  return Buffer.concat([header, struct, fieldTable, labelTable, fieldData, fieldIndices]);
}
