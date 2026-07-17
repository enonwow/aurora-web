import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-area-lighting-retail-oracle-scene-drivers.mjs"
);

describe("create-area-lighting-retail-oracle-scene-drivers", () => {
  it("writes source-only oracle scene drivers without claiming compiled runtime proof", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-drivers-"));
    const outRoot = "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers";
    const modulesDir = join(tempRoot, "modules");
    await mkdir(modulesDir, { recursive: true });

    const { stdout } = await execFileAsync(
      "node",
      [
        scriptPath,
        "--repoRoot",
        tempRoot,
        "--outRoot",
        outRoot,
        "--nwnModulesDir",
        modulesDir
      ],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    expect(cli).toMatchObject({
      status: "source-prepared-compiled-drivers-missing",
      summary: {
        driverCount: 6,
        sourceReadyCount: 6,
        compiledReadyCount: 0,
        missingCompiledDriverCount: 6,
        runtimeArtifactCount: 12,
        canonicalParityPromoted: false
      }
    });

    const manifest = JSON.parse(
      await readFile(
        join(tempRoot, outRoot, "retail-oracle-scene-drivers-manifest.json"),
        "utf8"
      )
    );
    expect(manifest.safety).toMatchObject({
      launchesRetailProcess: false,
      compilesScripts: false,
      injectsModuleResources: false,
      doesNotFabricateRetailArtifacts: true,
      canonicalParityPromoted: false
    });
    expect(manifest.drivers.map((driver: { scriptResref: string }) => driver.scriptResref)).toEqual(
      [
        "als_shcamp",
        "als_xlane",
        "als_pfxpri",
        "als_pfxprox",
        "als_pfxatt",
        "als_pfxblind"
      ]
    );
    expect(manifest.utilityScripts.map((utility: { resref: string }) => utility.resref)).toEqual([
      "als_autorun",
      "als_refbase",
      "als_reftmain",
      "als_xnoitem",
      "als_xnopfx",
      "als_xnoplc",
      "als_xnomdl",
      "als_xnotmain",
      "als_xnotsrc",
      "als_reftsrc",
      "als_refplc",
      "als_refmdl",
      "als_refitem",
      "als_refpfx",
      "als_pfxzero"
    ]);
    expect(
      manifest.drivers.every(
        (driver: { sourceReady: boolean; compiledDriverPresent: boolean; status: string }) =>
          driver.sourceReady === true &&
          driver.compiledDriverPresent === false &&
          driver.status === "source-prepared-compiled-driver-missing"
      )
    ).toBe(true);
    expect(
      manifest.drivers.every(
        (driver: { requiredAreaResrefs: string[] }) =>
          driver.requiredAreaResrefs.length === 1 && driver.requiredAreaResrefs[0] === "als_light_lab"
      )
    ).toBe(true);
    const crossLane = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_xlane.nss"),
      "utf8"
    );
    expect(crossLane).toContain("SetTileMainLightColor");
    expect(crossLane).toContain("ItemPropertyLight");
    expect(crossLane).toContain("VFX_DUR_LIGHT_BLUE_5");
    expect(crossLane).toContain("ALS_OBSERVE cross-lane lane-map");
    expect(crossLane).toContain("retail-cross-lane-active-slots.json requires direct renderer slot dump or pixel-observation JSON");
    const noItemAblation = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_xnoitem.nss"),
      "utf8"
    );
    expect(noItemAblation).toContain("cross-lane no-item ablation");
    expect(noItemAblation).toContain("retail-cross-lane-no-item-before-budget.png");
    expect(noItemAblation).toContain("retail-cross-lane-no-item-after-budget.png");
    expect(noItemAblation).toContain("item lane omitted");
    const noProgfxAblation = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_xnopfx.nss"),
      "utf8"
    );
    expect(noProgfxAblation).toContain("cross-lane no-progfx ablation");
    expect(noProgfxAblation).toContain("retail-cross-lane-no-progfx-before-budget.png");
    expect(noProgfxAblation).toContain("retail-cross-lane-no-progfx-after-budget.png");
    expect(noProgfxAblation).toContain("progfx lane omitted");
    expect(noProgfxAblation).not.toContain("AlsApplyVfxRowAt(VFX_DUR_LIGHT_BLUE_5");
    const noPlaceableAblation = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_xnoplc.nss"),
      "utf8"
    );
    expect(noPlaceableAblation).toContain("cross-lane no-placeable-lightcolor ablation");
    expect(noPlaceableAblation).toContain("retail-cross-lane-no-placeable-before-budget.png");
    expect(noPlaceableAblation).toContain("retail-cross-lane-no-placeable-after-budget.png");
    expect(noPlaceableAblation).toContain("placeables.2da campfire lane omitted");
    expect(noPlaceableAblation).toContain("plc_freetorch");
    const noMdlAblation = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_xnomdl.nss"),
      "utf8"
    );
    expect(noMdlAblation).toContain("cross-lane no-mdl-source-light ablation");
    expect(noMdlAblation).toContain("retail-cross-lane-no-mdl-before-budget.png");
    expect(noMdlAblation).toContain("retail-cross-lane-no-mdl-after-budget.png");
    expect(noMdlAblation).toContain("MDL source-light lane omitted");
    expect(noMdlAblation).not.toContain("ALS_MDL_LIGHT");
    expect(noMdlAblation).not.toContain('AlsFindOrCreatePlaceable("ALS_MDL_LIGHT"');
    const noTileMainAblation = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_xnotmain.nss"),
      "utf8"
    );
    expect(noTileMainAblation).toContain("cross-lane no-tile-main ablation");
    expect(noTileMainAblation).toContain("retail-cross-lane-no-tile-main-before-budget.png");
    expect(noTileMainAblation).toContain("retail-cross-lane-no-tile-main-after-budget.png");
    expect(noTileMainAblation).toContain("tile-main lane omitted");
    expect(noTileMainAblation).not.toContain("SetTileMainLightColor");
    expect(noTileMainAblation).toContain("SetTileSourceLightColor");
    const noTileSourceAblation = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_xnotsrc.nss"),
      "utf8"
    );
    expect(noTileSourceAblation).toContain("cross-lane no-tile-source ablation");
    expect(noTileSourceAblation).toContain("retail-cross-lane-no-tile-source-before-budget.png");
    expect(noTileSourceAblation).toContain("retail-cross-lane-no-tile-source-after-budget.png");
    expect(noTileSourceAblation).toContain("tile-source lane omitted");
    expect(noTileSourceAblation).toContain("SetTileMainLightColor");
    expect(noTileSourceAblation).not.toContain("SetTileSourceLightColor");
    const progFxReference = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_refpfx.nss"),
      "utf8"
    );
    expect(progFxReference).toContain("retail-ref-progfx-type4-light.png");
    expect(progFxReference).toContain("VFX_DUR_LIGHT_BLUE_5 only");
    const baselineReference = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_refbase.nss"),
      "utf8"
    );
    expect(baselineReference).toContain("retail-cross-lane-openpad-smoke.png");
    expect(baselineReference).toContain("no tile/placeable/MDL/item/ProgFX light lanes");
    const progFxCustomZero = await readFile(
      join(tempRoot, outRoot, "generated-scripts", "als_pfxzero.nss"),
      "utf8"
    );
    expect(progFxCustomZero).toContain("Param4=0");
    expect(progFxCustomZero).toContain("retail-progfx-priority-policy-custom-zero-after.png");
    expect(progFxCustomZero).toContain("stock retail has no Param4=0 row");
  });
});
