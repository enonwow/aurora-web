import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const {
  acquireMutationLock,
  buildStrykerCliArgs,
  isMutationOptIn,
} = require("../../../scripts/optional-mutation-runner.cjs") as {
  acquireMutationLock: (options: {
    lockPath: string;
    pid: number;
    isProcessAlive?: (pid: number) => boolean;
  }) => { release: () => void };
  buildStrykerCliArgs: (args: readonly string[]) => string[];
  isMutationOptIn: (environment: NodeJS.ProcessEnv) => boolean;
};

describe("optional mutation runner", () => {
  it("requires the exact mutation-test opt-in value", () => {
    expect(isMutationOptIn({})).toBe(false);
    expect(isMutationOptIn({ AURORA_MUTATION_TESTS: "true" })).toBe(false);
    expect(isMutationOptIn({ AURORA_MUTATION_TESTS: "1" })).toBe(true);
  });

  it("forces one Stryker worker even when callers pass another concurrency", () => {
    expect(
      buildStrykerCliArgs([
        "stryker.focused.config.json",
        "--concurrency",
        "8",
        "--concurrency=12",
      ]),
    ).toEqual([
      "run",
      "stryker.focused.config.json",
      "--concurrency",
      "1",
    ]);
  });

  it("blocks a second live mutation runner and releases its global lock", () => {
    const directory = mkdtempSync(join(tmpdir(), "aurora-mutation-lock-"));
    const lockPath = join(directory, "mutation.lock.json");
    try {
      const first = acquireMutationLock({
        lockPath,
        pid: 101,
        isProcessAlive: () => true,
      });

      expect(() =>
        acquireMutationLock({
          lockPath,
          pid: 202,
          isProcessAlive: () => true,
        }),
      ).toThrow(/already running/i);

      first.release();
      expect(existsSync(lockPath)).toBe(false);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });

  it("replaces a stale mutation lock", () => {
    const directory = mkdtempSync(join(tmpdir(), "aurora-mutation-stale-"));
    const lockPath = join(directory, "mutation.lock.json");
    try {
      const first = acquireMutationLock({
        lockPath,
        pid: 303,
        isProcessAlive: () => false,
      });
      const second = acquireMutationLock({
        lockPath,
        pid: 404,
        isProcessAlive: () => false,
      });

      first.release();
      expect(existsSync(lockPath)).toBe(true);
      second.release();
      expect(existsSync(lockPath)).toBe(false);
    } finally {
      rmSync(directory, { force: true, recursive: true });
    }
  });
});
