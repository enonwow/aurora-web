import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

describe("VFX retail control gates with missing local prerequisites", () => {
  const backendRoot = path.resolve(__dirname, "../..");
  const cases = [
    {
      script: "check-vfx-retail-capture-setup-validation.mjs",
      result: "retail-capture-setup-validation-blocked-external-ingestion",
      extraArgs: (dir: string) => ["--checklist", path.join(dir, "checklist.md")]
    },
    {
      script: "check-vfx-retail-blocker-packet-freshness.mjs",
      result: "retail-blocker-packet-freshness-blocked-external-ingestion",
      extraArgs: () => []
    },
    {
      script: "check-vfx-runtime-health-retail-blocker-crosscheck.mjs",
      result: "runtime-health-retail-blocker-crosscheck-blocked-external-ingestion",
      extraArgs: () => []
    },
    {
      script: "check-vfx-worker-directive-completion-alignment.mjs",
      result: "worker-directive-completion-alignment-blocked-external-ingestion",
      extraArgs: () => []
    }
  ] as const;

  it.each(cases)("returns a structured blocker instead of ENOENT: $script", (testCase) => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "aurora-vfx-gate-prereq-"));
    const outPath = path.join(tempDir, "report.json");
    try {
      const execution = spawnSync(
        process.execPath,
        [
          path.join(backendRoot, "scripts", testCase.script),
          "--out",
          outPath,
          ...testCase.extraArgs(tempDir)
        ],
        {
          cwd: backendRoot,
          encoding: "utf8"
        }
      );

      expect(execution.status).toBe(1);
      expect(execution.stderr).not.toContain("ENOENT");
      expect(execution.stderr).not.toContain("node:fs");
      const report = JSON.parse(readFileSync(outPath, "utf8")) as {
        result?: string;
        canonicalParityPromoted?: boolean;
        missingPrerequisites?: Array<{ path?: string; role?: string }>;
        invalidPrerequisites?: Array<{ path?: string; diagnosticCode?: string }>;
        presentPrerequisites?: Array<{ path?: string; sha256?: string; bytes?: number }>;
        externalIngestionBlockers?: Array<{ artifactId?: string; resumeCondition?: string }>;
        recovery?: { generationOrder?: Array<{ order?: number; action?: string }> };
      };
      expect(report.result).toBe(testCase.result);
      expect(report.canonicalParityPromoted).toBe(false);
      expect(report.missingPrerequisites?.length).toBeGreaterThan(0);
      expect(report.missingPrerequisites?.every((entry) => entry.path && entry.role)).toBe(true);
      expect(report.presentPrerequisites?.every((entry) =>
        entry.path && Number.isInteger(entry.bytes) && /^[a-f0-9]{64}$/u.test(entry.sha256 ?? "")
      )).toBe(true);
      expect(report.invalidPrerequisites?.every((entry) =>
        entry.path && entry.diagnosticCode
      )).toBe(true);
      const blockedCount =
        (report.missingPrerequisites?.length ?? 0) +
        (report.invalidPrerequisites?.length ?? 0);
      expect(report.recovery?.generationOrder?.map((entry) => entry.order)).toEqual(
        Array.from({ length: blockedCount }, (_, index) => index + 1)
      );
      expect(report.recovery?.generationOrder?.every((entry) => Boolean(entry.action))).toBe(true);
      if (testCase.result.endsWith("blocked-external-ingestion")) {
        expect(report.externalIngestionBlockers?.length).toBeGreaterThan(0);
        expect(
          report.externalIngestionBlockers?.every(
            (entry) => Boolean(entry.artifactId) && Boolean(entry.resumeCondition)
          )
        ).toBe(true);
      }
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it.each([
    {
      name: "directory instead of coordinator JSON",
      script: "check-vfx-worker-directive-completion-alignment.mjs",
      option: "--coordinator",
      prepare: (targetPath: string) => mkdirSync(targetPath, { recursive: true }),
      code: "artifact_not_regular_file"
    },
    {
      name: "malformed coordinator JSON",
      script: "check-vfx-worker-directive-completion-alignment.mjs",
      option: "--coordinator",
      prepare: (targetPath: string) => writeFileSync(targetPath, "{ malformed"),
      code: "artifact_json_malformed"
    },
    {
      name: "malformed run-log JSONL",
      script: "check-vfx-worker-directive-completion-alignment.mjs",
      option: "--runLog",
      prepare: (targetPath: string) => writeFileSync(targetPath, "{ malformed\n"),
      code: "artifact_jsonl_malformed"
    },
    {
      name: "wrong fixture-manifest schema",
      script: "check-vfx-retail-capture-setup-validation.mjs",
      option: "--manifest",
      prepare: (targetPath: string) =>
        writeFileSync(targetPath, JSON.stringify({ version: "wrong/v1", fixtures: [] })),
      code: "artifact_schema_version_mismatch"
    }
  ])("blocks $name before consumer read/parse", (testCase) => {
    const tempDir = mkdtempSync(path.join(tmpdir(), "aurora-vfx-gate-invalid-prereq-"));
    const outPath = path.join(tempDir, "report.json");
    const targetPath = path.join(tempDir, "prerequisite");
    try {
      testCase.prepare(targetPath);
      const execution = spawnSync(
        process.execPath,
        [
          path.join(backendRoot, "scripts", testCase.script),
          "--out",
          outPath,
          testCase.option,
          targetPath,
          ...(testCase.script === "check-vfx-retail-capture-setup-validation.mjs"
            ? ["--checklist", path.join(tempDir, "checklist.md")]
            : [])
        ],
        { cwd: backendRoot, encoding: "utf8" }
      );

      expect(execution.status).toBe(1);
      expect(execution.stderr).not.toContain("EISDIR");
      expect(execution.stderr).not.toContain("SyntaxError");
      expect(execution.stderr).not.toContain("node:fs");
      const report = JSON.parse(readFileSync(outPath, "utf8")) as {
        status?: string;
        canonicalParityPromoted?: boolean;
        invalidPrerequisites?: Array<{ diagnosticCode?: string }>;
      };
      expect(report.status).toBe("blocked_invalid_or_missing_prerequisites");
      expect(report.canonicalParityPromoted).toBe(false);
      expect(report.invalidPrerequisites?.map((entry) => entry.diagnosticCode)).toContain(
        testCase.code
      );
    } finally {
      rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
