const path = require("node:path");
const { acquireProcessLock } = require("./process-lock.cjs");

const DEFAULT_REPOSITORY_ROOT = path.resolve(__dirname, "..");

function getProofCaptureLockPath(repositoryRoot = DEFAULT_REPOSITORY_ROOT) {
  return path.join(
    repositoryRoot,
    ".codex-runtime",
    "proof-capture.lock.json",
  );
}

function acquireProofCaptureLock({
  repositoryRoot = DEFAULT_REPOSITORY_ROOT,
  pid = process.pid,
  isProcessAlive,
} = {}) {
  return acquireProcessLock({
    lockPath: getProofCaptureLockPath(repositoryRoot),
    pid,
    ...(isProcessAlive ? { isProcessAlive } : {}),
    describeBusy: (ownerPid) =>
      `A browser proof capture is already running under PID ${ownerPid}. ` +
      "Only one repository capture is allowed at a time.",
  });
}

function installProofCaptureLock(options) {
  const lock = acquireProofCaptureLock(options);
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    process.off("exit", release);
    lock.release();
  };
  process.once("exit", release);
  return { release };
}

module.exports = {
  acquireProofCaptureLock,
  getProofCaptureLockPath,
  installProofCaptureLock,
};
