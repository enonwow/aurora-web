import { spawnSync as nodeSpawnSync } from "node:child_process";

const SIGNAL_EXIT_CODES = new Map([
  ["SIGINT", 130],
  ["SIGTERM", 143],
  ["SIGHUP", 129]
]);

function isChildProcessRunning(childProcess) {
  return Boolean(
    childProcess &&
      Number.isInteger(childProcess.pid) &&
      childProcess.pid > 0 &&
      childProcess.exitCode === null &&
      childProcess.signalCode === null
  );
}

export function isProcessAlive(pid, runtimeProcess = process) {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    runtimeProcess.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

export function terminateProcessTreeSync(
  childProcess,
  {
    platform = process.platform,
    spawnSyncImpl = nodeSpawnSync
  } = {}
) {
  if (!isChildProcessRunning(childProcess)) {
    return false;
  }

  if (platform === "win32") {
    spawnSyncImpl("taskkill", ["/PID", String(childProcess.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true
    });
  } else {
    try {
      childProcess.kill("SIGKILL");
    } catch {
      // Best effort: this path is used from signal and process-exit handlers.
    }
  }
  return true;
}

function waitForProcessExit(childProcess, timeoutMs) {
  return new Promise((resolve) => {
    if (!isChildProcessRunning(childProcess)) {
      resolve(true);
      return;
    }
    const timeout = setTimeout(() => {
      childProcess.off("exit", onExit);
      resolve(false);
    }, timeoutMs);
    const onExit = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    childProcess.once("exit", onExit);
  });
}

export async function terminateCaptureProcessTree(
  childProcess,
  {
    gracefulTimeoutMs = 5_000,
    platform = process.platform,
    spawnSyncImpl = nodeSpawnSync
  } = {}
) {
  if (!isChildProcessRunning(childProcess)) {
    return false;
  }

  const exitPromise = waitForProcessExit(childProcess, gracefulTimeoutMs);
  if (platform === "win32") {
    terminateProcessTreeSync(childProcess, { platform, spawnSyncImpl });
  } else {
    try {
      childProcess.kill("SIGTERM");
    } catch {
      // The exit promise below still verifies whether the process disappeared.
    }
  }

  if (!(await exitPromise)) {
    terminateProcessTreeSync(childProcess, { platform, spawnSyncImpl });
    await waitForProcessExit(childProcess, Math.min(gracefulTimeoutMs, 2_000));
  }
  return true;
}

export function installCaptureProcessGuard(
  childProcess,
  {
    hardTimeoutMs,
    label = "capture",
    parentPid = process.ppid,
    parentPollMs = 1_000,
    platform = process.platform,
    runtimeProcess = process,
    spawnSyncImpl = nodeSpawnSync,
    isParentAliveImpl = (pid) => isProcessAlive(pid, runtimeProcess),
    onEmergency = (reason) => {
      console.error(`[capture-process-guard] ${label}: ${reason}`);
    }
  } = {}
) {
  let disposed = false;
  let emergencyStarted = false;
  let hardTimeout = null;
  let parentMonitor = null;

  const emergencyStop = (reason, exitCode) => {
    if (disposed || emergencyStarted) {
      return;
    }
    emergencyStarted = true;
    onEmergency(reason);
    terminateProcessTreeSync(childProcess, { platform, spawnSyncImpl });
    runtimeProcess.exit(exitCode);
  };

  const exitHandler = () => {
    terminateProcessTreeSync(childProcess, { platform, spawnSyncImpl });
  };
  runtimeProcess.once("exit", exitHandler);

  const signalHandlers = new Map();
  for (const [signal, exitCode] of SIGNAL_EXIT_CODES) {
    const handler = () => emergencyStop(`received ${signal}`, exitCode);
    signalHandlers.set(signal, handler);
    runtimeProcess.once(signal, handler);
  }

  if (Number.isFinite(hardTimeoutMs) && hardTimeoutMs > 0) {
    hardTimeout = setTimeout(
      () => emergencyStop(`exceeded hard timeout of ${hardTimeoutMs}ms`, 124),
      hardTimeoutMs
    );
    hardTimeout.unref?.();
  }

  if (Number.isInteger(parentPid) && parentPid > 0 && Number.isFinite(parentPollMs)) {
    parentMonitor = setInterval(() => {
      if (!isParentAliveImpl(parentPid)) {
        emergencyStop(`parent process ${parentPid} is no longer alive`, 125);
      }
    }, Math.max(100, parentPollMs));
    parentMonitor.unref?.();
  }

  const dispose = () => {
    if (disposed) {
      return;
    }
    disposed = true;
    if (hardTimeout) {
      clearTimeout(hardTimeout);
    }
    if (parentMonitor) {
      clearInterval(parentMonitor);
    }
    runtimeProcess.off("exit", exitHandler);
    for (const [signal, handler] of signalHandlers) {
      runtimeProcess.off(signal, handler);
    }
  };

  return {
    dispose,
    async terminate() {
      await terminateCaptureProcessTree(childProcess, { platform, spawnSyncImpl });
      dispose();
    }
  };
}
