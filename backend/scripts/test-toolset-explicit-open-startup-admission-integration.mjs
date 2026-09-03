#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TOOLSET_LOAD_OWNERS,
  TOOLSET_STARTUP_SIGNAL_KINDS,
  buildToolsetStartupLoadPlan,
  evaluateToolsetStartupObservation,
} from "./lib/toolset-startup-load-plan.mjs";

const root = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const runner = resolve(root, "backend/scripts/aurora-toolset-binary-module-native-geometry.mjs");
const opener = resolve(root, "backend/scripts/open-last-city-module-and-area-toolset-no-global-input.mjs");
const dir = mkdtempSync(join(tmpdir(), "aurora-explicit-open-admission-"));
const target = join(dir, "target.mod");
const mru = join(dir, "historic.mod");
const ini = join(dir, "nwtoolset.ini");
const profile = join(dir, "profile.json");
const hex = "a".repeat(64);
writeFileSync(target, "target");
writeFileSync(mru, "historic");
writeFileSync(ini, `[History]\r\nMRU0=${mru}\r\n`);
writeFileSync(profile, JSON.stringify({
  version: "aurora-toolset-binary-module-bootstrap-profile/v1", id: "explicit-open-admission-contract",
  module: { resref: "target", path: target, sha256: hex },
  area: { resref: "area", width: 2, height: 2 }, entryPoint: { area: "area", position: [5, 5, 0] },
  orderedHakList: [{ resref: "hak", path: join(dir, "hak.hak"), sha256: hex }],
  fixtures: [{ id: "fixture", templateResRef: "nw_dwarfmerc001", appearanceType: 15109, position: [10, 10, 0] }],
  noLocalToolsetAdapter: true,
}));

const plan = buildToolsetStartupLoadPlan({ modulePath: target, currentMru0: mru });
assert.equal(plan.expectedMruMatches, false);

// Branch A: a clean, unowned Welcome is observed before any module-load signal.
const welcome = evaluateToolsetStartupObservation({ plan, elapsedMs: 0, stableSurfaceMs: 0, surfaceKind: "welcome" });
assert.equal(welcome.decision, "explicit_open_eligible");
assert.equal(welcome.explicitOpenAllowed, true);
const explicitOwner = evaluateToolsetStartupObservation({ plan, elapsedMs: 1, stableSurfaceMs: 1, surfaceKind: "welcome", loadOwner: TOOLSET_LOAD_OWNERS.EXPLICIT_OPEN });
assert.equal(explicitOwner.loadOwner, TOOLSET_LOAD_OWNERS.EXPLICIT_OPEN);
assert.equal(explicitOwner.explicitOpenAllowed, false);

// Branch B: an MRU load signal wins first and permanently disables explicit open.
const mruWins = evaluateToolsetStartupObservation({
  plan, elapsedMs: 0, stableSurfaceMs: 0, surfaceKind: "welcome",
  observedSignals: [{ kind: TOOLSET_STARTUP_SIGNAL_KINDS.UNEXPECTED_MODULE_WINDOW }],
});
assert.equal(mruWins.decision, "owned_load");
assert.equal(mruWins.loadOwner, TOOLSET_LOAD_OWNERS.EXTERNAL);
assert.equal(mruWins.explicitOpenAllowed, false);
const mruSticky = evaluateToolsetStartupObservation({ plan, elapsedMs: 1, stableSurfaceMs: 1, surfaceKind: "blank_frame", loadOwner: mruWins.loadOwner });
assert.equal(mruSticky.decision, "owned_load");
assert.equal(mruSticky.explicitOpenAllowed, false);

const admission = JSON.parse(execFileSync(process.execPath, [runner, "startup-admission-dry-run", "--profile", profile, "--outDir", join(dir, "out"), "--startupIniPath", ini], { cwd: root, encoding: "utf8" }));
assert.equal(admission.status, "binary_native_explicit_open_startup_admitted");
assert.equal(admission.route.version, "aurora-toolset-explicit-open-startup-admission/v3");
assert.equal(admission.route.mruConflict, true);
assert.equal(admission.route.forbidsOpenAfterLoadOwner, true);

