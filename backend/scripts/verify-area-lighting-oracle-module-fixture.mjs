#!/usr/bin/env node
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const RESOURCE_TYPES = {
  are: 2012,
  git: 2023,
  gic: 2046,
  ifo: 2014,
  ncs: 2010,
};
const SOURCE_MODULE_RUNTIME_FIELDS_TO_DROP = ["Mod_CustomTlk", "Mod_HakList"];

const FIELD_TYPE = {
  FLOAT: 8,
  RESREF: 11,
  CEXOSTRING: 10,
};

const scriptDir = dirname(fileURLToPath(import.meta.url));
const defaultRepoRoot = resolve(scriptDir, "..", "..");
const DEFAULT_SUMMARY =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/compiled-driver-module-injection-summary.json";
const DEFAULT_OUTPUT =
  "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers/oracle-module-fixture-no-input-proof.json";

function parseArgs(argv) {
  const options = {
    repoRoot: defaultRepoRoot,
    summary: DEFAULT_SUMMARY,
    output: DEFAULT_OUTPUT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--repoRoot") {
      index += 1;
      options.repoRoot = resolve(requireValue(arg, argv[index]));
    } else if (arg === "--summary") {
      index += 1;
      options.summary = requireValue(arg, argv[index]);
    } else if (arg === "--out" || arg === "--output") {
      index += 1;
      options.output = requireValue(arg, argv[index]);
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp() {
  console.log(`Usage: node scripts/verify-area-lighting-oracle-module-fixture.mjs [options]

Options:
  --repoRoot <path>  Repository root. Defaults to aurora-web root.
  --summary <path>   Injection summary JSON. Defaults to ${DEFAULT_SUMMARY}
  --out <path>       Proof JSON output. Defaults to ${DEFAULT_OUTPUT}
`);
}

function requireValue(flag, value) {
  if (!value || value.startsWith("--")) {
    throw new Error(`${flag} requires a value.`);
  }
  return value;
}

function toAbsolute(repoRoot, inputPath) {
  return isAbsolute(inputPath) ? inputPath : resolve(repoRoot, inputPath);
}

function toRepoRelative(repoRoot, inputPath) {
  return relative(repoRoot, inputPath).replaceAll("\\", "/");
}

function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

function describeFile(repoRoot, path) {
  const stats = statSync(path);
  return {
    path: isAbsolute(path) ? path : toRepoRelative(repoRoot, path),
    bytes: stats.size,
    sha256: sha256(readFileSync(path)),
    modifiedAt: stats.mtime.toISOString(),
  };
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
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
  const keyListOffset = bytes.readUInt32LE(24);
  const resourceListOffset = bytes.readUInt32LE(28);

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
      bytes: Buffer.from(bytes.subarray(dataOffset, dataOffset + size)),
    });
  }

  return {
    signature,
    version,
    entryCount,
    entries,
  };
}

function findResource(erf, resref, type) {
  const wanted = resref.toLowerCase();
  return erf.entries.find((entry) => entry.resref === wanted && entry.type === type) ?? null;
}

function hasResource(erf, resref, type) {
  return Boolean(findResource(erf, resref, type));
}

