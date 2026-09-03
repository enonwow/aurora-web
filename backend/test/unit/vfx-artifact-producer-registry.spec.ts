import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

interface ExecutionResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

describe("Aurora VFX artifact producer registry v1", () => {
  const backendRoot = path.resolve(__dirname, "../..");
  const validatorPath = path.join(
    backendRoot,
    "scripts",
    "validate-vfx-artifact-producer-registry.mjs"
  );
  const bootstrapPath = path.join(backendRoot, "scripts", "bootstrap-vfx-control-plane.mjs");
  const canonicalRegistryPath = path.join(
    backendRoot,
    "docs",
    "aurora-reverse",
    "vfx-artifact-producer-registry-v1.json"
  );

  it("validates the canonical registry and exact producer/consumer output paths", () => {
    const execution = run(validatorPath, ["--registry", canonicalRegistryPath]);

    expect(execution.status).toBe(0);
    const report = JSON.parse(execution.stdout) as {
      version?: string;
      valid?: boolean;
      artifactCount?: number;
      gateCount?: number;
      errors?: unknown[];
    };
    expect(report).toMatchObject({
      version: "aurora-vfx-artifact-producer-registry-validation/v1",
      valid: true
    });
    expect(report.artifactCount).toBeGreaterThan(10);
    expect(report.gateCount).toBe(4);
    expect(report.errors).toEqual([]);

    const registry = JSON.parse(readFileSync(canonicalRegistryPath, "utf8")) as {
      artifacts: Array<{
        artifactId: string;
        outputPath: string;
        producer: { kind: string; command?: string };
      }>;
    };
    for (const artifact of registry.artifacts) {
      if (artifact.producer.kind !== "repository-command") continue;
      expect(artifact.producer.command).toContain(artifact.outputPath);
      expect(artifact.producer.command).toMatch(
        /--(?:out|markdown|latestJson|backlogJson)\s+/u
      );
    }
  });

  it.each([
    {
      name: "unknown dependency",
      mutate: (registry: RegistryFixture) => {
        registry.artifacts[0].inputs = ["missing-artifact"];
      },
      code: "registry_input_artifact_unknown"
    },
    {
      name: "dependency cycle",
      mutate: (registry: RegistryFixture) => {
        registry.artifacts[0].inputs = ["derived"];
        registry.artifacts[1].inputs = ["source"];
      },
      code: "registry_dependency_cycle"
    },
    {
      name: "duplicate output",
      mutate: (registry: RegistryFixture) => {
        registry.artifacts[1].outputPath = registry.artifacts[0].outputPath;
      },
      code: "registry_output_path_duplicate"
    },
    {
      name: "missing producer command",
      mutate: (registry: RegistryFixture) => {
        delete registry.artifacts[1].producer.command;
      },
      code: "registry_repository_command_missing"
    }
  ])("rejects $name with a stable diagnostic", ({ mutate, code }) => {
    withTempRegistry((tempRoot, registryPath, registry) => {
      mutate(registry);
      writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

      const execution = run(validatorPath, ["--registry", registryPath, "--repo-root", tempRoot]);

      expect(execution.status).toBe(1);
      expect(execution.stderr).not.toContain("SyntaxError");
      const report = JSON.parse(execution.stdout) as { errors?: Array<{ code?: string }> };
      expect(report.errors?.map((entry) => entry.code)).toContain(code);
    });
  });

  it("keeps dry-run deterministic and does not execute or write producers", () => {
    withTempRegistry((tempRoot, registryPath) => {
      const args = [
        "--registry",
        registryPath,
        "--repo-root",
        tempRoot,
        "--gate",
        "test-gate"
      ];
      const first = run(bootstrapPath, args);
      const second = run(bootstrapPath, args);

      expect(first.status).toBe(1);
      expect(second.status).toBe(1);
      expect(first.stdout).toBe(second.stdout);
      expect(first.stderr).not.toContain("ENOENT");
      expect(readReport(first).planDigest).toMatch(/^[a-f0-9]{64}$/u);
      expect(readReport(first).canonicalParityPromoted).toBe(false);
      expect(readReport(first).actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ artifactId: "source", action: "blocked_missing_tracked_input" }),
          expect.objectContaining({ artifactId: "derived", action: "blocked_dependency" })
        ])
      );
    });
  });

  it("stops execute mode at the first external semantic blocker", () => {
    withTempRegistry((tempRoot, registryPath, registry) => {
      registry.artifacts[0].producer = {
        kind: "external-ingestion",
        resumeCondition: "Ingest the exact external source report."
      };
      writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);

      const execution = run(bootstrapPath, [
        "--registry",
        registryPath,
        "--repo-root",
        tempRoot,
        "--gate",
        "test-gate",
        "--execute"
      ]);

      expect(execution.status).toBe(1);
      expect(readReport(execution).actions).toEqual([
        expect.objectContaining({
          artifactId: "source",
          action: "blocked_external_ingestion",
          diagnosticCode: "external_ingestion_required"
        })
      ]);
    });
  });

  it.each([
    { name: "directory", content: null, expected: "artifact_not_regular_file" },
    { name: "malformed JSON", content: "{ nope", expected: "artifact_json_malformed" },
    {
      name: "wrong schema",
      content: JSON.stringify({ version: "wrong/v1" }),
      expected: "artifact_schema_version_mismatch"
    }
  ])("fails closed for a $name prerequisite", ({ content, expected }) => {
    withTempRegistry((tempRoot, registryPath) => {
      const sourcePath = path.join(tempRoot, "inputs", "source.json");
      if (content === null) {
        mkdirSync(sourcePath, { recursive: true });
      } else {
        mkdirSync(path.dirname(sourcePath), { recursive: true });
        writeFileSync(sourcePath, content);
      }

      const execution = run(bootstrapPath, [
        "--registry",
        registryPath,
        "--repo-root",
        tempRoot,
        "--gate",
        "test-gate"
      ]);

      expect(execution.status).toBe(1);
      expect(execution.stderr).not.toContain("node:fs");
      expect(readReport(execution).actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ artifactId: "source", diagnosticCode: expected })
        ])
      );
    });
  });

  it.each([
    {
      name: "writes no output",
      producerSource: "process.exitCode = 0;\n",
      expected: "producer_output_missing"
    },
    {
      name: "writes a different path",
      producerSource:
        'import fs from "node:fs"; fs.mkdirSync("outputs", { recursive: true }); fs.writeFileSync("outputs/wrong.json", JSON.stringify({ version: "derived/v1" }));\n',
      expected: "producer_output_missing"
    }
  ])("rejects a zero-exit producer that $name", ({ producerSource, expected }) => {
    withTempRegistry((tempRoot, registryPath) => {
      mkdirSync(path.join(tempRoot, "inputs"), { recursive: true });
      writeFileSync(
        path.join(tempRoot, "inputs", "source.json"),
        JSON.stringify({ version: "source/v1" })
      );
      writeFileSync(path.join(tempRoot, "producer.mjs"), producerSource);

      const execution = run(bootstrapPath, [
        "--registry",
        registryPath,
        "--repo-root",
        tempRoot,
        "--gate",
        "test-gate",
        "--execute"
      ]);

      expect(execution.status).toBe(1);
      expect(readReport(execution).actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            artifactId: "derived",
            action: "blocked_producer_output_invalid",
            diagnosticCode: expected
          })
        ])
      );
    });
  });

  function withTempRegistry(
    execute: (tempRoot: string, registryPath: string, registry: RegistryFixture) => void
  ): void {
    const tempRoot = mkdtempSync(path.join(tmpdir(), "aurora-vfx-registry-"));
    const registryPath = path.join(tempRoot, "registry.json");
    const registry = createRegistryFixture();
    writeFileSync(registryPath, `${JSON.stringify(registry, null, 2)}\n`);
    try {
      execute(tempRoot, registryPath, registry);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  }

  function run(script: string, args: string[]): ExecutionResult {
    const execution = spawnSync(process.execPath, [script, ...args], {
      cwd: backendRoot,
      encoding: "utf8"
    });
    return {
      status: execution.status,
      stdout: execution.stdout,
      stderr: execution.stderr
    };
  }

  function readReport(execution: ExecutionResult): {
    planDigest?: string;
    canonicalParityPromoted?: boolean;
    actions?: Array<{ artifactId?: string; action?: string; diagnosticCode?: string }>;
  } {
    return JSON.parse(execution.stdout);
  }
});

