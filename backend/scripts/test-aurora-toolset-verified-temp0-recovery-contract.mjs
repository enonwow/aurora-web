#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  createVerifiedTemp0RecoveryAdmission,
  inspectExactTemp0Cache,
  validateVerifiedTemp0RecoveryAdmission,
} from "./lib/aurora-toolset-verified-temp0-recovery.mjs";

const root = mkdtempSync(join(tmpdir(), "aurora-verified-temp0-recovery-"));
const modules = resolve(root, "Neverwinter Nights", "modules");
const modulePath = resolve(modules, "m2a_test.mod");
const temp0Path = resolve(modules, "temp0");
mkdirSync(temp0Path, { recursive: true });

const resources = [
  { resref: "module", type: 2014, extension: "ifo", bytes: Buffer.from("IFO V3.2 exact module info\n") },
  { resref: "m2a_area", type: 2012, extension: "are", bytes: Buffer.from("ARE V3.2 exact area\n") },
  { resref: "m2a_area", type: 2023, extension: "git", bytes: Buffer.from("GIT V3.2 exact instances\n") },
  { resref: "m2a_area", type: 2046, extension: "gic", bytes: Buffer.from("GIC V3.2 exact comments\n") },
  { resref: "fixture", type: 2027, extension: "utc", bytes: Buffer.from("UTC V3.2 exact creature\n") },
  { resref: "repute", type: 2038, extension: "fac", bytes: Buffer.from("FAC V3.2 exact factions\n") },
];
writeFileSync(modulePath, buildErf(resources));
for (const resource of resources) writeFileSync(resolve(temp0Path, `${resource.resref}.${resource.extension}`), resource.bytes);

const inspection = inspectExactTemp0Cache({ modulePath, temp0Path });
assert.equal(inspection.version, "aurora-toolset-exact-temp0-cache/v1");
assert.equal(inspection.module.sha256, sha256(readFileSync(modulePath)));
assert.equal(inspection.resources.length, resources.length);
assert.ok(inspection.resources.every((resource) => resource.identical === true));

const admission = createVerifiedTemp0RecoveryAdmission({ modulePath, temp0Path });
assert.equal(admission.version, "aurora-toolset-verified-temp0-recovery-admission/v1");
assert.equal(validateVerifiedTemp0RecoveryAdmission(admission, { modulePath, temp0Path }).cacheIdentitySha256, admission.cacheIdentitySha256);

const mutatedAdmission = structuredClone(admission);
mutatedAdmission.module.sha256 = "0".repeat(64);
expectBlocked(
  () => validateVerifiedTemp0RecoveryAdmission(mutatedAdmission, { modulePath, temp0Path }),
  "VERIFIED_TEMP0_RECOVERY_ADMISSION_MISMATCH",
);

const areaPath = resolve(temp0Path, "m2a_area.are");
const areaBytes = readFileSync(areaPath);
writeFileSync(areaPath, Buffer.from("changed"));
expectBlocked(() => inspectExactTemp0Cache({ modulePath, temp0Path }), "VERIFIED_TEMP0_RESOURCE_MISMATCH");
writeFileSync(areaPath, areaBytes);

const extraPath = resolve(temp0Path, "extra.txt");
writeFileSync(extraPath, "unexpected");
expectBlocked(() => inspectExactTemp0Cache({ modulePath, temp0Path }), "VERIFIED_TEMP0_FILE_SET_MISMATCH");
rmSync(extraPath);

rmSync(resolve(temp0Path, "fixture.utc"));
expectBlocked(() => inspectExactTemp0Cache({ modulePath, temp0Path }), "VERIFIED_TEMP0_FILE_SET_MISMATCH");
writeFileSync(resolve(temp0Path, "fixture.utc"), resources.find((resource) => resource.resref === "fixture").bytes);

const linkedPath = resolve(temp0Path, "m2a_area.are");
rmSync(linkedPath);
mkdirSync(linkedPath);
expectBlocked(() => inspectExactTemp0Cache({ modulePath, temp0Path }), "VERIFIED_TEMP0_RESOURCE_NOT_FILE");

