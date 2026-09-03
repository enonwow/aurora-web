#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAuroraModuleProofRunnerPlan,
  validateAuroraModuleProofRunnerConfig,
} from "./lib/aurora-toolset-module-proof-runner-plan.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const options = parseArgs(process.argv.slice(2));
const live = boolean(options.live ?? "false", "--live");
const config = validateAuroraModuleProofRunnerConfig({
  module: options.module ?? "codex_runner_proof",
  area: options.area ?? "proof_area",
  tileset: options.tileset ?? "MicroSet",
  size: options.size ?? "Tiny",
  hak: options.hak ?? "m2a_codex_aproof",
  creature: options.creature ?? "Dwarf Mercenary",
  appearance: options.appearance ?? "M2A_M6_PROOF",
  hardDeadlineMs: options.hardDeadlineMs ?? "240000",
});
const plan = buildAuroraModuleProofRunnerPlan(config);
const moduleFileName = `${config.module}.mod`;
const modulePath = resolve(
  options.modulePath ??
    `C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\${moduleFileName}`,
);
const hakPath = resolve(
  options.hakPath ??
    `C:\\Users\\enonw\\Documents\\Neverwinter Nights\\hak\\${config.hak}.hak`,
);
const artifactDir = resolve(
  options.artifactDir ??
    `.codex-tmp\\aurora-runner\\${config.module}-${new Date().toISOString().replace(/[:.]/gu, "-")}`,
);
const manifestPath = resolve(options.out ?? `${artifactDir}\\manifest.json`);
const appearancePng = resolve(artifactDir, "appearance-readback.png");
const viewportPng = resolve(artifactDir, "toolset-viewport.png");
const startedAt = Date.now();
const stages = [];