interface RegistryFixture {
  version: string;
  artifacts: Array<{
    artifactId: string;
    schemaId: string;
    outputPath: string;
    producer: { kind: string; command?: string; resumeCondition?: string };
    inputs: string[];
    sourceClass: string;
    freshness: { mode: string };
    validation: { format: string; versionField: string; expectedVersion: string };
    retailEvidence: boolean;
  }>;
  gates: Record<string, string[]>;
}

function createRegistryFixture(): RegistryFixture {
  return {
    version: "aurora-vfx-artifact-producer-registry/v1",
    artifacts: [
      {
        artifactId: "source",
        schemaId: "source/v1",
        outputPath: "inputs/source.json",
        producer: { kind: "tracked-repository-input" },
        inputs: [],
        sourceClass: "tracked-repository-input",
        freshness: { mode: "content-hash" },
        validation: {
          format: "json",
          versionField: "version",
          expectedVersion: "source/v1"
        },
        retailEvidence: false
      },
      {
        artifactId: "derived",
        schemaId: "derived/v1",
        outputPath: "outputs/derived.json",
        producer: {
          kind: "repository-command",
          command: "node producer.mjs --out outputs/derived.json"
        },
        inputs: ["source"],
        sourceClass: "local-control-artifact",
        freshness: { mode: "dependency-hash" },
        validation: {
          format: "json",
          versionField: "version",
          expectedVersion: "derived/v1"
        },
        retailEvidence: false
      }
    ],
    gates: { "test-gate": ["derived"] }
  };
}
