#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_TOOLSET =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights\\bin\\win32\\nwtoolset.exe";
const here = dirname(fileURLToPath(import.meta.url));
const options = parseArgs(process.argv.slice(2));
const config = {
  module: resref(options.module, "--module"),
  area: resref(options.area, "--area"),
  tileset: required(options.tileset ?? "MicroSet", "--tileset"),
  size: required(options.size ?? "Tiny", "--size"),
  toolsetPath: resolve(options.toolsetPath ?? DEFAULT_TOOLSET),
  deadlineMs: positiveInteger(options.deadlineMs ?? "45000", "--deadlineMs"),
  reuseModuleWizard: booleanOption(options.reuseModuleWizard ?? "false", "--reuseModuleWizard"),
  resumeModuleWizardPage: moduleWizardPage(options.resumeModuleWizardPage ?? "name", "--resumeModuleWizardPage"),
  allowUnsavedPostFinish: booleanOption(options.allowUnsavedPostFinish ?? "false", "--allowUnsavedPostFinish"),
};
const modulePath = resolve(
  options.modulePath ??
    `C:\\Users\\enonw\\Documents\\Neverwinter Nights\\modules\\${config.module}.mod`,
);
const outPath = options.out ? resolve(options.out) : null;
const startedAt = Date.now();
const events = [];

if (config.deadlineMs > 60_000) throw new Error("--deadlineMs must not exceed 60000.");
if (!config.reuseModuleWizard && config.resumeModuleWizardPage !== "name") throw new Error("--resumeModuleWizardPage after-name, after-area-name, after-area-finish, or after-module-area-list requires --reuseModuleWizard true.");

