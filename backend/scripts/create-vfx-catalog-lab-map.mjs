import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const RESOURCE_TYPES = {
  txt: 10,
  nss: 2009,
  are: 2012,
  ifo: 2014,
  twoDa: 2017,
  git: 2023,
  gic: 2046
};

const SCRIPT_BLOCK_SIZE = 100;
const MODULE_SOURCE_NAME = "the_last_city — codex.mod";
const MODULE_LAB_NAME = "the_last_city — codex vfx_catalog_lab.mod";
const STAGE_AREA_RESREF = "enon_test_effect";
const STAGE_TARGET_TAG = "effect_test";
const STAGE_FALLBACK_TAG = "CombatDummy";
const STAGE_LEVER_TAG = "effects";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const backendRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "vfx-catalog-lab-map"
);

function getNwnUserRoot() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("USERPROFILE/HOME is required to locate Neverwinter Nights documents.");
  }
  return join(home, "Documents", "Neverwinter Nights");
}

function normalizeCell(value) {
  if (value === undefined || value === null) {
    return "";
  }
  const text = String(value).trim();
  return text === "****" ? "" : text;
}

function isMeaningfulCell(value) {
  return normalizeCell(value).length > 0;
}

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function csvEscape(value) {
  const text = value === undefined || value === null ? "" : String(value);
  if (!/[",\r\n]/u.test(text)) {
    return text;
  }
  return `"${text.replace(/"/g, '""')}"`;
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
      ? Buffer.from(
          bytes.subarray(
            localizedStringOffset,
            localizedStringOffset + localizedStringSize
          )
        )
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
    signature,
    version,
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

function findErfResource(erf, resref, type) {
  const target = resref.toLowerCase();
  return erf.entries.find((entry) => entry.resref === target && entry.type === type)?.bytes ?? null;
}

function parse2da(buffer) {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/u, "");
  const lines = text.split(/\r?\n/u);
  let index = 0;
  while (index < lines.length && lines[index].trim().length === 0) {
    index += 1;
  }
  if (!lines[index]?.startsWith("2DA")) {
    throw new Error("2DA header missing");
  }
  index += 1;
  while (index < lines.length && lines[index].trim().length === 0) {
    index += 1;
  }
  let defaultValue = null;
  if (lines[index]?.trim().startsWith("DEFAULT:")) {
    defaultValue = lines[index].trim().slice("DEFAULT:".length).trim();
    index += 1;
  }
  while (index < lines.length && lines[index].trim().length === 0) {
    index += 1;
  }
  const columns = lines[index].trim().split(/\s+/u);
  index += 1;

  const rows = [];
  for (; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line.length === 0 || line.startsWith("//")) {
      continue;
    }
    const cells = line.match(/"[^"]*"|\S+/gu) ?? [];
    if (cells.length === 0) {
      continue;
    }
    const rowId = Number.parseInt(cells[0], 10);
    if (!Number.isFinite(rowId)) {
      continue;
    }
    const row = { rowId };
    columns.forEach((column, columnIndex) => {
      let value = cells[columnIndex + 1] ?? "";
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      row[column] = value;
    });
    rows.push(row);
  }

  return { defaultValue, columns, rows };
}

