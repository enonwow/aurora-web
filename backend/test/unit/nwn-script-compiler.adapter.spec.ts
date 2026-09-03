import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DisabledNwnScriptCompilerAdapter,
  NwnScriptCompilerAdapter,
  NwnScriptCompilerError,
  type NwnScriptCompilerAdapterConfig,
} from "../../src/modules/areas/adapters/outbound/compiler/nwn-script-compiler.adapter";

describe("NwnScriptCompilerAdapter", () => {
  it("produces deterministic NCS/NDB artifacts and a freshness receipt", async () => {
    await withFakeCompiler(async ({ config }) => {
      const adapter = new NwnScriptCompilerAdapter(config);
      const input = {
        target: resource("area_enter", "void main() { int value = 1 + 1; }"),
        includes: [resource("area_shared", "int SharedValue() { return 2; }")],
      } as const;

      const first = await adapter.compile(input);
      const second = await adapter.compile(input);

      expect(first.status).toBe("compiled");
      expect(second.status).toBe("compiled");
      expect(first.diagnostics).toEqual([]);
      expect(first.artifacts?.ncs.bytes.equals(second.artifacts!.ncs.bytes)).toBe(true);
      expect(first.artifacts?.ndb.bytes.equals(second.artifacts!.ndb.bytes)).toBe(true);
      expect(first.artifacts?.ncs.sha256).toBe(second.artifacts?.ncs.sha256);
      expect(first.artifacts?.ndb.sha256).toBe(second.artifacts?.ndb.sha256);
      expect(first.receiptSha256).toBe(second.receiptSha256);
      expect(first.provider).toMatchObject({
        executableSha256: config.expectedExecutableSha256,
        languageSpecSha256: config.expectedLanguageSpecSha256,
        versionMarker: config.expectedVersionMarker,
      });
      expect(first.sourceSha256).toBe(sha256(input.target.bytes));
      expect(first.includeSetSha256).toMatch(/^[a-f0-9]{64}$/u);
      expect(JSON.stringify(first)).not.toContain("void main");
      expect(JSON.stringify(first)).not.toContain(config.executablePath);
      expect(JSON.stringify(first)).not.toContain(config.languageSpecPath);
    });
  });

  it("returns one sanitized structured diagnostic for a compiler rejection", async () => {
    await withFakeCompiler(async ({ config, root }) => {
      const adapter = new NwnScriptCompilerAdapter(config);
      const result = await adapter.compile({
        target: resource("invalid_script", "INVALID SOURCE"),
        includes: [],
      });

      expect(result.status).toBe("rejected");
      expect(result.artifacts).toBeUndefined();
      expect(result.diagnostics).toEqual([
        {
          code: "NWNSCRIPT_COMPILE_ERROR",
          severity: "error",
          line: 3,
          message: "UNKNOWN STATE IN COMPILER [PRIMARY_EXPRESSION(0,0):SEMICOLON]",
        },
      ]);
      expect(JSON.stringify(result)).not.toContain(root);
      expect(JSON.stringify(result)).not.toContain("2026-08-26T16:57:30");
      expect(result.receiptSha256).toMatch(/^[a-f0-9]{64}$/u);
    });
  });

  it("fails before process execution when the executable identity drifts", async () => {
    await withFakeCompiler(async ({ config, counterPath }) => {
      const adapter = new NwnScriptCompilerAdapter({
        ...config,
        expectedExecutableSha256: "0".repeat(64),
      });

      await expect(
        adapter.compile({
          target: resource("area_enter", "void main() {}"),
          includes: [],
        }),
      ).rejects.toMatchObject({ code: "NWNSCRIPT_COMPILER_IDENTITY_MISMATCH" });
      await expect(readFile(counterPath, "utf8")).rejects.toMatchObject({ code: "ENOENT" });
    });
  });

  it("kills a bounded invocation that exceeds its timeout", async () => {
    await withFakeCompiler(async ({ config }) => {
      const adapter = new NwnScriptCompilerAdapter({ ...config, timeoutMs: 100 });

      await expect(
        adapter.compile({
          target: resource("hang_script", "HANG"),
          includes: [],
        }),
      ).rejects.toMatchObject({ code: "NWNSCRIPT_COMPILER_TIMEOUT" });
    });
  });

  it("rejects oversized artifacts and unsafe or ambiguous inputs", async () => {
    await withFakeCompiler(async ({ config }) => {
      const adapter = new NwnScriptCompilerAdapter({
        ...config,
        maxArtifactBytes: 64,
      });

      await expect(
        adapter.compile({
          target: resource("large_script", "LARGE"),
          includes: [],
        }),
      ).rejects.toMatchObject({ code: "NWNSCRIPT_COMPILER_ARTIFACT_BUDGET_EXCEEDED" });

      await expect(
        adapter.compile({
          target: resource("../escape", "void main() {}"),
          includes: [],
        }),
      ).rejects.toMatchObject({ code: "NWNSCRIPT_COMPILER_INPUT_INVALID" });

      await expect(
        adapter.compile({
          target: resource("area_enter", "void main() {}"),
          includes: [
            resource("shared", "int Value() { return 1; }"),
            resource("shared", "int Value() { return 2; }"),
          ],
        }),
      ).rejects.toMatchObject({ code: "NWNSCRIPT_COMPILER_INPUT_INVALID" });
    });
  });

  it("exposes stable typed provider failures without leaking raw process output", async () => {
    const error = new NwnScriptCompilerError(
      "NWNSCRIPT_COMPILER_UNAVAILABLE",
      "Configured compiler is unavailable.",
    );
    expect(error.name).toBe("NwnScriptCompilerError");
    expect(error.code).toBe("NWNSCRIPT_COMPILER_UNAVAILABLE");

    const disabled = new DisabledNwnScriptCompilerAdapter();
    await expect(
      disabled.compile({
        target: resource("area_enter", "void main() {}"),
        includes: [],
      }),
    ).rejects.toMatchObject({ code: "NWNSCRIPT_COMPILER_UNAVAILABLE" });
  });
});

