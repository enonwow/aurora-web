#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildToolsetLaunchSafetyGate } from "./lib/toolset-open-safety.mjs";
import {
  buildToolsetStartupLoadPlan,
  DEFAULT_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS,
  isApprovedToolsetProofWindowLeft,
  TOOLSET_APPROVED_PROOF_WINDOW_LEFT,
} from "./lib/toolset-startup-load-plan.mjs";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(scriptDir, "..");
const artifactRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area"
);
const areaOpenerPath = resolve(scriptDir, "open-last-city-area-toolset-no-global-input.mjs");
const criticalFailureRegistryPath = resolve(artifactRoot, "toolset-critical-failures.json");
const moduleOpenSessionGuardPath = resolve(artifactRoot, "toolset-module-open-session-guard.json");

const defaultToolsetExe =
  "C:\\Program Files (x86)\\Steam\\steamapps\\common\\Neverwinter Nights\\bin\\win32\\nwtoolset.exe";
const defaultModulePath =
  findDefaultLastCityModulePath();

const options = parseArgs(process.argv.slice(2));
const toolsetExe = options.toolsetExe ?? process.env.AURORA_TOOLSET_EXE ?? defaultToolsetExe;
const modulePath = resolve(
  options.modulePath ?? process.env.AURORA_TOOLSET_MODULE_PATH ?? defaultModulePath
);
const expectedModulePartsSource =
  options.expectedModuleParts ??
  process.env.AURORA_TOOLSET_EXPECTED_MODULE_PARTS ??
  basename(modulePath, ".mod");
const expectedModuleParts = String(expectedModulePartsSource)
  .split("|")
  .map((part) => part.trim())
  .filter(Boolean);
const expectedAreaName =
  options.areaName ??
  process.env.AURORA_TOOLSET_EXPECTED_AREA_NAME ??
  "Ostatnie Miasto - Port, Mieszkanie Kartografa";
const expectedAreaResref = options.area ?? process.env.AURORA_TOOLSET_EXPECTED_AREA ?? "cdx_mapflat01";
const skipAreaOpen = booleanOption(options.skipAreaOpen, process.env.AURORA_TOOLSET_SKIP_AREA_OPEN === "1");
const moduleOpenTimeoutMs = integerFromOption(
  options.moduleOpenTimeoutMs,
  "AURORA_TOOLSET_MODULE_OPEN_TIMEOUT_MS",
  240_000
);
const areaOpenTimeoutMs = integerFromOption(
  options.areaOpenTimeoutMs,
  "AURORA_TOOLSET_AREA_OPEN_TIMEOUT_MS",
  60_000
);
const startupPassiveObservationMs = nonNegativeIntegerFromOption(
  options.startupPassiveObservationMs,
  "AURORA_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS",
  DEFAULT_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS
);
// On this workstation DISPLAY1 is the dedicated proof monitor at X=-1920;
// X=0 is the user's primary display.  Never let automation stage Toolset there.
const safeProofWindowLeft = TOOLSET_APPROVED_PROOF_WINDOW_LEFT;
const targetWindowLeft = signedIntegerFromOption(
  options.windowLeft,
  "AURORA_TOOLSET_WINDOW_LEFT",
  safeProofWindowLeft
);
const targetWindowTop = signedIntegerFromOption(options.windowTop, "AURORA_TOOLSET_WINDOW_TOP", 0);
const requireCleanStart = !booleanOption(
  options.allowExistingToolset,
  process.env.AURORA_TOOLSET_REQUIRE_CLEAN_START === "0"
);
const preflightOnly = booleanOption(options.preflightOnly, process.env.AURORA_TOOLSET_PREFLIGHT_ONLY === "1");
const canonicalSessionEntrypoint =
  process.env.AURORA_TOOLSET_CANONICAL_SESSION_ENTRYPOINT === "1";
const allowReuseOpenSession = booleanOption(
  options.allowReuseOpenSession,
  process.env.AURORA_TOOLSET_ALLOW_REUSE_OPEN_SESSION === "1"
);
const allowRepeatedAccessViolationFamily = booleanOption(
  options.allowRepeatedAccessViolationFamily,
  process.env.AURORA_TOOLSET_ALLOW_REPEATED_AV_FAMILY === "1"
);
const allowFullModuleConceptTilemapTarget = booleanOption(
  options.allowFullModuleConceptTilemapTarget,
  process.env.AURORA_LAST_CITY_ALLOW_FULL_MODULE_CONCEPT_TILEMAP_TARGET === "1"
);
const allowFullLastCityDirectOpen = booleanOption(
  options.allowFullLastCityDirectOpen,
  process.env.AURORA_TOOLSET_ALLOW_FULL_LAST_CITY_DIRECT_OPEN === "1"
);
const allowQuarantinedModuleRetry = booleanOption(
  options.allowQuarantinedModuleRetry,
  process.env.AURORA_TOOLSET_ALLOW_QUARANTINED_MODULE_RETRY === "1"
);
const allowVerifiedTemp0Cache = booleanOption(
  options.allowVerifiedTemp0Cache,
  process.env.AURORA_TOOLSET_ALLOW_VERIFIED_TEMP0_CACHE === "1"
);
const allowForceToolsetRestart = booleanOption(
  options.allowForceToolsetRestart,
  process.env.AURORA_TOOLSET_ALLOW_FORCE_RESTART === "1"
);
const allowSecondToolsetStart = booleanOption(
  options.allowSecondToolsetStart,
  process.env.AURORA_TOOLSET_ALLOW_SECOND_TOOLSET_START === "1"
);
const unsafeToolsetOverrides = [
  ...(allowRepeatedAccessViolationFamily ? ["allowRepeatedAccessViolationFamily"] : []),
  ...(allowFullModuleConceptTilemapTarget ? ["allowFullModuleConceptTilemapTarget"] : []),
  ...(allowFullLastCityDirectOpen ? ["allowFullLastCityDirectOpen"] : []),
  ...(allowQuarantinedModuleRetry ? ["allowQuarantinedModuleRetry"] : []),
  ...(allowVerifiedTemp0Cache ? ["allowVerifiedTemp0Cache"] : []),
  ...(allowForceToolsetRestart ? ["allowForceToolsetRestart"] : []),
  ...(allowSecondToolsetStart ? ["allowSecondToolsetStart"] : []),
  ...(!requireCleanStart ? ["allowExistingToolset"] : []),
  ...(allowReuseOpenSession ? ["allowReuseOpenSession"] : [])
];
const approvedLastCitySha256 = "B774037F160A9BE3FCC0E985DDE880A0AE97E10AF2BF868C38A3F6573CBB021E";
const moduleSha256 = existsSync(modulePath)
  ? createHash("sha256").update(readFileSync(modulePath)).digest("hex").toUpperCase()
  : null;
const canonicalPinnedLastCityProbe = Boolean(
  requireCleanStart &&
    basename(modulePath).toLowerCase() === "the_last_city - codex.mod" &&
    moduleSha256 === approvedLastCitySha256 &&
    (preflightOnly || canonicalSessionEntrypoint),
);
if (!isApprovedToolsetProofWindowLeft(targetWindowLeft)) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "toolset_primary_display_target_rejected",
        safety: {
          method:
            "refuse to stage or launch Toolset outside the dedicated left monitor; this workstation's approved proof origin is X=-1920",
          requestedWindowPosition: { left: targetWindowLeft, top: targetWindowTop },
          approvedProofWindowLeft: safeProofWindowLeft
        },
        hint: "Use --windowLeft -1920 for the dedicated proof monitor."
      },
      null,
      2
    )
  );
  process.exit(2);
}
if (unsafeToolsetOverrides.length > 0) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "toolset_unsafe_override_rejected",
        safety: {
          method:
            "fail closed: a known Access Violation, quarantined module, stale temp0, or full-module target cannot be bypassed by an automation flag",
          rejectedOverrides: unsafeToolsetOverrides
        },
        hint:
          "Do offline root-cause isolation or provide a user-captured proof. This entrypoint never retries a known Toolset failure family."
      },
      null,
      2
    )
  );
  process.exit(2);
}
if (!preflightOnly && !canonicalSessionEntrypoint) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "toolset_noncanonical_entrypoint_rejected",
        safety: {
          method:
            "live Toolset open is owned exclusively by backend/scripts/aurora-toolset-session.mjs"
        },
        hint: "Use npm run areas:toolset-session. Direct opener and legacy wrapper execution are disabled."
      },
      null,
      2
    )
  );
  process.exit(2);
}
if (startupPassiveObservationMs < DEFAULT_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "toolset_startup_observation_too_short",
        safety: {
          requestedMs: startupPassiveObservationMs,
          minimumMs: DEFAULT_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS,
          method: "fail closed before launch when passive startup observation is shortened"
        }
      },
      null,
      2
    )
  );
  process.exit(2);
}
const isApprovedQuarantinedRetryTarget =
  canonicalPinnedLastCityProbe;
const isApprovedVerifiedTemp0CacheTarget =
  basename(modulePath).toLowerCase() === "the_last_city - codex.mod" &&
  allowVerifiedTemp0Cache &&
  requireCleanStart;
const conceptTilemapLabMaxBytes = 10 * 1024 * 1024;

const launchSafetyGate = buildToolsetLaunchSafetyGate({
  modulePath,
  criticalFailureRegistryPath,
  allowFullModuleConceptTilemapTarget,
  allowFullLastCityDirectOpen: canonicalPinnedLastCityProbe,
  allowQuarantinedModuleRetry: isApprovedQuarantinedRetryTarget,
  conceptTilemapLabMaxBytes
});
if (launchSafetyGate.ok !== true) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: launchSafetyGate.blockerCode,
        blockers: launchSafetyGate.blockers,
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method: "read-only shared Toolset launch safety gate before any Toolset command"
        },
        requireCleanStart,
        preflightOnly,
        modulePath,
        launchSafetyGate,
        candidateQuarantine: launchSafetyGate.candidateQuarantine,
        fullSizeConceptTilemapTarget: launchSafetyGate.fullSizeConceptTilemapTarget,
        fullLastCityModuleTarget: launchSafetyGate.fullLastCityModuleTarget,
        hint:
          "Do not open this module automatically. Use a focused lab/clean candidate, ingest an existing screenshot, or set an explicit supervised override only for a manual investigation."
      },
      null,
      2
    )
  );
  process.exit(2);
}

const fullSizeConceptTilemapTarget = findFullSizeConceptTilemapTarget(modulePath);
if (fullSizeConceptTilemapTarget && !allowFullModuleConceptTilemapTarget) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "generated_lab_module_too_large_full_module_target",
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method: "read-only module-size guard before any Toolset command"
        },
        requireCleanStart,
        preflightOnly,
        modulePath,
        fullSizeConceptTilemapTarget,
        hint:
          "Concept tilemap proof modules must be small lab modules. Copy from a known-good small lab baseline, not from the full Last City module."
      },
      null,
      2
    )
  );
  process.exit(2);
}

const candidateQuarantine = findCriticalFailureForModule(modulePath);
if (candidateQuarantine && !isApprovedQuarantinedRetryTarget) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "candidate_quarantined_after_toolset_critical_failure",
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method: "read-only candidate quarantine check before any Toolset command"
        },
        requireCleanStart,
        preflightOnly,
        modulePath,
        candidateQuarantine,
        isApprovedQuarantinedRetryTarget,
        hint:
          "Do not reopen a candidate that hit Toolset access violation. Build from a clean backup or new candidate and run the full dry preflight."
      },
      null,
      2
    )
  );
  process.exit(2);
}
const repeatedCriticalFailureFamily = findRepeatedCriticalFailureFamily(modulePath, expectedAreaResref);
if (repeatedCriticalFailureFamily && !canonicalPinnedLastCityProbe) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "repeated_area_toolset_access_violation_family",
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method: "read-only critical-failure family check before any Toolset command"
        },
        requireCleanStart,
        preflightOnly,
        modulePath,
        repeatedCriticalFailureFamily,
        hint:
          "Do not launch another generated concept tilemap lab from this family until the crash pattern has an offline root-cause gate or an explicitly approved clean backup strategy."
      },
      null,
      2
    )
  );
  process.exit(2);
}

