import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-area-lighting-progfx-custom-zero-override.mjs"
);

describe("create-area-lighting-progfx-custom-zero-override", () => {
  it("prepares a non-installed custom Type 4 Param4=0 override pack", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-pfxzero-"));
    const fixtureDir = join(tempRoot, "fixtures");
    const outDir = join(tempRoot, "out");
    await mkdir(fixtureDir, { recursive: true });

    const visualEffectsPath = join(fixtureDir, "visualeffects.2da");
    const progFxPath = join(fixtureDir, "progfx.2da");
    await writeFile(
      visualEffectsPath,
      [
        "2DA V2.0",
        "",
        "Label Type_FD OrientWithGround Imp_HeadCon_Node Imp_Impact_Node Imp_Root_S_Node Imp_Root_M_Node Imp_Root_L_Node Imp_Root_H_Node ProgFX_Impact SoundImpact ProgFX_Duration SoundDuration ProgFX_Cessation SoundCessastion Ces_HeadCon_Node Ces_Impact_Node Ces_Root_S_Node Ces_Root_M_Node Ces_Root_L_Node Ces_Root_H_Node ShakeType ShakeDelay ShakeDuration LowViolence LowQuality OrientWithObject",
        "153 VFX_DUR_LIGHT_BLUE_5 D 0 **** **** **** **** **** **** **** **** 304 **** 354 **** **** **** **** **** **** **** **** **** **** **** **** **** 0",
        "1302 **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** **** ****"
      ].join("\n")
    );
    await writeFile(
      progFxPath,
      [
        "2DA V2.0",
        "",
        "Label Type Param1 Param2 Param3 Param4 Param5 Param6 Param7 Param8",
        "304 LightBlue5m 4 Blue_5m 1.0 0 20 0 0 fx_light_clr ****",
        "1300 FreezeAnimations 13 **** **** **** **** **** **** **** ****"
      ].join("\n")
    );

    const { stdout } = await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--visualeffects",
        visualEffectsPath,
        "--progfx",
        progFxPath,
        "--outDir",
        outDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const manifest = JSON.parse(
      await readFile(join(outDir, "custom-progfx-param4-zero-override-manifest.json"), "utf8")
    );
    const visualEffects = await readFile(join(outDir, "visualeffects.2da"), "utf8");
    const progFx = await readFile(join(outDir, "progfx.2da"), "utf8");

    expect(cli).toMatchObject({
      status: "custom-param4-zero-override-pack-prepared-not-stock-retail-parity",
      installsOverrideFiles: false,
      canonicalParityPromoted: false
    });
    expect(manifest).toMatchObject({
      passed: false,
      canonicalParityPromoted: false,
      stockRetailRowPresent: false,
      customOverrideRequired: true,
      installsOverrideFiles: false,
      overwritesUserOverrideDirectory: false,
      customRows: {
        visualeffects2da: {
          rowId: 1302,
          typeFd: "D",
          progFxDuration: 1302
        },
        progfx2da: {
          rowId: 1302,
          type: 4,
          param1Animation: "Blue_5m",
          param4Priority: "0",
          param7Model: "fx_light_clr"
        }
      },
      sourceRows: {
        visualeffects2da1302: "blank-stock-row",
        progfx2da1302: "missing-stock-row"
      }
    });
    expect(manifest.checks.every((check: { passed: boolean }) => check.passed)).toBe(true);
    expect(visualEffects).toContain(
      "1302 ALS_PFX_ZERO_BLUE_5 D 0 **** **** **** **** **** **** **** **** 1302"
    );
    expect(progFx).toContain("1301 **** **** **** **** **** **** **** **** **** ****");
    expect(progFx).toContain(
      "1302 ALS_LightBlue5mPriority0 4 Blue_5m 1.0 0 0 0 0 fx_light_clr ****"
    );
  });
});