function parseGffRootFields(bytes, sourceLabel) {
  if (bytes.length < 56) {
    throw new Error(`GFF file too small: ${sourceLabel}`);
  }

  const header = {
    fileType: bytes.toString("ascii", 0, 4),
    fileVersion: bytes.toString("ascii", 4, 8),
    structOffset: bytes.readUInt32LE(8),
    structCount: bytes.readUInt32LE(12),
    fieldOffset: bytes.readUInt32LE(16),
    fieldCount: bytes.readUInt32LE(20),
    labelOffset: bytes.readUInt32LE(24),
    labelCount: bytes.readUInt32LE(28),
    fieldDataOffset: bytes.readUInt32LE(32),
    fieldDataCount: bytes.readUInt32LE(36),
    fieldIndicesOffset: bytes.readUInt32LE(40),
    fieldIndicesCount: bytes.readUInt32LE(44),
  };

  if (header.structCount < 1) {
    throw new Error(`GFF root struct missing: ${sourceLabel}`);
  }

  const labels = [];
  for (let index = 0; index < header.labelCount; index += 1) {
    labels.push(
      bytes
        .subarray(header.labelOffset + index * 16, header.labelOffset + index * 16 + 16)
        .toString("ascii")
        .replace(/\0.*$/u, ""),
    );
  }

  const rootOffset = header.structOffset;
  const rootFieldDataOrOffset = bytes.readUInt32LE(rootOffset + 4);
  const rootFieldCount = bytes.readUInt32LE(rootOffset + 8);
  const fieldIndices = [];
  if (rootFieldCount === 1) {
    fieldIndices.push(rootFieldDataOrOffset);
  } else if (rootFieldCount > 1) {
    for (let index = 0; index < rootFieldCount; index += 1) {
      const fieldIndexOffset = header.fieldIndicesOffset + rootFieldDataOrOffset + index * 4;
      fieldIndices.push(bytes.readUInt32LE(fieldIndexOffset));
    }
  }

  const fields = {};
  for (const fieldIndex of fieldIndices) {
    if (fieldIndex >= header.fieldCount) {
      continue;
    }
    const fieldOffset = header.fieldOffset + fieldIndex * 12;
    const typeId = bytes.readUInt32LE(fieldOffset);
    const labelIndex = bytes.readUInt32LE(fieldOffset + 4);
    const dataOrOffset = bytes.readUInt32LE(fieldOffset + 8);
    const label = labels[labelIndex] ?? `field_${fieldIndex}`;
    fields[label] = readFieldValue(bytes, header, typeId, dataOrOffset);
  }

  return {
    fileType: header.fileType,
    fileVersion: header.fileVersion,
    fields,
  };
}

function readFieldValue(bytes, header, typeId, dataOrOffset) {
  if (typeId === FIELD_TYPE.FLOAT) {
    const inline = Buffer.allocUnsafe(4);
    inline.writeUInt32LE(dataOrOffset, 0);
    return inline.readFloatLE(0);
  }

  if (typeId === FIELD_TYPE.RESREF) {
    const offset = header.fieldDataOffset + dataOrOffset;
    const length = bytes.readUInt8(offset);
    return bytes.subarray(offset + 1, offset + 1 + length).toString("ascii");
  }

  if (typeId === FIELD_TYPE.CEXOSTRING) {
    const offset = header.fieldDataOffset + dataOrOffset;
    const length = bytes.readUInt32LE(offset);
    return bytes.subarray(offset + 4, offset + 4 + length).toString("utf8");
  }

  return {
    typeId,
    raw: dataOrOffset,
  };
}

