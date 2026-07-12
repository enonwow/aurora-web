import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CliDerivedAssetGeneratorService } from "../../src/modules/runtime-settings/adapters/outbound/derived/cli-derived-asset-generator.service";
import type { AppConfigService } from "../../src/common/config/app-config.service";

describe("CliDerivedAssetGeneratorService", () => {
  it("uses the in-process Aurora MDL converter when no converter command is configured", async () => {
    const service = new CliDerivedAssetGeneratorService(buildConfig({ command: "" }));

    const result = await service.generateDerivedAssets({
      settingsRevision: 1,
      modulePrefix: "modules/current",
      sourceFiles: [
        file(
          "models/plc_city_gate.mdl",
          [
            "newmodel plc_city_gate",
            "beginmodelgeom plc_city_gate",
            "node trimesh mesh01",
            "  verts 3",
            "    0 0 0",
            "    1 0 0",
            "    0 1 0",
            "  faces 1",
            "    0 1 2",
            "endnode",
            "endmodelgeom plc_city_gate"
          ].join("\n")
        )
      ]
    });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({
      fileName: "__aurora/derived/models/plc_city_gate.glb",
      resourceType: 0
    });
    expect(result.files[0]!.bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(result.summary).toMatchObject({
      generator: "in-process-aurora-mdl",
      generatedFiles: 1,
      candidateModels: 1,
      convertedModels: 1,
      failedModels: 0
    });
  });

  it("skips conversion when no converter command can produce the configured output", async () => {
    const service = new CliDerivedAssetGeneratorService(
      buildConfig({ command: "", outputExtension: "gltf" })
    );

    const result = await service.generateDerivedAssets({
      settingsRevision: 1,
      modulePrefix: "modules/current",
      sourceFiles: [file("models/plc_city_gate.mdl", "mdl")]
    });

    expect(result.files).toEqual([]);
    expect(result.summary).toMatchObject({
      generator: "cli",
      generatedFiles: 0,
      generatedBytes: 0,
      candidateModels: 1,
      skippedReason: "converter_not_configured"
    });
  });

  it("runs the configured converter and emits deterministic derived glb files", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-cli-derived-test-"));
    const scriptPath = join(tempRoot, "fake-converter.cjs");
    await writeFile(
      scriptPath,
      [
        "const fs = require('fs');",
        "const path = require('path');",
        "const source = process.argv[process.argv.indexOf('--input') + 1];",
        "const output = process.argv[process.argv.indexOf('--output') + 1];",
        "fs.mkdirSync(path.dirname(output), { recursive: true });",
        "fs.writeFileSync(output, Buffer.concat([Buffer.from('glb:'), fs.readFileSync(source)]));"
      ].join("\n"),
      "utf-8"
    );

    try {
      const service = new CliDerivedAssetGeneratorService(
        buildConfig({
          command: process.execPath,
          args: JSON.stringify([scriptPath, "--input", "{source}", "--output", "{output}"])
        })
      );

      const result = await service.generateDerivedAssets({
        settingsRevision: 1,
        modulePrefix: "modules/current",
        sourceFiles: [
          file("models/plc_city_gate.mdl", "mdl"),
          file("textures/plc_city_gate.dds", "texture")
        ]
      });

      expect(result.files).toHaveLength(1);
      expect(result.files[0]).toMatchObject({
        fileName: "__aurora/derived/models/plc_city_gate.glb",
        resourceType: 0
      });
      expect(result.files[0]!.bytes.toString("utf-8")).toBe("glb:mdl");
      expect(result.summary).toMatchObject({
        generator: "cli",
        generatedFiles: 1,
        generatedBytes: 7,
        candidateModels: 1,
        convertedModels: 1,
        failedModels: 0,
        skippedModels: 0
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("can invoke the repo-native ASCII MDL to GLB wrapper", async () => {
    const service = new CliDerivedAssetGeneratorService(
      buildConfig({
        command: process.execPath,
        timeoutMs: 20_000,
        args: JSON.stringify([
          require.resolve("ts-node/dist/bin.js"),
          "--transpile-only",
          join(process.cwd(), "scripts", "aurora-mdl-to-glb.ts"),
          "--input",
          "{source}",
          "--output",
          "{output}",
          "--resref",
          "{resref}",
          "--extension",
          "{extension}"
        ])
      })
    );

    const result = await service.generateDerivedAssets({
      settingsRevision: 1,
      modulePrefix: "modules/current",
      sourceFiles: [
        file(
          "models/plc_native_wrapper.mdl",
          [
            "newmodel plc_native_wrapper",
            "beginmodelgeom plc_native_wrapper",
            "node trimesh mesh01",
            "  verts 3",
            "    0 0 0",
            "    1 0 0",
            "    0 1 0",
            "  faces 1",
            "    0 1 2",
            "endnode",
            "endmodelgeom plc_native_wrapper"
          ].join("\n")
        )
      ]
    });

    expect(result.files).toHaveLength(1);
    expect(result.files[0]).toMatchObject({
      fileName: "__aurora/derived/models/plc_native_wrapper.glb",
      resourceType: 0
    });
    expect(result.files[0]!.bytes.readUInt32LE(0)).toBe(0x46546c67);
    expect(result.files[0]!.bytes.readUInt32LE(4)).toBe(2);
    expect(result.summary).toMatchObject({
      generator: "cli",
      generatedFiles: 1,
      candidateModels: 1,
      convertedModels: 1,
      failedModels: 0
    });
  }, 20_000);

  it("continues sync planning when a converter process fails", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-cli-derived-fail-test-"));
    const scriptPath = join(tempRoot, "failing-converter.cjs");
    await writeFile(scriptPath, "process.stderr.write('boom'); process.exit(7);", "utf-8");

    try {
      const service = new CliDerivedAssetGeneratorService(
        buildConfig({
          command: process.execPath,
          args: JSON.stringify([scriptPath, "--input", "{source}", "--output", "{output}"])
        })
      );

      const result = await service.generateDerivedAssets({
        settingsRevision: 1,
        modulePrefix: "modules/current",
        sourceFiles: [file("models/plc_broken.mdb", "mdb")]
      });

      expect(result.files).toEqual([]);
      expect(result.summary).toMatchObject({
        generator: "cli",
        generatedFiles: 0,
        generatedBytes: 0,
        candidateModels: 1,
        convertedModels: 0,
        failedModels: 1,
        skippedReason: "conversion_failed"
      });
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("reuses deterministic no-renderable-geometry failures without rerunning the converter", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-cli-derived-negative-cache-test-"));
    const scriptPath = join(tempRoot, "no-geometry-converter.cjs");
    const counterPath = join(tempRoot, "calls.txt");
    await writeFile(
      scriptPath,
      [
        "const fs = require('fs');",
        `fs.appendFileSync(${JSON.stringify(counterPath)}, 'x');`,
        "process.stderr.write('Binary Aurora MDL contains no renderable mesh geometry.');",
        "process.exit(1);"
      ].join("\n"),
      "utf-8"
    );

    try {
      const service = new CliDerivedAssetGeneratorService(
        buildConfig({
          command: process.execPath,
          args: JSON.stringify([scriptPath, "--input", "{source}", "--output", "{output}"])
        })
      );
      const input = {
        settingsRevision: 1,
        modulePrefix: "modules/current",
        sourceFiles: [file("models/pmh0.mdl", "dummy skeleton")]
      };

      const first = await service.generateDerivedAssets(input);
      const second = await service.generateDerivedAssets(input);

      expect(first.summary).toMatchObject({
        failedModels: 1,
        skippedReason: "conversion_failed"
      });
      expect(second.summary).toMatchObject({
        failedModels: 1,
        skippedReason: "conversion_failed"
      });
      expect(second.summary.failureReasons?.[0]).toContain("no renderable mesh geometry");
      await expect(readFile(counterPath, "utf-8")).resolves.toBe("x");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

function buildConfig(overrides: {
  command?: string;
  args?: string;
  timeoutMs?: number;
  maxModels?: number;
  outputExtension?: "glb" | "gltf";
}): AppConfigService {
  return {
    derivedAssetConverterCommand: overrides.command ?? "",
    derivedAssetConverterArgs:
      overrides.args ?? "[\"--input\",\"{source}\",\"--output\",\"{output}\"]",
    derivedAssetConverterTimeoutMs: overrides.timeoutMs ?? 5_000,
    derivedAssetMaxModels: overrides.maxModels ?? 20,
    derivedAssetOutputExtension: overrides.outputExtension ?? "glb"
  } as AppConfigService;
}

function file(fileName: string, content: string) {
  return {
    fileName,
    resourceType: 0,
    bytes: Buffer.from(content, "utf-8")
  };
}
