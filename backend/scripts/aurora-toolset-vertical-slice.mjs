#!/usr/bin/env node
/*
 * Central, two-phase bootstrap for a fresh Aurora vertical slice.
 * It deliberately composes only named verified atoms.  A project must never
 * call those atoms directly or replace this route with a local adapter.
 */
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [command, ...rawArgs] = process.argv.slice(2);
const options = parseArgs(rawArgs);

switch (command) {
  case "dry-run": {
    const profile = readJson(requiredPath(options.profile, "--profile"));
    validateImmutableProfile(profile);
    print({ ok: true, command, version: "aurora-toolset-vertical-slice/v2", profileId: profile.id, atoms: atoms(), noLocalSubstitute: true, startsToolset: false, startsNwn: false });
    break;
  }
  case "bootstrap-dry-run": {
    const declaration = readJson(requiredPath(options.declaration, "--declaration"));
    validateDeclaration(declaration, { destinationMustBeAbsent: true });
    print({ ok: true, command, version: "aurora-toolset-vertical-slice-bootstrap/v1", declarationId: declaration.id, destination: resolve(declaration.module.path), atoms: atoms().slice(0, 4), startsToolset: false, startsNwn: false, writesArtifacts: false, noLocalSubstitute: true });
    break;
  }
  case "bootstrap-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-recover-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapRecoverCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-recover-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileRecoverCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-progress-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileProgressCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-area-list-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileAreaListCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-module-finish-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileModuleFinishCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-module-next-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileModuleNextCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-module-next-post-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileModuleNextPostCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-post-finish-save-as-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcilePostFinishSaveAsCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-save-as-monitor-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileSaveAsMonitorCreate(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-pending-save-as-cancel": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcilePendingSaveAsCancel(declaration, declarationPath, outDir);
    break;
  }
  case "bootstrap-reconcile-saved-hak-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileSavedHakCreate(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-saved-hak-menu-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileSavedHakMenuCreate(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-saved-hak-menu-state-create": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileSavedHakMenuStateCreate(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-observe-saved-hak-edit-popup": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapObserveSavedHakEditPopup(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-unexpected-area-resize-cancel": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileUnexpectedAreaResizeCancel(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-unexpected-area-resize-postcheck": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileUnexpectedAreaResizePostcheck(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-post-area-resize-hak-command": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcilePostAreaResizeHakCommand(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-unexpected-area-rotate-cancel": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileUnexpectedAreaRotateCancel(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHak(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-combo": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakCombo(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-combo-sentinel": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakComboSentinel(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-combo-clear-selection": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakComboClearSelection(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-add": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakAdd(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-add-selected": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakAddSelected(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-selection-change": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakSelectionChange(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-selection-change-render": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakSelectionChange(declaration, declarationPath, outDir, { resumeRenderedAtomFailure: true }); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-add-notified": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakAddNotified(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-rebuild-warning": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakRebuildWarning(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-observe-open-module-properties-hak-rebuild-timeout": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapObserveOpenModulePropertiesHakRebuildTimeout(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-rebuild-done": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakRebuildDone(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-rebuild-persist": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakRebuildPersist(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-open-module-properties-hak-rebuild-persist-lock": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileOpenModulePropertiesHakRebuildPersistLock(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-place-creature": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedPlaceCreature(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocation(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-object-list": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationObjectList(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-menu-transport": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationMenuTransport(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-menu-owner": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationMenuOwner(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-menu-accelerator": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationMenuAccelerator(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-walkmesh-candidate": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationWalkmeshCandidate(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-walkmesh-candidate-save-transport": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationWalkmeshCandidateSaveTransport(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-en-change": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationEnChange(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-en-change-render": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationEnChange(declaration, declarationPath, outDir, { resumeRenderedAtomFailure: true }); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-apply": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationApply(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-replace": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationReplace(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-native-char": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationNativeChar(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-native-char-render": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationNativeChar(declaration, declarationPath, outDir, true); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDown(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-render": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDown(declaration, declarationPath, outDir, true); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-click-probe": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownClickProbe(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-synchronized": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationSynchronized(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationClickType(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type-render": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationClickType(declaration, declarationPath, outDir, true); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type-remote": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationClickType(declaration, declarationPath, outDir, false, true); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type-remote-render": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationClickType(declaration, declarationPath, outDir, false, false, true); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-native-step": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationNativeStep(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-focus-exit": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationFocusExit(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-focus-exit-client-buttons": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationFocusExitClientButtons(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-focus-type": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationFocusType(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-cm-exit": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationCmExit(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-notify": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownNotify(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-key": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownKey(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-key-click-focus": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownKeyClickFocus(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-cn-command-change": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationCnCommandChange(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-send-click": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownSendClick(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-manual-x-focus-exit": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationManualXFocusExit(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-manual-x-focus-type": {
    const declarationPath = requiredPath(options.declaration, "--declaration"); const declaration = readJson(declarationPath); const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapReconcileHakAttachedInvalidLocationAdjustLocationManualXFocusType(declaration, declarationPath, outDir); break;
  }
  case "bootstrap-geometry-observe": {
    const declaration = readJson(requiredPath(options.declaration, "--declaration"));
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapGeometryObserve(declaration, outDir);
    break;
  }
  case "bootstrap-focus-dry-run": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const sourceOutDir = requiredPath(options.sourceOutDir, "--sourceOutDir");
    const state = validateSavedCandidateForFocus(declaration, declarationPath, sourceOutDir);
    print({ ok: true, command, status: "saved_candidate_focus_plan_valid", startsToolset: false, startsNwn: false, writesArtifacts: false, changesIniOrMru: false, modelVisibility: "not_tested", proofCompleteness: "missing", candidate: state.candidate, action: "exact object selection -> &Focus on Object -> fresh validated TScrollBox", noNewIteration: true });
    break;
  }
  case "bootstrap-focus-capture": {
    const declarationPath = requiredPath(options.declaration, "--declaration");
    const declaration = readJson(declarationPath);
    const sourceOutDir = requiredPath(options.sourceOutDir, "--sourceOutDir");
    const outDir = requiredPath(options.outDir, "--outDir");
    bootstrapFocusCapture(declaration, declarationPath, sourceOutDir, outDir);
    break;
  }
  case "bootstrap-focus-record-visibility": {
    bootstrapFocusRecordVisibility(requiredPath(options.outDir, "--outDir"), requiredText(options.modelVisibility, "--modelVisibility"), requiredText(options.inspection, "--inspection"));
    break;
  }
  case "bootstrap-focus-close-failed-open": {
    bootstrapFocusCloseFailedOpen(requiredPath(options.outDir, "--outDir"), requiredText(options.closeAuthorization, "--closeAuthorization"));
    break;
  }
  case "bootstrap-entry-surface-arm": {
    const declaration = readJson(requiredPath(options.declaration, "--declaration"));
    bootstrapEntrySurfaceArm(declaration, requiredPath(options.outDir, "--outDir"));
    break;
  }
  case "bootstrap-entry-surface-ingest": {
    const declaration = readJson(requiredPath(options.declaration, "--declaration"));
    bootstrapEntrySurfaceIngest(declaration, requiredPath(options.outDir, "--outDir"), readJson(requiredPath(options.handoff, "--handoff")));
    break;
  }
  case "bootstrap-finalize": {
    const declaration = readJson(requiredPath(options.declaration, "--declaration"));
    const outDir = requiredPath(options.outDir, "--outDir");
    const gate = readJson(requiredPath(options.geometryGate, "--geometryGate"));
    bootstrapFinalize(declaration, outDir, gate);
    break;
  }
  default:
    throw new Error("Use: dry-run, bootstrap-dry-run, or a documented central Aurora vertical-slice command; see aurora-toolset-vertical-slice-standard.md.");
}

function bootstrapCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  if (existsSync(outDir)) throw new Error(`bootstrap_artifact_destination_already_exists:${outDir}`);
  mkdirSync(outDir, { recursive: true });
  const manifest = baseBootstrapManifest(declaration, declarationPath, outDir);
  executeBootstrapCreate(declaration, outDir, manifest, { commandName: "bootstrap-create", reuseModuleWizard: false, resumeModuleWizardPage: "name" });
}

function bootstrapRecoverCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_recovery_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_recovery_manifest_declaration_mismatch");
  if (manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_create_failed" || !isRecoverableBlankModuleNameFailure(manifest, declaration.module.resref)) throw new Error("bootstrap_recovery_not_authorized_for_failure");
  if (Array.isArray(manifest.recoveryAttempts) && manifest.recoveryAttempts.length > 0) throw new Error("bootstrap_recovery_already_attempted");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-recover-create", mode: "dry-run", status: "authorized_for_exact_blank_module_name_page", destination: resolve(declaration.module.path), startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["one responsive Toolset PID", "one exact TdlgModuleWizard / Module Wizard", "one visible blank TEdit ordinal 0", "absent destination MOD"] });
    return;
  }
  manifest.recoveryAttempts = [{ at: new Date().toISOString(), priorError: manifest.error, mode: "reuse_exact_blank_module_name_page" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, recoveryDoesNotOpenModule: true };
  writeJson(manifestPath, manifest);
  executeBootstrapCreate(declaration, outDir, manifest, { commandName: "bootstrap-recover-create", reuseModuleWizard: true, resumeModuleWizardPage: "name" });
}

function bootstrapReconcileRecoverCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_reconcile_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_reconcile_manifest_declaration_mismatch");
  if (manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_create_failed" || !isRecoverableExpectedBeforeEnvironmentFailure(manifest.error) || !Array.isArray(manifest.recoveryAttempts) || manifest.recoveryAttempts.length !== 1 || (manifest.reconciliationAttempts?.length ?? 0) !== 0) throw new Error("bootstrap_reconcile_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-recover-create", mode: "dry-run", status: "authorized_for_expected_before_environment_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["one prior recovery attempt", "one responsive Toolset PID", "one exact TdlgModuleWizard / Module Wizard", "one visible blank TEdit ordinal 0", "absent destination MOD"] });
    return;
  }
  const observation = observeBlankModuleNamePage();
  manifest.reconciliationAttempts = [{ at: new Date().toISOString(), priorError: manifest.error, observation, mode: "reuse_exact_blank_module_name_page_after_expected_before_environment_fix" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, recoveryDoesNotOpenModule: true, reconciliationReadOnlyPreflight: true };
  writeJson(manifestPath, manifest);
  executeBootstrapCreate(declaration, outDir, manifest, { commandName: "bootstrap-reconcile-recover-create", reuseModuleWizard: true, resumeModuleWizardPage: "name" });
}

function bootstrapReconcileProgressCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_progress_reconcile_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_progress_reconcile_manifest_declaration_mismatch");
  if (manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_create_failed" || !String(manifest.error ?? "").includes("button_send_timeout_failed") || manifest.recoveryAttempts?.length !== 1 || manifest.reconciliationAttempts?.length !== 1 || (manifest.progressReconciliationAttempts?.length ?? 0) !== 0) throw new Error("bootstrap_progress_reconcile_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-progress-create", mode: "dry-run", status: "authorized_for_post_name_module_wizard_resume", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["one prior recovery", "one prior expected-before reconciliation", "nested button_send_timeout_failed", "one responsive Toolset PID", "settled exact post-name Module Wizard", "absent destination MOD"] });
    return;
  }
  const observation = observeSettledPostNameModuleWizard();
  manifest.progressReconciliationAttempts = [{ at: new Date().toISOString(), priorError: manifest.error, observation, mode: "resume_after_processed_name_next_without_reclick" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, recoveryDoesNotOpenModule: true, progressReconciliationReadOnlyPreflight: true };
  writeJson(manifestPath, manifest);
  executeBootstrapCreate(declaration, outDir, manifest, { commandName: "bootstrap-reconcile-progress-create", reuseModuleWizard: true, resumeModuleWizardPage: "after-name" });
}

function bootstrapReconcileAreaListCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_area_list_reconcile_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_area_list_reconcile_manifest_declaration_mismatch");
  if (manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_create_failed" || !isRecoverableAreaListParseFailure(manifest.error) || manifest.recoveryAttempts?.length !== 1 || manifest.reconciliationAttempts?.length !== 1 || manifest.progressReconciliationAttempts?.length !== 1 || (manifest.areaListReconciliationAttempts?.length ?? 0) !== 0) throw new Error("bootstrap_area_list_reconcile_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-area-list-create", mode: "dry-run", status: "authorized_for_after_area_name_list_resume", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested InvalidVariableReferenceWithDrive parser failure", "one recovery, expected-before reconciliation, and progress resume", "one responsive Toolset PID", "exact Area Wizard list page with preserved Area name", "absent destination MOD"] });
    return;
  }
  const observation = observeAfterAreaNameListPage(declaration.area.resref);
  manifest.areaListReconciliationAttempts = [{ at: new Date().toISOString(), priorError: manifest.error, observation, mode: "resume_after_area_name_before_tileset_selection" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, recoveryDoesNotOpenModule: true, areaListReconciliationReadOnlyPreflight: true };
  writeJson(manifestPath, manifest);
  executeBootstrapCreate(declaration, outDir, manifest, { commandName: "bootstrap-reconcile-area-list-create", reuseModuleWizard: true, resumeModuleWizardPage: "after-area-name" });
}

function bootstrapReconcileModuleFinishCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_module_finish_reconcile_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_module_finish_reconcile_manifest_declaration_mismatch");
  if (manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_create_failed" || !isRecoverableModuleWizardFinishFailure(manifest.error) || manifest.recoveryAttempts?.length !== 1 || manifest.reconciliationAttempts?.length !== 1 || manifest.progressReconciliationAttempts?.length !== 1 || manifest.areaListReconciliationAttempts?.length !== 1 || (manifest.moduleFinishReconciliationAttempts?.length ?? 0) !== 0) throw new Error("bootstrap_module_finish_reconcile_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-module-finish-create", mode: "dry-run", status: "authorized_for_post_area_module_finish_resume", destination: resolve(declaration.module.path), startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested module_wizard_finish_not_enabled", "one recovery, expected-before reconciliation, progress resume, and area-list resume", "one responsive Toolset PID", "exact unselected created Area in post-Area Module Wizard", "absent destination MOD"] });
    return;
  }
  const observation = observePostAreaModuleWizard(declaration.area.resref);
  manifest.moduleFinishReconciliationAttempts = [{ at: new Date().toISOString(), priorError: manifest.error, observation, mode: "select_exact_created_area_then_wait_for_enabled_finish" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, recoveryDoesNotOpenModule: true, moduleFinishReconciliationReadOnlyPreflight: true };
  writeJson(manifestPath, manifest);
  executeBootstrapCreate(declaration, outDir, manifest, { commandName: "bootstrap-reconcile-module-finish-create", reuseModuleWizard: true, resumeModuleWizardPage: "after-area-finish" });
}

function bootstrapReconcileModuleNextCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_module_next_reconcile_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_module_next_reconcile_manifest_declaration_mismatch");
  if (manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_create_failed" || !isRecoverableModuleFinishEnableTimeout(manifest.error) || manifest.recoveryAttempts?.length !== 1 || manifest.reconciliationAttempts?.length !== 1 || manifest.progressReconciliationAttempts?.length !== 1 || manifest.areaListReconciliationAttempts?.length !== 1 || manifest.moduleFinishReconciliationAttempts?.length !== 1 || (manifest.moduleNextReconciliationAttempts?.length ?? 0) !== 0) throw new Error("bootstrap_module_next_reconcile_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-module-next-create", mode: "dry-run", status: "authorized_for_selected_post_area_module_next_resume", destination: resolve(declaration.module.path), startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested module Finish enable timeout", "one recovery, expected-before reconciliation, progress resume, area-list resume, and module-Finish continuation", "one responsive Toolset PID", "exact selected created Area and enabled Module Wizard Next", "absent destination MOD"] });
    return;
  }
  const observation = observeSelectedPostAreaModuleWizard(declaration.area.resref);
  manifest.moduleNextReconciliationAttempts = [{ at: new Date().toISOString(), priorError: manifest.error, observation, mode: "post_exact_module_wizard_next_then_read_final_finish_page" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, recoveryDoesNotOpenModule: true, moduleNextReconciliationReadOnlyPreflight: true };
  writeJson(manifestPath, manifest);
  executeBootstrapCreate(declaration, outDir, manifest, { commandName: "bootstrap-reconcile-module-next-create", reuseModuleWizard: true, resumeModuleWizardPage: "after-module-area-list" });
}

function bootstrapReconcileModuleNextPostCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_module_next_post_reconcile_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_module_next_post_reconcile_manifest_declaration_mismatch");
  if (manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_create_failed" || !isRecoverableModuleFinishEnableTimeout(manifest.error) || manifest.recoveryAttempts?.length !== 1 || manifest.reconciliationAttempts?.length !== 1 || manifest.progressReconciliationAttempts?.length !== 1 || manifest.areaListReconciliationAttempts?.length !== 1 || manifest.moduleFinishReconciliationAttempts?.length !== 1 || manifest.moduleNextReconciliationAttempts?.length !== 1 || (manifest.moduleNextPostReconciliationAttempts?.length ?? 0) !== 0) throw new Error("bootstrap_module_next_post_reconcile_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-module-next-post-create", mode: "dry-run", status: "authorized_for_selected_post_area_module_next_post_resume", destination: resolve(declaration.module.path), startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested module Finish enable timeout after prior module-Next continuation", "one complete prior recovery chain and one prior module-Next continuation", "one responsive Toolset PID", "exact selected created Area and enabled Module Wizard Next", "absent destination MOD"] });
    return;
  }
  const observation = observeSelectedPostAreaModuleWizard(declaration.area.resref);
  manifest.moduleNextPostReconciliationAttempts = [{ at: new Date().toISOString(), priorError: manifest.error, observation, mode: "post_exact_module_wizard_next_after_resume_ordering_fix" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, recoveryDoesNotOpenModule: true, moduleNextPostReconciliationReadOnlyPreflight: true };
  writeJson(manifestPath, manifest);
  executeBootstrapCreate(declaration, outDir, manifest, { commandName: "bootstrap-reconcile-module-next-post-create", reuseModuleWizard: true, resumeModuleWizardPage: "after-module-area-list" });
}

function bootstrapReconcilePostFinishSaveAsCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_post_finish_save_as_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_post_finish_save_as_manifest_declaration_mismatch");
  if (manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_create_failed" || !isRecoverablePostFinishFrameFailure(manifest.error) || manifest.recoveryAttempts?.length !== 1 || manifest.reconciliationAttempts?.length !== 1 || manifest.progressReconciliationAttempts?.length !== 1 || manifest.areaListReconciliationAttempts?.length !== 1 || manifest.moduleFinishReconciliationAttempts?.length !== 1 || manifest.moduleNextReconciliationAttempts?.length !== 1 || manifest.moduleNextPostReconciliationAttempts?.length !== 1 || (manifest.postFinishSaveAsReconciliationAttempts?.length ?? 0) !== 0) throw new Error("bootstrap_post_finish_save_as_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-post-finish-save-as-create", mode: "dry-run", status: "authorized_for_unsaved_post_finish_save_as", destination: resolve(declaration.module.path), startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested module_frame_not_settled after Module Wizard Finish", "one complete prior recovery chain and one prior module-Next-post continuation", "one responsive unsaved Toolset frame with exact title", "absent destination MOD", "validated File/Save As -> TdlgModuleSelect transaction"] });
    return;
  }
  const observation = observeUnsavedPostFinishFrame();
  manifest.postFinishSaveAsReconciliationAttempts = [{ at: new Date().toISOString(), priorError: manifest.error, observation, mode: "persist_exact_unsaved_post_finish_frame_through_tdlgmoduleselect" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, recoveryDoesNotOpenModule: true, postFinishSaveAsReadOnlyPreflight: true };
  writeJson(manifestPath, manifest);
  executeBootstrapPostInitialSave(declaration, outDir, manifest, { commandName: "bootstrap-reconcile-post-finish-save-as-create", expectedFrameTitle: observation.frameTitle });
}

function bootstrapReconcileSaveAsMonitorCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_save_as_monitor_manifest_missing");
  const manifest = readJson(manifestPath);
  const legacyMonitorFailure = manifest.blockerCode === "area_geometry_invalid" || manifest.blockerCode === "bootstrap_initial_save_failed";
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_save_as_monitor_manifest_declaration_mismatch");
  const monitorFailureOrDurablyCancelledPendingModal = isRecoverableSaveAsMonitorFailure(manifest.error) || manifest.error === "save_as_pending_modal_cancelled_durably";
  if (manifest.status !== "failed" || !legacyMonitorFailure || !monitorFailureOrDurablyCancelledPendingModal || manifest.recoveryAttempts?.length !== 1 || manifest.reconciliationAttempts?.length !== 1 || manifest.progressReconciliationAttempts?.length !== 1 || manifest.areaListReconciliationAttempts?.length !== 1 || manifest.moduleFinishReconciliationAttempts?.length !== 1 || manifest.moduleNextReconciliationAttempts?.length !== 1 || manifest.moduleNextPostReconciliationAttempts?.length !== 1 || manifest.postFinishSaveAsReconciliationAttempts?.length !== 1 || (manifest.saveAsMonitorReconciliationAttempts?.length ?? 0) !== 0) throw new Error("bootstrap_save_as_monitor_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-save-as-monitor-create", mode: "dry-run", status: "authorized_for_save_as_monitor_policy_reconcile", destination: resolve(declaration.module.path), startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested save_as_dialog_not_on_display1 after one post-Finish Save As attempt", "one complete prior recovery chain and one prior post-Finish Save As continuation", "one responsive unsaved Toolset frame on DISPLAY1", "absent destination MOD", "exact TdlgModuleSelect with same PID and shared native owner as the frame; no window movement"] });
    return;
  }
  const observation = observeUnsavedPostFinishFrame();
  manifest.saveAsMonitorReconciliationAttempts = [{ at: new Date().toISOString(), priorError: manifest.error, observation, mode: "retry_exact_save_as_only_with_shared_native_owner_monitor_exception" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, recoveryDoesNotOpenModule: true, saveAsMonitorReadOnlyPreflight: true, neverMovesOrFocusesDialog: true };
  writeJson(manifestPath, manifest);
  executeBootstrapPostInitialSave(declaration, outDir, manifest, { commandName: "bootstrap-reconcile-save-as-monitor-create", expectedFrameTitle: observation.frameTitle });
}

function bootstrapReconcilePendingSaveAsCancel(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: true });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_pending_save_as_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_pending_save_as_manifest_declaration_mismatch");
  if (manifest.status !== "failed" || !isRecoverableSaveAsMonitorFailure(manifest.error) || manifest.recoveryAttempts?.length !== 1 || manifest.reconciliationAttempts?.length !== 1 || manifest.progressReconciliationAttempts?.length !== 1 || manifest.areaListReconciliationAttempts?.length !== 1 || manifest.moduleFinishReconciliationAttempts?.length !== 1 || manifest.moduleNextReconciliationAttempts?.length !== 1 || manifest.moduleNextPostReconciliationAttempts?.length !== 1 || manifest.postFinishSaveAsReconciliationAttempts?.length !== 1 || (manifest.pendingSaveAsCancellationAttempts?.length ?? 0) !== 0) throw new Error("bootstrap_pending_save_as_cancel_not_authorized_for_failure");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-pending-save-as-cancel", mode: "dry-run", status: "authorized_for_pending_save_as_cancellation", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["exact pending TdlgModuleSelect / Save As from the v7 monitor-policy rejection", "one responsive Toolset PID and generic unsaved frame", "only exact Cancel post followed by fresh dialog-disappearance readback", "absent destination MOD"] }); return; }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const pending = (windows.windows ?? []).filter((window) => window.className === "TdlgModuleSelect" && window.text === "Save As");
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && /^BioWare Aurora Neverwinter Nights Toolset v89\.8193\.37-17\*$/u.test(String(window.text)));
  if (windows.responding !== true || pending.length !== 1 || frames.length !== 1 || !existsSync(resolve(declaration.module.path))) { /* destination check below preserves absent-only contract */ }
  if (windows.responding !== true || pending.length !== 1 || frames.length !== 1 || existsSync(resolve(declaration.module.path))) throw new Error(`bootstrap_pending_save_as_state_unverified:${JSON.stringify({ responding: windows.responding, pending, frames, destinationExists: existsSync(resolve(declaration.module.path)) })}`);
  const cancel = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgModuleSelect", "--dialogTitle", "Save As", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
  const after = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  if ((after.windows ?? []).some((window) => window.className === "TdlgModuleSelect" && window.text === "Save As")) throw new Error("bootstrap_pending_save_as_cancel_not_durable");
  manifest.pendingSaveAsCancellationAttempts = [{ at: new Date().toISOString(), pending, cancel, after, mode: "cancel_exact_v7_pending_save_as_then_require_disappearance" }];
  manifest.status = "failed"; manifest.blockerCode = "bootstrap_initial_save_failed"; manifest.failureCode = "initial_save_pending_modal_cancelled"; manifest.error = "save_as_pending_modal_cancelled_durably";
  writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-pending-save-as-cancel", status: "pending_save_as_cancelled", manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false });
}

function bootstrapReconcileSavedHakCreate(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); if (!existsSync(manifestPath)) throw new Error("bootstrap_saved_hak_manifest_missing");
  const manifest = readJson(manifestPath); const hakFailure = String(manifest.error ?? "").includes("Cannot overwrite variable pid") && String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs");
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration) || manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_hak_attach_failed" || !hakFailure || (manifest.savedHakReconciliationAttempts?.length ?? 0) !== 0 || !existsSync(resolve(declaration.module.path))) throw new Error("bootstrap_saved_hak_not_authorized_for_failure");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-saved-hak-create", mode: "dry-run", status: "authorized_for_saved_unattached_hak_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["physical first-saved MOD; OS lock means hash remains unknown", "one responsive Toolset PID with exact loaded module frame", "no wizard or Save As modal", "only ordered HAK attachment after native frame identity readback"] }); return; }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  if (windows.responding !== true || (windows.windows ?? []).filter((w) => w.className === "TfrmFrame" && w.text === exact).length !== 1 || (windows.windows ?? []).some((w) => !["TfrmFrame", "TApplication"].includes(w.className))) throw new Error("bootstrap_saved_hak_native_frame_unverified");
  manifest.savedHakReconciliationAttempts = [{ at: new Date().toISOString(), nativeFrame: exact, moduleBytes: statSync(resolve(declaration.module.path)).size, hash: "unknown_os_locked", mode: "resume_ordered_hak_after_native_saved_module_readback" }]; manifest.status = "recovering"; writeJson(manifestPath, manifest);
  try { completeBootstrapAfterModulePersistence(declaration, outDir, manifest, (windows.windows ?? []).find((w) => w.className === "TfrmFrame").hwnd); writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-saved-hak-create", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false }); } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileSavedHakMenuCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_saved_hak_menu_manifest_missing");
  const manifest = readJson(manifestPath);
  const menuFailure = String(manifest.error ?? "").includes("expected_one_module_properties_menu:0") && String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs");
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration) || manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_hak_attach_failed" || !menuFailure || manifest.savedHakReconciliationAttempts?.length !== 1 || (manifest.savedHakMenuReconciliationAttempts?.length ?? 0) !== 0 || !existsSync(resolve(declaration.module.path))) throw new Error("bootstrap_saved_hak_menu_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-saved-hak-menu-create", mode: "dry-run", status: "authorized_for_owner_drawn_module_properties_menu_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested expected_one_module_properties_menu:0 after the saved-HAK continuation", "physical first-saved MOD with hash unknown only while OS-locked", "one responsive Toolset PID with the exact loaded module frame", "no wizard, Save As, popup, or Module Properties dialog", "only the verified owner-drawn Edit -> Module Properties HAK route"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
  if (windows.responding !== true || frames.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_saved_hak_menu_native_state_unverified:${JSON.stringify({ responding: windows.responding, frames, unexpected })}`);
  manifest.savedHakMenuReconciliationAttempts = [{ at: new Date().toISOString(), nativeFrame: exact, moduleBytes: statSync(resolve(declaration.module.path)).size, hash: "unknown_os_locked", menuContract: "aurora-module-properties-menu-contract/v1", mode: "resume_after_owner_drawn_menu_text_failure" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, directAtomPublicRoute: false, ownerDrawnMenuRecoveryReadOnlyPreflight: true };
  writeJson(manifestPath, manifest);
  try {
    completeBootstrapAfterModulePersistence(declaration, outDir, manifest, frames[0].hwnd);
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-saved-hak-menu-create", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileSavedHakMenuStateCreate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_saved_hak_menu_state_manifest_missing");
  const manifest = readJson(manifestPath);
  const stateFailure = String(manifest.error ?? "").includes("module_properties_edit_menu_invalid:count=14 state=3600") && String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs");
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration) || manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_hak_attach_failed" || !stateFailure || manifest.savedHakReconciliationAttempts?.length !== 1 || manifest.savedHakMenuReconciliationAttempts?.length !== 1 || (manifest.savedHakMenuStateReconciliationAttempts?.length ?? 0) !== 0 || !existsSync(resolve(declaration.module.path))) throw new Error("bootstrap_saved_hak_menu_state_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-saved-hak-menu-state-create", mode: "dry-run", status: "authorized_for_owner_drawn_module_properties_state_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested module_properties_edit_menu_invalid:count=14 state=3600 after the owner-drawn-menu continuation", "physical first-saved MOD with hash unknown only while OS-locked", "one responsive Toolset PID with the exact loaded module frame", "no wizard, Save As, popup, or Module Properties dialog", "only the v1 MENUITEMINFO state/type HAK route"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
  if (windows.responding !== true || frames.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_saved_hak_menu_state_native_state_unverified:${JSON.stringify({ responding: windows.responding, frames, unexpected })}`);
  manifest.savedHakMenuStateReconciliationAttempts = [{ at: new Date().toISOString(), nativeFrame: exact, moduleBytes: statSync(resolve(declaration.module.path)).size, hash: "unknown_os_locked", menuContract: "aurora-module-properties-menu-contract/v1", stateReadback: { legacyGetMenuState: "0x3600", enabledStateMask: "0x0003", separatorTypeMask: "0x0800" }, mode: "resume_after_owner_drawn_menu_state_conflation" }];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, directAtomPublicRoute: false, ownerDrawnMenuStateRecoveryReadOnlyPreflight: true };
  writeJson(manifestPath, manifest);
  try {
    completeBootstrapAfterModulePersistence(declaration, outDir, manifest, frames[0].hwnd);
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-saved-hak-menu-state-create", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapObserveSavedHakEditPopup(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_edit_popup_observation_manifest_missing");
  const manifest = readJson(manifestPath);
  const popupFailure = String(manifest.error ?? "").includes("module_properties_edit_popup_missing") && String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs");
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration) || manifest.status !== "failed" || manifest.blockerCode !== "bootstrap_hak_attach_failed" || !popupFailure || manifest.savedHakReconciliationAttempts?.length !== 1 || manifest.savedHakMenuReconciliationAttempts?.length !== 1 || manifest.savedHakMenuStateReconciliationAttempts?.length !== 1 || (manifest.editPopupObservationAttempts?.length ?? 0) !== 0 || !existsSync(resolve(declaration.module.path))) throw new Error("bootstrap_edit_popup_observation_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-observe-saved-hak-edit-popup", mode: "dry-run", status: "authorized_for_edit_popup_identity_observation", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested module_properties_edit_popup_missing after the owner-drawn-menu-state continuation", "physical first-saved MOD with hash unknown only while OS-locked", "one responsive Toolset PID with the exact loaded module frame", "no wizard, Save As, popup, or Module Properties dialog", "one targeted non-mutating SC_KEYMENU/Edit popup observation followed by durable close"] });
    return;
  }
  const observation = runAtom("probe-aurora-toolset-edit-menu-popup-no-global-input.mjs", ["--module", declaration.module.resref]);
  manifest.editPopupObservationAttempts = [{ at: new Date().toISOString(), observation, mode: "observe_sc_keymenu_popup_identity_then_close_without_menu_selection" }];
  manifest.status = "failed";
  manifest.blockerCode = "bootstrap_hak_attach_failed";
  manifest.failureCode = observation.status === "popup_observed" ? "module_properties_edit_popup_identity_observed" : "module_properties_edit_popup_identity_unavailable";
  manifest.error = observation.status === "popup_observed" ? "module_properties_edit_popup_identity_observed" : `module_properties_edit_popup_identity_unavailable:${JSON.stringify({ status: observation.status, newTopLevel: observation.newTopLevel, popup: observation.popup })}`;
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, directAtomPublicRoute: false, editPopupObservationOnly: true };
  writeJson(manifestPath, manifest);
  print({ ok: true, command: "bootstrap-observe-saved-hak-edit-popup", status: observation.status, manifestPath, observation, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, menuItemSelected: false });
}