const existingToolsetProcesses = listToolsetProcesses();
const quarantinedExistingToolsetWindow = findQuarantinedToolsetProcessWindow(existingToolsetProcesses);
if (quarantinedExistingToolsetWindow) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "toolset_existing_window_quarantined_candidate",
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method:
            "read-only process/title preflight; refuse to attach to a Toolset window for a quarantined module"
        },
        requireCleanStart,
        quarantinedExistingToolsetWindow,
        existingToolsetProcesses,
        hint:
          "Do not continue a Toolset session that has a rejected module in the window title. Run cleanup-aurora-toolset-critical-stop.mjs and generate a fresh candidate basename from a known-good base."
      },
      null,
      2
    )
  );
  process.exit(2);
}
if (requireCleanStart && existingToolsetProcesses.length > 0) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "toolset_existing_process_requires_clean_start",
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method: "read-only process preflight; refuse to attach to an existing Toolset session"
        },
        requireCleanStart,
        existingToolsetProcesses,
        hint:
          "Close Toolset cleanly or run cleanup-aurora-toolset-critical-stop.mjs after a critical state. Set AURORA_TOOLSET_REQUIRE_CLEAN_START=0 only for an explicitly supervised existing-session proof."
      },
      null,
      2
    )
  );
  process.exit(2);
}
const temp0Status = getToolsetTemp0Status();
const canUseVerifiedTemp0Cache =
  isApprovedVerifiedTemp0CacheTarget && temp0Status.moduleIfoExists === true;
if (requireCleanStart && temp0Status.exists && !canUseVerifiedTemp0Cache) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: "toolset_temp0_requires_clean_start",
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method: "read-only temp0 preflight; refuse to launch Toolset with stale recovery workspace"
        },
        requireCleanStart,
        temp0: temp0Status,
        canUseVerifiedTemp0Cache,
        hint:
          "Run cleanup-aurora-toolset-critical-stop.mjs only after a critical Toolset state, or manually clear/inspect temp0 before a clean proof."
      },
      null,
      2
    )
  );
  process.exit(2);
}
if (preflightOnly) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        preflightOnly,
        blockerCode: null,
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method: "read-only preflight only; Toolset is not launched and MRU is not staged"
        },
        requireCleanStart,
        allowRepeatedAccessViolationFamily,
        canUseVerifiedTemp0Cache,
        existingToolsetProcesses,
        temp0: temp0Status,
        modulePath,
        expectedModuleParts,
        expectedAreaResref,
        expectedAreaName,
        repeatedCriticalFailureFamily,
        requiresRepeatedAccessViolationFamilyOverride: Boolean(
          repeatedCriticalFailureFamily && allowRepeatedAccessViolationFamily
        )
      },
      null,
      2
    )
  );
  process.exit(0);
}

let moduleOpenSessionGuard = createModuleOpenSessionGuard({
  modulePath,
  expectedModuleParts,
  expectedAreaResref,
  expectedAreaName,
  existingToolsetProcesses,
  allowReuseOpenSession,
  timeoutMs: moduleOpenTimeoutMs
});
if (moduleOpenSessionGuard.ok !== true) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: moduleOpenSessionGuard.blockerCode,
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method:
            "persistent single-open guard before any Toolset command; refuse a second module-open run while a prior Toolset session is alive or still settling before Windows exposes the process"
        },
        requireCleanStart,
        preflightOnly,
        allowReuseOpenSession,
        modulePath,
        expectedModuleParts,
        expectedAreaResref,
        expectedAreaName,
        moduleOpenSessionGuard,
        hint:
          "Do not run the opener again after a module-open action. Use readonly capture/area tools against the loaded window, or close Toolset and clear the critical state first."
      },
      null,
      2
    )
  );
  process.exit(2);
}

const preflightUnsafeModal = detectToolsetAccessViolation();
const iniStaging = preflightUnsafeModal.detected
  ? { ok: false, skipped: true, reason: "unsafe_modal_preflight" }
  : stageToolsetWindowPosition(
      modulePath,
      { left: targetWindowLeft, top: targetWindowTop },
      { apply: !preflightOnly }
    );
const startupLoadPlan = buildToolsetStartupLoadPlan({
  modulePath,
  currentMru0: iniStaging.currentMru0,
  passiveObservationMs: startupPassiveObservationMs,
});
if (preflightUnsafeModal.detected) {
  console.log(
    JSON.stringify(
      {
        ok: false,
        blockerCode: preflightUnsafeModal.blockerCode ?? "toolset_unsafe_modal",
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method: "read-only modal preflight before any Toolset command"
        },
        iniStaging,
        moduleOpen: null,
        accessViolation: preflightUnsafeModal
      },
      null,
      2
    )
  );
  process.exit(2);
}

const moduleOpen = ensureModuleLoaded(startupLoadPlan);
if (!moduleOpen.ok) {
  moduleOpenSessionGuard = updateModuleOpenSessionGuard(moduleOpenSessionGuard, {
    state: "module_open_failed",
    blockerCode: moduleOpen.blockerCode ?? "module_open_failed",
    moduleOpenActionSubmitted: moduleOpen.moduleOpenActionSubmitted ?? null,
    moduleOpenActionKind: moduleOpen.moduleOpenActionKind ?? null
  });
  const criticalFailureRecord =
    moduleOpen.blockerCode === "toolset_access_violation_modal"
      ? recordCriticalFailure(moduleOpen.blockerCode, moduleOpen)
      : null;
  console.log(
    JSON.stringify(
      { ...moduleOpen, iniStaging, startupLoadPlan, moduleOpenSessionGuard, criticalFailureRecord },
      null,
      2,
    ),
  );
  process.exitCode = 2;
} else if (skipAreaOpen) {
  const postModuleOpenUnsafeModal = waitForToolsetUnsafeModalAfterSettle(0);
  const ok = postModuleOpenUnsafeModal.detected !== true;
  moduleOpenSessionGuard = updateModuleOpenSessionGuard(moduleOpenSessionGuard, {
    state: ok ? "module_loaded_skip_area_open" : "module_loaded_then_unsafe_modal",
    blockerCode: ok ? null : postModuleOpenUnsafeModal.blockerCode ?? "toolset_unsafe_modal_after_module_open",
    moduleWindowTitle: moduleOpen.moduleWindowTitle ?? null,
    moduleWindowHwnd: moduleOpen.moduleWindowHwnd ?? null,
    moduleOpenActionSubmitted: moduleOpen.moduleOpenActionSubmitted ?? null,
    moduleOpenActionKind: moduleOpen.moduleOpenActionKind ?? null
  });
  const criticalFailureRecord = postModuleOpenUnsafeModal.detected
    ? recordCriticalFailure(
        postModuleOpenUnsafeModal.blockerCode ?? "toolset_unsafe_modal_after_module_open",
        postModuleOpenUnsafeModal
      )
    : null;
  console.log(
    JSON.stringify(
      {
        ok,
        blockerCode: ok
          ? undefined
          : postModuleOpenUnsafeModal.blockerCode ?? "toolset_unsafe_modal_after_module_open",
        skippedAreaOpen: true,
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
          method:
            "visible Toolset process discovery and targeted welcome/module-open controls only"
        },
        iniStaging,
        moduleOpen,
        moduleOpenSessionGuard,
        accessViolation: postModuleOpenUnsafeModal,
        criticalFailureRecord
      },
      null,
      2
    )
  );
  if (!ok) {
    process.exitCode = 2;
  }
} else {
  const preAreaOpenUnsafeModal = waitForToolsetUnsafeModalAfterSettle(0);
  if (preAreaOpenUnsafeModal.detected) {
    moduleOpenSessionGuard = updateModuleOpenSessionGuard(moduleOpenSessionGuard, {
      state: "module_loaded_then_unsafe_modal_before_area_open",
      blockerCode: preAreaOpenUnsafeModal.blockerCode ?? "toolset_unsafe_modal_before_area_open",
      moduleWindowTitle: moduleOpen.moduleWindowTitle ?? null,
      moduleWindowHwnd: moduleOpen.moduleWindowHwnd ?? null,
      moduleOpenActionSubmitted: moduleOpen.moduleOpenActionSubmitted ?? null,
      moduleOpenActionKind: moduleOpen.moduleOpenActionKind ?? null
    });
    const criticalFailureRecord =
      preAreaOpenUnsafeModal.blockerCode === "toolset_access_violation_modal"
        ? recordCriticalFailure(preAreaOpenUnsafeModal.blockerCode, preAreaOpenUnsafeModal)
        : null;
    console.log(
      JSON.stringify(
        {
          ok: false,
          blockerCode: preAreaOpenUnsafeModal.blockerCode ?? "toolset_unsafe_modal_before_area_open",
          safety: {
            usesGlobalCursor: false,
            usesGlobalKeyboard: false,
            usesGlobalMouseWheel: false,
            usesGlobalDrag: false,
            method:
              "module frame loaded, then read-only modal settle probe before any area-open command"
          },
          iniStaging,
          moduleOpen,
          moduleOpenSessionGuard,
          areaOpen: {
            ok: false,
            skipped: true,
            reason: "unsafe_modal_before_area_open"
          },
          accessViolation: preAreaOpenUnsafeModal,
          criticalFailureRecord
        },
        null,
        2
      )
    );
    process.exitCode = 2;
  } else {
    const areaOpen = runAreaOpenChild();
    // TreeView can acknowledge the area before Toolset presents its delayed critical progress modal.
    const accessViolation = waitForToolsetUnsafeModalAfterSettle(0);
    const ok = areaOpen.ok === true && accessViolation.detected !== true;
    moduleOpenSessionGuard = updateModuleOpenSessionGuard(moduleOpenSessionGuard, {
      state: ok ? "module_and_area_opened" : "module_or_area_open_failed",
      blockerCode: ok ? null : accessViolation.blockerCode ?? areaOpen.blockerCode ?? "module_or_area_open_failed",
      moduleWindowTitle: moduleOpen.moduleWindowTitle ?? null,
      moduleWindowHwnd: moduleOpen.moduleWindowHwnd ?? null,
      moduleOpenActionSubmitted: moduleOpen.moduleOpenActionSubmitted ?? null,
      moduleOpenActionKind: moduleOpen.moduleOpenActionKind ?? null,
      areaOpenOk: areaOpen.ok === true
    });
    const criticalFailureRecord = accessViolation.detected
      ? recordCriticalFailure(accessViolation.blockerCode ?? "toolset_access_violation_modal", accessViolation)
      : null;
    console.log(
      JSON.stringify(
        {
          ok,
          blockerCode: accessViolation.detected
            ? accessViolation.blockerCode ?? "toolset_access_violation_modal"
            : undefined,
          safety: {
            usesGlobalCursor: false,
            usesGlobalKeyboard: false,
            usesGlobalMouseWheel: false,
            usesGlobalDrag: false,
            method:
              "visible Toolset process discovery, targeted BM_CLICK on welcome controls, targeted TreeView messages"
          },
          iniStaging,
          moduleOpen,
          moduleOpenSessionGuard,
          preAreaOpenUnsafeModal,
          areaOpen,
          accessViolation,
          criticalFailureRecord
        },
        null,
        2
      )
    );
    if (!ok) {
      process.exitCode = 2;
    }
  }
}

function integerFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const numeric = Number.parseInt(raw, 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}.`);
  }
  return numeric;
}

function integerFromOption(value, envName, fallback) {
  if (value === undefined || value === null || value === "") {
    return integerFromEnv(envName, fallback);
  }
  const numeric = Number.parseInt(String(value), 10);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new Error(`${envName} option must be a positive integer, got ${JSON.stringify(value)}.`);
  }
  return numeric;
}

function signedIntegerFromOption(value, envName, fallback) {
  const raw = value ?? process.env[envName];
  if (raw === undefined || raw === null || raw === "") {
    return fallback;
  }
  const numeric = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${envName} must be an integer, got ${JSON.stringify(raw)}.`);
  }
  return numeric;
}

