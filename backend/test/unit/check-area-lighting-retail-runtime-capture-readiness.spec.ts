import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/check-area-lighting-retail-runtime-capture-readiness.mjs"
);

describe("check-area-lighting-retail-runtime-capture-readiness", () => {
  it("writes a safe blocked readiness manifest when retail runtime is absent", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-retail-runtime-readiness-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const gatePath = join(absoluteArtifactDir, "area-lighting-retail-oracle-artifact-gate.json");
    const processProbePath = join(tempRoot, "process-probe.json");
    const modulesDir = join(tempRoot, "modules");
    await mkdir(absoluteArtifactDir, { recursive: true });
    await mkdir(modulesDir, { recursive: true });
    await writeFile(
      gatePath,
      `${JSON.stringify({
        status: "blocked",
        summary: {
          requiredArtifacts: 25,
          presentRequiredArtifacts: 13,
          missingRequiredArtifacts: 12
        },
        missingRequiredArtifacts: [
          "retail-or-toolset-shadowvol-campfire.png",
          "retail-cross-lane-active-slots.json",
          "retail-progfx-blindvision-active.png"
        ]
      })}\n`
    );
    await writeFile(
      processProbePath,
      `${JSON.stringify({
        status: "not_running",
        processes: []
      })}\n`
    );

    const { stdout } = await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--artifactDir",
        artifactDir,
        "--gateReport",
        gatePath,
        "--processProbeJson",
        processProbePath,
        "--nwnModulesDir",
        modulesDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status: "blocked-no-retail-runtime-process",
      processStatus: "not_running",
      summary: {
        requiredRuntimeArtifacts: 12,
        presentRuntimeArtifacts: 0,
        missingRuntimeArtifacts: 12,
        runtimeReadyTargets: 0,
        blockedRuntimeTargets: 12
      }
    });
    const manifest = JSON.parse(
      await readFile(
        join(absoluteArtifactDir, "area-lighting-retail-runtime-capture-readiness.json"),
        "utf8"
      )
    );
    expect(manifest.safety).toMatchObject({
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      sendsWindowMessages: false,
      launchesRetailProcess: false
    });
    expect(manifest.targets).toHaveLength(12);
    expect(
      manifest.sceneStaging.cases.every(
        (captureCase: { requiredAreaResrefs: string[] }) =>
          captureCase.requiredAreaResrefs.length === 1 &&
          captureCase.requiredAreaResrefs[0] === "als_light_lab"
      )
    ).toBe(true);
    expect(manifest.targets).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifact: "retail-or-toolset-shadowvol-campfire.png",
          readiness: "blocked-retail-runtime-not-running"
        }),
        expect.objectContaining({
          artifact: "retail-cross-lane-active-slots.json",
          readiness: "blocked-retail-runtime-not-running"
        })
      ])
    );
  });
});
