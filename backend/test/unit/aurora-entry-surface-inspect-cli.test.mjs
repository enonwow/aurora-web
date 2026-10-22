import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const runner = fileURLToPath(new URL("../../scripts/aurora-toolset-binary-module-native-geometry.mjs", import.meta.url));
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("public inspect and all entry command errors perform zero subprocess calls and zero file writes", () => {
  const dir = mkdtempSync(join(tmpdir(), "aurora-entry-inspect-"));
  try {
    const guard = join(dir, "deny-native-and-writes.cjs");
    writeFileSync(guard, `
      const cp = require('node:child_process');
      const fs = require('node:fs');
      const deny = () => { throw new Error('FORBIDDEN_NATIVE_OR_WRITE_PORT'); };
      for (const name of ['exec','execSync','execFile','execFileSync','spawn','spawnSync','fork']) cp[name] = deny;
      for (const name of ['writeFileSync','appendFileSync','renameSync','mkdirSync','unlinkSync','rmSync']) fs[name] = deny;
      require('node:module').syncBuiltinESMExports();
    `);
    const profilePath = join(dir, "profile.json");
    const manifestPath = join(dir, "binary-native-geometry-manifest.json");
    writeFileSync(manifestPath, JSON.stringify({ status: "geometry_saved_pending_entry_observation" }));
    writeFileSync(profilePath, "{invalid json");
    const before = hash(readFileSync(manifestPath));
    function run(args) {
      let output;
      try { output = execFileSync(process.execPath, ["--max-old-space-size=1024", "--require", guard, runner, ...args], { encoding: "utf8", windowsHide: true, timeout: 5000 }); }
      catch (error) { assert.equal(error.status, 2); output = String(error.stdout); }
      assert.doesNotMatch(output, /FORBIDDEN_NATIVE_OR_WRITE_PORT/u);
      const result = JSON.parse(output);
      assert.equal(result.safety.probesProcesses, false);
      assert.equal(result.safety.probesWindows, false);
      assert.equal(result.safety.mutatesSourceManifest, false);
      assert.equal(hash(readFileSync(manifestPath)), before);
      return result;
    }
    assert.equal(run(["geometry-entry-surface-inspect"]).blockerCode, "ENTRY_ARGUMENT_MISSING");
    assert.equal(run(["geometry-entry-surface-inspect", "--profile", profilePath, "--profile", profilePath, "--outDir", dir]).blockerCode, "ENTRY_ARGUMENT_INVALID");
    assert.equal(run(["geometry-entry-surface-inspect", "--profile", profilePath, "--outDir", dir]).blockerCode, "ENTRY_JSON_INVALID");
    assert.equal(run(["geometry-entry-surface-arm", "--profile", profilePath, "--outDir", dir]).blockerCode, "ENTRY_ARGUMENT_MISSING");
    assert.equal(run(["geometry-finalize", "--profile", profilePath, "--outDir", dir]).status, "legacy_unqualified");
    assert.equal(run(["geometry-entry-surface-inspect-dry-run", "--profile", profilePath, "--outDir", dir]).blockerCode, "ENTRY_COMMAND_UNAVAILABLE");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