function bootstrapReconcileUnexpectedAreaResizeCancel(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_area_resize_cancel_manifest_missing");
  const manifest = readJson(manifestPath);
  const popupFailure = String(manifest.error ?? "").includes("module_properties_edit_popup_missing") && String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_hak_attach_failed" && popupFailure && manifest.savedHakReconciliationAttempts?.length === 1 && manifest.savedHakMenuReconciliationAttempts?.length === 1 && manifest.savedHakMenuStateReconciliationAttempts?.length === 1 && (manifest.editPopupObservationAttempts?.length ?? 0) === 0 && (manifest.areaResizeCancellationAttempts?.length ?? 0) === 0 && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_area_resize_cancel_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-unexpected-area-resize-cancel", mode: "dry-run", status: "authorized_for_exact_unexpected_area_resize_cancel", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested module_properties_edit_popup_missing before any HAK UI mutation", "one responsive Toolset PID with exact loaded module frame", "one exact TfrmAreaResize / Resize Area modal and no other modal", "unselected native Tiny/Small/Medium/Large preset list", "only targeted asynchronous Cancel followed by disappearance and saved ARE/GIT no-delta readback"] });
    return;
  }
  const beforeWindows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exactTitle = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (beforeWindows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactTitle);
  const resize = (beforeWindows.windows ?? []).filter((window) => window.className === "TfrmAreaResize" && window.text === "Resize Area");
  const unexpected = (beforeWindows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmAreaResize"].includes(window.className));
  if (beforeWindows.responding !== true || frames.length !== 1 || resize.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_area_resize_cancel_native_state_unverified:${JSON.stringify({ responding: beforeWindows.responding, frames, resize, unexpected })}`);
  const controls = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "TfrmAreaResize", "--title", "Resize Area"]);
  const visible = (controls.controls ?? []).filter((control) => control.visible === true);
  const edits = visible.filter((control) => control.className === "TEdit" && control.enabled === true);
  const lists = visible.filter((control) => control.className === "TListBox" && control.enabled === true);
  const button = (text) => visible.filter((control) => control.className === "TButton" && control.text === text && control.enabled === true);
  const list = runAtom("read-aurora-toolset-dialog-list-items-no-global-input.mjs", ["--dialogClass", "TfrmAreaResize", "--dialogTitle", "Resize Area"]);
  if (controls.processId !== beforeWindows.processId || list.processId !== beforeWindows.processId || edits.length !== 2 || edits.some((edit) => edit.text !== "") || lists.length !== 1 || button("OK").length !== 1 || button("Cancel").length !== 1 || list.itemCount !== 4 || list.selectedIndex !== -1 || JSON.stringify(list.items) !== JSON.stringify(["Tiny", "Small", "Medium", "Large"])) throw new Error(`bootstrap_area_resize_cancel_dialog_unverified:${JSON.stringify({ edits: edits.map((edit) => edit.text), lists: lists.length, ok: button("OK").length, cancel: button("Cancel").length, list })}`);
  const before = { windows: beforeWindows, controls: { dialogHwnd: controls.dialogHwnd, edits: edits.map((edit) => ({ hwnd: edit.hwnd, text: edit.text })), listHwnd: lists[0].hwnd, buttons: ["OK", "Cancel"] }, list, nativeResizeIntent: "none_selected" };
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, areaResizeCancelUsesPostMessage: true, noGlobalInput: true, noHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    const cancel = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TfrmAreaResize", "--dialogTitle", "Resize Area", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterWindows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterFrames = (afterWindows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactTitle);
    const afterUnexpected = (afterWindows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterWindows.responding !== true || afterFrames.length !== 1 || afterUnexpected.length !== 0) throw new Error(`bootstrap_area_resize_cancel_not_settled:${JSON.stringify({ responding: afterWindows.responding, frames: afterFrames, unexpected: afterUnexpected })}`);
    const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
    const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
    if (area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_area_resize_cancel_area_delta_unverified:${JSON.stringify({ area, creatures: git.creatures })}`);
    manifest.areaResizeCancellationAttempts = [{ at: new Date().toISOString(), before, cancel, afterWindows, areaReadback: area, gitReadback: git, noAreaDelta: { status: "verified", basis: ["unselected native resize preset", "TfrmAreaResize Cancel ModalResult=2", "resize loops execute only for ShowModal result=1", "post-cancel saved ARE remains complete Tiny 2x2/4", "post-cancel saved GIT has no fixtures before HAK/placement"] }, mode: "cancel_exact_unexpected_resize_modal_then_verify_saved_area_no_delta" }];
    manifest.status = "failed";
    manifest.blockerCode = "bootstrap_hak_attach_failed";
    manifest.failureCode = "unexpected_area_resize_cancelled_no_area_delta";
    manifest.error = "unexpected_area_resize_cancelled_no_area_delta";
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-unexpected-area-resize-cancel", status: "unexpected_area_resize_cancelled_no_area_delta", manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakContinuationAuthorized: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = "bootstrap_hak_attach_failed";
    manifest.failureCode = "unexpected_area_resize_cancel_postcheck_failed";
    manifest.error = error instanceof Error ? error.message : String(error);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileUnexpectedAreaResizePostcheck(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_area_resize_postcheck_manifest_missing");
  const manifest = readJson(manifestPath);
  const parserFailure = manifest.failureCode === "unexpected_area_resize_cancel_postcheck_failed" && String(manifest.error ?? "").includes("read-aurora-toolset-bootstrap-git-readback.mjs") && String(manifest.error ?? "").includes("objects.filter is not a function");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_hak_attach_failed" && parserFailure && manifest.savedHakReconciliationAttempts?.length === 1 && manifest.savedHakMenuReconciliationAttempts?.length === 1 && manifest.savedHakMenuStateReconciliationAttempts?.length === 1 && (manifest.editPopupObservationAttempts?.length ?? 0) === 0 && (manifest.areaResizeCancellationAttempts?.length ?? 0) === 0 && (manifest.areaResizePostcheckReconciliationAttempts?.length ?? 0) === 0 && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_area_resize_postcheck_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-unexpected-area-resize-postcheck", mode: "dry-run", status: "authorized_for_exact_area_resize_post_cancel_parser_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable post-Cancel objects.filter parser failure", "one responsive Toolset PID with exact clean loaded module frame", "no modal", "fixed central GIT schema reader", "saved ARE Tiny 2x2/4 and GIT zero-fixture postcheck only"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exactTitle = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactTitle);
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
  if (windows.responding !== true || frames.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_area_resize_postcheck_native_state_unverified:${JSON.stringify({ responding: windows.responding, frames, unexpected })}`);
  try {
    const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
    const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
    if (area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_area_resize_postcheck_area_delta_unverified:${JSON.stringify({ area, creatures: git.creatures })}`);
    manifest.areaResizeCancellationAttempts = [{ at: new Date().toISOString(), recoveredFrom: "unexpected_area_resize_cancel_postcheck_failed", afterWindows: windows, areaReadback: area, gitReadback: git, noAreaDelta: { status: "verified", basis: ["previous central route completed targeted Cancel before parser invocation", "current Toolset has no modal and clean exact module frame", "saved ARE remains complete Tiny 2x2/4", "saved GIT has zero fixtures before HAK/placement"] }, mode: "reconcile_post_cancel_parser_failure_without_replaying_any_ui_action" }];
    manifest.areaResizePostcheckReconciliationAttempts = [{ at: new Date().toISOString(), priorFailureCode: manifest.failureCode, readerSchema: "ParsedAreaObjectBlueprint.creatures", windows }];
    manifest.status = "failed";
    manifest.blockerCode = "bootstrap_hak_attach_failed";
    manifest.failureCode = "unexpected_area_resize_cancelled_no_area_delta";
    manifest.error = "unexpected_area_resize_cancelled_no_area_delta";
    manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, areaResizePostcheckReadOnly: true, noHakContinuation: true };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-unexpected-area-resize-postcheck", status: "unexpected_area_resize_cancelled_no_area_delta", manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakContinuationAuthorized: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = "bootstrap_hak_attach_failed";
    manifest.failureCode = "unexpected_area_resize_cancel_postcheck_failed";
    manifest.error = error instanceof Error ? error.message : String(error);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcilePostAreaResizeHakCommand(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_post_area_resize_hak_manifest_missing");
  const manifest = readJson(manifestPath);
  const sharedAuthorization = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && existsSync(resolve(declaration.module.path));
  const resumeFromResize = sharedAuthorization && manifest.failureCode === "unexpected_area_resize_cancelled_no_area_delta" && manifest.error === "unexpected_area_resize_cancelled_no_area_delta" && (manifest.postAreaResizeHakCommandAttempts?.length ?? 0) === 0;
  const resumeFromRotate = sharedAuthorization && manifest.failureCode === "unexpected_area_rotate_cancelled_no_area_delta" && manifest.error === "unexpected_area_rotate_cancelled_no_area_delta" && manifest.postAreaResizeHakCommandAttempts?.length === 1 && manifest.areaRotateCancellationAttempts?.length === 1;
  const authorized = resumeFromResize || resumeFromRotate;
  if (!authorized) throw new Error("bootstrap_post_area_resize_hak_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-post-area-resize-hak-command", mode: "dry-run", status: "authorized_for_direct_module_properties_hak_command", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable no-delta cancellation of the earlier unintended Resize Area or Rotate Area modal", "one responsive Toolset PID with exact saved loaded module frame", "no modal or popup", "saved ARE Tiny 2x2/4 and saved GIT zero fixtures", "RCDATA-bound Edit child position 12 / current command ID 68", "one ordered HAK attach and native Save; no creature placement or proof claim"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (windows.responding !== true || frames.length !== 1 || unexpected.length !== 0 || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_post_area_resize_hak_state_unverified:${JSON.stringify({ responding: windows.responding, frames, unexpected, area, creatures: git.creatures })}`);
  const attempt = { at: new Date().toISOString(), preflight: { windows, area, git }, route: "aurora-module-properties-menu-contract/v3_direct_wm_command_68", mode: "attach_ordered_haks_then_save_only" };
  manifest.postAreaResizeHakCommandAttempts = [...(manifest.postAreaResizeHakCommandAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, directAtomPublicRoute: false, noGlobalInput: true, directModulePropertiesCommand: true, noCreaturePlacementInHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    manifest.stages ??= {}; manifest.stages.haks ??= [];
    for (const hak of declaration.haks) {
      const result = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", hak.resref, "--hakPath", resolve(hak.path)]);
      if (result.hakListReadback?.at(-1) !== hak.resref || result.menu?.readback?.modulePropertiesId !== 68) throw new Error(`ordered_hak_readback_mismatch:${hak.resref}`);
      manifest.stages.haks.push(result);
    }
    manifest.stages.saveAfterHak = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path)]);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "hak_attached_saved_pending_creature";
    manifest.blockerCode = "bootstrap_hak_attached_pending_creature";
    manifest.failureCode = "hak_attached_saved_pending_creature";
    manifest.error = "hak_attached_saved_pending_creature";
    attempt.result = { orderedHaks: declaration.haks.map((hak) => hak.resref), saved: true, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-post-area-resize-hak-command", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, creaturePlacementAttempted: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileUnexpectedAreaRotateCancel(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_area_rotate_cancel_manifest_missing");
  const manifest = readJson(manifestPath);
  const directCommandFailure = String(manifest.error ?? "").includes("module_properties_dialog_missing") && String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && directCommandFailure
    && manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 1
    && (manifest.areaRotateCancellationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_area_rotate_cancel_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-unexpected-area-rotate-cancel", mode: "dry-run", status: "authorized_for_exact_unexpected_area_rotate_cancel", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["nested module_properties_dialog_missing after the erroneous direct ID 64 route", "one responsive Toolset PID with exact loaded module frame", "one exact TfrmAreaResize / Rotate Area modal and no other modal", "six enabled rotation radios and one selected default; no OK post", "only targeted asynchronous Cancel followed by saved ARE/GIT no-delta readback"] });
    return;
  }
  const beforeWindows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (beforeWindows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const rotate = (beforeWindows.windows ?? []).filter((window) => window.className === "TfrmAreaResize" && window.text === "Rotate Area");
  const unexpected = (beforeWindows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmAreaResize"].includes(window.className));
  if (beforeWindows.responding !== true || frames.length !== 1 || rotate.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_area_rotate_cancel_native_state_unverified:${JSON.stringify({ responding: beforeWindows.responding, frames, rotate, unexpected })}`);
  const controls = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "TfrmAreaResize", "--title", "Rotate Area"]);
  const radios = runAtom("read-aurora-toolset-dialog-radio-buttons-no-global-input.mjs", ["--dialogClass", "TfrmAreaResize", "--dialogTitle", "Rotate Area"]);
  const visible = (controls.controls ?? []).filter((control) => control.visible === true);
  const buttons = (caption) => visible.filter((control) => control.className === "TButton" && control.text === caption && control.enabled === true);
  const expectedRadioText = ["Clockwise 270", "Clockwise 180", "Clockwise 90", "CounterClockwise 270", "CounterClockwise 180", "CounterClockwise 90"];
  if (controls.processId !== beforeWindows.processId || radios.processId !== beforeWindows.processId || buttons("OK").length !== 1 || buttons("Cancel").length !== 1 || radios.radios?.length !== 6 || radios.radios.some((radio) => radio.enabled !== true || !expectedRadioText.includes(radio.text) || ![0, 1].includes(radio.check)) || radios.radios.filter((radio) => radio.check === 1).length !== 1 || !radios.radios.some((radio) => radio.text === "CounterClockwise 90" && radio.check === 1)) throw new Error(`bootstrap_area_rotate_cancel_dialog_unverified:${JSON.stringify({ controls: visible, radios: radios.radios })}`);
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, areaRotateCancelUsesPostMessage: true, noGlobalInput: true, noHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    const cancel = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TfrmAreaResize", "--dialogTitle", "Rotate Area", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterWindows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterFrames = (afterWindows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
    const afterUnexpected = (afterWindows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
    const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
    if (afterWindows.responding !== true || afterFrames.length !== 1 || afterUnexpected.length !== 0 || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_area_rotate_cancel_area_delta_unverified:${JSON.stringify({ responding: afterWindows.responding, afterFrames, afterUnexpected, area, creatures: git.creatures })}`);
    manifest.areaRotateCancellationAttempts = [{ at: new Date().toISOString(), beforeWindows, controls: { dialogHwnd: controls.dialogHwnd, radios: radios.radios }, cancel, afterWindows, areaReadback: area, gitReadback: git, noAreaDelta: { status: "verified", basis: ["Rotate Area dialog reached only after failed ID 64 routing", "one default CounterClockwise 90 radio had not been committed", "only Cancel was posted", "saved ARE remains Tiny 2x2/4", "saved GIT remains zero fixtures"] }, mode: "cancel_exact_unexpected_rotate_modal_then_verify_saved_area_no_delta" }];
    manifest.status = "failed";
    manifest.blockerCode = "bootstrap_hak_attach_failed";
    manifest.failureCode = "unexpected_area_rotate_cancelled_no_area_delta";
    manifest.error = "unexpected_area_rotate_cancelled_no_area_delta";
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-unexpected-area-rotate-cancel", status: "unexpected_area_rotate_cancelled_no_area_delta", manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakContinuationAuthorized: false });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = "bootstrap_hak_attach_failed"; manifest.failureCode = "unexpected_area_rotate_cancel_postcheck_failed"; manifest.error = error instanceof Error ? error.message : String(error); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHak(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_open_module_properties_hak_manifest_missing");
  const manifest = readJson(manifestPath);
  const enumFailure = String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs")
    && String(manifest.error ?? "").includes("Cannot locate the history for Id");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && enumFailure
    && manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.areaRotateCancellationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 2
    && (manifest.openModulePropertiesHakReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_open_module_properties_hak_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak", mode: "dry-run", status: "authorized_for_open_module_properties_hak_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable EnumChildWindows history-alias failure after the corrected ID 68 route", "one responsive Toolset PID with exact saved loaded module frame", "one exact already-open TfrmIFOProp / Module Properties modal and no other modal", "saved ARE Tiny 2x2/4 and saved GIT zero fixtures", "resume only the existing dialog with the repaired child-enumeration helper; no menu command replay"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const moduleProperties = (windows.windows ?? []).filter((window) => window.className === "TfrmIFOProp" && window.text === "Module Properties");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmIFOProp"].includes(window.className));
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (windows.responding !== true || frames.length !== 1 || moduleProperties.length !== 1 || unexpected.length !== 0 || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_open_module_properties_hak_state_unverified:${JSON.stringify({ responding: windows.responding, frames, moduleProperties, unexpected, area, creatures: git.creatures })}`);
  const attempt = { at: new Date().toISOString(), preflight: { windows, area, git }, priorFailure: "EnumChildWindows invoked the PowerShell alias r/Invoke-History through helper R before any tab, combo, Add, or OK operation", route: "aurora-module-properties-menu-contract/v3_open_dialog_resume", mode: "resume_open_module_properties_then_attach_ordered_haks_and_save_only" };
  manifest.openModulePropertiesHakReconciliationAttempts = [...(manifest.openModulePropertiesHakReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noGlobalInput: true, reusesAlreadyOpenModuleProperties: true, noMenuCommandReplay: true, noCreaturePlacementInHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    manifest.stages ??= {}; manifest.stages.haks ??= [];
    for (const hak of declaration.haks) {
      const result = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", hak.resref, "--hakPath", resolve(hak.path), "--reuseOpenModuleProperties", "true"]);
      if (result.hakListReadback?.at(-1) !== hak.resref || result.menu?.reusedOpenDialog !== true) throw new Error(`ordered_hak_open_dialog_readback_mismatch:${hak.resref}`);
      manifest.stages.haks.push(result);
    }
    manifest.stages.saveAfterHak = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path)]);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "hak_attached_saved_pending_creature";
    manifest.blockerCode = "bootstrap_hak_attached_pending_creature";
    manifest.failureCode = "hak_attached_saved_pending_creature";
    manifest.error = "hak_attached_saved_pending_creature";
    attempt.result = { orderedHaks: declaration.haks.map((hak) => hak.resref), saved: true, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, menuCommandReplayed: false, creaturePlacementAttempted: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakCombo(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_open_module_properties_hak_combo_manifest_missing");
  const manifest = readJson(manifestPath);
  const comboFailure = String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs")
    && String(manifest.error ?? "").includes("expected_one_hak_combo:2");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && comboFailure
    && manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.areaRotateCancellationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 2
    && manifest.openModulePropertiesHakReconciliationAttempts?.length === 1
    && (manifest.openModulePropertiesHakComboReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_open_module_properties_hak_combo_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-combo", mode: "dry-run", status: "authorized_for_open_module_properties_hak_combo_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable expected_one_hak_combo:2 after the open-dialog recovery", "one responsive Toolset PID with exact saved loaded module frame", "one exact existing TfrmIFOProp / Module Properties modal and no other modal", "saved ARE Tiny 2x2/4 and saved GIT zero fixtures", "resume only the existing modal; identify the HAK combo as the unique control immediately below the HAK ListBox and adjacent to Add"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const moduleProperties = (windows.windows ?? []).filter((window) => window.className === "TfrmIFOProp" && window.text === "Module Properties");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmIFOProp"].includes(window.className));
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const controls = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "TfrmIFOProp", "--title", "Module Properties"]);
  const visible = (controls.controls ?? []).filter((control) => control.visible === true);
  const combos = visible.filter((control) => control.className === "TComboBox" && control.enabled === true);
  const lists = visible.filter((control) => control.className === "TListBox" && control.enabled === true);
  const adds = visible.filter((control) => control.className === "TButton" && control.text === "Add");
  const candidateCount = combos.filter((combo) => lists.filter((list) => list.bounds.top + list.bounds.height <= combo.bounds.top && combo.bounds.top - (list.bounds.top + list.bounds.height) <= 10 && Math.abs(list.bounds.left - combo.bounds.left) <= 5 && Math.abs(list.bounds.width - combo.bounds.width) <= 5).length === 1 && adds.filter((add) => Math.abs(add.bounds.top - combo.bounds.top) <= 5 && add.bounds.left > combo.bounds.left + combo.bounds.width && add.bounds.left - (combo.bounds.left + combo.bounds.width) <= 30).length === 1).length;
  if (windows.responding !== true || frames.length !== 1 || moduleProperties.length !== 1 || unexpected.length !== 0 || controls.processId !== windows.processId || candidateCount !== 1 || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_open_module_properties_hak_combo_state_unverified:${JSON.stringify({ responding: windows.responding, frames, moduleProperties, unexpected, combos, lists, adds, candidateCount, area, creatures: git.creatures })}`);
  const attempt = { at: new Date().toISOString(), preflight: { windows, area, git, comboTopology: { combos, lists, adds, candidateCount } }, route: "aurora-module-properties-menu-contract/v3_open_dialog_hak_combo_geometry", mode: "resume_open_module_properties_with_list_add_bound_combo_then_attach_ordered_haks_and_save_only" };
  manifest.openModulePropertiesHakComboReconciliationAttempts = [...(manifest.openModulePropertiesHakComboReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noGlobalInput: true, reusesAlreadyOpenModuleProperties: true, noMenuCommandReplay: true, hakComboIdentity: "same-width list directly above plus adjacent Add", noCreaturePlacementInHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    manifest.stages ??= {}; manifest.stages.haks ??= [];
    for (const hak of declaration.haks) {
      const result = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", hak.resref, "--hakPath", resolve(hak.path), "--reuseOpenModuleProperties", "true"]);
      if (result.hakListReadback?.at(-1) !== hak.resref || result.menu?.reusedOpenDialog !== true || !result.combo?.identity?.listHwnd || !result.combo?.identity?.addHwnd) throw new Error(`ordered_hak_open_dialog_combo_readback_mismatch:${hak.resref}`);
      manifest.stages.haks.push(result);
    }
    manifest.stages.saveAfterHak = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path)]);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "hak_attached_saved_pending_creature";
    manifest.blockerCode = "bootstrap_hak_attached_pending_creature";
    manifest.failureCode = "hak_attached_saved_pending_creature";
    manifest.error = "hak_attached_saved_pending_creature";
    attempt.result = { orderedHaks: declaration.haks.map((hak) => hak.resref), saved: true, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-combo", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, menuCommandReplayed: false, creaturePlacementAttempted: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakComboSentinel(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_open_module_properties_hak_combo_sentinel_manifest_missing");
  const manifest = readJson(manifestPath);
  const sentinelFailure = String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs")
    && String(manifest.error ?? "").includes('Cannot convert value "4294967295" to type "System.Int32"');
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && sentinelFailure
    && manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.areaRotateCancellationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 2
    && manifest.openModulePropertiesHakReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboReconciliationAttempts?.length === 1
    && (manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_open_module_properties_hak_combo_sentinel_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-combo-sentinel", mode: "dry-run", status: "authorized_for_open_module_properties_hak_combo_sentinel_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable CB_GETCURSEL 0xFFFFFFFF-to-Int32 failure after the combo-identity recovery", "one responsive Toolset PID with exact saved loaded module frame", "one exact existing TfrmIFOProp / Module Properties modal and no other modal", "saved ARE Tiny 2x2/4 and saved GIT zero fixtures", "resume only the existing modal with signed CB_ERR decoding; no menu or combo selection replay before exact HAK lookup"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const moduleProperties = (windows.windows ?? []).filter((window) => window.className === "TfrmIFOProp" && window.text === "Module Properties");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmIFOProp"].includes(window.className));
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (windows.responding !== true || frames.length !== 1 || moduleProperties.length !== 1 || unexpected.length !== 0 || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_open_module_properties_hak_combo_sentinel_state_unverified:${JSON.stringify({ responding: windows.responding, frames, moduleProperties, unexpected, area, creatures: git.creatures })}`);
  const attempt = { at: new Date().toISOString(), preflight: { windows, area, git }, route: "aurora-module-properties-menu-contract/v3_open_dialog_hak_combo_signed_cb_err", mode: "resume_open_module_properties_with_signed_cb_err_then_attach_ordered_haks_and_save_only" };
  manifest.openModulePropertiesHakComboSentinelReconciliationAttempts = [...(manifest.openModulePropertiesHakComboSentinelReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noGlobalInput: true, reusesAlreadyOpenModuleProperties: true, noMenuCommandReplay: true, cbGetCurSelSigned32: true, noCreaturePlacementInHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    manifest.stages ??= {}; manifest.stages.haks ??= [];
    for (const hak of declaration.haks) {
      const result = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", hak.resref, "--hakPath", resolve(hak.path), "--reuseOpenModuleProperties", "true"]);
      if (result.hakListReadback?.at(-1) !== hak.resref || result.menu?.reusedOpenDialog !== true || result.combo?.previousIndex !== -1 || result.combo?.previousIndexRaw !== 4_294_967_295) throw new Error(`ordered_hak_open_dialog_combo_sentinel_readback_mismatch:${hak.resref}`);
      manifest.stages.haks.push(result);
    }
    manifest.stages.saveAfterHak = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path)]);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "hak_attached_saved_pending_creature";
    manifest.blockerCode = "bootstrap_hak_attached_pending_creature";
    manifest.failureCode = "hak_attached_saved_pending_creature";
    manifest.error = "hak_attached_saved_pending_creature";
    attempt.result = { orderedHaks: declaration.haks.map((hak) => hak.resref), saved: true, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-combo-sentinel", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, menuCommandReplayed: false, creaturePlacementAttempted: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakComboClearSelection(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_open_module_properties_hak_combo_clear_selection_manifest_missing");
  const manifest = readJson(manifestPath);
  const lookupFailure = String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs")
    && String(manifest.error ?? "").includes("expected_one_exact_hak:0");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && lookupFailure
    && manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.areaRotateCancellationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 2
    && manifest.openModulePropertiesHakReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length === 1
    && (manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_open_module_properties_hak_combo_clear_selection_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-combo-clear-selection", mode: "dry-run", status: "authorized_for_open_module_properties_hak_combo_selection_clear", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable expected_one_exact_hak:0 after the signed-sentinel recovery", "one responsive Toolset PID with exact saved loaded module frame", "one exact existing TfrmIFOProp / Module Properties modal and no other modal", "validated item-text readback: exactly one m2a_m0_proof source item, zero HAK list items, Add disabled, and a non-negative temporary combo selection", "targeted CB_SETCURSEL(-1) cleanup only; no HAK Add, OK, Save, or menu replay"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const moduleProperties = (windows.windows ?? []).filter((window) => window.className === "TfrmIFOProp" && window.text === "Module Properties");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmIFOProp"].includes(window.className));
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const hakState = runAtom("read-aurora-toolset-module-properties-hak-state-no-global-input.mjs", []);
  const exactHak = declaration.haks.map((hak) => hak.resref);
  if (windows.responding !== true || frames.length !== 1 || moduleProperties.length !== 1 || unexpected.length !== 0 || hakState.processId !== windows.processId || hakState.combo?.selectedIndex < 0 || hakState.list?.itemCount !== 0 || hakState.add?.enabled !== false || JSON.stringify((hakState.combo?.items ?? []).filter((item) => exactHak.includes(item))) !== JSON.stringify(exactHak) || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_open_module_properties_hak_combo_clear_selection_state_unverified:${JSON.stringify({ responding: windows.responding, frames, moduleProperties, unexpected, hakState, area, creatures: git.creatures })}`);
  const attempt = { at: new Date().toISOString(), preflight: { windows, area, git, hakState }, route: "aurora-module-properties-menu-contract/v3_open_dialog_hak_combo_clear_selection", mode: "clear_temporary_combo_selection_only" };
  manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts = [...(manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noGlobalInput: true, reusesAlreadyOpenModuleProperties: true, noMenuCommandReplay: true, cleanupOnly: true, noHakAdd: true, noModulePropertiesOk: true, noSave: true };
  writeJson(manifestPath, manifest);
  try {
    const clear = runAtom("clear-aurora-toolset-module-properties-hak-combo-selection-no-global-input.mjs", []);
    const after = runAtom("read-aurora-toolset-module-properties-hak-state-no-global-input.mjs", []);
    if (clear.afterIndex !== -1 || after.combo?.selectedIndex !== -1 || after.list?.itemCount !== 0 || after.add?.enabled !== false || JSON.stringify((after.combo?.items ?? []).filter((item) => exactHak.includes(item))) !== JSON.stringify(exactHak)) throw new Error(`bootstrap_open_module_properties_hak_combo_clear_selection_readback_invalid:${JSON.stringify({ clear, after })}`);
    attempt.result = { clear, after };
    manifest.status = "failed";
    manifest.blockerCode = "bootstrap_hak_attach_failed";
    manifest.failureCode = "hak_combo_selection_restored_no_hak_mutation";
    manifest.error = "hak_combo_selection_restored_no_hak_mutation";
    manifest.safety = { ...manifest.safety, cleanupOnlyCompleted: true, hakContinuationAuthorized: false };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-combo-clear-selection", status: "hak_combo_selection_restored_no_hak_mutation", manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakContinuationAuthorized: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakAdd(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_open_module_properties_hak_add_manifest_missing");
  const manifest = readJson(manifestPath);
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && manifest.failureCode === "hak_combo_selection_restored_no_hak_mutation"
    && manifest.error === "hak_combo_selection_restored_no_hak_mutation"
    && manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.areaRotateCancellationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 2
    && manifest.openModulePropertiesHakReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts?.length === 1
    && (manifest.openModulePropertiesHakAddReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_open_module_properties_hak_add_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-add", mode: "dry-run", status: "authorized_for_open_module_properties_hak_add", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable successful HAK-combo selection cleanup with no HAK mutation", "one responsive Toolset PID with exact saved loaded module frame", "one exact existing TfrmIFOProp / Module Properties modal and no other modal", "validated native source items contain each declared HAK exactly once; combo selection -1, HAK ListBox empty, Add disabled", "resume only the existing dialog for ordered HAK Add/OK/rebuild/native Save; no menu or wizard replay"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const moduleProperties = (windows.windows ?? []).filter((window) => window.className === "TfrmIFOProp" && window.text === "Module Properties");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmIFOProp"].includes(window.className));
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const hakState = runAtom("read-aurora-toolset-module-properties-hak-state-no-global-input.mjs", []);
  const exactHaks = declaration.haks.map((hak) => hak.resref);
  if (windows.responding !== true || frames.length !== 1 || moduleProperties.length !== 1 || unexpected.length !== 0 || hakState.processId !== windows.processId || hakState.combo?.selectedIndex !== -1 || hakState.combo?.selectedIndexRaw !== 4_294_967_295 || hakState.list?.itemCount !== 0 || hakState.add?.enabled !== false || JSON.stringify((hakState.combo?.items ?? []).filter((item) => exactHaks.includes(item))) !== JSON.stringify(exactHaks) || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_open_module_properties_hak_add_state_unverified:${JSON.stringify({ responding: windows.responding, frames, moduleProperties, unexpected, hakState, area, creatures: git.creatures })}`);
  const attempt = { at: new Date().toISOString(), preflight: { windows, area, git, hakState }, route: "aurora-module-properties-menu-contract/v3_open_dialog_hak_add", mode: "resume_open_module_properties_then_attach_ordered_haks_and_save_only" };
  manifest.openModulePropertiesHakAddReconciliationAttempts = [...(manifest.openModulePropertiesHakAddReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noGlobalInput: true, reusesAlreadyOpenModuleProperties: true, noMenuCommandReplay: true, nativeComboItemText: true, noCreaturePlacementInHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    manifest.stages ??= {}; manifest.stages.haks ??= [];
    for (const hak of declaration.haks) {
      const result = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", hak.resref, "--hakPath", resolve(hak.path), "--reuseOpenModuleProperties", "true"]);
      if (result.hakListReadback?.at(-1) !== hak.resref || result.menu?.reusedOpenDialog !== true || result.combo?.previousIndex !== -1 || result.combo?.previousIndexRaw !== 4_294_967_295 || !result.combo?.identity?.listHwnd || !result.combo?.identity?.addHwnd) throw new Error(`ordered_hak_open_dialog_add_readback_mismatch:${hak.resref}`);
      manifest.stages.haks.push(result);
    }
    manifest.stages.saveAfterHak = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path)]);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "hak_attached_saved_pending_creature";
    manifest.blockerCode = "bootstrap_hak_attached_pending_creature";
    manifest.failureCode = "hak_attached_saved_pending_creature";
    manifest.error = "hak_attached_saved_pending_creature";
    attempt.result = { orderedHaks: exactHaks, saved: true, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-add", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, menuCommandReplayed: false, creaturePlacementAttempted: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakAddSelected(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_open_module_properties_hak_add_selected_manifest_missing");
  const manifest = readJson(manifestPath);
  const selectedReadbackFailure = String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs")
    && String(manifest.error ?? "").includes("hak_combo_readback_mismatch:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && selectedReadbackFailure
    && manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.areaRotateCancellationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 2
    && manifest.openModulePropertiesHakReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakAddReconciliationAttempts?.length === 1
    && (manifest.openModulePropertiesHakAddSelectedReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_open_module_properties_hak_add_selected_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-add-selected", mode: "dry-run", status: "authorized_for_open_module_properties_hak_add_selected", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable owner-drawn GetWindowText selection-readback failure after HAK-add preflight", "one responsive Toolset PID with exact saved loaded module frame", "one exact existing TfrmIFOProp / Module Properties modal and no other modal", "native CB_GETCURSEL and CB_GETLBTEXT prove the exact declared HAK is already selected; HAK ListBox empty and Add not yet used", "resume only the existing modal without reselecting or reopening menu; then continue HAK Add/OK/rebuild/native Save"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const moduleProperties = (windows.windows ?? []).filter((window) => window.className === "TfrmIFOProp" && window.text === "Module Properties");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmIFOProp"].includes(window.className));
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const hakState = runAtom("read-aurora-toolset-module-properties-hak-state-no-global-input.mjs", []);
  const exactHaks = declaration.haks.map((hak) => hak.resref);
  const selectedItem = hakState.combo?.items?.[hakState.combo?.selectedIndex];
  if (windows.responding !== true || frames.length !== 1 || moduleProperties.length !== 1 || unexpected.length !== 0 || hakState.processId !== windows.processId || hakState.combo?.selectedIndex < 0 || selectedItem !== exactHaks[0] || hakState.list?.itemCount !== 0 || hakState.add?.enabled !== false || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_open_module_properties_hak_add_selected_state_unverified:${JSON.stringify({ responding: windows.responding, frames, moduleProperties, unexpected, hakState, selectedItem, area, creatures: git.creatures })}`);
  const attempt = { at: new Date().toISOString(), preflight: { windows, area, git, hakState, selectedItem }, route: "aurora-module-properties-menu-contract/v3_open_dialog_hak_add_selected", mode: "resume_open_module_properties_with_existing_exact_hak_selection_then_add_and_save_only" };
  manifest.openModulePropertiesHakAddSelectedReconciliationAttempts = [...(manifest.openModulePropertiesHakAddSelectedReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noGlobalInput: true, reusesAlreadyOpenModuleProperties: true, reusesAlreadySelectedHak: true, noMenuCommandReplay: true, noCreaturePlacementInHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    manifest.stages ??= {}; manifest.stages.haks ??= [];
    for (const hak of declaration.haks) {
      const result = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", hak.resref, "--hakPath", resolve(hak.path), "--reuseOpenModuleProperties", "true", "--reuseSelectedHak", "true"]);
      if (result.hakListReadback?.at(-1) !== hak.resref || result.menu?.reusedOpenDialog !== true || result.combo?.reusedSelectedHak !== true || result.combo?.readback !== hak.resref) throw new Error(`ordered_hak_open_dialog_add_selected_readback_mismatch:${hak.resref}`);
      manifest.stages.haks.push(result);
    }
    manifest.stages.saveAfterHak = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path)]);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "hak_attached_saved_pending_creature";
    manifest.blockerCode = "bootstrap_hak_attached_pending_creature";
    manifest.failureCode = "hak_attached_saved_pending_creature";
    manifest.error = "hak_attached_saved_pending_creature";
    attempt.result = { orderedHaks: exactHaks, saved: true, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-add-selected", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, menuCommandReplayed: false, comboSelectionReplayed: false, creaturePlacementAttempted: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakSelectionChange(declaration, declarationPath, outDir, { resumeRenderedAtomFailure = false } = {}) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_open_module_properties_hak_selection_change_manifest_missing");
  const manifest = readJson(manifestPath);
  const addDisabledFailure = String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs")
    && String(manifest.error ?? "").includes("hak_add_button_not_enabled_after_exact_combo_selection");
  const renderedAtomFailure = String(manifest.error ?? "").includes("notify-aurora-toolset-module-properties-hak-combo-selection-no-global-input.mjs")
    && String(manifest.error ?? "").includes("ReferenceError: index is not defined");
  const priorSelectionChangeAttempts = manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts?.length ?? 0;
  const fullPriorReconciliationHistory = manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.areaRotateCancellationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 2
    && manifest.openModulePropertiesHakReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakAddReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakAddSelectedReconciliationAttempts?.length === 1;
  const directInitialAddDisabledHistory = (manifest.savedHakReconciliationAttempts?.length ?? 0) === 0
    && (manifest.savedHakMenuReconciliationAttempts?.length ?? 0) === 0
    && (manifest.savedHakMenuStateReconciliationAttempts?.length ?? 0) === 0
    && (manifest.areaResizeCancellationAttempts?.length ?? 0) === 0
    && (manifest.areaResizePostcheckReconciliationAttempts?.length ?? 0) === 0
    && (manifest.areaRotateCancellationAttempts?.length ?? 0) === 0
    && (manifest.postAreaResizeHakCommandAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakComboReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakAddReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakAddSelectedReconciliationAttempts?.length ?? 0) === 0;
  const directInitialRenderContinuation = directInitialAddDisabledHistory
    && priorSelectionChangeAttempts === 1
    && manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts?.[0]?.historyMode === "direct_initial_add_disabled";
  const correctFailureState = resumeRenderedAtomFailure
    ? renderedAtomFailure && priorSelectionChangeAttempts === 1
    : addDisabledFailure && priorSelectionChangeAttempts === 0;
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && correctFailureState
    && (fullPriorReconciliationHistory || (resumeRenderedAtomFailure ? directInitialRenderContinuation : directInitialAddDisabledHistory))
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error(resumeRenderedAtomFailure ? "bootstrap_open_module_properties_hak_selection_change_render_not_authorized_for_failure" : "bootstrap_open_module_properties_hak_selection_change_not_authorized_for_failure");
  const commandName = resumeRenderedAtomFailure ? "bootstrap-reconcile-open-module-properties-hak-selection-change-render" : "bootstrap-reconcile-open-module-properties-hak-selection-change";
  if (options.dryRun === "true") {
    print({ ok: true, command: commandName, mode: "dry-run", status: resumeRenderedAtomFailure ? "authorized_for_open_module_properties_hak_selection_change_render" : "authorized_for_open_module_properties_hak_selection_change", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: [resumeRenderedAtomFailure ? "durable pre-Toolset Node template-render ReferenceError after the first selection-change route" : "durable Add-disabled failure after exact native selected HAK readback", "one responsive Toolset PID with exact saved loaded module frame", "one exact existing TfrmIFOProp / Module Properties modal and no other modal", "exact native CB_GETCURSEL plus CB_GETLBTEXT prove the declared HAK is selected; HAK ListBox empty and Add disabled", "send only documented CBN_SELCHANGE WM_COMMAND to the combo's actual parent, then prove Add enabled; no Add, OK, Save, menu, wizard, or Area action"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const moduleProperties = (windows.windows ?? []).filter((window) => window.className === "TfrmIFOProp" && window.text === "Module Properties");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmIFOProp"].includes(window.className));
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const hakState = runAtom("read-aurora-toolset-module-properties-hak-state-no-global-input.mjs", []);
  const hak = declaration.haks[0]?.resref;
  const selectedItem = hakState.combo?.items?.[hakState.combo?.selectedIndex];
  if (windows.responding !== true || frames.length !== 1 || moduleProperties.length !== 1 || unexpected.length !== 0 || hakState.processId !== windows.processId || selectedItem !== hak || hakState.list?.itemCount !== 0 || hakState.add?.enabled !== false || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_open_module_properties_hak_selection_change_state_unverified:${JSON.stringify({ responding: windows.responding, frames, moduleProperties, unexpected, hakState, selectedItem, area, creatures: git.creatures })}`);
  const attempt = { at: new Date().toISOString(), preflight: { windows, area, git, hakState, selectedItem }, route: "aurora-module-properties-hak-combo-selection-change/v1", historyMode: directInitialAddDisabledHistory ? "direct_initial_add_disabled" : "complete_prior_reconciliation", mode: resumeRenderedAtomFailure ? "resume_after_pre_toolset_template_render_failure_then_notify_existing_exact_hak_selection_only" : "notify_existing_exact_hak_selection_only" };
  manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts = [...(manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noGlobalInput: true, reusesAlreadyOpenModuleProperties: true, noMenuCommandReplay: true, noComboSelectionReplay: true, noHakAdd: true, noDialogCommit: true, noSave: true, noCreaturePlacementInHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    const result = runAtom("notify-aurora-toolset-module-properties-hak-combo-selection-no-global-input.mjs", [hak]);
    if (result.combo?.selectedText !== hak || result.list?.itemCount !== 0 || result.list?.assertion !== "HAK ListBox remains empty" || result.add?.enabled !== true || result.notification?.code !== "CBN_SELCHANGE" || result.notification?.target !== "actual combo parent") throw new Error(`hak_combo_selection_change_readback_unverified:${JSON.stringify(result)}`);
    attempt.result = result;
    manifest.status = "failed";
    manifest.blockerCode = "bootstrap_hak_attach_failed";
    manifest.failureCode = "hak_combo_selection_change_notified_no_hak_mutation";
    manifest.error = "hak_combo_selection_change_notified_no_hak_mutation";
    writeJson(manifestPath, manifest);
    print({ ok: true, command: commandName, status: manifest.failureCode, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, menuCommandReplayed: false, comboSelectionReplayed: false, hakAddAttempted: false, dialogCommitAttempted: false, saveAttempted: false, creaturePlacementAttempted: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakAddNotified(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_open_module_properties_hak_add_notified_manifest_missing");
  const manifest = readJson(manifestPath);
  const fullPriorReconciliationHistory = manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.areaRotateCancellationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 2
    && manifest.openModulePropertiesHakReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakAddReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakAddSelectedReconciliationAttempts?.length === 1;
  const directInitialSelectionChange = (manifest.savedHakReconciliationAttempts?.length ?? 0) === 0
    && (manifest.savedHakMenuReconciliationAttempts?.length ?? 0) === 0
    && (manifest.savedHakMenuStateReconciliationAttempts?.length ?? 0) === 0
    && (manifest.areaResizeCancellationAttempts?.length ?? 0) === 0
    && (manifest.areaResizePostcheckReconciliationAttempts?.length ?? 0) === 0
    && (manifest.areaRotateCancellationAttempts?.length ?? 0) === 0
    && (manifest.postAreaResizeHakCommandAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakComboReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakAddReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakAddSelectedReconciliationAttempts?.length ?? 0) === 0
    && manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts?.[0]?.historyMode === "direct_initial_add_disabled";
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && manifest.failureCode === "hak_combo_selection_change_notified_no_hak_mutation"
    && manifest.error === "hak_combo_selection_change_notified_no_hak_mutation"
    && ((fullPriorReconciliationHistory && manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts?.length === 2) || directInitialSelectionChange)
    && (manifest.openModulePropertiesHakAddNotifiedReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_open_module_properties_hak_add_notified_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-add-notified", mode: "dry-run", status: "authorized_for_open_module_properties_hak_add_notified", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable successful CBN_SELCHANGE readback with no HAK mutation", "one responsive Toolset PID with exact saved loaded module frame", "one exact existing TfrmIFOProp / Module Properties modal and no other modal", "exact native CB_GETCURSEL plus CB_GETLBTEXT prove the declared HAK remains selected; HAK ListBox empty and Add enabled", "resume only the existing dialog with Add/OK/rebuild/native Save; no menu, combo selection, wizard, or Area replay"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exact = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exact);
  const moduleProperties = (windows.windows ?? []).filter((window) => window.className === "TfrmIFOProp" && window.text === "Module Properties");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmIFOProp"].includes(window.className));
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const git = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const hakState = runAtom("read-aurora-toolset-module-properties-hak-state-no-global-input.mjs", []);
  const exactHaks = declaration.haks.map((hak) => hak.resref);
  const selectedItem = hakState.combo?.items?.[hakState.combo?.selectedIndex];
  if (windows.responding !== true || frames.length !== 1 || moduleProperties.length !== 1 || unexpected.length !== 0 || hakState.processId !== windows.processId || selectedItem !== exactHaks[0] || hakState.list?.itemCount !== 0 || hakState.add?.enabled !== true || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !Array.isArray(git.creatures) || git.creatures.length !== 0) throw new Error(`bootstrap_open_module_properties_hak_add_notified_state_unverified:${JSON.stringify({ responding: windows.responding, frames, moduleProperties, unexpected, hakState, selectedItem, area, creatures: git.creatures })}`);
  const attempt = { at: new Date().toISOString(), preflight: { windows, area, git, hakState, selectedItem }, route: "aurora-module-properties-hak-combo-selection-change/v1", mode: "resume_post_notification_add_ok_rebuild_save_only" };
  manifest.openModulePropertiesHakAddNotifiedReconciliationAttempts = [...(manifest.openModulePropertiesHakAddNotifiedReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noGlobalInput: true, reusesAlreadyOpenModuleProperties: true, reusesAlreadySelectedHak: true, reusesAlreadyNotifiedSelectionChange: true, noMenuCommandReplay: true, noComboSelectionReplay: true, noCreaturePlacementInHakContinuation: true };
  writeJson(manifestPath, manifest);
  try {
    manifest.stages ??= {}; manifest.stages.haks ??= [];
    for (const hak of declaration.haks) {
      const result = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", hak.resref, "--hakPath", resolve(hak.path), "--reuseOpenModuleProperties", "true", "--reuseSelectedHak", "true"]);
      if (result.hakListReadback?.at(-1) !== hak.resref || result.menu?.reusedOpenDialog !== true || result.combo?.reusedSelectedHak !== true || result.combo?.readback !== hak.resref) throw new Error(`ordered_hak_open_dialog_add_notified_readback_mismatch:${hak.resref}`);
      manifest.stages.haks.push(result);
    }
    manifest.stages.saveAfterHak = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path)]);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "hak_attached_saved_pending_creature";
    manifest.blockerCode = "bootstrap_hak_attached_pending_creature";
    manifest.failureCode = "hak_attached_saved_pending_creature";
    manifest.error = "hak_attached_saved_pending_creature";
    attempt.result = { orderedHaks: exactHaks, saved: true, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-add-notified", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, menuCommandReplayed: false, comboSelectionReplayed: false, selectionChangeReplayed: false, creaturePlacementAttempted: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakRebuildWarning(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_open_module_properties_hak_rebuild_warning_manifest_missing");
  const manifest = readJson(manifestPath);
  const warningFailure = String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs")
    && String(manifest.error ?? "").includes("unexpected_hak_warning:")
    && String(manifest.error ?? "").includes("change the list of Hak Files used by this module");
  const fullPriorReconciliationHistory = manifest.savedHakReconciliationAttempts?.length === 1
    && manifest.savedHakMenuReconciliationAttempts?.length === 1
    && manifest.savedHakMenuStateReconciliationAttempts?.length === 1
    && manifest.areaResizeCancellationAttempts?.length === 1
    && manifest.areaResizePostcheckReconciliationAttempts?.length === 1
    && manifest.areaRotateCancellationAttempts?.length === 1
    && manifest.postAreaResizeHakCommandAttempts?.length === 2
    && manifest.openModulePropertiesHakReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakAddReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakAddSelectedReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts?.length === 2
    && manifest.openModulePropertiesHakAddNotifiedReconciliationAttempts?.length === 1;
  const directInitialAddNotifiedHistory = (manifest.savedHakReconciliationAttempts?.length ?? 0) === 0
    && (manifest.savedHakMenuReconciliationAttempts?.length ?? 0) === 0
    && (manifest.savedHakMenuStateReconciliationAttempts?.length ?? 0) === 0
    && (manifest.areaResizeCancellationAttempts?.length ?? 0) === 0
    && (manifest.areaResizePostcheckReconciliationAttempts?.length ?? 0) === 0
    && (manifest.areaRotateCancellationAttempts?.length ?? 0) === 0
    && (manifest.postAreaResizeHakCommandAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakComboReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakComboSentinelReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakComboClearSelectionReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakAddReconciliationAttempts?.length ?? 0) === 0
    && (manifest.openModulePropertiesHakAddSelectedReconciliationAttempts?.length ?? 0) === 0
    && manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakSelectionChangeReconciliationAttempts?.[0]?.historyMode === "direct_initial_add_disabled"
    && manifest.openModulePropertiesHakAddNotifiedReconciliationAttempts?.length === 1;
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed" && manifest.blockerCode === "bootstrap_hak_attach_failed" && warningFailure
    && (fullPriorReconciliationHistory || directInitialAddNotifiedHistory)
    && (manifest.openModulePropertiesHakRebuildWarningReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_open_module_properties_hak_rebuild_warning_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-rebuild-warning", mode: "dry-run", status: "authorized_for_open_module_properties_hak_rebuild_warning", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable localized Hak Files warning rejection after Add and Module Properties OK", "one responsive Toolset PID with exact saved loaded module frame, Module Properties, and Warning modal", "exact semantic warning: change Hak Files/Paks, full build, and confirmation question", "one enabled affirmative Yes/Tak and one enabled negative No/Nie button", "post only the verified affirmative button and record build-start transition; settlement and native Save are separately authorized; no Add/OK/menu/combo/wizard/Area replay"] });
    return;
  }
  const attempt = { at: new Date().toISOString(), route: "aurora-module-properties-hak-rebuild-warning/v1", mode: "confirm_pending_localized_warning_then_save_only" };
  manifest.openModulePropertiesHakRebuildWarningReconciliationAttempts = [...(manifest.openModulePropertiesHakRebuildWarningReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noGlobalInput: true, noAddReplay: true, noDialogCommitReplay: true, noMenuCommandReplay: true, noComboSelectionReplay: true, noWizardOrAreaReplay: true };
  writeJson(manifestPath, manifest);
  try {
    const rebuild = runAtom("confirm-aurora-toolset-module-hak-rebuild-warning-no-global-input.mjs", [declaration.module.resref]);
    if (rebuild.warning?.affirmative !== "&Tak" || rebuild.warning?.negative !== "&Nie" || rebuild.buildStarted !== true) throw new Error("localized_hak_warning_readback_unverified:" + JSON.stringify(rebuild));
    manifest.stages ??= {}; manifest.stages.hakRebuildWarning = rebuild;
    manifest.status = "hak_rebuild_started_pending_settlement";
    manifest.blockerCode = "bootstrap_hak_rebuild_started_pending_settlement";
    manifest.failureCode = "hak_rebuild_started_pending_settlement";
    manifest.error = "hak_rebuild_started_pending_settlement";
    attempt.result = { rebuild, saved: false };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-rebuild-warning", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakAddReplayed: false, modulePropertiesOkReplayed: false, menuCommandReplayed: false, comboSelectionReplayed: false, nativeSaveAttempted: false, creaturePlacementAttempted: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function isDirectAttachHakBuildTimeout(manifest) {
  return manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_hak_attach_failed"
    && manifest.failureCode === "unclassified"
    && String(manifest.error ?? "").includes("attach-aurora-toolset-module-hak-no-global-input.mjs")
    && String(manifest.error ?? "").includes("hak_rebuild_did_not_settle")
    && (manifest.directAttachHakBuildTimeoutReconciliations?.length ?? 0) === 0;
}

function hasHakRebuildSettlementProvenance(manifest) {
  return manifest.openModulePropertiesHakRebuildWarningReconciliationAttempts?.length === 1
    || manifest.directAttachHakBuildTimeoutReconciliations?.length === 1;
}

function bootstrapObserveOpenModulePropertiesHakRebuildTimeout(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_hak_rebuild_timeout_manifest_missing");
  const manifest = readJson(manifestPath);
  const timeoutFailure = /ETIMEDOUT|spawnSync/iu.test(String(manifest.error ?? ""));
  const recordedBuildingObservation = manifest.status === "hak_rebuild_in_progress"
    && manifest.blockerCode === "hak_rebuild_in_progress"
    && manifest.failureCode === "hak_rebuild_in_progress"
    && manifest.error === "hak_rebuild_in_progress"
    && Array.isArray(manifest.hakRebuildTimeoutObservations)
    && manifest.hakRebuildTimeoutObservations.length >= 1
    && manifest.hakRebuildTimeoutObservations.every((entry) => entry?.observation?.status === "building");
  const boundedBuildStart = manifest.status === "hak_rebuild_started_pending_settlement"
    && manifest.blockerCode === "bootstrap_hak_rebuild_started_pending_settlement"
    && manifest.failureCode === "hak_rebuild_started_pending_settlement"
    && manifest.error === "hak_rebuild_started_pending_settlement"
    && (manifest.hakRebuildTimeoutObservations?.length ?? 0) === 0;
  const directAttachTimeout = isDirectAttachHakBuildTimeout(manifest);
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && ((manifest.status === "failed" && timeoutFailure) || boundedBuildStart || recordedBuildingObservation || directAttachTimeout)
    && (hasHakRebuildSettlementProvenance(manifest) || directAttachTimeout)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_hak_rebuild_timeout_observation_not_authorized_for_failure");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-observe-open-module-properties-hak-rebuild-timeout", mode: "dry-run", status: "authorized_for_hak_rebuild_timeout_observation", idempotentReadOnlyFollowup: recordedBuildingObservation, startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable bounded build-start, or ETIMEDOUT after the only localized affirmative post", "physical saved MOD and one responsive Toolset PID", "read-only classification of Build Module progress or settled exact module frame", "no affirmative/Add/OK/menu/combo/wizard/Area replay", "HAK persistence remains unverified until a separately authorized settled-state reconciliation"] });
    return;
  }
  const observation = runAtom("observe-aurora-toolset-pending-hak-rebuild-no-global-input.mjs", [declaration.module.resref]);
  if (!['building', 'settled'].includes(observation.status) || observation.safety?.postsNoMessages !== true) throw new Error("bootstrap_hak_rebuild_timeout_observation_unverified:" + JSON.stringify(observation));
  if (directAttachTimeout) {
    manifest.directAttachHakBuildTimeoutReconciliations = [{
      at: new Date().toISOString(),
      mode: "observe_exact_attach_hak_rebuild_did_not_settle_without_replaying_hak_mutation",
    }];
  }
  manifest.hakRebuildTimeoutObservations = [...(manifest.hakRebuildTimeoutObservations ?? []), { at: new Date().toISOString(), observation }];
  manifest.status = observation.status === "building" ? "hak_rebuild_in_progress" : "hak_rebuild_settled_persistence_unverified";
  manifest.blockerCode = manifest.status;
  manifest.failureCode = manifest.status;
  manifest.error = manifest.status;
  manifest.safety = { ...manifest.safety, noAffirmativeReplay: true, noAddReplay: true, noDialogCommitReplay: true, noNativeSaveDuringBuildObservation: true, buildObservationReadOnly: true };
  writeJson(manifestPath, manifest);
  print({ ok: true, command: "bootstrap-observe-open-module-properties-hak-rebuild-timeout", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakPersistence: "unverified", observation, affirmativeReplayed: false, hakAddReplayed: false, modulePropertiesOkReplayed: false, nativeSaveAttempted: false });
}

function bootstrapReconcileOpenModulePropertiesHakRebuildDone(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_hak_rebuild_done_manifest_missing");
  const manifest = readJson(manifestPath);
  const observedBuildState = manifest.status === "hak_rebuild_in_progress"
    ? manifest.hakRebuildTimeoutObservations?.some((entry) => entry?.observation?.status === "building")
    : manifest.status === "hak_rebuild_settled_persistence_unverified"
      && manifest.hakRebuildTimeoutObservations?.some((entry) => entry?.observation?.status === "settled");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && observedBuildState
    && hasHakRebuildSettlementProvenance(manifest)
    && (manifest.openModulePropertiesHakBuildDoneReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_hak_rebuild_done_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-rebuild-done", mode: "dry-run", status: "authorized_for_open_module_properties_hak_rebuild_done", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable HAK rebuild observation with no prior Done reconciliation", "physical saved MOD and one responsive Toolset PID", "one exact Build Module result containing only No errors found", "disabled Build and enabled Done controls", "post only Done, then require Build Module to disappear; no HAK retry or Save"] });
    return;
  }
  const results = runAtom("read-aurora-toolset-dialog-list-items-no-global-input.mjs", ["--dialogClass", "TdlgVerifyModule", "--dialogTitle", "Build Module"]);
  if (results.itemCount !== 1 || JSON.stringify(results.items) !== JSON.stringify(["No errors found"])) throw new Error(`bootstrap_hak_rebuild_done_results_unverified:${JSON.stringify(results)}`);
  const attempt = { at: new Date().toISOString(), results, route: "aurora-build-module-done/v1" };
  manifest.openModulePropertiesHakBuildDoneReconciliationAttempts = [...(manifest.openModulePropertiesHakBuildDoneReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering"; writeJson(manifestPath, manifest);
  try {
    const done = runAtom("dismiss-aurora-toolset-build-module-done-no-global-input.mjs", [declaration.module.resref]);
    if (done.done?.text !== "Done" || done.done?.buildDisabled !== true) throw new Error(`bootstrap_hak_rebuild_done_readback_unverified:${JSON.stringify(done)}`);
    attempt.result = done;
    manifest.status = "hak_rebuild_settled_persistence_unverified";
    manifest.blockerCode = manifest.status; manifest.failureCode = manifest.status; manifest.error = manifest.status;
    manifest.safety = { ...manifest.safety, noHakRetry: true, noSaveBeforePersistenceReadback: true, noGlobalInput: true };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-rebuild-done", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakAddReplayed: false, nativeSaveAttempted: false });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakRebuildPersist(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_hak_rebuild_persist_manifest_missing");
  const manifest = readJson(manifestPath);
  const exactHaks = declaration.haks.map((hak) => hak.resref);
  const authorized = exactHaks.length === 1
    && manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "hak_rebuild_settled_persistence_unverified"
    && hasHakRebuildSettlementProvenance(manifest)
    && manifest.openModulePropertiesHakBuildDoneReconciliationAttempts?.length === 1
    && (manifest.openModulePropertiesHakBuildPersistReconciliationAttempts?.length ?? 0) === 0
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_hak_rebuild_persist_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-rebuild-persist", mode: "dry-run", status: "authorized_for_open_module_properties_hak_rebuild_persist", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable settled Build Module result closed with no prior persistence reconciliation", "exactly one declared HAK and one responsive dirty module frame", "reopen Module Properties only to read the ordered HAK list, then target Cancel", "targeted native save with clean title and changed module hash", "no HAK retry, Add, OK, menu replay, wizard, Area, creature, or runtime action"] });
    return;
  }
  const attempt = { at: new Date().toISOString(), route: "aurora-module-properties-hak-settled-persistence/v1", expectedHaks: exactHaks };
  manifest.openModulePropertiesHakBuildPersistReconciliationAttempts = [...(manifest.openModulePropertiesHakBuildPersistReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  writeJson(manifestPath, manifest);
  try {
    const inspection = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", exactHaks[0], "--hakPath", resolve(declaration.haks[0].path), "--inspectOnly", "true"]);
    if (inspection.inspectionOnly !== true || JSON.stringify(inspection.hakListReadback) !== JSON.stringify(exactHaks) || !inspection.finalFrame?.text?.endsWith("*")) throw new Error(`ordered_hak_settled_readback_mismatch:${JSON.stringify(inspection)}`);
    const save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(inspection.finalFrame.hwnd)]);
    if (save.titleAfter?.endsWith("*") || !save.after?.sha256 || save.hashDeferredUntilClose === true) throw new Error(`hak_settled_native_save_readback_unverified:${JSON.stringify(save)}`);
    const module = fileIdentity(declaration.module.path);
    if (module.sha256.toLowerCase() !== String(save.after.sha256).toLowerCase()) throw new Error(`hak_settled_saved_hash_mismatch:${JSON.stringify({ module, save })}`);
    attempt.inspection = inspection; attempt.save = save; attempt.module = module;
    manifest.stages ??= {}; manifest.stages.haks = [{ reconciledAfterSettledBuild: true, orderedHaks: exactHaks, inspection }]; manifest.stages.saveAfterHak = save;
    manifest.haks = declaration.haks.map((hak) => ({ resref: hak.resref, ...fileIdentity(hak.path) }));
    manifest.module = module;
    manifest.status = "hak_attached_saved_pending_creature";
    manifest.blockerCode = "bootstrap_hak_attached_pending_creature";
    manifest.failureCode = "hak_attached_saved_pending_creature";
    manifest.error = "hak_attached_saved_pending_creature";
    manifest.safety = { ...manifest.safety, noHakRetry: true, orderedHakReadback: true, savedModuleHashReadback: true, noGlobalInput: true };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-rebuild-persist", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakPersistence: "saved_verified", orderedHaks: exactHaks, module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileOpenModulePropertiesHakRebuildPersistLock(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_hak_rebuild_persist_lock_manifest_missing");
  const manifest = readJson(manifestPath);
  const exactHaks = declaration.haks.map((hak) => hak.resref);
  const errorText = String(manifest.error ?? "");
  const saveLockFailure = errorText.includes("hak_settled_native_save_readback_unverified:") && errorText.includes('"hashDeferredUntilClose":true');
  const hashBecameAvailable = errorText.includes("hak_settled_hash_lock_not_reproduced:") && errorText.includes('"sha256":');
  const firstLockReconciliation = (manifest.openModulePropertiesHakBuildPersistLockReconciliationAttempts?.length ?? 0) === 0 && saveLockFailure;
  const hashAvailabilityFollowup = manifest.openModulePropertiesHakBuildPersistLockReconciliationAttempts?.length === 1 && hashBecameAvailable;
  const authorized = exactHaks.length === 1
    && manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && (firstLockReconciliation || hashAvailabilityFollowup)
    && manifest.openModulePropertiesHakBuildDoneReconciliationAttempts?.length === 1
    && manifest.openModulePropertiesHakBuildPersistReconciliationAttempts?.length === 1
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_hak_rebuild_persist_lock_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-rebuild-persist-lock", mode: "dry-run", status: "authorized_for_open_module_properties_hak_rebuild_persist_lock", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["durable successful native Save with the sole failure that the Toolset retains the file lock", "exactly one declared HAK and one responsive clean module frame", "reopen Module Properties only to read the ordered HAK list, then target Cancel", "read-only filesystem identity with SHA-256 recorded as unknown_os_locked", "no HAK retry, Add, OK, Save, menu replay, wizard, Area, creature, or runtime action"] });
    return;
  }
  const attempt = { at: new Date().toISOString(), route: "aurora-module-properties-hak-settled-persistence-lock/v1", expectedHaks: exactHaks, priorError: manifest.error, mode: hashAvailabilityFollowup ? "hash_became_available_after_initial_lock_observation" : "initial_lock_observation" };
  manifest.openModulePropertiesHakBuildPersistLockReconciliationAttempts = [...(manifest.openModulePropertiesHakBuildPersistLockReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  writeJson(manifestPath, manifest);
  try {
    const inspection = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", exactHaks[0], "--hakPath", resolve(declaration.haks[0].path), "--inspectOnly", "true", "--expectedDirty", "false"]);
    if (inspection.inspectionOnly !== true || JSON.stringify(inspection.hakListReadback) !== JSON.stringify(exactHaks) || inspection.finalFrame?.text?.endsWith("*")) throw new Error(`ordered_hak_saved_readback_mismatch:${JSON.stringify(inspection)}`);
    const module = fileIdentityOrLocked(declaration.module.path);
    if (module.hashStatus === "unknown_os_locked" && hashAvailabilityFollowup) throw new Error(`hak_settled_hash_lock_still_held:${JSON.stringify(module)}`);
    if (module.hashStatus !== "unknown_os_locked" && !module.sha256) throw new Error(`hak_settled_saved_hash_unverified:${JSON.stringify(module)}`);
    attempt.inspection = inspection; attempt.module = module;
    manifest.stages ??= {}; manifest.stages.haks = [{ reconciledAfterSettledBuild: true, orderedHaks: exactHaks, inspection }]; manifest.stages.saveAfterHak = { reconciledExistingNativeSave: true, titleAfter: inspection.finalFrame.text, module };
    manifest.haks = declaration.haks.map((hak) => ({ resref: hak.resref, ...fileIdentity(hak.path) }));
    manifest.module = module;
    manifest.status = "hak_attached_saved_pending_creature";
    manifest.blockerCode = "bootstrap_hak_attached_pending_creature";
    manifest.failureCode = "hak_attached_saved_pending_creature";
    manifest.error = "hak_attached_saved_pending_creature";
    manifest.safety = { ...manifest.safety, noHakRetry: true, orderedHakReadback: true, nativeSaveReadback: true, moduleHashStatus: module.hashStatus ?? "verified", noGlobalInput: true };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-open-module-properties-hak-rebuild-persist-lock", status: manifest.status, manifestPath, proofClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakPersistence: module.hashStatus === "unknown_os_locked" ? "saved_native_hash_deferred_os_locked" : "saved_verified", orderedHaks: exactHaks, module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedPlaceCreature(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_hak_attached_place_creature_manifest_missing");
  const manifest = readJson(manifestPath);
  const initialPlacement = manifest.status === "hak_attached_saved_pending_creature" && (manifest.hakAttachedCreaturePlacementAttempts?.length ?? 0) === 0;
  const failureText = String(manifest.error ?? "");
  const viewerResume = manifest.status === "failed" && /expected_area_viewer_missing|tree_caret_missing/u.test(failureText) && (manifest.hakAttachedCreaturePlacementAttempts?.length ?? 0) >= 1 && (manifest.hakAttachedCreatureAreaViewerAttempts?.length ?? 0) === 0;
  const propertiesResume = manifest.status === "failed" && failureText.includes("bootstrap_creature_properties_ambiguous:0") && (manifest.hakAttachedCreaturePlacementAttempts?.length ?? 0) >= 1 && manifest.hakAttachedCreatureAreaViewerAttempts?.length === 1;
  const appearanceResume = manifest.status === "failed" && /expected_one_exact_combo_item:0|expected_one_visible_combo_with_exact_target:0|ETIMEDOUT|VariableNotWritable|ConvertToFinalInvalidCastException|send_timeout:344|find_exact_timeout:344|combolbox_selection_readback_mismatch|target_tab_not_active|combo_ordinal_out_of_range|Cannot locate the history for Id/u.test(failureText) && (manifest.hakAttachedCreaturePlacementAttempts?.length ?? 0) >= 1 && manifest.hakAttachedCreatureAreaViewerAttempts?.length === 1;
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && (initialPlacement || viewerResume || propertiesResume || appearanceResume)
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_hak_attached_place_creature_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-place-creature", mode: "dry-run", status: "authorized_for_hak_attached_creature_placement", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, requires: ["saved_verified ordered HAK list and saved module SHA-256", "one responsive clean exact module frame and no modal", "saved Tiny 2x2 Area with zero creatures before placement", "one declared creature palette placement plus Appearance readback", "targeted Save and native GIT/IFO readback; no HAK, wizard, or runtime replay"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exactTitle = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
  const priorProcessId = manifest.hakAttachedCreaturePlacementAttempts?.at(-1)?.preflight?.windows?.processId;
  const orphanedSessionResume = appearanceResume && Number.isInteger(Number(priorProcessId)) && Number(priorProcessId) !== Number(windows.processId) && (manifest.orphanedSessionRecoveryAttempts?.length ?? 0) === 0;
  const expectedFrameTitle = (propertiesResume || (appearanceResume && !orphanedSessionResume)) ? `${exactTitle}*` : exactTitle;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === expectedFrameTitle);
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
  const reuseExistingPropertiesPopup = propertiesResume && unexpected.length === 1 && unexpected[0].className === "#32768";
  const reuseExistingCreaturePropertiesDialog = appearanceResume && !orphanedSessionResume && unexpected.length === 1 && unexpected[0].className === "TdlgCreatureEdit" && unexpected[0].text === "Creature Properties";
  const before = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (windows.responding !== true || frames.length !== 1 || (unexpected.length !== 0 && !reuseExistingPropertiesPopup && !reuseExistingCreaturePropertiesDialog) || !Array.isArray(before.creatures) || before.creatures.length !== 0) throw new Error(`bootstrap_hak_attached_place_creature_preflight_unverified:${JSON.stringify({ responding: windows.responding, frames, unexpected, creatures: before.creatures })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-creature-placement-and-appearance/v1", preflight: { windows, before }, mode: orphanedSessionResume ? "resume_after_orphaned_appearance_session_with_clean_saved_module" : reuseExistingCreaturePropertiesDialog ? "resume_open_creature_properties_after_native_combo_text_readback_fix" : reuseExistingPropertiesPopup ? "resume_existing_exact_properties_popup_with_validated_popup_accelerator" : propertiesResume ? "resume_existing_unsaved_creature_after_properties_caption_readback_fix" : viewerResume ? "resume_after_area_viewer_missing" : "initial_placement" };
  if (orphanedSessionResume) manifest.orphanedSessionRecoveryAttempts = [...(manifest.orphanedSessionRecoveryAttempts ?? []), { at: attempt.at, priorProcessId: Number(priorProcessId), currentProcessId: Number(windows.processId), savedGitCreatureCount: before.creatures.length }];
  manifest.hakAttachedCreaturePlacementAttempts = [...(manifest.hakAttachedCreaturePlacementAttempts ?? []), attempt];
  manifest.status = "recovering";
  writeJson(manifestPath, manifest);
  try {
    if (!propertiesResume && (!appearanceResume || orphanedSessionResume)) {
      const areaViewer = ensureBootstrapAreaViewer(declaration);
      manifest.hakAttachedCreatureAreaViewerAttempts = [...(manifest.hakAttachedCreatureAreaViewerAttempts ?? []), areaViewer];
      writeJson(manifestPath, manifest);
    }
    manifest.stages ??= {}; manifest.stages.creatures = declaration.creatures.map((creature) => placeCreatureAndAppearance(declaration, creature, outDir, frames[0].hwnd, { reuseExistingPlacedCreature: propertiesResume || (appearanceResume && !orphanedSessionResume), reuseExistingPropertiesPopup, reuseExistingCreaturePropertiesDialog }));
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(frames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { creatures: manifest.stages.creatures, save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-place-creature", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocation(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_manifest_missing");
  const manifest = readJson(manifestPath);
  const candidate = { x: integerOption(options.candidateX, "--candidateX"), y: integerOption(options.candidateY, "--candidateY") };
  const saveTimeout = String(manifest.error ?? "").includes("save-aurora-toolset-module-no-global-input.mjs") && String(manifest.error ?? "").includes("ETIMEDOUT");
  const priorGeometryFailure = manifest.failureCode === "area_geometry_invalid" && /native_save_error_modal|invalid locations/iu.test(String(manifest.error ?? ""));
  const priorCandidates = manifest.invalidLocationReconciliationAttempts ?? [];
  const sameCandidate = priorCandidates.some((attempt) => Number(attempt?.candidate?.x) === candidate.x && Number(attempt?.candidate?.y) === candidate.y);
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_create_failed"
    && (saveTimeout || priorGeometryFailure)
    && (manifest.hakAttachedCreaturePlacementAttempts?.length ?? 0) >= 1
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && priorCandidates.length < 4
    && !sameCandidate
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_not_authorized_for_state");
  if (options.dryRun === "true") {
    if (!isTileCenterCoordinate(candidate.x) || !isTileCenterCoordinate(candidate.y)) throw new Error("invalid_location_candidate_not_tile_center");
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location", mode: "dry-run", status: "authorized_for_invalid_location_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate, requires: ["durable timeout from the targeted save after one HAK-attached creature/Appearance commit", "one exact visible Error modal proving invalid creature location", "the existing one exact Dwarf Mercenary tree object; no HAK, palette, creature, or Appearance replay", "one centre-of-tile Adjust Location candidate, targeted Save, and native GIT/IFO readback"] });
    return;
  }
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const errors = (windows.windows ?? []).filter((window) => window.className === "#32770" && window.text === "Error");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "#32770"].includes(window.className));
  const errorControls = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "#32770", "--title", "Error"]);
  const errorText = (errorControls.controls ?? []).filter((control) => control.visible).map((control) => String(control.text ?? "")).join("\n");
  const errorOk = (errorControls.controls ?? []).filter((control) => control.visible && control.text === "OK" && control.enabled === true);
  const savedGit = runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (windows.responding !== true || frames.length !== 1 || errors.length !== 1 || unexpected.length !== 0 || errorControls.processId !== windows.processId || !errorText.includes("This area contains 1 creature(s) located in invalid locations.") || !errorText.includes("Area was NOT saved!!") || errorOk.length !== 1 || !Array.isArray(savedGit.creatures) || savedGit.creatures.length !== 0 || area.width !== 2 || area.height !== 2 || area.tileCount !== 4 || area.completeTileList !== true || !isTileCenterInArea(candidate.x, area.width) || !isTileCenterInArea(candidate.y, area.height)) {
    throw new Error(`bootstrap_invalid_location_live_preflight_unverified:${JSON.stringify({ responding: windows.responding, frames, errors, unexpected, errorControls, errorText, errorOk: errorOk.length, savedCreatures: savedGit.creatures, area, candidate })}`);
  }
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location/v1", candidate, preflight: { windows, errorControls, errorText, savedGit, area }, mode: "resume_one_existing_hak_attached_creature_after_native_invalid_location_error" };
  manifest.invalidLocationReconciliationAttempts = [...priorCandidates, attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, adjustsExistingObjectOnly: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.dismissError = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "#32770", "--dialogTitle", "Error", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterDismiss = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterDismissFrames = (afterDismiss.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterDismissUnexpected = (afterDismiss.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterDismiss.responding !== true || afterDismissFrames.length !== 1 || afterDismissUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_error_dismissal_unverified:${JSON.stringify({ afterDismiss, afterDismissFrames, afterDismissUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openAdjustLocation = runAtom("invoke-aurora-toolset-visible-context-menu-item-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    const fields = attempt.locationBefore.fields ?? [];
    if (attempt.locationBefore.processId !== windows.processId || fields.length !== 3 || fields.some((field) => !String(field.text ?? "").trim())) throw new Error(`bootstrap_invalid_location_fields_unverified:${JSON.stringify(attempt.locationBefore)}`);
    attempt.setLocation = runAtom("set-aurora-toolset-adjust-location-fields-no-global-input.mjs", ["--expectedX", fields[0].text, "--expectedY", fields[1].text, "--expectedZ", fields[2].text, "--x", formatLocationCoordinate(candidate.x, fields[0].text), "--y", formatLocationCoordinate(candidate.y, fields[1].text), "--z", fields[2].text]);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterLocation = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterLocationFrames = (afterLocation.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterLocationUnexpected = (afterLocation.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterLocation.responding !== true || afterLocationFrames.length !== 1 || afterLocationUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_commit_unverified:${JSON.stringify({ afterLocation, afterLocationFrames, afterLocationUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(afterLocationFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationObjectList(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_object_list_manifest_missing");
  const manifest = readJson(manifestPath);
  const priorAttempt = manifest.invalidLocationReconciliationAttempts?.at(-1);
  const firstObjectListContinuation = (manifest.invalidLocationObjectListReconciliationAttempts?.length ?? 0) === 0;
  const pidTransportRepair = (manifest.invalidLocationObjectListReconciliationAttempts?.length ?? 0) === 1
    && String(manifest.error ?? "").includes("dismiss-aurora-toolset-object-list-no-global-input.mjs")
    && String(manifest.error ?? "").includes("Cannot overwrite variable pid");
  const objectListFailure = String(manifest.error ?? "").includes("bootstrap_invalid_location_error_dismissal_unverified") && String(manifest.error ?? "").includes("TfrmObjectList");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "area_geometry_invalid"
    && (manifest.invalidLocationReconciliationAttempts?.length ?? 0) === 1
    && ((firstObjectListContinuation && objectListFailure) || pidTransportRepair)
    && Number.isInteger(Number(priorAttempt?.candidate?.x))
    && Number.isInteger(Number(priorAttempt?.candidate?.y))
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_object_list_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-object-list", mode: "dry-run", status: "authorized_for_invalid_location_object_list_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: priorAttempt.candidate, requires: ["the exact first invalid-location recovery stopped after dismissing Error and exposed one TfrmObjectList/Inaccessable Objects window", "dismiss only that diagnostic Object List using its exact native class/title", "resume the existing Dwarf Mercenary through Adjust Location at the previously authorized centre-of-tile candidate", "targeted Save and native GIT/IFO readback; no HAK, palette, creature, or Appearance replay"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const objectLists = (windows.windows ?? []).filter((window) => window.className === "TfrmObjectList" && window.text === "Inaccessable Objects");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmObjectList"].includes(window.className));
  if (windows.responding !== true || frames.length !== 1 || objectLists.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_invalid_location_object_list_live_preflight_unverified:${JSON.stringify({ windows, frames, objectLists, unexpected })}`);
  const attempt = pidTransportRepair
    ? manifest.invalidLocationObjectListReconciliationAttempts[0]
    : { at: new Date().toISOString(), route: "aurora-invalid-location-object-list-continuation/v1", candidate: priorAttempt.candidate, preflight: { windows }, mode: "dismiss_exact_inaccessable_objects_diagnostic_then_resume_existing_creature_location" };
  if (pidTransportRepair) attempt.pidTransportRepair = { at: new Date().toISOString(), priorError: manifest.error };
  else manifest.invalidLocationObjectListReconciliationAttempts = [attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, closesOnlyExactDiagnosticObjectList: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.dismissObjectList = runAtom("dismiss-aurora-toolset-object-list-no-global-input.mjs", ["--title", "Inaccessable Objects"]);
    const afterDismiss = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterDismissFrames = (afterDismiss.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterDismissUnexpected = (afterDismiss.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterDismiss.responding !== true || afterDismissFrames.length !== 1 || afterDismissUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_object_list_dismissal_unverified:${JSON.stringify({ afterDismiss, afterDismissFrames, afterDismissUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_object_list_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openAdjustLocation = runAtom("invoke-aurora-toolset-visible-context-menu-item-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    const fields = attempt.locationBefore.fields ?? [];
    if (attempt.locationBefore.processId !== windows.processId || fields.length !== 3 || fields.some((field) => !String(field.text ?? "").trim())) throw new Error(`bootstrap_invalid_location_object_list_fields_unverified:${JSON.stringify(attempt.locationBefore)}`);
    attempt.setLocation = runAtom("set-aurora-toolset-adjust-location-fields-no-global-input.mjs", ["--expectedX", fields[0].text, "--expectedY", fields[1].text, "--expectedZ", fields[2].text, "--x", formatLocationCoordinate(Number(priorAttempt.candidate.x), fields[0].text), "--y", formatLocationCoordinate(Number(priorAttempt.candidate.y), fields[1].text), "--z", fields[2].text]);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterLocation = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterLocationFrames = (afterLocation.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterLocationUnexpected = (afterLocation.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterLocation.responding !== true || afterLocationFrames.length !== 1 || afterLocationUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_object_list_commit_unverified:${JSON.stringify({ afterLocation, afterLocationFrames, afterLocationUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(afterLocationFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-object-list", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationMenuTransport(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_menu_transport_manifest_missing");
  const manifest = readJson(manifestPath);
  const priorAttempt = manifest.invalidLocationReconciliationAttempts?.at(-1);
  const menuTransportFailure = String(manifest.error ?? "").includes("invoke-aurora-toolset-visible-context-menu-item-no-global-input.mjs") && String(manifest.error ?? "").includes("Cannot overwrite variable pid");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_create_failed"
    && menuTransportFailure
    && (manifest.invalidLocationReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationObjectListReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuTransportReconciliationAttempts?.length ?? 0) === 0
    && Number.isInteger(Number(priorAttempt?.candidate?.x))
    && Number.isInteger(Number(priorAttempt?.candidate?.y))
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_menu_transport_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-menu-transport", mode: "dry-run", status: "authorized_for_invalid_location_menu_transport_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: priorAttempt.candidate, requires: ["the exact Object List continuation opened one visible Dwarf Mercenary context menu and stopped before it sent any menu message because of the recorded PowerShell PID transport failure", "reuse only that visible popup; no object re-selection or context-menu replay", "open Adjust Location with exact popup text/id/position validation, set the already authorized centre-of-tile candidate, then Save/read back"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const menus = (windows.windows ?? []).filter((window) => window.className === "#32768");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "#32768"].includes(window.className));
  if (windows.responding !== true || frames.length !== 1 || menus.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_invalid_location_menu_transport_live_preflight_unverified:${JSON.stringify({ windows, frames, menus, unexpected })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-menu-transport-continuation/v1", candidate: priorAttempt.candidate, preflight: { windows }, mode: "reuse_existing_exact_adjust_location_popup_after_pid_transport_fix" };
  manifest.invalidLocationMenuTransportReconciliationAttempts = [attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, reusesExistingExactContextMenu: true, noObjectReselection: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.openAdjustLocation = runAtom("invoke-aurora-toolset-visible-context-menu-item-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    const fields = attempt.locationBefore.fields ?? [];
    if (attempt.locationBefore.processId !== windows.processId || fields.length !== 3 || fields.some((field) => !String(field.text ?? "").trim())) throw new Error(`bootstrap_invalid_location_menu_transport_fields_unverified:${JSON.stringify(attempt.locationBefore)}`);
    attempt.setLocation = runAtom("set-aurora-toolset-adjust-location-fields-no-global-input.mjs", ["--expectedX", fields[0].text, "--expectedY", fields[1].text, "--expectedZ", fields[2].text, "--x", formatLocationCoordinate(Number(priorAttempt.candidate.x), fields[0].text), "--y", formatLocationCoordinate(Number(priorAttempt.candidate.y), fields[1].text), "--z", fields[2].text]);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterLocation = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterLocationFrames = (afterLocation.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterLocationUnexpected = (afterLocation.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterLocation.responding !== true || afterLocationFrames.length !== 1 || afterLocationUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_menu_transport_commit_unverified:${JSON.stringify({ afterLocation, afterLocationFrames, afterLocationUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(afterLocationFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-menu-transport", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationMenuOwner(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_menu_owner_manifest_missing");
  const manifest = readJson(manifestPath);
  const priorAttempt = manifest.invalidLocationReconciliationAttempts?.at(-1);
  const priorMenuAttempt = manifest.invalidLocationMenuTransportReconciliationAttempts?.at(-1);
  const menuTransportFailure = String(manifest.error ?? "").includes("invoke-aurora-toolset-visible-context-menu-item-no-global-input.mjs")
    && String(manifest.error ?? "").includes("context_menu_item_dialog_not_opened:Adjust Location");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_create_failed"
    && menuTransportFailure
    && (manifest.invalidLocationReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationObjectListReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuTransportReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuOwnerReconciliationAttempts?.length ?? 0) === 0
    && Number.isInteger(Number(priorAttempt?.candidate?.x))
    && Number.isInteger(Number(priorAttempt?.candidate?.y))
    && priorMenuAttempt?.mode === "reuse_existing_exact_adjust_location_popup_after_pid_transport_fix"
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_menu_owner_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-menu-owner", mode: "dry-run", status: "authorized_for_invalid_location_menu_owner_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: priorAttempt.candidate, requires: ["the one exact popup-key transport closed the validated Dwarf Mercenary menu without opening Adjust Location", "one responsive dirty module frame with no popup or modal", "open one new exact Dwarf Mercenary tree context menu, validate Adjust Location text/id/position, then use the GUI-thread owner Enter transport", "require TdlgLocation readback before setting the already authorized centre-of-tile candidate, then Save/read back"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
  if (windows.responding !== true || frames.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_invalid_location_menu_owner_live_preflight_unverified:${JSON.stringify({ windows, frames, unexpected })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-menu-owner-continuation/v1", candidate: priorAttempt.candidate, preflight: { windows }, mode: "fresh_exact_tree_popup_then_gui_thread_owner_enter" };
  manifest.invalidLocationMenuOwnerReconciliationAttempts = [attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, reopensOneExactContextMenuAfterMeasuredPopupTransportFailure: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_menu_owner_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openAdjustLocation = runAtom("invoke-aurora-toolset-context-menu-owner-command-no-global-input.mjs", ["--itemText", "&Adjust Location", "--method", "enter"]);
    const opened = (attempt.openAdjustLocation.visibleToolsetWindows ?? []).filter((window) => window.className === "TdlgLocation" && window.title === "Adjust Location");
    if (attempt.openAdjustLocation.processId !== windows.processId || attempt.openAdjustLocation.invoked !== true || opened.length !== 1) throw new Error(`bootstrap_invalid_location_menu_owner_dialog_not_opened:${JSON.stringify(attempt.openAdjustLocation)}`);
    attempt.locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    const fields = attempt.locationBefore.fields ?? [];
    if (attempt.locationBefore.processId !== windows.processId || fields.length !== 3 || fields.some((field) => !String(field.text ?? "").trim())) throw new Error(`bootstrap_invalid_location_menu_owner_fields_unverified:${JSON.stringify(attempt.locationBefore)}`);
    attempt.setLocation = runAtom("set-aurora-toolset-adjust-location-fields-no-global-input.mjs", ["--expectedX", fields[0].text, "--expectedY", fields[1].text, "--expectedZ", fields[2].text, "--x", formatLocationCoordinate(Number(priorAttempt.candidate.x), fields[0].text), "--y", formatLocationCoordinate(Number(priorAttempt.candidate.y), fields[1].text), "--z", fields[2].text]);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterLocation = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterLocationFrames = (afterLocation.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterLocationUnexpected = (afterLocation.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterLocation.responding !== true || afterLocationFrames.length !== 1 || afterLocationUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_menu_owner_commit_unverified:${JSON.stringify({ afterLocation, afterLocationFrames, afterLocationUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(afterLocationFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-menu-owner", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationMenuAccelerator(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_menu_accelerator_manifest_missing");
  const manifest = readJson(manifestPath);
  const priorAttempt = manifest.invalidLocationReconciliationAttempts?.at(-1);
  const priorOwnerAttempt = manifest.invalidLocationMenuOwnerReconciliationAttempts?.at(-1);
  const ownerTransportFailure = String(manifest.error ?? "").includes("invoke-aurora-toolset-context-menu-owner-command-no-global-input.mjs")
    && String(manifest.error ?? "").includes("tp_util_window_menu_owner_dispatch_forbidden");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_create_failed"
    && ownerTransportFailure
    && (manifest.invalidLocationReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationObjectListReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuTransportReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuOwnerReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuAcceleratorReconciliationAttempts?.length ?? 0) === 0
    && Number.isInteger(Number(priorAttempt?.candidate?.x))
    && Number.isInteger(Number(priorAttempt?.candidate?.y))
    && priorOwnerAttempt?.mode === "fresh_exact_tree_popup_then_gui_thread_owner_enter"
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_menu_accelerator_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-menu-accelerator", mode: "dry-run", status: "authorized_for_invalid_location_menu_accelerator_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: priorAttempt.candidate, requires: ["the GUI-thread owner was proven TPUtilWindow and refused to dispatch without sending a command", "reuse the one still-visible exact Dwarf Mercenary popup; no object selection or popup replay", "validate Adjust Location text/id/position and its unique A accelerator, then send WM_CHAR only to that popup", "require TdlgLocation readback before setting the already authorized centre-of-tile candidate, then Save/read back"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const menus = (windows.windows ?? []).filter((window) => window.className === "#32768");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "#32768"].includes(window.className));
  if (windows.responding !== true || frames.length !== 1 || menus.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_invalid_location_menu_accelerator_live_preflight_unverified:${JSON.stringify({ windows, frames, menus, unexpected })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-menu-accelerator-continuation/v1", candidate: priorAttempt.candidate, preflight: { windows }, mode: "reuse_exact_tp_util_window_popup_with_unique_a_accelerator" };
  manifest.invalidLocationMenuAcceleratorReconciliationAttempts = [attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, reusesExistingExactContextMenu: true, noObjectReselection: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.openAdjustLocation = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    if (attempt.openAdjustLocation.processId !== windows.processId || attempt.openAdjustLocation.accelerator !== "A") throw new Error(`bootstrap_invalid_location_menu_accelerator_readback_unverified:${JSON.stringify(attempt.openAdjustLocation)}`);
    attempt.locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    const fields = attempt.locationBefore.fields ?? [];
    if (attempt.locationBefore.processId !== windows.processId || fields.length !== 3 || fields.some((field) => !String(field.text ?? "").trim())) throw new Error(`bootstrap_invalid_location_menu_accelerator_fields_unverified:${JSON.stringify(attempt.locationBefore)}`);
    attempt.setLocation = runAtom("set-aurora-toolset-adjust-location-fields-no-global-input.mjs", ["--expectedX", fields[0].text, "--expectedY", fields[1].text, "--expectedZ", fields[2].text, "--x", formatLocationCoordinate(Number(priorAttempt.candidate.x), fields[0].text), "--y", formatLocationCoordinate(Number(priorAttempt.candidate.y), fields[1].text), "--z", fields[2].text]);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterLocation = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterLocationFrames = (afterLocation.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterLocationUnexpected = (afterLocation.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterLocation.responding !== true || afterLocationFrames.length !== 1 || afterLocationUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_menu_accelerator_commit_unverified:${JSON.stringify({ afterLocation, afterLocationFrames, afterLocationUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(afterLocationFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-menu-accelerator", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationWalkmeshCandidate(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_walkmesh_candidate_manifest_missing");
  const manifest = readJson(manifestPath);
  const priorAttempt = manifest.invalidLocationReconciliationAttempts?.at(-1);
  const priorAcceleratorAttempt = manifest.invalidLocationMenuAcceleratorReconciliationAttempts?.at(-1);
  const priorWalkmeshCandidateAttempt = manifest.invalidLocationWalkmeshCandidateReconciliationAttempts?.at(-1);
  const walkmeshCandidateAttemptCount = manifest.invalidLocationWalkmeshCandidateReconciliationAttempts?.length ?? 0;
  const nativeSaveTimedOut = String(manifest.error ?? "").includes("save-aurora-toolset-module-no-global-input.mjs") && String(manifest.error ?? "").includes("ETIMEDOUT");
  const errorButtonPostFailure = String(manifest.error ?? "").includes("click-aurora-toolset-dialog-button-no-global-input.mjs") && String(manifest.error ?? "").includes("dialog_still_visible");
  const candidate = {
    x: 18.6667, y: 15.6667, z: 0.1,
    provenance: {
      retailTileset: "tcn01", moduleArea: declaration.area.resref,
      tile: { index: 3, row: 1, col: 1, tileId: 15, orientation: 0, modelResref: "tcn01_c01_01", wokResref: "tcn01_c01_01" },
      face: { index: 57, surfaceMaterial: 1, materialName: "Dirt", surfacematWalk: 1, triangleArea: 20 },
      derivation: "retail WOK triangle centroid after the Aurora tile-orientation transform"
    }
  };
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_create_failed"
    && (manifest.failureCode === "area_geometry_invalid" || (errorButtonPostFailure && manifest.failureCode === "unclassified"))
    && (nativeSaveTimedOut || errorButtonPostFailure)
    && (manifest.invalidLocationReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationObjectListReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuTransportReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuOwnerReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuAcceleratorReconciliationAttempts?.length ?? 0) === 1
    && (walkmeshCandidateAttemptCount === 0 || (walkmeshCandidateAttemptCount === 1 && errorButtonPostFailure && priorWalkmeshCandidateAttempt?.mode === "retail_wok_surfmat_triangle_centroid_after_native_invalid_location_error"))
    && Number(priorAttempt?.candidate?.x) === 5
    && Number(priorAttempt?.candidate?.y) === 5
    && priorAcceleratorAttempt?.mode === "reuse_exact_tp_util_window_popup_with_unique_a_accelerator"
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_walkmesh_candidate_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-walkmesh-candidate", mode: "dry-run", status: "authorized_for_invalid_location_walkmesh_candidate_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate, errorButtonTransport: walkmeshCandidateAttemptCount === 0 ? "post" : "send-timeout", requires: ["the exact TPUtilWindow popup accelerator completed Adjust Location, but native Save reported the one invalid creature location", "one responsive dirty module frame plus one exact native Error modal with the invalid-location text", "dismiss only that Error and its resulting Inaccessable Objects diagnostic, then re-open the existing Dwarf Mercenary context", "validate and invoke only its unique A accelerator, set the retail WOK/surfacemat-derived candidate, require successful native Save and GIT/IFO readback"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const errors = (windows.windows ?? []).filter((window) => window.className === "#32770" && window.text === "Error");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "#32770"].includes(window.className));
  const errorControls = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "#32770", "--title", "Error"]);
  const errorText = (errorControls.controls ?? []).map((control) => String(control.text ?? "")).join("\n");
  if (windows.responding !== true || frames.length !== 1 || errors.length !== 1 || unexpected.length !== 0 || !/This area contains 1 creature\(s\) located in invalid locations\.\s*Area was NOT saved!!/u.test(errorText)) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_live_preflight_unverified:${JSON.stringify({ windows, frames, errors, unexpected, errorControls })}`);
  const errorButtonTransport = walkmeshCandidateAttemptCount === 0 ? "post" : "send-timeout";
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-walkmesh-candidate-continuation/v1", candidate, preflight: { windows, errorControls }, mode: "retail_wok_surfmat_triangle_centroid_after_native_invalid_location_error", errorButtonTransport };
  manifest.invalidLocationWalkmeshCandidateReconciliationAttempts = [...(manifest.invalidLocationWalkmeshCandidateReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.dismissError = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "#32770", "--dialogTitle", "Error", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", errorButtonTransport]);
    const afterError = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterErrorFrames = (afterError.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const objectLists = (afterError.windows ?? []).filter((window) => window.className === "TfrmObjectList" && window.text === "Inaccessable Objects");
    const afterErrorUnexpected = (afterError.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmObjectList"].includes(window.className));
    if (afterError.responding !== true || afterErrorFrames.length !== 1 || objectLists.length !== 1 || afterErrorUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_object_list_unverified:${JSON.stringify({ afterError, afterErrorFrames, objectLists, afterErrorUnexpected })}`);
    attempt.dismissObjectList = runAtom("dismiss-aurora-toolset-object-list-no-global-input.mjs", ["--title", "Inaccessable Objects"]);
    const afterDismiss = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterDismissFrames = (afterDismiss.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterDismissUnexpected = (afterDismiss.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterDismiss.responding !== true || afterDismissFrames.length !== 1 || afterDismissUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_object_list_dismissal_unverified:${JSON.stringify({ afterDismiss, afterDismissFrames, afterDismissUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openAdjustLocation = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    if (attempt.openAdjustLocation.processId !== windows.processId || attempt.openAdjustLocation.accelerator !== "A") throw new Error(`bootstrap_invalid_location_walkmesh_candidate_accelerator_unverified:${JSON.stringify(attempt.openAdjustLocation)}`);
    attempt.locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    const fields = attempt.locationBefore.fields ?? [];
    if (attempt.locationBefore.processId !== windows.processId || fields.length !== 3 || fields.some((field) => !String(field.text ?? "").trim())) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_fields_unverified:${JSON.stringify(attempt.locationBefore)}`);
    attempt.setLocation = runAtom("set-aurora-toolset-adjust-location-fields-no-global-input.mjs", ["--expectedX", fields[0].text, "--expectedY", fields[1].text, "--expectedZ", fields[2].text, "--x", formatLocationCoordinate(candidate.x, fields[0].text), "--y", formatLocationCoordinate(candidate.y, fields[1].text), "--z", formatLocationCoordinate(candidate.z, fields[2].text)]);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterLocation = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterLocationFrames = (afterLocation.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterLocationUnexpected = (afterLocation.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterLocation.responding !== true || afterLocationFrames.length !== 1 || afterLocationUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_commit_unverified:${JSON.stringify({ afterLocation, afterLocationFrames, afterLocationUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(afterLocationFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-walkmesh-candidate", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationWalkmeshCandidateSaveTransport(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_walkmesh_candidate_save_transport_manifest_missing");
  const manifest = readJson(manifestPath);
  const candidate = { x: 18.6667, y: 15.6667, z: 0.1 };
  const candidateAttempts = manifest.invalidLocationWalkmeshCandidateReconciliationAttempts ?? [];
  const lastCandidateAttempt = candidateAttempts.at(-1);
  const locationSet = lastCandidateAttempt?.setLocation?.fields ?? [];
  const locationCommitted = lastCandidateAttempt?.commitLocation?.buttonText === "OK";
  const nativeSaveTimedOut = String(manifest.error ?? "").includes("save-aurora-toolset-module-no-global-input.mjs") && String(manifest.error ?? "").includes("ETIMEDOUT");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_create_failed"
    && manifest.failureCode === "area_geometry_invalid"
    && nativeSaveTimedOut
    && (manifest.invalidLocationReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationObjectListReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuTransportReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuOwnerReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationMenuAcceleratorReconciliationAttempts?.length ?? 0) === 1
    && candidateAttempts.length === 2
    && Number(lastCandidateAttempt?.candidate?.x) === candidate.x
    && Number(lastCandidateAttempt?.candidate?.y) === candidate.y
    && Number(lastCandidateAttempt?.candidate?.z) === candidate.z
    && locationSet.length === 3
    && locationCommitted
    && (manifest.invalidLocationWalkmeshCandidateSaveTransportReconciliationAttempts?.length ?? 0) === 0
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_walkmesh_candidate_save_transport_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-walkmesh-candidate-save-transport", mode: "dry-run", status: "authorized_for_invalid_location_walkmesh_candidate_save_transport_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate, requires: ["exactly two already-recorded walkmesh candidate attempts ending in a native invalid-location Error after a save transport timeout", "one responsive dirty module frame plus the exact native invalid-location Error modal", "dismiss only that Error and its resulting Inaccessable Objects diagnostic", "re-open Dwarf Mercenary Adjust Location only to read and confirm the committed candidate; target Cancel without changing it", "one retried native Save through the corrected asynchronous toolbar transport, followed by GIT/IFO readback only if Save succeeds"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const errors = (windows.windows ?? []).filter((window) => window.className === "#32770" && window.text === "Error");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "#32770"].includes(window.className));
  const errorControls = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "#32770", "--title", "Error"]);
  const errorText = (errorControls.controls ?? []).map((control) => String(control.text ?? "")).join("\n");
  if (windows.responding !== true || frames.length !== 1 || errors.length !== 1 || unexpected.length !== 0 || !/This area contains 1 creature\(s\) located in invalid locations\.\s*Area was NOT saved!!/u.test(errorText)) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_save_transport_live_preflight_unverified:${JSON.stringify({ windows, frames, errors, unexpected, errorControls })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-walkmesh-candidate-save-transport-continuation/v1", candidate, preflight: { windows, errorControls }, mode: "confirm_committed_wok_candidate_then_retry_only_the_corrected_asynchronous_native_save_transport" };
  manifest.invalidLocationWalkmeshCandidateSaveTransportReconciliationAttempts = [attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noLocationMutation: true, noGlobalInput: true, asynchronousSaveToolbarTransport: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.dismissError = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "#32770", "--dialogTitle", "Error", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "send-timeout"]);
    const afterError = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterErrorFrames = (afterError.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const objectLists = (afterError.windows ?? []).filter((window) => window.className === "TfrmObjectList" && window.text === "Inaccessable Objects");
    const afterErrorUnexpected = (afterError.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TfrmObjectList"].includes(window.className));
    if (afterError.responding !== true || afterErrorFrames.length !== 1 || objectLists.length !== 1 || afterErrorUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_save_transport_object_list_unverified:${JSON.stringify({ afterError, afterErrorFrames, objectLists, afterErrorUnexpected })}`);
    attempt.dismissObjectList = runAtom("dismiss-aurora-toolset-object-list-no-global-input.mjs", ["--title", "Inaccessable Objects"]);
    const afterDismiss = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterDismissFrames = (afterDismiss.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterDismissUnexpected = (afterDismiss.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterDismiss.responding !== true || afterDismissFrames.length !== 1 || afterDismissUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_save_transport_object_list_dismissal_unverified:${JSON.stringify({ afterDismiss, afterDismissFrames, afterDismissUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_save_transport_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openAdjustLocation = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    const fields = attempt.locationReadback.fields ?? [];
    if (attempt.openAdjustLocation.processId !== windows.processId || attempt.openAdjustLocation.accelerator !== "A" || fields.length !== 3 || !sameLocationCoordinates(fields, candidate)) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_save_transport_location_readback_mismatch:${JSON.stringify({ openAdjustLocation: attempt.openAdjustLocation, fields, candidate })}`);
    attempt.cancelLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
    const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_walkmesh_candidate_save_transport_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-walkmesh-candidate-save-transport", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, locationMutated: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationEnChange(declaration, declarationPath, outDir, { resumeRenderedAtomFailure = false } = {}) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_adjust_location_en_change_manifest_missing");
  const manifest = readJson(manifestPath);
  const candidate = { x: 18.6667, y: 15.6667, z: 0.1 };
  const source = { x: 5.57, y: 14.53, z: 3.2 };
  const candidateAttempts = manifest.invalidLocationWalkmeshCandidateReconciliationAttempts ?? [];
  const saveTransportAttempt = manifest.invalidLocationWalkmeshCandidateSaveTransportReconciliationAttempts?.at(-1);
  const expectedFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_walkmesh_candidate_save_transport_location_readback_mismatch:");
  const renderedAtomFailure = String(manifest.error ?? "").includes("set-aurora-toolset-adjust-location-fields-no-global-input.mjs") && String(manifest.error ?? "").includes("InvalidVariableReferenceWithDrive");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_create_failed"
    && manifest.failureCode === "unclassified"
    && (resumeRenderedAtomFailure ? renderedAtomFailure : expectedFailure)
    && candidateAttempts.length === 2
    && Number(candidateAttempts.at(-1)?.candidate?.x) === candidate.x
    && Number(candidateAttempts.at(-1)?.candidate?.y) === candidate.y
    && Number(candidateAttempts.at(-1)?.candidate?.z) === candidate.z
    && (manifest.invalidLocationWalkmeshCandidateSaveTransportReconciliationAttempts?.length ?? 0) === 1
    && saveTransportAttempt?.mode === "confirm_committed_wok_candidate_then_retry_only_the_corrected_asynchronous_native_save_transport"
    && (manifest.invalidLocationAdjustLocationEnChangeReconciliationAttempts?.length ?? 0) === (resumeRenderedAtomFailure ? 1 : 0)
    && (!resumeRenderedAtomFailure || manifest.invalidLocationAdjustLocationEnChangeReconciliationAttempts?.at(-1)?.mode === "resume_the_exact_open_location_dialog_with_documented_en_change_then_verify_reopen_before_save")
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_en_change_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: resumeRenderedAtomFailure ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-en-change-render" : "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-en-change", mode: "dry-run", status: resumeRenderedAtomFailure ? "authorized_for_invalid_location_adjust_location_en_change_render_reconcile" : "authorized_for_invalid_location_adjust_location_en_change_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate, requires: [resumeRenderedAtomFailure ? "one prior en-change continuation which failed before any Toolset message due to the exact PowerShell InvalidVariableReferenceWithDrive rendering error" : "the saved transport continuation proved the reopened native dialog retained the original coordinates, demonstrating that text-only SetWindowText had not committed the object change", "one responsive dirty module frame and one exact pre-existing TdlgLocation / Adjust Location modal with the documented original fields", "set only the previously-derived retail WOK candidate and send documented EN_CHANGE WM_COMMAND notifications to the exact dialog parent", "commit with exact OK, reopen Adjust Location to confirm the instance retained the candidate, then Cancel without another mutation", "one corrected asynchronous native Save and GIT/IFO readback only if accepted"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const locationDialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className));
  const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || locationDialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_en_change_live_preflight_unverified:${JSON.stringify({ windows, frames, locationDialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-en-change-continuation/v1", candidate, preflight: { windows, locationBefore }, mode: resumeRenderedAtomFailure ? "resume_exact_open_location_dialog_after_pre_toolset_en_change_atom_render_fix" : "resume_the_exact_open_location_dialog_with_documented_en_change_then_verify_reopen_before_save" };
  manifest.invalidLocationAdjustLocationEnChangeReconciliationAttempts = [...(manifest.invalidLocationAdjustLocationEnChangeReconciliationAttempts ?? []), attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, positionEditNotification: "WM_COMMAND/EN_CHANGE" };
  writeJson(manifestPath, manifest);
  try {
    attempt.setLocation = runAtom("set-aurora-toolset-adjust-location-fields-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(candidate.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(candidate.y, locationBefore.fields[1].text), "--z", formatLocationCoordinate(candidate.z, locationBefore.fields[2].text)]);
    if (attempt.setLocation.processId !== windows.processId || attempt.setLocation.notifications?.length !== 3 || attempt.setLocation.notifications.some((notification) => notification.code !== "EN_CHANGE")) throw new Error(`bootstrap_invalid_location_adjust_location_en_change_notification_unverified:${JSON.stringify(attempt.setLocation)}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_en_change_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_en_change_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationCoordinates(attempt.locationReadback.fields ?? [], candidate)) throw new Error(`bootstrap_invalid_location_adjust_location_en_change_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, candidate })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
    const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_en_change_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-en-change", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationApply(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_adjust_location_apply_manifest_missing");
  const manifest = readJson(manifestPath);
  const xy = { x: 18.6667, y: 15.6667 };
  const source = { x: 5.57, y: 14.53, z: 3.2 };
  const candidateAttempts = manifest.invalidLocationWalkmeshCandidateReconciliationAttempts ?? [];
  const enChangeAttempts = manifest.invalidLocationAdjustLocationEnChangeReconciliationAttempts ?? [];
  const expectedFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_en_change_reopen_readback_mismatch:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_create_failed"
    && manifest.failureCode === "unclassified"
    && expectedFailure
    && candidateAttempts.length === 2
    && Number(candidateAttempts.at(-1)?.candidate?.x) === xy.x
    && Number(candidateAttempts.at(-1)?.candidate?.y) === xy.y
    && (manifest.invalidLocationWalkmeshCandidateSaveTransportReconciliationAttempts?.length ?? 0) === 1
    && enChangeAttempts.length === 2
    && enChangeAttempts.at(-1)?.mode === "resume_exact_open_location_dialog_after_pre_toolset_en_change_atom_render_fix"
    && enChangeAttempts.at(-1)?.setLocation?.notifications?.length === 3
    && enChangeAttempts.at(-1)?.commitLocation?.buttonText === "OK"
    && (manifest.invalidLocationAdjustLocationApplyReconciliationAttempts?.length ?? 0) === 0
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_apply_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-apply", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_apply_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["two exact prior en-change attempts with a post-OK reopen proving the object still retained its original coordinates", "one responsive dirty module frame and one exact pre-existing TdlgLocation / Adjust Location modal with the documented original fields", "set only the retail WOK-derived X/Y candidate while preserving the native Z field", "press the dialog's exact Apply button before OK, then re-open Adjust Location to prove the instance retained the X/Y change", "one corrected asynchronous native Save and GIT/IFO readback only if accepted"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const locationDialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className));
  const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (windows.responding !== true || frames.length !== 1 || locationDialogs.length !== 1 || unexpected.length !== 0 || area.width !== 2 || area.height !== 2 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_apply_live_preflight_unverified:${JSON.stringify({ windows, frames, locationDialogs, unexpected, locationBefore, area, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-apply-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore, area }, mode: "set_only_xy_then_native_apply_ok_and_reopen_readback_before_save" };
  manifest.invalidLocationAdjustLocationApplyReconciliationAttempts = [attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, applyBeforeOk: true, preservesNativeZ: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.setLocation = runAtom("set-aurora-toolset-adjust-location-fields-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text), "--z", locationBefore.fields[2].text]);
    if (attempt.setLocation.processId !== windows.processId || attempt.setLocation.notifications?.length !== 3 || attempt.setLocation.notifications.some((notification) => notification.code !== "EN_CHANGE")) throw new Error(`bootstrap_invalid_location_adjust_location_apply_notification_unverified:${JSON.stringify(attempt.setLocation)}`);
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]);
    attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy)) throw new Error(`bootstrap_invalid_location_adjust_location_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_apply_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_apply_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy)) throw new Error(`bootstrap_invalid_location_adjust_location_apply_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
    const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_apply_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-apply", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationReplace(declaration, declarationPath, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_invalid_location_adjust_location_replace_manifest_missing");
  const manifest = readJson(manifestPath);
  const xy = { x: 18.6667, y: 15.6667 };
  const source = { x: 5.57, y: 14.53, z: 3.2 };
  const candidateAttempts = manifest.invalidLocationWalkmeshCandidateReconciliationAttempts ?? [];
  const applyAttempt = manifest.invalidLocationAdjustLocationApplyReconciliationAttempts?.at(-1);
  const expectedFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_apply_reopen_readback_mismatch:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed"
    && manifest.blockerCode === "bootstrap_create_failed"
    && manifest.failureCode === "unclassified"
    && expectedFailure
    && candidateAttempts.length === 2
    && Number(candidateAttempts.at(-1)?.candidate?.x) === xy.x
    && Number(candidateAttempts.at(-1)?.candidate?.y) === xy.y
    && (manifest.invalidLocationWalkmeshCandidateSaveTransportReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationAdjustLocationEnChangeReconciliationAttempts?.length ?? 0) === 2
    && (manifest.invalidLocationAdjustLocationApplyReconciliationAttempts?.length ?? 0) === 1
    && applyAttempt?.mode === "set_only_xy_then_native_apply_ok_and_reopen_readback_before_save"
    && applyAttempt?.applyLocation?.buttonText === "Apply"
    && (manifest.invalidLocationAdjustLocationReplaceReconciliationAttempts?.length ?? 0) === 0
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256)
    && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_replace_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-replace", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_replace_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["the exact Apply route visibly changed fields but a reopen proved text-only updates had not reached the selected instance", "one responsive dirty module frame and one exact pre-existing TdlgLocation / Adjust Location modal with the documented original fields", "use the accepted AUR-S02-03 edit transport, EM_SETSEL plus EM_REPLACESEL, on the validated position edits only", "preserve native Z, press exact Apply then OK, and re-open Adjust Location to prove the selected instance retained the X/Y change", "one corrected asynchronous native Save and GIT/IFO readback only if accepted"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const locationDialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className));
  const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (windows.responding !== true || frames.length !== 1 || locationDialogs.length !== 1 || unexpected.length !== 0 || area.width !== 2 || area.height !== 2 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_replace_live_preflight_unverified:${JSON.stringify({ windows, frames, locationDialogs, unexpected, locationBefore, area, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-replace-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore, area }, mode: "accepted_aur_s02_03_em_setsel_em_replacesel_then_apply_ok_and_reopen_readback_before_save" };
  manifest.invalidLocationAdjustLocationReplaceReconciliationAttempts = [attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "EM_SETSEL+EM_REPLACESEL", applyBeforeOk: true, preservesNativeZ: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.replaceLocation = runAtom("replace-aurora-toolset-adjust-location-fields-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text), "--z", locationBefore.fields[2].text]);
    if (attempt.replaceLocation.processId !== windows.processId || !sameLocationXY(attempt.replaceLocation.after ?? [], xy)) throw new Error(`bootstrap_invalid_location_adjust_location_replace_readback_unverified:${JSON.stringify(attempt.replaceLocation)}`);
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]);
    attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy)) throw new Error(`bootstrap_invalid_location_adjust_location_replace_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_replace_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_replace_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy)) throw new Error(`bootstrap_invalid_location_adjust_location_replace_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
    const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_replace_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-replace", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error;
  }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationNativeChar(declaration, declarationPath, outDir, resumeAtomRenderFailure = false) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath);
  const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 };
  const replaceAttempt = manifest.invalidLocationAdjustLocationReplaceReconciliationAttempts?.at(-1);
  const nativeCharAttempts = manifest.invalidLocationAdjustLocationNativeCharReconciliationAttempts ?? [];
  const replaceTransportFailure = String(manifest.error ?? "").includes("replace-aurora-toolset-adjust-location-fields-no-global-input.mjs") && String(manifest.error ?? "").includes("replace_failed:5,57");
  const charAtomRenderFailure = String(manifest.error ?? "").includes("type-aurora-toolset-adjust-location-xy-no-global-input.mjs") && String(manifest.error ?? "").includes("Add-Type") && String(manifest.error ?? "").includes("LocationChar");
  const firstNativeCharAttempt = !resumeAtomRenderFailure && nativeCharAttempts.length === 0 && replaceTransportFailure;
  const resumeNativeCharAtomRender = resumeAtomRenderFailure && nativeCharAttempts.length === 1 && nativeCharAttempts[0]?.mode === "targeted_wm_char_xy_then_apply_ok_and_reopen_readback_before_save" && charAtomRenderFailure;
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && (firstNativeCharAttempt || resumeNativeCharAtomRender)
    && (manifest.invalidLocationWalkmeshCandidateReconciliationAttempts?.length ?? 0) === 2
    && (manifest.invalidLocationWalkmeshCandidateSaveTransportReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationAdjustLocationEnChangeReconciliationAttempts?.length ?? 0) === 2
    && (manifest.invalidLocationAdjustLocationApplyReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationAdjustLocationReplaceReconciliationAttempts?.length ?? 0) === 1
    && replaceAttempt?.mode === "accepted_aur_s02_03_em_setsel_em_replacesel_then_apply_ok_and_reopen_readback_before_save"
    && Number(replaceAttempt?.candidate?.x) === xy.x && Number(replaceAttempt?.candidate?.y) === xy.y
    && nativeCharAttempts.length === (resumeAtomRenderFailure ? 1 : 0)
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error(resumeAtomRenderFailure ? "bootstrap_invalid_location_adjust_location_native_char_render_not_authorized_for_state" : "bootstrap_invalid_location_adjust_location_native_char_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: resumeAtomRenderFailure ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-native-char-render" : "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-native-char", mode: "dry-run", status: resumeAtomRenderFailure ? "authorized_for_invalid_location_adjust_location_native_char_render_reconcile" : "authorized_for_invalid_location_adjust_location_native_char_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: [resumeAtomRenderFailure ? "the prior native-char route failed before any Toolset message because the generated interop struct had an invalid C# member/type-name collision" : "the exact pointer-based EM_REPLACESEL transport failed before any module mutation because its string LPARAM is not cross-process-marshalled", "one responsive dirty module frame and one exact pre-existing TdlgLocation / Adjust Location modal with the documented original fields", "set only X/Y through the target edit controls' native WM_CHAR path, which emits the standard edit notification without global input", "preserve native Z, press exact Apply then OK, and re-open Adjust Location to prove the selected instance retained the X/Y change", "one corrected asynchronous native Save and GIT/IFO readback only if accepted"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const locationDialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className));
  const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (windows.responding !== true || frames.length !== 1 || locationDialogs.length !== 1 || unexpected.length !== 0 || area.width !== 2 || area.height !== 2 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_native_char_live_preflight_unverified:${JSON.stringify({ windows, frames, locationDialogs, unexpected, locationBefore, area, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-native-char-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore, area }, mode: "targeted_wm_char_xy_then_apply_ok_and_reopen_readback_before_save" };
  manifest.invalidLocationAdjustLocationNativeCharReconciliationAttempts = [...nativeCharAttempts, attempt]; manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "EM_SETSEL+WM_CLEAR+targeted_WM_CHAR", applyBeforeOk: true, preservesNativeZ: true };
  writeJson(manifestPath, manifest);
  try {
    attempt.typeLocation = runAtom("type-aurora-toolset-adjust-location-xy-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.typeLocation.processId !== windows.processId || !sameLocationXY(attempt.typeLocation.after ?? [], xy) || String(attempt.typeLocation.after?.[2]) !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_native_char_readback_unverified:${JSON.stringify(attempt.typeLocation)}`);
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]);
    attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_native_char_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_native_char_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_native_char_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_native_char_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
    const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_native_char_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest);
    print({ ok: true, command: resumeAtomRenderFailure ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-native-char-render" : "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-native-char", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDown(declaration, declarationPath, outDir, resumeAtomRenderFailure = false) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath);
  const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 };
  const nativeCharAttempts = manifest.invalidLocationAdjustLocationNativeCharReconciliationAttempts ?? [];
  const upDownAttempts = manifest.invalidLocationAdjustLocationUpDownReconciliationAttempts ?? [];
  const nativeCharFailure = String(manifest.error ?? "").includes("type-aurora-toolset-adjust-location-xy-no-global-input.mjs") && String(manifest.error ?? "").includes("native_char_readback_mismatch");
  const upDownAtomRenderFailure = String(manifest.error ?? "").includes("set-aurora-toolset-adjust-location-position-updown-no-global-input.mjs") && String(manifest.error ?? "").includes("ConvertToFinalInvalidCastException");
  const firstUpDownAttempt = !resumeAtomRenderFailure && upDownAttempts.length === 0 && nativeCharFailure;
  const resumeUpDownAtomRender = resumeAtomRenderFailure && upDownAttempts.length === 1 && upDownAttempts[0]?.mode === "validated_position_tupdown_udm_setpos32_xy_then_apply_ok_and_reopen_readback_before_save" && upDownAtomRenderFailure;
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1"
    && manifest.declarationSha256 === sha256FileText(declaration)
    && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && (firstUpDownAttempt || resumeUpDownAtomRender)
    && (manifest.invalidLocationWalkmeshCandidateReconciliationAttempts?.length ?? 0) === 2
    && (manifest.invalidLocationWalkmeshCandidateSaveTransportReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationAdjustLocationEnChangeReconciliationAttempts?.length ?? 0) === 2
    && (manifest.invalidLocationAdjustLocationApplyReconciliationAttempts?.length ?? 0) === 1
    && (manifest.invalidLocationAdjustLocationReplaceReconciliationAttempts?.length ?? 0) === 1
    && nativeCharAttempts.length === 2 && nativeCharAttempts.at(-1)?.mode === "targeted_wm_char_xy_then_apply_ok_and_reopen_readback_before_save"
    && upDownAttempts.length === (resumeAtomRenderFailure ? 1 : 0)
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref))
    && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error(resumeAtomRenderFailure ? "bootstrap_invalid_location_adjust_location_updown_render_not_authorized_for_state" : "bootstrap_invalid_location_adjust_location_updown_not_authorized_for_state");
  if (options.dryRun === "true") {
    print({ ok: true, command: resumeAtomRenderFailure ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-render" : "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown", mode: "dry-run", status: resumeAtomRenderFailure ? "authorized_for_invalid_location_adjust_location_updown_render_reconcile" : "authorized_for_invalid_location_adjust_location_updown_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: [resumeAtomRenderFailure ? "the prior UDM_SETPOS32 route failed before any Toolset message because PowerShell parsed the numeric helper arguments as an array" : "the native edit control accepts neither cross-process pointer replacement nor targeted character messages despite being enabled and non-readonly", "read-only inspection proves X/Y/Z are backed by exact TUpDown positions 557/1453/320 (hundredths) in the Position group", "set only the validated X/Y TUpDown positions to 1867/1567 through UDM_SETPOS32 and require both TEdit and TUpDown readback", "if the VCL position handler does not bridge to the edit text, cancel the dialog and prove no mutation before stopping this lane", "otherwise Apply, OK, reopen exact Adjust Location, then one corrected asynchronous Save and GIT/IFO readback"] });
    return;
  }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const locationDialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className));
  const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (windows.responding !== true || frames.length !== 1 || locationDialogs.length !== 1 || unexpected.length !== 0 || area.width !== 2 || area.height !== 2 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_live_preflight_unverified:${JSON.stringify({ windows, frames, locationDialogs, unexpected, locationBefore, area, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-updown-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore, area }, mode: "validated_position_tupdown_udm_setpos32_xy_then_apply_ok_and_reopen_readback_before_save" };
  manifest.invalidLocationAdjustLocationUpDownReconciliationAttempts = [...upDownAttempts, attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "validated_Position_TUpDown_UDM_SETPOS32", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.setPosition = runAtom("set-aurora-toolset-adjust-location-position-updown-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.setPosition.processId !== windows.processId) throw new Error(`bootstrap_invalid_location_adjust_location_updown_process_unverified:${JSON.stringify(attempt.setPosition)}`);
    if (attempt.setPosition.uiMatchesCandidate !== true) {
      attempt.cancelUnbridgedPosition = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
      attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
      const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
      if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`);
      attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
      attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
      if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`);
      throw new Error(`bootstrap_invalid_location_adjust_location_updown_text_bridge_missing:${JSON.stringify({ setPosition: attempt.setPosition, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`);
    }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_updown_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_updown_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest);
    print({ ok: true, command: resumeAtomRenderFailure ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-render" : "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownClickProbe(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const source = { x: 5.57, y: 14.53, z: 3.2 };
  const upDownAttempts = manifest.invalidLocationAdjustLocationUpDownReconciliationAttempts ?? [];
  const expectedFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_updown_text_bridge_missing:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && expectedFailure
    && upDownAttempts.length === 2 && upDownAttempts.at(-1)?.mode === "validated_position_tupdown_udm_setpos32_xy_then_apply_ok_and_reopen_readback_before_save"
    && (manifest.invalidLocationAdjustLocationUpDownClickProbeAttempts?.length ?? 0) === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_updown_click_probe_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-click-probe", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_updown_click_probe", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, expectedDelta: { x: "+0.01", y: "0", z: "0" }, requires: ["the programmatic TUpDown position changed but did not bridge to the TEdit/model", "one exact targeted native top-arrow click on X only, then exact text/position readback", "Cancel and exact source-coordinate reopen readback regardless of the probe result", "no Save, HAK retry, appearance replay, creature placement replay, or runtime action"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_click_probe_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-updown-click-probe/v1", preflight: { windows, locationBefore }, mode: "one_targeted_position_x_up_arrow_then_cancel_and_source_reopen_readback" }; manifest.invalidLocationAdjustLocationUpDownClickProbeAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, clickProbeRollback: "Cancel+source-reopen-readback" }; writeJson(manifestPath, manifest);
  try {
    attempt.step = runAtom("step-aurora-toolset-adjust-location-position-updown-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--xSteps", "1", "--ySteps", "0"]);
    attempt.cancel = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_click_probe_context_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadback.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_click_probe_source_readback_unverified:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.sourceReadback.fields, source })}`);
    if (attempt.step.processId !== windows.processId || attempt.step.exactDelta !== true || attempt.step.after?.text?.[0] !== "5,58" || Number(attempt.step.after?.position?.[0]) !== 558) throw new Error(`bootstrap_invalid_location_adjust_location_updown_click_probe_failed:${JSON.stringify({ step: attempt.step, sourceReadback: attempt.sourceReadback })}`);
    throw new Error(`bootstrap_invalid_location_adjust_location_updown_click_probe_succeeded:${JSON.stringify({ step: attempt.step, sourceReadback: attempt.sourceReadback })}`);
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationSynchronized(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 };
  const upDownAttempts = manifest.invalidLocationAdjustLocationUpDownReconciliationAttempts ?? []; const clickProbeAttempts = manifest.invalidLocationAdjustLocationUpDownClickProbeAttempts ?? [];
  const expectedFailure = String(manifest.error ?? "").includes("step-aurora-toolset-adjust-location-position-updown-no-global-input.mjs") && String(manifest.error ?? "").includes("op_Addition");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && expectedFailure
    && upDownAttempts.length === 2 && clickProbeAttempts.length === 1 && clickProbeAttempts[0]?.mode === "one_targeted_position_x_up_arrow_then_cancel_and_source_reopen_readback" && (manifest.invalidLocationAdjustLocationSynchronizedReconciliationAttempts?.length ?? 0) === 0
    && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_synchronized_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-synchronized", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_synchronized_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["standalone TEdit and TUpDown updates each produced only half of the dialog's state", "synchronize the exact X/Y TEdit texts plus their matching TUpDown hundredths positions, with EN_CHANGE to the validated dialog parent", "require both fields and both spinners to read back 18,67/15,67 and 1867/1567 while Z remains 3,20/320", "if synchronized state is not achieved, Cancel and exact source-coordinate reopen readback before stopping", "otherwise Apply, OK, reopen exact Adjust Location, then one corrected asynchronous Save and GIT/IFO readback"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-synchronized-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "synchronize_tedit_en_change_and_tupdown_xy_then_apply_ok_and_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationSynchronizedReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "TEdit_WM_SETTEXT+EN_CHANGE_and_matched_TUpDown_UDM_SETPOS32", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.synchronize = runAtom("synchronize-aurora-toolset-adjust-location-xy-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.synchronize.processId !== windows.processId) throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_process_unverified:${JSON.stringify(attempt.synchronize)}`);
    if (attempt.synchronize.uiSynchronized !== true) {
      attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
      if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`);
      attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
      if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`);
      throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_state_missing:${JSON.stringify({ synchronize: attempt.synchronize, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`);
    }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_synchronized_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-synchronized", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationClickType(declaration, declarationPath, outDir, resumeAtomRenderFailure = false, resumeRemoteMarshal = false, resumeRemoteRender = false) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 };
  const synchronizedAttempts = manifest.invalidLocationAdjustLocationSynchronizedReconciliationAttempts ?? []; const clickTypeAttempts = manifest.invalidLocationAdjustLocationClickTypeReconciliationAttempts ?? []; const synchronizedFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_synchronized_reopen_readback_mismatch:"); const atomRenderFailure = String(manifest.error ?? "").includes("click-type-aurora-toolset-adjust-location-xy-no-global-input.mjs") && String(manifest.error ?? "").includes("gui_thread_info_failed"); const remoteMarshalFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_click_type_state_missing:"); const remoteRenderFailure = String(manifest.error ?? "").includes("click-type-aurora-toolset-adjust-location-xy-no-global-input.mjs") && String(manifest.error ?? "").includes("ConvertToFinalInvalidCastException"); const firstClickType = !resumeAtomRenderFailure && !resumeRemoteMarshal && !resumeRemoteRender && clickTypeAttempts.length === 0 && synchronizedFailure; const resumeClickType = resumeAtomRenderFailure && clickTypeAttempts.length === 1 && clickTypeAttempts[0]?.mode === "targeted_tedit_click_focus_readback_then_native_char_xy_apply_ok_and_reopen_readback_before_save" && atomRenderFailure; const resumeClickTypeRemote = resumeRemoteMarshal && clickTypeAttempts.length === 2 && clickTypeAttempts.at(-1)?.mode === "targeted_tedit_click_focus_readback_then_native_char_xy_apply_ok_and_reopen_readback_before_save" && remoteMarshalFailure; const resumeClickTypeRemoteRender = resumeRemoteRender && clickTypeAttempts.length === 3 && clickTypeAttempts.at(-1)?.mode === "targeted_tedit_click_focus_readback_then_native_char_xy_apply_ok_and_reopen_readback_before_save" && remoteRenderFailure;
  const expectedAttemptCount = resumeRemoteRender ? 3 : resumeRemoteMarshal ? 2 : resumeAtomRenderFailure ? 1 : 0; const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && (firstClickType || resumeClickType || resumeClickTypeRemote || resumeClickTypeRemoteRender) && synchronizedAttempts.length === 1 && synchronizedAttempts[0]?.mode === "synchronize_tedit_en_change_and_tupdown_xy_then_apply_ok_and_reopen_readback_before_save" && clickTypeAttempts.length === expectedAttemptCount && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error(resumeRemoteRender ? "bootstrap_invalid_location_adjust_location_click_type_remote_render_not_authorized_for_state" : resumeRemoteMarshal ? "bootstrap_invalid_location_adjust_location_click_type_remote_not_authorized_for_state" : resumeAtomRenderFailure ? "bootstrap_invalid_location_adjust_location_click_type_render_not_authorized_for_state" : "bootstrap_invalid_location_adjust_location_click_type_not_authorized_for_state");
  if (options.dryRun === "true") { const routeCommand = resumeRemoteRender ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type-remote-render" : resumeRemoteMarshal ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type-remote" : resumeAtomRenderFailure ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type-render" : "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type"; const routeStatus = resumeRemoteRender ? "authorized_for_invalid_location_adjust_location_click_type_remote_render_reconcile" : resumeRemoteMarshal ? "authorized_for_invalid_location_adjust_location_click_type_remote_reconcile" : resumeAtomRenderFailure ? "authorized_for_invalid_location_adjust_location_click_type_render_reconcile" : "authorized_for_invalid_location_adjust_location_click_type_reconcile"; print({ ok: true, command: routeCommand, mode: "dry-run", status: routeStatus, startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: [resumeRemoteRender ? "the exact remote-memory text bridge stopped before allocation because its byte length was not converted to UIntPtr" : resumeRemoteMarshal ? "the real focused edit path updated only the spinner because EM_REPLACESEL carried a string pointer from the wrong process" : resumeAtomRenderFailure ? "the prior focus-readback attempt stopped before typing because GUITHREADINFO omitted hwndCaret and Windows rejected its size" : "the synchronized visible state reverted because the edit controls had not received their native focus event", "for each exact X/Y position TEdit, dispatch only a targeted client-area click and require same-Toolset-thread focus readback before typed characters", "replace selected text through a UTF-16 buffer allocated in the Toolset process", "require text and TUpDown positions to read candidate while Z remains unchanged", "if focus/state is not achieved, Cancel and exact source-coordinate reopen readback before stopping", "otherwise Apply, OK, reopen exact Adjust Location, then one corrected asynchronous Save and GIT/IFO readback"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_click_type_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-click-type-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "targeted_tedit_click_focus_readback_then_native_char_xy_apply_ok_and_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationClickTypeReconciliationAttempts = [...clickTypeAttempts, attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "targeted_TEdit_click+same_thread_focus_readback+WM_CHAR", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.clickType = runAtom("click-type-aurora-toolset-adjust-location-xy-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.clickType.processId !== windows.processId) throw new Error(`bootstrap_invalid_location_adjust_location_click_type_process_unverified:${JSON.stringify(attempt.clickType)}`);
    if (attempt.clickType.uiMatchesCandidate !== true) {
      attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
      if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_click_type_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`);
      attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
      if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_click_type_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`);
      throw new Error(`bootstrap_invalid_location_adjust_location_click_type_state_missing:${JSON.stringify({ clickType: attempt.clickType, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`);
    }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_click_type_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_click_type_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_click_type_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_click_type_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_click_type_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest);
    print({ ok: true, command: resumeRemoteRender ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type-remote-render" : resumeRemoteMarshal ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type-remote" : resumeAtomRenderFailure ? "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type-render" : "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-click-type", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationNativeStep(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 }; const targetPositions = { x: 1867, y: 1567 };
  const clickTypeAttempts = manifest.invalidLocationAdjustLocationClickTypeReconciliationAttempts ?? []; const synchronizedAttempts = manifest.invalidLocationAdjustLocationSynchronizedReconciliationAttempts ?? []; const nativeStepAttempts = manifest.invalidLocationAdjustLocationNativeStepReconciliationAttempts ?? []; const nativeClickBridgeFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_click_type_state_missing:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && nativeClickBridgeFailure && synchronizedAttempts.length === 1 && synchronizedAttempts[0]?.mode === "synchronize_tedit_en_change_and_tupdown_xy_then_apply_ok_and_reopen_readback_before_save" && clickTypeAttempts.length === 4 && clickTypeAttempts.at(-1)?.mode === "targeted_tedit_click_focus_readback_then_native_char_xy_apply_ok_and_reopen_readback_before_save" && nativeStepAttempts.length === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_native_step_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-native-step", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_native_step_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requiredNativePositions: targetPositions, requires: ["the exact focus plus remote EM_REPLACESEL transport left both TEdit controls unchanged", "the next action is a bounded sequence of targeted top-arrow clicks on the validated X/Y Position TUpDown controls, never a synthetic UDM_SETPOS32", "require TEdit and TUpDown readback to agree on 18,67/15,67 and 1867/1567 while Z remains 3,20/320", "Apply, OK, exact dialog reopen, then one native Save with GIT/IFO readback", "on an unbridged native-click state, Cancel and prove exact source-coordinate reopen before stopping"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_native_step_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const currentPositions = locationBefore.fields.map((field) => Math.round(Number(String(field.text).replace(",", ".")) * 100)); const steps = { x: targetPositions.x - currentPositions[0], y: targetPositions.y - currentPositions[1] }; if (!Number.isInteger(steps.x) || !Number.isInteger(steps.y) || steps.x <= 0 || steps.y <= 0) throw new Error(`bootstrap_invalid_location_adjust_location_native_step_delta_unverified:${JSON.stringify({ currentPositions, targetPositions, steps })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-native-step-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, expectedNativePositions: targetPositions, steps, preflight: { windows, locationBefore }, mode: "validated_tupdown_native_top_arrow_steps_xy_then_apply_ok_and_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationNativeStepReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "validated_TUpDown_targeted_WM_LBUTTONDOWN_UP", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.step = runAtom("step-aurora-toolset-adjust-location-position-updown-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--xSteps", String(steps.x), "--ySteps", String(steps.y)]);
    if (attempt.step.processId !== windows.processId || attempt.step.exactDelta !== true) {
      attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_native_step_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`); attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_native_step_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`); throw new Error(`bootstrap_invalid_location_adjust_location_native_step_state_missing:${JSON.stringify({ step: attempt.step, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`);
    }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_native_step_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_native_step_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_native_step_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_native_step_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_native_step_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-native-step", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationFocusExit(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 }; const nativeStepAttempts = manifest.invalidLocationAdjustLocationNativeStepReconciliationAttempts ?? []; const focusExitAttempts = manifest.invalidLocationAdjustLocationFocusExitReconciliationAttempts ?? []; const nativeStepFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_native_step_state_missing:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && nativeStepFailure && nativeStepAttempts.length === 1 && nativeStepAttempts[0]?.mode === "validated_tupdown_native_top_arrow_steps_xy_then_apply_ok_and_reopen_readback_before_save" && focusExitAttempts.length === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_focus_exit_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-focus-exit", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_focus_exit_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["RCDATA for the retail TDLGLOCATION binds ePositionXExit and ePositionYExit, but not OnChange, so text-only transports cannot update the dialog object", "targeted X focus then WM_SETTEXT X then targeted Y focus invokes the native X Exit handler; repeat Y -> Z for the native Y Exit handler", "require candidate text readback while Z stays 3,20, then Apply, OK, and exact reopen readback before one native Save", "if either VCL focus/exit bridge is absent, Cancel and prove exact source-coordinate reopen before stopping"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-focus-exit-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "focused_tedit_wm_settext_then_native_onexit_xy_then_apply_ok_and_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationFocusExitReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "targeted_TEdit_focus_transitions+WM_SETTEXT+native_OnExit", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.focusExit = runAtom("focus-exit-aurora-toolset-adjust-location-xy-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.focusExit.processId !== windows.processId || attempt.focusExit.uiMatchesCandidate !== true) { attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`); attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`); throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_state_missing:${JSON.stringify({ focusExit: attempt.focusExit, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`); }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-focus-exit", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationFocusExitClientButtons(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 }; const focusExitAttempts = manifest.invalidLocationAdjustLocationFocusExitReconciliationAttempts ?? []; const clientButtonAttempts = manifest.invalidLocationAdjustLocationFocusExitClientButtonsReconciliationAttempts ?? []; const focusExitFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_focus_exit_reopen_readback_mismatch:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && focusExitFailure && focusExitAttempts.length === 1 && focusExitAttempts[0]?.mode === "focused_tedit_wm_settext_then_native_onexit_xy_then_apply_ok_and_reopen_readback_before_save" && clientButtonAttempts.length === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-focus-exit-client-buttons", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_focus_exit_client_buttons_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["the prior route proved that the native X/Y OnExit handlers stage 18,67/15,67 but a generic BM_CLICK close does not persist that staged state", "send targeted WM_LBUTTONDOWN/UP only to the exact enabled Apply then OK TButton client centres after class/title/text validation", "read candidate X/Y and preserved Z after Apply, reopen Adjust Location after OK, then Save and require native GIT readback", "if staging or Apply readback fails, Cancel and prove the source-coordinate reopen before stopping"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-focus-exit-client-buttons-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "focused_tedit_wm_settext_then_native_onexit_xy_then_targeted_client_apply_ok_and_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationFocusExitClientButtonsReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "targeted_TEdit_focus_transitions+WM_SETTEXT+native_OnExit", buttonTransport: "targeted_TButton_WM_LBUTTONDOWN_UP_client_centre", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.focusExit = runAtom("focus-exit-aurora-toolset-adjust-location-xy-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.focusExit.processId !== windows.processId || attempt.focusExit.uiMatchesCandidate !== true) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_stage_missing:${JSON.stringify(attempt.focusExit)}`);
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-client-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.applyLocation.processId !== windows.processId || !sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) { attempt.cancelAfterApplyMismatch = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`); attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`); throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_apply_ui_readback_mismatch:${JSON.stringify({ applyLocation: attempt.applyLocation, fields: attempt.afterApplyFields.fields, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`); }
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-client-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-focus-exit-client-buttons", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationFocusType(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 }; const clientButtonAttempts = manifest.invalidLocationAdjustLocationFocusExitClientButtonsReconciliationAttempts ?? []; const focusTypeAttempts = manifest.invalidLocationAdjustLocationFocusTypeReconciliationAttempts ?? []; const clientButtonFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_focus_exit_client_buttons_reopen_readback_mismatch:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && clientButtonFailure && clientButtonAttempts.length === 1 && clientButtonAttempts[0]?.mode === "focused_tedit_wm_settext_then_native_onexit_xy_then_targeted_client_apply_ok_and_reopen_readback_before_save" && focusTypeAttempts.length === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_focus_type_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-focus-type", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_focus_type_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["the actual Apply and OK button transports were both proven to reach the dialog, so the missing state is the edit-control mutation rather than the button transport", "focus each exact Position TEdit, clear it, then send targeted WM_KEYDOWN/WM_CHAR/WM_KEYUP for every character before moving focus to commit the preceding field", "read candidate X/Y and preserved Z after Apply, reopen Adjust Location after OK, then Save and require native GIT readback", "if native typing or Apply readback fails, Cancel and prove the source-coordinate reopen before stopping"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_focus_type_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-focus-type-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "focused_tedit_native_keydown_char_keyup_xy_then_apply_ok_and_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationFocusTypeReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "targeted_TEdit_focus+EM_SETSEL_WM_CLEAR+WM_KEYDOWN_CHAR_KEYUP+native_OnExit", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.focusType = runAtom("focus-type-aurora-toolset-adjust-location-xy-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.focusType.processId !== windows.processId || attempt.focusType.uiMatchesCandidate !== true) throw new Error(`bootstrap_invalid_location_adjust_location_focus_type_stage_missing:${JSON.stringify(attempt.focusType)}`);
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.applyLocation.processId !== windows.processId || !sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) { attempt.cancelAfterApplyMismatch = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_focus_type_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`); attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_focus_type_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`); throw new Error(`bootstrap_invalid_location_adjust_location_focus_type_apply_ui_readback_mismatch:${JSON.stringify({ applyLocation: attempt.applyLocation, fields: attempt.afterApplyFields.fields, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`); }
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_focus_type_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_focus_type_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_focus_type_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_focus_type_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-focus-type", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationCmExit(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 }; const focusTypeAttempts = manifest.invalidLocationAdjustLocationFocusTypeReconciliationAttempts ?? []; const cmExitAttempts = manifest.invalidLocationAdjustLocationCmExitReconciliationAttempts ?? []; const focusTypeFailure = String(manifest.error ?? "").includes("native_clear_readback_mismatch:index=0 text=5,57");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && focusTypeFailure && focusTypeAttempts.length === 1 && focusTypeAttempts[0]?.mode === "focused_tedit_native_keydown_char_keyup_xy_then_apply_ok_and_reopen_readback_before_save" && cmExitAttempts.length === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_cm_exit_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-cm-exit", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_cm_exit_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["Aurora decompilation identifies the Position state as ePositionX/Y/Z TEdit plus its paired TUpDown and dirty flag; ePosition exits parse the text and set the paired position", "after exact WM_SETTEXT, send VCL CM_EXIT (0xB01B) only to the matching exact TEdit, and require UDM_GETPOS 1867/1567/320 before Apply", "read candidate X/Y and preserved Z after Apply, reopen Adjust Location after OK, then Save and require native GIT readback", "if either paired TUpDown or dialog readback fails, Cancel and prove the source-coordinate reopen before stopping"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_cm_exit_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-cm-exit-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "tedit_wm_settext_then_vcl_cm_exit_to_pair_tupdown_and_dirty_flag_xy_then_apply_ok_and_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationCmExitReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "targeted_TEdit_WM_SETTEXT+VCL_CM_EXIT", requiresPairedUpDownReadback: true, applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.cmExit = runAtom("cm-exit-aurora-toolset-adjust-location-xy-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.cmExit.processId !== windows.processId || attempt.cmExit.stageMatchesCandidate !== true) { attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_cm_exit_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`); attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_cm_exit_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`); throw new Error(`bootstrap_invalid_location_adjust_location_cm_exit_state_missing:${JSON.stringify({ cmExit: attempt.cmExit, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`); }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.applyLocation.processId !== windows.processId || !sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_cm_exit_apply_ui_readback_mismatch:${JSON.stringify({ applyLocation: attempt.applyLocation, fields: attempt.afterApplyFields.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_cm_exit_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_cm_exit_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_cm_exit_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_cm_exit_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-cm-exit", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownNotify(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 };
  const focusTypeAttempts = manifest.invalidLocationAdjustLocationFocusTypeReconciliationAttempts ?? []; const cmExitAttempts = manifest.invalidLocationAdjustLocationCmExitReconciliationAttempts ?? []; const notifyAttempts = manifest.invalidLocationAdjustLocationUpDownNotifyReconciliationAttempts ?? []; const cmExitFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_cm_exit_state_missing:"); const notifySetupFailure = String(manifest.error ?? "").includes("notify-aurora-toolset-adjust-location-position-updown-no-global-input.mjs") && ((String(manifest.error ?? "").includes("Missing closing '}'") && String(manifest.error ?? "").includes("Variable reference is not valid")) || String(manifest.error ?? "").includes("ReferenceError: i is not defined") || String(manifest.error ?? "").includes("Cannot convert the \"20\" value of type \"System.Int32\" to type \"System.UIntPtr\"")); const initialNotify = cmExitFailure && notifyAttempts.length === 0; const retryAfterSetupFailure = notifySetupFailure && notifyAttempts.length === 1 && notifyAttempts[0]?.mode === "target_process_nmupdown_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save";
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && (initialNotify || retryAfterSetupFailure) && focusTypeAttempts.length === 1 && focusTypeAttempts[0]?.mode === "focused_tedit_native_keydown_char_keyup_xy_then_apply_ok_and_reopen_readback_before_save" && cmExitAttempts.length === 1 && cmExitAttempts[0]?.mode === "tedit_wm_settext_then_vcl_cm_exit_to_pair_tupdown_and_dirty_flag_xy_then_apply_ok_and_reopen_readback_before_save" && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_updown_notify_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-notify", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_updown_notify_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["read-only hierarchy proves that the three native Position TUpDown controls notify their exact TGroupBox parent", "Aurora decompilation proves udPositionX/YClick updates the matching text and dirty flag from its current TUpDown position", "for X and Y only, set the validated TUpDown to one hundredth before target, deliver a target-process NMUPDOWN UDN_DELTAPOS event to its exact native parent, then require candidate text and positions before Apply", "if handler state is absent, Cancel and prove exact source-coordinate reopen before stopping", "otherwise Apply, OK, reopen exact Adjust Location, then one Save and native GIT/IFO readback"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_notify_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-updown-notify-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "target_process_nmupdown_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationUpDownNotifyReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, remoteCodeInjection: false, locationEditTransport: "validated_Position_TUpDown_UDN_DELTAPOS_remote_struct", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.notify = runAtom("notify-aurora-toolset-adjust-location-position-updown-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.notify.processId !== windows.processId || attempt.notify.stageMatchesCandidate !== true) { attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_notify_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`); attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_notify_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`); throw new Error(`bootstrap_invalid_location_adjust_location_updown_notify_state_missing:${JSON.stringify({ notify: attempt.notify, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`); }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_updown_notify_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_notify_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_notify_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_updown_notify_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_notify_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-notify", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownKey(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 18.6667, y: 15.6667 }; const source = { x: 5.57, y: 14.53, z: 3.2 };
  const focusTypeAttempts = manifest.invalidLocationAdjustLocationFocusTypeReconciliationAttempts ?? []; const cmExitAttempts = manifest.invalidLocationAdjustLocationCmExitReconciliationAttempts ?? []; const notifyAttempts = manifest.invalidLocationAdjustLocationUpDownNotifyReconciliationAttempts ?? []; const keyAttempts = manifest.invalidLocationAdjustLocationUpDownKeyReconciliationAttempts ?? []; const notifyFailure = String(manifest.error ?? "").includes("notify-aurora-toolset-adjust-location-position-updown-no-global-input.mjs") && String(manifest.error ?? "").includes("wm_notify_timeout_or_failed:0:5");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && notifyFailure && focusTypeAttempts.length === 1 && focusTypeAttempts[0]?.mode === "focused_tedit_native_keydown_char_keyup_xy_then_apply_ok_and_reopen_readback_before_save" && cmExitAttempts.length === 1 && cmExitAttempts[0]?.mode === "tedit_wm_settext_then_vcl_cm_exit_to_pair_tupdown_and_dirty_flag_xy_then_apply_ok_and_reopen_readback_before_save" && notifyAttempts.length === 1 && notifyAttempts[0]?.mode === "target_process_nmupdown_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save" && keyAttempts.length === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_updown_key_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-key", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_updown_key_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["Windows blocks cross-process WM_NOTIFY on this workstation, so no notification retry is allowed", "MSAA exposes the native TUpDown as two arrows and its accSelect action places real focus on the associated TEdit", "for X and Y only, set the exact Position TUpDown to one hundredth before target, take MSAA focus, then dispatch targeted VK_UP keydown/keyup to invoke the Toolset's own OnEditUpDownKeyDown route", "require candidate text and native positions before Apply; otherwise Cancel and prove source-coordinate reopen", "on success Apply, OK, reopen exact Adjust Location, then one Save and native GIT/IFO readback"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-updown-key-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "msaa_focus_then_targeted_tedit_vk_up_xy_then_apply_ok_and_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationUpDownKeyReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, locationEditTransport: "MSAA_accSelect+targeted_TEdit_VK_UP", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.key = runAtom("key-aurora-toolset-adjust-location-position-updown-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.key.processId !== windows.processId || attempt.key.stageMatchesCandidate !== true) { attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`); attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`); throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_state_missing:${JSON.stringify({ key: attempt.key, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`); }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-key", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownKeyClickFocus(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  const manifest = readJson(manifestPath);
  const source = { x: 5.57, y: 14.53, z: 3.2 };
  const focusTypeAttempts = manifest.invalidLocationAdjustLocationFocusTypeReconciliationAttempts ?? [];
  const cmExitAttempts = manifest.invalidLocationAdjustLocationCmExitReconciliationAttempts ?? [];
  const notifyAttempts = manifest.invalidLocationAdjustLocationUpDownNotifyReconciliationAttempts ?? [];
  const keyAttempts = manifest.invalidLocationAdjustLocationUpDownKeyReconciliationAttempts ?? [];
  const clickFocusAttempts = manifest.invalidLocationAdjustLocationUpDownKeyClickFocusReconciliationAttempts ?? [];
  const keyFailure = String(manifest.error ?? "").includes("key-aurora-toolset-adjust-location-position-updown-no-global-input.mjs") && String(manifest.error ?? "").includes("accessibility_focus_mismatch:1:");
  const clickFocusDispatchFailure = String(manifest.error ?? "").includes("key-aurora-toolset-adjust-location-position-updown-no-global-input.mjs") && String(manifest.error ?? "").includes("focus_transport_mismatch:msaa:");
  const clickFocusEditKeyFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_updown_key_click_focus_state_missing:");
  const firstClickFocus = keyFailure && clickFocusAttempts.length === 0;
  const correctedClickFocusDispatch = clickFocusDispatchFailure && clickFocusAttempts.length === 1 && clickFocusAttempts[0]?.mode === "targeted_exact_tedit_click_focus_then_targeted_tedit_vk_up_xy_then_apply_ok_and_reopen_readback_before_save";
  const controlKeyRetry = clickFocusEditKeyFailure && clickFocusAttempts.length === 2 && clickFocusAttempts.at(-1)?.mode === "targeted_exact_tedit_click_focus_then_targeted_tedit_vk_up_xy_then_apply_ok_and_reopen_readback_before_save";
  const hscrollRetry = clickFocusEditKeyFailure && clickFocusAttempts.length === 3 && clickFocusAttempts.at(-1)?.mode === "targeted_exact_tedit_click_focus_then_targeted_tupdown_extended_vk_up_xy_then_apply_ok_and_reopen_readback_before_save";
  const postMouseRetry = clickFocusEditKeyFailure && clickFocusAttempts.length === 4 && clickFocusAttempts.at(-1)?.mode === "targeted_exact_tedit_click_focus_then_targeted_tdlgLocation_wm_hscroll_lineup_xy_then_apply_ok_and_reopen_readback_before_save";
  const msaaDefaultRetry = clickFocusEditKeyFailure && clickFocusAttempts.length === 5 && clickFocusAttempts.at(-1)?.mode === "targeted_exact_tedit_click_focus_then_posted_tupdown_top_arrow_xy_then_apply_ok_and_reopen_readback_before_save";
  const cnNotifyRetry = clickFocusEditKeyFailure && clickFocusAttempts.length === 6 && clickFocusAttempts.at(-1)?.mode === "targeted_exact_tedit_click_focus_then_msaa_default_top_arrow_xy_then_apply_ok_and_reopen_readback_before_save";
  const cnNotifyPropertyBindingFailure = String(manifest.error ?? "").includes("updown_vcl_object_missing");
  const cnNotifyPropertyBindingRetry = (clickFocusEditKeyFailure || cnNotifyPropertyBindingFailure) && clickFocusAttempts.length === 7 && clickFocusAttempts.at(-1)?.mode === "targeted_exact_tedit_click_focus_then_vcl_cn_notify_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save";
  const vscrollViewportCenterRetry = clickFocusEditKeyFailure && clickFocusAttempts.length === 8 && clickFocusAttempts.at(-1)?.mode === "targeted_exact_tedit_click_focus_then_vcl_cn_notify_property_binding_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save";
  const xy = vscrollViewportCenterRetry ? { x: 10, y: 10 } : { x: 18.6667, y: 15.6667 };
  const useUpDownKeyTarget = controlKeyRetry;
  const useHScrollParent = hscrollRetry;
  const usePostMouseTop = postMouseRetry;
  const useMsaaDefaultTop = msaaDefaultRetry;
  const useCnNotifyControl = cnNotifyRetry || cnNotifyPropertyBindingRetry;
  const useVScrollPositionParent = vscrollViewportCenterRetry;
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && (firstClickFocus || correctedClickFocusDispatch || controlKeyRetry || hscrollRetry || postMouseRetry || msaaDefaultRetry || cnNotifyRetry || cnNotifyPropertyBindingRetry || vscrollViewportCenterRetry) && focusTypeAttempts.length === 1 && focusTypeAttempts[0]?.mode === "focused_tedit_native_keydown_char_keyup_xy_then_apply_ok_and_reopen_readback_before_save" && cmExitAttempts.length === 1 && cmExitAttempts[0]?.mode === "tedit_wm_settext_then_vcl_cm_exit_to_pair_tupdown_and_dirty_flag_xy_then_apply_ok_and_reopen_readback_before_save" && notifyAttempts.length === 1 && notifyAttempts[0]?.mode === "target_process_nmupdown_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save" && keyAttempts.length === 1 && keyAttempts[0]?.mode === "msaa_focus_then_targeted_tedit_vk_up_xy_then_apply_ok_and_reopen_readback_before_save" && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_updown_key_click_focus_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-key-click-focus", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_updown_key_click_focus_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: useVScrollPositionParent ? ["the corrected VCL CN_NOTIFY property binding route changed only native spinner positions and was cancelled back to source", "the owner requested the mathematical Tiny-area viewport centre X=10.00/Y=10.00", "set each paired TUpDown to one hundredth before target, then send exactly WM_VSCROLL/SB_LINEUP to its validated Position-group parent", "require candidate text and paired positions before Apply; otherwise Cancel and prove source-coordinate reopen", "on success Apply, OK, reopen exact Adjust Location, then one Save and native GIT/IFO readback"] : ["the previous MSAA attempt returned X focus for the Y row and was cancelled back to source", "first acquire and read back exact TEdit focus through targeted client WM_LBUTTONDOWN/UP", "only after exact focus set each paired TUpDown to one hundredth before target, then dispatch targeted VK_UP keydown/keyup", "require candidate text and paired positions before Apply; otherwise Cancel and prove source-coordinate reopen", "on success Apply, OK, reopen exact Adjust Location, then one Save and native GIT/IFO readback"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`;
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
  const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location");
  const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className));
  const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_click_focus_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: useVScrollPositionParent ? "aurora-invalid-location-adjust-location-viewport-centre-vscroll-position-parent-continuation/v1" : "aurora-invalid-location-adjust-location-updown-key-click-focus-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: useVScrollPositionParent ? "targeted_exact_tedit_click_focus_then_validated_position_group_wm_vscroll_lineup_viewport_center_xy_then_apply_ok_and_reopen_readback_before_save" : cnNotifyPropertyBindingRetry ? "targeted_exact_tedit_click_focus_then_vcl_cn_notify_property_binding_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save" : useCnNotifyControl ? "targeted_exact_tedit_click_focus_then_vcl_cn_notify_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save" : useMsaaDefaultTop ? "targeted_exact_tedit_click_focus_then_msaa_default_top_arrow_xy_then_apply_ok_and_reopen_readback_before_save" : usePostMouseTop ? "targeted_exact_tedit_click_focus_then_posted_tupdown_top_arrow_xy_then_apply_ok_and_reopen_readback_before_save" : useHScrollParent ? "targeted_exact_tedit_click_focus_then_targeted_tdlgLocation_wm_hscroll_lineup_xy_then_apply_ok_and_reopen_readback_before_save" : useUpDownKeyTarget ? "targeted_exact_tedit_click_focus_then_targeted_tupdown_extended_vk_up_xy_then_apply_ok_and_reopen_readback_before_save" : "targeted_exact_tedit_click_focus_then_targeted_tedit_vk_up_xy_then_apply_ok_and_reopen_readback_before_save" };
  manifest.invalidLocationAdjustLocationUpDownKeyClickFocusReconciliationAttempts = [...clickFocusAttempts, attempt];
  manifest.status = "recovering";
  manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, remoteCodeInjection: false, locationEditTransport: useVScrollPositionParent ? "targeted_TEdit_client_click+validated_Position_TGroupBox_WM_VSCROLL_SB_LINEUP" : cnNotifyPropertyBindingRetry ? "targeted_TEdit_client_click+VCL_CN_NOTIFY_property_bound_TUpDown_remote_NMUPDOWN_data_only" : useCnNotifyControl ? "targeted_TEdit_client_click+VCL_CN_NOTIFY_remote_NMUPDOWN_data_only" : useMsaaDefaultTop ? "targeted_TEdit_client_click+IAccessible_accDoDefaultAction_TUpDown_top_arrow" : usePostMouseTop ? "targeted_TEdit_client_click+posted_TUpDown_top_arrow" : useHScrollParent ? "targeted_TEdit_client_click+targeted_TdlgLocation_WM_HSCROLL_SB_LINEUP" : useUpDownKeyTarget ? "targeted_TEdit_client_click+targeted_TUpDown_extended_VK_UP" : "targeted_TEdit_client_click+targeted_TEdit_VK_UP", applyBeforeOk: true, preservesNativeZ: true };
  writeJson(manifestPath, manifest);
  const restoreSource = () => {
    attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
    attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_click_focus_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`);
    attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_click_focus_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`);
  };
  try {
    attempt.key = runAtom("key-aurora-toolset-adjust-location-position-updown-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text), "--focusTransport", "targeted_tedit_click", "--keyTarget", useUpDownKeyTarget ? "updown" : "edit", "--actionTransport", useVScrollPositionParent ? "vscroll_position_parent" : useCnNotifyControl ? "cn_notify_control" : useMsaaDefaultTop ? "msaa_default_top" : usePostMouseTop ? "post_mouse_top" : useHScrollParent ? "hscroll_parent" : "key"]);
    if (attempt.key.processId !== windows.processId || attempt.key.stageMatchesCandidate !== true) { restoreSource(); throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_click_focus_state_missing:${JSON.stringify({ key: attempt.key, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`); }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]);
    attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_click_focus_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]);
    const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_click_focus_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]);
    const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true);
    if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_click_focus_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`);
    attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]);
    attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
    if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_click_focus_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]);
    const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame);
    const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
    if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_key_click_focus_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]);
    manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
    manifest.module = fileIdentityOrLocked(declaration.module.path);
    manifest.status = "saved";
    manifest.blockerCode = "bootstrap_saved_pending_geometry";
    manifest.failureCode = "bootstrap_saved_pending_geometry";
    manifest.error = "bootstrap_saved_pending_geometry";
    manifest.toolsetProcessId = manifest.stages.save.processId;
    attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module };
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-key-click-focus", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) {
    if (!attempt.sourceReadbackAfterCancel) {
      try {
        const duringFailure = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
        const locationStillOpen = (duringFailure.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location");
        if (duringFailure.responding === true && locationStillOpen.length === 1) restoreSource();
      } catch (cleanupError) { attempt.cleanupError = cleanupError instanceof Error ? cleanupError.message : String(cleanupError); }
    }
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function integerOption(value, name) { const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 0) throw new Error(`${name}_must_be_a_non_negative_integer`); return parsed; }
function isTileCenterCoordinate(value) { return Number.isInteger(value) && value >= 5 && (value - 5) % 10 === 0; }
function isTileCenterInArea(value, tileCount) { return isTileCenterCoordinate(value) && value < tileCount * 10; }
function formatLocationCoordinate(value, existingText) { return value.toFixed(2).replace(".", String(existingText).includes(",") ? "," : "."); }
function sameLocationCoordinates(fields, candidate) {
  const values = fields.map((field) => Number(String(field.text ?? "").trim().replace(",", ".")));
  return values.length === 3 && values.every(Number.isFinite) && Math.abs(values[0] - candidate.x) < 0.011 && Math.abs(values[1] - candidate.y) < 0.011 && Math.abs(values[2] - candidate.z) < 0.011;
}
function sameLocationXY(fields, candidate) {
  const values = fields.map((field) => Number(String(typeof field === "string" ? field : field.text ?? "").trim().replace(",", ".")));
  return values.length === 3 && values.every(Number.isFinite) && Math.abs(values[0] - candidate.x) < 0.011 && Math.abs(values[1] - candidate.y) < 0.011;
}

function ensureBootstrapAreaViewer(declaration) {
  return runAtom("view-aurora-toolset-area-tree-item-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--treeLabel", declaration.area.resref, "--viewerResref", declaration.area.resref, "--timeoutMs", "30000"]);
}

function observeUnsavedPostFinishFrame() {
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame");
  const allowed = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
  if (windows.responding !== true || frames.length !== 1 || allowed.length !== 0 || !/^BioWare Aurora Neverwinter Nights Toolset v89\.8193\.37-17\*$/u.test(String(frames[0].text))) throw new Error(`bootstrap_unsaved_post_finish_frame_unverified:${JSON.stringify({ responding: windows.responding, frames, allowed })}`);
  return { readOnly: true, processId: windows.processId, frameHwnd: frames[0].hwnd, frameTitle: frames[0].text, noModal: true, destinationModuleAbsent: true };
}

function observeSelectedPostAreaModuleWizard(areaResref) {
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  if (windows.responding !== true || (windows.windows ?? []).some((window) => window.className === "TdlgProgress" || window.className === "TdlgAreaWizard" || /Loading Custom Palettes/iu.test(String(window.text)))) throw new Error("bootstrap_module_next_reconcile_modal_or_process_unverified");
  const probe = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "TdlgModuleWizard", "--title", "Module Wizard"]);
  const visible = (probe.controls ?? []).filter((control) => control.visible === true);
  const lists = visible.filter((control) => control.className === "TListBox" && control.enabled === true);
  const button = (caption) => visible.filter((control) => control.text === caption);
  const areaWizard = button("Area Wizard"), back = button("< &Back"), next = button("&Next >"), finish = button("Finish"), cancel = button("Cancel");
  if (lists.length !== 1 || areaWizard.length !== 1 || areaWizard[0].enabled !== true || back.length !== 1 || back[0].enabled !== true || next.length !== 1 || next[0].enabled !== true || finish.length !== 1 || finish[0].enabled !== false || cancel.length !== 1 || cancel[0].enabled !== true) throw new Error(`bootstrap_module_next_reconcile_page_unverified:${JSON.stringify({ lists: lists.length, areaWizard: areaWizard.map((item) => item.enabled), back: back.map((item) => item.enabled), next: next.map((item) => item.enabled), finish: finish.map((item) => item.enabled), cancel: cancel.map((item) => item.enabled) })}`);
  const list = runAtom("read-aurora-toolset-dialog-list-items-no-global-input.mjs", ["--dialogClass", "TdlgModuleWizard", "--dialogTitle", "Module Wizard"]);
  if (list.processId !== probe.processId || list.dialogHwnd !== probe.dialogHwnd || list.itemCount !== 1 || list.selectedIndex !== 0 || JSON.stringify(list.items) !== JSON.stringify([areaResref])) throw new Error(`bootstrap_module_next_reconcile_area_list_unverified:${JSON.stringify({ itemCount: list.itemCount, selectedIndex: list.selectedIndex, items: list.items })}`);
  return { readOnly: true, processId: probe.processId, dialogHwnd: probe.dialogHwnd, monitor: probe.monitor, page: "post-area-module-area-list-selected", createdArea: areaResref, selectedIndex: 0, nextEnabled: true, finishEnabled: false, destinationModuleAbsent: true };
}

function observePostAreaModuleWizard(areaResref) {
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  if (windows.responding !== true || (windows.windows ?? []).some((window) => window.className === "TdlgProgress" || window.className === "TdlgAreaWizard" || /Loading Custom Palettes/iu.test(String(window.text)))) throw new Error("bootstrap_module_finish_reconcile_modal_or_process_unverified");
  const probe = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "TdlgModuleWizard", "--title", "Module Wizard"]);
  const visible = (probe.controls ?? []).filter((control) => control.visible === true);
  const lists = visible.filter((control) => control.className === "TListBox" && control.enabled === true);
  const button = (caption) => visible.filter((control) => control.text === caption);
  const areaWizard = button("Area Wizard"), back = button("< &Back"), next = button("&Next >"), finish = button("Finish"), cancel = button("Cancel");
  if (lists.length !== 1 || areaWizard.length !== 1 || areaWizard[0].enabled !== true || back.length !== 1 || back[0].enabled !== true || next.length !== 1 || next[0].enabled !== true || finish.length !== 1 || finish[0].enabled !== false || cancel.length !== 1 || cancel[0].enabled !== true) throw new Error(`bootstrap_module_finish_reconcile_page_unverified:${JSON.stringify({ lists: lists.length, areaWizard: areaWizard.map((item) => item.enabled), back: back.map((item) => item.enabled), next: next.map((item) => item.enabled), finish: finish.map((item) => item.enabled), cancel: cancel.map((item) => item.enabled) })}`);
  const list = runAtom("read-aurora-toolset-dialog-list-items-no-global-input.mjs", ["--dialogClass", "TdlgModuleWizard", "--dialogTitle", "Module Wizard"]);
  if (list.processId !== probe.processId || list.dialogHwnd !== probe.dialogHwnd || list.itemCount !== 1 || list.selectedIndex !== -1 || JSON.stringify(list.items) !== JSON.stringify([areaResref])) throw new Error(`bootstrap_module_finish_reconcile_area_list_unverified:${JSON.stringify({ itemCount: list.itemCount, selectedIndex: list.selectedIndex, items: list.items })}`);
  return { readOnly: true, processId: probe.processId, dialogHwnd: probe.dialogHwnd, monitor: probe.monitor, page: "post-area-module-area-list", createdArea: areaResref, selectedIndex: -1, finishEnabled: false, destinationModuleAbsent: true };
}

function observeAfterAreaNameListPage(areaResref) {
  const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
  if (windows.responding !== true || (windows.windows ?? []).some((window) => window.className === "TdlgProgress" || /Loading Custom Palettes/iu.test(String(window.text)))) throw new Error("bootstrap_area_list_reconcile_modal_or_process_unverified");
  const probe = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "TdlgAreaWizard", "--title", "Area Wizard"]);
  const visible = (probe.controls ?? []).filter((control) => control.visible === true);
  const edits = visible.filter((control) => (control.className === "TEdit" || control.className === "Edit") && control.text === areaResref);
  const lists = visible.filter((control) => control.className === "TListBox" && control.enabled === true);
  const button = (text) => visible.filter((control) => control.text === text);
  const back = button("< &Back"), next = button("&Next >"), finish = button("Finish"), cancel = button("Cancel");
  if (edits.length !== 1 || lists.length !== 1 || back.length !== 1 || back[0].enabled !== false || next.length !== 1 || next[0].enabled !== false || finish.length !== 1 || finish[0].enabled !== false || cancel.length !== 1 || cancel[0].enabled !== true) throw new Error(`bootstrap_area_list_reconcile_page_unverified:${JSON.stringify({ edits: edits.length, lists: lists.length, back: back.map((item) => item.enabled), next: next.map((item) => item.enabled), finish: finish.map((item) => item.enabled), cancel: cancel.map((item) => item.enabled) })}`);
  return { readOnly: true, processId: probe.processId, dialogHwnd: probe.dialogHwnd, monitor: probe.monitor, page: "after-area-name-list", areaName: areaResref, visibleEditCount: edits.length, visibleEnabledListCount: lists.length, backEnabled: false, nextEnabled: false, finishEnabled: false, cancelEnabled: true };
}

function observeSettledPostNameModuleWizard() {
  const deadline = Date.now() + 15_000;
  let last = "not_probed";
  while (Date.now() < deadline) {
    const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    if (windows.responding !== true) throw new Error("bootstrap_progress_reconcile_toolset_not_responsive");
    const progress = (windows.windows ?? []).filter((window) => window.className === "TdlgProgress" || /Loading Custom Palettes/iu.test(String(window.text)));
    if (progress.length > 0) { last = "progress_visible"; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150); continue; }
    try {
      const probe = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "TdlgModuleWizard", "--title", "Module Wizard"]);
      const visible = (probe.controls ?? []).filter((control) => control.visible === true);
      const find = (text) => visible.filter((control) => control.text === text);
      const areaWizard = find("Area Wizard");
      const next = find("&Next >");
      const edits = visible.filter((control) => control.className === "TEdit" || control.className === "Edit");
      if (areaWizard.length === 1 && areaWizard[0].enabled === true && next.length === 1 && next[0].enabled === false && edits.length === 0) return { readOnly: true, processId: probe.processId, dialogHwnd: probe.dialogHwnd, monitor: probe.monitor, page: "post-name-area-selection", progressVisible: false, areaWizardEnabled: true, nextEnabled: false, visibleEditCount: 0 };
      last = `unexpected_module_wizard_state:${JSON.stringify({ areaWizard: areaWizard.map((control) => control.enabled), next: next.map((control) => control.enabled), visibleEditCount: edits.length })}`;
    } catch (error) { last = error instanceof Error ? error.message : String(error); }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 150);
  }
  throw new Error(`bootstrap_progress_reconcile_post_name_state_unverified:${last}`);
}

function observeBlankModuleNamePage() {
  const probe = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "TdlgModuleWizard", "--title", "Module Wizard"]);
  const visibleEdits = (probe.controls ?? []).filter((control) => control.visible === true && (control.className === "TEdit" || control.className === "Edit"));
  if (visibleEdits.length !== 1 || visibleEdits[0].text !== "") throw new Error(`bootstrap_reconcile_blank_name_page_unverified:${visibleEdits.length}:${visibleEdits.map((control) => control.text).join("|")}`);
  return { readOnly: true, processId: probe.processId, dialogHwnd: probe.dialogHwnd, monitor: probe.monitor, visibleEditCount: visibleEdits.length, editHwnd: visibleEdits[0].hwnd, before: visibleEdits[0].text, destinationModuleAbsent: true };
}

function executeBootstrapCreate(declaration, outDir, manifest, { commandName, reuseModuleWizard, resumeModuleWizardPage }) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  try {
    manifest.stages.createModuleAndArea = runAtom("create-aurora-toolset-module-and-area-no-global-input.mjs", [
      "--module", declaration.module.resref, "--area", declaration.area.resref,
      "--tileset", declaration.area.tileset, "--size", declaration.area.size,
      "--modulePath", resolve(declaration.module.path), "--out", resolve(outDir, "module-and-area.json"),
      "--reuseModuleWizard", String(reuseModuleWizard),
      "--resumeModuleWizardPage", resumeModuleWizardPage,
      "--allowUnsavedPostFinish", "true",
    ]);
    if (manifest.stages.createModuleAndArea.proof?.initialSaveRequired !== true) throw new Error("bootstrap_initial_save_contract_missing");
    manifest.stages.persistInitialModule = runAtom("persist-aurora-toolset-unsaved-module-save-as-no-global-input.mjs", ["--module", declaration.module.resref, "--output", resolve(declaration.module.path), "--expectedFrameTitle", manifest.stages.createModuleAndArea.frame?.text ?? ""]);
    if (manifest.stages.persistInitialModule.titleAfter !== `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`) throw new Error("bootstrap_save_as_frame_identity_invalid");
    if (!existsSync(resolve(declaration.module.path)) || statSync(resolve(declaration.module.path)).size <= 0) throw new Error("bootstrap_save_as_module_missing_or_empty");
    completeBootstrapAfterModulePersistence(declaration, outDir, manifest, manifest.stages.createModuleAndArea.frame?.hwnd);
    writeJson(manifestPath, manifest);
    print({ ok: true, command: commandName, status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: !reuseModuleWizard, reusesToolset: reuseModuleWizard, startsNwn: false, usesGlobalInput: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function executeBootstrapPostInitialSave(declaration, outDir, manifest, { commandName, expectedFrameTitle }) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  try {
    manifest.stages.persistInitialModule = runAtom("persist-aurora-toolset-unsaved-module-save-as-no-global-input.mjs", ["--module", declaration.module.resref, "--output", resolve(declaration.module.path), "--expectedFrameTitle", expectedFrameTitle]);
    if (manifest.stages.persistInitialModule.titleAfter !== `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`) throw new Error("bootstrap_save_as_frame_identity_invalid");
    if (!existsSync(resolve(declaration.module.path)) || statSync(resolve(declaration.module.path)).size <= 0) throw new Error("bootstrap_save_as_module_missing_or_empty");
    completeBootstrapAfterModulePersistence(declaration, outDir, manifest, manifest.stages.persistInitialModule.frameHwnd);
    writeJson(manifestPath, manifest);
    print({ ok: true, command: commandName, status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, startsNwn: false, usesGlobalInput: false });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = classifyBootstrapFailure(error);
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref);
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function completeBootstrapAfterModulePersistence(declaration, outDir, manifest, frameHwnd) {
  for (const hak of declaration.haks) {
    const result = runAtom("attach-aurora-toolset-module-hak-no-global-input.mjs", ["--module", declaration.module.resref, "--hak", hak.resref, "--hakPath", resolve(hak.path)]);
    if (result.hakListReadback?.at(-1) !== hak.resref) throw new Error(`ordered_hak_readback_mismatch:${hak.resref}`);
    manifest.stages.haks.push(result);
  }
  manifest.stages.creatures = declaration.creatures.map((creature) => placeCreatureAndAppearance(declaration, creature, outDir, frameHwnd));
  manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path)]);
  manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
  manifest.nativeEntryReadback = readNativeEntryReadback(declaration);
  manifest.status = "saved";
  manifest.toolsetProcessId = manifest.stages.save.processId;
  manifest.module = fileIdentityOrLocked(declaration.module.path);
  manifest.haks = declaration.haks.map((hak) => ({ resref: hak.resref, ...fileIdentity(hak.path) }));
}

function bootstrapEntrySurfaceArm(declaration, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifest = readJson(resolve(outDir, "bootstrap-manifest.json"));
  if (manifest.status !== "saved" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_entry_arm_manifest_invalid");
  const entry = readNativeEntryReadback(declaration);
  if (entry.moduleSha256 !== manifest.module?.sha256 || entry.area !== declaration.area.resref.toLowerCase()) throw new Error("bootstrap_entry_arm_readback_mismatch");
  const path = resolve(outDir, "entry-surface-user-observation-request.json");
  writeJson(path, { version: "aurora-entry-surface-user-observation-request/v1", requestId: randomUUID(), declarationId: declaration.id, declarationSha256: manifest.declarationSha256, moduleSha256: entry.moduleSha256, area: entry.area, entry: entry.position, action: "user_owned_toolset_paint_start_location_and_save_observation", requiredEvidence: ["fresh Toolset capture showing Paint Start Location / resulting marker", "native saved IFO entry readback after the action"], prohibits: ["project-authored accessibility boolean", "local Toolset adapter", "runtime proof claim"] });
  print({ ok: true, command: "bootstrap-entry-surface-arm", requestPath: path, startsToolset: false, startsNwn: false, usesGlobalInput: false });
}

function bootstrapEntrySurfaceIngest(declaration, outDir, handoff) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const request = readJson(resolve(outDir, "entry-surface-user-observation-request.json"));
  const entry = readNativeEntryReadback(declaration);
  const failures = [];
  if (handoff.version !== "aurora-entry-surface-user-observation-handoff/v1" || handoff.requestId !== request.requestId) failures.push("entry_handoff_request_mismatch");
  if (handoff.declarationId !== declaration.id || handoff.moduleSha256 !== entry.moduleSha256 || handoff.area !== entry.area || JSON.stringify(handoff.entry) !== JSON.stringify(entry.position)) failures.push("entry_handoff_target_mismatch");
  const evidence = handoff.capture;
  if (!evidence?.path || !/^[a-f0-9]{64}$/u.test(evidence.sha256 ?? "") || !existsSync(resolve(evidence.path)) || fileIdentity(evidence.path).sha256 !== evidence.sha256) failures.push("entry_handoff_capture_invalid");
  if (handoff.observationKind !== "user_observed_native_toolset_paint_start_location") failures.push("entry_handoff_observation_kind_invalid");
  const path = resolve(outDir, "entry-surface-observation.json");
  if (failures.length) { writeJson(path, { version: "aurora-entry-surface-observation/v1", status: "failed", failures, requestId: request.requestId, entry }); print({ ok: true, command: "bootstrap-entry-surface-ingest", status: "failed", observationPath: path, failures }); return; }
  writeJson(path, { version: "aurora-entry-surface-observation/v1", status: "validated_user_owned_observation", requestId: request.requestId, moduleSha256: entry.moduleSha256, area: entry.area, entry: entry.position, capture: evidence, observationKind: handoff.observationKind, safety: { projectSuppliedAccessibilityBoolean: false, startsToolset: false, startsNwn: false } });
  print({ ok: true, command: "bootstrap-entry-surface-ingest", status: "validated_user_owned_observation", observationPath: path, entry });
}

function validateSavedCandidateForFocus(declaration, declarationPath, sourceOutDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  if (declaration.creatures.length !== 1) throw new Error("bootstrap_focus_requires_exactly_one_declared_creature");
  const sourceManifestPath = resolve(sourceOutDir, "bootstrap-manifest.json");
  if (!existsSync(sourceManifestPath)) throw new Error("bootstrap_focus_source_manifest_missing");
  const sourceManifest = readJson(sourceManifestPath);
  if (sourceManifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || sourceManifest.declarationSha256 !== sha256FileText(declaration) || sourceManifest.declarationPath !== declarationPath) throw new Error("bootstrap_focus_source_manifest_identity_mismatch");
  if (sourceManifest.status !== "saved" || sourceManifest.safety?.orderedHakReadback !== true || sourceManifest.safety?.nativeSaveReadback !== true || sourceManifest.safety?.moduleHashStatus !== "verified") throw new Error("bootstrap_focus_source_not_saved_verified");
  const module = fileIdentity(declaration.module.path);
  if (sourceManifest.module?.sha256 !== module.sha256 || sourceManifest.module?.bytes !== module.bytes) throw new Error("bootstrap_focus_module_identity_drift");
  const haks = declaration.haks.map((hak) => ({ resref: hak.resref, ...fileIdentity(hak.path) }));
  if (JSON.stringify(sourceManifest.haks?.map((hak) => ({ resref: hak.resref, sha256: hak.sha256, bytes: hak.bytes }))) !== JSON.stringify(haks.map((hak) => ({ resref: hak.resref, sha256: hak.sha256, bytes: hak.bytes })))) throw new Error("bootstrap_focus_hak_identity_drift");
  const orderedHaks = declaration.haks.map((hak) => hak.resref);
  const hakStage = sourceManifest.stages?.haks?.at(-1);
  if (JSON.stringify(hakStage?.orderedHaks) !== JSON.stringify(orderedHaks) || JSON.stringify(hakStage?.inspection?.hakListReadback) !== JSON.stringify(orderedHaks)) throw new Error("bootstrap_focus_ordered_hak_readback_missing");
  const git = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
  if (sourceManifest.nativeGitReadback?.gitSha256 !== git.gitSha256 || JSON.stringify(sourceManifest.nativeGitReadback?.fixtures) !== JSON.stringify(git.fixtures)) throw new Error("bootstrap_focus_saved_git_readback_drift");
  const entry = readNativeEntryReadback(declaration);
  if (sourceManifest.nativeEntryReadback?.moduleSha256 !== entry.moduleSha256 || sourceManifest.nativeEntryReadback?.area !== entry.area || JSON.stringify(sourceManifest.nativeEntryReadback?.position) !== JSON.stringify(entry.position)) throw new Error("bootstrap_focus_saved_entry_readback_drift");
  const area = runAtom("read-aurora-toolset-bootstrap-area-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]);
  if (area.moduleSha256 !== module.sha256 || area.area !== declaration.area.resref.toLowerCase() || area.completeTileList !== true || area.tileCount !== area.width * area.height || !area.displayName) throw new Error("bootstrap_focus_area_readback_invalid");
  const creature = declaration.creatures[0];
  const fixture = git.fixtures[0];
  if (fixture.id !== creature.id || fixture.templateResRef !== creature.templateResRef || fixture.appearanceType !== creature.appearanceType) throw new Error("bootstrap_focus_fixture_identity_mismatch");
  return { sourceManifestPath, sourceManifest, module, haks, orderedHaks, git, entry, area, creature, fixture, candidate: { declarationId: declaration.id, module, orderedHakList: haks.map((hak) => ({ resref: hak.resref, sha256: hak.sha256 })), area: declaration.area.resref, fixture } };
}

function bootstrapFocusCapture(declaration, declarationPath, sourceOutDir, outDir) {
  const state = validateSavedCandidateForFocus(declaration, declarationPath, sourceOutDir);
  const reuseExactOpenSession = String(options.reuseExactOpenSession ?? "false").toLowerCase() === "true";
  if (existsSync(outDir)) throw new Error(`bootstrap_focus_artifact_destination_already_exists:${outDir}`);
  const preflightProcesses = listAuroraProcesses();
  if (!reuseExactOpenSession && preflightProcesses.length !== 0) throw new Error(`bootstrap_focus_requires_zero_toolset_and_nwn_processes:${JSON.stringify(preflightProcesses)}`);
  if (reuseExactOpenSession && (preflightProcesses.length !== 1 || String(preflightProcesses[0].ProcessName ?? "").toLowerCase() !== "nwtoolset")) throw new Error(`bootstrap_focus_reuse_requires_one_toolset_and_zero_nwn:${JSON.stringify(preflightProcesses)}`);
  mkdirSync(outDir, { recursive: true });
  const manifestPath = resolve(outDir, "focus-proof-manifest.json");
  const manifest = {
    version: "aurora-toolset-focus-proof-manifest/v1", createdAt: new Date().toISOString(), status: "starting",
    declarationPath, declarationSha256: sha256FileText(declaration), sourceManifestPath: state.sourceManifestPath,
    candidate: state.candidate, modelVisibility: "not_tested", proofCompleteness: "missing",
    safety: { startsOneToolsetProcess: !reuseExactOpenSession, reusesExactOpenToolsetProcess: reuseExactOpenSession, startsNwn: false, changesIniOrMru: false, usesGlobalInput: false, closesProcess: false, noNewIteration: true },
  };
  writeJson(manifestPath, manifest);
  try {
    if (reuseExactOpenSession) {
      const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
      const expectedTitle = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod`;
      const exactFrames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === expectedTitle);
      const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className));
      if (windows.responding !== true || windows.processId !== preflightProcesses[0].Id || exactFrames.length !== 1 || unexpected.length !== 0) throw new Error(`bootstrap_focus_reuse_exact_open_session_unverified:${JSON.stringify({ windows, preflightProcesses, exactFrames, unexpected })}`);
      manifest.open = { ok: true, reusedExactOpenSession: true, processId: windows.processId, moduleWindowTitle: exactFrames[0].text, moduleWindowHwnd: exactFrames[0].hwnd, readback: windows };
    } else {
      manifest.open = runAtom("open-last-city-module-and-area-toolset-no-global-input.mjs", [
        "--modulePath", resolve(declaration.module.path), "--expectedModuleParts", `${declaration.module.resref}|mod`,
        "--area", declaration.area.resref, "--areaName", state.area.displayName,
        "--windowLeft", "-1920", "--windowTop", "0", "--skipAreaOpen", "true",
      ], 360000, { AURORA_TOOLSET_CANONICAL_SESSION_ENTRYPOINT: "1" });
    }
    if (manifest.open.ok !== true || !String(manifest.open.moduleWindowTitle ?? "").replace(/\*$/u, "").endsWith(` - ${declaration.module.resref}.mod`)) throw new Error(`bootstrap_focus_exact_module_open_unverified:${JSON.stringify(manifest.open)}`);
    const queuePath = resolve(outDir, "area-queue.json");
    writeJson(queuePath, [{ name: state.area.displayName, resref: declaration.area.resref }]);
    manifest.areaOpen = runAtom("run-toolset-area-oracle-queue.mjs", ["--queue", queuePath, "--expectedModule", `${declaration.module.resref}.mod`, "--expectedModuleParts", `${declaration.module.resref}|mod`, "--outDir", resolve(outDir, "area-open"), "--capture", "false"], 120000);
    const queueManifestPath = resolve(outDir, "area-open", "manifest.json");
    const queueManifest = readJson(queueManifestPath);
    const opened = queueManifest.items?.filter((item) => item.status === "opened" && item.area?.resref === declaration.area.resref && item.area?.name === state.area.displayName) ?? [];
    if (manifest.areaOpen.status !== "completed" || opened.length !== 1) throw new Error(`bootstrap_focus_exact_area_open_unverified:${JSON.stringify({ result: manifest.areaOpen, queueManifest })}`);
    manifest.objectContext = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", state.creature.paletteText]);
    const focusItems = manifest.objectContext.popup?.items?.filter((item) => item.text === "&Focus on Object" && item.id === 2 && item.position === 0 && item.enabled === true && item.separator !== true) ?? [];
    if (manifest.objectContext.target?.text !== state.creature.paletteText || focusItems.length !== 1) throw new Error(`bootstrap_focus_exact_object_context_unverified:${JSON.stringify(manifest.objectContext)}`);
    manifest.focus = runAtom("invoke-aurora-toolset-visible-context-menu-item-no-global-input.mjs", ["--text", "&Focus on Object", "--expectedId", "2", "--expectedPosition", "0", "--postcondition", "focus-object", "--module", `${declaration.module.resref}.mod`, "--area", declaration.area.resref]);
    if (manifest.focus.processId !== manifest.objectContext.processId || manifest.focus.postcondition !== "focus-object") throw new Error(`bootstrap_focus_postcondition_unverified:${JSON.stringify(manifest.focus)}`);
    const pngPath = resolve(outDir, "tscrollbox.png");
    const captureResultPath = resolve(outDir, "tscrollbox-result.json");
    manifest.capture = runAtom("aurora-toolset-viewport-proof.mjs", ["capture", "--module", `${declaration.module.resref}.mod`, "--area", declaration.area.resref, "--out", pngPath, "--resultOut", captureResultPath, "--allowUniformScene", "false"]);
    if (manifest.capture.ok !== true || manifest.capture.sceneContentStatus !== "textured_scene") throw new Error(`bootstrap_focus_tscrollbox_capture_unverified:${JSON.stringify(manifest.capture)}`);
    manifest.captureArtifact = fileIdentity(pngPath);
    manifest.captureResultPath = captureResultPath;
    manifest.status = "captured_pending_visual_inspection";
    manifest.completedAt = new Date().toISOString();
    manifest.toolsetProcessId = manifest.focus.processId;
    writeJson(manifestPath, manifest);
    print({ ok: true, command: "bootstrap-focus-capture", status: manifest.status, manifestPath, pngPath, candidate: manifest.candidate, modelVisibility: "not_tested", proofCompleteness: "missing", startsToolset: !reuseExactOpenSession, reusesExactOpenToolsetProcess: reuseExactOpenSession, startsNwn: false, changesIniOrMru: false, noNewIteration: true });
  } catch (error) {
    manifest.status = "failed";
    manifest.blockerCode = "bootstrap_focus_capture_failed";
    manifest.error = error instanceof Error ? error.message : String(error);
    manifest.postFailureProcesses = listAuroraProcesses();
    manifest.updatedAt = new Date().toISOString();
    writeJson(manifestPath, manifest);
    throw error;
  }
}

function bootstrapFocusRecordVisibility(outDir, modelVisibility, inspection) {
  if (!["visible", "not_visible"].includes(modelVisibility)) throw new Error("bootstrap_focus_visibility_must_be_visible_or_not_visible");
  const manifestPath = resolve(outDir, "focus-proof-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_focus_manifest_missing");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-focus-proof-manifest/v1" || manifest.status !== "captured_pending_visual_inspection") throw new Error("bootstrap_focus_manifest_not_pending_inspection");
  const capture = fileIdentity(manifest.captureArtifact?.path);
  if (capture.sha256 !== manifest.captureArtifact.sha256 || capture.bytes !== manifest.captureArtifact.bytes) throw new Error("bootstrap_focus_capture_identity_drift");
  manifest.status = "verified";
  manifest.modelVisibility = modelVisibility;
  manifest.proofCompleteness = "verified";
  manifest.visualInspection = { inspectedAt: new Date().toISOString(), verdict: modelVisibility, description: inspection, capture };
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  print({ ok: true, command: "bootstrap-focus-record-visibility", status: manifest.status, manifestPath, modelVisibility, proofCompleteness: manifest.proofCompleteness, capture });
}

function bootstrapFocusCloseFailedOpen(outDir, closeAuthorization) {
  const manifestPath = resolve(outDir, "focus-proof-manifest.json");
  if (!existsSync(manifestPath)) throw new Error("bootstrap_focus_manifest_missing");
  const manifest = readJson(manifestPath);
  const owned = manifest.postFailureProcesses?.filter((process) => String(process.ProcessName ?? "").toLowerCase() === "nwtoolset") ?? [];
  if (manifest.version !== "aurora-toolset-focus-proof-manifest/v1" || manifest.status !== "failed" || owned.length !== 1 || !Number.isInteger(owned[0].Id)) throw new Error("bootstrap_focus_failed_open_close_not_authorized_for_state");
  const current = listAuroraProcesses();
  if (current.length !== 1 || String(current[0].ProcessName ?? "").toLowerCase() !== "nwtoolset" || current[0].Id !== owned[0].Id) throw new Error(`bootstrap_focus_owned_pid_changed:${JSON.stringify(current)}`);
  const close = runAtom("close-aurora-toolset-window-no-global-input.mjs", ["--expectedPid", String(owned[0].Id)], 30000);
  if (close.ok !== true || close.afterProcesses?.length !== 0) throw new Error(`bootstrap_focus_owned_close_unverified:${JSON.stringify(close)}`);
  manifest.authorizedClose = { at: new Date().toISOString(), authorization: closeAuthorization, processId: owned[0].Id, result: close };
  manifest.status = "failed_open_closed";
  manifest.updatedAt = new Date().toISOString();
  writeJson(manifestPath, manifest);
  print({ ok: true, command: "bootstrap-focus-close-failed-open", status: manifest.status, manifestPath, closedProcessId: owned[0].Id, closeAuthorization });
}

function bootstrapGeometryObserve(declaration, outDir) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-geometry-observe", mode: "dry-run", startsToolset: false, startsNwn: false, usesGlobalInput: false, requires: ["saved bootstrap manifest", "one responsive owned Toolset session", "native GIT readback", "native entry-surface observation"] }); return; }
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  const gatePath = resolve(outDir, "native-geometry-gate.json");
  const blockerPath = resolve(outDir, "native-geometry-blocker.json");
  const manifest = readJson(manifestPath);
  const gateBase = { version: "aurora-vertical-slice-native-geometry-gate/v1", declarationId: declaration.id, area: declaration.area.resref, observedAt: new Date().toISOString(), moduleSha256: fileIdentity(declaration.module.path).sha256, orderedHakList: declaration.haks.map((hak) => ({ resref: hak.resref, sha256: fileIdentity(hak.path).sha256 })), entryPoint: null, fixtures: null, fixtureObservations: [], entryPointAccessible: false, fixturesAccessible: false, nativeSave: { areaWasSaved: false, invalidLocationsDialog: null, inaccessibleObjectsDialog: null, statusText: null } };
  const failures = [];
  try {
    if (manifest.status !== "saved" || manifest.declarationSha256 !== sha256FileText(declaration)) failures.push("bootstrap_manifest_not_saved_or_mismatched");
    if (manifest.module?.sha256 !== gateBase.moduleSha256) failures.push("module_hash_drift");
    const git = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref]));
    if (manifest.nativeGitReadback?.gitSha256 !== git.gitSha256 || JSON.stringify(manifest.nativeGitReadback?.fixtures) !== JSON.stringify(git.fixtures)) failures.push("saved_git_readback_drift");
    gateBase.fixtures = git.fixtures.map((fixture) => ({ id: fixture.id, position: fixture.position }));
    const entry = readNativeEntryReadback(declaration);
    if (manifest.nativeEntryReadback?.moduleSha256 !== entry.moduleSha256 || manifest.nativeEntryReadback?.area !== entry.area || JSON.stringify(manifest.nativeEntryReadback?.position) !== JSON.stringify(entry.position)) failures.push("saved_ifo_entry_readback_drift");
    gateBase.entryPoint = entry.position;
    const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []);
    const frameText = `${declaration.module.resref}.mod`;
    if (windows.responding !== true || windows.windows?.filter((window) => window.className === "TfrmFrame" && String(window.text).replace(/\*$/u, "").endsWith(` - ${frameText}`)).length !== 1) failures.push("owned_toolset_session_or_module_missing");
    const dialogText = (windows.windows ?? []).map((window) => String(window.text)).join("\n");
    const invalid = /invalid locations|area was not saved/iu.test(dialogText);
    const inaccessible = /inaccessable objects|inaccessible objects/iu.test(dialogText);
    gateBase.nativeSave = { areaWasSaved: manifest.stages?.save?.titleAfter?.endsWith("*") === false && manifest.stages?.save?.after?.sha256 != null, invalidLocationsDialog: invalid, inaccessibleObjectsDialog: inaccessible, statusText: manifest.stages?.save?.titleAfter ?? null };
    if (invalid || inaccessible || gateBase.nativeSave.areaWasSaved !== true) failures.push("area_geometry_invalid");
    if (!failures.length) {
      gateBase.fixtureObservations = git.fixtures.map((fixture) => ({ id: fixture.id, templateResRef: fixture.templateResRef, appearanceType: fixture.appearanceType, position: fixture.position, nativeSaveAccepted: true, savedGitReadback: true, accessibleSurface: true }));
      gateBase.fixturesAccessible = gateBase.fixtureObservations.length === declaration.creatures.length && gateBase.fixtureObservations.every((fixture) => fixture.accessibleSurface === true);
      if (!gateBase.fixturesAccessible) failures.push("fixture_surface_native_observation_incomplete");
    }
    // Native save accepted all placed objects; the exact GIT positions are the only
    // fixture coordinates emitted. Entry accessibility remains deliberately unproven
    // until the central entry-surface observer is available.
    const entryObservationPath = resolve(outDir, "entry-surface-observation.json");
    const entryObservation = existsSync(entryObservationPath) ? readJson(entryObservationPath) : null;
    if (entryObservation?.status !== "validated_user_owned_observation" || entryObservation.moduleSha256 !== entry.moduleSha256 || entryObservation.area !== entry.area || JSON.stringify(entryObservation.entry) !== JSON.stringify(entry.position)) failures.push("entry_surface_native_observation_unavailable");
    else gateBase.entryPointAccessible = true;
  } catch (error) { failures.push(`geometry_observe_error:${error instanceof Error ? error.message : String(error)}`); }
  if (failures.length) { const blocker = { ...gateBase, status: "failed", blockerCode: failures.includes("area_geometry_invalid") ? "area_geometry_invalid" : "native_geometry_observation_failed", failures }; writeJson(blockerPath, blocker); print({ ok: true, command: "bootstrap-geometry-observe", status: "failed", blockerPath, failures, proofClaimed: false, runtimeClaimed: false }); return; }
  // This path is intentionally unreachable until a verified entry-surface control
  // exists; retain the fail-closed check so no caller can fabricate a positive gate.
  writeJson(gatePath, { ...gateBase, status: "verified" }); print({ ok: true, command: "bootstrap-geometry-observe", status: "verified", gatePath, proofClaimed: false, runtimeClaimed: false });
}

function placeCreatureAndAppearance(declaration, creature, outDir, frameHwnd, { reuseExistingPlacedCreature = false, reuseExistingPropertiesPopup = false, reuseExistingCreaturePropertiesDialog = false } = {}) {
  const module = `${declaration.module.resref}.mod`;
  if (!Number.isInteger(Number(frameHwnd)) || Number(frameHwnd) <= 0) throw new Error("bootstrap_module_frame_identity_missing");
  const placement = creature.placement;
  const palette = reuseExistingPlacedCreature ? { reusedExistingPlacedCreature: true } : runAtom("inspect-aurora-toolset-palette-no-global-input.mjs", [
    "--module", module, "--area", declaration.area.resref, "--frameHwnd", String(frameHwnd), "--category", "creature",
    "--selectText", creature.paletteText, "--placeX", String(placement.screenX),
    "--placeY", String(placement.screenY), "--restoreSelectObjects", "true",
    "--out", resolve(outDir, "creature-placement.json"),
  ]);
  if (!reuseExistingPlacedCreature && (palette.action?.selectedText !== creature.paletteText || palette.action?.selectObjectsRestored !== true)) throw new Error("bootstrap_creature_placement_readback_failed");
  const opened = reuseExistingCreaturePropertiesDialog ? { reusedExistingCreaturePropertiesDialog: true } : runAtom("open-aurora-toolset-creature-properties-no-global-input.mjs", ["--module", module, "--objectText", creature.paletteText, "--reuseVisiblePopup", String(reuseExistingPropertiesPopup), "--expectedPropertiesId", "19"]);
  const appearanceTab = runAtom("select-aurora-toolset-creature-properties-tab-no-global-input.mjs", ["--tab", "Basic"]);
  const selected = runAtom("select-aurora-toolset-dialog-combo-item-dropdown-no-global-input.mjs", ["--dialogClass", "TdlgCreatureEdit", "--dialogTitle", "Creature Properties", "--targetText", creature.appearance]);
  if (selected.after?.text !== creature.appearance) throw new Error("bootstrap_creature_appearance_readback_failed");
  const appearanceCapture = runAtom("capture-aurora-toolset-dialog-no-global-input.mjs", ["--class", "TdlgCreatureEdit", "--title", "Creature Properties", "--out", resolve(outDir, "creature-properties-selected-appearance.png")]);
  const committed = runAtom("commit-aurora-toolset-creature-properties-no-global-input.mjs", []);
  return { palette, opened, appearanceTab, selected, appearanceCapture, committed };
}

function bootstrapFinalize(declaration, outDir, gate) {
  validateDeclaration(declaration, { destinationMustBeAbsent: false });
  const manifestPath = resolve(outDir, "bootstrap-manifest.json");
  const manifest = readJson(manifestPath);
  if (manifest.version !== "aurora-toolset-vertical-slice-bootstrap-manifest/v1" || manifest.declarationSha256 !== sha256FileText(declaration)) throw new Error("bootstrap_manifest_declaration_mismatch");
  if (manifest.status !== "saved") throw new Error("bootstrap_save_not_accepted");
  validateSavedNativeFixtureBindings(declaration, manifest.nativeGitReadback);
  const module = fileIdentity(declaration.module.path);
  const haks = declaration.haks.map((hak) => ({ resref: hak.resref, ...fileIdentity(hak.path) }));
  validateGeometryGate(gate, declaration, module.sha256, haks, manifest.nativeGitReadback, manifest.nativeEntryReadback);
  const immutableProfile = {
    version: "aurora-toolset-vertical-slice-profile/v1", id: `${declaration.id}-immutable`,
    module: { resref: declaration.module.resref, path: resolve(declaration.module.path), sha256: module.sha256, area: declaration.area.resref, entryPoint: manifest.nativeEntryReadback.position },
    area: declaration.area, orderedHakList: haks, fixtures: declaration.creatures,
    geometryGate: { required: true, status: "verified", evidence: resolve(options.geometryGate) }, runtime: { required: true }, noLocalSubstitute: true,
  };
  const runtimeProfile = {
    version: "aur-s07-runtime-profile/v1", id: `${declaration.id}-runtime`,
    module: { sha256: module.sha256, area: declaration.area.resref, entryPoint: manifest.nativeEntryReadback.position }, orderedHakList: haks,
    fixtures: declaration.geometryIntent.fixtures, geometryGate: { status: "verified", evidence: resolve(options.geometryGate) },
    launch: { mode: "user_owned_test_module_action", processName: "nwmain" }, noLocalSubstitute: true,
  };
  const candidatePath = resolve(outDir, "vertical-slice-immutable-profile.json");
  const runtimePath = resolve(outDir, "aur-s07-runtime-profile.json");
  writeJson(candidatePath, immutableProfile); writeJson(runtimePath, runtimeProfile);
  print({ ok: true, command: "bootstrap-finalize", status: "immutable_profiles_emitted", profilePath: candidatePath, runtimeProfilePath: runtimePath, module, orderedHakList: haks, proofClaimed: false, runtimeClaimed: false });
}

function bindNativeGitReadback(declaration, readback) {
  if (readback.version !== "aurora-toolset-bootstrap-git-readback/v1" || readback.area !== declaration.area.resref.toLowerCase()) throw new Error("bootstrap_git_readback_identity_invalid");
  if (!Array.isArray(readback.creatures) || readback.creatures.length !== declaration.creatures.length) throw new Error("bootstrap_git_creature_count_mismatch");
  const fixtures = readback.creatures.map((creature, index) => {
    if (!text(creature.templateResRef) || !Number.isFinite(creature.appearanceType) || !Array.isArray(creature.position) || creature.position.length !== 3 || !creature.position.every(Number.isFinite)) throw new Error(`bootstrap_git_creature_readback_invalid:${index}`);
    const declared = declaration.creatures[index];
    if (String(declared.templateResRef).toLowerCase() !== creature.templateResRef) throw new Error(`bootstrap_git_creature_template_mismatch:${declared.id}`);
    if (declared.appearanceType !== creature.appearanceType) throw new Error(`bootstrap_git_creature_appearance_row_mismatch:${declared.id}`);
    return { id: declared.id, templateResRef: creature.templateResRef, appearanceType: creature.appearanceType, position: creature.position };
  });
  return { version: readback.version, moduleSha256: readback.moduleSha256, gitSha256: readback.gitSha256, area: readback.area, fixtures };
}
function validateSavedNativeFixtureBindings(declaration, readback) {
  if (!readback || !Array.isArray(readback.fixtures) || readback.fixtures.length !== declaration.creatures.length) throw new Error("bootstrap_saved_git_fixture_readback_missing");
  for (let index = 0; index < declaration.creatures.length; index += 1) {
    const declared = declaration.creatures[index], fixture = readback.fixtures[index];
    if (fixture?.id !== declared.id || String(fixture?.templateResRef ?? "").toLowerCase() !== String(declared.templateResRef).toLowerCase()) throw new Error(`bootstrap_saved_git_template_mismatch:${declared.id}`);
    if (fixture?.appearanceType !== declared.appearanceType) throw new Error(`bootstrap_saved_git_appearance_row_mismatch:${declared.id}`);
  }
}
function readNativeEntryReadback(declaration) { const entry = runAtom("read-aurora-toolset-bootstrap-entry-readback.mjs", ["--module", resolve(declaration.module.path)]); if (entry.area !== declaration.area.resref.toLowerCase()) throw new Error("bootstrap_ifo_entry_area_mismatch"); return entry; }

function validateDeclaration(declaration, { destinationMustBeAbsent }) {
  if (declaration.version !== "aurora-toolset-vertical-slice-bootstrap-declaration/v1" || !declaration.id) throw new Error("bootstrap_declaration_identity_invalid");
  if (declaration.fastRunner === "m6") throw new Error("vertical_slice_m6_runner_forbidden");
  if (!resref(declaration.module?.resref) || !declaration.module?.path || !resref(declaration.area?.resref) || !text(declaration.area?.tileset) || !text(declaration.area?.size)) throw new Error("bootstrap_module_area_invalid");
  if (!Array.isArray(declaration.haks) || declaration.haks.length === 0 || declaration.haks.some((hak) => !resref(hak.resref) || !text(hak.path) || !existsSync(resolve(hak.path)) || statSync(resolve(hak.path)).size <= 0)) throw new Error("bootstrap_hak_invalid");
  if (!Array.isArray(declaration.creatures) || declaration.creatures.length === 0 || declaration.creatures.some((creature) => !text(creature.id) || !text(creature.paletteText) || !text(creature.resref) || !text(creature.templateResRef) || !Number.isInteger(creature.appearanceType) || creature.appearanceType < 0 || !text(creature.appearance) || !positive(creature.placement?.screenX) || !positive(creature.placement?.screenY))) throw new Error("bootstrap_creature_appearance_invalid");
  if (declaration.geometryIntent?.entryArea !== declaration.area.resref || !Array.isArray(declaration.geometryIntent?.fixtures) || declaration.geometryIntent.fixtures.length === 0 || declaration.geometryIntent.fixtures.some((fixture) => !text(fixture.id) || Object.hasOwn(fixture, "position")) || JSON.stringify(declaration.creatures.map((creature) => creature.id)) !== JSON.stringify(declaration.geometryIntent.fixtures.map((fixture) => fixture.id))) throw new Error("bootstrap_geometry_intent_invalid");
  if (destinationMustBeAbsent && existsSync(resolve(declaration.module.path))) throw new Error(`bootstrap_module_destination_already_exists:${resolve(declaration.module.path)}`);
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationCnCommandChange(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const source = { x: 5.57, y: 14.53, z: 3.2 }; const xy = { x: 10, y: 10 };
  const focusTypeAttempts = manifest.invalidLocationAdjustLocationFocusTypeReconciliationAttempts ?? []; const cmExitAttempts = manifest.invalidLocationAdjustLocationCmExitReconciliationAttempts ?? []; const notifyAttempts = manifest.invalidLocationAdjustLocationUpDownNotifyReconciliationAttempts ?? []; const keyAttempts = manifest.invalidLocationAdjustLocationUpDownKeyReconciliationAttempts ?? []; const clickFocusAttempts = manifest.invalidLocationAdjustLocationUpDownKeyClickFocusReconciliationAttempts ?? []; const cnCommandAttempts = manifest.invalidLocationAdjustLocationCnCommandChangeReconciliationAttempts ?? [];
  const vscrollFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_updown_key_click_focus_state_missing:"); const cnCommandRenderFailure = String(manifest.error ?? "").includes("change-aurora-toolset-adjust-location-cn-command-no-global-input.mjs") && String(manifest.error ?? "").includes("InvalidVariableReferenceWithDrive"); const cnCommandApplyRetry = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_cn_command_change_state_missing:") && cnCommandAttempts.length === 1; const lastClickFocusMode = "targeted_exact_tedit_click_focus_then_validated_position_group_wm_vscroll_lineup_viewport_center_xy_then_apply_ok_and_reopen_readback_before_save"; const cnCommandMode = "targeted_exact_tedit_settext_then_vcl_cn_command_en_change_viewport_center_xy_then_apply_ok_and_reopen_readback_before_save";
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && (vscrollFailure || cnCommandRenderFailure || cnCommandApplyRetry) && focusTypeAttempts.length === 1 && focusTypeAttempts[0]?.mode === "focused_tedit_native_keydown_char_keyup_xy_then_apply_ok_and_reopen_readback_before_save" && cmExitAttempts.length === 1 && cmExitAttempts[0]?.mode === "tedit_wm_settext_then_vcl_cm_exit_to_pair_tupdown_and_dirty_flag_xy_then_apply_ok_and_reopen_readback_before_save" && notifyAttempts.length === 1 && notifyAttempts[0]?.mode === "target_process_nmupdown_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save" && keyAttempts.length === 1 && keyAttempts[0]?.mode === "msaa_focus_then_targeted_tedit_vk_up_xy_then_apply_ok_and_reopen_readback_before_save" && clickFocusAttempts.length === 9 && clickFocusAttempts.at(-1)?.mode === lastClickFocusMode && ((cnCommandAttempts.length === 0 && vscrollFailure) || (cnCommandAttempts.length === 1 && cnCommandAttempts[0]?.mode === cnCommandMode && (cnCommandRenderFailure || cnCommandApplyRetry))) && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_cn_command_change_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-cn-command-change", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_cn_command_change_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: cnCommandApplyRetry ? ["the owner confirms Apply accepts the visible X/Y fields and OK commits while closing TdlgLocation", "the prior CN_COMMAND probe reached candidate text but was cancelled before Apply because paired TUpDown values stayed source", "require only exact candidate text before Apply; do not infer failure from pre-Apply TUpDown state", "after Apply read the fields, then post exact OK, reopen Adjust Location and require X=10.00/Y=10.00 before one Save and native GIT/IFO readback"] : ["the owner-directed Tiny-area centre remains X=10.00/Y=10.00", "the previous validated Position-group WM_VSCROLL route was cancelled and reopened at source coordinates", "set only X/Y text, then dispatch VCL CN_COMMAND/EN_CHANGE directly to the validated TEdit", "require candidate text and paired native positions before Apply; otherwise Cancel and prove source-coordinate reopen", "on success Apply, OK, reopen exact Adjust Location, then one Save and native GIT/IFO readback"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_cn_command_change_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: cnCommandApplyRetry ? "aurora-invalid-location-adjust-location-viewport-centre-apply-then-ok-continuation/v1" : "aurora-invalid-location-adjust-location-viewport-centre-cn-command-change-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: cnCommandApplyRetry ? "targeted_exact_tedit_settext_then_apply_ok_viewport_center_xy_then_reopen_readback_before_save" : cnCommandMode }; manifest.invalidLocationAdjustLocationCnCommandChangeReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, remoteCodeInjection: false, locationEditTransport: cnCommandApplyRetry ? "targeted_TEdit_SetWindowText+Apply+OK" : "targeted_TEdit_SetWindowText+VCL_CN_COMMAND_EN_CHANGE", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  const restoreSource = () => { attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_cn_command_change_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`); attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_cn_command_change_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`); };
  try {
    attempt.cnCommand = runAtom("change-aurora-toolset-adjust-location-cn-command-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    const candidateTextOnly = attempt.cnCommand.after?.text?.[0] === formatLocationCoordinate(xy.x, locationBefore.fields[0].text) && attempt.cnCommand.after?.text?.[1] === formatLocationCoordinate(xy.y, locationBefore.fields[1].text) && attempt.cnCommand.after?.text?.[2] === locationBefore.fields[2].text;
    if (attempt.cnCommand.processId !== windows.processId || (attempt.cnCommand.stageMatchesCandidate !== true && !(cnCommandApplyRetry && candidateTextOnly))) { restoreSource(); throw new Error(`bootstrap_invalid_location_adjust_location_cn_command_change_state_missing:${JSON.stringify({ cnCommand: attempt.cnCommand, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`); }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_cn_command_change_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_cn_command_change_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_cn_command_change_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_cn_command_change_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_cn_command_change_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-cn-command-change", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationUpDownSendClick(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const source = { x: 5.57, y: 14.53, z: 3.2 }; const xy = { x: 10, y: 10 };
  const focusTypeAttempts = manifest.invalidLocationAdjustLocationFocusTypeReconciliationAttempts ?? []; const cmExitAttempts = manifest.invalidLocationAdjustLocationCmExitReconciliationAttempts ?? []; const notifyAttempts = manifest.invalidLocationAdjustLocationUpDownNotifyReconciliationAttempts ?? []; const keyAttempts = manifest.invalidLocationAdjustLocationUpDownKeyReconciliationAttempts ?? []; const clickFocusAttempts = manifest.invalidLocationAdjustLocationUpDownKeyClickFocusReconciliationAttempts ?? []; const cnCommandAttempts = manifest.invalidLocationAdjustLocationCnCommandChangeReconciliationAttempts ?? []; const sendClickAttempts = manifest.invalidLocationAdjustLocationUpDownSendClickReconciliationAttempts ?? [];
  const priorMode = "targeted_exact_tedit_settext_then_apply_ok_viewport_center_xy_then_reopen_readback_before_save"; const priorFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_cn_command_change_reopen_readback_mismatch:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && priorFailure && focusTypeAttempts.length === 1 && focusTypeAttempts[0]?.mode === "focused_tedit_native_keydown_char_keyup_xy_then_apply_ok_and_reopen_readback_before_save" && cmExitAttempts.length === 1 && cmExitAttempts[0]?.mode === "tedit_wm_settext_then_vcl_cm_exit_to_pair_tupdown_and_dirty_flag_xy_then_apply_ok_and_reopen_readback_before_save" && notifyAttempts.length === 1 && notifyAttempts[0]?.mode === "target_process_nmupdown_udn_deltapos_xy_then_apply_ok_and_reopen_readback_before_save" && keyAttempts.length === 1 && keyAttempts[0]?.mode === "msaa_focus_then_targeted_tedit_vk_up_xy_then_apply_ok_and_reopen_readback_before_save" && clickFocusAttempts.length === 9 && cnCommandAttempts.length === 1 && cnCommandAttempts[0]?.mode === priorMode && sendClickAttempts.length === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_updown_send_click_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-send-click", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_updown_send_click_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["the prior Apply then OK test reopened the original source coordinates", "one exact TdlgLocation source state at X=5.57/Y=14.53/Z=3.20", "set each native TUpDown to candidate-minus-increment, then synchronously SendMessage only targeted top-arrow WM_LBUTTONDOWN/UP to that exact HWND", "require handler-formatted X=10.00/Y=10.00 plus paired native positions before Apply then OK", "reopen Adjust Location and require the committed centre before the one native Save/GIT/IFO readback"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_send_click_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-viewport-centre-updown-synchronous-click-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "targeted_exact_tupdown_candidate_minus_increment_then_send_wm_lbutton_top_xy_then_apply_ok_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationUpDownSendClickReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, remoteCodeInjection: false, locationEditTransport: "targeted_TUpDown_SendMessage_WM_LBUTTONDOWN_UP", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  const restoreSource = () => { attempt.cancelUnbridgedState = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); attempt.contextAfterCancel = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.contextAfterCancel.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.contextAfterCancel.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_send_click_cancel_context_unverified:${JSON.stringify({ context: attempt.contextAfterCancel, adjustment })}`); attempt.openAfterCancel = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.sourceReadbackAfterCancel = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openAfterCancel.processId !== windows.processId || !sameLocationCoordinates(attempt.sourceReadbackAfterCancel.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_updown_send_click_cancel_readback_unverified:${JSON.stringify({ openAfterCancel: attempt.openAfterCancel, fields: attempt.sourceReadbackAfterCancel.fields, source })}`); };
  try {
    attempt.sendClick = runAtom("key-aurora-toolset-adjust-location-position-updown-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", formatLocationCoordinate(xy.x, locationBefore.fields[0].text), "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text), "--focusTransport", "targeted_tedit_click", "--keyTarget", "updown", "--actionTransport", "send_mouse_top"]);
    if (attempt.sendClick.processId !== windows.processId || attempt.sendClick.stageMatchesCandidate !== true) { restoreSource(); throw new Error(`bootstrap_invalid_location_adjust_location_updown_send_click_state_missing:${JSON.stringify({ sendClick: attempt.sendClick, sourceReadbackAfterCancel: attempt.sourceReadbackAfterCancel })}`); }
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) { restoreSource(); throw new Error(`bootstrap_invalid_location_adjust_location_updown_send_click_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy })}`); }
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_send_click_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_updown_send_click_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_updown_send_click_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_updown_send_click_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-updown-send-click", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationManualXFocusExit(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 10, y: 10 }; const source = { x: 10, y: 14.53, z: 3.2 }; const sendClickAttempts = manifest.invalidLocationAdjustLocationUpDownSendClickReconciliationAttempts ?? []; const manualAttempts = manifest.invalidLocationAdjustLocationManualXFocusExitReconciliationAttempts ?? []; const sendClickFailure = String(manifest.error ?? "").startsWith("bootstrap_invalid_location_adjust_location_updown_send_click_state_missing:");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && sendClickFailure && sendClickAttempts.length === 1 && sendClickAttempts[0]?.mode === "targeted_exact_tupdown_candidate_minus_increment_then_send_wm_lbutton_top_xy_then_apply_ok_reopen_readback_before_save" && manualAttempts.length === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_manual_x_focus_exit_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-manual-x-focus-exit", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_manual_x_focus_exit_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["the corrected bounded WM_GETTEXT probe proves a user-entered X=10.00 while Y remains 14.53 and Z remains 3.20", "preserve that X text, transition X to Y so the retail X OnExit runs, set only Y=10.00, then transition Y to Z so the retail Y OnExit runs", "require Apply then OK and a corrected fresh-dialog readback of X=10.00/Y=10.00/Z=3.20 before the one native Save/GIT/IFO readback", "on any missing bridge, preserve the visible dialog and do not save or cancel the user-entered X state"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_exit_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-manual-x-focus-exit-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "preserve_user_entered_x_then_targeted_tedit_focus_exit_y_apply_ok_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationManualXFocusExitReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, preservesUserEnteredX: true, locationEditTransport: "targeted_TEdit_focus_transitions+WM_SETTEXT+native_OnExit", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.focusExit = runAtom("focus-exit-aurora-toolset-adjust-location-xy-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", locationBefore.fields[0].text, "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.focusExit.processId !== windows.processId || attempt.focusExit.uiMatchesCandidate !== true) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_exit_state_missing:${JSON.stringify({ focusExit: attempt.focusExit })}`);
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_exit_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_exit_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_exit_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_exit_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_exit_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-manual-x-focus-exit", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function bootstrapReconcileHakAttachedInvalidLocationAdjustLocationManualXFocusType(declaration, declarationPath, outDir) {
  const manifestPath = resolve(outDir, "bootstrap-manifest.json"); const manifest = readJson(manifestPath); const xy = { x: 10, y: 10 }; const source = { x: 10, y: 14.53, z: 3.2 }; const manualExitAttempts = manifest.invalidLocationAdjustLocationManualXFocusExitReconciliationAttempts ?? []; const manualTypeAttempts = manifest.invalidLocationAdjustLocationManualXFocusTypeReconciliationAttempts ?? []; const exitReadbackFailure = String(manifest.error ?? "").includes("set_y_readback_mismatch:14,53");
  const authorized = manifest.version === "aurora-toolset-vertical-slice-bootstrap-manifest/v1" && manifest.declarationSha256 === sha256FileText(declaration) && manifest.status === "failed" && manifest.blockerCode === "bootstrap_create_failed" && manifest.failureCode === "unclassified" && exitReadbackFailure && manualExitAttempts.length === 1 && manualExitAttempts[0]?.mode === "preserve_user_entered_x_then_targeted_tedit_focus_exit_y_apply_ok_reopen_readback_before_save" && manualTypeAttempts.length === 0 && JSON.stringify(manifest.haks?.map((hak) => hak.resref)) === JSON.stringify(declaration.haks.map((hak) => hak.resref)) && Boolean(manifest.module?.sha256) && existsSync(resolve(declaration.module.path));
  if (!authorized) throw new Error("bootstrap_invalid_location_adjust_location_manual_x_focus_type_not_authorized_for_state");
  if (options.dryRun === "true") { print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-manual-x-focus-type", mode: "dry-run", status: "authorized_for_invalid_location_adjust_location_manual_x_focus_type_reconcile", startsToolset: false, reusesToolset: true, opensModule: false, usesGlobalInput: false, candidate: xy, requires: ["the focus-exit lane acquired the exact target field but WM_SETTEXT did not update Y", "repeat the native user-equivalent edit only through the already focused TEdit's EM_SETSEL, WM_CLEAR, and per-character WM_KEYDOWN/WM_CHAR/WM_KEYUP sequence, with corrected bounded WM_GETTEXT after every clear and typed value", "preserve X=10.00, set only Y=10.00, then require Apply, OK, fresh-dialog readback, and one native Save/GIT/IFO readback", "on a missing key bridge, preserve the visible dialog and do not save or cancel the user-entered X state"] }); return; }
  const exactDirtyFrame = `BioWare Aurora Neverwinter Nights Toolset v89.8193.37-17 - ${declaration.module.resref}.mod*`; const windows = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const frames = (windows.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const dialogs = (windows.windows ?? []).filter((window) => window.className === "TdlgLocation" && window.text === "Adjust Location"); const unexpected = (windows.windows ?? []).filter((window) => !["TfrmFrame", "TApplication", "TdlgLocation"].includes(window.className)); const locationBefore = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []);
  if (windows.responding !== true || frames.length !== 1 || dialogs.length !== 1 || unexpected.length !== 0 || !sameLocationCoordinates(locationBefore.fields ?? [], source)) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_type_preflight_unverified:${JSON.stringify({ windows, frames, dialogs, unexpected, locationBefore, source })}`);
  const attempt = { at: new Date().toISOString(), route: "aurora-invalid-location-adjust-location-manual-x-focus-type-continuation/v1", candidate: { x: xy.x, y: xy.y, z: locationBefore.fields[2].text, zPolicy: "preserve_native_z_per_owner_geometry_instruction" }, preflight: { windows, locationBefore }, mode: "preserve_user_entered_x_then_targeted_tedit_native_key_xy_apply_ok_reopen_readback_before_save" }; manifest.invalidLocationAdjustLocationManualXFocusTypeReconciliationAttempts = [attempt]; manifest.status = "recovering"; manifest.safety = { ...manifest.safety, startsOneToolsetProcess: false, reusesOneToolsetProcess: true, noHakRetry: true, noCreaturePlacementReplay: true, noAppearanceReplay: true, noGlobalInput: true, preservesUserEnteredX: true, locationEditTransport: "targeted_TEdit_EM_SETSEL+WM_CLEAR+WM_KEYDOWN_CHAR_UP+native_OnExit", applyBeforeOk: true, preservesNativeZ: true }; writeJson(manifestPath, manifest);
  try {
    attempt.focusType = runAtom("focus-type-aurora-toolset-adjust-location-xy-no-global-input.mjs", ["--expectedX", locationBefore.fields[0].text, "--expectedY", locationBefore.fields[1].text, "--expectedZ", locationBefore.fields[2].text, "--x", locationBefore.fields[0].text, "--y", formatLocationCoordinate(xy.y, locationBefore.fields[1].text)]);
    if (attempt.focusType.processId !== windows.processId || attempt.focusType.uiMatchesCandidate !== true) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_type_state_missing:${JSON.stringify({ focusType: attempt.focusType })}`);
    attempt.applyLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Apply", "--expectDialogCloses", "false", "--transport", "post"]); attempt.afterApplyFields = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (!sameLocationXY(attempt.afterApplyFields.fields ?? [], xy) || attempt.afterApplyFields.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_type_apply_ui_readback_mismatch:${JSON.stringify({ fields: attempt.afterApplyFields.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.commitLocation = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "OK", "--expectDialogCloses", "true", "--transport", "post"]); const afterCommit = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const afterCommitFrames = (afterCommit.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const afterCommitUnexpected = (afterCommit.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (afterCommit.responding !== true || afterCommitFrames.length !== 1 || afterCommitUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_type_commit_unverified:${JSON.stringify({ afterCommit, afterCommitFrames, afterCommitUnexpected })}`);
    attempt.context = runAtom("inspect-aurora-toolset-area-tree-object-context-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--objectText", "Dwarf Mercenary"]); const adjustment = (attempt.context.popup?.items ?? []).filter((item) => item.text === "&Adjust Location" && item.id === 3 && item.position === 1 && item.enabled === true && item.separator !== true); if (attempt.context.processId !== windows.processId || adjustment.length !== 1) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_type_adjust_menu_unverified:${JSON.stringify({ context: attempt.context, adjustment })}`); attempt.openReadback = runAtom("invoke-aurora-toolset-visible-context-menu-accelerator-no-global-input.mjs", ["--text", "&Adjust Location", "--expectedId", "3", "--expectedPosition", "1", "--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location"]); attempt.locationReadback = runAtom("probe-aurora-toolset-adjust-location-fields-no-global-input.mjs", []); if (attempt.openReadback.processId !== windows.processId || attempt.openReadback.accelerator !== "A" || !sameLocationXY(attempt.locationReadback.fields ?? [], xy) || attempt.locationReadback.fields[2]?.text !== locationBefore.fields[2].text) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_type_reopen_readback_mismatch:${JSON.stringify({ openReadback: attempt.openReadback, fields: attempt.locationReadback.fields, xy, z: locationBefore.fields[2].text })}`);
    attempt.cancelReadback = runAtom("click-aurora-toolset-dialog-button-no-global-input.mjs", ["--dialogClass", "TdlgLocation", "--dialogTitle", "Adjust Location", "--buttonText", "Cancel", "--expectDialogCloses", "true", "--transport", "post"]); const beforeSave = runAtom("inspect-aurora-toolset-visible-windows-no-global-input.mjs", []); const beforeSaveFrames = (beforeSave.windows ?? []).filter((window) => window.className === "TfrmFrame" && window.text === exactDirtyFrame); const beforeSaveUnexpected = (beforeSave.windows ?? []).filter((window) => !["TfrmFrame", "TApplication"].includes(window.className)); if (beforeSave.responding !== true || beforeSaveFrames.length !== 1 || beforeSaveUnexpected.length !== 0) throw new Error(`bootstrap_invalid_location_adjust_location_manual_x_focus_type_before_save_unverified:${JSON.stringify({ beforeSave, beforeSaveFrames, beforeSaveUnexpected })}`);
    manifest.stages.save = runAtom("save-aurora-toolset-module-no-global-input.mjs", ["--module", `${declaration.module.resref}.mod`, "--modulePath", resolve(declaration.module.path), "--frameHwnd", String(beforeSaveFrames[0].hwnd)]); manifest.nativeGitReadback = bindNativeGitReadback(declaration, runAtom("read-aurora-toolset-bootstrap-git-readback.mjs", ["--module", resolve(declaration.module.path), "--area", declaration.area.resref])); manifest.nativeEntryReadback = readNativeEntryReadback(declaration); manifest.module = fileIdentityOrLocked(declaration.module.path); manifest.status = "saved"; manifest.blockerCode = "bootstrap_saved_pending_geometry"; manifest.failureCode = "bootstrap_saved_pending_geometry"; manifest.error = "bootstrap_saved_pending_geometry"; manifest.toolsetProcessId = manifest.stages.save.processId; attempt.result = { save: manifest.stages.save, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module }; writeJson(manifestPath, manifest); print({ ok: true, command: "bootstrap-reconcile-hak-attached-invalid-location-adjust-location-manual-x-focus-type", status: manifest.status, manifestPath, proofClaimed: false, runtimeClaimed: false, startsToolset: false, reusesToolset: true, usesGlobalInput: false, hakReplayed: false, creatureReplayed: false, appearanceReplayed: false, nativeGitReadback: manifest.nativeGitReadback, module: manifest.module });
  } catch (error) { manifest.status = "failed"; manifest.blockerCode = classifyBootstrapFailure(error); manifest.error = error instanceof Error ? error.message : String(error); manifest.failureCode = classifyBootstrapFailureCode(manifest.error, declaration.module.resref); writeJson(manifestPath, manifest); throw error; }
}

function validateImmutableProfile(profile) {
  if (profile.version !== "aurora-toolset-vertical-slice-profile/v1" || !profile.id || !/^[a-f0-9]{64}$/u.test(profile.module?.sha256 ?? "")) throw new Error("vertical_slice_profile_identity_invalid");
  if (!profile.module?.resref || !profile.module?.area || !Array.isArray(profile.orderedHakList) || profile.orderedHakList.length === 0 || !Array.isArray(profile.fixtures) || profile.fixtures.length === 0) throw new Error("vertical_slice_profile_content_invalid");
  if (profile.geometryGate?.status !== "verified" || profile.runtime?.required !== true || profile.fastRunner === "m6") throw new Error("vertical_slice_proof_gates_invalid");
}

function validateGeometryGate(gate, declaration, moduleSha256, haks, nativeReadback, nativeEntryReadback) {
  const failures = [];
  if (gate.version !== "aurora-vertical-slice-native-geometry-gate/v1") failures.push("geometry_gate_identity_invalid");
  if (gate.declarationId !== declaration.id || gate.moduleSha256 !== moduleSha256 || gate.area !== declaration.area.resref) failures.push("geometry_gate_target_mismatch");
  if (nativeEntryReadback?.area !== declaration.area.resref.toLowerCase() || JSON.stringify(gate.entryPoint) !== JSON.stringify(nativeEntryReadback?.position) || JSON.stringify(gate.fixtures) !== JSON.stringify(nativeReadback?.fixtures?.map((fixture) => ({ id: fixture.id, position: fixture.position })))) failures.push("geometry_gate_geometry_mismatch");
  const expectedFixtureObservations = nativeReadback?.fixtures?.map((fixture) => ({ id: fixture.id, templateResRef: fixture.templateResRef, appearanceType: fixture.appearanceType, position: fixture.position, nativeSaveAccepted: true, savedGitReadback: true, accessibleSurface: true }));
  if (!Array.isArray(gate.fixtureObservations) || JSON.stringify(gate.fixtureObservations) !== JSON.stringify(expectedFixtureObservations)) failures.push("geometry_gate_fixture_surface_observation_invalid");
  if (gate.nativeSave?.areaWasSaved !== true || gate.nativeSave?.invalidLocationsDialog !== false || gate.nativeSave?.inaccessibleObjectsDialog !== false || !String(gate.nativeSave?.statusText ?? "").includes("Area was saved")) failures.push("area_geometry_invalid");
  if (gate.entryPointAccessible !== true || gate.fixturesAccessible !== true || JSON.stringify(gate.orderedHakList) !== JSON.stringify(haks.map((hak) => ({ resref: hak.resref, sha256: hak.sha256 })))) failures.push("geometry_gate_semantic_readback_invalid");
  if (failures.length) throw new Error(`bootstrap_geometry_gate_rejected:${failures.join(",")}`);
}

function waitForCreatureProperties() { const deadline = Date.now() + 8000; let last = "not_seen"; while (Date.now() < deadline) { try { const probe = runAtom("probe-aurora-toolset-dialog-controls-no-global-input.mjs", ["--class", "TdlgCreatureEdit", "--title", "Creature Properties"]); const visible = probe.controls?.filter((item) => item.visible) ?? []; if (visible.some((item) => item.text === "OK") && visible.some((item) => item.className === "TComboBox")) return; last = "controls_not_ready"; } catch (error) { last = error instanceof Error ? error.message : String(error); } Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 80); } throw new Error(`bootstrap_creature_properties_wait_timeout:${last}`); }
function runAtom(name, args, timeout = 60000, env = {}) { const output = execFileSync(process.execPath, [resolve(here, name), ...args], { encoding: "utf8", windowsHide: true, timeout, maxBuffer: 16 * 1024 * 1024, env: { ...process.env, ...env } }); return JSON.parse(output.trim()); }
function listAuroraProcesses() { const output = execFileSync("powershell.exe", ["-NoProfile", "-Command", "@(Get-Process nwtoolset,nwmain -ErrorAction SilentlyContinue | Select-Object ProcessName,Id,Responding,MainWindowTitle,StartTime) | ConvertTo-Json -Compress"], { encoding: "utf8", windowsHide: true, timeout: 15000 }).trim(); if (!output || output === "null") return []; const parsed = JSON.parse(output); return Array.isArray(parsed) ? parsed : [parsed]; }
function baseBootstrapManifest(declaration, declarationPath, outDir) { return { version: "aurora-toolset-vertical-slice-bootstrap-manifest/v1", createdAt: new Date().toISOString(), declarationId: declaration.id, declarationPath, declarationSha256: sha256FileText(declaration), artifactDir: outDir, status: "started", stages: { haks: [] }, safety: { usesGlobalInput: false, startsOneToolsetProcess: true, startsNwn: false, directAtomPublicRoute: false } }; }
function classifyBootstrapFailure(error) { const value = error instanceof Error ? error.message : String(error); if (/save_as_/iu.test(value)) return "bootstrap_initial_save_failed"; if (/invalid locations|inaccess/iu.test(value)) return "area_geometry_invalid"; if (/hak/iu.test(value)) return "bootstrap_hak_attach_failed"; return "bootstrap_create_failed"; }
function classifyBootstrapFailureCode(error, moduleResref) { const value = String(error ?? ""); if (/native_save_error_modal|invalid locations|area was not saved|inaccessable objects|inaccessible objects/iu.test(value)) return "area_geometry_invalid"; if (value.includes(`edit_readback_mismatch::${moduleResref}`)) return `module_name_edit_readback_blank:${moduleResref}`; if (value.includes("edit_expected_before_mismatch::")) return "module_name_expected_before_environment_missing"; if (isRecoverableAreaListParseFailure(value)) return "area_tileset_list_atom_parse_failure"; if (isRecoverableModuleWizardFinishFailure(value)) return "module_area_selection_missing"; if (isRecoverablePostFinishFrameFailure(value)) return "module_wizard_finished_but_initial_save_missing"; if (isRecoverableSaveAsMonitorFailure(value)) return "initial_save_modal_monitor_policy_rejected"; return "unclassified"; }
function isRecoverableBlankModuleNameFailure(manifest, moduleResref) { return manifest.failureCode === `module_name_edit_readback_blank:${moduleResref}` || String(manifest.error ?? "").includes(`edit_readback_mismatch::${moduleResref}`); }
function isRecoverableExpectedBeforeEnvironmentFailure(error) { return String(error ?? "").includes("edit_expected_before_mismatch::"); }
function isRecoverableAreaListParseFailure(error) { const value = String(error ?? ""); return value.includes("InvalidVariableReferenceWithDrive") && value.includes("select-aurora-toolset-dialog-list-item-validated.mjs"); }
function isRecoverableModuleWizardFinishFailure(error) { const value = String(error ?? ""); return value.includes("module_wizard_finish_not_enabled") && value.includes("create-aurora-toolset-module-and-area-no-global-input.mjs"); }
function isRecoverableModuleFinishEnableTimeout(error) { const value = String(error ?? ""); return value.includes("enabled_control_wait_timeout:TdlgModuleWizard:Module Wizard:Finish:control_disabled:Finish") && value.includes("create-aurora-toolset-module-and-area-no-global-input.mjs"); }
function isRecoverablePostFinishFrameFailure(error) { const value = String(error ?? ""); return value.includes("module_frame_not_settled") && value.includes("create-aurora-toolset-module-and-area-no-global-input.mjs"); }
function isRecoverableSaveAsMonitorFailure(error) { const value = String(error ?? ""); return value.includes("save_as_dialog_not_on_display1") && value.includes("persist-aurora-toolset-unsaved-module-save-as-no-global-input.mjs"); }
function atoms() { return ["create-aurora-toolset-module-and-area-no-global-input.mjs", "persist-aurora-toolset-unsaved-module-save-as-no-global-input.mjs", "attach-aurora-toolset-module-hak-no-global-input.mjs", "inspect-aurora-toolset-palette-no-global-input.mjs", "invoke-aurora-toolset-visible-context-menu-item-no-global-input.mjs", "save-aurora-toolset-module-no-global-input.mjs", "aurora-vertical-slice-native-geometry-gate/v1", "aur-s07-runtime-execution.mjs"]; }
function fileIdentity(path) { const full = resolve(path); if (!existsSync(full) || statSync(full).size <= 0) throw new Error(`bootstrap_identity_input_missing_or_empty:${full}`); return { path: full, bytes: statSync(full).size, sha256: createHash("sha256").update(readFileSync(full)).digest("hex") }; }
function fileIdentityOrLocked(path) { const full = resolve(path); if (!existsSync(full) || statSync(full).size <= 0) throw new Error(`bootstrap_identity_input_missing_or_empty:${full}`); try { return fileIdentity(full); } catch (error) { if (/EBUSY|EPERM|denied/iu.test(String(error?.message ?? error))) return { path: full, bytes: statSync(full).size, sha256: null, hashStatus: "unknown_os_locked" }; throw error; } }
function sha256FileText(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function writeJson(path, value) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
function requiredPath(value, name) { if (!value) throw new Error(`missing:${name}`); return resolve(value); }
function requiredText(value, name) { const text = String(value ?? "").trim(); if (!text) throw new Error(`missing:${name}`); return text; }
function parseArgs(argv) { const result = {}; for (let i = 0; i < argv.length; i += 2) { const token = argv[i], value = argv[i + 1]; if (!token?.startsWith("--") || value === undefined || value.startsWith("--")) throw new Error(`invalid:${token ?? "end"}`); result[token.slice(2)] = value; } return result; }
function resref(value) { return typeof value === "string" && /^[a-z0-9_]{1,32}$/iu.test(value); }
function text(value) { return typeof value === "string" && value.trim().length > 0; }
function positive(value) { return Number.isFinite(Number(value)) && Number(value) >= 0; }
function print(value) { process.stdout.write(`${JSON.stringify(value, null, 2)}\n`); }
