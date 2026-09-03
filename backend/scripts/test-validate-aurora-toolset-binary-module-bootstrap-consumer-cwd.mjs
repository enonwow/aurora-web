#!/usr/bin/env node
/* Opt-in integration regression: uses a caller-owned binary profile without
 * relying on aurora-web as the current working directory. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const profile = process.env.AURORA_BINARY_BOOTSTRAP_INTEGRATION_PROFILE;
const consumerCwd = process.env.AURORA_BINARY_BOOTSTRAP_INTEGRATION_CWD;
if (!profile || !consumerCwd) {
  console.log("SKIP: set AURORA_BINARY_BOOTSTRAP_INTEGRATION_PROFILE and AURORA_BINARY_BOOTSTRAP_INTEGRATION_CWD for the caller-owned MOD integration regression.");
  process.exit(0);
}
assert.equal(existsSync(profile), true, "integration profile must exist");
assert.equal(existsSync(consumerCwd), true, "consumer CWD must exist");
const validator = resolve("backend/scripts/validate-aurora-toolset-binary-module-bootstrap.mjs");
const output = execFileSync(process.execPath, [validator, "--mode", "preflight", "--profile", resolve(profile)], { encoding: "utf8", cwd: resolve(consumerCwd), timeout: 120000 });
const result = JSON.parse(output);
assert.equal(result.status, "binary_bootstrap_structural_readback_valid");
assert.equal(result.startsToolset, false);
assert.equal(result.startsNwn, false);
assert.equal(result.usesGlobalInput, false);
