import * as fs from "node:fs";
import * as path from "node:path";

const repoRoot = path.resolve(__dirname, "../../..");
const exporterPath = path.join(
  repoRoot,
  "backend/scripts/ghidra/ExportAuroraDecompilationLineageV2.java"
);

describe("Ghidra lineage v2 exporter source contract", () => {
  let source: string;

  beforeAll(() => {
    source = fs.readFileSync(exporterPath, "utf8");
  });

  it("requires immutable packet inputs and derives its own output paths", () => {
    for (const argument of [
      "packet-root",
      "session-id",
      "input-binary",
      "tool-distribution",
      "project-snapshot",
      "analyzer-config",
      "invocation-log",
      "exporter-script",
      "project-id",
      "relocation-policy"
    ]) {
      expect(source).toContain(`requireArgument(arguments, \"${argument}\")`);
    }
    expect(source).toContain('generation.resolve("function-records.jsonl")');
    expect(source).toContain('generation.resolve("failure-ledger.json")');
    expect(source).toContain('generation.resolve("call-graph.jsonl")');
    expect(source).toContain('generation.resolve("session-attestation.json")');
    expect(source).not.toContain("authoritativeDecompilationClaim");
    expect(source).not.toMatch(/--(?:function|success|failure|graph)-count/u);
  });

  it("binds the running script and uses the official decompiler/function APIs", () => {
    expect(source).toContain("getSourceFile().getFile(false)");
    expect(source).toContain("getFunctions(true)");
    expect(source).toContain("decompiler.openProgram(currentProgram)");
    expect(source).toContain("decompiler.decompileFunction(function, timeoutSeconds, monitor)");
    expect(source).toContain("results.decompileCompleted()");
    expect(source).toContain("results.getDecompiledFunction().getC()");
    expect(source).toContain("function.getCalledFunctions(monitor)");
  });

  it("writes evidence before the final session attestation", () => {
    const recordsWrite = source.indexOf("writeJsonl(functionRecordsPath");
    const ledgerWrite = source.indexOf("writeJson(failureLedgerPath");
    const graphWrite = source.indexOf("writeJsonl(callGraphPath");
    const attestationWrite = source.indexOf("writeJson(attestationPath");

    expect(recordsWrite).toBeGreaterThan(0);
    expect(ledgerWrite).toBeGreaterThan(recordsWrite);
    expect(graphWrite).toBeGreaterThan(ledgerWrite);
    expect(attestationWrite).toBeGreaterThan(graphWrite);
  });

  it("records stable interruption and per-function failure states", () => {
    for (const reason of [
      "decompiler_timeout",
      "decompiler_cancelled",
      "decompiler_failed_to_start",
      "decompiler_no_c_output",
      "decompiler_error"
    ]) {
      expect(source).toContain(`\"${reason}\"`);
    }
    expect(source).toContain('completionMarker = "interrupted"');
    expect(source).toContain('completionMarker = "ghidra-export-complete"');
  });

  it("supports a resource-bounded, attested target-address selection", () => {
    expect(source).toContain('arguments.get("target-addresses")');
    expect(source).toContain('arguments.get("target-addresses-base64url")');
    expect(source).toContain("Base64.getUrlDecoder()");
    expect(source).toContain("Base64.getUrlEncoder().withoutPadding()");
    expect(source).toContain('"decompiler_not_targeted"');
    expect(source).toContain('"decompilationSelection"');
    expect(source).toContain('"targeted"');
    expect(source).toContain('"full"');
    expect(source).toContain("lineage_target_address_not_discovered");
  });
});
