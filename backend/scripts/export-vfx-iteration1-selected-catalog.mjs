import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";

const repoRoot = resolve(import.meta.dirname, "..", "..");
const iterationDir = join(repoRoot, ".codex-tmp", "aurora-live-evidence", "vfx-iteration1");
const manifestPath = join(iterationDir, "vfx-iteration1-manifest.csv");
const outputDir = join(iterationDir, "selected-catalog");
const MIN_BYTES = {
  mp4: 8192,
  png: 1024,
  json: 128
};

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let inQuotes = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inQuotes) {
      if (char === '"' && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        value += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value.replace(/\r$/u, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length > 0 || row.length > 0) {
    row.push(value.replace(/\r$/u, ""));
    rows.push(row);
  }
  if (rows.length === 0) {
    return [];
  }
  const headers = rows[0];
  return rows.slice(1).filter((fields) => fields.some((field) => field !== "")).map((fields) =>
    Object.fromEntries(headers.map((header, index) => [header, fields[index] ?? ""]))
  );
}

function safeLabel(label) {
  return String(label || "VFX")
    .replace(/[^A-Za-z0-9_!-]+/gu, "_")
    .replace(/_+/gu, "_")
    .replace(/^_|_$/gu, "")
    .slice(0, 96);
}

async function ready(path, minBytes) {
  if (!path || !existsSync(path)) {
    return false;
  }
  return (await stat(path)).size >= minBytes;
}

function deriveMidPng(bestPng) {
  return String(bestPng || "").replace(/_best\.png$/iu, "_mid.png");
}

async function main() {
  const rows = parseCsv(await readFile(manifestPath, "utf-8"));
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const exported = [];
  const skipped = [];
  for (const row of rows) {
    const rowId = Number(row.rowId);
    const stem = `${String(rowId).padStart(5, "0")}_${safeLabel(row.label)}`;
    const sourceMp4 = row.selectedMp4;
    const sourceJson = row.selectedJson;
    const sourceScreen = deriveMidPng(row.selectedBestPng);
    const fallbackScreen = row.selectedBestPng;

    const mp4Ready = await ready(sourceMp4, MIN_BYTES.mp4);
    const jsonReady = await ready(sourceJson, MIN_BYTES.json);
    const screenPath = (await ready(sourceScreen, MIN_BYTES.png)) ? sourceScreen : fallbackScreen;
    const screenReady = await ready(screenPath, MIN_BYTES.png);
    if (!mp4Ready || !jsonReady || !screenReady) {
      skipped.push({
        rowId,
        label: row.label,
        status: row.status,
        mp4Ready,
        jsonReady,
        screenReady,
        selectedMp4: sourceMp4,
        selectedJson: sourceJson,
        selectedBestPng: row.selectedBestPng
      });
      continue;
    }

    const mp4Name = `${stem}.mp4`;
    const screenName = `${stem}_screen.png`;
    const jsonName = `${stem}.json`;
    await copyFile(sourceMp4, join(outputDir, mp4Name));
    await copyFile(screenPath, join(outputDir, screenName));
    await copyFile(sourceJson, join(outputDir, jsonName));
    exported.push({
      rowId,
      label: row.label,
      status: row.status,
      selectedSource: row.selectedSource,
      mp4: mp4Name,
      screen: screenName,
      json: jsonName,
      sourceMp4,
      sourceScreen: screenPath,
      sourceJson
    });
  }

  const summary = {
    version: "aurora-vfx-iteration1-selected-catalog/v1",
    generatedAt: new Date().toISOString(),
    manifestPath,
    outputDir,
    totalManifestRows: rows.length,
    exportedCount: exported.length,
    skippedCount: skipped.length,
    filesPerExportedRow: ["mp4", "screen.png", "json"]
  };
  await writeFile(join(outputDir, "selected-catalog-summary.json"), JSON.stringify(summary, null, 2), "utf-8");
  await writeFile(join(outputDir, "selected-catalog-index.json"), JSON.stringify({ summary, exported, skipped }, null, 2), "utf-8");
  await writeFile(
    join(outputDir, "README.txt"),
    [
      "Aurora VFX iteration 1 selected catalog",
      "",
      "Each exported row has:",
      "- <rowId>_<effects2daLabel>.mp4",
      "- <rowId>_<effects2daLabel>_screen.png",
      "- <rowId>_<effects2daLabel>.json",
      "",
      "Screens use the capture mid-frame artifact when present, falling back to the best-frame artifact.",
      `Generated from: ${manifestPath}`
    ].join("\n") + "\n",
    "utf-8"
  );

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