async function withFakeCompiler(
  run: (context: {
    config: NwnScriptCompilerAdapterConfig;
    counterPath: string;
    root: string;
  }) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "aurora-nwscript-compiler-test-"));
  const compilerScriptPath = join(root, "fake-compiler.cjs");
  const languageSpecPath = join(root, "nwscript.nss");
  const counterPath = join(root, "compile-count.txt");
  await writeFile(languageSpecPath, "// pinned language specification\n", "utf8");
  await writeFile(
    compilerScriptPath,
    [
      "const crypto = require('node:crypto');",
      "const fs = require('node:fs');",
      "const path = require('node:path');",
      "const args = process.argv.slice(2);",
      "if (args.includes('--version')) { process.stdout.write('fake nwn compiler 2.1.2'); process.exit(0); }",
      `fs.appendFileSync(${JSON.stringify(counterPath)}, 'x');`,
      "const target = args[args.indexOf('-c') + 1];",
      "const outDir = args[args.indexOf('-d') + 1];",
      "const source = fs.readFileSync(target);",
      "if (source.toString('utf8').includes('HANG')) { setInterval(() => {}, 1000); return; }",
      "if (source.toString('utf8').includes('INVALID')) {",
      "  process.stderr.write(`F [2026-08-26T16:57:30] [1/1] ${target}: ${path.basename(target)}(3): ERROR: UNKNOWN STATE IN COMPILER [PRIMARY_EXPRESSION(0,0):SEMICOLON] [<0ms]`);",
      "  process.exit(1);",
      "}",
      "fs.mkdirSync(outDir, { recursive: true });",
      "const stem = path.basename(target, '.nss');",
      "const digest = crypto.createHash('sha256').update(source).digest();",
      "const ncs = source.toString('utf8').includes('LARGE') ? Buffer.alloc(128, 7) : Buffer.concat([Buffer.from('NCS'), digest]);",
      "fs.writeFileSync(path.join(outDir, `${stem}.ncs`), ncs);",
      "fs.writeFileSync(path.join(outDir, `${stem}.ndb`), Buffer.concat([Buffer.from('NDB'), digest]));",
    ].join("\n"),
    "utf8",
  );

  const executableBytes = await readFile(process.execPath);
  const languageSpecBytes = await readFile(languageSpecPath);
  const config: NwnScriptCompilerAdapterConfig = {
    executablePath: process.execPath,
    executableArgsPrefix: [compilerScriptPath],
    expectedExecutableSha256: sha256(executableBytes),
    expectedVersionMarker: "fake nwn compiler 2.1.2",
    languageSpecPath,
    expectedLanguageSpecSha256: sha256(languageSpecBytes),
    runtimeLibraryDirectories: [],
    timeoutMs: 2_000,
    maxCapturedOutputBytes: 64 * 1024,
    maxArtifactBytes: 4 * 1024 * 1024,
  };

  try {
    await run({ config, counterPath, root });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function resource(resref: string, source: string) {
  return Object.freeze({ resref, bytes: Buffer.from(source, "utf8") });
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