const binaryRouteSource = readFileSync(resolve("backend/scripts/aurora-toolset-binary-module-native-geometry.mjs"), "utf8");
const prepareSource = readFileSync(resolve("backend/scripts/prepare-aurora-model-proof-120s.mjs"), "utf8");
const openerSource = readFileSync(resolve("backend/scripts/open-last-city-module-and-area-toolset-no-global-input.mjs"), "utf8");
const clientFallbackSource = readFileSync(resolve("backend/scripts/post-aurora-toolset-verified-temp0-recovery-client-click-no-global-input.mjs"), "utf8");
assert.match(binaryRouteSource, /--installedModulePath/);
assert.match(binaryRouteSource, /verifiedTemp0RecoveryAdmission/);
assert.match(binaryRouteSource, /--verifiedTemp0RecoveryAdmission/);
assert.match(binaryRouteSource, /resume-verified-temp0-recovery-client-click-dry-run/);
assert.match(binaryRouteSource, /post-aurora-toolset-verified-temp0-recovery-client-click-no-global-input\.mjs/);
assert.match(binaryRouteSource, /verified_temp0_recovery_yes_client_click/);
assert.match(prepareSource, /--installedModulePath/);
assert.match(prepareSource, /continue-verified-temp0-recovery-client-click-dry-run/);
assert.match(openerSource, /validateVerifiedTemp0RecoveryAdmission/);
assert.match(openerSource, /AURORA_TOOLSET_VERIFIED_TEMP0_RECOVERY/);
assert.match(openerSource, /The toolset did not close properly last time it was used/);
assert.match(openerSource, /\.Replace\(\[string\]\[char\]13, \[string\]::Empty\)/);
assert.doesNotMatch(openerSource, /\.Replace\(\[char\]13, ''\)/);
assert.match(openerSource, /moduleLoadOwner = 'verified_temp0_recovery'/);
assert.match(openerSource, /PostMessage\(\(\[IntPtr\]\[int64\]\$recoveryConfirmationProbe\.yesButtonHwnd\), \$BM_CLICK/);
assert.match(openerSource, /AURORA_TOOLSET_VERIFIED_TEMP0_RECOVERY_ACTION_ALREADY_SUBMITTED/);
assert.match(openerSource, /verified_temp0_recovery_yes_client_click/);
assert.doesNotMatch(openerSource, /SetCursorPos|SendInput|SendKeys|mouse_event|keybd_event/);
assert.match(clientFallbackSource, /recorded BM_CLICK non-settle/);
assert.match(clientFallbackSource, /PostMessage\(\$button,0x0201/);
assert.match(clientFallbackSource, /PostMessage\(\$button,0x0202/);
assert.match(clientFallbackSource, /verified_temp0_recovery_client_click_did_not_close/);
assert.doesNotMatch(clientFallbackSource, /SetCursorPos|SendInput|SendKeys|mouse_event|keybd_event/);
const embeddedPowerShell = extractRawTemplate(
  openerSource,
  "function ensureModuleLoaded(startupLoadPlan) {",
  "const script = String.raw`",
);
const parserCheck = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-Command",
    "$source=[Console]::In.ReadToEnd();$tokens=$null;$errors=$null;[void][System.Management.Automation.Language.Parser]::ParseInput($source,[ref]$tokens,[ref]$errors);if($errors.Count-ne0){$errors|ForEach-Object{$_.ToString()}|Write-Error;exit 1};'embedded_powershell_parse_valid'",
  ],
  {
    input: embeddedPowerShell,
    encoding: "utf8",
    windowsHide: true,
  },
);
assert.equal(parserCheck.status, 0, parserCheck.stderr || parserCheck.stdout);
assert.match(parserCheck.stdout, /embedded_powershell_parse_valid/);

const fallbackPowerShell = extractRawTemplate(
  clientFallbackSource,
  "const source = String.raw`",
  "const source = String.raw`",
);
const fallbackParserCheck = spawnSync(
  "powershell.exe",
  [
    "-NoProfile",
    "-Command",
    "$source=[Console]::In.ReadToEnd();$tokens=$null;$errors=$null;[void][System.Management.Automation.Language.Parser]::ParseInput($source,[ref]$tokens,[ref]$errors);if($errors.Count-ne0){$errors|ForEach-Object{$_.ToString()}|Write-Error;exit 1};'fallback_powershell_parse_valid'",
  ],
  { input: fallbackPowerShell, encoding: "utf8", windowsHide: true },
);
assert.equal(fallbackParserCheck.status, 0, fallbackParserCheck.stderr || fallbackParserCheck.stdout);
assert.match(fallbackParserCheck.stdout, /fallback_powershell_parse_valid/);

console.log(JSON.stringify({
  ok: true,
  status: "aurora_toolset_verified_temp0_recovery_contract_valid",
  resourceCount: resources.length,
  negativeCases: 5,
  usesGlobalInput: false,
}));

function buildErf(entries) {
  const headerSize = 160;
  const keyOffset = headerSize;
  const resourceOffset = keyOffset + entries.length * 24;
  const payloadOffset = resourceOffset + entries.length * 8;
  const totalLength = payloadOffset + entries.reduce((sum, entry) => sum + entry.bytes.length, 0);
  const output = Buffer.alloc(totalLength);
  output.write("MOD ", 0, "ascii");
  output.write("V1.0", 4, "ascii");
  output.writeUInt32LE(entries.length, 16);
  output.writeUInt32LE(keyOffset, 24);
  output.writeUInt32LE(resourceOffset, 28);
  let payloadCursor = payloadOffset;
  for (const [index, entry] of entries.entries()) {
    const key = keyOffset + index * 24;
    output.write(entry.resref, key, 16, "ascii");
    output.writeUInt32LE(index, key + 16);
    output.writeUInt16LE(entry.type, key + 20);
    output.writeUInt32LE(payloadCursor, resourceOffset + index * 8);
    output.writeUInt32LE(entry.bytes.length, resourceOffset + index * 8 + 4);
    entry.bytes.copy(output, payloadCursor);
    payloadCursor += entry.bytes.length;
  }
  return output;
}

function expectBlocked(callback, code) {
  assert.throws(callback, (error) => error?.code === code, `expected ${code}`);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function extractRawTemplate(source, ownerMarker, templateMarker) {
  const ownerStart = source.indexOf(ownerMarker);
  assert.notEqual(ownerStart, -1, `owner marker missing: ${ownerMarker}`);
  const contentStart = source.indexOf(templateMarker, ownerStart) + templateMarker.length;
  assert.ok(contentStart >= templateMarker.length, `template marker missing: ${templateMarker}`);
  const contentEnd = source.indexOf("`;", contentStart);
  assert.notEqual(contentEnd, -1, "raw template terminator missing");
  return source.slice(contentStart, contentEnd);
}
