#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const options = parseArgs(process.argv.slice(2));
const stage = requiredNonNegativeInteger(options.stage, "--stage");
const roadmapPath = resolve(String(options.roadmap ?? "backend/docs/aurora-reverse/aurora-toolset-usage-standards-roadmap-2026-07-14.md"));

try {
  if (!existsSync(roadmapPath)) throw workflowError("AURORA_TOOLSET_ROADMAP_MISSING", roadmapPath);
  const rows = stageRows(readFileSync(roadmapPath, "utf8"), stage);
  if (rows.length === 0) throw workflowError("AURORA_TOOLSET_STAGE_NOT_FOUND", `No roadmap rows found for stage ${stage}.`);
  const incomplete = rows.filter((row) => !row.status.startsWith("TAK"));
  const result = {
    ok: incomplete.length === 0,
    validator: "aurora-toolset-stage-completion/v1",
    stage,
    roadmapPath,
    total: rows.length,
    accepted: rows.length - incomplete.length,
    incomplete,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exitCode = 2;
} catch (error) {
  console.log(JSON.stringify({ ok: false, blockerCode: error?.code ?? "aurora_toolset_stage_completion_exception", message: error instanceof Error ? error.message : String(error) }, null, 2));
  process.exitCode = 2;
}

function stageRows(markdown, stageNumber) {
  const start = new RegExp(`^## Etap ${stageNumber}\\b`, "mu").exec(markdown);
  if (!start) return [];
  const rest = markdown.slice(start.index + start[0].length);
  const section = rest.split(/^## Etap \d+\b/mu, 1)[0];
  return section
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => /^\|\s*AUR-S\d{2}-\d{2}\s*\|/u.test(line))
    .map((line) => {
      const cells = line.split("|").map((cell) => cell.trim());
      return {
        id: cells[1],
        function: cells[2],
        status: (cells.at(-2) ?? "").replaceAll("*", "").trim(),
      };
    });
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) throw workflowError("AURORA_TOOLSET_STAGE_ARGUMENT_INVALID", `Invalid argument near ${key ?? "end"}.`);
    result[key.slice(2)] = value;
  }
  return result;
}

function requiredNonNegativeInteger(value, name) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) throw workflowError("AURORA_TOOLSET_STAGE_ARGUMENT_INVALID", `${name} must be a non-negative integer.`);
  return number;
}

function workflowError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}
