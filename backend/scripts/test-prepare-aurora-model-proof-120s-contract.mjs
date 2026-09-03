#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import {
  bindExactNativeModuleList,
  classifyCanonicalViewportCandidates,
  cleanupOwnedEmptyPrepDirectories,
  createPrepOutputDirectories,
  classifyExactOpenDialogState,
  requireExactModuleListSelectionReadback,
  requireExactModuleOpenReadback,
  requirePrepChildSafety,
  validateFailedPrepCloseStartTimePrecisionContinuation,
  validateFailedPrepModuleLoadedModalCloseAdmission,
  validateExactInstalledMruLoadContinuation,
  validateUnexpectedModuleWindowPreActionResume,
  validateUnexpectedModuleWindowPostWelcomeDismissal,
  validateUnexpectedModuleWindowContinuation,
  validateVerifiedTemp0RecoveryContinuation,
  validateVerifiedTemp0RecoveryRetryEvidence,
  validatePrepOutputLayout,
} from "./lib/aurora-model-proof-120s-prep-contract.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const script = resolve(here, "prepare-aurora-model-proof-120s.mjs");
const root = mkdtempSync(resolve(tmpdir(), "aurora-model-proof-120s-prep-contract-"));
const artifacts = resolve(root, "artifacts");
const nativeRoot = resolve(root, "native", "Neverwinter Nights");
mkdirSync(artifacts, { recursive: true });

const sourceModule = writeBytes("lineage/generated/m2a_test.mod", Buffer.from("exact-module-bytes\n", "utf8"));
const installedModule = writeAbsoluteBytes(resolve(nativeRoot, "modules", "m2a_test.mod"), readFileSync(sourceModule.path));
const installedHak = writeAbsoluteBytes(resolve(nativeRoot, "hak", "m2a_test.hak"), Buffer.from("exact-hak-bytes\n", "utf8"));
const binaryProfile = writeJson("profiles/binary.json", {
  version: "aurora-toolset-binary-module-bootstrap-profile/v1",
  id: "m2a-test-binary",
  module: { resref: "m2a_test", path: sourceModule.path, sha256: sourceModule.sha256 },
  area: { resref: "m2a_area", width: 2, height: 2 },
  entryPoint: { area: "m2a_area", position: [10, 10, 0] },
  orderedHakList: [{ resref: "m2a_test", path: installedHak.path, sha256: installedHak.sha256 }],
  fixtures: [{ id: "m0_fixture", templateResRef: "nw_dwarfmerc001", appearanceType: 15100, position: [10, 14.5, 0] }],
  noLocalToolsetAdapter: true,
});
const toolsetProfile = writeJson("profiles/toolset.json", {
  version: "aurora-toolset-binary-module-toolset-proof-profile/v1",
  binaryProfile,
  fixtureSelection: { fixtureId: "m0_fixture", treeObjectText: "Meshy proof fixture", occurrence: 0 },
  capture: { targetClass: "TScrollBox", allowUniformScene: false },
  noSave: true,
});
const runtimeProfile = writeJson("profiles/runtime.json", {
  version: "aur-s07-runtime-profile/v1",
  module: { sha256: installedModule.sha256, area: "m2a_area", entryPoint: [10, 10, 0] },
  orderedHakList: [{ resref: "m2a_test", sha256: installedHak.sha256 }],
});
const routeManifest = writeJson("profiles/routes.json", {
  version: "aurora-model-proof-120s-route-manifest/v1",
  routes: [],
});
const profile = writeJson("profiles/model-proof.json", {
  version: "aurora-model-proof-120s-profile/v1",
  id: "m2a-test-model-proof-prep",
  hardLimitMs: 120000,
  binaryProfile,
  toolsetProfile,
  runtimeProfile,
  routeManifest,
  installedModule,
  orderedHakList: [{ resref: "m2a_test", ...installedHak }],
  resources: {
    mdl: { resref: "m2a_model", sha256: "1".repeat(64) },
    tga: { resref: "m2a_texture", sha256: "2".repeat(64) },
    appearance2da: { resref: "appearance", row: 15100, sha256: "3".repeat(64) },
  },
  area: { resref: "m2a_area", displayName: "Meshy2Aurora proof area", entryPoint: [10, 10, 0] },
  fixture: { id: "m0_fixture", templateResRef: "nw_dwarfmerc001", treeObjectText: "Meshy proof fixture", occurrence: 0, appearanceRow: 15100, position: [10, 14.5, 0] },
  runtime: { loadingModuleResref: "m2a_test", engineLogPath: resolve(nativeRoot, "logs", "nwclientLog1.txt") },
  entryMode: "adopt-exact-clean",
  outputRoot: resolve(root, "artifacts", "lineage", "live", "unused-timed-output"),
  policy: { noSave: true, noBuild: true, noRepack: true, noFocus: true, noCamera: true, noRetry: true },
});

const cold = fixture("cold.json", { nwmain: [], toolsets: [] });
const switched = fixture("switch.json", { nwmain: [], toolsets: [session("Other Module - other.mod")] });
const grayScreen = fixture("gray-screen.json", { nwmain: [], toolsets: [session("Meshy Module - m2a_test.mod")] });
const adopted = fixture("adopt.json", { nwmain: [], toolsets: [session("Meshy Module - m2a_test.mod", [{ resref: "m2a_area", title: "- m2a_area", viewports: [viewport(1400, 800, 9001)] }])] });
const twoRawOneCanonical = fixture("two-raw-one-canonical.json", { nwmain: [], toolsets: [session("Meshy Module - m2a_test.mod", [{ resref: "m2a_area", title: "- m2a_area", viewports: [viewport(260, 180, 9002), viewport(1400, 800, 9003)] }])] });

const outputContractRoot = resolve(root, "output-contract");
const outputLineage = resolve(outputContractRoot, "lineage");
mkdirSync(outputLineage, { recursive: true });
const nestedLive = resolve(outputLineage, "live");
const nestedPrep = resolve(nestedLive, "prep");
const nestedTimedOutput = resolve(nestedLive, "run");
const nestedLayout = validatePrepOutputLayout({ prepOutDir: nestedPrep, outputRoot: nestedTimedOutput, lineageParent: outputLineage });
assert.equal(existsSync(nestedLive), false, "layout validation must not create the missing immediate parent");
const nestedOwnership = createPrepOutputDirectories(nestedLayout);
assert.equal(existsSync(nestedLive), true, "prepare must create the exact missing immediate parent");
assert.equal(existsSync(nestedPrep), true, "prepare must create the exact prep directory");
assert.equal(existsSync(nestedTimedOutput), false, "prepare must preserve timed output absence");
assert.match(nestedOwnership.immediateParentIdentity?.volumeId ?? "", /^\d+$/u, "created parent must bind its volume identity");
assert.match(nestedOwnership.immediateParentIdentity?.fileId ?? "", /^\d+$/u, "created parent must bind its file identity");
assert.match(nestedOwnership.prepOutDirIdentity?.volumeId ?? "", /^\d+$/u, "created prep must bind its volume identity");
assert.match(nestedOwnership.prepOutDirIdentity?.fileId ?? "", /^\d+$/u, "created prep must bind its file identity");
cleanupOwnedEmptyPrepDirectories(nestedOwnership);
assert.equal(existsSync(nestedPrep), false, "owned empty prep directory must be cleaned");
assert.equal(existsSync(nestedLive), false, "owned empty immediate parent must be cleaned");

const existingLive = resolve(outputContractRoot, "existing-lineage", "live");
mkdirSync(existingLive, { recursive: true });
const existingPrep = resolve(existingLive, "prep");
mkdirSync(existingPrep);
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: existingPrep, outputRoot: resolve(existingLive, "run"), lineageParent: dirname(existingLive) }),
  "PREP_OUTPUT_EXISTS",
);
const existingTimedOutput = resolve(existingLive, "run-existing");
mkdirSync(existingTimedOutput);
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: resolve(existingLive, "prep-new"), outputRoot: existingTimedOutput, lineageParent: dirname(existingLive) }),
  "PREP_TIMED_OUTPUT_EXISTS",
);
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: resolve(existingLive, "same"), outputRoot: resolve(existingLive, "same"), lineageParent: dirname(existingLive) }),
  "PREP_OUTPUT_COLLISION",
);
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: resolve(outputContractRoot, "wrong", "live", "prep"), outputRoot: resolve(existingLive, "run-new"), lineageParent: dirname(existingLive) }),
  "PREP_OUTPUT_ROOT_PARENT_MISMATCH",
);
const wrongLineage = resolve(outputContractRoot, "wrong-lineage");
mkdirSync(wrongLineage);
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: resolve(existingLive, "prep-lineage"), outputRoot: resolve(existingLive, "run-lineage"), lineageParent: wrongLineage }),
  "PREP_OUTPUT_LINEAGE_MISMATCH",
);

const reparseTarget = resolve(outputContractRoot, "reparse-target");
const reparseLineage = resolve(outputContractRoot, "reparse-lineage");
mkdirSync(reparseTarget);
symlinkSync(reparseTarget, reparseLineage, "junction");
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: resolve(reparseLineage, "live", "prep"), outputRoot: resolve(reparseLineage, "live", "run"), lineageParent: reparseLineage }),
  "PREP_LINEAGE_PARENT_REPARSE_POINT",
);
const reparseParentLineage = resolve(outputContractRoot, "reparse-parent-lineage");
const reparseParentTarget = resolve(outputContractRoot, "reparse-parent-target");
mkdirSync(reparseParentLineage);
mkdirSync(reparseParentTarget);
symlinkSync(reparseParentTarget, resolve(reparseParentLineage, "live"), "junction");
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: resolve(reparseParentLineage, "live", "prep"), outputRoot: resolve(reparseParentLineage, "live", "run"), lineageParent: reparseParentLineage }),
  "PREP_OUTPUT_PARENT_REPARSE_POINT",
);

const danglingParentLineage = resolve(outputContractRoot, "dangling-parent-lineage");
const danglingParentTarget = resolve(outputContractRoot, "dangling-parent-target");
mkdirSync(danglingParentLineage);
mkdirSync(danglingParentTarget);
symlinkSync(danglingParentTarget, resolve(danglingParentLineage, "live"), "junction");
rmdirSync(danglingParentTarget);
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: resolve(danglingParentLineage, "live", "prep"), outputRoot: resolve(danglingParentLineage, "live", "run"), lineageParent: danglingParentLineage }),
  "PREP_OUTPUT_PARENT_REPARSE_POINT",
);

const danglingLeafLineage = resolve(outputContractRoot, "dangling-leaf-lineage");
const danglingLeafLive = resolve(danglingLeafLineage, "live");
mkdirSync(danglingLeafLive, { recursive: true });
const danglingPrepTarget = resolve(outputContractRoot, "dangling-prep-target");
mkdirSync(danglingPrepTarget);
symlinkSync(danglingPrepTarget, resolve(danglingLeafLive, "prep"), "junction");
rmdirSync(danglingPrepTarget);
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: resolve(danglingLeafLive, "prep"), outputRoot: resolve(danglingLeafLive, "run"), lineageParent: danglingLeafLineage }),
  "PREP_OUTPUT_REPARSE_POINT",
);
const danglingOutputTarget = resolve(outputContractRoot, "dangling-output-target");
mkdirSync(danglingOutputTarget);
symlinkSync(danglingOutputTarget, resolve(danglingLeafLive, "run"), "junction");
rmdirSync(danglingOutputTarget);
expectContractBlocked(
  () => validatePrepOutputLayout({ prepOutDir: resolve(danglingLeafLive, "prep-new"), outputRoot: resolve(danglingLeafLive, "run"), lineageParent: danglingLeafLineage }),
  "PREP_TIMED_OUTPUT_REPARSE_POINT",
);

const parentRaceLineage = resolve(outputContractRoot, "parent-race-lineage");
mkdirSync(parentRaceLineage);
const parentRaceLive = resolve(parentRaceLineage, "live");
const parentRaceLayout = validatePrepOutputLayout({ prepOutDir: resolve(parentRaceLive, "prep"), outputRoot: resolve(parentRaceLive, "run"), lineageParent: parentRaceLineage });
expectContractBlocked(
  () => createPrepOutputDirectories(parentRaceLayout, { beforeCreateImmediateParent: () => mkdirSync(parentRaceLive) }),
  "PREP_OUTPUT_PARENT_RACE",
);
assert.equal(existsSync(parentRaceLive), true, "a raced unowned parent must not be removed");

const prepRaceLineage = resolve(outputContractRoot, "prep-race-lineage");
mkdirSync(prepRaceLineage);
const prepRaceLive = resolve(prepRaceLineage, "live");
const prepRacePath = resolve(prepRaceLive, "prep");
const prepRaceLayout = validatePrepOutputLayout({ prepOutDir: prepRacePath, outputRoot: resolve(prepRaceLive, "run"), lineageParent: prepRaceLineage });
expectContractBlocked(
  () => createPrepOutputDirectories(prepRaceLayout, { beforeCreatePrepDir: () => mkdirSync(prepRacePath) }),
  "PREP_OUTPUT_RACE",
);
assert.equal(existsSync(prepRacePath), true, "a raced unowned prep directory must not be removed");

const outputRaceLineage = resolve(outputContractRoot, "output-race-lineage");
mkdirSync(outputRaceLineage);
const outputRaceLive = resolve(outputRaceLineage, "live");
const outputRacePrep = resolve(outputRaceLive, "prep");
const outputRaceTarget = resolve(outputRaceLive, "run");
const outputRaceLayout = validatePrepOutputLayout({ prepOutDir: outputRacePrep, outputRoot: outputRaceTarget, lineageParent: outputRaceLineage });
expectContractBlocked(
  () => createPrepOutputDirectories(outputRaceLayout, { afterCreatePrepDir: () => mkdirSync(outputRaceTarget) }),
  "PREP_TIMED_OUTPUT_RACE",
);
assert.equal(existsSync(outputRacePrep), false, "owned empty prep must be removed after a timed-output race");
assert.equal(existsSync(outputRaceLive), true, "parent containing a raced timed output must be preserved");

