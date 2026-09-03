const { randomUUID } = require("node:crypto");
const {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} = require("node:fs");
const path = require("node:path");

function defaultIsProcessAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code !== "ESRCH";
  }
}

function readLockOwner(lockPath) {
  try {
    const value = JSON.parse(readFileSync(lockPath, "utf8"));
    return {
      pid: Number(value.pid),
      token: typeof value.token === "string" ? value.token : null,
    };
  } catch {
    return { pid: null, token: null };
  }
}

function acquireProcessLock({
  lockPath,
  pid = process.pid,
  isProcessAlive = defaultIsProcessAlive,
  describeBusy = (ownerPid) => `Process lock is already owned by PID ${ownerPid}.`,
}) {
  mkdirSync(path.dirname(lockPath), { recursive: true });
  const token = randomUUID();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    let descriptor;
    try {
      descriptor = openSync(lockPath, "wx");
      writeFileSync(
        descriptor,
        `${JSON.stringify({ pid, token, startedAt: new Date().toISOString() })}\n`,
        "utf8",
      );
      closeSync(descriptor);
      descriptor = undefined;

      let released = false;
      return {
        release() {
          if (released) return;
          released = true;
          const owner = readLockOwner(lockPath);
          if (owner.token !== token) return;
          try {
            unlinkSync(lockPath);
          } catch (error) {
            if (error?.code !== "ENOENT") throw error;
          }
        },
      };
    } catch (error) {
      if (descriptor !== undefined) closeSync(descriptor);
      if (error?.code !== "EEXIST") throw error;

      const owner = readLockOwner(lockPath);
      if (isProcessAlive(owner.pid)) {
        const busyError = new Error(describeBusy(owner.pid));
        busyError.code = "PROCESS_LOCK_BUSY";
        throw busyError;
      }
      try {
        unlinkSync(lockPath);
      } catch (unlinkError) {
        if (unlinkError?.code !== "ENOENT") throw unlinkError;
      }
    }
  }

  throw new Error(`Unable to acquire process lock: ${lockPath}`);
}

module.exports = {
  acquireProcessLock,
  defaultIsProcessAlive,
};