if (!live) {
  const result = {
    ok: true,
    mode: "dry-run",
    plan,
    paths: { modulePath, hakPath, artifactDir, manifestPath, appearancePng, viewportPng },
    commands: buildCommandPreview(),
    liveMutationPerformed: false,
  };
  writeManifest(result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exit(0);
}

try {
  stage("preflight", () => {
    if (!existsSync(hakPath) || statSync(hakPath).size <= 0) {
      throw new Error(`hak_file_missing_or_empty:${hakPath}`);
    }
    if (existsSync(modulePath)) throw new Error(`module_destination_already_exists:${modulePath}`);
    return {
      hakPath,
      hakBytes: statSync(hakPath).size,
      moduleDestinationAbsent: true,
    };
  });

  const created = stage("module-and-area", () =>
    runNode(
      "create-aurora-toolset-module-and-area-no-global-input.mjs",
      [
        "--module",
        config.module,
        "--area",
        config.area,
        "--tileset",
        config.tileset,
        "--size",
        config.size,
        "--deadlineMs",
        String(stageRemainingMs("module-and-area")),
        "--modulePath",
        modulePath,
        "--out",
        resolve(artifactDir, "module-and-area.json"),
      ],
      "module-and-area",
    ),
  );

  stage("initial-save", () => {
    if (!existsSync(modulePath) || statSync(modulePath).size <= 0) {
      throw new Error(`wizard_created_module_missing_or_empty:${modulePath}`);
    }
    if (!created.frame?.text?.replace(/\*$/u, "").endsWith(` - ${moduleFileName}`)) {
      throw new Error(`initial_frame_title_mismatch:${created.frame?.text ?? "missing"}`);
    }
    return {
      modulePath,
      moduleBytes: statSync(modulePath).size,
      frameTitle: created.frame.text,
      frameHwnd: created.frame.hwnd,
    };
  });

  stage("hak", () =>
    runNode(
      "attach-aurora-toolset-module-hak-no-global-input.mjs",
      [
        "--module",
        config.module,
        "--hak",
        config.hak,
        "--hakPath",
        hakPath,
        "--timeoutMs",
        String(Math.min(45_000, stageRemainingMs("hak"))),
      ],
      "hak",
    ),
  );

  const viewer = ensureAreaViewer();
  const creature = stage("creature", () =>
    runNode(
      "inspect-aurora-toolset-palette-no-global-input.mjs",
      [
        "--module",
        moduleFileName,
        "--area",
        config.area,
        "--frameHwnd",
        String(viewer.frameHwnd),
        "--category",
        "creature",
        "--selectText",
        config.creature,
        "--placeX",
        String(options.placeX ?? "850"),
        "--placeY",
        String(options.placeY ?? "420"),
        "--restoreSelectObjects",
        "true",
        "--out",
        resolve(artifactDir, "creature-placement.json"),
      ],
      "creature",
    ),
  );
  if (
    creature.action?.selectedText !== config.creature ||
    creature.action?.selectObjectsRestored !== true
  ) {
    throw new Error("creature_placement_readback_failed");
  }

  const context = stage("appearance", () => {
    const popup = runNode(
      "inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs",
      ["--module", moduleFileName, "--objectText", config.creature],
      "appearance",
    );
    const properties = popup.popup?.items?.filter(
      (item) => /^(Properties|Properties\.\.\.)$/u.test(item.text) && item.enabled,
    );
    if (properties?.length !== 1) {
      throw new Error(`expected_one_properties_context_item:${properties?.length ?? 0}`);
    }
    const invoked = runNode(
      "invoke-aurora-toolset-visible-context-menu-owner-command-no-global-input.mjs",
      ["--text", properties[0].text, "--expectedId", String(properties[0].id)],
      "appearance",
    );
    const dialog = waitForCreatureProperties();
    const selected = runNode(
      "select-aurora-toolset-dialog-combo-item-timeout-validated.mjs",
      [
        "--dialogClass",
        "TdlgCreatureEdit",
        "--dialogTitle",
        "Creature Properties",
        "--ordinal",
        "1",
        "--targetText",
        config.appearance,
      ],
      "appearance",
    );
    if (selected.after?.text !== config.appearance) {
      throw new Error(`appearance_readback_mismatch:${selected.after?.text ?? "missing"}`);
    }
    const capture = runNode(
      "capture-aurora-toolset-dialog-no-global-input.mjs",
      [
        "--class",
        "TdlgCreatureEdit",
        "--title",
        "Creature Properties",
        "--out",
        appearancePng,
      ],
      "appearance",
    );
    const committed = runNode(
      "commit-aurora-toolset-creature-properties-no-global-input.mjs",
      [],
      "appearance",
    );
    return { popup, properties: properties[0], invoked, dialog, selected, capture, committed };
  });

  const saved = stage("save-and-readback", () =>
    runNode(
      "save-aurora-toolset-module-no-global-input.mjs",
      [
        "--module",
        moduleFileName,
        "--modulePath",
        modulePath,
        "--timeoutMs",
        String(Math.min(30_000, stageRemainingMs("save-and-readback"))),
      ],
      "save-and-readback",
    ),
  );

  const visual = stage("visual-proof", () =>
    runNode(
      "aurora-toolset-viewport-proof.mjs",
      [
        "capture",
        "--module",
        moduleFileName,
        "--area",
        config.area,
        "--out",
        viewportPng,
        "--resultOut",
        resolve(artifactDir, "viewport-capture.json"),
      ],
      "visual-proof",
    ),
  );

  const result = {
    ok: true,
    mode: "live",
    version: plan.version,
    elapsedMs: Date.now() - startedAt,
    deadlineMs: config.hardDeadlineMs,
    config,
    modulePath,
    hakPath,
    artifacts: {
      manifestPath,
      appearancePng,
      viewportPng,
    },
    stages,
    proof: {
      moduleAndArea: created.proof,
      hakListReadback: stageResult("hak").hakListReadback,
      creature: {
        selectedText: creature.action.selectedText,
        placementMode: creature.action.viewport.placementMode,
        selectObjectsRestored: creature.action.selectObjectsRestored,
      },
      appearance: {
        exactText: context.selected.after.text,
        screenshot: context.capture.pngPath,
      },
      save: saved,
      viewportCapture: visual,
      rainbowPlaceholderRejectedByPolicy: true,
      visualReviewRequired: true,
    },
    safety: {
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouse: false,
      hardDeadlineEnforced: true,
      noSecondToolsetInstance: true,
      noWindowZOrderManipulation: true,
    },
  };
  writeManifest(result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const result = {
    ok: false,
    mode: "live",
    version: plan.version,
    elapsedMs: Date.now() - startedAt,
    deadlineMs: config.hardDeadlineMs,
    config,
    modulePath,
    hakPath,
    artifacts: { manifestPath, appearancePng, viewportPng },
    error: error instanceof Error ? error.message : String(error),
    stages,
    cleanup: {
      toolsetKilledAutomatically: false,
      moduleDeletedAutomatically: false,
      reason: "Preserve responsive session and evidence; fail closed.",
    },
  };
  writeManifest(result);
  process.stderr.write(`${JSON.stringify(result, null, 2)}\n`);
  process.exitCode = 1;
}

function stage(id, action) {
  assertDeadline(id);
  const start = Date.now();
  try {
    const result = action();
    assertDeadline(id);
    stages.push({ id, ok: true, startedAtMs: start - startedAt, elapsedMs: Date.now() - start, result });
    return result;
  } catch (error) {
    stages.push({
      id,
      ok: false,
      startedAtMs: start - startedAt,
      elapsedMs: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

function stageResult(id) {
  return stages.find((entry) => entry.id === id && entry.ok)?.result;
}

function assertDeadline(stageId) {
  const elapsed = Date.now() - startedAt;
  if (elapsed >= config.hardDeadlineMs) {
    throw new Error(`hard_deadline_exceeded:${elapsed}:${config.hardDeadlineMs}`);
  }
  const stagePlan = plan.stages.find((entry) => entry.id === stageId);
  if (stagePlan && elapsed >= stagePlan.deadlineMs) {
    throw new Error(`stage_deadline_exceeded:${stageId}:${elapsed}:${stagePlan.deadlineMs}`);
  }
}

function stageRemainingMs(stageId) {
  const stagePlan = plan.stages.find((entry) => entry.id === stageId);
  const deadline = Math.min(
    config.hardDeadlineMs,
    stagePlan?.deadlineMs ?? config.hardDeadlineMs,
  );
  return Math.max(1_000, deadline - (Date.now() - startedAt));
}

function runNode(script, args, stageId) {
  assertDeadline(stageId);
  const timeout = stageRemainingMs(stageId);
  const output = execFileSync(process.execPath, [resolve(here, script), ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout,
    maxBuffer: 16 * 1024 * 1024,
  });
  return JSON.parse(output.trim());
}

function ensureAreaViewer() {
  const probe = areaViewerProbe();
  if (probe.viewerCount === 1) return probe;
  if (probe.viewerCount !== 0) throw new Error(`unexpected_area_viewer_count:${probe.viewerCount}`);
  runNode(
    "open-aurora-toolset-selected-area-no-global-input.mjs",
    [
      "--module",
      moduleFileName,
      "--areaName",
      config.area,
      "--viewerName",
      config.area,
      "--timeoutMs",
      String(Math.min(30_000, stageRemainingMs("creature"))),
    ],
    "creature",
  );
  const after = areaViewerProbe();
  if (after.viewerCount !== 1) throw new Error(`area_viewer_not_ready:${after.viewerCount}`);
  return after;
}

function areaViewerProbe() {
  const source = String.raw`
$ErrorActionPreference='Stop'
Add-Type @'
using System;using System.Text;using System.Runtime.InteropServices;public static class ARP{public delegate bool E(IntPtr h,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumWindows(E c,IntPtr l);[DllImport("user32.dll")]public static extern bool EnumChildWindows(IntPtr p,E c,IntPtr l);[DllImport("user32.dll")]public static extern bool IsWindowVisible(IntPtr h);[DllImport("user32.dll")]public static extern uint GetWindowThreadProcessId(IntPtr h,out uint p);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetWindowText(IntPtr h,StringBuilder b,int n);[DllImport("user32.dll",CharSet=CharSet.Unicode)]public static extern int GetClassName(IntPtr h,StringBuilder b,int n);}
'@
function T($h){$b=[Text.StringBuilder]::new(1024);[void][ARP]::GetWindowText($h,$b,$b.Capacity);$b.ToString()};function C($h){$b=[Text.StringBuilder]::new(128);[void][ARP]::GetClassName($h,$b,$b.Capacity);$b.ToString()}
$ps=@(Get-Process nwtoolset -ErrorAction SilentlyContinue);if($ps.Count-ne1-or-not$ps[0].Responding){throw 'expected_one_responding_toolset'};[uint32]$pid=$ps[0].Id;$script:f=@();[void][ARP]::EnumWindows([ARP+E]{param($h,$l);[uint32]$p=0;[void][ARP]::GetWindowThreadProcessId($h,[ref]$p);if($p-eq$pid-and[ARP]::IsWindowVisible($h)-and(C $h)-eq'TfrmFrame'-and(T $h).TrimEnd('*').EndsWith(" - $env:M",[StringComparison]::OrdinalIgnoreCase)){$script:f+=$h};$true},[IntPtr]::Zero);if($script:f.Count-ne1){throw "exact_frame_missing:$($script:f.Count)"};$script:v=@();[void][ARP]::EnumChildWindows($script:f[0],[ARP+E]{param($h,$l);if([ARP]::IsWindowVisible($h)-and(C $h)-eq'TfrmViewerArea'-and(T $h).TrimStart('-').Trim()-eq$env:A){$script:v+=$h};$true},[IntPtr]::Zero);[pscustomobject]@{ok=$true;processId=$pid;frameHwnd=$script:f[0].ToInt64();viewerCount=$script:v.Count;viewerHwnd=if($script:v.Count-eq1){$script:v[0].ToInt64()}else{$null}}|ConvertTo-Json -Compress
`;
  const output = execFileSync(
    "powershell.exe",
    ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", source],
    {
      encoding: "utf8",
      windowsHide: true,
      timeout: Math.min(10_000, stageRemainingMs("creature")),
      env: { ...process.env, M: moduleFileName, A: config.area },
    },
  );
  return JSON.parse(output.trim());
}

function waitForCreatureProperties() {
  const deadline = Date.now() + Math.min(8_000, stageRemainingMs("appearance"));
  let lastError = "not_probed";
  while (Date.now() < deadline) {
    try {
      const result = runNode(
        "probe-aurora-toolset-dialog-controls-no-global-input.mjs",
        ["--class", "TdlgCreatureEdit", "--title", "Creature Properties"],
        "appearance",
      );
      const visibleTexts = new Set(result.controls.filter((item) => item.visible).map((item) => item.text));
      if (visibleTexts.has("OK") && result.controls.some((item) => item.visible && item.className === "TComboBox")) {
        return result;
      }
      lastError = `creature_properties_controls_not_ready:${JSON.stringify([...visibleTexts])}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(`creature_properties_wait_timeout:${lastError}`);
}

function buildCommandPreview() {
  return [
    {
      stage: "module-and-area",
      script: "create-aurora-toolset-module-and-area-no-global-input.mjs",
    },
    {
      stage: "hak",
      script: "attach-aurora-toolset-module-hak-no-global-input.mjs",
      exactHak: config.hak,
    },
    {
      stage: "creature",
      script: "inspect-aurora-toolset-palette-no-global-input.mjs",
      exactCreature: config.creature,
    },
    {
      stage: "appearance",
      script: "select-aurora-toolset-dialog-combo-item-timeout-validated.mjs",
      exactAppearance: config.appearance,
    },
    {
      stage: "save-and-readback",
      script: "save-aurora-toolset-module-no-global-input.mjs",
    },
    {
      stage: "visual-proof",
      script: "aurora-toolset-viewport-proof.mjs",
      captureTarget: "validated TScrollBox",
    },
  ];
}

function writeManifest(result) {
  mkdirSync(dirname(manifestPath), { recursive: true });
  writeFileSync(manifestPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error(`Expected --name <value> near ${key ?? "end"}.`);
    }
    result[key.slice(2)] = value;
  }
  return result;
}

function boolean(value, name) {
  if (!/^(true|false)$/iu.test(String(value))) throw new Error(`${name} must be true or false.`);
  return String(value).toLowerCase() === "true";
}
