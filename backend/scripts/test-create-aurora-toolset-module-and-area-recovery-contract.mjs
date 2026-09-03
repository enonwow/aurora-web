#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend/scripts/create-aurora-toolset-module-and-area-no-global-input.mjs"), "utf8");

assert.match(source, /reuseModuleWizard/);
assert.match(source, /resumeModuleWizardPage/);
assert.match(source, /allowUnsavedPostFinish/);
assert.match(source, /initialSaveRequired/);
assert.match(source, /moduleWizardPage/);
assert.match(source, /preflight_expected_\$\{expected\}_toolset_processes/);
assert.match(source, /if \(!config\.reuseModuleWizard\) \{/);
assert.match(source, /await resolveKnownStartupRecovery\(\);/);
assert.match(source, /The toolset did not close properly last time it was used/);
assert.match(source, /Pressing 'No' will destroy the backup/);
assert.match(source, /buttonText: affirmative/);
assert.match(source, /expectedPage: config\.resumeModuleWizardPage/);
assert.match(source, /expectedBlankName: config\.resumeModuleWizardPage === "name"/);
assert.match(source, /--expectedBefore/);
assert.match(source, /config\.reuseModuleWizard \? "" : "__UNSET__"/);
assert.match(source, /after-area-finish/);
assert.match(source, /after-module-area-list/);
assert.match(source, /"module-area-next"/);
assert.match(source, /waitForDialog\("TdlgModuleWizard", "Module Wizard", \{ requiredClass: "TListBox", requiredControlText: \["&Next >"\] \}\)/);
assert.match(source, /click\("TdlgModuleWizard", "Module Wizard", "&Next >", false\)/);
assert.match(source, /waitForEnabledControl\("TdlgModuleWizard", "Module Wizard", "Finish"\)/);
const moduleAreaTransition = source.slice(source.indexOf('record("module-area-next"'));
assert.ok(moduleAreaTransition.indexOf('click("TdlgModuleWizard", "Module Wizard", "&Next >", false)') < moduleAreaTransition.indexOf('waitForEnabledControl("TdlgModuleWizard", "Module Wizard", "Finish")'));
assert.match(source, /startsToolset: false/);
assert.match(source, /"post",/);
assert.doesNotMatch(source, /expectCloses \? "post" : "send-timeout"/);
assert.doesNotMatch(source, /SetCursorPos|SendInput|SendKeys|mouse_event|keybd_event/);