const cleanupLineage = resolve(outputContractRoot, "cleanup-lineage");
mkdirSync(cleanupLineage);
const cleanupLive = resolve(cleanupLineage, "live");
const cleanupPrep = resolve(cleanupLive, "prep");
const cleanupOwnership = createPrepOutputDirectories(validatePrepOutputLayout({ prepOutDir: cleanupPrep, outputRoot: resolve(cleanupLive, "run"), lineageParent: cleanupLineage }));
writeFileSync(resolve(cleanupPrep, "foreign-evidence.txt"), "preserve\n");
cleanupOwnedEmptyPrepDirectories(cleanupOwnership);
assert.equal(existsSync(cleanupPrep), true, "non-empty prep evidence must never be removed");
assert.equal(existsSync(cleanupLive), true, "an owned but non-empty parent must never be removed");
const preexistingCleanupLive = resolve(outputContractRoot, "preexisting-cleanup-lineage", "live");
mkdirSync(preexistingCleanupLive, { recursive: true });
const preexistingCleanupPrep = resolve(preexistingCleanupLive, "prep");
const preexistingCleanupOwnership = createPrepOutputDirectories(validatePrepOutputLayout({ prepOutDir: preexistingCleanupPrep, outputRoot: resolve(preexistingCleanupLive, "run"), lineageParent: dirname(preexistingCleanupLive) }));
cleanupOwnedEmptyPrepDirectories(preexistingCleanupOwnership);
assert.equal(existsSync(preexistingCleanupPrep), false, "owned empty prep below a pre-existing parent must be removed");
assert.equal(existsSync(preexistingCleanupLive), true, "a pre-existing immediate parent must never be removed");

const replacementLineage = resolve(outputContractRoot, "replacement-cleanup-lineage");
mkdirSync(replacementLineage);
const replacementLive = resolve(replacementLineage, "live");
const replacementPrep = resolve(replacementLive, "prep");
const replacementOwnership = createPrepOutputDirectories(validatePrepOutputLayout({ prepOutDir: replacementPrep, outputRoot: resolve(replacementLive, "run"), lineageParent: replacementLineage }));
rmdirSync(replacementPrep);
mkdirSync(replacementPrep);
expectContractBlocked(() => cleanupOwnedEmptyPrepDirectories(replacementOwnership), "PREP_CLEANUP_IDENTITY_MISMATCH");
assert.equal(existsSync(replacementPrep), true, "foreign replacement prep directory must be preserved");

assert.equal(plan(cold, "cold").decision.route, "cold");
assert.equal(plan(switched, "switch").decision.route, "switch");
assert.equal(plan(grayScreen, "gray-screen").decision.route, "load-area");
assert.equal(plan(adopted, "adopt").decision.route, "adopt");
assert.equal(plan(twoRawOneCanonical, "two-raw-one-canonical").decision.route, "adopt");
for (const name of ["cold", "switch", "gray-screen", "adopt", "two-raw-one-canonical"]) {
  assert.equal(existsSync(resolve(root, `prep-${name}`)), false, `dry-run created prep output: ${name}`);
}

expectBlocked(fixture("dirty.json", { nwmain: [], toolsets: [session("Other Module - other.mod*")] }), "PREP_DIRTY_MODULE_FRAME");
expectBlocked(fixture("modal.json", { nwmain: [], toolsets: [{ ...session("Other Module - other.mod"), modals: [{ className: "TdlgMessage", title: "Question", hwnd: 99 }] }] }), "PREP_UNEXPECTED_MODAL");
expectBlocked(fixture("second-toolset.json", { nwmain: [], toolsets: [session("One - one.mod", [], 1234), session("Two - two.mod", [], 5678)] }), "PREP_SECOND_TOOLSET_PROCESS");
expectBlocked(fixture("nwmain.json", { nwmain: [{ pid: 2468, startedAtUtc: "2026-07-22T00:00:00.000Z", responding: true }], toolsets: [] }), "PREP_NWN_PROCESS_PRESENT");
expectBlocked(fixture("two-canonical-viewports.json", { nwmain: [], toolsets: [session("Meshy Module - m2a_test.mod", [{ resref: "m2a_area", title: "- m2a_area", viewports: [viewport(900, 700, 9004), viewport(1400, 800, 9005)] }])] }), "PREP_EXACT_AREA_VIEWPORT_COUNT_INVALID");
const installedBytes = readFileSync(installedModule.path);
writeFileSync(installedModule.path, Buffer.alloc(installedBytes.length, 0x78));
expectBlocked(cold, "PREP_ARTIFACT_HASH_MISMATCH");
writeFileSync(installedModule.path, installedBytes);

const exactList = bindExactNativeModuleList({
  items: ["other", "m2a_test", "third"],
  installedModulePath: installedModule.path,
  engineLogPath: resolve(nativeRoot, "logs", "nwclientLog1.txt"),
});
assert.equal(exactList.targetText, "m2a_test");
assert.equal(exactList.targetIndex, 1);
assert.throws(
  () => bindExactNativeModuleList({ items: ["m2a_test", "m2a_test.mod"], installedModulePath: installedModule.path, engineLogPath: resolve(nativeRoot, "logs", "nwclientLog1.txt") }),
  (error) => error.code === "PREP_NATIVE_MODULE_LIST_AMBIGUOUS",
);
assert.throws(
  () => bindExactNativeModuleList({ items: ["m2a_test"], installedModulePath: resolve(root, "wrong-directory", "m2a_test.mod"), engineLogPath: resolve(nativeRoot, "logs", "nwclientLog1.txt") }),
  (error) => error.code === "PREP_INSTALLED_MODULE_DIRECTORY_MISMATCH",
);
const unavailableEditAccepted = requireExactModuleOpenReadback(
  { processId: 1234, moduleName: "m2a_test", editReadback: "", editReadbackUnavailable: true, titleAfter: "Meshy - m2a_test.mod" },
  { processId: 1234, moduleStem: "m2a_test", moduleFileName: "m2a_test.mod", listSelectionVerified: true },
);
assert.equal(unavailableEditAccepted.editReadbackFallback, true);
assert.equal(unavailableEditAccepted.fallbackReason, "legacy_vcl_tedit_getwindowtext_unavailable");
assert.throws(
  () => requireExactModuleOpenReadback({ processId: 1234, moduleName: "m2a_test", editReadback: "", editReadbackUnavailable: true, titleAfter: "Meshy - m2a_test.mod" }, { processId: 1234, moduleStem: "m2a_test", moduleFileName: "m2a_test.mod", listSelectionVerified: false }),
  (error) => error.code === "PREP_MODULE_EDIT_FALLBACK_WITHOUT_LIST_EVIDENCE",
);
assert.throws(
  () => requireExactModuleOpenReadback({ processId: 1234, moduleName: "m2a_test", editReadback: "", editReadbackUnavailable: true, titleAfter: "Meshy - wrong.mod" }, { processId: 1234, moduleStem: "m2a_test", moduleFileName: "m2a_test.mod", listSelectionVerified: true }),
  (error) => error.code === "PREP_SWITCH_TARGET_TITLE_MISMATCH",
);
assert.throws(
  () => requireExactModuleListSelectionReadback({ processId: 1234, targetText: "m2a_test", targetIndex: 1, afterIndex: 0, itemCount: 3 }, { targetText: "m2a_test", targetIndex: 1, itemCount: 3 }, 1234),
  (error) => error.code === "PREP_MODULE_LIST_SELECTION_READBACK_MISMATCH",
);
assert.throws(
  () => requirePrepChildSafety({ safety: { usesGlobalInput: false } }, "forged-child"),
  (error) => error.code === "PREP_ATOM_SAFETY_FIELD_MISSING",
);
const exactSafety = Object.fromEntries(["usesGlobalInput", "usesGlobalCursor", "usesGlobalKeyboard", "usesGlobalMouse", "usesGlobalMouseWheel", "savesModule", "changesIniOrMru"].map((field) => [field, false]));
assert.equal(requirePrepChildSafety({ safety: exactSafety }, "complete-child").safety.savesModule, false);
assert.equal(classifyCanonicalViewportCandidates([viewport(200, 100, 1), viewport(800, 600, 2)]).canonicalCount, 1);

const continuationPrepOutDir = resolve(root, "artifacts", "lineage", "live", "failed-cold-prep");
const continuationColdOutDir = resolve(continuationPrepOutDir, "cold-open");
mkdirSync(continuationColdOutDir, { recursive: true });
const continuationInitialState = { version: "aurora-model-proof-120s-prep-state/v1", capturedAtUtc: "2026-07-22T16:17:00.000Z", nwmain: [], toolsets: [] };
const continuationOriginalPlan = {
  version: "aurora-model-proof-120s-prep-plan/v1",
  createdAtUtc: "2026-07-22T16:17:00.000Z",
  profile: { path: profile.path, sha256: profile.sha256, id: "m2a-test-model-proof-prep" },
  target: { moduleResref: "m2a_test", moduleName: "m2a_test.mod", installedModulePath: installedModule.path, areaResref: "m2a_area" },
  decision: { route: "cold", reason: "zero_toolset_processes", processId: null, currentModule: null },
};
writeFileSync(resolve(continuationPrepOutDir, "state-before.json"), `${JSON.stringify(continuationInitialState, null, 2)}\n`, "utf8");
writeFileSync(resolve(continuationPrepOutDir, "plan.json"), `${JSON.stringify(continuationOriginalPlan, null, 2)}\n`, "utf8");
const exactLiveFailureState = {
  version: "aurora-model-proof-120s-prep-state-fixture/v1",
  capturedAtUtc: "2026-07-22T16:17:16.000Z",
  nwmain: [],
  toolsets: [session("BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - m2a_m0r31.mod", [], 4980)],
};
exactLiveFailureState.toolsets[0].frame.hwnd = 78121902;
const exactLiveFailureManifest = unexpectedModuleWindowFailureManifest({
  artifactDir: continuationColdOutDir,
  binaryProfile,
  sourceModule,
  installedModule,
  processId: 4980,
  wrongTitle: exactLiveFailureState.toolsets[0].frame.title,
});
const continuationManifestPath = resolve(continuationColdOutDir, "binary-native-geometry-manifest.json");
writeFileSync(continuationManifestPath, `${JSON.stringify(exactLiveFailureManifest, null, 2)}\n`, "utf8");
const continuationTarget = {
  moduleResref: "m2a_test",
  moduleName: "m2a_test.mod",
  sourceModulePath: sourceModule.path,
  installedModulePath: installedModule.path,
  installedModuleSha256: installedModule.sha256,
  areaResref: "m2a_area",
};
const validateContinuationManifest = (failureManifest, state = exactLiveFailureState) => (
  validateUnexpectedModuleWindowContinuation({
    failureManifest,
    failureManifestPath: continuationManifestPath,
    prepPlan: continuationOriginalPlan,
    initialState: continuationInitialState,
    prepOutDir: continuationPrepOutDir,
    profilePath: profile.path,
    profileSha256: profile.sha256,
    profileId: "m2a-test-model-proof-prep",
    binaryProfilePath: binaryProfile.path,
    binaryProfileSha256: binaryProfile.sha256,
    target: continuationTarget,
    state,
  })
);
const continuationAdmission = validateContinuationManifest(exactLiveFailureManifest);
assert.equal(continuationAdmission.processId, 4980);
assert.equal(continuationAdmission.currentModule, "m2a_m0r31.mod");
assert.equal(continuationAdmission.failureManifestPath, continuationManifestPath);
assert.equal(continuationAdmission.failureLoadOwner, "external");

const exactExplicitOpenFailureManifest = structuredClone(exactLiveFailureManifest);
const exactExplicitOpenChild = exactExplicitOpenFailureManifest.openFailure.child.childResult;
exactExplicitOpenChild.moduleLoadOwner = "explicit_open";
exactExplicitOpenChild.moduleLoadOwnershipClaimedAt = `/Date(${Date.parse("2026-07-22T00:00:05.000Z")})/`;
exactExplicitOpenChild.openModuleDialogHandled = true;
exactExplicitOpenChild.openModuleDialogHandledAt = `/Date(${Date.parse("2026-07-22T00:00:05.000Z")})/`;
exactExplicitOpenChild.welcomeProbe = {
  hwnd: 2099842,
  title: "BioWare Aurora Neverwinter Nights Toolset",
  startNormallyRadioHwnd: 68502,
  openRadioHwnd: 68498,
  okButtonHwnd: 74582742,
  childTexts: ["Start normally", "Open an existing Module", "Cancel", "OK"],
};
exactExplicitOpenChild.welcomeActionResult = {
  ok: true,
  startNormallyBefore: 0,
  startNormallyAfterSetCheck: 0,
  startNormallyAfterClick: 0,
  setCheckReadback: 1,
  radioCheckReadback: 1,
  okPosted: true,
};
exactExplicitOpenChild.openModuleDialogResult = {
  ok: true,
  listCount: 109,
  moduleListIndex: 74,
  selectedItemText: "m2a_test",
  matchedBy: "expected_module_exact_text",
  selected: 74,
  dialog: {
    hwnd: 7604720,
    title: "Open",
    listBoxHwnd: 68506,
    openButtonHwnd: 134040,
  },
};
exactExplicitOpenChild.topLevelToolsetWindows = [
  {
    hwnd: 2099842,
    title: "BioWare Aurora Neverwinter Nights Toolset",
    className: "TdlgWelcome",
    processId: 4980,
    visible: true,
    responding: true,
  },
  exactLiveFailureManifest.openFailure.child.childResult.topLevelToolsetWindows,
];
exactExplicitOpenFailureManifest.openFailure.postChildWindows.windows.unshift({
  hwnd: 2099842,
  className: "TdlgWelcome",
  text: "BioWare Aurora Neverwinter Nights Toolset",
});
const explicitOpenContinuationAdmission = validateContinuationManifest(exactExplicitOpenFailureManifest);
assert.equal(explicitOpenContinuationAdmission.processId, 4980);
assert.equal(explicitOpenContinuationAdmission.currentModule, "m2a_m0r31.mod");
assert.equal(explicitOpenContinuationAdmission.failureLoadOwner, "explicit_open");
assert.equal(explicitOpenContinuationAdmission.welcomeResidue, null);

