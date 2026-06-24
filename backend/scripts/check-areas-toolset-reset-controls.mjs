#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..", "..");

const DEFAULT_TOOLSET_PATH = "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights\\bin\\win32\\nwtoolset.exe";
const TOOLSET_PATH = process.env.AURORA_TOOLSET_PATH ?? DEFAULT_TOOLSET_PATH;
const EVIDENCE_PATH = resolve(
  repoRoot,
  "backend/backend/docs/aurora-reverse/artifacts/areas-runtime-capture/toolset-reset-controls-extract.json",
);

const DFM_CONTROL_TREE_ORDER = [
  "TToolBar",
  "tbModuleDisplay",
  "TToolButton",
  "sbFindStart",
  "Hint",
  "Goto Start Location",
  "OnClick",
  "actFindStartExecute",
  "TToolButton",
  "sbRecenter",
  "Hint",
  "Reorient Camera",
  "OnClick",
  "sbRecenterClick",
];

const failures = [];

function fail(code, details = {}) {
  failures.push({ code, ...details });
}

function printableSnippet(source, index, radius = 220) {
  const start = Math.max(0, index - radius);
  const end = Math.min(source.length, index + radius);
  return source
    .slice(start, end)
    .replace(/[^\x20-\x7e]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findAll(source, needle) {
  const offsets = [];
  let offset = -1;
  while ((offset = source.indexOf(needle, offset + 1)) >= 0) {
    offsets.push(offset);
  }
  return offsets;
}

function findDfmControlTreeBlock(source) {
  for (const toolbarNameOffset of findAll(source, "tbModuleDisplay")) {
    const toolbarTypeOffset = source.lastIndexOf("TToolBar", toolbarNameOffset);
    if (toolbarTypeOffset < 0 || toolbarNameOffset - toolbarTypeOffset > 96) {
      continue;
    }

    const positions = new Map([
      ["TToolBar", toolbarTypeOffset],
      ["tbModuleDisplay", toolbarNameOffset],
    ]);
    let searchOffset = toolbarNameOffset + "tbModuleDisplay".length;

    for (const needle of DFM_CONTROL_TREE_ORDER.slice(2)) {
      const index = source.indexOf(needle, searchOffset);
      if (index < 0) {
        positions.set(needle, null);
        break;
      }
      positions.set(needle, index);
      searchOffset = index + needle.length;
    }

    const findStartOffset = positions.get("sbFindStart");
    const gotoStartOffset = positions.get("Goto Start Location");
    const findStartHandlerOffset = positions.get("actFindStartExecute");
    const recenterOffset = positions.get("sbRecenter");
    const reorientOffset = positions.get("Reorient Camera");
    const recenterHandlerOffset = positions.get("sbRecenterClick");
    const blockEnd = recenterHandlerOffset + "sbRecenterClick".length;

    if (
      typeof findStartOffset === "number" &&
      typeof gotoStartOffset === "number" &&
      typeof findStartHandlerOffset === "number" &&
      typeof recenterOffset === "number" &&
      typeof reorientOffset === "number" &&
      typeof recenterHandlerOffset === "number" &&
      findStartOffset > toolbarNameOffset &&
      gotoStartOffset > findStartOffset &&
      gotoStartOffset - findStartOffset < 180 &&
      findStartHandlerOffset > gotoStartOffset &&
      findStartHandlerOffset - gotoStartOffset < 180 &&
      recenterOffset > findStartHandlerOffset &&
      recenterOffset - findStartOffset < 360 &&
      reorientOffset > recenterOffset &&
      reorientOffset - recenterOffset < 180 &&
      recenterHandlerOffset > reorientOffset &&
      recenterHandlerOffset - reorientOffset < 180
    ) {
      return {
        proofType: "dfm_control_tree_block",
        symbolMapOnly: false,
        blockStart: toolbarTypeOffset,
        blockEnd,
        offsets: {
          toolbarType: toolbarTypeOffset,
          toolbarName: toolbarNameOffset,
          findStartButton: findStartOffset,
          findStartHint: gotoStartOffset,
          findStartHandler: findStartHandlerOffset,
          recenterButton: recenterOffset,
          recenterHint: reorientOffset,
          recenterHandler: recenterHandlerOffset,
        },
      };
    }
  }

  return null;
}

if (!existsSync(TOOLSET_PATH)) {
  fail("missing_toolset_executable", { path: TOOLSET_PATH });
} else {
  const bytes = readFileSync(TOOLSET_PATH);
  const source = bytes.toString("latin1");
  const symbolOffsets = Object.fromEntries(
    [
      "tbModuleDisplay",
      "sbFindStart",
      "Goto Start Location",
      "actFindStartExecute",
      "sbRecenter",
      "Reorient Camera",
      "sbRecenterClick",
    ].map((needle) => [needle, findAll(source, needle)]),
  );
  const proof = findDfmControlTreeBlock(source);

  if (!proof) {
    fail("missing_dfm_control_tree_block", {
      requiredOrder: DFM_CONTROL_TREE_ORDER,
      symbolOffsets,
      reason: "raw symbol matches are not enough; the gate requires a TToolBar/TToolButton DFM control-tree block",
    });
  }

  if (failures.length === 0 && process.argv.includes("--write-evidence")) {
    const positions = proof.offsets;
    const evidence = {
      version: "aurora-toolset-reset-controls-extract/v2",
      capturedAt: new Date().toISOString(),
      source: "nwtoolset.exe",
      toolsetPath: TOOLSET_PATH,
      sourceSizeBytes: statSync(TOOLSET_PATH).size,
      safety: {
        usesGlobalCursor: false,
        usesGlobalKeyboard: false,
        method: "passive binary metadata extraction",
      },
      proof: {
        type: proof.proofType,
        symbolMapOnly: proof.symbolMapOnly,
        blockStart: proof.blockStart,
        blockEnd: proof.blockEnd,
        requiredOrder: DFM_CONTROL_TREE_ORDER,
        falsePositiveGuard: "Requires TToolBar tbModuleDisplay plus ordered TToolButton/hint/OnClick metadata; raw symbol offsets alone are rejected.",
      },
      symbolOffsets,
      controls: [
        {
          toolbar: "tbModuleDisplay",
          controlName: "sbFindStart",
          hint: "Goto Start Location",
          handler: "actFindStartExecute",
          semanticRole: "canvas/view position reset to module start location",
          offset: positions.findStartButton,
          snippet: printableSnippet(source, positions.findStartButton),
        },
        {
          toolbar: "tbModuleDisplay",
          controlName: "sbRecenter",
          hint: "Reorient Camera",
          handler: "sbRecenterClick",
          semanticRole: "camera orientation reset/recenter",
          offset: positions.recenterButton,
          snippet: printableSnippet(source, positions.recenterButton),
        },
      ],
    };
    mkdirSync(dirname(EVIDENCE_PATH), { recursive: true });
    writeFileSync(EVIDENCE_PATH, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
  }
}

if (failures.length > 0) {
  console.error("Areas Toolset reset controls gate failed.");
  console.error(JSON.stringify({ failures }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
      {
        status: "passed",
        gate: "areas-toolset-reset-controls",
        proofType: "dfm_control_tree_block",
        symbolMapOnly: false,
        toolsetPath: TOOLSET_PATH,
        canvasPositionReset: "tbModuleDisplay / sbFindStart / Goto Start Location",
        cameraOrientationReset: "tbModuleDisplay / sbRecenter / Reorient Camera",
      evidencePath: process.argv.includes("--write-evidence") ? EVIDENCE_PATH : null,
    },
    null,
    2,
  ),
);
