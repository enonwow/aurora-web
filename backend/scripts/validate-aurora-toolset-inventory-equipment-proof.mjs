#!/usr/bin/env node
import { readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const paths = Object.fromEntries(
  ["inventoryAfter", "inventoryRollback", "equipmentAfter", "equipmentRollback", "inventoryPng", "equipmentPng", "out"].map((key) => [key, resolve(required(options[key], `--${key}`))]),
);
const target = { x: 53.23, y: 52.46, tag: "NW_DWARFMERC001" };
const itemResRef = "s03proofamuletr2";

const inventoryAfter = creature(paths.inventoryAfter);
const inventoryRollback = creature(paths.inventoryRollback);
const equipmentAfter = creature(paths.equipmentAfter);
const equipmentRollback = creature(paths.equipmentRollback);
const inventoryEntries = entries(inventoryAfter, "inventoryItemListEntries");
const equipmentAfterEntries = entries(equipmentAfter, "equipItemListEntries");
const equipmentRollbackEntries = entries(equipmentRollback, "equipItemListEntries");
const checks = {
  inventoryAfterExact: count(inventoryAfter, "inventoryItemListCount") === 1 && inventoryEntries.length === 1 && inventoryEntries[0]?.resRef === itemResRef,
  inventoryRollbackExact: count(inventoryRollback, "inventoryItemListCount") === 0 && entries(inventoryRollback, "inventoryItemListEntries").length === 0,
  equipmentAfterExact: count(equipmentAfter, "equipItemListCount") === 3 && equipmentAfterEntries.some((entry) => entry.resRef === itemResRef && entry.slotMask === 512),
  equipmentRollbackExact: count(equipmentRollback, "equipItemListCount") === 2 && !equipmentRollbackEntries.some((entry) => entry.resRef === itemResRef),
  baselineEquipmentPreserved: JSON.stringify(equipmentAfterEntries.filter((entry) => entry.resRef !== itemResRef)) === JSON.stringify(equipmentRollbackEntries),
  inventoryScreenshotPresent: statSync(paths.inventoryPng).size > 10_000,
  equipmentScreenshotPresent: statSync(paths.equipmentPng).size > 10_000,
};
const ok = Object.values(checks).every(Boolean);
const report = {
  version: "aurora-toolset-inventory-equipment-proof/v1",
  generatedAt: new Date().toISOString(),
  ok,
  target,
  itemResRef,
  expectedEquipmentSlotMask: 512,
  checks,
  readback: { inventoryAfter: inventoryEntries, inventoryRollbackCount: count(inventoryRollback, "inventoryItemListCount"), equipmentAfter: equipmentAfterEntries, equipmentRollback: equipmentRollbackEntries },
  evidence: paths,
};
writeFileSync(paths.out, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;

function creature(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const matches = (parsed.objects?.creatures ?? []).filter((entry) => entry.x === target.x && entry.y === target.y && entry.tag === target.tag);
  if (matches.length !== 1) throw new Error(`Expected one exact creature in ${path}, got ${matches.length}.`);
  return matches[0];
}
function count(creatureEntry, key) { return Number(creatureEntry.creatureMetadata?.[key] ?? 0); }
function entries(creatureEntry, key) { const raw = creatureEntry.creatureMetadata?.[key]; return raw ? JSON.parse(String(raw)) : []; }
function parseArgs(argv) { const out = {}; for (let i = 0; i < argv.length; i += 2) { const key = argv[i], value = argv[i + 1]; if (!key?.startsWith("--") || value == null) throw new Error(`Expected --name <value> near ${key ?? "end"}.`); out[key.slice(2)] = value; } return out; }
function required(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`${name} is required.`); return text; }