function classifyVfxRow(row) {
  const label = normalizeCell(row.Label) || `row_${row.rowId}`;
  const progfxImpact = normalizeCell(row.ProgFX_Impact);
  const progfxDuration = normalizeCell(row.ProgFX_Duration);
  const progfxCessation = normalizeCell(row.ProgFX_Cessation);
  const modelNodeColumns = [
    "Imp_HeadCon_Node",
    "Imp_Impact_Node",
    "Imp_Root_S_Node",
    "Imp_Root_M_Node",
    "Imp_Root_L_Node",
    "Imp_Root_H_Node",
    "Dur_HeadCon_Node",
    "Dur_Impact_Node",
    "Dur_Root_S_Node",
    "Dur_Root_M_Node",
    "Dur_Root_L_Node",
    "Dur_Root_H_Node",
    "Ces_HeadCon_Node",
    "Ces_Impact_Node",
    "Ces_Root_S_Node",
    "Ces_Root_M_Node",
    "Ces_Root_L_Node",
    "Ces_Root_H_Node"
  ];
  const modelRefs = modelNodeColumns
    .map((column) => ({ column, value: normalizeCell(row[column]) }))
    .filter((entry) => entry.value.length > 0);
  const type = normalizeCell(row.Type_FD).toUpperCase();
  const hasDuration =
    type === "D" ||
    progfxDuration.length > 0 ||
    modelRefs.some((ref) => ref.column.startsWith("Dur_"));
  const hasImpact = type === "F" || progfxImpact.length > 0 || modelRefs.some((ref) => ref.column.startsWith("Imp_"));
  const hasCessation = progfxCessation.length > 0 || modelRefs.some((ref) => ref.column.startsWith("Ces_"));
  const allMeaningful = Object.entries(row).filter(
    ([key, value]) => key !== "rowId" && isMeaningfulCell(value)
  );
  const blank = allMeaningful.length === 0 || (allMeaningful.length === 1 && allMeaningful[0][0] === "Label");
  const harness =
    blank ? "skip_blank_row" : hasDuration ? "object_duration" : "object_instant";
  const effectDurationSeconds = blank || !hasDuration ? 0 : 8;
  const captureWindowSeconds = blank ? 0 : hasDuration ? 10 : 4;

  return {
    rowId: row.rowId,
    label,
    typeFD: type || "unknown",
    blank,
    harness,
    effectDurationSeconds,
    captureWindowSeconds,
    hasImpact,
    hasDuration,
    hasCessation,
    progfx: {
      impact: progfxImpact || null,
      duration: progfxDuration || null,
      cessation: progfxCessation || null
    },
    modelRefs
  };
}

function classifyProgfxRow(row) {
  const label = normalizeCell(row.Label) || `row_${row.rowId}`;
  const type = normalizeCell(row.Type);
  const blank = Object.entries(row).every(
    ([key, value]) => key === "rowId" || !isMeaningfulCell(value)
  );
  return {
    rowId: row.rowId,
    label,
    type: type || "unknown",
    blank,
    params: Object.fromEntries(
      ["Param1", "Param2", "Param3", "Param4", "Param5", "Param6", "Param7", "Param8"].map(
        (key) => [key, normalizeCell(row[key]) || null]
      )
    )
  };
}

function formatNwFloat(value) {
  return `${Number(value).toFixed(1)}`;
}

function buildScriptSources(vfxEntries) {
  const scripts = new Map();
  scripts.set(
    "vfxlab_inc",
    `// Generated by create-vfx-catalog-lab-map.mjs\n` +
      `// Runs one VFX row at a time on the Last City VFX lab stage.\n\n` +
      `object VfxLabGetTarget()\n` +
      `{\n` +
      `    object oTarget = GetObjectByTag("${STAGE_TARGET_TAG}");\n` +
      `    if (!GetIsObjectValid(oTarget))\n` +
      `    {\n` +
      `        oTarget = GetObjectByTag("${STAGE_FALLBACK_TAG}");\n` +
      `    }\n` +
      `    if (!GetIsObjectValid(oTarget))\n` +
      `    {\n` +
      `        oTarget = GetFirstPC();\n` +
      `    }\n` +
      `    return oTarget;\n` +
      `}\n\n` +
      `void VfxLabAnnounce(string sMessage)\n` +
      `{\n` +
      `    object oPC = GetFirstPC();\n` +
      `    if (GetIsObjectValid(oPC))\n` +
      `    {\n` +
      `        SendMessageToPC(oPC, sMessage);\n` +
      `    }\n` +
      `}\n\n` +
      `void VfxLabPlayRow(int nRow, float fEffectDurationSeconds)\n` +
      `{\n` +
      `    object oTarget = VfxLabGetTarget();\n` +
      `    if (!GetIsObjectValid(oTarget))\n` +
      `    {\n` +
      `        return;\n` +
      `    }\n` +
      `    VfxLabAnnounce("VFXLAB row " + IntToString(nRow));\n` +
      `    effect eVfx = EffectVisualEffect(nRow);\n` +
      `    if (fEffectDurationSeconds > 0.0)\n` +
      `    {\n` +
      `        ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eVfx, oTarget, fEffectDurationSeconds);\n` +
      `    }\n` +
      `    else\n` +
      `    {\n` +
      `        ApplyEffectToObject(DURATION_TYPE_INSTANT, eVfx, oTarget);\n` +
      `    }\n` +
      `}\n\n` +
      `void VfxLabQueueRow(int nRow, float fDelaySeconds, float fEffectDurationSeconds)\n` +
      `{\n` +
      `    DelayCommand(fDelaySeconds, VfxLabPlayRow(nRow, fEffectDurationSeconds));\n` +
      `}\n`
  );
  scripts.set(
    "vfxlab_one",
    `#include "vfxlab_inc"\n\n` +
      `void main()\n` +
      `{\n` +
      `    int nRow = GetLocalInt(GetModule(), "VFX_LAB_ROW");\n` +
      `    float fEffectDurationSeconds = GetLocalFloat(GetModule(), "VFX_LAB_EFFECT_DURATION");\n` +
      `    VfxLabPlayRow(nRow, fEffectDurationSeconds);\n` +
      `}\n`
  );

  const maxRowId = Math.max(...vfxEntries.map((entry) => entry.rowId));
  for (let start = 0; start <= maxRowId; start += SCRIPT_BLOCK_SIZE) {
    const end = Math.min(start + SCRIPT_BLOCK_SIZE - 1, maxRowId);
    const scriptName = `vxlb${String(start).padStart(5, "0")}`.slice(0, 16);
    const blockEntries = vfxEntries.filter(
      (entry) => !entry.blank && entry.rowId >= start && entry.rowId <= end
    );
    let currentDelaySeconds = 0;
    const queueLines = blockEntries.map((entry) => {
      const line =
        `    VfxLabQueueRow(${entry.rowId}, ` +
        `${formatNwFloat(currentDelaySeconds)}, ` +
        `${formatNwFloat(entry.effectDurationSeconds)});`;
      currentDelaySeconds += entry.captureWindowSeconds;
      return line;
    });
    scripts.set(
      scriptName,
      `#include "vfxlab_inc"\n\n` +
        `void main()\n` +
        `{\n` +
        (queueLines.length > 0
          ? `${queueLines.join("\n")}\n`
          : `    VfxLabAnnounce("VFXLAB block ${start}-${end} has no active rows.");\n`) +
        `}\n`
    );
  }

  return scripts;
}

