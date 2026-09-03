#!/usr/bin/env node
// Central read-only IFO entry-location reader. The IFO keys are confirmed by
// local Aurora decompilation; this script does not infer walkability.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const options = parseArgs(process.argv.slice(2));
const modulePath = requiredPath(options.module, "--module");
const inspector = resolve(fileURLToPath(new URL("inspect-area-lighting-module-gff-labels.mjs", import.meta.url)));
const dir = mkdtempSync(join(tmpdir(), "aurora-entry-readback-"));
const reportPath = join(dir, "ifo.json");
try {
  execFileSync(process.execPath, [inspector, "--module", modulePath, "--out", reportPath], { encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  const inspection = JSON.parse(readFileSync(reportPath, "utf8")).inspections?.[0];
  const fields = inspection?.ifo?.rootFields;
  const area = String(fields?.Mod_Entry_Area ?? "").toLowerCase();
  const position = [fields?.Mod_Entry_X, fields?.Mod_Entry_Y, fields?.Mod_Entry_Z];
  if (!area || !position.every(Number.isFinite)) throw new Error("bootstrap_ifo_entry_readback_missing_or_invalid");
  process.stdout.write(`${JSON.stringify({ version: "aurora-toolset-bootstrap-entry-readback/v1", modulePath, moduleSha256: createHash("sha256").update(readFileSync(modulePath)).digest("hex"), area, position, direction: [fields?.Mod_Entry_Dir_X ?? null, fields?.Mod_Entry_Dir_Y ?? null], source: { kind: "serialized_native_ifo", fields: ["Mod_Entry_Area", "Mod_Entry_X", "Mod_Entry_Y", "Mod_Entry_Z", "Mod_Entry_Dir_X", "Mod_Entry_Dir_Y"] } }, null, 2)}\n`);
} finally { rmSync(dir, { recursive: true, force: true }); }
function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 2) { const key = argv[i], value = argv[i + 1]; if (!key?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${key ?? "end"}`); result[key.slice(2)] = value; } return result; }
function requiredPath(value, name) { if (!value) throw new Error(`missing:${name}`); return resolve(value); }