function nonNegativeIntegerFromOption(value, envName, fallback) {
  const raw = value ?? process.env[envName];
  if (raw === undefined || raw === null || raw === "") return fallback;
  const numeric = Number.parseInt(String(raw), 10);
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error(`${envName} must be a non-negative integer, got ${JSON.stringify(raw)}.`);
  }
  return numeric;
}

function booleanOption(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }
  if (value === true) {
    return true;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      throw new Error(`Unexpected argument: ${arg}`);
    }
    const key = arg.slice(2);
    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      parsed[key] = true;
      continue;
    }
    parsed[key] = next;
    index += 1;
  }
  return parsed;
}

function createModuleOpenSessionGuard({
  modulePath,
  expectedModuleParts,
  expectedAreaResref,
  expectedAreaName,
  existingToolsetProcesses,
  allowReuseOpenSession,
  timeoutMs
}) {
  const now = new Date().toISOString();
  const existingGuard = readJsonIfExists(moduleOpenSessionGuardPath);
  const liveToolsetProcessCount = (existingToolsetProcesses ?? []).length;
  const existingState = String(existingGuard?.state ?? "");
  const existingGuardAgeMs = getModuleOpenSessionGuardAgeMs(existingGuard, now);
  const activeGuardStaleAfterMs = timeoutMs + 30_000;
  const activeGuardStillFresh =
    existingGuardAgeMs === null || existingGuardAgeMs <= activeGuardStaleAfterMs;
  const existingIsActive =
    existingGuard &&
    existingState !== "released" &&
    existingState !== "stale_replaced" &&
    existingState !== "ignored_no_live_toolset_process";

  if (existingIsActive && activeGuardStillFresh && !allowReuseOpenSession) {
    return {
      ok: false,
      blockerCode:
        liveToolsetProcessCount > 0
          ? "module_open_session_already_active"
          : "module_open_session_fresh_guard_without_visible_process",
      guardPath: moduleOpenSessionGuardPath,
      liveToolsetProcessCount,
      activeGuardAgeMs: existingGuardAgeMs,
      activeGuardStaleAfterMs,
      existingGuard: summarizeModuleOpenSessionGuard(existingGuard),
      existingToolsetProcesses,
      policy:
        "single Toolset module-open session only; a second opener invocation must not click Open Module while the first session is active or still settling"
    };
  }

  const guard = {
    ok: true,
    guardPath: moduleOpenSessionGuardPath,
    state: "acquired_before_toolset_command",
    acquiredAt: now,
    updatedAt: now,
    processId: process.pid,
    modulePath,
    normalizedModulePath: resolve(modulePath).toLowerCase(),
    expectedModuleParts,
    expectedAreaResref,
    expectedAreaName,
    timeoutMs,
    liveToolsetProcessCountAtAcquire: liveToolsetProcessCount,
    allowReuseOpenSession,
    replacedPreviousGuard:
      existingGuard && !activeGuardStillFresh && liveToolsetProcessCount === 0
        ? summarizeModuleOpenSessionGuard(existingGuard)
        : null,
    reusedActiveGuard:
      existingGuard && liveToolsetProcessCount > 0 && allowReuseOpenSession
        ? summarizeModuleOpenSessionGuard(existingGuard)
        : null
  };

  try {
    mkdirSync(dirname(moduleOpenSessionGuardPath), { recursive: true });
    writeFileSync(moduleOpenSessionGuardPath, `${JSON.stringify(guard, null, 2)}\n`, "utf8");
    return guard;
  } catch (error) {
    return {
      ok: false,
      blockerCode: "module_open_session_guard_write_failed",
      guardPath: moduleOpenSessionGuardPath,
      error: error?.message ?? String(error)
    };
  }
}

function getModuleOpenSessionGuardAgeMs(guard, nowIso) {
  if (!guard) {
    return null;
  }
  const updatedAt = Date.parse(guard.updatedAt ?? guard.acquiredAt ?? "");
  const nowMs = Date.parse(nowIso);
  if (!Number.isFinite(updatedAt) || !Number.isFinite(nowMs)) {
    return null;
  }
  return Math.max(0, nowMs - updatedAt);
}