const openerSource = readFileSync(opener, "utf8");
assert.match(openerSource, /approvedToolsetSha256 = "4C156DE898817518E8A97F5D989592894D3C8F48B71D27E2A8B89500CD230F24"/);
assert.match(openerSource, /toolset_binary_semantic_binding_mismatch/);
const welcomeTransport = openerSource.slice(
  openerSource.indexOf("function Invoke-WelcomeOpenExisting"),
  openerSource.indexOf("function Invoke-BlankFrameOpenModuleDialog"),
);
assert.match(welcomeTransport, /BM_GETCHECK/);
assert.match(welcomeTransport, /\$BM_SETCHECK = 0x00F1/);
assert.match(welcomeTransport, /\$LB_GETCURSEL = 0x0188/);
assert.match(welcomeTransport, /\$LB_SETCURSEL = 0x0186/);
assert.match(welcomeTransport, /startNormallyRadioHwnd/);
assert.match(welcomeTransport, /recentModulesListHwnd/);
assert.match(welcomeTransport, /startNormallyBefore/);
assert.match(welcomeTransport, /startNormallyAfterSetCheck/);
assert.match(welcomeTransport, /recentSelectionBeforeClear/);
assert.match(welcomeTransport, /recentSelectionAfterClear/);
assert.match(welcomeTransport, /welcome_recent_module_selection_not_cleared/);
assert.match(welcomeTransport, /\$recentSelectionAfterClear -ne -1/);
assert.match(welcomeTransport, /welcome_radio_group_exclusivity_unverified/);
assert.match(welcomeTransport, /welcome_open_existing_radio_setcheck_send_timeout_failed/);
assert.match(welcomeTransport, /welcome_open_existing_radio_setcheck_not_checked/);
assert.match(welcomeTransport, /PostMessage\(\$okButton, \$BM_CLICK/);
assert.doesNotMatch(welcomeTransport, /Start-Sleep/);
assert.match(openerSource, /className -eq 'TdlgWelcome'/);
assert.match(openerSource, /expected_one_welcome_dialog/);
assert.match(openerSource, /expected_one_welcome_recent_modules_list/);
assert.match(openerSource, /expected_one_open_module_dialog/);
assert.match(openerSource, /open_module_list_selection_readback_mismatch/);
assert.match(openerSource, /GetParent\(IntPtr hWnd\)/);
assert.match(openerSource, /GetDlgCtrlID\(IntPtr hWnd\)/);
assert.match(openerSource, /moduleNameEditHwnd/);
assert.match(openerSource, /SendMessageTimeoutText\(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam/);
assert.match(openerSource, /SendMessageTimeoutBuilder\(IntPtr hWnd, uint Msg, IntPtr wParam, StringBuilder lParam/);
assert.match(openerSource, /\$WM_SETTEXT = 0x000C/);
assert.match(openerSource, /function Get-ControlTextValue/);
assert.match(openerSource, /Get-ControlTextValue \$moduleNameEditHwnd/);
assert.match(openerSource, /control_text_read_timeout/);
assert.match(openerSource, /open_module_name_edit_write_timeout/);
assert.match(openerSource, /open_module_name_edit_write_failed/);
assert.match(openerSource, /exact eModuleName WM_SETTEXT after exact TListBox selection readback/);
assert.doesNotMatch(openerSource, /\$WM_LBUTTONDOWN = 0x0201/);
assert.doesNotMatch(openerSource, /\$LBN_SELCHANGE = 1/);
assert.match(openerSource, /module_name_edit_readback_mismatch/);
assert.match(openerSource, /expected=\$\(\$selectedItemText\):actual=\$\(\$moduleNameEditReadback\)/);
assert.doesNotMatch(openerSource, /expected=\$\{selectedItemText\}:actual=\$\{moduleNameEditReadback\}/);
assert.doesNotMatch(openerSource, /Get-WindowTextValue \$moduleNameEditHwnd/);
assert.match(openerSource, /\$moduleNameEditReadback -cne \$selectedItemText/);
assert.match(openerSource, /PostMessage\(\(\[IntPtr\]\[int64\]\$dialog\.openButtonHwnd\), \$BM_CLICK/);
assert.match(openerSource, /post_welcome_open_transition_progress/);
assert.match(openerSource, /explicit_open_forbidden_after_module_load_claim/);
assert.match(openerSource, /post_welcome_open_transition_anonymous_progress/);
assert.match(openerSource, /Find-StartupModuleLoadSignal \$expectedOpenDialogTransition/);
assert.match(openerSource, /startupNonModuleProgress/);
assert.match(openerSource, /matchedBy = 'expected_module_exact_text'/);
console.log(JSON.stringify({ ok: true, status: "aurora_toolset_explicit_open_startup_admission_integration_valid" }));
