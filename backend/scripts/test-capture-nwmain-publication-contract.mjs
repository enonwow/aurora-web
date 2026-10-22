#!/usr/bin/env node
// Exact public-source replay. Only native/media work is replaced by an offline fixture.
import assert from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import * as captureHelpers from "./lib/nwmain-per-window-capture.mjs";

const root = fs.mkdtempSync(path.join(tmpdir(), "nwmain-publication-contract-"));
const parent = fs.realpathSync(tmpdir());
const rows = [];
try {
  for (const kind of ["video", "window"]) for (const mode of ["clean", "concurrent-success", "concurrent-link", ...(kind === "video" ? ["concurrent-failure"] : []), "same-alias", "case-alias", "parent-alias"]) {
    const script = path.resolve(import.meta.dirname, `capture-nwmain-proof-${kind}-no-global-input.mjs`);
    const out = path.join(root, `${kind}-${mode}.${kind === "video" ? "mp4" : "png"}`);
    const alias = mode.endsWith("alias");
    const resultOut = mode === "same-alias" ? out : mode === "case-alias" ? out.toUpperCase() : mode === "parent-alias" ? path.join(root, "not-created", "..", path.basename(out)) : `${out}.json`;
    const encoded = Buffer.from("labeled offline media fixture, never game evidence");
    let dispatches = 0, receiptAttempts = 0, printed = "";
    const args = ["capture", "--captureMethod", "printwindow", "--pid", "42", "--startedAtUtc", "2026-01-01T00:00:00.1234567Z", "--windowHwnd", "9", "--monitorDevice", "fixture-display", "--out", out, "--resultOut", resultOut];
    if (kind === "video") args.push("--ffmpeg", process.execPath, "--durationSeconds", "2", "--fps", "12");
    const fixtureProcess = {argv: [process.execPath, script, ...args], platform: process.platform, stdout: {write: value => { printed += value; }}, exitCode: 0};
    const context = vm.createContext({process: fixtureProcess, Buffer, setTimeout});
    const modules = new Map();
    const provide = (id, values) => {
      const keys = Object.keys(values);
      modules.set(id, new vm.SyntheticModule(keys, function () { for (const key of keys) this.setExport(key, values[key]); }, {context}));
    };
    const forbidden = () => assert.fail("native/media process dispatch is forbidden in this contract");
    const produce = () => {
      dispatches++;
      fs.writeFileSync(out, encoded, {flag: "wx"});
      if (mode === "concurrent-link") fs.linkSync(out, resultOut);
      else if (mode.startsWith("concurrent")) fs.writeFileSync(resultOut, "concurrent-owner", {flag: "wx"});
      if (mode === "concurrent-failure") throw new Error("offline capture failure");
      return {packet: {ok: true, status: "verified", captureMethod: "printwindow", bounds: {width: 1280, height: 720}}, arguments: [], validation: {decode: "offline fixture"}};
    };
    provide("node:child_process", {execFileSync: forbidden, spawn: forbidden, spawnSync: forbidden});
    provide("node:crypto", {createHash});
    provide("node:fs", {...Object.fromEntries(["existsSync", "mkdirSync", "readFileSync", "rmSync"].map(key => [key, fs[key]])),
      writeFileSync: (...arguments_) => { receiptAttempts++; return fs.writeFileSync(...arguments_); }});
    provide("node:path", {dirname: path.dirname, resolve: path.resolve});
    provide("node:url", {fileURLToPath});
    provide("./lib/aurora-model-proof-120s-contract.mjs", {validatePngBytes: forbidden});
    provide("./lib/nwmain-per-window-capture.mjs", {...captureHelpers,
      perWindowPlan: () => ({captureSource: "offline fixture"}), capturePerWindowVideo: async () => produce(), capturePerWindowPng: () => produce().packet});
    const source = fs.readFileSync(script, "utf8");
    const module = new vm.SourceTextModule(source, {context, identifier: script, initializeImportMeta: meta => { meta.url = pathToFileURL(script).href; }});
    await module.link(id => { assert.ok(modules.has(id), `unexpected dependency ${id}`); return modules.get(id); });
    let error;
    try { await module.evaluate({timeout: 3000}); } catch (failure) { error = String(failure.code || failure.message); }
    const verified = printed.includes('"status": "verified"');
    if (alias) {
      assert.equal(dispatches, 0, `${kind}/${mode}: alias must fail before any native dispatch`);
      assert.equal(receiptAttempts, 0);
      assert.equal(fs.existsSync(out), false); assert.equal(verified, false);
      assert.match(error, /capture_output_receipt_alias/u);
    } else {
      assert.equal(dispatches, 1); assert.ok(fs.readFileSync(out).equals(encoded));
      if (mode.startsWith("concurrent")) {
        assert.equal(receiptAttempts, 1, "a receipt conflict must not be retried");
        if (mode === "concurrent-link") assert.ok(fs.readFileSync(resultOut).equals(encoded));
        else assert.equal(fs.readFileSync(resultOut, "utf8"), "concurrent-owner");
        assert.equal(verified, false);
        if (kind === "video") { assert.equal(fixtureProcess.exitCode, 2); assert.match(printed, /receiptPublication/u); }
      } else { assert.equal(verified, true); assert.equal(JSON.parse(fs.readFileSync(resultOut, "utf8")).status, "verified"); }
    }
    rows.push({kind, mode, dispatches, verified});
  }
  console.log(JSON.stringify({ok: true, status: "nwmain_publication_contract_valid", testKind: "exact public source; offline native/media fixture only", cases: rows.length}));
} finally {
  const resolved = fs.realpathSync(root);
  assert.equal(path.dirname(resolved), parent);
  assert.ok(path.basename(resolved).startsWith("nwmain-publication-contract-"));
  fs.rmSync(resolved, {recursive: true, force: true});
}
