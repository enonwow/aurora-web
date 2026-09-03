#!/usr/bin/env node
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const evidence = resolve(root, "backend/docs/aurora-reverse/evidence/stage4-live-2026-07-16/s04-04-inventory-placeable");
const outputIndex = process.argv.indexOf("--out");
const output = resolve(outputIndex >= 0 ? process.argv[outputIndex + 1] : `${evidence}/manifest.json`);
const target = { x: 38.24, y: 20.76, tag: "FloorLever1" };

const files = {
  visibleInventory: `${evidence}/04-item-in-inventory-retry-row-target.png`,
  visibleRollback: `${evidence}/05-empty-after-trash-rollback.png`,
  positive: `${evidence}/after-save-with-item/demo-source-pack-2026-07-16T104348598Z/raw.git.summary.json`,
  rollback: `${evidence}/rollback/demo-source-pack-2026-07-16T104527496Z/raw.git.summary.json`,
};

const positivePack = json(files.positive);
const rollbackPack = json(files.rollback);
const positive = placeable(positivePack, target);
const rollback = placeable(rollbackPack, target);
const positiveMeta = positive.placeableMetadata ?? {};
const rollbackMeta = rollback.placeableMetadata ?? {};
const positiveItems = entries(positiveMeta.inventoryItemListEntries);
const rollbackItems = entries(rollbackMeta.inventoryItemListEntries);

const checks = {
  visiblePositive: image(files.visibleInventory),
  positiveHasInventory: positiveMeta.hasInventory === true,
  positiveExactItemCount: Number(positiveMeta.inventoryItemListCount) === 1 && positiveItems.length === 1,
  positiveExactItem: positiveItems[0]?.resRef === "s03proofamuletr2" && positiveItems[0]?.x === 0 && positiveItems[0]?.y === 0,
  visibleRollback: image(files.visibleRollback),
  rollbackHasNoInventory: rollbackMeta.hasInventory === false,
  rollbackExactItemCount: Number(rollbackMeta.inventoryItemListCount ?? 0) === 0 && rollbackItems.length === 0,
  objectIdentityStable: positive.tag === rollback.tag && positive.x === rollback.x && positive.y === rollback.y,
  areaCountsRestored: rollbackPack.counts?.placeables === 3 && rollbackPack.counts?.total === 18,
};

const ok = Object.values(checks).every(Boolean);
const report = {
  version: "aurora-toolset-stage4-placeable-inventory/v1",
  generatedAt: new Date().toISOString(),
  ok,
  acceptedFunctions: ok ? ["AUR-S04-04"] : [],
  target,
  checks,
  rejectedEvidence: {
    path: relative(`${evidence}/02-item-in-inventory.png`),
    reason: "The first drag targeted an empty/non-accepting coordinate and produced no persisted ItemList entry.",
  },
  positiveReadback: {
    hasInventory: positiveMeta.hasInventory,
    inventoryItemListCount: Number(positiveMeta.inventoryItemListCount ?? 0),
    inventoryItemListEntries: positiveItems,
    sourceSha256: positivePack.source?.sha256,
  },
  rollbackReadback: {
    hasInventory: rollbackMeta.hasInventory,
    inventoryItemListCount: Number(rollbackMeta.inventoryItemListCount ?? 0),
    inventoryItemListEntries: rollbackItems,
    sourceSha256: rollbackPack.source?.sha256,
  },
  evidence: Object.fromEntries(Object.entries(files).map(([key, path]) => [key, relative(path)])),
};

mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;

function json(path) { return JSON.parse(readFileSync(path, "utf8")); }
function image(path) { return statSync(path).size > 5_000; }
function entries(value) { return value ? JSON.parse(String(value)) : []; }
function placeable(pack, expected) {
  const matches = (pack.objects?.placeables ?? []).filter((entry) => entry.x === expected.x && entry.y === expected.y && entry.tag === expected.tag);
  if (matches.length !== 1) throw new Error(`Expected one exact placeable ${JSON.stringify(expected)}, got ${matches.length}.`);
  return matches[0];
}
function relative(path) { return path.slice(root.length + 1).replaceAll("\\", "/"); }
