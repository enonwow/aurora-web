#!/usr/bin/env node

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? "backend/docs/aurora-reverse/evidence/stage2-native-action-discovery-2026-07-14");
const summaryPath = resolve(root, "summary.json");
const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
const failures = [];
const check = (value, code) => { if (!value) failures.push(code); };

check(summary.status === "blocked", "status_not_blocked");
check(summary.module?.sha256Before === summary.module?.sha256After, "module_hash_changed");
check(summary.session?.toolsetProcessCountBefore === 0 && summary.session?.toolsetProcessCountAfter === 0, "toolset_process_lifecycle_invalid");
check(summary.session?.usesGlobalCursor === false && summary.session?.usesGlobalKeyboard === false && summary.session?.usesGlobalMouse === false, "global_input_used");
check(summary.copyPaste?.nativeCopy?.commandId === 59 && summary.copyPaste?.nativeCopy?.invoked === true, "copy_not_exactly_proven");
check(summary.copyPaste?.nativePaste?.commandId === 61 && summary.copyPaste?.nativePaste?.enabledAfterCopy === false, "paste_blocker_not_proven");
check(summary.placeableTransform?.selectedObject === "Floor Lever", "placeable_identity_missing");
check(summary.placeableTransform?.treeContextMenu?.adjustLocation?.commandId === 3 && summary.placeableTransform?.treeContextMenu?.adjustLocation?.enabled === true, "adjust_location_menu_not_proven");
check(summary.placeableTransform?.adjustLocationInvocation?.visibleTdlgLocationAfter === 0, "adjust_location_negative_readback_missing");
check(summary.placeableTransform?.propertiesInvocation?.commandId === 19 && summary.placeableTransform?.propertiesInvocation?.invoked === true && summary.placeableTransform?.propertiesInvocation?.visibleToolsetModalAfter === 0, "properties_negative_readback_missing");
for (const path of Object.values(summary.artifacts ?? {})) {
  const absolute = resolve(root, path);
  check(existsSync(absolute) && statSync(absolute).size > 32, `artifact_missing_or_small:${path}`);
}
check(existsSync(resolve(root, "parser-baseline/objects.csv")), "parser_baseline_missing");

const result = {
  ok: failures.length === 0,
  status: failures.length === 0 ? "verified_packet" : "failed_packet",
  functionAccepted: false,
  acceptanceReason: "Discovery packet proves blockers only; it contains no saved isolated +1 delta or full placeable transform.",
  failures,
};
writeFileSync(resolve(root, "validator-result.json"), `${JSON.stringify(result, null, 2)}\n`, "utf8");
console.log(JSON.stringify(result, null, 2));
if (failures.length) process.exitCode = 1;
