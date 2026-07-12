import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const safetyModulePath = resolve(__dirname, "../../scripts/lib/toolset-open-safety.mjs");

async function runGate(input: Record<string, unknown>) {
  const source = `
import { buildToolsetLaunchSafetyGate } from ${JSON.stringify(pathToFileURL(safetyModulePath).href)};
const input = JSON.parse(process.env.TOOLSET_GATE_INPUT);
const gate = buildToolsetLaunchSafetyGate(input);
console.log(JSON.stringify(gate));
`;
  const { stdout } = await execFileAsync("node", ["--input-type=module", "-e", source], {
    env: {
      ...process.env,
      TOOLSET_GATE_INPUT: JSON.stringify(input)
    },
    maxBuffer: 1024 * 1024
  });
  return JSON.parse(stdout);
}

describe("toolset-open-safety", () => {
  it("blocks a quarantined module before any Toolset launch", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-toolset-safety-"));
    const modulePath = join(tempRoot, "codex_writer_concept_sic_tilemap99_lab.mod");
    const registryPath = join(tempRoot, "toolset-critical-failures.json");
    await writeFile(modulePath, Buffer.alloc(32));
    await writeFile(
      registryPath,
      `${JSON.stringify({
        version: "last-city-toolset-critical-failures/v1",
        records: [
          {
            status: "rejected",
            reason: "toolset_access_violation_modal",
            recordedAt: "2026-07-09T11:46:27.020Z",
            modulePath,
            moduleBaseName: basename(modulePath).toLowerCase()
          }
        ]
      })}\n`
    );

    const gate = await runGate({ modulePath, criticalFailureRegistryPath: registryPath });

    expect(gate.ok).toBe(false);
    expect(gate.blockerCode).toBe("candidate_quarantined_after_toolset_critical_failure");
    expect(gate.candidateQuarantine).toMatchObject({
      blocked: true,
      reason: "toolset_access_violation_modal"
    });
  });

  it("blocks direct full Last City module opens by default", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-toolset-safety-"));
    const modulePath = join(tempRoot, "the_last_city - codex.mod");
    await writeFile(modulePath, Buffer.alloc(128));

    const gate = await runGate({
      modulePath,
      criticalFailureRegistryPath: join(tempRoot, "missing-registry.json"),
      fullLastCityDirectOpenMinBytes: 64
    });

    expect(gate.ok).toBe(false);
    expect(gate.blockerCode).toBe("full_last_city_module_direct_open_blocked");
    expect(gate.fullLastCityModuleTarget).toMatchObject({
      blocked: true,
      moduleBaseName: "the_last_city - codex.mod"
    });

    const overrideGate = await runGate({
      modulePath,
      criticalFailureRegistryPath: join(tempRoot, "missing-registry.json"),
      fullLastCityDirectOpenMinBytes: 64,
      allowFullLastCityDirectOpen: true
    });
    expect(overrideGate.ok).toBe(true);
  });

  it("blocks concept tilemap labs that are actually full-module sized", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-toolset-safety-"));
    const modulePath = join(tempRoot, "codex_writer_concept_sic_tilemap101_full_lab.mod");
    await writeFile(modulePath, Buffer.alloc(128));

    const gate = await runGate({
      modulePath,
      criticalFailureRegistryPath: join(tempRoot, "missing-registry.json"),
      conceptTilemapLabMaxBytes: 64
    });

    expect(gate.ok).toBe(false);
    expect(gate.blockerCode).toBe("generated_lab_module_too_large_full_module_target");
    expect(gate.fullSizeConceptTilemapTarget).toMatchObject({
      blocked: true,
      maxBytes: 64
    });
  });

  it("keeps existing screenshot ingestion on the no-launch path", async () => {
    const supervisedSource = await readFile(
      resolve(__dirname, "../../scripts/run-last-city-supervised-toolset-proof.mjs"),
      "utf8"
    );
    const compareSource = await readFile(
      resolve(__dirname, "../../scripts/compare-last-city-concept-parity.mjs"),
      "utf8"
    );

    expect(supervisedSource).toContain("skipped_existing_capture_no_launch");
    expect(supervisedSource).toContain("existing screenshot ingestion only; skip Toolset launch preflight");
    expect(compareSource).toContain("existing_capture_no_launch_preflight_skipped");
    expect(compareSource).toContain("Pass --preflightReport before any new Toolset launch");
  });
});