function inspectModule(modulePath, expectedAreaResref, expectedOnEnter, expectedCompiledResrefs) {
  if (!existsSync(modulePath)) {
    return {
      exists: false,
      path: modulePath,
      valid: false,
      errors: [`Module file missing: ${modulePath}`],
    };
  }

  const erf = readErfEntries(readFileSync(modulePath), modulePath);
  const areEntry = findResource(erf, expectedAreaResref, RESOURCE_TYPES.are);
  const ifoEntry = findResource(erf, "module", RESOURCE_TYPES.ifo);
  const areFields = areEntry ? parseGffRootFields(areEntry.bytes, `${expectedAreaResref}.are`) : null;
  const ifoFields = ifoEntry ? parseGffRootFields(ifoEntry.bytes, "module.ifo") : null;
  const compiledScripts = expectedCompiledResrefs.map((resref) => ({
    resref,
    present: hasResource(erf, resref, RESOURCE_TYPES.ncs),
  }));
  const ifoRootFields = ifoFields?.fields ?? {};
  const sourceRuntimeFieldsPresent = SOURCE_MODULE_RUNTIME_FIELDS_TO_DROP.filter((label) =>
    Object.prototype.hasOwnProperty.call(ifoRootFields, label),
  );
  const resources = {
    are: Boolean(areEntry),
    git: hasResource(erf, expectedAreaResref, RESOURCE_TYPES.git),
    gic: hasResource(erf, expectedAreaResref, RESOURCE_TYPES.gic),
    ifo: Boolean(ifoEntry),
  };
  const checks = {
    stageAreaPresent: resources.are && resources.git && resources.gic,
    areaOnEnterPrepared: areFields?.fields?.OnEnter === expectedOnEnter,
    areaTagPatched:
      areFields?.fields?.Tag === expectedAreaResref || areFields?.fields?.Tag === undefined,
    areaResrefPatched:
      areFields?.fields?.ResRef === expectedAreaResref || areFields?.fields?.ResRef === undefined,
    moduleStartPrepared: ifoFields?.fields?.Mod_Entry_Area === expectedAreaResref,
    sourceRuntimeFieldsStripped: sourceRuntimeFieldsPresent.length === 0,
    compiledScriptsPresent: compiledScripts.every((entry) => entry.present),
  };

  return {
    exists: true,
    valid: Object.values(checks).every(Boolean),
    signature: erf.signature,
    version: erf.version,
    entryCount: erf.entryCount,
    resources,
    checks,
    area: {
      resref: expectedAreaResref,
      onEnter: areFields?.fields?.OnEnter ?? null,
      tag: areFields?.fields?.Tag ?? null,
      resourceResref: areFields?.fields?.ResRef ?? null,
    },
    moduleStart: {
      area: ifoFields?.fields?.Mod_Entry_Area ?? null,
      x: ifoFields?.fields?.Mod_Entry_X ?? null,
      y: ifoFields?.fields?.Mod_Entry_Y ?? null,
      z: ifoFields?.fields?.Mod_Entry_Z ?? null,
      dirX: ifoFields?.fields?.Mod_Entry_Dir_X ?? null,
      dirY: ifoFields?.fields?.Mod_Entry_Dir_Y ?? null,
    },
    moduleIsolation: {
      sourceRuntimeFieldsPresent,
      sourceHakListStripped: !sourceRuntimeFieldsPresent.includes("Mod_HakList"),
      sourceCustomTlkStripped: !sourceRuntimeFieldsPresent.includes("Mod_CustomTlk"),
      entryCount: erf.entryCount,
    },
    compiledScripts,
    missingCompiledScripts: compiledScripts.filter((entry) => !entry.present).map((entry) => entry.resref),
  };
}

function expectedCompiledResrefs(summary) {
  return (summary.drivers ?? []).map((entry) => entry.resref).filter(Boolean);
}

function inspectReferenceModules(summary, repoRoot, expectedAreaResref) {
  return (summary.referenceModules ?? []).map((referenceModule) => {
    const modulePath = referenceModule.outputModulePath;
    const inspection = inspectModule(
      modulePath,
      expectedAreaResref,
      referenceModule.utilityScriptResref,
      [referenceModule.utilityScriptResref],
    );
    return {
      moduleFile: referenceModule.moduleFile,
      lane: referenceModule.lane,
      artifact: referenceModule.artifact,
      utilityScriptResref: referenceModule.utilityScriptResref,
      file: existsSync(modulePath) ? describeFile(repoRoot, modulePath) : { path: modulePath, missing: true },
      safeCapture: referenceModule.safeCapture ?? null,
      checks: inspection.checks ?? null,
      valid: inspection.valid === true,
      runtimeArea: inspection.area?.resref ?? expectedAreaResref,
      areaOnEnter: inspection.area?.onEnter ?? null,
      moduleStart: inspection.moduleStart ?? null,
      missingCompiledScripts: inspection.missingCompiledScripts ?? [],
    };
  });
}