function buildReadme(summary) {
  return `# VFX Catalog Lab Map\n\n` +
    `Generated: ${summary.generatedAt}\n\n` +
    `This packet turns a copy of \`${MODULE_SOURCE_NAME}\` into a VFX catalog lab target.\n` +
    `It does not claim retail parity. It creates the full capture queue and script sources for\n` +
    `running one VFX row at a time on the existing Last City stage area.\n\n` +
    `## Module Copy\n\n` +
    `- Source: \`${summary.module.sourcePath}\`\n` +
    `- Lab copy: \`${summary.module.labPath}\`\n` +
    `- Stage area: \`${STAGE_AREA_RESREF}\`\n` +
    `- Preferred target tag: \`${STAGE_TARGET_TAG}\`\n` +
    `- Fallback target tag: \`${STAGE_FALLBACK_TAG}\`\n` +
    `- Existing lever tag: \`${STAGE_LEVER_TAG}\`\n\n` +
    `## Catalog\n\n` +
    `- visualeffects rows: ${summary.visualeffects.rowCount}\n` +
    `- progfx rows: ${summary.progfx.rowCount}\n` +
    `- generated block scripts: ${summary.scripts.blockScriptCount}\n` +
    `- row ids per block script: ${SCRIPT_BLOCK_SIZE}\n\n` +
    `## Operation Model\n\n` +
    `Run or attach one block script at a time, then record the entire animation sequence.\n` +
    `Each block queues only active rows. Instant rows use an instant visual effect and a short\n` +
    `capture window; duration rows use a temporary effect duration and a longer capture window.\n` +
    `The intended output is video/frames/timeline, not a single screenshot.\n\n` +
    `Core scripts:\n\n` +
    `- \`vfxlab_inc.nss\`: shared helper functions.\n` +
    `- \`vfxlab_one.nss\`: plays the row stored in module local int \`VFX_LAB_ROW\`.\n` +
    `- \`vxlb00000.nss\`, \`vxlb00100.nss\`, ...: block runners for the full catalog.\n\n` +
    `After compiling the generated sources, run \`scripts/inject-vfx-catalog-lab-compiled-scripts.mjs\`\n` +
    `to add the resulting \`.ncs\` files to the lab module. The compiled block scripts can then\n` +
    `be invoked one at a time, for example \`dm_runscript vxlb00000\`.\n\n` +
    `## Files\n\n` +
    `- \`vfx-catalog-lab-map.json\`: full row map and capture queue.\n` +
    `- \`vfx-catalog-lab-map.csv\`: compact sortable queue.\n` +
    `- \`generated-scripts/*.nss\`: NWScript sources.\n` +
    `- \`compiled-scripts/*.ncs\`: compiled NWScript bytecode when compilation has been run.\n` +
    `- \`compiled-injection-summary.json\`: module injection summary when compiled scripts have been injected.\n` +
    `- \`summary.json\`: generation summary and hashes.\n`;
}

