import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = path.resolve(__dirname, "../../..");
const scriptPath = path.join(repoRoot, "backend/scripts/create-aurora-decompilation-lineage-manifest.mjs");

describe("Aurora decompilation lineage manifest", () => {
  let tempRoot: string;
  let exportDir: string;
  let inputBinary: string;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aurora-decomp-lineage-"));
    exportDir = path.join(tempRoot, "export");
    inputBinary = write("nwtoolset.exe", "retail-binary");
    fs.mkdirSync(exportDir, { recursive: true });
    fs.writeFileSync(path.join(exportDir, "decompiled_all.c"), "void FUN_1(void) {}\n");
    fs.writeFileSync(path.join(exportDir, "functions.tsv"), "FUN_1\nFUN_2\n");
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  });

  it("inventories a legacy export but keeps its input lineage explicitly blocked", () => {
    const outPath = path.join(tempRoot, "legacy.json");
    const result = run([
      "--mode", "audit-legacy",
      "--export-dir", exportDir,
      "--candidate-input-binary", inputBinary,
      "--out", outPath,
      "--generated-at", "2026-08-17T00:00:00.000Z"
    ]);

    expect(result.status).toBe(1);
    expect(result.stderr).not.toMatch(/ENOENT|node:fs/u);
    const manifest = read(outPath);
    expect(manifest).toMatchObject({
      schemaVersion: "aurora-decompilation-lineage/v1",
      status: "blocked_unbound_legacy_export",
      lineageBound: false,
      authoritativeDecompilationClaim: false,
      candidateInput: {
        classification: "candidate_only_not_proven_generator_input",
        sha256: sha("retail-binary")
      }
    });
    expect(manifest.missingLineageFields).toEqual(expect.arrayContaining([
      "tool.version",
      "project.snapshot",
      "analysis.analyzerConfiguration",
      "generation.invocationLog"
    ]));
    expect(manifest.outputs).toEqual([
      expect.objectContaining({ path: "decompiled_all.c", sha256: sha("void FUN_1(void) {}\n") }),
      expect.objectContaining({ path: "functions.tsv", sha256: sha("FUN_1\nFUN_2\n") })
    ]);
  });

  it("keeps deterministic v1 bound packets legacy and non-authoritative", () => {
    const evidence = completeEvidence();
    const firstOut = path.join(tempRoot, "bound-a.json");
    const secondOut = path.join(tempRoot, "bound-b.json");
    const args = [
      "--mode", "bind-session",
      "--input-binary", inputBinary,
      "--export-dir", exportDir,
      "--session-id", "ghidra-session-001",
      "--tool-name", "Ghidra",
      "--tool-version", "11.2.1",
      "--project-id", "aurora-toolset-001",
      "--project-snapshot", evidence.projectSnapshot,
      "--loader", "Portable Executable (PE)",
      "--language", "x86:LE:32:default",
      "--image-base", "0x00400000",
      "--relocation-policy", "loader-default-recorded",
      "--analyzer-config", evidence.analyzerConfig,
      "--invocation-log", evidence.invocationLog,
      "--failure-ledger", evidence.failureLedger,
      "--call-graph", evidence.callGraph,
      "--export-script", evidence.exportScript,
      "--function-discovered", "2",
      "--decompile-success", "1",
      "--decompile-failure", "1",
      "--generated-at", "2026-08-17T00:00:00.000Z"
    ];

    expect(run([...args, "--out", firstOut]).status).toBe(0);
    expect(run([...args, "--out", secondOut]).status).toBe(0);
    const first = read(firstOut);
    const second = read(secondOut);

    expect(first).toEqual(second);
    expect(first).toMatchObject({
      schemaVersion: "aurora-decompilation-lineage/v1",
      status: "bound_complete_legacy_untrusted",
      lineageBound: true,
      authoritativeDecompilationClaim: false,
      sessionId: "ghidra-session-001",
      coverage: {
        functionDiscovered: 2,
        decompileSuccess: 1,
        decompileFailure: 1,
        complete: true
      }
    });
    expect(first.recordDigestSha256).toMatch(/^[a-f0-9]{64}$/u);
  });

  it("fails closed on incomplete or inconsistent bound-session input", () => {
    const outPath = path.join(tempRoot, "invalid.json");
    const result = run([
      "--mode", "bind-session",
      "--input-binary", inputBinary,
      "--export-dir", exportDir,
      "--out", outPath,
      "--function-discovered", "2",
      "--decompile-success", "2",
      "--decompile-failure", "1"
    ]);

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("decompilation-lineage-input-invalid");
    expect(result.stderr).not.toMatch(/ENOENT|node:fs/u);
    expect(fs.existsSync(outPath)).toBe(false);
  });

  function completeEvidence() {
    return {
      projectSnapshot: write("project.gar", "project-snapshot"),
      analyzerConfig: write("analyzers.json", '{"Decompiler Parameter ID":"default"}\n'),
      invocationLog: write("invocation.log", "analyzeHeadless exact invocation\n"),
      failureLedger: write("failures.json", '{"failures":["FUN_2"]}\n'),
      callGraph: write("callgraph.tsv", "FUN_1\tFUN_2\n"),
      exportScript: write("Export.java", "public class Export {}\n")
    };
  }

  function write(name: string, contents: string): string {
    const filePath = path.join(tempRoot, name);
    fs.writeFileSync(filePath, contents);
    return filePath;
  }
});

function run(args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });
}

function read(filePath: string): Record<string, any> {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sha(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
