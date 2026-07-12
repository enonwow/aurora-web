import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/inject-area-lighting-retail-oracle-compiled-drivers.mjs"
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

describe("inject-area-lighting-retail-oracle-compiled-drivers", () => {
  it("injects compiled drivers and prepares the disposable module autorun hook", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-module-inject-"));
    const modulesDir = join(tempRoot, "modules");
    const compiledDir = join(tempRoot, "compiled");
    const summaryPath = join(tempRoot, "summary.json");
    const compileManifestPath = join(tempRoot, "compile-manifest.json");
    const sourceModulePath = join(modulesDir, "source_lab.mod");
    await mkdir(modulesDir, { recursive: true });
    await mkdir(compiledDir, { recursive: true });

    await writeFile(join(compiledDir, "als_shcamp.ncs"), "driver");
    const utilityScripts = [
      "als_autorun",
      "als_refbase",
      "als_reftmain",
      "als_xnoitem",
      "als_xnopfx",
      "als_xnoplc",
      "als_xnomdl",
      "als_xnotmain",
      "als_xnotsrc",
      "als_reftsrc",
      "als_refplc",
      "als_refmdl",
      "als_refitem",
      "als_refpfx",
      "als_pfxzero"
    ];
    for (const utilityScript of utilityScripts) {
      await writeFile(join(compiledDir, `${utilityScript}.ncs`), "utility");
    }
    await writeFile(
      compileManifestPath,
      `${JSON.stringify(
        {
          status: "compiled-pack-ready-module-injection-required",
          summary: {
            driverCount: 1,
            compiledOutputCount: 1,
            utilityScriptCount: utilityScripts.length,
            compiledUtilityCount: utilityScripts.length
          },
          drivers: [
            {
              caseId: "shadowvol-campfire-pixel-geometry-opacity",
              title: "Campfire oracle",
              sourcePath: "generated/als_shcamp.nss",
              compiledPath: join(compiledDir, "als_shcamp.ncs"),
              compiledReady: true
            }
          ],
          utilityScripts: utilityScripts.map((utilityScript) => ({
            title: utilityScript,
            sourcePath: `generated/${utilityScript}.nss`,
            compiledPath: join(compiledDir, `${utilityScript}.ncs`),
            compiledReady: true
          }))
        },
        null,
        2
      )}\n`
    );

    await writeFile(
      sourceModulePath,
      buildErf([
        {
          resref: "enon_test_effect",
          type: RESOURCE_TYPES.are,
          bytes: buildGff("ARE ", [{ label: "OnEnter", typeId: FIELD_TYPE.RESREF, value: "old_area" }])
        },
        {
          resref: "enon_test_effect",
          type: RESOURCE_TYPES.git,
          bytes: buildGff("GIT ", [])
        },
        {
          resref: "enon_test_effect",
          type: RESOURCE_TYPES.gic,
          bytes: buildGff("GIC ", [])
        },
        {
          resref: "module",
          type: RESOURCE_TYPES.ifo,
          bytes: buildGff("IFO ", [
            { label: "Mod_Entry_Area", typeId: FIELD_TYPE.RESREF, value: "old_area" },
            { label: "Mod_Entry_X", typeId: FIELD_TYPE.FLOAT, value: 1 },
            { label: "Mod_Entry_Y", typeId: FIELD_TYPE.FLOAT, value: 2 },
            { label: "Mod_Entry_Z", typeId: FIELD_TYPE.FLOAT, value: 3 },
            { label: "Mod_Entry_Dir_X", typeId: FIELD_TYPE.FLOAT, value: 1 },
            { label: "Mod_Entry_Dir_Y", typeId: FIELD_TYPE.FLOAT, value: 0 }
          ])
        }
      ])
    );

    const { stdout } = await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--nwnModulesDir",
        modulesDir,
        "--sourceModuleFile",
        "source_lab.mod",
        "--outputModuleFile",
        "oracle_lab.mod",
        "--compileManifest",
        compileManifestPath,
        "--summary",
        summaryPath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    expect(cli.status).toBe("runtime-scene-module-ready-runtime-capture-required");
    expect(cli.summary).toMatchObject({
      compiledDriverCount: 1,
      utilityScriptCount: utilityScripts.length,
      missingCompiledDriverCount: 0,
      missingUtilityScriptCount: 0,
      areaOnEnterPrepared: true,
      moduleStartPrepared: true,
      referenceModuleCount: 14,
      referenceModuleReadyCount: 14
    });
    expect(cli.referenceModules).toHaveLength(14);
    expect(cli.referenceModules).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          moduleFile: "als_refbase.mod",
          utilityScriptResref: "als_refbase",
          artifact: "retail-cross-lane-openpad-smoke.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        }),
        expect.objectContaining({
          moduleFile: "als_rtmain.mod",
          utilityScriptResref: "als_reftmain",
          artifact: "retail-ref-tile-main-light.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        }),
        expect.objectContaining({
          moduleFile: "als_xnoitem.mod",
          utilityScriptResref: "als_xnoitem",
          artifact: "retail-cross-lane-no-item-after-budget.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        }),
        expect.objectContaining({
          moduleFile: "als_xnopfx.mod",
          utilityScriptResref: "als_xnopfx",
          artifact: "retail-cross-lane-no-progfx-after-budget.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        }),
        expect.objectContaining({
          moduleFile: "als_xnoplc.mod",
          utilityScriptResref: "als_xnoplc",
          artifact: "retail-cross-lane-no-placeable-after-budget.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        }),
        expect.objectContaining({
          moduleFile: "als_xnomdl.mod",
          utilityScriptResref: "als_xnomdl",
          artifact: "retail-cross-lane-no-mdl-after-budget.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        }),
        expect.objectContaining({
          moduleFile: "als_xnotmain.mod",
          utilityScriptResref: "als_xnotmain",
          artifact: "retail-cross-lane-no-tile-main-after-budget.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        }),
        expect.objectContaining({
          moduleFile: "als_xnotsrc.mod",
          utilityScriptResref: "als_xnotsrc",
          artifact: "retail-cross-lane-no-tile-source-after-budget.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        }),
        expect.objectContaining({
          moduleFile: "als_refpfx.mod",
          utilityScriptResref: "als_refpfx",
          artifact: "retail-ref-progfx-type4-light.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        }),
        expect.objectContaining({
          moduleFile: "als_pfxzero.mod",
          utilityScriptResref: "als_pfxzero",
          artifact: "retail-progfx-priority-policy-custom-zero-after.png",
          areaOnEnterPrepared: true,
          moduleStartPrepared: true
        })
      ])
    );
    expect(summary.stageArea).toMatchObject({
      baseAreaResref: "enon_test_effect",
      requiredAreaResref: "als_light_lab",
      oracleAreaResref: "als_light_lab",
      present: true,
      clonedFromBaseArea: "enon_test_effect",
      clonedResources: {
        are: true,
        git: true,
        gic: true
      },
      sourceBaseAreaPreserved: false
    });
    expect(summary.moduleIsolation).toMatchObject({
      copiedSourceEntries: false,
      retainedEntryKinds: ["module.ifo", "repute.fac", "als_light_lab.are/git/gic", "compiled .ncs drivers"]
    });
    expect(summary.runtimeAutostart.final).toMatchObject({
      areaOnEnter: "als_autorun",
      onEnterScriptPresent: true,
      moduleEntryArea: "als_light_lab",
      moduleStartPrepared: true,
      areaOnEnterPrepared: true
    });
    expect(summary.referenceModules).toHaveLength(14);
    expect(summary.referenceModules.every((entry: any) => entry.areaOnEnter === entry.utilityScriptResref)).toBe(
      true
    );
    expect(summary.referenceModules.every((entry: any) => entry.safeCapture.usesGlobalCursor === false)).toBe(
      true
    );
    expect(summary.runtimeAutostart.moduleStartLocation.next.area).toBe("als_light_lab");
    expect(summary.summary).toMatchObject({
      clonedStageAreaResourceCount: 3,
      finalEntryCount: 20,
      sourceEntriesNotCopied: 4,
      referenceModuleCount: 14,
      referenceModuleReadyCount: 14
    });
    expect(summary.safety).toMatchObject({
      isolatedRuntimeModule: true,
      copiesFullSourceModuleEntries: false,
      referenceModuleCount: 14,
      referenceModulesUsePerLaneOnEnter: true,
      launchesRetailProcess: false,
      capturesRuntimeArtifacts: false,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesForegroundWindow: false,
      usesTopmost: false,
      doesNotFabricateRetailArtifacts: true,
      canonicalParityPromoted: false
    });
  });
});

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
  header.writeUInt32LE(0, 52);

  const structTable = Buffer.alloc(12);
  structTable.writeUInt32LE(0, 0);
  structTable.writeUInt32LE(0, 4);
  structTable.writeUInt32LE(fields.length, 8);

  const fieldTable = Buffer.alloc(fields.length * 12);
  fieldEntries.forEach((entry, index) => {
    const offset = index * 12;
    fieldTable.writeUInt32LE(entry.typeId, offset);
    fieldTable.writeUInt32LE(entry.labelIndex, offset + 4);
    fieldTable.writeUInt32LE(entry.dataOrOffset, offset + 8);
  });

  return Buffer.concat([header, structTable, fieldTable, labelTable, fieldData, fieldIndices]);
}

type ErfEntry = {
  resref: string;
  type: number;
  bytes: Buffer;
};

function buildErf(entries: ErfEntry[]): Buffer {
  const headerSize = 160;
  const keyEntrySize = 24;
  const resourceEntrySize = 8;
  const localizedStringOffset = headerSize;
  const keyListOffset = localizedStringOffset;
  const resourceListOffset = keyListOffset + entries.length * keyEntrySize;
  const resourceDataOffsetStart = resourceListOffset + entries.length * resourceEntrySize;
  const header = Buffer.alloc(headerSize);
  Buffer.from("MOD ", "ascii").copy(header, 0);
  Buffer.from("V1.0", "ascii").copy(header, 4);
  header.writeUInt32LE(0, 12);
  header.writeUInt32LE(entries.length, 16);
  header.writeUInt32LE(localizedStringOffset, 20);
  header.writeUInt32LE(keyListOffset, 24);
  header.writeUInt32LE(resourceListOffset, 28);

  const keyTable = Buffer.alloc(entries.length * keyEntrySize);
  const resourceTable = Buffer.alloc(entries.length * resourceEntrySize);
  const payloads: Buffer[] = [];
  let currentOffset = resourceDataOffsetStart;
  entries.forEach((entry, index) => {
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

  return Buffer.concat([header, keyTable, resourceTable, ...payloads]);
}