try {
  record("preflight", preflight());
  if (!config.reuseModuleWizard) {
    launch();
    record("launch", { toolsetPath: config.toolsetPath });
    await resolveKnownStartupRecovery();

    await waitForDialog("TdlgWelcome", "BioWare Aurora Neverwinter Nights Toolset", {
      requiredControlText: ["Create a new Module", "OK"],
    });
    record(
      "welcome-create-radio",
      runHelper("click-aurora-toolset-dialog-button-no-global-input.mjs", [
        "--dialogClass",
        "TdlgWelcome",
        "--dialogTitle",
        "BioWare Aurora Neverwinter Nights Toolset",
        "--buttonText",
        "Create a new Module",
        "--expectDialogCloses",
        "false",
        "--transport",
        "send-timeout",
      ]),
    );
    record(
      "welcome-ok",
      runHelper("click-aurora-toolset-dialog-button-no-global-input.mjs", [
        "--dialogClass",
        "TdlgWelcome",
        "--dialogTitle",
        "BioWare Aurora Neverwinter Nights Toolset",
        "--buttonText",
        "OK",
        "--expectDialogCloses",
        "true",
        "--transport",
        "post",
      ]),
    );

    await waitForDialog("TdlgModuleWizard", "Module Wizard", {
      requiredControlText: ["&Next >"],
    });
    click("TdlgModuleWizard", "Module Wizard", "&Next >", false);
  } else {
    record("reuse-module-wizard", { processCount: 1, startsToolset: false, expectedPage: config.resumeModuleWizardPage, expectedBlankName: config.resumeModuleWizardPage === "name" });
  }
  if (config.resumeModuleWizardPage === "name") {
    await waitForDialog("TdlgModuleWizard", "Module Wizard", {
      requiredClass: "TEdit",
      requiredControlText: ["&Next >"],
    });
    record(
      "module-name",
      runHelper("set-aurora-toolset-dialog-edit-text-validated.mjs", [
        "--dialogClass",
        "TdlgModuleWizard",
        "--dialogTitle",
        "Module Wizard",
        "--text",
        config.module,
        "--ordinal",
        "0",
        "--expectedBefore",
        config.reuseModuleWizard ? "" : "__UNSET__",
      ]),
    );
    click("TdlgModuleWizard", "Module Wizard", "&Next >", false);
  }

  if (!["after-area-name", "after-area-finish", "after-module-area-list"].includes(config.resumeModuleWizardPage)) {
    const moduleAreaPage = await waitForDialog("TdlgModuleWizard", "Module Wizard", {
      anyControlText: ["Area Wizard", "&Area Wizard"],
    });
    const areaWizardCaption = exactVisibleCaption(moduleAreaPage, ["Area Wizard", "&Area Wizard"]);
    click("TdlgModuleWizard", "Module Wizard", areaWizardCaption, false);
  } else {
    record("reuse-area-wizard", { processCount: 1, startsToolset: false, expectedPage: "after-area-name" });
  }

  if (!["after-area-name", "after-area-finish", "after-module-area-list"].includes(config.resumeModuleWizardPage)) {
    await waitForDialog("TdlgAreaWizard", "Area Wizard", {
      requiredClass: "TEdit",
      requiredControlText: ["&Next >"],
    });
    record(
      "area-name",
      runHelper("set-aurora-toolset-dialog-edit-text-validated.mjs", [
        "--dialogClass",
        "TdlgAreaWizard",
        "--dialogTitle",
        "Area Wizard",
        "--text",
        config.area,
        "--ordinal",
        "0",
      ]),
    );
  }
  if (!["after-area-finish", "after-module-area-list"].includes(config.resumeModuleWizardPage)) {
    record(
      "tileset",
      runHelper("select-aurora-toolset-dialog-list-item-validated.mjs", [
        "--dialogClass",
        "TdlgAreaWizard",
        "--dialogTitle",
        "Area Wizard",
        "--targetText",
        config.tileset,
        "--expectedCount",
        "33",
      ]),
    );
    click("TdlgAreaWizard", "Area Wizard", "&Next >", false);
    await waitForDialog("TdlgAreaWizard", "Area Wizard", {
      requiredClass: "TListBox",
      requiredControlText: ["&Next >"],
    });
    record(
      "size",
      runHelper("select-aurora-toolset-dialog-list-item-validated.mjs", [
        "--dialogClass",
        "TdlgAreaWizard",
        "--dialogTitle",
        "Area Wizard",
        "--targetText",
        config.size,
        "--expectedCount",
        "4",
      ]),
    );
    click("TdlgAreaWizard", "Area Wizard", "&Next >", false);
    await waitForDialog("TdlgAreaWizard", "Area Wizard", {
      requiredControlText: ["Finish", "Open Area in the Area Viewer", "Launch Area Properties Dialog"],
    });
    setCheckbox("Open Area in the Area Viewer", true);
    setCheckbox("Launch Area Properties Dialog", false);
    click("TdlgAreaWizard", "Area Wizard", "Finish", true);
  } else if (config.resumeModuleWizardPage === "after-area-finish") {
    record("reuse-post-area-module-wizard", { processCount: 1, startsToolset: false, expectedPage: "after-area-finish" });
  } else {
    record("reuse-selected-post-area-module-wizard", { processCount: 1, startsToolset: false, expectedPage: "after-module-area-list" });
  }

  const moduleAreaPage = await waitForDialog("TdlgModuleWizard", "Module Wizard", { requiredClass: "TListBox", requiredControlText: ["&Next >"] });
  if (!isEnabled(moduleAreaPage, "&Next >")) throw new Error("module_wizard_area_list_next_not_enabled");
  record("module-area-next", { hwnd: moduleAreaPage.dialogHwnd, nextEnabled: true, resumePage: config.resumeModuleWizardPage });
  click("TdlgModuleWizard", "Module Wizard", "&Next >", false);
  await waitForEnabledControl("TdlgModuleWizard", "Module Wizard", "Finish");
  click("TdlgModuleWizard", "Module Wizard", "Finish", true);

  const settled = await waitForSettledModuleFrame();
  const initialSaveRequired = config.allowUnsavedPostFinish;
  if (!initialSaveRequired && (!existsSync(modulePath) || statSync(modulePath).size <= 0)) {
    throw new Error(`created_module_file_missing_or_empty:${modulePath}`);
  }
  const result = {
    ok: true,
    version: "1.0.0",
    elapsedMs: Date.now() - startedAt,
    config,
    processId: settled.processId,
    frame: settled.frame,
    modulePath,
    moduleBytes: initialSaveRequired ? null : statSync(modulePath).size,
    events,
    proof: {
      welcomeClosed: !config.reuseModuleWizard,
      moduleWizardClosed: true,
      areaWizardClosed: true,
      moduleFrameEnabled: true,
      moduleDirty: settled.frame.text.endsWith("*"),
      moduleFileExists: !initialSaveRequired,
      moduleFileNonEmpty: !initialSaveRequired,
      initialSaveRequired,
    },
    safety: {
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouse: false,
      synchronousCharacterMessages: false,
      staleHwndReuse: false,
      method:
        "bounded state machine; exact dialog/control identity; WM_SETTEXT plus EN_CHANGE; exact list readback; targeted BM_CLICK/PostMessage only",
    },
  };
  writeResult(result);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const failure = {
    ok: false,
    version: "1.0.0",
    elapsedMs: Date.now() - startedAt,
    config,
    error: error instanceof Error ? error.message : String(error),
    events,
    lastWindowState: safeInspect(),
    safety: {
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouse: false,
      processKilledAutomatically: false,
    },
  };
  writeResult(failure);
  process.stderr.write(`${JSON.stringify(failure, null, 2)}\n`);
  process.exitCode = 1;
}

