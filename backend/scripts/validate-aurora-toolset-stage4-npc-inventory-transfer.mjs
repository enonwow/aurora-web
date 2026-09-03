#!/usr/bin/env node

import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const evidence = resolve(root, "backend/docs/aurora-reverse/evidence/stage4-live-2026-07-16/s04-03-item-npc-inventory");
const outputIndex = process.argv.indexOf("--out");
const output = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : `${evidence}/manifest.json`);
const target = { x: 60.9686, y: 54.5207, tag: "NW_DWARFMERC001" };
const removedGroundItem = { x: 58.3894, y: 49.8782, templateResRef: "nw_cloth022" };

const files = {
  visiblePositive: `${evidence}/22-transfer-outfit-inventory-positive.png`,
  visibleRollback: `${evidence}/23-rollback-inventory-empty.png`,
  baseline: resolve(root, "backend/docs/aurora-reverse/evidence/stage4-live-2026-07-16/s04-06-flags/final-baseline/demo-source-pack-2026-07-16T135141494Z/raw.git.summary.json"),
  positive: `${evidence}/after-save-positive/demo-source-pack-2026-07-16T143520975Z/raw.git.summary.json`,
  rollback: `${evidence}/rollback/demo-source-pack-2026-07-16T143931518Z/raw.git.summary.json`,
};

const baseline = json(files.baseline);
const positive = json(files.positive);
const rollback = json(files.rollback);
const baselineCreature = creature(baseline, target);
const positiveCreature = creature(positive, target);
const rollbackCreature = creature(rollback, target);
const baselineInventory = inventory(baselineCreature);
const positiveInventory = inventory(positiveCreature);
const rollbackInventory = inventory(rollbackCreature);

const checks = {
  visibleNativeDropPositive: image(files.visiblePositive),
  visibleNativeRollback: image(files.visibleRollback),
  baselineExact: baseline.counts?.items === 3 && baseline.counts?.total === 18 && baselineInventory.length === 0,
  positiveGroundRemovedExactlyOnce: positive.counts?.items === 2 && positive.counts?.total === 17 && !hasGroundItem(positive, removedGroundItem),
  positiveNpcInventoryExact: Number(positiveCreature.creatureMetadata?.inventoryItemListCount) === 1 && same(positiveInventory, [{ resRef: "nw_cloth022", x: 0, y: 0, dropable: false, pickpocketable: false, infinite: false }]),
  transferIdentityExact: removedGroundItem.templateResRef === positiveInventory[0]?.resRef,
  positiveDeltaIsolated: transferDeltaIsolated(baseline, positive, target, removedGroundItem),
  rollbackGroundRestored: rollback.counts?.items === 3 && rollback.counts?.total === 18 && hasGroundItem(rollback, removedGroundItem),
  rollbackNpcInventoryEmpty: Number(rollbackCreature.creatureMetadata?.inventoryItemListCount ?? 0) === 0 && rollbackInventory.length === 0,
  rollbackExact: same(canonicalObjects(baseline.objects), canonicalObjects(rollback.objects)) && same(baseline.counts, rollback.counts),
};

const ok = Object.values(checks).every(Boolean);
const report = {
  version: "aurora-toolset-stage4-npc-inventory-transfer/v1",
  generatedAt: new Date().toISOString(),
  ok,
  acceptedFunctions: ok ? ["AUR-S04-03"] : [],
  target,
  transferredItem: removedGroundItem,
  operation: {
    add: "TdlgInventory.dgBackpackDragDrop through a short-lived version-pinned GUI-thread WNDPROC bridge",
    removeGround: "validated selected Area TTreeView item plus targeted VK_DELETE",
    rollbackGround: "validated native Edit/Undo command 56",
    rollbackInventory: "TdlgInventory.imTrashDragDrop through the same restored GUI-thread bridge",
    globalCursorMouseKeyboardUsed: false,
  },
  checks,
  readback: {
    baseline: summarize(baseline, baselineCreature, baselineInventory),
    positive: summarize(positive, positiveCreature, positiveInventory),
    rollback: summarize(rollback, rollbackCreature, rollbackInventory),
  },
  evidence: Object.fromEntries(Object.entries(files).map(([key, path]) => [key, relative(path)])),
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;

function json(path) { return JSON.parse(readFileSync(path, "utf8")); }
function image(path) { try { return statSync(path).size > 5_000; } catch { return false; } }
function same(left, right) { return JSON.stringify(left) === JSON.stringify(right); }
function inventory(value) { const raw = value.creatureMetadata?.inventoryItemListEntries; return raw ? JSON.parse(String(raw)) : []; }
function creature(pack, expected) { const values = (pack.objects?.creatures ?? []).filter((entry) => entry.x === expected.x && entry.y === expected.y && entry.tag === expected.tag); if (values.length !== 1) throw new Error(`Expected one creature ${JSON.stringify(expected)}, got ${values.length}.`); return values[0]; }
function hasGroundItem(pack, expected) { return (pack.objects?.items ?? []).some((entry) => entry.x === expected.x && entry.y === expected.y && entry.templateResRef === expected.templateResRef); }
function transferDeltaIsolated(beforePack, afterPack, creatureTarget, removedItem) {
  const before = structuredClone(beforePack.objects);
  const after = structuredClone(afterPack.objects);
  before.items = before.items.filter((entry) => !(entry.x === removedItem.x && entry.y === removedItem.y && entry.templateResRef === removedItem.templateResRef));
  const beforeCreature = before.creatures.find((entry) => entry.x === creatureTarget.x && entry.y === creatureTarget.y && entry.tag === creatureTarget.tag);
  const afterCreature = after.creatures.find((entry) => entry.x === creatureTarget.x && entry.y === creatureTarget.y && entry.tag === creatureTarget.tag);
  for (const value of [beforeCreature.creatureMetadata, afterCreature.creatureMetadata]) { delete value.inventoryItemListCount; delete value.inventoryItemListEntries; }
  return same(before, after);
}
function canonicalObjects(value) { const result = structuredClone(value); for (const key of Object.keys(result)) { if (Array.isArray(result[key])) result[key].sort((left, right) => `${left.x ?? ""}|${left.y ?? ""}|${left.z ?? ""}|${left.tag ?? ""}|${left.templateResRef ?? ""}`.localeCompare(`${right.x ?? ""}|${right.y ?? ""}|${right.z ?? ""}|${right.tag ?? ""}|${right.templateResRef ?? ""}`)); } return result; }
function summarize(pack, value, items) { return { sourceSha256: pack.source?.sha256, counts: pack.counts, creature: { x: value.x, y: value.y, tag: value.tag, inventoryCount: Number(value.creatureMetadata?.inventoryItemListCount ?? 0), inventoryItems: items } }; }
function relative(path) { return path.slice(root.length + 1).replaceAll("\\", "/"); }
