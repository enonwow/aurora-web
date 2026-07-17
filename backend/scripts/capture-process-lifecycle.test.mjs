import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";

import {
  installCaptureProcessGuard,
  terminateCaptureProcessTree,
  terminateProcessTreeSync
} from "./capture-process-lifecycle.mjs";

class FakeRuntimeProcess extends EventEmitter {
  constructor() {
    super();
    this.exitCode = null;
  }

  exit(exitCode) {
    this.exitCode = exitCode;
    this.emit("exit", exitCode);
  }
}

function createFakeChild(pid = 4321) {
  const child = new EventEmitter();
  child.pid = pid;
  child.exitCode = null;
  child.signalCode = null;
  child.kill = () => true;
  return child;
}

test("Windows cleanup hides taskkill and terminates the complete child tree", () => {
  const child = createFakeChild();
  const calls = [];

  assert.equal(
    terminateProcessTreeSync(child, {
      platform: "win32",
      spawnSyncImpl: (...args) => calls.push(args)
    }),
    true
  );
  assert.deepEqual(calls, [
    [
      "taskkill",
      ["/PID", "4321", "/T", "/F"],
      { stdio: "ignore", windowsHide: true }
    ]
  ]);
});

test("signal guard closes the Chrome tree before exiting the capture process", () => {
  const child = createFakeChild(9876);
  const runtimeProcess = new FakeRuntimeProcess();
  const calls = [];
  const reasons = [];
  const guard = installCaptureProcessGuard(child, {
    hardTimeoutMs: 0,
    parentPid: null,
    platform: "win32",
    runtimeProcess,
    spawnSyncImpl: (...args) => calls.push(args),
    onEmergency: (reason) => reasons.push(reason)
  });

  runtimeProcess.emit("SIGTERM");

  assert.equal(runtimeProcess.exitCode, 143);
  assert.deepEqual(reasons, ["received SIGTERM"]);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[0][1], ["/PID", "9876", "/T", "/F"]);
  guard.dispose();
});

test("normal async cleanup waits for Windows process-tree termination", async () => {
  const child = createFakeChild(2468);
  const calls = [];

  const terminated = await terminateCaptureProcessTree(child, {
    gracefulTimeoutMs: 50,
    platform: "win32",
    spawnSyncImpl: (...args) => {
      calls.push(args);
      child.exitCode = 0;
      child.emit("exit", 0);
    }
  });

  assert.equal(terminated, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], ["/PID", "2468", "/T", "/F"]);
});