function preflight() {
  if (!existsSync(config.toolsetPath)) throw new Error(`toolset_executable_missing:${config.toolsetPath}`);
  const processCount = processCountOfToolset();
  const expected = config.reuseModuleWizard ? 1 : 0;
  if (processCount !== expected) throw new Error(`preflight_expected_${expected}_toolset_processes:${processCount}`);
  if (existsSync(modulePath)) throw new Error(`module_destination_already_exists:${modulePath}`);
  return { processCount, executableExists: true, reuseModuleWizard: config.reuseModuleWizard, moduleDestinationAbsent: true };
}

function launch() {
  const child = spawn(config.toolsetPath, [], {
    detached: true,
    windowsHide: false,
    stdio: "ignore",
  });
  child.unref();
}

function click(dialogClass, dialogTitle, buttonText, expectCloses) {
  const result = runHelper("click-aurora-toolset-dialog-button-no-global-input.mjs", [
    "--dialogClass",
    dialogClass,
    "--dialogTitle",
    dialogTitle,
    "--buttonText",
    buttonText,
    "--expectDialogCloses",
    String(expectCloses),
    "--transport",
    "post",
  ]);
  return record(`click:${dialogClass}:${buttonText}`, result);
}

function setCheckbox(caption, checked) {
  return record(
    `checkbox:${caption}`,
    runHelper("set-aurora-toolset-dialog-checkbox-validated.mjs", [
      "--dialogClass",
      "TdlgAreaWizard",
      "--dialogTitle",
      "Area Wizard",
      "--checkboxText",
      caption,
      "--checked",
      String(checked),
    ]),
  );
}