const exactWelcomeResidueState = structuredClone(exactLiveFailureState);
exactWelcomeResidueState.toolsets[0].modals = [{
  hwnd: 2099842,
  className: "TdlgWelcome",
  title: "BioWare Aurora Neverwinter Nights Toolset",
}];
const welcomeResidueAdmission = validateContinuationManifest(exactExplicitOpenFailureManifest, exactWelcomeResidueState);
assert.deepEqual(welcomeResidueAdmission.welcomeResidue, {
  processId: 4980,
  startedAtUtc: "2026-07-22T00:00:00.000Z",
  hwnd: 2099842,
  className: "TdlgWelcome",
  title: "BioWare Aurora Neverwinter Nights Toolset",
});

const exactWelcomeDismissalResult = {
  ok: true,
  processId: 4980,
  startedAtUtc: "2026-07-22T00:00:00.000Z",
  dialogHwnd: 2099842,
  buttonHwnd: 74582741,
  className: "TdlgWelcome",
  title: "BioWare Aurora Neverwinter Nights Toolset",
  command: "Cancel",
  matchingBefore: 1,
  matchingAfter: 0,
  safety: exactSafety,
};
const postWelcomeState = structuredClone(exactLiveFailureState);
const postWelcomeAdmission = validateUnexpectedModuleWindowPostWelcomeDismissal({
  admission: welcomeResidueAdmission,
  dismissalResult: exactWelcomeDismissalResult,
  state: postWelcomeState,
});
assert.equal(postWelcomeAdmission.processId, 4980);
assert.equal(postWelcomeAdmission.currentModule, "m2a_m0r31.mod");
assert.equal(postWelcomeAdmission.welcomeDismissed.hwnd, 2099842);

const preActionPriorEvidence = {
  initialState: { path: resolve(continuationPrepOutDir, "state-before.json"), sha256: "1".repeat(64), byteLength: 100 },
  originalPlan: { path: resolve(continuationPrepOutDir, "plan.json"), sha256: "2".repeat(64), byteLength: 200 },
  failureManifest: { path: continuationManifestPath, sha256: "3".repeat(64), byteLength: 300 },
};
const preActionPriorPlan = {
  version: "aurora-model-proof-120s-prep-continuation-plan/v1",
  command: "continue-unexpected-module-window",
  createdAtUtc: "2026-07-22T00:00:06.000Z",
  profile: { path: profile.path, sha256: profile.sha256, id: "m2a-test-model-proof-prep" },
  prepOutDir: continuationPrepOutDir,
  target: continuationOriginalPlan.target,
  failureToRecovery: preActionPriorEvidence,
  admission: {
    version: welcomeResidueAdmission.version,
    processId: welcomeResidueAdmission.processId,
    startedAtUtc: welcomeResidueAdmission.startedAtUtc,
    frameHwnd: welcomeResidueAdmission.frameHwnd,
    frameTitle: welcomeResidueAdmission.frameTitle,
    currentModule: welcomeResidueAdmission.currentModule,
    targetModule: welcomeResidueAdmission.targetModule,
    areaResref: welcomeResidueAdmission.areaResref,
    welcomeResidue: welcomeResidueAdmission.welcomeResidue,
  },
  currentState: exactWelcomeResidueState,
  safety: {
    startsToolset: false,
    startsNwn: false,
    usesGlobalInput: false,
    savesModule: false,
    buildsModule: false,
    changesIniOrMru: false,
    changesCamera: false,
  },
};
const preActionPriorPlanIdentity = {
  path: resolve(continuationPrepOutDir, "continuation-plan.json"),
  sha256: "4".repeat(64),
  byteLength: 400,
};
const preActionPriorBlocker = {
  version: "aurora-model-proof-120s-prep-continuation-blocker/v1",
  status: "failed",
  createdAtUtc: "2026-07-22T00:00:07.000Z",
  profile: preActionPriorPlan.profile,
  prepOutDir: continuationPrepOutDir,
  processId: 4980,
  failureToRecovery: preActionPriorEvidence,
  continuationPlan: preActionPriorPlanIdentity,
  blockerCode: "PREP_ATOM_JSON_INVALID",
  message: "close-aurora-toolset-dialog-no-global-input.mjs: ParserError FullyQualifiedErrorId : InvalidVariableReferenceWithDrive",
  safety: preActionPriorPlan.safety,
};
const preActionResume = validateUnexpectedModuleWindowPreActionResume({
  admission: welcomeResidueAdmission,
  prepOutDir: continuationPrepOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  target: continuationTarget,
  expectedFailureToRecovery: preActionPriorEvidence,
  priorPlan: preActionPriorPlan,
  priorPlanIdentity: preActionPriorPlanIdentity,
  priorBlocker: preActionPriorBlocker,
  priorBlockerIdentity: {
    path: resolve(continuationPrepOutDir, "continuation-blocker.json"),
    sha256: "5".repeat(64),
    byteLength: 500,
  },
});
assert.equal(preActionResume.attempt, "pre-action-resume");
assert.equal(preActionResume.actionPreviouslySubmitted, false);
for (const [name, mutate, blockerCode] of [
  ["wrong-blocker", (blocker) => { blocker.blockerCode = "PREP_ATOM_REJECTED"; }, "PREP_CONTINUATION_PRE_ACTION_RESUME_BLOCKER_MISMATCH"],
  ["non-parser-message", (blocker) => { blocker.message = "close-aurora-toolset-dialog-no-global-input.mjs: unrelated"; }, "PREP_CONTINUATION_PRE_ACTION_RESUME_BLOCKER_MISMATCH"],
  ["forged-plan-command", (_blocker, plan) => { plan.command = "continue-unexpected-module-window-pre-action-resume"; }, "PREP_CONTINUATION_PRE_ACTION_RESUME_PLAN_MISMATCH"],
]) {
  const changedBlocker = structuredClone(preActionPriorBlocker);
  const changedPlan = structuredClone(preActionPriorPlan);
  mutate(changedBlocker, changedPlan);
  expectContractBlocked(() => validateUnexpectedModuleWindowPreActionResume({
    admission: welcomeResidueAdmission,
    prepOutDir: continuationPrepOutDir,
    profilePath: profile.path,
    profileSha256: profile.sha256,
    profileId: "m2a-test-model-proof-prep",
    target: continuationTarget,
    expectedFailureToRecovery: preActionPriorEvidence,
    priorPlan: changedPlan,
    priorPlanIdentity: preActionPriorPlanIdentity,
    priorBlocker: changedBlocker,
    priorBlockerIdentity: {
      path: resolve(continuationPrepOutDir, "continuation-blocker.json"),
      sha256: "5".repeat(64),
      byteLength: 500,
    },
  }), blockerCode, name);
}

for (const [name, mutateManifest, mutateState, blockerCode] of [
  ["probe-hwnd-drift", (manifest) => { manifest.openFailure.child.childResult.welcomeProbe.hwnd += 1; }, null, "PREP_CONTINUATION_WELCOME_RESIDUE_NOT_BOUND"],
  ["welcome-action-not-posted", (manifest) => { manifest.openFailure.child.childResult.welcomeActionResult.okPosted = false; }, null, "PREP_CONTINUATION_WELCOME_RESIDUE_NOT_BOUND"],
  ["current-welcome-hwnd-drift", null, (state) => { state.toolsets[0].modals[0].hwnd += 1; }, "PREP_CONTINUATION_WELCOME_RESIDUE_NOT_BOUND"],
  ["extra-current-modal", null, (state) => { state.toolsets[0].modals.push({ hwnd: 90, className: "TdlgMessage", title: "Question" }); }, "PREP_CONTINUATION_UNEXPECTED_MODAL"],
  ["second-immutable-welcome", (manifest) => { manifest.openFailure.child.childResult.topLevelToolsetWindows.unshift({ ...manifest.openFailure.child.childResult.topLevelToolsetWindows[0], hwnd: 2099843 }); }, null, "PREP_CONTINUATION_WELCOME_RESIDUE_NOT_BOUND"],
]) {
  const changedManifest = structuredClone(exactExplicitOpenFailureManifest);
  const changedState = structuredClone(exactWelcomeResidueState);
  mutateManifest?.(changedManifest);
  mutateState?.(changedState);
  expectContractBlocked(
    () => validateContinuationManifest(changedManifest, changedState),
    blockerCode,
    name,
  );
}
expectContractBlocked(
  () => validateContinuationManifest(exactLiveFailureManifest, exactWelcomeResidueState),
  "PREP_CONTINUATION_UNEXPECTED_MODAL",
);

for (const [name, mutateResult, mutateState, blockerCode] of [
  ["dismiss-wrong-hwnd", (result) => { result.dialogHwnd += 1; }, null, "PREP_CONTINUATION_WELCOME_DISMISSAL_RESULT_MISMATCH"],
  ["dismiss-not-confirmed", (result) => { result.matchingAfter = 1; }, null, "PREP_CONTINUATION_WELCOME_DISMISSAL_RESULT_MISMATCH"],
  ["modal-remains", null, (state) => { state.toolsets[0].modals = structuredClone(exactWelcomeResidueState.toolsets[0].modals); }, "PREP_CONTINUATION_WELCOME_DISMISSAL_POSTCONDITION_FAILED"],
  ["frame-drift-after-dismiss", null, (state) => { state.toolsets[0].frame.hwnd += 1; }, "PREP_CONTINUATION_WELCOME_DISMISSAL_POSTCONDITION_FAILED"],
]) {
  const changedResult = structuredClone(exactWelcomeDismissalResult);
  const changedState = structuredClone(postWelcomeState);
  mutateResult?.(changedResult);
  mutateState?.(changedState);
  expectContractBlocked(
    () => validateUnexpectedModuleWindowPostWelcomeDismissal({
      admission: welcomeResidueAdmission,
      dismissalResult: changedResult,
      state: changedState,
    }),
    blockerCode,
    name,
  );
}

for (const [name, mutate, blockerCode] of [
  ["wrong-selection", (child) => { child.openModuleDialogResult.selectedItemText = "other"; }, "PREP_CONTINUATION_EXPLICIT_OPEN_SELECTION_MISMATCH"],
  ["wrong-match-mode", (child) => { child.openModuleDialogResult.matchedBy = "substring"; }, "PREP_CONTINUATION_EXPLICIT_OPEN_SELECTION_MISMATCH"],
  ["selection-index-drift", (child) => { child.openModuleDialogResult.selected = 73; }, "PREP_CONTINUATION_EXPLICIT_OPEN_SELECTION_MISMATCH"],
  ["dialog-not-handled", (child) => { child.openModuleDialogHandled = false; }, "PREP_CONTINUATION_CHILD_BINDING_MISMATCH"],
  ["unknown-owner", (child) => { child.moduleLoadOwner = "unknown"; }, "PREP_CONTINUATION_CHILD_BINDING_MISMATCH"],
  ["second-frame", (child) => { child.topLevelToolsetWindows.push({ ...child.topLevelToolsetWindows[1], hwnd: 78121903, title: "Other - other.mod" }); }, "PREP_CONTINUATION_FAILED_WINDOW_INVALID"],
]) {
  const changed = structuredClone(exactExplicitOpenFailureManifest);
  mutate(changed.openFailure.child.childResult);
  expectContractBlocked(
    () => validateContinuationManifest(changed),
    blockerCode,
    name,
  );
}

for (const [blockerCode, mutate] of [
  ["PREP_CONTINUATION_DIRTY_MODULE_FRAME", (state) => { state.toolsets[0].frame.title += "*"; }],
  ["PREP_CONTINUATION_UNEXPECTED_MODAL", (state) => { state.toolsets[0].modals = [{ className: "TdlgMessage", title: "Question", hwnd: 91 }]; }],
  ["PREP_CONTINUATION_PID_MISMATCH", (state) => { state.toolsets[0].pid = 4999; }],
  ["PREP_CONTINUATION_SECOND_TOOLSET_PROCESS", (state) => { state.toolsets.push(session("Other - other.mod", [], 5000)); }],
]) {
  const changedState = structuredClone(exactLiveFailureState);
  mutate(changedState);
  expectContractBlocked(() => validateUnexpectedModuleWindowContinuation({
    failureManifest: exactLiveFailureManifest,
    failureManifestPath: continuationManifestPath,
    prepPlan: continuationOriginalPlan,
    initialState: continuationInitialState,
    prepOutDir: continuationPrepOutDir,
    profilePath: profile.path,
    profileSha256: profile.sha256,
    profileId: "m2a-test-model-proof-prep",
    binaryProfilePath: binaryProfile.path,
    binaryProfileSha256: binaryProfile.sha256,
    target: continuationTarget,
    state: changedState,
  }), blockerCode);
}
const wrongTargetHashManifest = structuredClone(exactLiveFailureManifest);
wrongTargetHashManifest.module.sha256 = "f".repeat(64);
expectContractBlocked(() => validateUnexpectedModuleWindowContinuation({
  failureManifest: wrongTargetHashManifest,
  failureManifestPath: continuationManifestPath,
  prepPlan: continuationOriginalPlan,
  initialState: continuationInitialState,
  prepOutDir: continuationPrepOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  binaryProfilePath: binaryProfile.path,
  binaryProfileSha256: binaryProfile.sha256,
  target: continuationTarget,
  state: exactLiveFailureState,
}), "PREP_CONTINUATION_TARGET_HASH_MISMATCH");

const wrongChildModulePathManifest = structuredClone(exactLiveFailureManifest);
wrongChildModulePathManifest.openFailure.child.childResult.modulePath = sourceModule.path;
expectContractBlocked(() => validateUnexpectedModuleWindowContinuation({
  failureManifest: wrongChildModulePathManifest,
  failureManifestPath: continuationManifestPath,
  prepPlan: continuationOriginalPlan,
  initialState: continuationInitialState,
  prepOutDir: continuationPrepOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  binaryProfilePath: binaryProfile.path,
  binaryProfileSha256: binaryProfile.sha256,
  target: continuationTarget,
  state: exactLiveFailureState,
}), "PREP_CONTINUATION_CHILD_BINDING_MISMATCH");

