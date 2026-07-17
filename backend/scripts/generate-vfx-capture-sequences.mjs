import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";

const SEQUENCE_BATCH_SIZE = 20;
const DEFAULT_DELAY_SECONDS = 1;
const LOCATION_INTER_EFFECT_GAP_SECONDS = 4;
const OBJECT_SCRIPT_PREFIX = "vfxco";
const BEAM_SCRIPT_PREFIX = "vfxcb";
const LOCATION_SCRIPT_PREFIX = "vfxcl";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const backendRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "vfx-catalog-lab-map"
);
const generatedScriptsDir = join(outputRoot, "generated-scripts");

function formatNwFloat(value) {
  return `${Number(value).toFixed(1)}`;
}

function escapeNwString(value) {
  return String(value).replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function safeFileLabel(label) {
  return String(label)
    .replace(/[^A-Za-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 120);
}

function rowModelRefColumns(row) {
  return (row.modelRefs ?? []).map((ref) => String(ref.column ?? "").toUpperCase());
}

function hasModelRefColumn(row, pattern) {
  return rowModelRefColumns(row).some((column) => pattern.test(column));
}

function classifyCapture(row) {
  const label = String(row.label ?? "").toUpperCase();
  const hasHeadAttachment = hasModelRefColumn(row, /HEAD|EYE|MOUTH|HANDCON/);
  const isAreaLabel =
    label.includes("_FNF_") ||
    label.includes("_AOE_") ||
    label.startsWith("VFX_CONJ_") ||
    label.startsWith("PRCVFX_CONJ_") ||
    label.includes("_AREA_");
  const isHeadLabel = /(^|_)EYES?(_|$)|(^|_)HEAD(_|$)|GAZE|BAELNEYES|MIND/.test(label);
  const reasons = [];
  let captureMode = "object_turntable";
  let targetMode = "object";

  if (row.typeFD === "B" || label.includes("_BEAM_")) {
    captureMode = "beam_two_targets";
    targetMode = "beam";
    reasons.push("beam row: use EffectBeam with source and target objects");
  } else if (
    label.startsWith("SCENE_") ||
    label.includes("_SCENE_") ||
    label.includes("_WALL") ||
    label.includes("_PILLAR")
  ) {
    captureMode = "large_scene";
    targetMode = "object";
    reasons.push("large scene-like asset: wider crop");
  } else if (hasHeadAttachment) {
    captureMode = "object_head_closeup";
    targetMode = "object";
    reasons.push("head/face attachment node: close crop plus front/back pose");
  } else if (isAreaLabel) {
    captureMode = "location_area";
    targetMode = "location";
    reasons.push("fire-and-forget or area label: apply at location");
  } else if (isHeadLabel) {
    captureMode = "object_head_closeup";
    targetMode = "object";
    reasons.push("head/face label: close crop plus front/back pose");
  } else if (row.typeFD === "F" && (row.modelRefs ?? []).length === 0) {
    captureMode = "location_area";
    targetMode = "location";
    reasons.push("F row without object attachment refs: apply at location");
  } else if (row.typeFD === "F") {
    captureMode = "object_instant";
    targetMode = "object";
    reasons.push("F row with object attachment refs: apply to object");
  }

  return { captureMode, targetMode, reasons };
}

function captureTargetMode(row) {
  return classifyCapture(row).targetMode;
}

function isCaptureCandidate(row) {
  if (row.blank) {
    return false;
  }
  const label = String(row.label ?? "");
  if (!label || /^DELETED$/iu.test(label)) {
    return false;
  }
  const hasFilledVfx2daPayload =
    (row.modelRefs ?? []).length > 0 ||
    Boolean(row.progfx?.impact) ||
    Boolean(row.progfx?.duration) ||
    Boolean(row.progfx?.cessation);
  if (!hasFilledVfx2daPayload) {
    return false;
  }
  return captureTargetMode(row) !== null;
}

function chunkRows(rows, size) {
  const chunks = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}

async function cleanGeneratedCaptureScripts() {
  await mkdir(generatedScriptsDir, { recursive: true });
  const names = await readdir(generatedScriptsDir);
  await Promise.all(
    names
      .filter((name) => /^vfxc[obl]\d{4}\.nss$/iu.test(name) || name === "vfxcap_inc.nss")
      .map((name) => unlink(join(generatedScriptsDir, name)))
  );
}

function buildCaptureInclude() {
  return `#include "vfxlab_inc"\n\n` +
    `void VfxCapFaceTargetToPC()\n` +
    `{\n` +
    `    object oTarget = VfxLabGetTarget();\n` +
    `    object oPC = GetFirstPC();\n` +
    `    if (!GetIsObjectValid(oTarget))\n` +
    `    {\n` +
    `        return;\n` +
    `    }\n` +
    `    SetCommandable(TRUE, oTarget);\n` +
    `    AssignCommand(oTarget, ClearAllActions(TRUE));\n` +
    `    if (GetIsObjectValid(oPC) && oPC != oTarget)\n` +
    `    {\n` +
    `        AssignCommand(oTarget, SetFacingPoint(GetPosition(oPC)));\n` +
    `    }\n` +
    `    else\n` +
    `    {\n` +
    `        AssignCommand(oTarget, SetFacing(180.0));\n` +
    `    }\n` +
    `}\n\n` +
    `void VfxCapFaceTargetAwayFromPC()\n` +
    `{\n` +
    `    object oTarget = VfxLabGetTarget();\n` +
    `    object oPC = GetFirstPC();\n` +
    `    if (!GetIsObjectValid(oTarget))\n` +
    `    {\n` +
    `        return;\n` +
    `    }\n` +
    `    SetCommandable(TRUE, oTarget);\n` +
    `    AssignCommand(oTarget, ClearAllActions(TRUE));\n` +
    `    if (GetIsObjectValid(oPC) && oPC != oTarget)\n` +
    `    {\n` +
    `        vector vTarget = GetPosition(oTarget);\n` +
    `        vector vPC = GetPosition(oPC);\n` +
    `        vector vAway = vTarget + (vTarget - vPC);\n` +
    `        AssignCommand(oTarget, SetFacingPoint(vAway));\n` +
    `    }\n` +
    `    else\n` +
    `    {\n` +
    `        AssignCommand(oTarget, SetFacing(0.0));\n` +
    `    }\n` +
    `}\n\n` +
    `void VfxCapScheduleTargetFacing(float fWindowSeconds)\n` +
    `{\n` +
    `    VfxCapFaceTargetToPC();\n` +
    `    if (fWindowSeconds >= 4.0)\n` +
    `    {\n` +
    `        DelayCommand(fWindowSeconds * 0.45, VfxCapFaceTargetAwayFromPC());\n` +
    `        DelayCommand(fWindowSeconds + 0.25, VfxCapFaceTargetToPC());\n` +
    `    }\n` +
    `}\n\n` +
    `location VfxLabGetCaptureLocation()\n` +
    `{\n` +
    `    object oTarget = VfxLabGetTarget();\n` +
    `    if (GetIsObjectValid(oTarget))\n` +
    `    {\n` +
    `        return GetLocation(oTarget);\n` +
    `    }\n` +
    `    object oPC = GetFirstPC();\n` +
    `    return GetLocation(oPC);\n` +
    `}\n\n` +
    `object VfxCapGetBeamSource()\n` +
    `{\n` +
    `    object oPC = GetFirstPC();\n` +
    `    if (GetIsObjectValid(oPC))\n` +
    `    {\n` +
    `        return oPC;\n` +
    `    }\n` +
    `    return OBJECT_SELF;\n` +
    `}\n\n` +
    `void VfxCapPlayObjectRow(int nRow, float fEffectDurationSeconds, string sLabel, string sCaptureMode)\n` +
    `{\n` +
    `    object oTarget = VfxLabGetTarget();\n` +
    `    if (!GetIsObjectValid(oTarget))\n` +
    `    {\n` +
    `        return;\n` +
    `    }\n` +
    `    VfxCapScheduleTargetFacing(fEffectDurationSeconds);\n` +
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
    `void VfxCapPlayBeamRow(int nRow, float fEffectDurationSeconds, string sLabel)\n` +
    `{\n` +
    `    object oTarget = VfxLabGetTarget();\n` +
    `    object oSource = VfxCapGetBeamSource();\n` +
    `    if (!GetIsObjectValid(oTarget) || !GetIsObjectValid(oSource))\n` +
    `    {\n` +
    `        return;\n` +
    `    }\n` +
    `    VfxCapFaceTargetToPC();\n` +
    `    effect eBeam = EffectBeam(nRow, oSource, BODY_NODE_CHEST, FALSE);\n` +
    `    if (fEffectDurationSeconds > 0.0)\n` +
    `    {\n` +
    `        ApplyEffectToObject(DURATION_TYPE_TEMPORARY, eBeam, oTarget, fEffectDurationSeconds);\n` +
    `    }\n` +
    `    else\n` +
    `    {\n` +
    `        ApplyEffectToObject(DURATION_TYPE_INSTANT, eBeam, oTarget);\n` +
    `    }\n` +
    `}\n\n` +
    `void VfxCapPlayLocationRow(int nRow, float fEffectDurationSeconds, string sLabel)\n` +
    `{\n` +
    `    float fFacingWindow = fEffectDurationSeconds;\n` +
    `    if (fFacingWindow < 4.0)\n` +
    `    {\n` +
    `        fFacingWindow = 4.0;\n` +
    `    }\n` +
    `    VfxCapScheduleTargetFacing(fFacingWindow);\n` +
    `    location lTarget = VfxLabGetCaptureLocation();\n` +
    `    effect eVfx = EffectVisualEffect(nRow);\n` +
    `    if (fEffectDurationSeconds > 0.0)\n` +
    `    {\n` +
    `        ApplyEffectAtLocation(DURATION_TYPE_TEMPORARY, eVfx, lTarget, fEffectDurationSeconds);\n` +
    `    }\n` +
    `    else\n` +
    `    {\n` +
    `        ApplyEffectAtLocation(DURATION_TYPE_INSTANT, eVfx, lTarget);\n` +
    `    }\n` +
    `}\n\n` +
    `void VfxCapQueueObjectRow(int nRow, float fDelaySeconds, float fEffectDurationSeconds, string sLabel, string sCaptureMode)\n` +
    `{\n` +
    `    DelayCommand(fDelaySeconds, VfxCapPlayObjectRow(nRow, fEffectDurationSeconds, sLabel, sCaptureMode));\n` +
    `}\n\n` +
    `void VfxCapQueueBeamRow(int nRow, float fDelaySeconds, float fEffectDurationSeconds, string sLabel)\n` +
    `{\n` +
    `    DelayCommand(fDelaySeconds, VfxCapPlayBeamRow(nRow, fEffectDurationSeconds, sLabel));\n` +
    `}\n\n` +
    `void VfxCapQueueLocationRow(int nRow, float fDelaySeconds, float fEffectDurationSeconds, string sLabel)\n` +
    `{\n` +
    `    DelayCommand(fDelaySeconds, VfxCapPlayLocationRow(nRow, fEffectDurationSeconds, sLabel));\n` +
    `}\n`;
}

function buildSequenceScript(scriptName, rows, targetMode) {
  let delaySeconds = DEFAULT_DELAY_SECONDS;
  const lines = rows.map((row) => {
    let line;
    if (row.captureMode === "beam_two_targets") {
      line =
        `    VfxCapQueueBeamRow(${row.rowId}, ${formatNwFloat(delaySeconds)}, ` +
        `${formatNwFloat(row.effectDurationSeconds)}, "${escapeNwString(row.label)}");`;
    } else if (row.captureMode === "location_area") {
      line =
        `    VfxCapQueueLocationRow(${row.rowId}, ${formatNwFloat(delaySeconds)}, ` +
        `${formatNwFloat(row.effectDurationSeconds)}, "${escapeNwString(row.label)}");`;
    } else {
      line =
        `    VfxCapQueueObjectRow(${row.rowId}, ${formatNwFloat(delaySeconds)}, ` +
        `${formatNwFloat(row.effectDurationSeconds)}, "${escapeNwString(row.label)}", ` +
        `"${escapeNwString(row.captureMode)}");`;
    }
    delaySeconds += row.captureWindowSeconds + Number(row.interEffectGapSeconds ?? 0);
    return line;
  });

  return `#include "vfxcap_inc"\n\n` +
    `void main()\n` +
    `{\n` +
    `${lines.join("\n")}\n` +
    `}\n`;
}

function buildTimeline(scriptName, rows, targetMode) {
  let startSeconds = DEFAULT_DELAY_SECONDS;
  return rows.map((row, index) => {
    const durationSeconds = row.captureWindowSeconds;
    const interEffectGapSeconds = Number(row.interEffectGapSeconds ?? 0);
    const midpointSeconds = startSeconds + durationSeconds / 2;
    const clip = {
      rowId: row.rowId,
      label: row.label,
      targetMode,
      captureMode: row.captureMode,
      captureReasons: row.captureReasons,
      scriptName,
      sequenceIndex: index,
      startSeconds,
      endSeconds: startSeconds + durationSeconds,
      midpointSeconds,
      captureWindowSeconds: durationSeconds,
      interEffectGapSeconds,
      effectDurationSeconds: row.effectDurationSeconds,
      suggestedFileName: `${String(row.rowId).padStart(5, "0")}_${safeFileLabel(row.label)}.mp4`
    };
    startSeconds += durationSeconds + interEffectGapSeconds;
    return clip;
  });
}

async function main() {
  const generatedAt = new Date().toISOString();
  const mapPath = join(outputRoot, "vfx-catalog-lab-map.json");
  const map = JSON.parse(await readFile(mapPath, "utf-8"));
  const captureRows = (map.visualeffects ?? [])
    .filter(isCaptureCandidate)
    .map((row) => {
      const capture = classifyCapture(row);
      const interEffectGapSeconds =
        capture.targetMode === "location" ? LOCATION_INTER_EFFECT_GAP_SECONDS : 0;
      return {
        ...row,
        captureMode: capture.captureMode,
        targetMode: capture.targetMode,
        captureReasons: capture.reasons,
        interEffectGapSeconds
      };
    });
  const objectRows = captureRows.filter((row) => captureTargetMode(row) === "object");
  const beamRows = captureRows.filter((row) => captureTargetMode(row) === "beam");
  const locationRows = captureRows.filter((row) => captureTargetMode(row) === "location");
  const objectChunks = chunkRows(objectRows, SEQUENCE_BATCH_SIZE);
  const beamChunks = chunkRows(beamRows, SEQUENCE_BATCH_SIZE);
  const locationChunks = chunkRows(locationRows, SEQUENCE_BATCH_SIZE);

  await cleanGeneratedCaptureScripts();
  await writeFile(join(generatedScriptsDir, "vfxcap_inc.nss"), buildCaptureInclude(), "utf-8");

  const sequences = [];
  for (const [index, rows] of objectChunks.entries()) {
    const scriptName = `${OBJECT_SCRIPT_PREFIX}${String(index).padStart(4, "0")}`;
    await writeFile(
      join(generatedScriptsDir, `${scriptName}.nss`),
      buildSequenceScript(scriptName, rows, "object"),
      "utf-8"
    );
    sequences.push({
      scriptName,
      targetMode: "object",
      firstRow: rows[0]?.rowId ?? null,
      lastRow: rows.at(-1)?.rowId ?? null,
      rowCount: rows.length,
      durationSeconds: buildTimeline(scriptName, rows, "object").at(-1)?.endSeconds ?? 0,
      clips: buildTimeline(scriptName, rows, "object")
    });
  }

  for (const [index, rows] of beamChunks.entries()) {
    const scriptName = `${BEAM_SCRIPT_PREFIX}${String(index).padStart(4, "0")}`;
    await writeFile(
      join(generatedScriptsDir, `${scriptName}.nss`),
      buildSequenceScript(scriptName, rows, "beam"),
      "utf-8"
    );
    sequences.push({
      scriptName,
      targetMode: "beam",
      firstRow: rows[0]?.rowId ?? null,
      lastRow: rows.at(-1)?.rowId ?? null,
      rowCount: rows.length,
      durationSeconds: buildTimeline(scriptName, rows, "beam").at(-1)?.endSeconds ?? 0,
      clips: buildTimeline(scriptName, rows, "beam")
    });
  }

  for (const [index, rows] of locationChunks.entries()) {
    const scriptName = `${LOCATION_SCRIPT_PREFIX}${String(index).padStart(4, "0")}`;
    await writeFile(
      join(generatedScriptsDir, `${scriptName}.nss`),
      buildSequenceScript(scriptName, rows, "location"),
      "utf-8"
    );
    sequences.push({
      scriptName,
      targetMode: "location",
      firstRow: rows[0]?.rowId ?? null,
      lastRow: rows.at(-1)?.rowId ?? null,
      rowCount: rows.length,
      durationSeconds: buildTimeline(scriptName, rows, "location").at(-1)?.endSeconds ?? 0,
      clips: buildTimeline(scriptName, rows, "location")
    });
  }

  const manifest = {
    version: "aurora-vfx-capture-sequences/v1",
    generatedAt,
    repoRoot,
    batchSize: SEQUENCE_BATCH_SIZE,
    rowSource: mapPath,
    namingRule: "00000_LabelFromVisualEffects2da.mp4",
    targetModes: {
      object: "Object-attached visual effects; front/back turntable, head close-up, instant object impacts, or wide large-scene crop.",
      beam: "Beam visual effects; EffectBeam(row, source, BODY_NODE_CHEST) applied to target object.",
      location: "Location/area visual effects; EffectVisualEffect(row) applied at target location."
    },
    counts: {
      captureRows: captureRows.length,
      objectRows: objectRows.length,
      beamRows: beamRows.length,
      locationRows: locationRows.length,
      sequences: sequences.length,
      objectSequences: objectChunks.length,
      beamSequences: beamChunks.length,
      locationSequences: locationChunks.length
    },
    firstObjectScript: objectChunks.length > 0 ? `${OBJECT_SCRIPT_PREFIX}0000` : null,
    firstBeamScript: beamChunks.length > 0 ? `${BEAM_SCRIPT_PREFIX}0000` : null,
    firstLocationScript: locationChunks.length > 0 ? `${LOCATION_SCRIPT_PREFIX}0000` : null,
    sequences
  };

  await writeFile(
    join(outputRoot, "vfx-capture-sequences.json"),
    JSON.stringify(manifest, null, 2),
    "utf-8"
  );
  await writeFile(
    join(outputRoot, "vfx-capture-clips.csv"),
    [
      "scriptName,targetMode,captureMode,sequenceIndex,rowId,label,startSeconds,endSeconds,midpointSeconds,captureWindowSeconds,interEffectGapSeconds,effectDurationSeconds,suggestedFileName,captureReasons",
      ...sequences.flatMap((sequence) =>
        sequence.clips.map((clip) =>
          [
            clip.scriptName,
            clip.targetMode,
            clip.captureMode,
            clip.sequenceIndex,
            clip.rowId,
            `"${String(clip.label).replace(/"/g, '""')}"`,
            clip.startSeconds.toFixed(1),
            clip.endSeconds.toFixed(1),
            clip.midpointSeconds.toFixed(1),
            clip.captureWindowSeconds,
            clip.interEffectGapSeconds,
            clip.effectDurationSeconds,
            clip.suggestedFileName,
            `"${String((clip.captureReasons ?? []).join("; ")).replace(/"/g, '""')}"`
          ].join(",")
        )
      )
    ].join("\n"),
    "utf-8"
  );
  console.log(JSON.stringify({
    version: manifest.version,
    counts: manifest.counts,
    firstObjectScript: manifest.firstObjectScript,
    firstBeamScript: manifest.firstBeamScript,
    firstLocationScript: manifest.firstLocationScript
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