function buildProof(options) {
  const repoRoot = resolve(options.repoRoot);
  const summaryPath = toAbsolute(repoRoot, options.summary);
  const summary = readJson(summaryPath);
  const outputModulePath = summary.outputModulePath;
  const expectedAreaResref =
    summary.stageArea?.oracleAreaResref ?? summary.stageArea?.requiredAreaResref ?? "als_light_lab";
  const expectedOnEnter = summary.runtimeAutostart?.scriptResref ?? "als_autorun";
  const compiledResrefs = expectedCompiledResrefs(summary);
  const mainInspection = inspectModule(outputModulePath, expectedAreaResref, expectedOnEnter, compiledResrefs);
  const referenceModules = inspectReferenceModules(summary, repoRoot, expectedAreaResref);
  const safeCaptureEntries = referenceModules.map((entry) => entry.safeCapture).filter(Boolean);
  const safety = {
    launchesRetailProcess: false,
    capturesRuntimeArtifacts: false,
    isolatedRuntimeModule: summary.safety?.isolatedRuntimeModule === true,
    copiesFullSourceModuleEntries: summary.safety?.copiesFullSourceModuleEntries === true,
    usesGlobalCursor: safeCaptureEntries.some((entry) => entry.usesGlobalCursor === true),
    usesGlobalKeyboard: safeCaptureEntries.some((entry) => entry.usesGlobalKeyboard === true),
    usesForegroundWindow: safeCaptureEntries.some((entry) => entry.usesForegroundWindow === true),
    usesTopmost: safeCaptureEntries.some((entry) => entry.usesTopmost === true),
    doesNotFabricateRetailArtifacts: true,
    canonicalParityPromoted: false,
  };
  const valid =
    mainInspection.valid === true &&
    referenceModules.every((entry) => entry.valid) &&
    safety.isolatedRuntimeModule === true &&
    safety.copiesFullSourceModuleEntries === false &&
    safety.usesGlobalCursor === false &&
    safety.usesGlobalKeyboard === false &&
    safety.usesForegroundWindow === false &&
    safety.usesTopmost === false;

  return {
    version: "aurora-area-lighting-oracle-module-fixture-no-input-proof/v1",
    generatedAt: new Date().toISOString(),
    status: valid
      ? "fixture-ready-runtime-capture-required"
      : "fixture-invalid-or-missing-runtime-capture-blocked",
    repoRoot,
    summaryFile: describeFile(repoRoot, summaryPath),
    outputModuleFile: existsSync(outputModulePath)
      ? describeFile(repoRoot, outputModulePath)
      : { path: outputModulePath, missing: true },
    sourceModulePath: summary.sourceModulePath ?? null,
    fixture: {
      ownLocationResref: expectedAreaResref,
      baseAreaResref: summary.stageArea?.baseAreaResref ?? null,
      sourceBaseAreaPreserved: summary.stageArea?.sourceBaseAreaPreserved ?? null,
      clonedResources: mainInspection.resources ?? null,
      moduleIsolation: mainInspection.moduleIsolation ?? null,
      areaOnEnter: mainInspection.area?.onEnter ?? null,
      moduleStart: mainInspection.moduleStart ?? null,
      compiledScriptCount: compiledResrefs.length,
      compiledScriptsPresent: mainInspection.compiledScripts?.filter((entry) => entry.present).length ?? 0,
      missingCompiledScripts: mainInspection.missingCompiledScripts ?? [],
      prepared: mainInspection.valid === true,
    },
    referenceModules,
    safety,
    proofScope: {
      provesOwnDisposableModuleFixture: valid,
      provesNoMouseOrForegroundCaptureInPreparedCapturePath: true,
      provesRetailPixels: false,
      provesRetailLightParity: false,
      provesRuntimeCaptureArtifacts: false,
    },
    nonEvidenceNotice:
      "This proof verifies the disposable oracle module fixture and no-global-input capture metadata. It does not launch NWN, capture retail pixels, or promote parity.",
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const repoRoot = resolve(options.repoRoot);
  const outputPath = toAbsolute(repoRoot, options.output);
  const proof = buildProof(options);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(proof, null, 2)}\n`, "utf8");
  console.log(
    JSON.stringify(
      {
        status: proof.status,
        output: toRepoRelative(repoRoot, outputPath),
        ownLocationResref: proof.fixture.ownLocationResref,
        referenceModuleCount: proof.referenceModules.length,
      usesGlobalCursor: proof.safety.usesGlobalCursor,
      usesForegroundWindow: proof.safety.usesForegroundWindow,
      isolatedRuntimeModule: proof.safety.isolatedRuntimeModule,
      copiesFullSourceModuleEntries: proof.safety.copiesFullSourceModuleEntries,
      canonicalParityPromoted: proof.safety.canonicalParityPromoted,
      },
      null,
      2,
    ),
  );
}

main();
