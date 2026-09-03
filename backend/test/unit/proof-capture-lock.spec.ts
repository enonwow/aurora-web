import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const {
  acquireProofCaptureLock,
  getProofCaptureLockPath,
} = require("../../../scripts/proof-capture-lock.cjs") as {
  acquireProofCaptureLock: (options: {
    repositoryRoot: string;
    pid: number;
    isProcessAlive: (pid: number) => boolean;
  }) => { release: () => void };
  getProofCaptureLockPath: (repositoryRoot: string) => string;
};

describe("proof capture lock", () => {
  it("allows only one browser capture for the entire repository", () => {
    const repositoryRoot = mkdtempSync(join(tmpdir(), "aurora-proof-lock-"));
    const lockPath = getProofCaptureLockPath(repositoryRoot);
    try {
      const first = acquireProofCaptureLock({
        repositoryRoot,
        pid: 501,
        isProcessAlive: () => true,
      });

      expect(() =>
        acquireProofCaptureLock({
          repositoryRoot,
          pid: 502,
          isProcessAlive: () => true,
        }),
      ).toThrow(/proof capture is already running/i);

      first.release();
      expect(existsSync(lockPath)).toBe(false);
    } finally {
      rmSync(repositoryRoot, { force: true, recursive: true });
    }
  });
});