const wrongGuardModulePathManifest = structuredClone(exactLiveFailureManifest);
wrongGuardModulePathManifest.openFailure.child.childResult.moduleOpenSessionGuard.modulePath = sourceModule.path;
expectContractBlocked(() => validateUnexpectedModuleWindowContinuation({
  failureManifest: wrongGuardModulePathManifest,
  failureManifestPath: continuationManifestPath,
  prepPlan: continuationOriginalPlan,
  initialState: continuationInitialState,
  prepOutDir: continuationPrepOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  binaryProfilePath: binaryProfile.path,
  binaryProfileSha256: binaryProfile.sha256,
  target: continuationTarget,
  state: exactLiveFailureState,
}), "PREP_CONTINUATION_EXPLICIT_ACTION_ALREADY_SUBMITTED");

const exactMruPrepOutDir = resolve(root, "artifacts", "lineage", "live", "failed-exact-installed-mru-prep");
const exactMruColdOutDir = resolve(exactMruPrepOutDir, "cold-open");
mkdirSync(exactMruColdOutDir, { recursive: true });
const exactMruProcessId = 4981;
const exactMruStartedAtUtc = "2026-07-22T00:00:00.125Z";
const exactMruFrameHwnd = 78121910;
const exactMruFrameTitle = "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - m2a_test.mod";
const exactMruState = {
  version: "aurora-model-proof-120s-prep-state-fixture/v1",
  capturedAtUtc: "2026-07-22T16:18:16.000Z",
  nwmain: [],
  toolsets: [{
    ...session(exactMruFrameTitle, [], exactMruProcessId),
    startedAtUtc: exactMruStartedAtUtc,
    frame: {
      hwnd: exactMruFrameHwnd,
      className: "TfrmFrame",
      title: exactMruFrameTitle,
      monitor: { deviceName: "\\\\.\\DISPLAY1", primary: false },
    },
    modals: [],
    areaViewers: [],
  }],
};
const exactMruFailureManifest = exactInstalledMruLoadFailureManifest({
  artifactDir: exactMruColdOutDir,
  binaryProfile,
  sourceModule,
  installedModule,
  processId: exactMruProcessId,
  startedAtUtc: exactMruStartedAtUtc,
  frameHwnd: exactMruFrameHwnd,
  frameTitle: exactMruFrameTitle,
});
const exactMruManifestPath = resolve(exactMruColdOutDir, "binary-native-geometry-manifest.json");
writeFileSync(resolve(exactMruPrepOutDir, "state-before.json"), `${JSON.stringify(continuationInitialState, null, 2)}\n`, "utf8");
writeFileSync(resolve(exactMruPrepOutDir, "plan.json"), `${JSON.stringify(continuationOriginalPlan, null, 2)}\n`, "utf8");
writeFileSync(exactMruManifestPath, `${JSON.stringify(exactMruFailureManifest, null, 2)}\n`, "utf8");
const exactMruStateFixture = fixture("exact-installed-mru-live.json", {
  nwmain: exactMruState.nwmain,
  toolsets: exactMruState.toolsets,
});
const exactMruAdmissionInput = {
  failureManifest: exactMruFailureManifest,
  failureManifestPath: exactMruManifestPath,
  prepPlan: continuationOriginalPlan,
  initialState: continuationInitialState,
  prepOutDir: exactMruPrepOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  binaryProfilePath: binaryProfile.path,
  binaryProfileSha256: binaryProfile.sha256,
  target: continuationTarget,
  state: exactMruState,
  timedOutputAbsent: true,
};
const exactMruAdmission = validateExactInstalledMruLoadContinuation(exactMruAdmissionInput);
assert.equal(exactMruAdmission.processId, exactMruProcessId);
assert.equal(exactMruAdmission.startedAtUtc, exactMruStartedAtUtc);
assert.equal(exactMruAdmission.frameHwnd, exactMruFrameHwnd);
assert.equal(exactMruAdmission.moduleLoadOwner, "mru");
assert.equal(exactMruAdmission.targetModule, "m2a_test.mod");
const exactMruDryRun = spawnSync(process.execPath, [
  script,
  "continue-exact-installed-mru-load-dry-run",
  "--profile", profile.path,
  "--prepOutDir", exactMruPrepOutDir,
  "--stateFixture", exactMruStateFixture,
], {
  cwd: resolve(here, "..", ".."),
  encoding: "utf8",
  windowsHide: true,
});
assert.equal(exactMruDryRun.status, 0, exactMruDryRun.stderr || exactMruDryRun.stdout);
const exactMruDryRunPacket = JSON.parse(exactMruDryRun.stdout);
assert.equal(exactMruDryRunPacket.ok, true);
assert.equal(exactMruDryRunPacket.status, "aurora_model_proof_120s_exact_installed_mru_load_continuation_planned");
assert.equal(exactMruDryRunPacket.processId, exactMruProcessId);
assert.equal(exactMruDryRunPacket.moduleLoadOwner, "mru");
assert.equal(existsSync(resolve(exactMruPrepOutDir, "exact-installed-mru-continuation-plan.json")), false);
const exactMruLiveFixtureRejected = spawnSync(process.execPath, [
  script,
  "continue-exact-installed-mru-load",
  "--profile", profile.path,
  "--prepOutDir", exactMruPrepOutDir,
  "--stateFixture", exactMruStateFixture,
], {
  cwd: resolve(here, "..", ".."),
  encoding: "utf8",
  windowsHide: true,
});
assert.notEqual(exactMruLiveFixtureRejected.status, 0);
assert.equal(JSON.parse(exactMruLiveFixtureRejected.stdout).blockerCode, "PREP_STATE_FIXTURE_LIVE_FORBIDDEN");

for (const [blockerCode, mutate] of [
  ["PREP_EXACT_MRU_FAILURE_NOT_ADMITTED", ({ manifest }) => { manifest.blockerCode = "unexpected_module_window_loaded"; }],
  ["PREP_EXACT_MRU_LOAD_OWNER_INVALID", ({ manifest }) => { manifest.openFailure.child.moduleOpen.moduleLoadOwner = "explicit_open"; }],
  ["PREP_EXACT_MRU_ACTION_ALREADY_SUBMITTED", ({ manifest }) => { manifest.openFailure.child.moduleOpen.moduleOpenActionSubmitted = true; }],
  ["PREP_EXACT_MRU_ACTION_ALREADY_SUBMITTED", ({ manifest }) => { manifest.openFailure.child.moduleOpen.openModuleDialogProbe = { hwnd: 80 }; }],
  ["PREP_EXACT_MRU_ACTION_ALREADY_SUBMITTED", ({ manifest }) => { manifest.openFailure.child.moduleOpen.moduleLoadedPreActionGuardCount = 1; }],
  ["PREP_EXACT_MRU_INSTALLED_PATH_MISMATCH", ({ manifest }) => { manifest.startupAdmission.startupMru.currentMru0 = sourceModule.path; }],
  ["PREP_EXACT_MRU_DIRTY_FRAME", ({ state }) => { state.toolsets[0].frame.title += "*"; }],
  ["PREP_EXACT_MRU_UNEXPECTED_MODAL", ({ state }) => { state.toolsets[0].modals = [{ hwnd: 77, className: "TdlgMessage", title: "Question" }]; }],
  ["PREP_EXACT_MRU_AREA_ALREADY_PRESENT", ({ state }) => { state.toolsets[0].areaViewers = [{ hwnd: 78, resref: "m2a_area", title: "- m2a_area", viewports: [] }]; }],
  ["PREP_EXACT_MRU_PROCESS_START_MISMATCH", ({ state }) => { state.toolsets[0].startedAtUtc = "2026-07-22T00:00:00.126Z"; }],
  ["PREP_EXACT_MRU_FRAME_HWND_MISMATCH", ({ state }) => { state.toolsets[0].frame.hwnd += 1; }],
  ["PREP_EXACT_MRU_NWN_PRESENT", ({ state }) => { state.nwmain = [{ pid: 99, startedAtUtc: exactMruStartedAtUtc, responding: true }]; }],
  ["PREP_EXACT_MRU_MUTATION_EVIDENCE_INVALID", ({ manifest }) => { manifest.nativeSave = { ok: true }; }],
  ["PREP_EXACT_MRU_TIMED_OUTPUT_EXISTS", ({ input }) => { input.timedOutputAbsent = false; }],
]) {
  const input = structuredClone(exactMruAdmissionInput);
  mutate({ input, manifest: input.failureManifest, state: input.state });
  expectContractBlocked(() => validateExactInstalledMruLoadContinuation(input), blockerCode);
}

const failedPrepCloseOutDir = resolve(root, "artifacts", "lineage", "live", "failed-module-modal-prep");
const failedPrepCloseColdOutDir = resolve(failedPrepCloseOutDir, "cold-open");
mkdirSync(failedPrepCloseColdOutDir, { recursive: true });
writeFileSync(resolve(failedPrepCloseOutDir, "state-before.json"), `${JSON.stringify(continuationInitialState, null, 2)}\n`, "utf8");
writeFileSync(resolve(failedPrepCloseOutDir, "plan.json"), `${JSON.stringify(continuationOriginalPlan, null, 2)}\n`, "utf8");
const failedPrepCloseProcessId = 4982;
const failedPrepCloseStartedAtUtc = "2026-07-22T00:00:01.000Z";
const failedPrepCloseFrameHwnd = 78121920;
const failedPrepCloseModalHwnd = 78121921;
const failedPrepCloseFrameTitle = "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17";
const failedPrepCloseModal = {
  hwnd: failedPrepCloseModalHwnd,
  processId: failedPrepCloseProcessId,
  title: "BioWare Aurora Neverwinter Nights Toolset: Loading Custom Palettes...",
  className: "TdlgProgress",
  kind: "toolset_modal_dialog",
  blockerCode: "toolset_module_loaded_but_modal_open",
  childTexts: [],
};
const failedPrepCloseFrame = {
  hwnd: failedPrepCloseFrameHwnd,
  title: failedPrepCloseFrameTitle,
  className: "TfrmFrame",
  processId: failedPrepCloseProcessId,
  visible: true,
  responding: true,
};
const exactFailedPrepCloseState = {
  version: "aurora-model-proof-120s-prep-state-fixture/v1",
  capturedAtUtc: "2026-07-22T16:20:16.000Z",
  nwmain: [],
  toolsets: [{
    ...session(failedPrepCloseFrameTitle, [], failedPrepCloseProcessId),
    startedAtUtc: failedPrepCloseStartedAtUtc,
    frame: {
      hwnd: failedPrepCloseFrameHwnd,
      className: "TfrmFrame",
      title: failedPrepCloseFrameTitle,
      monitor: { deviceName: "\\\\.\\DISPLAY1", primary: false },
    },
    modals: [],
  }],
};
const exactFailedPrepCloseManifest = {
  version: "aurora-toolset-binary-native-geometry-manifest/v1",
  explicitOpenStartupAdmissionVersion: "aurora-toolset-explicit-open-startup-admission/v3",
  profilePath: binaryProfile.path,
  profileSha256: binaryProfile.sha256,
  profileId: "m2a-test-binary",
  artifactDir: failedPrepCloseColdOutDir,
  module: { resref: "m2a_test", path: sourceModule.path, sha256: sourceModule.sha256 },
  area: { resref: "m2a_area", width: 2, height: 2, displayName: "Meshy2Aurora proof area" },
  status: "failed",
  blockerCode: "toolset_module_loaded_but_modal_open",
  safety: {
    startsToolset: false,
    startsNwn: false,
    usesGlobalInput: false,
    usesGlobalCursor: false,
    usesGlobalKeyboard: false,
    usesGlobalMouse: false,
    usesGlobalMouseWheel: false,
    savesModule: false,
    changesIniOrMru: false,
  },
  startupAdmission: {
    version: "aurora-toolset-explicit-open-startup-admission/v3",
    mode: "passive_observation_then_explicit_open",
    mruConflict: true,
    startsToolsetWithoutModuleArgument: true,
    forbidsIniOrMruMutation: true,
    noLocalToolsetAdapter: true,
  },
  openFailure: {
    child: {
      blockerCode: "toolset_module_loaded_but_modal_open",
      childScript: "open-last-city-module-and-area-toolset-no-global-input.mjs",
      childArgs: [
        "--modulePath", installedModule.path,
        "--expectedModuleParts", "m2a_test|mod",
        "--area", "m2a_area",
      ],
      childExitCode: 2,
      childResult: {
        ok: false,
        blockerCode: "toolset_module_loaded_but_modal_open",
        startedToolset: true,
        recoveryConfirmationHandled: true,
        recoveryConfirmationHandledCount: 1,
        postSelectionBlockingModal: failedPrepCloseModal,
        moduleOpenActionSubmitted: true,
        moduleOpenActionKind: "verified_temp0_recovery_yes",
        moduleLoadOwner: "verified_temp0_recovery",
        expectedModuleParts: ["m2a_test", "mod"],
        modulePath: installedModule.path,
        topLevelToolsetWindows: failedPrepCloseFrame,
        moduleOpenSessionGuard: {
          state: "module_open_failed",
          blockerCode: "toolset_module_loaded_but_modal_open",
          processId: failedPrepCloseProcessId + 1,
          modulePath: installedModule.path,
          expectedModuleParts: ["m2a_test", "mod"],
          moduleOpenActionSubmitted: true,
          moduleOpenActionKind: "verified_temp0_recovery_yes",
        },
        criticalFailureRecord: null,
      },
    },
    postChildProcesses: [{
      Id: failedPrepCloseProcessId,
      StartTime: `/Date(${Date.parse(failedPrepCloseStartedAtUtc)})/`,
      MainWindowTitle: failedPrepCloseFrameTitle,
      Responding: true,
    }],
    postChildWindows: {
      ok: true,
      processId: failedPrepCloseProcessId,
      responding: true,
      windows: [
        { hwnd: failedPrepCloseFrameHwnd, className: "TfrmFrame", text: failedPrepCloseFrameTitle },
        { hwnd: failedPrepCloseProcessId + 2, className: "TApplication", text: failedPrepCloseFrameTitle },
      ],
    },
  },
};
const failedPrepCloseManifestPath = resolve(failedPrepCloseColdOutDir, "binary-native-geometry-manifest.json");
writeFileSync(failedPrepCloseManifestPath, `${JSON.stringify(exactFailedPrepCloseManifest, null, 2)}\n`, "utf8");
const failedPrepCloseAdmissionInput = {
  failureManifest: exactFailedPrepCloseManifest,
  failureManifestPath: failedPrepCloseManifestPath,
  prepPlan: continuationOriginalPlan,
  initialState: continuationInitialState,
  prepOutDir: failedPrepCloseOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  binaryProfilePath: binaryProfile.path,
  binaryProfileSha256: binaryProfile.sha256,
  target: continuationTarget,
  state: exactFailedPrepCloseState,
  timedOutputAbsent: true,
};
const failedPrepCloseAdmission = validateFailedPrepModuleLoadedModalCloseAdmission(failedPrepCloseAdmissionInput);
assert.equal(failedPrepCloseAdmission.processId, failedPrepCloseProcessId);
assert.equal(failedPrepCloseAdmission.startedAtUtc, failedPrepCloseStartedAtUtc);
assert.equal(failedPrepCloseAdmission.frameHwnd, failedPrepCloseFrameHwnd);
assert.equal(failedPrepCloseAdmission.recordedModal.hwnd, failedPrepCloseModalHwnd);
assert.equal(failedPrepCloseAdmission.currentModalState, "recorded_modal_absent");
const failedPrepCloseEvidence = {
  initialState: { path: resolve(failedPrepCloseOutDir, "state-before.json"), sha256: "1".repeat(64), byteLength: 10 },
  originalPlan: { path: resolve(failedPrepCloseOutDir, "plan.json"), sha256: "2".repeat(64), byteLength: 10 },
  failureManifest: { path: failedPrepCloseManifestPath, sha256: "3".repeat(64), byteLength: 10 },
};
const failedPrepClosePlanIdentity = {
  path: resolve(failedPrepCloseOutDir, "failed-prep-close-plan.json"),
  sha256: "4".repeat(64),
  byteLength: 10,
};
const failedPrepCloseBlockerIdentity = {
  path: resolve(failedPrepCloseOutDir, "failed-prep-close-blocker.json"),
  sha256: "5".repeat(64),
  byteLength: 10,
};
const failedPrepClosePlan = {
  version: "aurora-model-proof-120s-failed-prep-close-plan/v1",
  command: "close-failed-prep-module-loaded-modal",
  profile: { path: profile.path, sha256: profile.sha256, id: "m2a-test-model-proof-prep" },
  prepOutDir: failedPrepCloseOutDir,
  failureEvidence: failedPrepCloseEvidence,
  admission: {
    version: failedPrepCloseAdmission.version,
    processId: failedPrepCloseAdmission.processId,
    startedAtUtc: failedPrepCloseAdmission.startedAtUtc,
    frameHwnd: failedPrepCloseAdmission.frameHwnd,
    frameTitle: failedPrepCloseAdmission.frameTitle,
  },
  closePolicy: { gracefulFirst: true, exactPidStartTimeForceFallback: true, requiresZeroToolsetAndNwn: true },
};
const failedPrepCloseBlocker = {
  version: "aurora-model-proof-120s-failed-prep-close-blocker/v1",
  status: "failed",
  profile: { path: profile.path, sha256: profile.sha256, id: "m2a-test-model-proof-prep" },
  prepOutDir: failedPrepCloseOutDir,
  closePlan: failedPrepClosePlanIdentity,
  process: {
    pid: failedPrepCloseAdmission.processId,
    startedAtUtc: failedPrepCloseAdmission.startedAtUtc,
    frameHwnd: failedPrepCloseAdmission.frameHwnd,
    frameTitle: failedPrepCloseAdmission.frameTitle,
  },
  blockerCode: "PREP_ATOM_JSON_INVALID",
  message: "toolset_close_start_mismatch:expected=2026-07-22T00:00:01.0000000Z;actual=2026-07-22T00:00:01.0000458Z",
};
const precisionContinuationInput = {
  closePlan: failedPrepClosePlan,
  closePlanIdentity: failedPrepClosePlanIdentity,
  closeBlocker: failedPrepCloseBlocker,
  closeBlockerIdentity: failedPrepCloseBlockerIdentity,
  prepOutDir: failedPrepCloseOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  admission: failedPrepCloseAdmission,
  failureEvidence: failedPrepCloseEvidence,
};
const precisionContinuation = validateFailedPrepCloseStartTimePrecisionContinuation(precisionContinuationInput);
assert.equal(precisionContinuation.attempt, 2);
assert.equal(precisionContinuation.processId, failedPrepCloseProcessId);
expectContractBlocked(() => validateFailedPrepCloseStartTimePrecisionContinuation({
  ...precisionContinuationInput,
  closeBlocker: {
    ...failedPrepCloseBlocker,
    message: "toolset_close_start_mismatch:expected=2026-07-22T00:00:01.0000000Z;actual=2026-07-22T00:00:01.0010000Z",
  },
}), "PREP_FAILED_CLOSE_PRECISION_BLOCKER_NOT_ADMITTED");