async function waitForDialog(className, title, requirements = {}) {
  const deadline = Math.min(startedAt + config.deadlineMs, Date.now() + 10_000);
  let lastError = "not_probed";
  while (Date.now() < deadline) {
    assertWithinDeadline();
    try {
      const probe = runHelper("probe-aurora-toolset-dialog-controls-no-global-input.mjs", [
        "--class",
        className,
        "--title",
        title,
      ]);
      const visible = probe.controls.filter((control) => control.visible);
      const textSet = new Set(visible.map((control) => control.text));
      const classSet = new Set(visible.map((control) => control.className));
      const requiredTextOk = (requirements.requiredControlText ?? []).every((text) => textSet.has(text));
      const anyTextOk =
        !requirements.anyControlText ||
        requirements.anyControlText.some((text) => textSet.has(text));
      const classOk = !requirements.requiredClass || classSet.has(requirements.requiredClass);
      if (requiredTextOk && anyTextOk && classOk) {
        record(`dialog:${className}`, {
          hwnd: probe.dialogHwnd,
          monitor: probe.monitor,
          visibleControlTexts: [...textSet].filter(Boolean),
        });
        return probe;
      }
      lastError = `requirements_not_met:${JSON.stringify({
        requiredControlText: requirements.requiredControlText,
        anyControlText: requirements.anyControlText,
        requiredClass: requirements.requiredClass,
        visibleTexts: [...textSet].filter(Boolean),
        visibleClasses: [...classSet],
      })}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (await resolveKnownStartupRecovery()) {
        lastError = "known_startup_recovery_resolved";
        continue;
      }
      const windowState = safeInspect();
      const fatal = windowState?.windows?.find(
        (window) =>
          window.className === "#32770" &&
          /access violation|cannot focus a disabled or invisible window|recover|improper/i.test(window.text),
      );
      if (fatal) throw new Error(`fatal_modal_before_${className}:${fatal.text}`);
    }
    await sleep(100);
  }
  throw new Error(`dialog_wait_timeout:${className}:${title}:${lastError}`);
}

async function resolveKnownStartupRecovery() {
  const windowState = safeInspect();
  const candidates = (windowState?.windows ?? []).filter(
    (window) => window.className === "#32770" && window.text === "Confirmation",
  );
  if (candidates.length === 0) return false;
  if (candidates.length !== 1) {
    throw new Error(`startup_recovery_dialog_ambiguous:${JSON.stringify(candidates)}`);
  }

  const probe = runHelper("probe-aurora-toolset-dialog-controls-no-global-input.mjs", [
    "--class",
    "#32770",
    "--title",
    "Confirmation",
  ]);
  const expectedText = "The toolset did not close properly last time it was used.\nA module was found, would you like to try to recover it?\nPressing 'No' will destroy the backup.";
  const visible = probe.controls.filter((control) => control.visible);
  const messages = visible.filter((control) => control.className === "Static" && control.text === expectedText);
  const affirmativeCandidates = visible.filter(
    (control) => control.className === "Button" && ["&Tak", "&Yes", "Tak", "Yes"].includes(control.text),
  );
  const negativeCandidates = visible.filter(
    (control) => control.className === "Button" && ["&Nie", "&No", "Nie", "No"].includes(control.text),
  );
  if (messages.length !== 1 || affirmativeCandidates.length !== 1 || negativeCandidates.length !== 1) {
    throw new Error(`startup_recovery_prompt_unrecognized:${JSON.stringify({ messages, affirmativeCandidates, negativeCandidates })}`);
  }
  const affirmative = affirmativeCandidates[0].text;
  const result = runHelper("click-aurora-toolset-dialog-button-no-global-input.mjs", [
    "--dialogClass",
    "#32770",
    "--dialogTitle",
    "Confirmation",
    "--buttonText",
    affirmative,
    "--expectDialogCloses",
    "true",
    "--transport",
    "post",
  ]);
  record("startup-recovery", { dialogHwnd: probe.dialogHwnd, buttonText: affirmative, result });
  await sleep(100);
  return true;
}

async function waitForSettledModuleFrame() {
  const deadline = Math.min(startedAt + config.deadlineMs, Date.now() + 10_000);
  let last = null;
  while (Date.now() < deadline) {
    assertWithinDeadline();
    last = safeInspect();
    const frames = (last?.windows ?? []).filter((window) => {
      if (window.className !== "TfrmFrame") return false;
      if (config.allowUnsavedPostFinish) {
        return window.text === "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17*";
      }
      return normalizeFrameTitle(window.text).endsWith(` - ${config.module}`);
    });
    const modals = (last?.windows ?? []).filter(
      (window) => !["TfrmFrame", "TApplication"].includes(window.className),
    );
    if (last?.responding && frames.length === 1 && modals.length === 0) {
      return { processId: last.processId, frame: frames[0] };
    }
    await sleep(100);
  }
  throw new Error(`module_frame_not_settled:${JSON.stringify(last)}`);
}

function runHelper(name, args) {
  assertWithinDeadline();
  const remaining = Math.max(1_000, startedAt + config.deadlineMs - Date.now());
  const output = execFileSync(process.execPath, [resolve(here, name), ...args], {
    encoding: "utf8",
    windowsHide: true,
    timeout: Math.min(30_000, remaining),
    maxBuffer: 8 * 1024 * 1024,
  });
  return JSON.parse(output.trim());
}

function safeInspect() {
  try {
    return runHelper("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

function processCountOfToolset() {
  const output = execFileSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "@(Get-Process nwtoolset -ErrorAction SilentlyContinue).Count",
    ],
    { encoding: "utf8", windowsHide: true, timeout: 5_000 },
  );
  return Number(output.trim());
}

function record(stage, data) {
  events.push({ stage, atMs: Date.now() - startedAt, data });
  return data;
}

function exactVisibleCaption(probe, candidates) {
  const found = probe.controls
    .filter((control) => control.visible && candidates.includes(control.text))
    .map((control) => control.text);
  if (found.length !== 1) throw new Error(`expected_one_exact_caption:${JSON.stringify(found)}`);
  return found[0];
}

function isEnabled(probe, caption) {
  const found = probe.controls.filter((control) => control.visible && control.text === caption);
  return found.length === 1 && found[0].enabled === true;
}

async function waitForEnabledControl(className, title, caption) {
  const deadline = Math.min(startedAt + config.deadlineMs, Date.now() + 10_000);
  let last = "not_probed";
  while (Date.now() < deadline) {
    assertWithinDeadline();
    const probe = await waitForDialog(className, title, { requiredControlText: [caption] });
    if (isEnabled(probe, caption)) {
      record(`enabled:${className}:${caption}`, { hwnd: probe.dialogHwnd, caption, enabled: true });
      return probe;
    }
    last = `control_disabled:${caption}`;
    await sleep(100);
  }
  throw new Error(`enabled_control_wait_timeout:${className}:${title}:${caption}:${last}`);
}

function normalizeFrameTitle(title) {
  return String(title ?? "").replace(/\*$/u, "").replace(/\.mod$/iu, "");
}

function assertWithinDeadline() {
  if (Date.now() - startedAt >= config.deadlineMs) {
    throw new Error(`module_and_area_deadline_exceeded:${config.deadlineMs}`);
  }
}

function writeResult(result) {
  if (!outPath) return;
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
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

function required(value, name) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

function resref(value, name) {
  const result = required(value, name);
  if (!/^[a-z0-9_]{1,32}$/iu.test(result)) {
    throw new Error(`${name} must be a 1-32 character Aurora resref.`);
  }
  return result;
}

function positiveInteger(value, name) {
  const result = Number(value);
  if (!Number.isInteger(result) || result <= 0) throw new Error(`${name} must be a positive integer.`);
  return result;
}

function booleanOption(value, name) {
  if (value === true || String(value).toLowerCase() === "true") return true;
  if (value === false || String(value).toLowerCase() === "false") return false;
  throw new Error(`${name} must be true or false.`);
}

function moduleWizardPage(value, name) {
  if (["name", "after-name", "after-area-name", "after-area-finish", "after-module-area-list"].includes(String(value))) return String(value);
  throw new Error(`${name} must be name, after-name, after-area-name, after-area-finish, or after-module-area-list.`);
}
