#!/usr/bin/env node
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const evidence = resolve(root, "backend/docs/aurora-reverse/evidence/npc-stage3-live-2026-07-15");
const prior = resolve(root, "backend/docs/aurora-reverse/evidence/npc-stage3-live-2026-07-14");
const outputIndex = process.argv.indexOf("--out");
const output = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : `${evidence}/stage3-completion/manifest.json`);
const target = { x: 53.23, y: 52.46, tag: "NW_DWARFMERC001" };

const files = {
  identity: `${evidence}/s03-identity-validator.json`,
  factionAfter: `${prior}/s03-02-after-notify-save__s03-02-faction-defender-notify-after-save/raw.git.summary.json`,
  factionRuntime: `${evidence}/s03-faction-runtime-frame.png`,
  conversationRuntime: `${evidence}/s03-runtime-conversation-positive-final.png`,
  scriptSource: `${evidence}/s03_rtprobe.nss`,
  scriptCompile: `${evidence}/s03-runtime-probe-delayed-compile-confirmed.png`,
  inventoryEquipment: `${evidence}/inventory-equipment-dnd/manifest.json`,
  statsClasses: `${evidence}/stats-classes/manifest.json`,
  appearance: `${evidence}/s03-appearance-validator.json`,
  waypoint: `${evidence}/waypoint/manifest.json`,
  runtimeMarkers: `${evidence}/final-runtime-immortal-frames/frame-06.png`,
  positive: `${evidence}/s03-final-runtime-immortal-after-save/demo-source-pack-2026-07-15T150655143Z/raw.git.summary.json`,
  rollback: `${evidence}/s03-stage3-final-clean-rollback/demo-source-pack-2026-07-15T150919024Z/raw.git.summary.json`,
};

const identity = json(files.identity);
const inventoryEquipment = json(files.inventoryEquipment);
const statsClasses = json(files.statsClasses);
const appearance = json(files.appearance);
const waypoint = json(files.waypoint);
const factionAfter = creature(json(files.factionAfter), { x: 60.9686, y: 54.5207, tag: "S3_NPC_ALPHA" });
const positivePack = json(files.positive);
const rollbackPack = json(files.rollback);
const positive = creature(positivePack, target);
const rollback = creature(rollbackPack, target);
const positiveMeta = positive.creatureMetadata ?? {};
const rollbackMeta = rollback.creatureMetadata ?? {};
const source = readFileSync(files.scriptSource, "utf8");
const mainCount = [...source.matchAll(/\bvoid\s+main\s*\(/gu)].length;
const positiveInventory = entries(positiveMeta.inventoryItemListEntries);
const rollbackInventory = entries(rollbackMeta.inventoryItemListEntries);
const positiveEquipment = entries(positiveMeta.equipItemListEntries);
const rollbackEquipment = entries(rollbackMeta.equipItemListEntries);

const functions = {
  "AUR-S03-01": identity.ok === true && same(identity.acceptedFunctions, ["AUR-S03-01"]),
  "AUR-S03-02": Number(factionAfter.creatureMetadata?.factionId) === 4 && image(files.factionRuntime),
  "AUR-S03-03": positiveMeta.conversation === "nw_hen_bod" && image(files.conversationRuntime),
  "AUR-S03-04": mainCount === 1 && positiveMeta["script.scriptheartbeat"] === "s03_rtprobe" && image(files.scriptCompile),
  "AUR-S03-05": inventoryEquipment.ok === true && positiveInventory.some((item) => item.resRef === "s03proofamuletr2") && image(files.runtimeMarkers),
  "AUR-S03-06": inventoryEquipment.ok === true && inventoryEquipment.checks?.equipmentAfterExact === true && inventoryEquipment.checks?.equipmentRollbackExact === true,
  "AUR-S03-07": statsClasses.ok === true,
  "AUR-S03-08": appearance.ok === true && same(appearance.acceptedFunctions, ["AUR-S03-08"]),
  "AUR-S03-09": waypoint.ok === true && image(files.runtimeMarkers),
};

const rollbackChecks = {
  conversationCleared: positiveMeta.conversation === "nw_hen_bod" && (rollbackMeta.conversation == null || rollbackMeta.conversation === ""),
  heartbeatRestored: rollbackMeta["script.scriptheartbeat"] === "nw_c2_default1",
  inventoryRestored: positiveInventory.length === 1 && rollbackInventory.length === 0,
  equipmentRestored: positiveEquipment.length === 2 && rollbackEquipment.length === 2 && same(positiveEquipment, rollbackEquipment),
  immortalRestored: positiveMeta.isImmortal === true && rollbackMeta.isImmortal === false,
  statsAndClassRestored: Number(rollbackMeta.strength) === 15 && same(entries(rollbackMeta.classListEntries), [{ classId: 4, level: 1 }]),
  factionAndAppearanceRestored: Number(rollbackMeta.factionId) === 1 && Number(rollbackMeta.appearanceId) === 249,
  waypointRestored: rollbackPack.objects?.waypoints?.length === 1 && rollbackPack.objects.waypoints[0].tag === "CODEX_WAYPOINT_REDO2",
  testItemAbsentEverywhere: ![...rollbackInventory, ...rollbackEquipment].some((item) => item.resRef === "s03proofamuletr2"),
};

const acceptedFunctions = Object.entries(functions).filter(([, ok]) => ok).map(([id]) => id);
const ok = acceptedFunctions.length === 9 && Object.values(rollbackChecks).every(Boolean);
const report = {
  version: "aurora-toolset-stage3-completion/v1",
  generatedAt: new Date().toISOString(),
  ok,
  stage: 3,
  totalFunctions: 9,
  acceptedFunctions,
  functions,
  runtimeMarkers: ["S03_WAYPOINT_OK", "S03_INVENTORY_OK"],
  rejectedEvidence: {
    path: relative(`${evidence}/final-runtime-frames`),
    reason: "Hostile fixture died before delayed markers; these frames are not accepted as function proof.",
  },
  sourceChecks: { exactlyOneMain: mainCount === 1, mainCount },
  positiveReadback: summarize(positiveMeta),
  rollbackChecks,
  rollbackReadback: summarize(rollbackMeta),
  positiveSourceSha256: positivePack.source?.sha256,
  rollbackSourceSha256: rollbackPack.source?.sha256,
  evidence: Object.fromEntries(Object.entries(files).map(([key, path]) => [key, relative(path)])),
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;

function json(path) { return JSON.parse(readFileSync(path, "utf8")); }
function image(path) { return statSync(path).size > 10_000; }
function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function entries(value) { return value ? JSON.parse(String(value)) : []; }
function creature(pack, expected) {
  const matches = (pack.objects?.creatures ?? []).filter((entry) => entry.x === expected.x && entry.y === expected.y && entry.tag === expected.tag);
  if (matches.length !== 1) throw new Error(`Expected one exact creature ${JSON.stringify(expected)}, got ${matches.length}.`);
  return matches[0];
}
function summarize(meta) {
  return {
    conversation: meta.conversation ?? null,
    heartbeat: meta["script.scriptheartbeat"] ?? null,
    inventoryCount: Number(meta.inventoryItemListCount ?? 0),
    equipmentCount: Number(meta.equipItemListCount ?? 0),
    isImmortal: meta.isImmortal,
    strength: Number(meta.strength),
    classes: entries(meta.classListEntries),
    factionId: Number(meta.factionId),
    appearanceId: Number(meta.appearanceId),
  };
}
function relative(path) { return path.slice(root.length + 1).replaceAll("\\", "/"); }