for (const [blockerCode, mutate] of [
  ["PREP_FAILED_CLOSE_PROFILE_MISMATCH", (input) => { input.prepPlan.profile.sha256 = "f".repeat(64); }],
  ["PREP_FAILED_CLOSE_FAILURE_NOT_ADMITTED", (input) => { input.failureManifest.blockerCode = "unexpected_module_window_loaded"; }],
  ["PREP_FAILED_CLOSE_MODAL_IDENTITY_INVALID", (input) => { input.failureManifest.openFailure.child.childResult.postSelectionBlockingModal.className = "#32770"; }],
  ["PREP_FAILED_CLOSE_PROCESS_START_MISMATCH", (input) => { input.state.toolsets[0].startedAtUtc = "2026-07-22T00:00:02.000Z"; }],
  ["PREP_FAILED_CLOSE_FRAME_DRIFT", (input) => { input.state.toolsets[0].frame.hwnd += 1; }],
  ["PREP_FAILED_CLOSE_DIRTY_FRAME", (input) => { input.state.toolsets[0].frame.title += "*"; }],
  ["PREP_FAILED_CLOSE_UNEXPECTED_MODAL", (input) => { input.state.toolsets[0].modals = [{ hwnd: 99, className: "#32770", title: "Save Module" }]; }],
  ["PREP_FAILED_CLOSE_SECOND_TOOLSET", (input) => { input.state.toolsets.push(session("Other - other.mod", [], 6000)); }],
  ["PREP_FAILED_CLOSE_NWN_PRESENT", (input) => { input.state.nwmain.push({ pid: 7000 }); }],
  ["PREP_FAILED_CLOSE_TIMED_OUTPUT_EXISTS", (input) => { input.timedOutputAbsent = false; }],
  ["PREP_FAILED_CLOSE_MUTATION_EVIDENCE_INVALID", (input) => { input.failureManifest.nativeSave = { status: "saved" }; }],
]) {
  const changed = structuredClone(failedPrepCloseAdmissionInput);
  mutate(changed);
  expectContractBlocked(() => validateFailedPrepModuleLoadedModalCloseAdmission(changed), blockerCode);
}