async function main() {
  const generatedAt = new Date().toISOString();
  const nwnRoot = getNwnUserRoot();
  const modulesDir = join(nwnRoot, "modules");
  const hakDir = join(nwnRoot, "hak");
  const sourceModulePath = join(modulesDir, MODULE_SOURCE_NAME);
  const labModulePath = join(modulesDir, MODULE_LAB_NAME);

  if (!existsSync(sourceModulePath)) {
    throw new Error(`Source module not found: ${sourceModulePath}`);
  }
  if (!existsSync(labModulePath)) {
    await copyFile(sourceModulePath, labModulePath);
  }

  const lc2daPath = join(hakDir, "lc_2da.hak");
  const lc2daErf = readErfEntries(await readFile(lc2daPath), lc2daPath);
  const visualeffectsBytes = findErfResource(lc2daErf, "visualeffects", RESOURCE_TYPES.twoDa);
  const progfxBytes = findErfResource(lc2daErf, "progfx", RESOURCE_TYPES.twoDa);
  if (!visualeffectsBytes || !progfxBytes) {
    throw new Error("lc_2da.hak must contain visualeffects.2da and progfx.2da");
  }

  const visualeffects = parse2da(visualeffectsBytes);
  const progfx = parse2da(progfxBytes);
  const vfxEntries = visualeffects.rows.map(classifyVfxRow).map((entry) => {
    const blockStart = Math.floor(entry.rowId / SCRIPT_BLOCK_SIZE) * SCRIPT_BLOCK_SIZE;
    return {
      ...entry,
      captureId: `vfx-row-${String(entry.rowId).padStart(5, "0")}-${slugify(entry.label)}`,
      blockStart,
      blockEnd: Math.min(blockStart + SCRIPT_BLOCK_SIZE - 1, visualeffects.rows.at(-1).rowId),
      blockScript: `vxlb${String(blockStart).padStart(5, "0")}`.slice(0, 16)
    };
  });
  const progfxEntries = progfx.rows.map(classifyProgfxRow);
  const scriptSources = buildScriptSources(vfxEntries);

  await mkdir(outputRoot, { recursive: true });
  const scriptsDir = join(outputRoot, "generated-scripts");
  await mkdir(scriptsDir, { recursive: true });

  for (const [scriptName, source] of scriptSources.entries()) {
    await writeFile(join(scriptsDir, `${scriptName}.nss`), source, "utf-8");
  }

  const map = {
    version: "aurora-vfx-catalog-lab-map/v1",
    generatedAt,
    sourceProfile: {
      module: MODULE_SOURCE_NAME,
      hakProfileId: "lc_vfx",
      haks: ["lc_2da.hak", "lc_vfx.hak", "cep3_vfx.hak"],
      visualeffects: {
        source: "lc_2da.hak/visualeffects.2da",
        sha256: createHash("sha256").update(visualeffectsBytes).digest("hex"),
        columns: visualeffects.columns
      },
      progfx: {
        source: "lc_2da.hak/progfx.2da",
        sha256: createHash("sha256").update(progfxBytes).digest("hex"),
        columns: progfx.columns
      }
    },
    stage: {
      moduleCopy: labModulePath,
      areaResref: STAGE_AREA_RESREF,
      targetTag: STAGE_TARGET_TAG,
      fallbackTargetTag: STAGE_FALLBACK_TAG,
      leverTag: STAGE_LEVER_TAG,
      captureMode: "one_vfx_at_a_time",
      requiredCaptureArtifacts: [
        "capture.mp4",
        "frames/",
        "timeline.json",
        "effect-context.json",
        "capture.json"
      ]
    },
    policy: {
      screenshotAloneIsEvidence: false,
      canonicalRequiresRetailComparison: true,
      instantCaptureWindowSeconds: 4,
      durationEffectSeconds: 8,
      durationCaptureWindowSeconds: 10,
      blockSize: SCRIPT_BLOCK_SIZE
    },
    visualeffects: vfxEntries,
    progfx: progfxEntries
  };

  await writeFile(join(outputRoot, "vfx-catalog-lab-map.json"), JSON.stringify(map, null, 2), "utf-8");
  const csvRows = [
    [
      "rowId",
      "label",
      "typeFD",
      "blank",
      "harness",
        "suggestedDurationSeconds",
      "effectDurationSeconds",
      "captureWindowSeconds",
      "blockScript",
      "captureId",
      "progfxImpact",
      "progfxDuration",
      "progfxCessation",
      "modelRefCount"
    ].join(","),
    ...vfxEntries.map((entry) =>
      [
        entry.rowId,
        entry.label,
        entry.typeFD,
        entry.blank,
        entry.harness,
        entry.effectDurationSeconds,
        entry.captureWindowSeconds,
        entry.blockScript,
        entry.captureId,
        entry.progfx.impact ?? "",
        entry.progfx.duration ?? "",
        entry.progfx.cessation ?? "",
        entry.modelRefs.length
      ]
        .map(csvEscape)
        .join(",")
    )
  ];
  await writeFile(join(outputRoot, "vfx-catalog-lab-map.csv"), `${csvRows.join("\n")}\n`, "utf-8");

  const newModuleResourceEntries = [];
  for (const [scriptName, source] of scriptSources.entries()) {
    newModuleResourceEntries.push({
      resref: scriptName,
      type: RESOURCE_TYPES.nss,
      bytes: Buffer.from(source, "utf-8")
    });
  }
  newModuleResourceEntries.push({
    resref: "vfxlabmap",
    type: RESOURCE_TYPES.txt,
    bytes: Buffer.from(
      JSON.stringify(
        {
          version: map.version,
          generatedAt,
          mapPath: join(outputRoot, "vfx-catalog-lab-map.json"),
          stage: map.stage,
          visualeffectsRows: vfxEntries.length,
          progfxRows: progfxEntries.length
        },
        null,
        2
      ),
      "utf-8"
    )
  });

  const labModuleBytes = await readFile(labModulePath);
  const labErf = readErfEntries(labModuleBytes, labModulePath);
  const newKeys = new Set(
    newModuleResourceEntries.map((entry) => `${entry.resref.toLowerCase()}:${entry.type}`)
  );
  const mergedEntries = [
    ...labErf.entries.filter(
      (entry) => !newKeys.has(`${entry.resref.toLowerCase()}:${entry.type}`)
    ),
    ...newModuleResourceEntries
  ];
  const backupPath = `${labModulePath}.pre-vfxlab-${generatedAt.replace(/[:.]/g, "-")}.bak`;
  await copyFile(labModulePath, backupPath);
  const repacked = buildErfV10FromEntries(labErf.header, labErf.localizedStrings, mergedEntries);
  await writeFile(labModulePath, repacked);

  const verifyErf = readErfEntries(await readFile(labModulePath), labModulePath);
  const missingScripts = [...scriptSources.keys()].filter(
    (scriptName) => !findErfResource(verifyErf, scriptName, RESOURCE_TYPES.nss)
  );
  const summary = {
    version: "aurora-vfx-catalog-lab-summary/v1",
    generatedAt,
    repoRoot,
    module: {
      sourcePath: sourceModulePath,
      labPath: labModulePath,
      backupPath,
      originalEntryCount: labErf.entries.length,
      finalEntryCount: verifyErf.entries.length,
      injectedResourceCount: newModuleResourceEntries.length,
      labSha256: createHash("sha256").update(await readFile(labModulePath)).digest("hex")
    },
    visualeffects: {
      rowCount: vfxEntries.length,
      activeRowCount: vfxEntries.filter((entry) => !entry.blank).length,
      blankRowCount: vfxEntries.filter((entry) => entry.blank).length,
      sha256: map.sourceProfile.visualeffects.sha256
    },
    progfx: {
      rowCount: progfxEntries.length,
      activeRowCount: progfxEntries.filter((entry) => !entry.blank).length,
      blankRowCount: progfxEntries.filter((entry) => entry.blank).length,
      sha256: map.sourceProfile.progfx.sha256
    },
    scripts: {
      scriptCount: scriptSources.size,
      blockScriptCount: [...scriptSources.keys()].filter((name) => name.startsWith("vxlb")).length,
      missingScripts
    },
    artifacts: {
      outputRoot,
      mapJson: join(outputRoot, "vfx-catalog-lab-map.json"),
      mapCsv: join(outputRoot, "vfx-catalog-lab-map.csv"),
      generatedScripts: scriptsDir,
      readme: join(outputRoot, "README.md")
    }
  };

  await writeFile(join(outputRoot, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  await writeFile(join(outputRoot, "README.md"), buildReadme(summary), "utf-8");

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
