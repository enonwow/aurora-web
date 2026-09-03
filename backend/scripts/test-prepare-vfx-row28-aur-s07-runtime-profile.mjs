#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve("backend/scripts/prepare-vfx-row28-aur-s07-runtime-profile.py"), "utf8");
for (const required of [
  "SOURCE_MODULE_SHA256",
  "ordered_hak_count_mismatch",
  "predecessor_area_semantics_mismatch",
  "native_save_gate_invalid",
  "native_git_readback_invalid",
  "native_entry_readback_invalid",
  "EffectVisualEffect(VFX_FNF_METEOR_SWARM)",
  "central_guarded_test_module_action",
  "intentionalTriggerCount",
]) assert.match(source, new RegExp(required.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")));
assert.doesNotMatch(source, /nwmain\.exe|Start-Process|subprocess\.Popen/u);
process.stdout.write(JSON.stringify({ ok: true, status: "vfx_row28_aur_s07_profile_preparer_contract_valid" }) + "\n");