const recoveryPrepOutDir = resolve(root, "artifacts", "lineage", "live", "failed-temp0-recovery-prep");
const recoveryColdOutDir = resolve(recoveryPrepOutDir, "cold-open");
mkdirSync(recoveryColdOutDir, { recursive: true });
writeFileSync(resolve(recoveryPrepOutDir, "state-before.json"), `${JSON.stringify(continuationInitialState, null, 2)}\n`, "utf8");
writeFileSync(resolve(recoveryPrepOutDir, "plan.json"), `${JSON.stringify(continuationOriginalPlan, null, 2)}\n`, "utf8");
const recoveryProcessId = 4981;
const recoveryStartedAtUtc = "2026-07-22T00:00:00.000Z";
const recoveryFrameHwnd = 78121912;
const recoveryModalHwnd = 78121913;
const exactRecoveryState = {
  version: "aurora-model-proof-120s-prep-state-fixture/v1",
  capturedAtUtc: "2026-07-22T16:18:16.000Z",
  nwmain: [],
  toolsets: [{
    ...session("BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17", [], recoveryProcessId),
    frame: {
      hwnd: recoveryFrameHwnd,
      className: "TfrmFrame",
      title: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17",
      monitor: { deviceName: "\\\\.\\DISPLAY1", primary: false },
    },
    modals: [{ hwnd: recoveryModalHwnd, className: "#32770", title: "Confirmation" }],
  }],
};
exactRecoveryState.toolsets[0].startedAtUtc = recoveryStartedAtUtc;
const recoveryManifestPath = resolve(recoveryColdOutDir, "binary-native-geometry-manifest.json");
const exactRecoveryFailureManifest = {
  version: "aurora-toolset-binary-native-geometry-manifest/v1",
  explicitOpenStartupAdmissionVersion: "aurora-toolset-explicit-open-startup-admission/v3",
  profilePath: binaryProfile.path,
  profileSha256: binaryProfile.sha256,
  profileId: "m2a-test-binary",
  artifactDir: recoveryColdOutDir,
  module: { resref: "m2a_test", path: sourceModule.path, sha256: sourceModule.sha256 },
  area: { resref: "m2a_area", width: 2, height: 2, displayName: "Meshy2Aurora proof area" },
  status: "failed",
  blockerCode: "binary_native_child_process_failed",
  verifiedTemp0RecoveryAdmission: {
    version: "aurora-toolset-verified-temp0-recovery-admission/v1",
    module: { path: installedModule.path, byteLength: installedModule.byteLength, sha256: installedModule.sha256 },
    temp0: { path: resolve(dirname(installedModule.path), "temp0"), resourceCount: 6 },
    resources: Array.from({ length: 6 }, (_, index) => ({ name: `resource-${index}`, identical: true })),
    cacheIdentitySha256: "a".repeat(64),
  },
  openFailure: {
    child: {
      blockerCode: "binary_native_child_process_failed",
      childScript: "open-last-city-module-and-area-toolset-no-global-input.mjs",
      childArgs: [
        "--modulePath", installedModule.path,
        "--expectedModuleParts", "m2a_test|mod",
        "--verifiedTemp0RecoveryAdmission", recoveryManifestPath,
      ],
      childExitCode: 1,
      childResult: null,
      childStderr: "PowerShell handler exception before any recovery action",
    },
    postChildProcesses: [{
      Id: recoveryProcessId,
      StartTime: `/Date(${Date.parse(recoveryStartedAtUtc)})/`,
      MainWindowTitle: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17",
      Responding: true,
    }],
    postChildWindows: {
      ok: true,
      processId: recoveryProcessId,
      responding: true,
      windows: [
        { hwnd: recoveryModalHwnd, className: "#32770", text: "Confirmation" },
        { hwnd: recoveryFrameHwnd, className: "TfrmFrame", text: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17" },
        { hwnd: recoveryProcessId + 2, className: "TApplication", text: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17" },
      ],
    },
  },
};
writeFileSync(recoveryManifestPath, `${JSON.stringify(exactRecoveryFailureManifest, null, 2)}\n`, "utf8");
const originalRecoveryManifestIdentity = fileIdentity(recoveryManifestPath);
const recoveryAdmission = validateVerifiedTemp0RecoveryContinuation({
  failureManifest: exactRecoveryFailureManifest,
  failureManifestPath: recoveryManifestPath,
  prepPlan: continuationOriginalPlan,
  initialState: continuationInitialState,
  prepOutDir: recoveryPrepOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  binaryProfilePath: binaryProfile.path,
  binaryProfileSha256: binaryProfile.sha256,
  target: continuationTarget,
  state: exactRecoveryState,
});
assert.equal(recoveryAdmission.processId, recoveryProcessId);
assert.equal(recoveryAdmission.modalHwnd, recoveryModalHwnd);
assert.equal(recoveryAdmission.failureManifestPath, recoveryManifestPath);

const clientClickRecoveryFailure = structuredClone(exactRecoveryFailureManifest);
clientClickRecoveryFailure.blockerCode = "toolset_verified_temp0_recovery_prompt_did_not_close";
clientClickRecoveryFailure.resumeFailure = {
  child: {
    ...structuredClone(clientClickRecoveryFailure.openFailure.child),
    blockerCode: "toolset_verified_temp0_recovery_prompt_did_not_close",
    childExitCode: 2,
    childResult: {
      blockerCode: "toolset_verified_temp0_recovery_prompt_did_not_close",
      recoveryConfirmationHandledCount: 1,
      recoveryAfter: { yesButtonHwnd: 7783 },
    },
  },
  postChildProcesses: structuredClone(clientClickRecoveryFailure.openFailure.postChildProcesses),
  postChildWindows: structuredClone(clientClickRecoveryFailure.openFailure.postChildWindows),
};
const clientClickRecoveryAdmission = validateVerifiedTemp0RecoveryContinuation({
  failureManifest: clientClickRecoveryFailure,
  failureManifestPath: recoveryManifestPath,
  prepPlan: continuationOriginalPlan,
  initialState: continuationInitialState,
  prepOutDir: recoveryPrepOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  binaryProfilePath: binaryProfile.path,
  binaryProfileSha256: binaryProfile.sha256,
  target: continuationTarget,
  state: exactRecoveryState,
  clientClickFallback: true,
});
assert.equal(clientClickRecoveryAdmission.clientClickFallback, true);
assert.match(clientClickRecoveryAdmission.version, /client-click/);
const wrongClientClickRecoveryFailure = structuredClone(clientClickRecoveryFailure);
wrongClientClickRecoveryFailure.resumeFailure.child.childResult.recoveryConfirmationHandledCount = 2;
expectContractBlocked(() => validateVerifiedTemp0RecoveryContinuation({
  failureManifest: wrongClientClickRecoveryFailure,
  failureManifestPath: recoveryManifestPath,
  prepPlan: continuationOriginalPlan,
  initialState: continuationInitialState,
  prepOutDir: recoveryPrepOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  binaryProfilePath: binaryProfile.path,
  binaryProfileSha256: binaryProfile.sha256,
  target: continuationTarget,
  state: exactRecoveryState,
  clientClickFallback: true,
}), "PREP_VERIFIED_TEMP0_RECOVERY_FAILURE_NOT_ADMITTED");

for (const [blockerCode, mutate] of [
  ["PREP_VERIFIED_TEMP0_RECOVERY_UNEXPECTED_MODAL", (state) => { state.toolsets[0].modals[0].title = "Question"; }],
  ["PREP_VERIFIED_TEMP0_RECOVERY_PID_MISMATCH", (state) => { state.toolsets[0].pid += 1; }],
  ["PREP_VERIFIED_TEMP0_RECOVERY_DIRTY_FRAME", (state) => { state.toolsets[0].frame.title += "*"; }],
]) {
  const changedState = structuredClone(exactRecoveryState);
  mutate(changedState);
  expectContractBlocked(() => validateVerifiedTemp0RecoveryContinuation({
    failureManifest: exactRecoveryFailureManifest,
    failureManifestPath: recoveryManifestPath,
    prepPlan: continuationOriginalPlan,
    initialState: continuationInitialState,
    prepOutDir: recoveryPrepOutDir,
    profilePath: profile.path,
    profileSha256: profile.sha256,
    profileId: "m2a-test-model-proof-prep",
    binaryProfilePath: binaryProfile.path,
    binaryProfileSha256: binaryProfile.sha256,
    target: continuationTarget,
    state: changedState,
  }), blockerCode);
}
expectContractBlocked(() => classifyExactOpenDialogState({
  nwmain: [],
  toolsets: [{ ...session("Other - other.mod", [], 4980), modals: [
    { className: "TdlgModuleSelect", title: "Open", hwnd: 1 },
    { className: "TdlgModuleSelect", title: "Open", hwnd: 2 },
  ] }],
}, 4980), "PREP_OPEN_DIALOG_AMBIGUOUS");
expectContractBlocked(
  () => requireExactModuleOpenReadback(
    { processId: 4980, moduleName: "m2a_test", editReadback: "m2a_test", editReadbackUnavailable: false, titleAfter: "BioWare Aurora - wrong.mod" },
    { processId: 4980, moduleStem: "m2a_test", moduleFileName: "m2a_test.mod", listSelectionVerified: true },
  ),
  "PREP_SWITCH_TARGET_TITLE_MISMATCH",
);

const continuationStateFixturePath = fixture("continuation-exact-live-failure.json", exactLiveFailureState);
const welcomeResiduePrepOutDir = resolve(root, "artifacts", "lineage", "live", "failed-cold-prep-welcome-residue");
const welcomeResidueColdOutDir = resolve(welcomeResiduePrepOutDir, "cold-open");
mkdirSync(welcomeResidueColdOutDir, { recursive: true });
writeFileSync(resolve(welcomeResiduePrepOutDir, "state-before.json"), `${JSON.stringify(continuationInitialState, null, 2)}\n`, "utf8");
writeFileSync(resolve(welcomeResiduePrepOutDir, "plan.json"), `${JSON.stringify(continuationOriginalPlan, null, 2)}\n`, "utf8");
const welcomeResidueFailureManifest = structuredClone(exactExplicitOpenFailureManifest);
welcomeResidueFailureManifest.artifactDir = welcomeResidueColdOutDir;
writeFileSync(resolve(welcomeResidueColdOutDir, "binary-native-geometry-manifest.json"), `${JSON.stringify(welcomeResidueFailureManifest, null, 2)}\n`, "utf8");
const welcomeResidueStateFixturePath = fixture("continuation-exact-welcome-residue.json", exactWelcomeResidueState);
const failedPrepCloseStateFixturePath = fixture("failed-prep-module-modal-close.json", exactFailedPrepCloseState);
const failedPrepCloseDryRun = spawnSync(process.execPath, [
  script,
  "close-failed-prep-module-loaded-modal-dry-run",
  "--profile", profile.path,
  "--prepOutDir", failedPrepCloseOutDir,
  "--stateFixture", failedPrepCloseStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(failedPrepCloseDryRun.status, 0, failedPrepCloseDryRun.stderr || failedPrepCloseDryRun.stdout);
const failedPrepCloseDryRunPayload = JSON.parse(failedPrepCloseDryRun.stdout);
assert.equal(failedPrepCloseDryRunPayload.status, "aurora_model_proof_120s_failed_prep_module_loaded_modal_close_planned");
assert.equal(failedPrepCloseDryRunPayload.processId, failedPrepCloseProcessId);
assert.equal(failedPrepCloseDryRunPayload.startedAtUtc, failedPrepCloseStartedAtUtc);
assert.equal(failedPrepCloseDryRunPayload.frameHwnd, failedPrepCloseFrameHwnd);
assert.equal(failedPrepCloseDryRunPayload.recordedModal.hwnd, failedPrepCloseModalHwnd);
assert.equal(failedPrepCloseDryRunPayload.safety.startsToolset, false);
assert.equal(failedPrepCloseDryRunPayload.safety.startsNwn, false);
assert.equal(failedPrepCloseDryRunPayload.safety.usesGlobalInput, false);

const continuationDryRun = spawnSync(process.execPath, [
  script,
  "continue-unexpected-module-window-dry-run",
  "--profile", profile.path,
  "--prepOutDir", continuationPrepOutDir,
  "--stateFixture", continuationStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(continuationDryRun.status, 0, continuationDryRun.stdout || continuationDryRun.stderr);
const recoveryStateFixturePath = fixture("continuation-exact-temp0-recovery.json", exactRecoveryState);
const recoveryContinuationDryRun = spawnSync(process.execPath, [
  script,
  "continue-verified-temp0-recovery-dry-run",
  "--profile", profile.path,
  "--prepOutDir", recoveryPrepOutDir,
  "--stateFixture", recoveryStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(recoveryContinuationDryRun.status, 0, recoveryContinuationDryRun.stdout || recoveryContinuationDryRun.stderr);
const recoveryContinuationPlan = JSON.parse(recoveryContinuationDryRun.stdout);
assert.equal(recoveryContinuationPlan.status, "aurora_model_proof_120s_prep_verified_temp0_recovery_continuation_planned");
assert.equal(recoveryContinuationPlan.processId, recoveryProcessId);
assert.equal(recoveryContinuationPlan.attempt, 1);

const recoveryInitialStateIdentity = fileIdentity(resolve(recoveryPrepOutDir, "state-before.json"));
const recoveryOriginalPlanIdentity = fileIdentity(resolve(recoveryPrepOutDir, "plan.json"));
const priorRecoveryEvidence = {
  initialState: recoveryInitialStateIdentity,
  originalPlan: recoveryOriginalPlanIdentity,
  failureManifest: originalRecoveryManifestIdentity,
};
const priorRecoveryPlan = {
  version: "aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-plan/v1",
  command: "continue-verified-temp0-recovery",
  createdAtUtc: "2026-07-22T16:19:00.000Z",
  profile: { path: profile.path, sha256: profile.sha256, id: "m2a-test-model-proof-prep" },
  prepOutDir: recoveryPrepOutDir,
  target: {
    moduleResref: "m2a_test",
    moduleName: "m2a_test.mod",
    installedModulePath: installedModule.path,
    areaResref: "m2a_area",
  },
  failureToRecovery: priorRecoveryEvidence,
  admission: {
    version: recoveryAdmission.version,
    processId: recoveryAdmission.processId,
    startedAtUtc: recoveryAdmission.startedAtUtc,
    frameHwnd: recoveryAdmission.frameHwnd,
    modalHwnd: recoveryAdmission.modalHwnd,
    targetModule: recoveryAdmission.targetModule,
    areaResref: recoveryAdmission.areaResref,
    cacheIdentitySha256: recoveryAdmission.cacheIdentitySha256,
    originalModelProofProfileSha256: recoveryAdmission.originalModelProofProfileSha256,
    currentModelProofProfileSha256: profile.sha256,
  },
  currentState: exactRecoveryState,
  safety: {
    startsToolset: false,
    startsNwn: false,
    usesGlobalInput: false,
    savesModule: false,
    buildsModule: false,
    changesIniOrMru: false,
    changesCamera: false,
  },
};
const priorRecoveryPlanPath = resolve(recoveryPrepOutDir, "continuation-plan.json");
writeFileSync(priorRecoveryPlanPath, `${JSON.stringify(priorRecoveryPlan, null, 2)}\n`, "utf8");
const priorRecoveryPlanIdentity = fileIdentity(priorRecoveryPlanPath);
const priorRecoveryBlocker = {
  version: "aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-blocker/v1",
  status: "failed",
  createdAtUtc: "2026-07-22T16:19:10.000Z",
  profile: priorRecoveryPlan.profile,
  prepOutDir: recoveryPrepOutDir,
  processId: recoveryProcessId,
  failureToRecovery: priorRecoveryEvidence,
  continuationPlan: priorRecoveryPlanIdentity,
  blockerCode: "verified_temp0_recovery_admission_invalid",
  message: 'aurora-toolset-binary-module-native-geometry.mjs: {"blockerCode":"verified_temp0_recovery_admission_invalid","message":"verified_temp0_recovery_owner_manifest_mismatch"}',
  safety: priorRecoveryPlan.safety,
};
const priorRecoveryBlockerPath = resolve(recoveryPrepOutDir, "continuation-blocker.json");
writeFileSync(priorRecoveryBlockerPath, `${JSON.stringify(priorRecoveryBlocker, null, 2)}\n`, "utf8");
const priorRecoveryBlockerIdentity = fileIdentity(priorRecoveryBlockerPath);
const recoveryFailureAfterRetry = structuredClone(exactRecoveryFailureManifest);
recoveryFailureAfterRetry.blockerCode = "verified_temp0_recovery_admission_invalid";
recoveryFailureAfterRetry.resumeFailure = {
  child: {
    blockerCode: "verified_temp0_recovery_admission_invalid",
    childResult: { message: "verified_temp0_recovery_owner_manifest_mismatch" },
  },
  postChildProcesses: exactRecoveryFailureManifest.openFailure.postChildProcesses,
};
writeFileSync(recoveryManifestPath, `${JSON.stringify(recoveryFailureAfterRetry, null, 2)}\n`, "utf8");
const retryEvidence = validateVerifiedTemp0RecoveryRetryEvidence({
  priorPlan: priorRecoveryPlan,
  priorPlanIdentity: priorRecoveryPlanIdentity,
  priorBlocker: priorRecoveryBlocker,
  priorBlockerIdentity: priorRecoveryBlockerIdentity,
  prepOutDir: recoveryPrepOutDir,
  profilePath: profile.path,
  profileId: "m2a-test-model-proof-prep",
  target: continuationTarget,
  admission: validateVerifiedTemp0RecoveryContinuation({
    failureManifest: recoveryFailureAfterRetry,
    failureManifestPath: recoveryManifestPath,
    prepPlan: continuationOriginalPlan,
    initialState: continuationInitialState,
    prepOutDir: recoveryPrepOutDir,
    profilePath: profile.path,
    profileSha256: profile.sha256,
    profileId: "m2a-test-model-proof-prep",
    binaryProfilePath: binaryProfile.path,
    binaryProfileSha256: binaryProfile.sha256,
    target: continuationTarget,
    state: exactRecoveryState,
  }),
});
assert.equal(retryEvidence.attempt, 2);
const recoveryContinuationRetryDryRun = spawnSync(process.execPath, [
  script,
  "continue-verified-temp0-recovery-dry-run",
  "--profile", profile.path,
  "--prepOutDir", recoveryPrepOutDir,
  "--stateFixture", recoveryStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(recoveryContinuationRetryDryRun.status, 0, recoveryContinuationRetryDryRun.stdout || recoveryContinuationRetryDryRun.stderr);
const recoveryContinuationRetryPlan = JSON.parse(recoveryContinuationRetryDryRun.stdout);
assert.equal(recoveryContinuationRetryPlan.attempt, 2);
assert.equal(recoveryContinuationRetryPlan.evidence.priorContinuationPlan.sha256, priorRecoveryPlanIdentity.sha256);
assert.equal(recoveryContinuationRetryPlan.evidence.priorContinuationBlocker.sha256, priorRecoveryBlockerIdentity.sha256);
assert.equal(existsSync(resolve(recoveryPrepOutDir, "continuation-plan-v2.json")), false, "retry dry-run must not write");

const clientClickPriorPlan = {
  ...priorRecoveryPlan,
  version: "aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-plan/v2",
  attempt: 2,
  profile: { ...priorRecoveryPlan.profile, sha256: "b".repeat(64) },
  admission: {
    ...priorRecoveryPlan.admission,
    currentModelProofProfileSha256: "b".repeat(64),
  },
};
const clientClickPriorPlanPath = resolve(recoveryPrepOutDir, "continuation-plan-v2.json");
writeFileSync(clientClickPriorPlanPath, `${JSON.stringify(clientClickPriorPlan, null, 2)}\n`, "utf8");
const clientClickPriorPlanIdentity = fileIdentity(clientClickPriorPlanPath);
const clientClickPriorBlocker = {
  ...priorRecoveryBlocker,
  version: "aurora-model-proof-120s-prep-verified-temp0-recovery-continuation-blocker/v2",
  continuationPlan: clientClickPriorPlanIdentity,
  blockerCode: "toolset_verified_temp0_recovery_prompt_did_not_close",
  message: "aurora-toolset-binary-module-native-geometry.mjs: toolset_verified_temp0_recovery_prompt_did_not_close",
};
writeFileSync(resolve(recoveryPrepOutDir, "continuation-blocker-v2.json"), `${JSON.stringify(clientClickPriorBlocker, null, 2)}\n`, "utf8");
writeFileSync(resolve(recoveryPrepOutDir, "verified-temp0-recovery-resume-dry-run-v2.json"), `${JSON.stringify({
  name: "verified-temp0-recovery-resume-dry-run-v2",
  result: {
    command: "resume-verified-temp0-recovery-dry-run",
    status: "binary_native_verified_temp0_recovery_resume_admitted",
    process: { Id: recoveryProcessId },
    confirmation: { hwnd: recoveryModalHwnd },
    frame: { hwnd: recoveryFrameHwnd },
  },
}, null, 2)}\n`, "utf8");
const clientClickLiveFailure = structuredClone(exactRecoveryFailureManifest);
clientClickLiveFailure.blockerCode = clientClickRecoveryFailure.blockerCode;
clientClickLiveFailure.resumeFailure = structuredClone(clientClickRecoveryFailure.resumeFailure);
writeFileSync(recoveryManifestPath, `${JSON.stringify(clientClickLiveFailure, null, 2)}\n`, "utf8");
const clientClickContinuationDryRun = spawnSync(process.execPath, [
  script,
  "continue-verified-temp0-recovery-client-click-dry-run",
  "--profile", profile.path,
  "--prepOutDir", recoveryPrepOutDir,
  "--stateFixture", recoveryStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(clientClickContinuationDryRun.status, 0, clientClickContinuationDryRun.stdout || clientClickContinuationDryRun.stderr);
const clientClickContinuationPlan = JSON.parse(clientClickContinuationDryRun.stdout);
assert.equal(clientClickContinuationPlan.status, "aurora_model_proof_120s_prep_verified_temp0_recovery_client_click_continuation_planned");
assert.equal(clientClickContinuationPlan.processId, recoveryProcessId);
assert.equal(existsSync(resolve(recoveryPrepOutDir, "verified-temp0-recovery-client-click-continuation-plan.json")), false, "client-click dry-run must not write");
const clientClickLanePlanPath = resolve(recoveryPrepOutDir, "verified-temp0-recovery-client-click-continuation-plan.json");
const clientClickLanePlan = {
  version: "aurora-model-proof-120s-prep-verified-temp0-recovery-client-click-continuation-plan/v1",
  command: "continue-verified-temp0-recovery-client-click",
  attempt: "client-click",
  createdAtUtc: "2026-07-22T16:20:00.000Z",
  profile: { path: profile.path, sha256: "c".repeat(64), id: "m2a-test-model-proof-prep" },
  prepOutDir: recoveryPrepOutDir,
  target: continuationTarget,
  admission: {
    version: clientClickRecoveryAdmission.version,
    processId: clientClickRecoveryAdmission.processId,
    startedAtUtc: clientClickRecoveryAdmission.startedAtUtc,
    frameHwnd: clientClickRecoveryAdmission.frameHwnd,
    modalHwnd: clientClickRecoveryAdmission.modalHwnd,
    targetModule: clientClickRecoveryAdmission.targetModule,
    areaResref: clientClickRecoveryAdmission.areaResref,
    cacheIdentitySha256: clientClickRecoveryAdmission.cacheIdentitySha256,
    originalModelProofProfileSha256: clientClickRecoveryAdmission.originalModelProofProfileSha256,
    currentModelProofProfileSha256: "c".repeat(64),
  },
};
writeFileSync(clientClickLanePlanPath, `${JSON.stringify(clientClickLanePlan, null, 2)}\n`, "utf8");
const clientClickLanePlanIdentity = fileIdentity(clientClickLanePlanPath);
writeFileSync(resolve(recoveryPrepOutDir, "verified-temp0-recovery-client-click-continuation-blocker.json"), `${JSON.stringify({
  version: "aurora-model-proof-120s-prep-verified-temp0-recovery-client-click-continuation-blocker/v1",
  status: "failed",
  attempt: "client-click",
  createdAtUtc: "2026-07-22T16:20:01.000Z",
  profile: clientClickLanePlan.profile,
  prepOutDir: recoveryPrepOutDir,
  processId: recoveryProcessId,
  continuationPlan: clientClickLanePlanIdentity,
  blockerCode: "BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_FAILURE_PACKET_MISMATCH",
  message: "aurora-toolset-binary-module-native-geometry.mjs: BINARY_NATIVE_VERIFIED_TEMP0_RECOVERY_FAILURE_PACKET_MISMATCH",
}, null, 2)}\n`, "utf8");
const clientClickLaneRetryDryRun = spawnSync(process.execPath, [
  script,
  "continue-verified-temp0-recovery-client-click-dry-run",
  "--profile", profile.path,
  "--prepOutDir", recoveryPrepOutDir,
  "--stateFixture", recoveryStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(clientClickLaneRetryDryRun.status, 0, clientClickLaneRetryDryRun.stdout || clientClickLaneRetryDryRun.stderr);
const clientClickLaneRetryPlan = JSON.parse(clientClickLaneRetryDryRun.stdout);
assert.equal(clientClickLaneRetryPlan.attempt, "client-click-lane-retry");
assert.equal(clientClickLaneRetryPlan.evidence.priorClientClickLaneFailure.actionPreviouslySubmitted, false);
assert.equal(clientClickLaneRetryPlan.evidence.priorClientClickLaneFailure.priorContinuationPlan.sha256, clientClickLanePlanIdentity.sha256);
assert.equal(existsSync(resolve(recoveryPrepOutDir, "verified-temp0-recovery-client-click-continuation-plan-v2.json")), false, "client-click lane retry dry-run must not write");
const continuationDryRunPayload = JSON.parse(continuationDryRun.stdout);
assert.equal(continuationDryRunPayload.status, "aurora_model_proof_120s_prep_continuation_planned");
assert.equal(continuationDryRunPayload.processId, 4980);
assert.equal(existsSync(resolve(continuationPrepOutDir, "continuation-plan.json")), false, "continuation dry-run must not write");
const welcomeResidueDryRun = spawnSync(process.execPath, [
  script,
  "continue-unexpected-module-window-dry-run",
  "--profile", profile.path,
  "--prepOutDir", welcomeResiduePrepOutDir,
  "--stateFixture", welcomeResidueStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(welcomeResidueDryRun.status, 0, welcomeResidueDryRun.stdout || welcomeResidueDryRun.stderr);
const welcomeResidueDryRunPayload = JSON.parse(welcomeResidueDryRun.stdout);
assert.equal(welcomeResidueDryRunPayload.welcomeResidueDismissalRequired, true);
assert.equal(welcomeResidueDryRunPayload.welcomeResidue.hwnd, 2099842);
assert.equal(existsSync(resolve(welcomeResiduePrepOutDir, "continuation-plan.json")), false, "welcome residue dry-run must not write");
const welcomeResiduePublicAdmission = validateUnexpectedModuleWindowContinuation({
  failureManifest: welcomeResidueFailureManifest,
  failureManifestPath: resolve(welcomeResidueColdOutDir, "binary-native-geometry-manifest.json"),
  prepPlan: continuationOriginalPlan,
  initialState: continuationInitialState,
  prepOutDir: welcomeResiduePrepOutDir,
  profilePath: profile.path,
  profileSha256: profile.sha256,
  profileId: "m2a-test-model-proof-prep",
  binaryProfilePath: binaryProfile.path,
  binaryProfileSha256: binaryProfile.sha256,
  target: continuationTarget,
  state: exactWelcomeResidueState,
});
const welcomeResidueFailureToRecovery = {
  initialState: fileIdentity(resolve(welcomeResiduePrepOutDir, "state-before.json")),
  originalPlan: fileIdentity(resolve(welcomeResiduePrepOutDir, "plan.json")),
  failureManifest: fileIdentity(resolve(welcomeResidueColdOutDir, "binary-native-geometry-manifest.json")),
};
const welcomeResiduePriorPlan = {
  version: "aurora-model-proof-120s-prep-continuation-plan/v1",
  command: "continue-unexpected-module-window",
  createdAtUtc: "2026-07-24T14:29:12.468Z",
  profile: { path: profile.path, sha256: profile.sha256, id: "m2a-test-model-proof-prep" },
  prepOutDir: welcomeResiduePrepOutDir,
  target: continuationOriginalPlan.target,
  failureToRecovery: welcomeResidueFailureToRecovery,
  admission: {
    version: welcomeResiduePublicAdmission.version,
    processId: welcomeResiduePublicAdmission.processId,
    startedAtUtc: welcomeResiduePublicAdmission.startedAtUtc,
    frameHwnd: welcomeResiduePublicAdmission.frameHwnd,
    frameTitle: welcomeResiduePublicAdmission.frameTitle,
    currentModule: welcomeResiduePublicAdmission.currentModule,
    targetModule: welcomeResiduePublicAdmission.targetModule,
    areaResref: welcomeResiduePublicAdmission.areaResref,
    welcomeResidue: welcomeResiduePublicAdmission.welcomeResidue,
  },
  currentState: exactWelcomeResidueState,
  safety: preActionPriorPlan.safety,
};
const welcomeResiduePriorPlanPath = resolve(welcomeResiduePrepOutDir, "continuation-plan.json");
writeFileSync(welcomeResiduePriorPlanPath, `${JSON.stringify(welcomeResiduePriorPlan, null, 2)}\n`, "utf8");
const welcomeResiduePriorPlanIdentity = fileIdentity(welcomeResiduePriorPlanPath);
writeFileSync(resolve(welcomeResiduePrepOutDir, "continuation-blocker.json"), `${JSON.stringify({
  version: "aurora-model-proof-120s-prep-continuation-blocker/v1",
  status: "failed",
  createdAtUtc: "2026-07-24T14:29:12.806Z",
  profile: welcomeResiduePriorPlan.profile,
  prepOutDir: welcomeResiduePrepOutDir,
  processId: welcomeResiduePublicAdmission.processId,
  failureToRecovery: welcomeResidueFailureToRecovery,
  continuationPlan: welcomeResiduePriorPlanIdentity,
  blockerCode: "PREP_ATOM_JSON_INVALID",
  message: "close-aurora-toolset-dialog-no-global-input.mjs: ParserError FullyQualifiedErrorId : InvalidVariableReferenceWithDrive",
  safety: preActionPriorPlan.safety,
}, null, 2)}\n`, "utf8");
const repeatedOriginalContinuation = spawnSync(process.execPath, [
  script,
  "continue-unexpected-module-window-dry-run",
  "--profile", profile.path,
  "--prepOutDir", welcomeResiduePrepOutDir,
  "--stateFixture", welcomeResidueStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(repeatedOriginalContinuation.status, 2);
assert.equal(JSON.parse(repeatedOriginalContinuation.stdout).blockerCode, "PREP_CONTINUATION_ALREADY_DISPATCHED");
const preActionResumeDryRun = spawnSync(process.execPath, [
  script,
  "continue-unexpected-module-window-pre-action-resume-dry-run",
  "--profile", profile.path,
  "--prepOutDir", welcomeResiduePrepOutDir,
  "--stateFixture", welcomeResidueStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(preActionResumeDryRun.status, 0, preActionResumeDryRun.stderr || preActionResumeDryRun.stdout);
const preActionResumeDryRunPayload = JSON.parse(preActionResumeDryRun.stdout);
assert.equal(preActionResumeDryRunPayload.attempt, "pre-action-resume");
assert.equal(preActionResumeDryRunPayload.priorPreActionFailure.actionPreviouslySubmitted, false);
assert.equal(existsSync(resolve(welcomeResiduePrepOutDir, "continuation-plan-v2.json")), false, "pre-action resume dry-run must not write");
writeFileSync(installedModule.path, Buffer.alloc(installedBytes.length, 0x79));
const continuationHashDrift = spawnSync(process.execPath, [
  script,
  "continue-unexpected-module-window-dry-run",
  "--profile", profile.path,
  "--prepOutDir", continuationPrepOutDir,
  "--stateFixture", continuationStateFixturePath,
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
writeFileSync(installedModule.path, installedBytes);
assert.equal(continuationHashDrift.status, 2);
assert.equal(JSON.parse(continuationHashDrift.stdout).blockerCode, "PREP_ARTIFACT_HASH_MISMATCH");

const wrongDirectoryModule = writeAbsoluteBytes(resolve(root, "wrong-native-root", "modules", "m2a_test.mod"), installedBytes);
const wrongDirectoryProfileValue = readJson(profile.path);
wrongDirectoryProfileValue.installedModule = wrongDirectoryModule;
const wrongDirectoryProfile = writeJson("profiles/model-proof-wrong-directory.json", wrongDirectoryProfileValue);
expectProfileBlocked(wrongDirectoryProfile.path, cold, "PREP_INSTALLED_MODULE_DIRECTORY_MISMATCH");

const source = readFileSync(script, "utf8");
for (const atom of [
  "aurora-toolset-binary-module-native-geometry.mjs",
  "probe-aurora-toolset-main-menu-no-global-input.mjs",
  "invoke-aurora-toolset-main-menu-command-no-global-input.mjs",
  "move-aurora-toolset-dialog-to-frame-monitor-no-global-input.mjs",
  "read-aurora-toolset-dialog-list-items-no-global-input.mjs",
  "select-aurora-toolset-dialog-list-item-validated.mjs",
  "open-aurora-toolset-module-from-dialog-no-global-input.mjs",
  "close-aurora-toolset-dialog-no-global-input.mjs",
  "run-toolset-area-oracle-queue.mjs",
]) assert.match(source, new RegExp(escapeRegex(atom), "u"), `missing composed atom: ${atom}`);
const exactDialogCloserSource = readFileSync(resolve(here, "close-aurora-toolset-dialog-no-global-input.mjs"), "utf8");
for (const binding of ["expectedProcessId", "expectedStartedAtUtc", "expectedDialogHwnd", "matchingAfter"]) {
  assert.match(exactDialogCloserSource, new RegExp(escapeRegex(binding), "u"), `exact dialog closer missing ${binding}`);
}
const exactDialogCloserParseRun = spawnSync(process.execPath, [
  resolve(here, "close-aurora-toolset-dialog-no-global-input.mjs"),
  "--class", "TdlgWelcome",
  "--title", "BioWare Aurora Neverwinter Nights Toolset",
  "--expectedProcessId", "1",
  "--expectedStartedAtUtc", "2026-07-24T14:09:56.2909611Z",
  "--expectedDialogHwnd", "1",
  "--contractParseOnly", "true",
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.equal(exactDialogCloserParseRun.status, 0, exactDialogCloserParseRun.stderr || exactDialogCloserParseRun.stdout);
const exactDialogCloserParsePayload = JSON.parse(exactDialogCloserParseRun.stdout);
assert.equal(exactDialogCloserParsePayload.status, "contract_parse_only");
assert.equal(exactDialogCloserParsePayload.actionSubmitted, false);
assert.equal(exactDialogCloserParsePayload.safety.usesGlobalInput, false);
for (const forbidden of ["geometry-observe", "geometry-finalize", "save-aurora", "nwtoolset.ini", "SendInput", "mouse_event", "keybd_event"]) {
  assert.equal(source.toLowerCase().includes(forbidden.toLowerCase()), false, `forbidden prep operation: ${forbidden}`);
}
for (const child of [
  "aurora-toolset-binary-module-native-geometry.mjs",
  "probe-aurora-toolset-main-menu-no-global-input.mjs",
  "invoke-aurora-toolset-main-menu-command-no-global-input.mjs",
  "move-aurora-toolset-dialog-to-frame-monitor-no-global-input.mjs",
  "read-aurora-toolset-dialog-list-items-no-global-input.mjs",
  "select-aurora-toolset-dialog-list-item-validated.mjs",
  "open-aurora-toolset-module-from-dialog-no-global-input.mjs",
  "run-toolset-area-oracle-queue.mjs",
]) {
  const childSource = readFileSync(resolve(here, child), "utf8");
  for (const field of Object.keys(exactSafety)) assert.match(childSource, new RegExp(escapeRegex(field), "u"), `${child} missing explicit ${field}`);
}
const closeAtomSource = readFileSync(resolve(here, "close-aurora-toolset-window-no-global-input.mjs"), "utf8");
for (const required of [
  "--expectedStartedAtUtc",
  "--expectedFrameHwnd",
  "--forceIfNeeded",
  "toolset_close_start_mismatch",
  "toolset_close_frame_hwnd_mismatch",
  "toolset_close_unexpected_modal_before_force",
  "Stop-Process -Id $expectedPid -Force",
]) {
  assert.match(closeAtomSource, new RegExp(escapeRegex(required), "u"), `close atom missing ${required}`);
}
const closeAtomPath = resolve(here, "close-aurora-toolset-window-no-global-input.mjs");
const closeMissingIdentity = spawnSync(process.execPath, [closeAtomPath, "--forceIfNeeded", "true"], {
  cwd: process.cwd(), encoding: "utf8", windowsHide: true,
});
assert.notEqual(closeMissingIdentity.status, 0);
assert.match(`${closeMissingIdentity.stderr}${closeMissingIdentity.stdout}`, /requires --expectedPid, --expectedStartedAtUtc, --expectedFrameHwnd, and --expectedFrameTitle/u);
const closeLocalTime = spawnSync(process.execPath, [
  closeAtomPath,
  "--expectedPid", "1",
  "--expectedStartedAtUtc", "2026-07-24T07:57:33.336",
  "--expectedFrameHwnd", "1",
  "--expectedFrameTitle", "frame",
  "--forceIfNeeded", "true",
], { cwd: process.cwd(), encoding: "utf8", windowsHide: true });
assert.notEqual(closeLocalTime.status, 0);
assert.match(`${closeLocalTime.stderr}${closeLocalTime.stdout}`, /must include an explicit UTC offset/u);
const closeUnknownOption = spawnSync(process.execPath, [closeAtomPath, "--unknownOption", "value"], {
  cwd: process.cwd(), encoding: "utf8", windowsHide: true,
});
assert.notEqual(closeUnknownOption.status, 0);
assert.match(`${closeUnknownOption.stderr}${closeUnknownOption.stdout}`, /unknown:--unknownOption/u);
const prepareSource = readFileSync(script, "utf8");
assert.match(prepareSource, /close-failed-prep-module-loaded-modal-dry-run/u);
assert.match(prepareSource, /close-failed-prep-module-loaded-modal/u);
assert.match(prepareSource, /failed-prep-close-plan\.json/u);
assert.match(prepareSource, /failed-prep-close\.json/u);
assert.match(prepareSource, /failed-prep-close-blocker\.json/u);
assert.match(prepareSource, /validateFailedPrepModuleLoadedModalCloseAdmission/u);

console.log(JSON.stringify({
  ok: true,
  status: "prepare_aurora_model_proof_120s_contract_valid",
}));

function plan(stateFixture, suffix) {
  const prepOutDir = resolve(root, "artifacts", "lineage", "live", `prep-${suffix}`);
  const result = spawnSync(process.execPath, [script, "dry-run", "--profile", profile.path, "--prepOutDir", prepOutDir, "--stateFixture", stateFixture], {
    cwd: resolve(here, "..", ".."),
    encoding: "utf8",
    windowsHide: true,
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.command, "dry-run");
  assert.equal(payload.prepOutDir, prepOutDir);
  assert.equal(payload.safety.startsNwn, false);
  assert.equal(payload.safety.usesGlobalInput, false);
  assert.equal(payload.safety.savesModule, false);
  return payload;
}

function expectBlocked(stateFixture, blockerCode) {
  expectProfileBlocked(profile.path, stateFixture, blockerCode);
}

function expectProfileBlocked(profilePath, stateFixture, blockerCode) {
  const result = spawnSync(process.execPath, [script, "dry-run", "--profile", profilePath, "--prepOutDir", resolve(root, "artifacts", "lineage", "live", `prep-blocked-${blockerCode}`), "--stateFixture", stateFixture], {
    cwd: resolve(here, "..", ".."),
    encoding: "utf8",
    windowsHide: true,
  });
  assert.notEqual(result.status, 0, `expected blocker ${blockerCode}`);
  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.blockerCode, blockerCode);
}

function expectContractBlocked(callback, blockerCode) {
  assert.throws(callback, (error) => error?.code === blockerCode, `expected ${blockerCode}`);
}

function session(title, areaViewers = [], pid = 1234) {
  return {
    pid,
    startedAtUtc: "2026-07-22T00:00:00.000Z",
    responding: true,
    frame: { hwnd: pid + 1, className: "TfrmFrame", title, monitor: { deviceName: "\\\\.\\DISPLAY1", primary: false } },
    modals: [],
    areaViewers: areaViewers.map((viewer, index) => ({ hwnd: pid + 100 + index, ...viewer })),
  };
}

function viewport(width, height, hwnd) {
  return { hwnd, bounds: { left: 0, top: 0, width, height } };
}

function unexpectedModuleWindowFailureManifest({ artifactDir, binaryProfile, sourceModule, installedModule, processId, wrongTitle }) {
  const wrongFrame = { hwnd: 78121902, title: wrongTitle, className: "TfrmFrame", processId, visible: true, responding: true };
  return {
    version: "aurora-toolset-binary-native-geometry-manifest/v1",
    explicitOpenStartupAdmissionVersion: "aurora-toolset-explicit-open-startup-admission/v3",
    profilePath: binaryProfile.path,
    profileSha256: binaryProfile.sha256,
    profileId: "m2a-test-binary",
    artifactDir,
    module: { resref: "m2a_test", path: sourceModule.path, sha256: sourceModule.sha256 },
    area: { resref: "m2a_area", width: 2, height: 2, displayName: "Meshy2Aurora proof area" },
    status: "failed",
    safety: {
      startsToolset: false,
      startsNwn: false,
      usesGlobalInput: false,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouse: false,
      usesGlobalMouseWheel: false,
      savesModule: false,
      changesIniOrMru: false,
    },
    startupAdmission: {
      version: "aurora-toolset-explicit-open-startup-admission/v3",
      mode: "passive_observation_then_explicit_open",
      mruConflict: true,
      startsToolsetWithoutModuleArgument: true,
      forbidsIniOrMruMutation: true,
      noLocalToolsetAdapter: true,
    },
    blockerCode: "unexpected_module_window_loaded",
    openFailure: {
      child: {
        blockerCode: "unexpected_module_window_loaded",
        childResult: {
          ok: false,
          blockerCode: "unexpected_module_window_loaded",
          expectedModuleParts: ["m2a_test", "mod"],
          unexpectedModuleWindowTitle: wrongTitle,
          unexpectedModuleWindowHwnd: wrongFrame.hwnd,
          modulePath: installedModule.path,
          moduleLoadOwner: "external",
          welcomeHandled: true,
          openModuleDialogRequested: true,
          openModuleDialogHandled: false,
          explicitOpenEligibilityGranted: true,
          topLevelToolsetWindows: wrongFrame,
          moduleOpenSessionGuard: {
            state: "module_open_failed",
            blockerCode: "unexpected_module_window_loaded",
            modulePath: installedModule.path,
            expectedModuleParts: ["m2a_test", "mod"],
            moduleOpenActionSubmitted: null,
            moduleOpenActionKind: null,
          },
        },
      },
      postChildProcesses: [{ Id: processId, StartTime: `/Date(${Date.parse("2026-07-22T00:00:00.000Z")})/`, MainWindowTitle: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17", Responding: true }],
      postChildWindows: { ok: true, processId, responding: true, windows: [wrongFrame] },
    },
  };
}

function exactInstalledMruLoadFailureManifest({
  artifactDir,
  binaryProfile,
  sourceModule,
  installedModule,
  processId,
  startedAtUtc,
  frameHwnd,
  frameTitle,
}) {
  const processStart = `/Date(${Date.parse(startedAtUtc)})/`;
  const startupMru = {
    ok: true,
    command: "inspect-aurora-toolset-startup-mru-readonly",
    iniPath: resolve(nativeRoot, "nwtoolset.ini"),
    modulePath: sourceModule.path,
    expectedModule: "m2a_test.mod",
    currentMru0: installedModule.path,
    currentMru0Normalized: installedModule.path.toLowerCase(),
    targetNormalized: sourceModule.path.toLowerCase(),
    exactTarget: false,
    safety: {
      readOnly: true,
      startsToolset: false,
      startsNwn: false,
      usesGlobalInput: false,
      changesIniOrMru: false,
    },
  };
  const moduleOpen = {
    ok: true,
    startedToolset: true,
    recoveryConfirmationHandled: false,
    recoveryConfirmationHandledCount: 0,
    openModuleDialogRequested: true,
    openModuleDialogHandled: false,
    openModuleDialogHandledAt: null,
    openModuleDialogProbe: null,
    openModuleDialogResult: null,
    moduleOpenActionSubmitted: false,
    moduleOpenActionSubmittedAt: null,
    moduleOpenActionKind: null,
    moduleLoadOwner: "mru",
    explicitOpenEligibilityGranted: true,
    moduleLoadedPreActionGuardCount: 0,
    welcomeHandled: true,
    moduleWindowTitle: frameTitle,
    moduleWindowHwnd: frameHwnd,
    expectedModuleParts: ["m2a_test", "mod"],
    modulePath: installedModule.path,
  };
  return {
    version: "aurora-toolset-binary-native-geometry-manifest/v1",
    explicitOpenStartupAdmissionVersion: "aurora-toolset-explicit-open-startup-admission/v3",
    profilePath: binaryProfile.path,
    profileSha256: binaryProfile.sha256,
    profileId: "m2a-test-binary",
    artifactDir,
    module: { resref: "m2a_test", path: sourceModule.path, sha256: sourceModule.sha256 },
    area: { resref: "m2a_area", width: 2, height: 2, displayName: "Meshy2Aurora proof area" },
    status: "failed",
    blockerCode: "BINARY_NATIVE_EXPLICIT_OPEN_OWNERSHIP_UNVERIFIED",
    safety: {
      startsToolset: false,
      startsNwn: false,
      usesGlobalInput: false,
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      usesGlobalMouse: false,
      usesGlobalMouseWheel: false,
      savesModule: false,
      changesIniOrMru: false,
      noLocalToolsetAdapter: true,
    },
    startupAdmission: {
      version: "aurora-toolset-explicit-open-startup-admission/v3",
      mode: "passive_observation_then_explicit_open",
      startupMru,
      mruConflict: true,
      startsToolsetWithoutModuleArgument: true,
      openOnlyFromUnownedWelcomeOrBlankFrame: true,
      requiresExactVisibleModuleListMatch: true,
      forbidsOpenAfterLoadOwner: true,
      forbidsIniOrMruMutation: true,
      noLocalToolsetAdapter: true,
    },
    openFailure: {
      child: {
        ok: true,
        skippedAreaOpen: true,
        safety: {
          usesGlobalCursor: false,
          usesGlobalKeyboard: false,
          usesGlobalMouseWheel: false,
          usesGlobalDrag: false,
        },
        iniStaging: {
          ok: true,
          action: "read_only",
          applied: false,
          iniPath: startupMru.iniPath,
          recentFilesAction: "observed_only",
          currentMru0: installedModule.path,
          windowPositionAction: "observed_read_only",
          iniMutationForbidden: true,
        },
        moduleOpen,
        moduleOpenSessionGuard: {
          ok: true,
          state: "module_loaded_skip_area_open",
          modulePath: installedModule.path,
          normalizedModulePath: installedModule.path.toLowerCase(),
          expectedModuleParts: ["m2a_test", "mod"],
          expectedAreaResref: "m2a_area",
          moduleWindowTitle: frameTitle,
          moduleWindowHwnd: frameHwnd,
          moduleOpenActionSubmitted: false,
          moduleOpenActionKind: null,
          liveToolsetProcessCountAtAcquire: 0,
          allowReuseOpenSession: false,
        },
        accessViolation: { detected: false, blockerCode: null, matches: [] },
        criticalFailureRecord: null,
      },
      postChildProcesses: [{
        Id: processId,
        StartTime: processStart,
        MainWindowTitle: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17",
        Responding: true,
      }],
      postChildWindows: {
        ok: true,
        processId,
        responding: true,
        windows: [
          { hwnd: frameHwnd, className: "TfrmFrame", text: frameTitle },
          { hwnd: frameHwnd + 1, className: "TApplication", text: "BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17" },
        ],
      },
    },
  };
}

function fixture(name, payload) {
  const path = resolve(root, "fixtures", name);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify({ version: "aurora-model-proof-120s-prep-state-fixture/v1", ...payload }, null, 2)}\n`, "utf8");
  return path;
}

function writeBytes(relative, bytes) {
  const path = resolve(artifacts, relative);
  return writeAbsoluteBytes(path, bytes);
}

function writeAbsoluteBytes(path, bytes) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
  return { path, sha256: sha256(bytes), byteLength: bytes.length };
}

function writeJson(relative, value) {
  const path = resolve(artifacts, relative);
  mkdirSync(dirname(path), { recursive: true });
  const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, "utf8");
  writeFileSync(path, bytes);
  return { path, sha256: sha256(bytes) };
}

function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }

function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function fileIdentity(path) {
  const bytes = readFileSync(path);
  return { path: resolve(path), sha256: sha256(bytes), byteLength: bytes.length };
}
function escapeRegex(value) { return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"); }