function updateModuleOpenSessionGuard(guard, patch) {
  if (!guard?.ok || !guard.guardPath) {
    return guard;
  }
  const next = {
    ...guard,
    ...patch,
    updatedAt: new Date().toISOString()
  };
  try {
    writeFileSync(guard.guardPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
    return next;
  } catch (error) {
    return {
      ...next,
      guardUpdateFailed: true,
      guardUpdateError: error?.message ?? String(error)
    };
  }
}

function readJsonIfExists(path) {
  if (!existsSync(path)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    return {
      state: "unreadable_guard",
      path,
      error: error?.message ?? String(error)
    };
  }
}

function summarizeModuleOpenSessionGuard(guard) {
  if (!guard) {
    return null;
  }
  return {
    state: guard.state ?? null,
    blockerCode: guard.blockerCode ?? null,
    acquiredAt: guard.acquiredAt ?? null,
    updatedAt: guard.updatedAt ?? null,
    processId: guard.processId ?? null,
    modulePath: guard.modulePath ?? null,
    expectedModuleParts: guard.expectedModuleParts ?? null,
    moduleOpenActionSubmitted: guard.moduleOpenActionSubmitted ?? null,
    moduleOpenActionKind: guard.moduleOpenActionKind ?? null,
    areaOpenOk: guard.areaOpenOk ?? null
  };
}

function runAreaOpenChild() {
  try {
    const areaOpenRaw = execFileSync(process.execPath, [areaOpenerPath], {
      encoding: "utf8",
      env: {
        ...process.env,
        AURORA_TOOLSET_EXPECTED_AREA_NAME: expectedAreaName,
        AURORA_TOOLSET_EXPECTED_AREA: expectedAreaResref,
        AURORA_TOOLSET_EXPECTED_MODULE_PARTS: expectedModuleParts.join("|")
      },
      maxBuffer: 1024 * 1024 * 8,
      timeout: areaOpenTimeoutMs
    }).trim();
    return JSON.parse(areaOpenRaw);
  } catch (error) {
    if (error?.code === "ETIMEDOUT") {
      return {
        ok: false,
        blockerCode: "target_area_open_timeout",
        timeoutMs: areaOpenTimeoutMs,
        method: "targeted TreeView messages, no global mouse or keyboard",
        stdout: String(error.stdout ?? "").slice(0, 4000),
        stderr: String(error.stderr ?? "").slice(0, 4000)
      };
    }
    throw error;
  }
}

function stageToolsetWindowPosition(targetModulePath, targetWindowPosition, { apply = true } = {}) {
  if (process.env.AURORA_TOOLSET_DISABLE_MRU_STAGING === "1") {
    return { ok: false, skipped: true, reason: "disabled_by_legacy_mru_staging_env" };
  }
  if (!targetModulePath || !existsSync(targetModulePath)) {
    return { ok: false, skipped: true, reason: "target_module_missing", targetModulePath };
  }

  const userProfile = process.env.USERPROFILE;
  const iniPath =
    process.env.AURORA_TOOLSET_INI_PATH ??
    (userProfile ? join(userProfile, "Documents", "Neverwinter Nights", "nwtoolset.ini") : null);
  if (!iniPath || !existsSync(iniPath)) {
    return { ok: false, skipped: true, reason: "nwtoolset_ini_missing", iniPath };
  }

  const original = readFileSync(iniPath);
  const text = original.toString("latin1");
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split(/\r?\n/);
  const currentMru0 = lines.find((line) => /^MRU0=/iu.test(line))?.slice(5).trim() ?? null;
  const applicationIndex = lines.findIndex((line) => line.trim().toLowerCase() === "[application]");
  const previousWindowPosition = {};
  let windowPositionAction = "skipped_application_section_missing";
  if (applicationIndex >= 0) {
    let applicationSectionEnd = lines.length;
    for (let index = applicationIndex + 1; index < lines.length; index += 1) {
      if (/^\s*\[.+\]\s*$/.test(lines[index])) {
        applicationSectionEnd = index;
        break;
      }
    }
    for (const [key, value] of [
      ["Left", targetWindowPosition.left],
      ["Top", targetWindowPosition.top]
    ]) {
      const entryIndex = lines.findIndex(
        (line, index) =>
          index > applicationIndex && index < applicationSectionEnd && new RegExp(`^${key}=`, "i").test(line)
      );
      if (entryIndex >= 0) {
        previousWindowPosition[key.toLowerCase()] = lines[entryIndex].slice(key.length + 1);
        lines[entryIndex] = `${key}=${value}`;
      } else {
        lines.splice(applicationSectionEnd, 0, `${key}=${value}`);
        applicationSectionEnd += 1;
      }
    }
    windowPositionAction = "staged_before_toolset_start";
  }

  const next = lines.join(newline);
  if (next !== text && apply) {
    writeFileSync(iniPath, Buffer.from(next, "latin1"));
  }

  return {
    ok: true,
    action:
      next === text
        ? "unchanged"
        : apply
          ? "window_position_staged"
          : "window_position_would_be_staged",
    applied: next !== text && apply,
    iniPath,
    recentFilesAction: "preserved",
    currentMru0,
    windowPositionAction,
    previousWindowPosition,
    nextWindowPosition: targetWindowPosition,
    encoding: "latin1-preserve-existing-bytes"
  };
}

function waitForToolsetUnsafeModalAfterSettle(settleMs = 0) {
  if (settleMs > 0) sleepSync(settleMs);
  return detectToolsetAccessViolation();
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runPowerShellScript(script, options) {
  const tempDir = mkdtempSync(join(tmpdir(), "aurora-toolset-ps-"));
  const scriptPath = join(tempDir, "script.ps1");
  writeFileSync(scriptPath, script, "utf8");
  try {
    return execFileSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath],
      options
    );
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function listToolsetProcesses() {
  const script = String.raw`
$processes = @(Get-Process nwtoolset -ErrorAction SilentlyContinue |
  Select-Object Id,ProcessName,MainWindowTitle,Responding,StartTime)
if ($processes.Count -eq 0) {
  '[]'
} else {
  $processes | ConvertTo-Json -Depth 4
}
`;
  const raw = runPowerShellScript(script, {
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  }).trim();
  if (!raw) {
    return [];
  }
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [parsed];
}

function getToolsetTemp0Status() {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "C:\\Users\\enonw";
  const path = join(home, "Documents", "Neverwinter Nights", "modules", "temp0");
  return {
    exists: existsSync(path),
    path,
    moduleIfoExists: existsSync(join(path, "module.ifo"))
  };
}

function findDefaultLastCityModulePath() {
  const home = process.env.USERPROFILE ?? process.env.HOME ?? "C:\\Users\\enonw";
  const modulesDir = join(home, "Documents", "Neverwinter Nights", "modules");
  try {
    const moduleName = readdirSync(modulesDir).find(
      (name) =>
        name.startsWith("the_last_city") &&
        name.endsWith("codex.mod") &&
        !name.includes(".pre-") &&
        !name.includes("vfx") &&
        !name.includes("new")
    );
    if (moduleName) {
      return join(modulesDir, moduleName);
    }
  } catch {
    // The caller still gets a useful blocker if this fallback does not exist.
  }
  return join(modulesDir, "the_last_city \u2014 codex.mod");
}

function findCriticalFailureForModule(modulePath) {
  if (!existsSync(criticalFailureRegistryPath)) {
    return null;
  }
  const registry = JSON.parse(readFileSync(criticalFailureRegistryPath, "utf8"));
  const records = Array.isArray(registry.records) ? registry.records : [];
  const moduleBaseName = basename(modulePath).toLowerCase();
  const normalizedPath = resolve(modulePath).toLowerCase();
  const match = [...records].reverse().find((record) => {
    if (record.status !== "rejected") {
      return false;
    }
    const recordPath = record.modulePath ? resolve(record.modulePath).toLowerCase() : null;
    const recordBaseName = record.moduleBaseName ? String(record.moduleBaseName).toLowerCase() : null;
    return recordPath === normalizedPath || recordBaseName === moduleBaseName;
  });
  if (!match) {
    return null;
  }
  return {
    blocked: true,
    reason: match.reason,
    recordedAt: match.recordedAt,
    modulePath: match.modulePath,
    moduleBaseName: match.moduleBaseName,
    registryPath: criticalFailureRegistryPath
  };
}

function findFullSizeConceptTilemapTarget(modulePath) {
  const moduleBaseName = basename(modulePath).toLowerCase();
  if (!moduleBaseName.startsWith("codex_writer_concept_sic_tilemap")) {
    return null;
  }
  if (!existsSync(modulePath)) {
    return null;
  }
  const sizeBytes = statSync(modulePath).size;
  if (sizeBytes <= conceptTilemapLabMaxBytes) {
    return null;
  }
  return {
    blocked: true,
    reason: "concept tilemap lab target is full-module sized",
    moduleBaseName,
    sizeBytes,
    maxBytes: conceptTilemapLabMaxBytes,
    expected: "small lab module copied from a known-good concept baseline such as tilemap58"
  };
}

function classifyConceptTilemapFailureRecord(record) {
  const moduleBaseName = String(record.moduleBaseName ?? "").toLowerCase();
  if (!moduleBaseName.startsWith("codex_writer_concept_sic_tilemap")) {
    return {
      sizeClass: "non_concept_tilemap",
      moduleBaseName: record.moduleBaseName ?? null,
      sizeBytes: null,
      exists: false
    };
  }
  const candidatePaths = [
    record.modulePath ? resolve(record.modulePath) : null,
    join(process.env.USERPROFILE ?? process.env.HOME ?? "C:\\Users\\enonw", "Documents", "Neverwinter Nights", "modules", moduleBaseName)
  ].filter(Boolean);
  const existingPath = candidatePaths.find((candidatePath) => existsSync(candidatePath));
  if (!existingPath) {
    return {
      sizeClass: "missing_module_file",
      moduleBaseName: record.moduleBaseName ?? moduleBaseName,
      sizeBytes: null,
      exists: false
    };
  }
  const sizeBytes = statSync(existingPath).size;
  return {
    sizeClass: sizeBytes > conceptTilemapLabMaxBytes ? "full_module_target" : "small_lab_target",
    moduleBaseName: record.moduleBaseName ?? moduleBaseName,
    modulePath: existingPath,
    sizeBytes,
    exists: true
  };
}

function findRepeatedCriticalFailureFamily(modulePath, areaResref) {
  const moduleBaseName = basename(modulePath).toLowerCase();
  if (!moduleBaseName.startsWith("codex_writer_concept_sic_tilemap")) {
    return null;
  }
  if (!existsSync(criticalFailureRegistryPath)) {
    return null;
  }
  const registry = JSON.parse(readFileSync(criticalFailureRegistryPath, "utf8"));
  const records = Array.isArray(registry.records) ? registry.records : [];
  const normalizedArea = String(areaResref ?? "").toLowerCase();
  const failures = records.filter((record) => {
    if (record.status !== "rejected") {
      return false;
    }
    const recordBaseName = String(record.moduleBaseName ?? "").toLowerCase();
    if (!recordBaseName.startsWith("codex_writer_concept_sic_tilemap")) {
      return false;
    }
    const recordArea = String(record.areaResref ?? normalizedArea).toLowerCase();
    if (normalizedArea && recordArea && recordArea !== normalizedArea) {
      return false;
    }
    return criticalRecordMentionsAccessViolation(record);
  });
  const classifiedFailures = failures.map((record) => ({
    record,
    size: classifyConceptTilemapFailureRecord(record)
  }));
  const smallLabFailures = classifiedFailures.filter((failure) => failure.size.sizeClass === "small_lab_target");
  const fullModuleFailures = classifiedFailures.filter((failure) => failure.size.sizeClass === "full_module_target");
  const missingSizeFailures = classifiedFailures.filter((failure) => failure.size.sizeClass === "missing_module_file");
  const uniqueSmallLabModules = new Set(
    smallLabFailures.map((failure) => String(failure.record.moduleBaseName ?? "").toLowerCase()).filter(Boolean)
  );
  const uniqueFullModuleTargets = new Set(
    fullModuleFailures.map((failure) => String(failure.record.moduleBaseName ?? "").toLowerCase()).filter(Boolean)
  );
  if (smallLabFailures.length < 3 || uniqueSmallLabModules.size < 2) {
    return null;
  }
  return {
    blocked: true,
    reason: "repeated generated concept tilemap Toolset access violations in small lab targets",
    failureCount: smallLabFailures.length,
    uniqueModuleCount: uniqueSmallLabModules.size,
    totalFamilyFailureCount: failures.length,
    fullModuleFailureCount: fullModuleFailures.length,
    uniqueFullModuleTargetCount: uniqueFullModuleTargets.size,
    missingSizeFailureCount: missingSizeFailures.length,
    areaResref,
    registryPath: criticalFailureRegistryPath,
    recentFailures: classifiedFailures.slice(-8).map((failure) => ({
      recordedAt: failure.record.recordedAt,
      reason: failure.record.reason,
      moduleBaseName: failure.record.moduleBaseName,
      sizeClass: failure.size.sizeClass,
      sizeBytes: failure.size.sizeBytes,
      message: extractCriticalFailureMessage(failure.record)
    })),
    recentSmallLabFailures: smallLabFailures.slice(-6).map((failure) => ({
      recordedAt: failure.record.recordedAt,
      reason: failure.record.reason,
      moduleBaseName: failure.record.moduleBaseName,
      sizeBytes: failure.size.sizeBytes,
      message: extractCriticalFailureMessage(failure.record)
    }))
  };
}

function criticalRecordMentionsAccessViolation(record) {
  const text = JSON.stringify(record).toLowerCase();
  return text.includes("access violation") || text.includes("access-violation") || text.includes("access_violation");
}

function extractCriticalFailureMessage(record) {
  const direct = record.evidence?.postLoadBlockingModal?.childTexts;
  if (Array.isArray(direct)) {
    const message = direct.find((text) => String(text).toLowerCase().includes("access violation"));
    if (message) {
      return message;
    }
  }
  if (record.evidence?.userVisibleCrash) {
    return record.evidence.userVisibleCrash;
  }
  const serialized = JSON.stringify(record);
  const match = /Access violation[^"]+/u.exec(serialized);
  return match?.[0] ?? null;
}

function findQuarantinedToolsetProcessWindow(processes) {
  const quarantineNames = listCriticalFailureModuleBaseNames();
  if (quarantineNames.length === 0) {
    return null;
  }
  for (const processInfo of processes) {
    const title = String(processInfo.MainWindowTitle ?? processInfo.mainWindowTitle ?? "").toLowerCase();
    if (!title) {
      continue;
    }
    const match = quarantineNames.find(
      (name) => title.includes(name.withExtension) || title.includes(name.withoutExtension)
    );
    if (match) {
      return {
        processId: processInfo.Id ?? processInfo.id ?? null,
        processName: processInfo.ProcessName ?? processInfo.processName ?? "nwtoolset",
        mainWindowTitle: processInfo.MainWindowTitle ?? processInfo.mainWindowTitle ?? null,
        matchedModuleBaseName: match.withExtension,
        registryPath: criticalFailureRegistryPath
      };
    }
  }
  return null;
}

function listCriticalFailureModuleBaseNames() {
  if (!existsSync(criticalFailureRegistryPath)) {
    return [];
  }
  const registry = JSON.parse(readFileSync(criticalFailureRegistryPath, "utf8"));
  const records = Array.isArray(registry.records) ? registry.records : [];
  const names = new Map();
  for (const record of records) {
    if (record.status !== "rejected" || !record.moduleBaseName) {
      continue;
    }
    const withExtension = String(record.moduleBaseName).toLowerCase();
    const withoutExtension = withExtension.replace(/\.mod$/i, "");
    names.set(withExtension, { withExtension, withoutExtension });
  }
  return [...names.values()];
}

function recordCriticalFailure(reason, evidence) {
  mkdirSync(artifactRoot, { recursive: true });
  const registry = existsSync(criticalFailureRegistryPath)
    ? JSON.parse(readFileSync(criticalFailureRegistryPath, "utf8"))
    : { version: "last-city-toolset-critical-failures/v1", records: [] };
  const record = {
    recordedAt: new Date().toISOString(),
    status: "rejected",
    reason,
    modulePath: resolve(modulePath),
    moduleBaseName: basename(modulePath).toLowerCase(),
    areaResref: expectedAreaResref,
    evidence
  };
  registry.version = registry.version ?? "last-city-toolset-critical-failures/v1";
  registry.records = Array.isArray(registry.records) ? registry.records : [];
  registry.records.push(record);
  writeFileSync(criticalFailureRegistryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
  return {
    recorded: true,
    registryPath: criticalFailureRegistryPath,
    record: {
      recordedAt: record.recordedAt,
      status: record.status,
      reason: record.reason,
      modulePath: record.modulePath,
      moduleBaseName: record.moduleBaseName,
      areaResref: record.areaResref
    }
  };
}

function detectToolsetAccessViolation() {
  const script = String.raw`
Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;
public static class LastCityToolsetAccessViolationProbe {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
}
'@

function Get-WindowTextValue([IntPtr]$hwnd) {
  $builder = New-Object System.Text.StringBuilder 512
  [void][LastCityToolsetAccessViolationProbe]::GetWindowText($hwnd, $builder, $builder.Capacity)
  return $builder.ToString()
}

$accessViolationMatches = @()
$enum = [LastCityToolsetAccessViolationProbe+EnumWindowsProc]{
  param([IntPtr]$hwnd, [IntPtr]$lParam)
  if (-not [LastCityToolsetAccessViolationProbe]::IsWindowVisible($hwnd)) { return $true }
  [uint32]$windowPid = 0
  [void][LastCityToolsetAccessViolationProbe]::GetWindowThreadProcessId($hwnd, [ref]$windowPid)
  $processName = $null
  try { $processName = (Get-Process -Id $windowPid -ErrorAction Stop).ProcessName } catch { $processName = $null }
  if ($processName -ne 'nwtoolset') { return $true }
  $texts = @((Get-WindowTextValue $hwnd))
  $childEnum = [LastCityToolsetAccessViolationProbe+EnumWindowsProc]{
    param([IntPtr]$child, [IntPtr]$childParam)
    $text = Get-WindowTextValue $child
    if ($text -and $text.Trim().Length -gt 0) { $script:childTexts += $text }
    return $true
  }
  $script:childTexts = @()
  [void][LastCityToolsetAccessViolationProbe]::EnumChildWindows($hwnd, $childEnum, [IntPtr]::Zero)
  $texts += $script:childTexts
  $joined = $texts -join [Environment]::NewLine
  $kind = $null
  if ($joined -match 'Access violation|Read of address|Write of address') {
    $kind = 'access_violation'
  } elseif ($joined -match 'did not close properly|try to recover|recover it') {
    $kind = 'recovery_prompt'
  } elseif ($joined -match 'Loading Inventory List') {
    $kind = 'stale_progress'
  }
  if ($null -ne $kind) {
    $accessViolationMatches += [pscustomobject]@{ hwnd = $hwnd.ToInt64(); processId = $windowPid; kind = $kind; texts = $texts }
  }
  return $true
}
[void][LastCityToolsetAccessViolationProbe]::EnumWindows($enum, [IntPtr]::Zero)
$blockerCode = $null
if (@($accessViolationMatches | Where-Object { $_.kind -eq 'access_violation' }).Count -gt 0) {
  $blockerCode = 'toolset_access_violation_modal'
} elseif (@($accessViolationMatches | Where-Object { $_.kind -eq 'recovery_prompt' }).Count -gt 0) {
  $blockerCode = 'toolset_recovery_prompt'
} elseif (@($accessViolationMatches | Where-Object { $_.kind -eq 'stale_progress' }).Count -gt 0) {
  $blockerCode = 'toolset_stale_progress_modal'
}
[pscustomobject]@{ detected = @($accessViolationMatches).Count -gt 0; blockerCode = $blockerCode; matches = @($accessViolationMatches) } | ConvertTo-Json -Depth 5 -Compress
`;
  try {
    return JSON.parse(
      runPowerShellScript(script, {
        encoding: "utf8",
        windowsHide: true,
        timeout: 15_000,
        maxBuffer: 1024 * 1024 * 2
      }).trim()
    );
  } catch (error) {
    return {
      detected: false,
      probeFailed: true,
      message: error.message
    };
  }
}

function ensureModuleLoaded(startupLoadPlan) {
  const script = String.raw`
$ErrorActionPreference = 'Stop'
$toolsetExe = $env:AURORA_TOOLSET_EXE
$modulePath = $env:AURORA_TOOLSET_MODULE_PATH
$expectedModuleParts = @($env:AURORA_TOOLSET_EXPECTED_MODULE_PARTS -split '\|' | ForEach-Object { $_.Trim().ToLowerInvariant() } | Where-Object { $_ })
$startupLoadMode = $env:AURORA_TOOLSET_STARTUP_LOAD_MODE
$plannedLoadOwner = $env:AURORA_TOOLSET_PLANNED_LOAD_OWNER
$observedExternalLoadOwner = $env:AURORA_TOOLSET_OBSERVED_EXTERNAL_LOAD_OWNER
$startupPassiveObservationMs = [int]$env:AURORA_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS
$allowForceToolsetRestart = $false
$allowSecondToolsetStart = $false
$moduleOpenTimeoutMs = [int]$env:AURORA_TOOLSET_MODULE_OPEN_TIMEOUT_MS

Add-Type @'
using System;
using System.Text;
using System.Runtime.InteropServices;

public static class LastCityToolsetModuleOpen {
  public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool EnumChildWindows(IntPtr hWndParent, EnumWindowsProc lpEnumFunc, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool IsWindowVisible(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern bool IsHungAppWindow(IntPtr hWnd);

  [DllImport("user32.dll")]
  public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern int GetWindowText(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

  [DllImport("user32.dll", SetLastError=true)]
  public static extern int GetClassName(IntPtr hWnd, StringBuilder lpClassName, int nMaxCount);

  [DllImport("user32.dll")]
  public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll", EntryPoint="SendMessageW", CharSet=CharSet.Unicode)]
  public static extern IntPtr SendMessageString(IntPtr hWnd, uint Msg, IntPtr wParam, StringBuilder lParam);

  [DllImport("user32.dll")]
  public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

  [DllImport("user32.dll")]
  public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

  public struct RECT {
    public int Left;
    public int Top;
    public int Right;
    public int Bottom;
  }
}
'@

function Get-WindowTextValue([IntPtr]$hwnd) {
  $builder = New-Object System.Text.StringBuilder 512
  [void][LastCityToolsetModuleOpen]::GetWindowText($hwnd, $builder, 512)
  return $builder.ToString()
}

function Get-ClassNameValue([IntPtr]$hwnd) {
  $builder = New-Object System.Text.StringBuilder 256
  [void][LastCityToolsetModuleOpen]::GetClassName($hwnd, $builder, 256)
  return $builder.ToString()
}

function Get-WindowRectValue([IntPtr]$hwnd) {
  $rect = New-Object 'LastCityToolsetModuleOpen+RECT'
  [void][LastCityToolsetModuleOpen]::GetWindowRect($hwnd, [ref]$rect)
  return [pscustomobject]@{
    left = $rect.Left
    top = $rect.Top
    width = $rect.Right - $rect.Left
    height = $rect.Bottom - $rect.Top
  }
}

function Get-ToolsetProcessIds {
  return @(Get-Process nwtoolset -ErrorAction SilentlyContinue | ForEach-Object { [uint32]$_.Id })
}

function Get-ToolsetTopWindows {
  $processIds = Get-ToolsetProcessIds
  $script:lastCityToolsetTopWindows = @()
  if ($processIds.Count -eq 0) {
    return @()
  }
  $enum = [LastCityToolsetModuleOpen+EnumWindowsProc]{
    param($hwnd, $lparam)
    [uint32]$windowProcessId = 0
    [void][LastCityToolsetModuleOpen]::GetWindowThreadProcessId($hwnd, [ref]$windowProcessId)
    if ($processIds -notcontains $windowProcessId) {
      return $true
    }
    $title = Get-WindowTextValue $hwnd
    $className = Get-ClassNameValue $hwnd
    $rect = Get-WindowRectValue $hwnd
    $script:lastCityToolsetTopWindows += [pscustomobject]@{
      hwnd = $hwnd.ToInt64()
      title = $title
      className = $className
      processId = $windowProcessId
      visible = [LastCityToolsetModuleOpen]::IsWindowVisible($hwnd)
      responding = -not [LastCityToolsetModuleOpen]::IsHungAppWindow($hwnd)
      bounds = $rect
    }
    return $true
  }
  [void][LastCityToolsetModuleOpen]::EnumWindows($enum, [IntPtr]::Zero)
  return @($script:lastCityToolsetTopWindows)
}

function Get-VisibleToolsetTopWindows {
  return @(Get-ToolsetTopWindows | Where-Object { $_.visible -and $_.bounds.width -gt 0 -and $_.bounds.height -gt 0 })
}

function Get-UsableToolsetTopWindows {
  return @(
    Get-VisibleToolsetTopWindows | Where-Object {
      $_.className -ne 'TApplication' -and
      $_.bounds.left -gt -30000 -and
      $_.bounds.top -gt -30000
    }
  )
}

function Stop-HeadlessToolsetProcesses {
  $processIds = Get-ToolsetProcessIds
  if ($processIds.Count -eq 0) {
    return $false
  }
  if (-not $allowForceToolsetRestart) {
    return $false
  }

  Start-Sleep -Seconds 2
  if ((Get-UsableToolsetTopWindows).Count -gt 0) {
    return $false
  }

  foreach ($processId in $processIds) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
  Start-Sleep -Seconds 2
  return $true
}

function Find-LoadedExpectedModuleWindow {
  foreach ($window in (Get-VisibleToolsetTopWindows | Where-Object { $_.title -like '*Neverwinter Nights Toolset*' })) {
    $lower = $window.title.ToLowerInvariant()
    $matches = $true
    foreach ($part in $expectedModuleParts) {
      if (-not $lower.Contains($part)) {
        $matches = $false
        break
      }
    }
    if ($matches) {
      return $window
    }
  }
  return $null
}

function Find-LoadedUnexpectedModuleWindow {
  foreach ($window in (Get-VisibleToolsetTopWindows | Where-Object { $_.title -like '*Neverwinter Nights Toolset* - *.mod' })) {
    $lower = $window.title.ToLowerInvariant()
    $matches = $true
    foreach ($part in $expectedModuleParts) {
      if (-not $lower.Contains($part)) {
        $matches = $false
        break
      }
    }
    if (-not $matches) {
      return $window
    }
  }
  return $null
}

function Find-BlankToolsetFrame {
  foreach ($window in (Get-VisibleToolsetTopWindows | Where-Object { $_.className -eq 'TfrmFrame' -and $_.title -like '*Neverwinter Nights Toolset*' })) {
    if ($window.title -notmatch ' - .+\.mod$') {
      return $window
    }
  }
  return $null
}

function Get-ChildTextMap([IntPtr]$parent) {
  $script:lastCityToolsetChildWindows = @()
  $childEnum = [LastCityToolsetModuleOpen+EnumWindowsProc]{
    param($hwnd, $lparam)
    $script:lastCityToolsetChildWindows += [pscustomobject]@{
      hwnd = $hwnd.ToInt64()
      title = Get-WindowTextValue $hwnd
      className = Get-ClassNameValue $hwnd
      visible = [LastCityToolsetModuleOpen]::IsWindowVisible($hwnd)
      bounds = Get-WindowRectValue $hwnd
    }
    return $true
  }
  [void][LastCityToolsetModuleOpen]::EnumChildWindows($parent, $childEnum, [IntPtr]::Zero)
  return @($script:lastCityToolsetChildWindows)
}

function Find-WelcomeOpenExistingControls {
  foreach ($window in (Get-ToolsetTopWindows | Where-Object { $_.visible })) {
    if ($window.title -ne 'BioWare Aurora Neverwinter Nights Toolset') {
      continue
    }
    $children = Get-ChildTextMap ([IntPtr][int64]$window.hwnd)
    $openRadio = @($children | Where-Object { $_.title -eq 'Open an existing Module' -and $_.visible }) | Select-Object -First 1
    $okButton = @($children | Where-Object { $_.title -eq 'OK' -and $_.visible }) | Select-Object -First 1
    if ($null -ne $openRadio -and $null -ne $okButton) {
      return [pscustomobject]@{
        hwnd = $window.hwnd
        title = $window.title
        openRadioHwnd = $openRadio.hwnd
        okButtonHwnd = $okButton.hwnd
        childTexts = @($children | Where-Object { $_.title } | ForEach-Object { $_.title })
      }
    }
  }
  return $null
}

function Find-RecoveryConfirmationControls {
  foreach ($window in (Get-VisibleToolsetTopWindows | Where-Object { $_.title -eq 'Confirmation' })) {
    $children = Get-ChildTextMap ([IntPtr][int64]$window.hwnd)
    $childTexts = @($children | Where-Object { $_.title } | ForEach-Object { $_.title })
    $combinedText = ($childTexts -join [Environment]::NewLine).ToLowerInvariant()
    $isRecoverableBackupPrompt =
      $combinedText.Contains('toolset did not close properly') -and
      $combinedText.Contains('backup')
    $isTemporaryDirectoryCleanupPrompt =
      $combinedText.Contains('temporary working directory') -and
      $combinedText.Contains('no module information file to recover')
    if (-not $isRecoverableBackupPrompt -and -not $isTemporaryDirectoryCleanupPrompt) {
      continue
    }
    $yesButton = @(
      $children | Where-Object {
        $_.visible -and
        ($_.title.Replace('&', '') -eq 'Tak' -or $_.title.Replace('&', '') -eq 'Yes')
      }
    ) | Select-Object -First 1
    $noButton = @(
      $children | Where-Object {
        $_.visible -and
        ($_.title.Replace('&', '') -eq 'Nie' -or $_.title.Replace('&', '') -eq 'No')
      }
    ) | Select-Object -First 1
    if ($null -ne $yesButton -or $null -ne $noButton) {
      return [pscustomobject]@{
        hwnd = $window.hwnd
        title = $window.title
        yesButtonHwnd = if ($null -ne $yesButton) { $yesButton.hwnd } else { $null }
        noButtonHwnd = if ($null -ne $noButton) { $noButton.hwnd } else { $null }
        promptKind = if ($isTemporaryDirectoryCleanupPrompt) { 'temporary_working_directory_cleanup' } else { 'recoverable_backup' }
        childTexts = $childTexts
      }
    }
  }
  return $null
}

function Find-OpenModuleDialogControls {
  foreach ($window in (Get-VisibleToolsetTopWindows | Where-Object { $_.title -eq 'Open' -and $_.className -eq 'TdlgModuleSelect' })) {
    $children = Get-ChildTextMap ([IntPtr][int64]$window.hwnd)
    $listBox = @($children | Where-Object { $_.className -eq 'TListBox' -and $_.visible }) | Select-Object -First 1
    $openButton = @($children | Where-Object { $_.className -eq 'TButton' -and $_.title -eq 'Open' -and $_.visible }) | Select-Object -First 1
    if ($null -ne $listBox -and $null -ne $openButton) {
      return [pscustomobject]@{
        hwnd = $window.hwnd
        title = $window.title
        listBoxHwnd = $listBox.hwnd
        openButtonHwnd = $openButton.hwnd
        childTexts = @($children | Where-Object { $_.title } | ForEach-Object { $_.title })
      }
    }
  }
  return $null
}

function Close-OpenModuleDialogs {
  $WM_CLOSE = 0x0010
  $closed = @()
  foreach ($window in (Get-VisibleToolsetTopWindows | Where-Object { $_.title -eq 'Open' -and $_.className -eq 'TdlgModuleSelect' })) {
    [void][LastCityToolsetModuleOpen]::PostMessage(([IntPtr][int64]$window.hwnd), $WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero)
    $closed += $window
  }
  if (@($closed).Count -gt 0) {
    Start-Sleep -Milliseconds 500
  }
  return @($closed)
}

function Close-StaleWelcomeDialogsAfterModuleLoaded {
  $WM_CLOSE = 0x0010
  $closed = @()
  foreach ($window in (Get-VisibleToolsetTopWindows | Where-Object { $_.className -eq 'TdlgWelcome' })) {
    [void][LastCityToolsetModuleOpen]::PostMessage(([IntPtr][int64]$window.hwnd), $WM_CLOSE, [IntPtr]::Zero, [IntPtr]::Zero)
    $closed += $window
  }
  if (@($closed).Count -gt 0) {
    Start-Sleep -Milliseconds 500
  }
  return @($closed)
}

function Test-ExpectedModuleFrameLoaded {
  return $null -ne (Find-LoadedExpectedModuleWindow)
}

function Find-StartupModuleLoadSignal {
  foreach ($window in (Get-VisibleToolsetTopWindows)) {
    if ($window.className -ne 'TdlgProgress') {
      continue
    }
    $children = Get-ChildTextMap ([IntPtr][int64]$window.hwnd)
    return [pscustomobject]@{
      kind = 'progress_dialog'
      hwnd = $window.hwnd
      title = $window.title
      className = $window.className
      childTexts = @($children | Where-Object { $_.title } | ForEach-Object { $_.title })
    }
  }
  return $null
}

function Get-ExplicitOpenSurfaceKind {
  if ($null -ne (Find-WelcomeOpenExistingControls)) {
    return 'welcome'
  }
  if ($null -ne (Find-BlankToolsetFrame)) {
    return 'blank_frame'
  }
  return $null
}

function Find-BlockingToolsetModalWindow {
  foreach ($window in (Get-VisibleToolsetTopWindows)) {
    if ($window.className -eq 'TApplication' -or $window.className -eq 'TfrmFrame') {
      continue
    }
    if ($window.className -notin @('#32770', 'TdlgModuleSelect', 'TdlgWelcome', 'TdlgProgress') -and $window.title -notin @('Open', 'Confirmation')) {
      continue
    }

    $children = Get-ChildTextMap ([IntPtr][int64]$window.hwnd)
    $childTexts = @($children | Where-Object { $_.title } | ForEach-Object { $_.title })
    $texts = @($window.title) + $childTexts
    $joined = ($texts -join [Environment]::NewLine)
    $kind = 'toolset_modal_dialog'
    $blockerCode = 'toolset_module_loaded_but_modal_open'
    if ($joined -match 'Access violation|Read of address|Write of address') {
      $kind = 'access_violation'
      $blockerCode = 'toolset_access_violation_modal'
    } elseif ($joined -match 'did not close properly|try to recover|recover it') {
      $kind = 'recovery_prompt'
      $blockerCode = 'toolset_recovery_prompt'
    } elseif ($joined -match 'Loading Inventory List') {
      $kind = 'stale_progress'
      $blockerCode = 'toolset_stale_progress_modal'
    } elseif ($window.title -eq 'Open' -and $window.className -eq 'TdlgModuleSelect') {
      $kind = 'open_module_dialog'
      $blockerCode = 'toolset_open_module_dialog_after_module_loaded'
    } elseif ($window.className -eq 'TdlgWelcome') {
      $kind = 'stale_welcome_dialog'
      $blockerCode = 'toolset_welcome_dialog_after_module_loaded'
    }

    return [pscustomobject]@{
      hwnd = $window.hwnd
      processId = $window.processId
      title = $window.title
      className = $window.className
      kind = $kind
      blockerCode = $blockerCode
      childTexts = $childTexts
    }
  }
  return $null
}

function Invoke-WelcomeOpenExisting($welcome) {
  $BM_CLICK = 0x00F5
  $BM_SETCHECK = 0x00F1
  $BST_CHECKED = 1
  $openRadio = ([IntPtr][int64]$welcome.openRadioHwnd)
  $okButton = ([IntPtr][int64]$welcome.okButtonHwnd)
  [void][LastCityToolsetModuleOpen]::SendMessage($openRadio, $BM_SETCHECK, [IntPtr]$BST_CHECKED, [IntPtr]::Zero)
  [void][LastCityToolsetModuleOpen]::SendMessage($openRadio, $BM_CLICK, [IntPtr]::Zero, [IntPtr]::Zero)
  Start-Sleep -Milliseconds 250
  [void][LastCityToolsetModuleOpen]::SendMessage($okButton, $BM_CLICK, [IntPtr]::Zero, [IntPtr]::Zero)
}

function Invoke-BlankFrameOpenModuleDialog {
  $blankFrame = Find-BlankToolsetFrame
  if ($null -eq $blankFrame) {
    return $false
  }
  $WM_COMMAND = 0x0111
  return [LastCityToolsetModuleOpen]::PostMessage(([IntPtr][int64]$blankFrame.hwnd), $WM_COMMAND, [IntPtr]44, [IntPtr]::Zero)
}

function Invoke-OpenModuleDialogSelection($dialog) {
  $LB_GETCOUNT = 0x018B
  $LB_GETTEXT = 0x0189
  $LB_GETTEXTLEN = 0x018A
  $LB_SETCURSEL = 0x0186
  $BM_CLICK = 0x00F5

  function Get-ListBoxItemText([IntPtr]$listHwnd, [int]$index) {
    $length = [LastCityToolsetModuleOpen]::SendMessage($listHwnd, $LB_GETTEXTLEN, [IntPtr]$index, [IntPtr]::Zero).ToInt32()
    if ($length -lt 0) {
      return ''
    }
    $builder = New-Object System.Text.StringBuilder ($length + 2)
    [void][LastCityToolsetModuleOpen]::SendMessageString($listHwnd, $LB_GETTEXT, [IntPtr]$index, $builder)
    return $builder.ToString()
  }

  $moduleListIndex = $null
  $count = [LastCityToolsetModuleOpen]::SendMessage(([IntPtr][int64]$dialog.listBoxHwnd), $LB_GETCOUNT, [IntPtr]::Zero, [IntPtr]::Zero).ToInt32()
  $listHwnd = ([IntPtr][int64]$dialog.listBoxHwnd)
  $items = @()
  for ($index = 0; $index -lt $count; $index += 1) {
    $text = Get-ListBoxItemText $listHwnd $index
    $items += [pscustomobject]@{ index = $index; text = $text }
  }

  $expectedModuleFileName = [System.IO.Path]::GetFileName($modulePath).ToLowerInvariant()
  $expectedModuleBaseName = [System.IO.Path]::GetFileNameWithoutExtension($modulePath).ToLowerInvariant()
  $exactMatchingItems = @(
    $items | Where-Object {
      $normalized = $_.text.ToLowerInvariant()
      $normalized -eq $expectedModuleFileName -or $normalized -eq $expectedModuleBaseName
    }
  )
  $matchingItems = $exactMatchingItems

  if (@($matchingItems).Count -gt 0) {
    $moduleListIndex = [int]$matchingItems[0].index
  }

  if ($null -eq $moduleListIndex) {
    return [pscustomobject]@{
      ok = $false
      blockerCode = 'module_list_expected_module_not_found'
      listCount = $count
      expectedModuleFileName = $expectedModuleFileName
      expectedModuleBaseName = $expectedModuleBaseName
      expectedModuleParts = $expectedModuleParts
      itemSample = @($items | Select-Object -First 80)
      dialog = $dialog
    }
  }

  if ($count -le $moduleListIndex) {
    return [pscustomobject]@{
      ok = $false
      blockerCode = 'module_list_index_out_of_range'
      listCount = $count
      moduleListIndex = $moduleListIndex
      itemSample = @($items | Select-Object -First 80)
      dialog = $dialog
    }
  }
  $selected = [LastCityToolsetModuleOpen]::SendMessage(([IntPtr][int64]$dialog.listBoxHwnd), $LB_SETCURSEL, [IntPtr]$moduleListIndex, [IntPtr]::Zero).ToInt32()
  Start-Sleep -Milliseconds 200
  [void][LastCityToolsetModuleOpen]::SendMessage(([IntPtr][int64]$dialog.openButtonHwnd), $BM_CLICK, [IntPtr]::Zero, [IntPtr]::Zero)
  return [pscustomobject]@{
    ok = $true
    listCount = $count
    moduleListIndex = $moduleListIndex
    selectedItemText = (@($items | Where-Object { $_.index -eq $moduleListIndex }) | Select-Object -First 1).text
    matchedBy = 'expected_module_exact_text'
    selected = $selected
    dialog = $dialog
  }
}

$startedToolset = $false
$recoveryConfirmationHandled = $false
$recoveryConfirmationHandledCount = 0
$recoveryConfirmationProbe = $null
$openModuleDialogRequested = $false
$openModuleDialogHandled = $false
$openModuleDialogHandledAt = $null
$openModuleDialogProbe = $null
$openModuleDialogResult = $null
$blankFrameRestarted = $false
$blankFrameRestartBlocked = $false
$welcomeHandled = $false
$welcomeProbe = $null
$staleProcessCleanup = $false
$closedOpenModuleDialogs = @()
$closedStaleWelcomeDialogs = @()
$postLoadBlockingModal = $null
$postSelectionBlockingModal = $null
$moduleOpenActionSubmitted = $false
$moduleOpenActionSubmittedAt = $null
$moduleOpenActionKind = $null
$moduleLoadOwner = $null
$moduleLoadOwnershipClaimedAt = $null
$moduleLoadedPreActionGuardCount = 0
$startupLoadSignals = @()
$startupObservationStartedAt = $null
$startupObservationCompletedAt = $null
$startupStableSurfaceKind = $null
$startupStableSurfaceSince = $null
$explicitOpenEligibilityGranted = $false
$startTime = Get-Date

if (-not (Test-Path -LiteralPath $toolsetExe)) {
  [pscustomobject]@{
    ok = $false
    blockerCode = 'missing_toolset_exe'
    toolsetExe = $toolsetExe
    modulePath = $modulePath
  } | ConvertTo-Json -Depth 8
  exit 0
}

if ((Get-ToolsetProcessIds).Count -gt 0 -and (Get-UsableToolsetTopWindows).Count -eq 0) {
  if ($allowForceToolsetRestart) {
    $staleProcessCleanup = Stop-HeadlessToolsetProcesses
  } else {
    [pscustomobject]@{
      ok = $false
      blockerCode = 'stale_toolset_process_requires_manual_close'
      method = 'refuse automatic Stop-Process -Force unless AURORA_TOOLSET_ALLOW_FORCE_RESTART=1'
      startedToolset = $startedToolset
      staleProcessCleanup = $staleProcessCleanup
      allowForceToolsetRestart = $allowForceToolsetRestart
      expectedModuleParts = $expectedModuleParts
      modulePath = $modulePath
    } | ConvertTo-Json -Depth 8
    exit 0
  }
}

if ((Get-ToolsetProcessIds).Count -eq 0) {
  Start-Process -FilePath $toolsetExe
  $startedToolset = $true
  Start-Sleep -Seconds 3
}
$startupObservationStartedAt = Get-Date

$loaded = $null
for ($attempt = 0; ((Get-Date) - $startTime).TotalMilliseconds -lt $moduleOpenTimeoutMs; $attempt += 1) {
  if (((Get-Date) - $startTime).TotalMilliseconds -ge $moduleOpenTimeoutMs) {
    break
  }
  $loadedCandidate = Find-LoadedExpectedModuleWindow
  if ($null -ne $loadedCandidate) {
    if ($null -eq $moduleLoadOwner) {
      $moduleLoadOwner = if ($observedExternalLoadOwner) { $observedExternalLoadOwner } else { 'external' }
      $moduleLoadOwnershipClaimedAt = Get-Date
      $startupLoadSignals += [pscustomobject]@{
        kind = 'expected_module_window'
        hwnd = $loadedCandidate.hwnd
        title = $loadedCandidate.title
        className = $loadedCandidate.className
      }
    }
    $newlyClosedOpenModuleDialogs = Close-OpenModuleDialogs
    $newlyClosedStaleWelcomeDialogs = Close-StaleWelcomeDialogsAfterModuleLoaded
    if (@($newlyClosedOpenModuleDialogs).Count -gt 0) {
      $closedOpenModuleDialogs += @($newlyClosedOpenModuleDialogs)
    }
    if (@($newlyClosedStaleWelcomeDialogs).Count -gt 0) {
      $closedStaleWelcomeDialogs += @($newlyClosedStaleWelcomeDialogs)
    }
    if (@($newlyClosedOpenModuleDialogs).Count -gt 0 -or @($newlyClosedStaleWelcomeDialogs).Count -gt 0) {
      Start-Sleep -Milliseconds 500
    }
    $postLoadBlockingModal = Find-BlockingToolsetModalWindow
    if ($null -eq $postLoadBlockingModal) {
      $loaded = $loadedCandidate
      break
    }
    if ($postLoadBlockingModal.blockerCode -eq 'toolset_access_violation_modal' -or $postLoadBlockingModal.blockerCode -eq 'toolset_recovery_prompt') {
      [pscustomobject]@{
        ok = $false
        blockerCode = $postLoadBlockingModal.blockerCode
        method = 'abort after expected module frame loaded because a critical Toolset modal is still active'
        startedToolset = $startedToolset
        staleProcessCleanup = $staleProcessCleanup
        allowSecondToolsetStart = $allowSecondToolsetStart
        expectedModuleParts = $expectedModuleParts
        modulePath = $modulePath
        moduleWindowTitle = $loadedCandidate.title
        moduleWindowHwnd = $loadedCandidate.hwnd
        postLoadBlockingModal = $postLoadBlockingModal
        welcomeHandled = $welcomeHandled
        openModuleDialogRequested = $openModuleDialogRequested
        openModuleDialogHandled = $openModuleDialogHandled
        openModuleDialogHandledAt = $openModuleDialogHandledAt
        openModuleDialogProbe = $openModuleDialogProbe
        openModuleDialogResult = $openModuleDialogResult
        moduleOpenActionSubmitted = $moduleOpenActionSubmitted
        moduleOpenActionSubmittedAt = $moduleOpenActionSubmittedAt
        moduleOpenActionKind = $moduleOpenActionKind
        moduleLoadOwner = $moduleLoadOwner
        moduleLoadOwnershipClaimedAt = $moduleLoadOwnershipClaimedAt
        startupPassiveObservationMs = $startupPassiveObservationMs
        startupObservationStartedAt = $startupObservationStartedAt
        startupObservationCompletedAt = $startupObservationCompletedAt
        explicitOpenEligibilityGranted = $explicitOpenEligibilityGranted
        startupLoadSignals = @($startupLoadSignals)
        moduleLoadedPreActionGuardCount = $moduleLoadedPreActionGuardCount
        closedOpenModuleDialogCount = @($closedOpenModuleDialogs).Count
        closedOpenModuleDialogs = @($closedOpenModuleDialogs)
        closedStaleWelcomeDialogCount = @($closedStaleWelcomeDialogs).Count
        closedStaleWelcomeDialogs = @($closedStaleWelcomeDialogs)
        topLevelToolsetWindows = Get-VisibleToolsetTopWindows
      } | ConvertTo-Json -Depth 8
      exit 0
    }
    Start-Sleep -Seconds 1
    continue
  }

  $unexpectedLoaded = Find-LoadedUnexpectedModuleWindow
  if ($null -ne $unexpectedLoaded) {
    if ($null -eq $moduleLoadOwner) {
      $moduleLoadOwner = 'external'
      $moduleLoadOwnershipClaimedAt = Get-Date
      $startupLoadSignals += [pscustomobject]@{
        kind = 'unexpected_module_window'
        hwnd = $unexpectedLoaded.hwnd
        title = $unexpectedLoaded.title
        className = $unexpectedLoaded.className
      }
    }
    [pscustomobject]@{
      ok = $false
      blockerCode = 'unexpected_module_window_loaded'
      method = 'abort before Toolset continues loading the wrong module'
      expectedModuleParts = $expectedModuleParts
      unexpectedModuleWindowTitle = $unexpectedLoaded.title
      unexpectedModuleWindowHwnd = $unexpectedLoaded.hwnd
      modulePath = $modulePath
      moduleLoadOwner = $moduleLoadOwner
      moduleLoadOwnershipClaimedAt = $moduleLoadOwnershipClaimedAt
      startupLoadSignals = @($startupLoadSignals)
      topLevelToolsetWindows = Get-VisibleToolsetTopWindows
    } | ConvertTo-Json -Depth 8
    exit 0
  }

  $recoveryConfirmationProbe = Find-RecoveryConfirmationControls
  if ($null -ne $recoveryConfirmationProbe) {
    if ($null -eq $moduleLoadOwner) {
      $moduleLoadOwner = 'recovery'
      $moduleLoadOwnershipClaimedAt = Get-Date
    }
    [pscustomobject]@{
      ok = $false
      blockerCode = 'toolset_recovery_prompt_blocked_critical'
      method = 'critical stop: recovery prompts are never clicked by automation'
      startedToolset = $startedToolset
      recoveryConfirmationHandled = $false
      recoveryConfirmationHandledCount = $recoveryConfirmationHandledCount
      recoveryConfirmationProbe = $recoveryConfirmationProbe
      expectedModuleParts = $expectedModuleParts
      modulePath = $modulePath
      moduleLoadOwner = $moduleLoadOwner
      topLevelToolsetWindows = Get-VisibleToolsetTopWindows
    } | ConvertTo-Json -Depth 8
    exit 0
  }

  $startupLoadSignal = Find-StartupModuleLoadSignal
  if ($null -ne $startupLoadSignal) {
    if ($null -eq $moduleLoadOwner) {
      $moduleLoadOwner = if ($observedExternalLoadOwner) { $observedExternalLoadOwner } else { 'external' }
      $moduleLoadOwnershipClaimedAt = Get-Date
    }
    if (@($startupLoadSignals).Count -eq 0) {
      $startupLoadSignals += $startupLoadSignal
    }
    Start-Sleep -Milliseconds 500
    continue
  }

  if (-not $moduleOpenActionSubmitted) {
    $preActionBlockingModal = Find-BlockingToolsetModalWindow
    if ($null -ne $preActionBlockingModal) {
      if (
        $preActionBlockingModal.blockerCode -eq 'toolset_access_violation_modal' -or
        $preActionBlockingModal.blockerCode -eq 'toolset_recovery_prompt'
      ) {
        [pscustomobject]@{
          ok = $false
          blockerCode = $preActionBlockingModal.blockerCode
          method = 'critical stop before any module-open action'
          modulePath = $modulePath
          moduleLoadOwner = $moduleLoadOwner
          preActionBlockingModal = $preActionBlockingModal
          topLevelToolsetWindows = Get-VisibleToolsetTopWindows
        } | ConvertTo-Json -Depth 8
        exit 0
      }
      if ($preActionBlockingModal.blockerCode -eq 'toolset_stale_progress_modal') {
        if ($null -eq $moduleLoadOwner) {
          $moduleLoadOwner = if ($observedExternalLoadOwner) { $observedExternalLoadOwner } else { 'external' }
          $moduleLoadOwnershipClaimedAt = Get-Date
        }
        Start-Sleep -Seconds 1
        continue
      }
    }
  }

  if ($moduleOpenActionSubmitted) {
    $postSelectionBlockingModalCandidate = Find-BlockingToolsetModalWindow
    if ($null -ne $postSelectionBlockingModalCandidate) {
      $postSelectionBlockingModal = $postSelectionBlockingModalCandidate
      if (
        $postSelectionBlockingModal.blockerCode -eq 'toolset_access_violation_modal' -or
        $postSelectionBlockingModal.blockerCode -eq 'toolset_recovery_prompt'
      ) {
        [pscustomobject]@{
          ok = $false
          blockerCode = $postSelectionBlockingModal.blockerCode
          method = 'critical stop after first module-open selection; never submit a second open action'
          startedToolset = $startedToolset
          staleProcessCleanup = $staleProcessCleanup
          expectedModuleParts = $expectedModuleParts
          modulePath = $modulePath
          postSelectionBlockingModal = $postSelectionBlockingModal
          moduleOpenActionSubmitted = $moduleOpenActionSubmitted
          moduleOpenActionSubmittedAt = $moduleOpenActionSubmittedAt
          moduleOpenActionKind = $moduleOpenActionKind
          moduleLoadOwner = $moduleLoadOwner
          moduleLoadOwnershipClaimedAt = $moduleLoadOwnershipClaimedAt
          openModuleDialogRequested = $openModuleDialogRequested
          openModuleDialogHandled = $openModuleDialogHandled
          openModuleDialogHandledAt = $openModuleDialogHandledAt
          openModuleDialogProbe = $openModuleDialogProbe
          openModuleDialogResult = $openModuleDialogResult
          moduleLoadedPreActionGuardCount = $moduleLoadedPreActionGuardCount
          topLevelToolsetWindows = Get-VisibleToolsetTopWindows
        } | ConvertTo-Json -Depth 8
        exit 0
      }
    }
    Start-Sleep -Seconds 1
    continue
  }

  if ($null -ne $moduleLoadOwner) {
    $closedOwnedLoadOpenDialogs = Close-OpenModuleDialogs
    if (@($closedOwnedLoadOpenDialogs).Count -gt 0) {
      $closedOpenModuleDialogs += @($closedOwnedLoadOpenDialogs)
    }
    Start-Sleep -Seconds 1
    continue
  }


  if (-not $explicitOpenEligibilityGranted) {
    $surfaceKind = Get-ExplicitOpenSurfaceKind
    if ($surfaceKind -ne $startupStableSurfaceKind) {
      $startupStableSurfaceKind = $surfaceKind
      $startupStableSurfaceSince = if ($null -ne $surfaceKind) { Get-Date } else { $null }
    }
    $startupObservationElapsedMs = [int]((Get-Date) - $startupObservationStartedAt).TotalMilliseconds
    $startupStableSurfaceMs = if ($null -ne $startupStableSurfaceSince) {
      [int]((Get-Date) - $startupStableSurfaceSince).TotalMilliseconds
    } else {
      0
    }
    if (
      $null -ne $startupStableSurfaceKind -and
      $startupObservationElapsedMs -ge $startupPassiveObservationMs -and
      $startupStableSurfaceMs -ge $startupPassiveObservationMs
    ) {
      $explicitOpenEligibilityGranted = $true
      $startupObservationCompletedAt = Get-Date
    } else {
      Start-Sleep -Milliseconds 500
      continue
    }
  }

  if (-not $welcomeHandled) {
    if (Test-ExpectedModuleFrameLoaded) {
      $moduleLoadedPreActionGuardCount += 1
      Start-Sleep -Milliseconds 250
      continue
    }
    $welcomeProbe = Find-WelcomeOpenExistingControls
    if ($null -ne $welcomeProbe) {
      if (Test-ExpectedModuleFrameLoaded) {
        $moduleLoadedPreActionGuardCount += 1
        Start-Sleep -Milliseconds 250
        continue
      }
      Invoke-WelcomeOpenExisting $welcomeProbe
      $welcomeHandled = $true
      $openModuleDialogRequested = $true
      Start-Sleep -Seconds 4
      continue
    }
  }

  if (-not $openModuleDialogHandled) {
    $openModuleDialogProbe = Find-OpenModuleDialogControls
    if ($null -ne $openModuleDialogProbe) {
      if (Test-ExpectedModuleFrameLoaded) {
        $moduleLoadedPreActionGuardCount += 1
        Start-Sleep -Milliseconds 250
        continue
      }
      if (-not $openModuleDialogRequested) {
        [pscustomobject]@{
          ok = $false
          blockerCode = 'unowned_open_module_dialog_detected'
          method = 'an Open dialog not requested by this session is never submitted'
          openModuleDialogProbe = $openModuleDialogProbe
        } | ConvertTo-Json -Depth 8
        exit 0
      }
      if ($startupLoadMode -ne 'passive_observation_then_explicit_open' -or -not $explicitOpenEligibilityGranted -or $null -ne $moduleLoadOwner) {
        [pscustomobject]@{
          ok = $false
          blockerCode = 'explicit_open_forbidden_after_module_load_claim'
          method = 'single module-load owner invariant'
          startupLoadMode = $startupLoadMode
          moduleLoadOwner = $moduleLoadOwner
          openModuleDialogProbe = $openModuleDialogProbe
        } | ConvertTo-Json -Depth 8
        exit 0
      }
      $openModuleDialogResult = Invoke-OpenModuleDialogSelection $openModuleDialogProbe
      if ($openModuleDialogResult.ok -eq $false) {
        break
      }
      $openModuleDialogHandled = $true
      $openModuleDialogHandledAt = Get-Date
      $openModuleDialogRequested = $true
      $moduleOpenActionSubmitted = $true
      $moduleOpenActionSubmittedAt = $openModuleDialogHandledAt
      $moduleOpenActionKind = 'open_module_dialog_selection'
      $moduleLoadOwner = 'explicit_open'
      $moduleLoadOwnershipClaimedAt = $moduleOpenActionSubmittedAt
      Start-Sleep -Seconds 4
      continue
    }
  }

  if ($startupLoadMode -eq 'passive_observation_then_explicit_open' -and $explicitOpenEligibilityGranted -and $null -eq $moduleLoadOwner -and -not $openModuleDialogRequested) {
    if (Test-ExpectedModuleFrameLoaded) {
      $moduleLoadedPreActionGuardCount += 1
      Start-Sleep -Milliseconds 250
      continue
    }
    if (Invoke-BlankFrameOpenModuleDialog) {
      $openModuleDialogRequested = $true
      Start-Sleep -Seconds 2
      continue
    }
  }

  if ($openModuleDialogHandled -and $null -ne $openModuleDialogHandledAt) {
    $secondsSinceOpen = ((Get-Date) - $openModuleDialogHandledAt).TotalSeconds
    if ($secondsSinceOpen -lt 120) {
      Start-Sleep -Seconds 1
      continue
    }
  }

  Start-Sleep -Seconds 1
}

$elapsedMs = [int]((Get-Date) - $startTime).TotalMilliseconds
if ($null -ne $loaded) {
  $newlyClosedOpenModuleDialogs = Close-OpenModuleDialogs
  $newlyClosedStaleWelcomeDialogs = Close-StaleWelcomeDialogsAfterModuleLoaded
  if (@($newlyClosedOpenModuleDialogs).Count -gt 0) {
    $closedOpenModuleDialogs += @($newlyClosedOpenModuleDialogs)
  }
  if (@($newlyClosedStaleWelcomeDialogs).Count -gt 0) {
    $closedStaleWelcomeDialogs += @($newlyClosedStaleWelcomeDialogs)
  }
  [pscustomobject]@{
    ok = $true
    method = 'start one Toolset process, passively observe a stable no-signal surface, then allow at most one targeted explicit selection'
    startedToolset = $startedToolset
    staleProcessCleanup = $staleProcessCleanup
    recoveryConfirmationHandled = $recoveryConfirmationHandled
    recoveryConfirmationHandledCount = $recoveryConfirmationHandledCount
    recoveryConfirmationProbe = $recoveryConfirmationProbe
    openModuleDialogRequested = $openModuleDialogRequested
    openModuleDialogHandled = $openModuleDialogHandled
    openModuleDialogHandledAt = $openModuleDialogHandledAt
    openModuleDialogProbe = $openModuleDialogProbe
    openModuleDialogResult = $openModuleDialogResult
    closedOpenModuleDialogCount = @($closedOpenModuleDialogs).Count
    closedOpenModuleDialogs = @($closedOpenModuleDialogs)
    closedStaleWelcomeDialogCount = @($closedStaleWelcomeDialogs).Count
    closedStaleWelcomeDialogs = @($closedStaleWelcomeDialogs)
    postLoadBlockingModal = $postLoadBlockingModal
    postSelectionBlockingModal = $postSelectionBlockingModal
    moduleOpenActionSubmitted = $moduleOpenActionSubmitted
    moduleOpenActionSubmittedAt = $moduleOpenActionSubmittedAt
    moduleOpenActionKind = $moduleOpenActionKind
    moduleLoadOwner = $moduleLoadOwner
    moduleLoadOwnershipClaimedAt = $moduleLoadOwnershipClaimedAt
    startupPassiveObservationMs = $startupPassiveObservationMs
    startupObservationStartedAt = $startupObservationStartedAt
    startupObservationCompletedAt = $startupObservationCompletedAt
    startupStableSurfaceKind = $startupStableSurfaceKind
    explicitOpenEligibilityGranted = $explicitOpenEligibilityGranted
    startupLoadSignals = @($startupLoadSignals)
    moduleLoadedPreActionGuardCount = $moduleLoadedPreActionGuardCount
    blankFrameRestarted = $blankFrameRestarted
    blankFrameRestartBlocked = $blankFrameRestartBlocked
    allowSecondToolsetStart = $allowSecondToolsetStart
    welcomeHandled = $welcomeHandled
    welcomeProbe = $welcomeProbe
    elapsedMs = $elapsedMs
    moduleWindowTitle = $loaded.title
    moduleWindowHwnd = $loaded.hwnd
    expectedModuleParts = $expectedModuleParts
    modulePath = $modulePath
    timeoutMs = $moduleOpenTimeoutMs
  } | ConvertTo-Json -Depth 8
  exit 0
}

if ($null -ne $postLoadBlockingModal) {
  [pscustomobject]@{
    ok = $false
    blockerCode = $postLoadBlockingModal.blockerCode
    method = 'expected module frame loaded but Toolset still has a blocking modal, so area open is not safe'
    startedToolset = $startedToolset
    staleProcessCleanup = $staleProcessCleanup
    recoveryConfirmationHandled = $recoveryConfirmationHandled
    recoveryConfirmationHandledCount = $recoveryConfirmationHandledCount
    recoveryConfirmationProbe = $recoveryConfirmationProbe
    openModuleDialogRequested = $openModuleDialogRequested
    openModuleDialogHandled = $openModuleDialogHandled
    openModuleDialogHandledAt = $openModuleDialogHandledAt
    openModuleDialogProbe = $openModuleDialogProbe
    openModuleDialogResult = $openModuleDialogResult
    postLoadBlockingModal = $postLoadBlockingModal
    postSelectionBlockingModal = $postSelectionBlockingModal
    moduleOpenActionSubmitted = $moduleOpenActionSubmitted
    moduleOpenActionSubmittedAt = $moduleOpenActionSubmittedAt
    moduleOpenActionKind = $moduleOpenActionKind
    moduleLoadOwner = $moduleLoadOwner
    moduleLoadOwnershipClaimedAt = $moduleLoadOwnershipClaimedAt
    startupPassiveObservationMs = $startupPassiveObservationMs
    startupObservationStartedAt = $startupObservationStartedAt
    startupObservationCompletedAt = $startupObservationCompletedAt
    startupStableSurfaceKind = $startupStableSurfaceKind
    explicitOpenEligibilityGranted = $explicitOpenEligibilityGranted
    startupLoadSignals = @($startupLoadSignals)
    closedOpenModuleDialogCount = @($closedOpenModuleDialogs).Count
    closedOpenModuleDialogs = @($closedOpenModuleDialogs)
    closedStaleWelcomeDialogCount = @($closedStaleWelcomeDialogs).Count
    closedStaleWelcomeDialogs = @($closedStaleWelcomeDialogs)
    moduleLoadedPreActionGuardCount = $moduleLoadedPreActionGuardCount
    blankFrameRestarted = $blankFrameRestarted
    blankFrameRestartBlocked = $blankFrameRestartBlocked
    allowSecondToolsetStart = $allowSecondToolsetStart
    welcomeHandled = $welcomeHandled
    welcomeProbe = $welcomeProbe
    elapsedMs = $elapsedMs
    expectedModuleParts = $expectedModuleParts
    modulePath = $modulePath
    timeoutMs = $moduleOpenTimeoutMs
    topLevelToolsetWindows = Get-VisibleToolsetTopWindows
  } | ConvertTo-Json -Depth 8
  exit 0
}

$timeoutBlockerCode = 'expected_module_window_not_loaded'
$timeoutMethod = 'passive startup observation did not reach one clean module-ready state'
if ($moduleOpenActionSubmitted) {
  if ($null -ne $postSelectionBlockingModal) {
    $timeoutBlockerCode = $postSelectionBlockingModal.blockerCode
    $timeoutMethod = 'first module-open selection was submitted; second open/restart was blocked and the remaining modal/state timed out'
  } else {
    $timeoutBlockerCode = 'module_open_selection_submitted_but_expected_frame_not_loaded'
    $timeoutMethod = 'first module-open selection was submitted; second open/restart was blocked until timeout'
  }
}

[pscustomobject]@{
  ok = $false
  blockerCode = $timeoutBlockerCode
  method = $timeoutMethod
  startedToolset = $startedToolset
  staleProcessCleanup = $staleProcessCleanup
  recoveryConfirmationHandled = $recoveryConfirmationHandled
  recoveryConfirmationHandledCount = $recoveryConfirmationHandledCount
  recoveryConfirmationProbe = $recoveryConfirmationProbe
  openModuleDialogRequested = $openModuleDialogRequested
  openModuleDialogHandled = $openModuleDialogHandled
  openModuleDialogHandledAt = $openModuleDialogHandledAt
  openModuleDialogProbe = $openModuleDialogProbe
  openModuleDialogResult = $openModuleDialogResult
  postSelectionBlockingModal = $postSelectionBlockingModal
  moduleOpenActionSubmitted = $moduleOpenActionSubmitted
  moduleOpenActionSubmittedAt = $moduleOpenActionSubmittedAt
  moduleOpenActionKind = $moduleOpenActionKind
  moduleLoadOwner = $moduleLoadOwner
  moduleLoadOwnershipClaimedAt = $moduleLoadOwnershipClaimedAt
  startupPassiveObservationMs = $startupPassiveObservationMs
  startupObservationStartedAt = $startupObservationStartedAt
  startupObservationCompletedAt = $startupObservationCompletedAt
  startupStableSurfaceKind = $startupStableSurfaceKind
  explicitOpenEligibilityGranted = $explicitOpenEligibilityGranted
  startupLoadSignals = @($startupLoadSignals)
  moduleLoadedPreActionGuardCount = $moduleLoadedPreActionGuardCount
  blankFrameRestarted = $blankFrameRestarted
  blankFrameRestartBlocked = $blankFrameRestartBlocked
  allowSecondToolsetStart = $allowSecondToolsetStart
  welcomeHandled = $welcomeHandled
  welcomeProbe = $welcomeProbe
  elapsedMs = $elapsedMs
  expectedModuleParts = $expectedModuleParts
  modulePath = $modulePath
  timeoutMs = $moduleOpenTimeoutMs
  topLevelToolsetWindows = Get-VisibleToolsetTopWindows
} | ConvertTo-Json -Depth 8
`;

  const raw = runPowerShellScript(script, {
    encoding: "utf8",
    env: {
      ...process.env,
      AURORA_TOOLSET_EXE: toolsetExe,
      AURORA_TOOLSET_MODULE_PATH: modulePath,
      AURORA_TOOLSET_EXPECTED_MODULE_PARTS: expectedModuleParts.join("|"),
      AURORA_TOOLSET_STARTUP_LOAD_MODE: startupLoadPlan.mode,
      AURORA_TOOLSET_PLANNED_LOAD_OWNER: startupLoadPlan.loadOwner,
      AURORA_TOOLSET_OBSERVED_EXTERNAL_LOAD_OWNER: startupLoadPlan.observedExternalLoadOwner,
      AURORA_TOOLSET_STARTUP_PASSIVE_OBSERVATION_MS: String(startupLoadPlan.passiveObservationMs),
      AURORA_TOOLSET_MODULE_OPEN_TIMEOUT_MS: String(moduleOpenTimeoutMs),
    },
    maxBuffer: 1024 * 1024 * 8,
    timeout: moduleOpenTimeoutMs + 30_000
  }).trim();
  return JSON.parse(raw);
}
