import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const createDriversScriptPath = resolve(
  __dirname,
  "../../scripts/create-area-lighting-retail-oracle-scene-drivers.mjs"
);
const compileScriptPath = resolve(
  __dirname,
  "../../scripts/compile-area-lighting-retail-oracle-scene-drivers.mjs"
);

describe("compile-area-lighting-retail-oracle-scene-drivers", () => {
  it("compiles prepared oracle driver sources into a non-runtime-proof compiled pack manifest", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-driver-compile-"));
    const outRoot = "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers";
    const modulesDir = join(tempRoot, "modules");
    const fakeCompiler = join(tempRoot, "fake-nwn-script-comp.cjs");
    await mkdir(modulesDir, { recursive: true });
    await writeFile(
      fakeCompiler,
      `
const { mkdirSync, writeFileSync } = require("node:fs");
const { basename, join } = require("node:path");
const args = process.argv.slice(2);
if (args.includes("--version")) {
  console.log("fake nwn_script_comp 1.0");
  process.exit(0);
}
const outDir = args[args.indexOf("-d") + 1];
const compileStart = args.indexOf("-c") + 1;
const sources = args.slice(compileStart).filter((arg) => arg.endsWith(".nss"));
mkdirSync(outDir, { recursive: true });
for (const source of sources) {
  writeFileSync(join(outDir, basename(source, ".nss") + ".ncs"), "compiled:" + basename(source));
}
console.error("fake compile: " + sources.length + " successful, 0 errored");
`
    );

    await execFileAsync(
      "node",
      [
        createDriversScriptPath,
        "--repoRoot",
        tempRoot,
        "--outRoot",
        outRoot,
        "--nwnModulesDir",
        modulesDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const { stdout } = await execFileAsync(
      "node",
      [
        compileScriptPath,
        "--repoRoot",
        tempRoot,
        "--compiler",
        process.execPath,
        "--compilerPreArg",
        fakeCompiler,
        "--nwnRoot",
        tempRoot,
        "--userDirectory",
        tempRoot
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    expect(cli).toMatchObject({
      status: "compiled-pack-ready-module-injection-required",
      summary: {
        driverCount: 6,
        compiledOutputCount: 6,
        missingCompiledOutputCount: 0,
        utilityScriptCount: 15,
        compiledUtilityCount: 15,
        missingCompiledUtilityCount: 0,
        runtimeArtifactCount: 12,
        canonicalParityPromoted: false
      }
    });

    const manifest = JSON.parse(
      await readFile(join(tempRoot, outRoot, "retail-oracle-scene-drivers-compile-manifest.json"), "utf8")
    );
    expect(manifest.safety).toMatchObject({
      launchesRetailProcess: false,
      injectsModuleResources: false,
      capturesRuntimeArtifacts: false,
      writesCompiledScripts: true,
      doesNotFabricateRetailArtifacts: true,
      canonicalParityPromoted: false
    });
    expect(manifest.drivers.every((driver: { compiledReady: boolean }) => driver.compiledReady)).toBe(
      true
    );
    expect(
      manifest.utilityScripts.map((utility: { scriptResref: string; compiledReady: boolean }) => ({
        scriptResref: utility.scriptResref,
        compiledReady: utility.compiledReady
      }))
    ).toEqual(
      expect.arrayContaining([
        { scriptResref: "als_refbase", compiledReady: true },
        { scriptResref: "als_reftmain", compiledReady: true },
        { scriptResref: "als_xnoitem", compiledReady: true },
        { scriptResref: "als_xnopfx", compiledReady: true },
        { scriptResref: "als_xnoplc", compiledReady: true },
        { scriptResref: "als_xnomdl", compiledReady: true },
        { scriptResref: "als_xnotmain", compiledReady: true },
        { scriptResref: "als_xnotsrc", compiledReady: true },
        { scriptResref: "als_reftsrc", compiledReady: true },
        { scriptResref: "als_refplc", compiledReady: true },
        { scriptResref: "als_refmdl", compiledReady: true },
        { scriptResref: "als_refitem", compiledReady: true },
        { scriptResref: "als_refpfx", compiledReady: true },
        { scriptResref: "als_pfxzero", compiledReady: true }
      ])
    );
    expect(manifest.nonEvidenceNotice).toContain("not retail pixels");
  });
});
