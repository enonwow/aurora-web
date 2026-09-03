import fs from "node:fs";
import path from "node:path";

function waitSynchronously(milliseconds) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
}

export function writeJsonAtomic(filePath, value, {
  fsImpl = fs,
  processId = process.pid,
  maxRenameAttempts = 20,
  wait = waitSynchronously
} = {}) {
  fsImpl.mkdirSync(path.dirname(filePath), { recursive: true });
  const temporaryPath = `${filePath}.tmp-${processId}`;
  fsImpl.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  for (let attempt = 1; attempt <= maxRenameAttempts; attempt += 1) {
    try {
      fsImpl.renameSync(temporaryPath, filePath);
      return;
    } catch (error) {
      const retryable = error?.code === "EPERM" || error?.code === "EACCES";
      if (!retryable || attempt === maxRenameAttempts) throw error;
      wait(25 * attempt);
    }
  }
}
