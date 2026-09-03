import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { deflateSync } from "node:zlib";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/validate-placeable-lighting-matched-retail-parity.mjs"
);

const MODULE_SHA256 =
  "29e158317794d6519e2a807cec5ce4bfd4b025be33886694b1340515d9c94604";
const PLACEABLE_MDL_SHA256 =
  "144d84a94f1039e1031ea6949098c0106ac81f96794df308853a28dd757d1db4";
const TERRAIN_MDL_SHA256 =
  "08c7810e8faf1ba4d4730cf14c8fb2737cf5f695e02e3d4f38d0e51f086da44d";
const TERRAIN_GLB_SHA256 =
  "0c8a58aa3f6643f09dfe888ce82cf82da25cfb2a184b31ad534b0e7425161cd1";
const TERRAIN_DDS_SHA256 =
  "dae40e6294f63ac13ced7de4e138b32c57ef99357a291f2664178ed8a8ed7eb7";

describe("validate-placeable-lighting-matched-retail-parity", () => {
  it("creates hash-bound metrics and images without self-promoting retail parity", async () => {
    const fixture = await createFixture();

    const { stdout } = await execFileAsync(
      "node",
      [scriptPath, "compare", "--profile", fixture.profilePath, "--outDir", fixture.compareDir],
      { maxBuffer: 1024 * 1024 }
    );

    const cli = JSON.parse(stdout);
    const report = JSON.parse(
      await readFile(join(fixture.compareDir, "matched-comparison.json"), "utf8")
    );

    expect(cli).toMatchObject({
      status: "metrics-within-frozen-tolerance-awaiting-visual-review",
      retailParityAccepted: false
    });
    expect(report).toMatchObject({
      version: "aurora-placeable-lighting-matched-comparison/v1",
      status: "metrics-within-frozen-tolerance-awaiting-visual-review",
      captureIntegrityAccepted: true,
      metricsWithinFrozenTolerance: true,
      retailParityAccepted: false,
      canonicalParityPromoted: false,
      fixture: {
        id: "als-oracle-campfire-v1",
        moduleSha256: MODULE_SHA256,
        area: "als_light_lab"
      }
    });
    expect(Object.keys(report.features).sort()).toEqual(
      ["additiveGlow", "backgroundExposure", "flameCore", "receiverFootprint"].sort()
    );
    expect(report.outputs.sideBySide.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.outputs.heatmap.sha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.blockerCodes).toEqual([]);
  });

  it("keeps admission blocked when the bound human visual review fails", async () => {
    const fixture = await createFixture();
    await execFileAsync(
      "node",
      [scriptPath, "compare", "--profile", fixture.profilePath, "--outDir", fixture.compareDir],
      { maxBuffer: 1024 * 1024 }
    );
    const comparisonPath = join(fixture.compareDir, "matched-comparison.json");
    const comparison = JSON.parse(await readFile(comparisonPath, "utf8"));
    const reviewPath = join(fixture.root, "visual-review-failed.json");
    await writeFile(
      reviewPath,
      JSON.stringify(makeVisualReview(comparisonPath, comparison, "failed"), null, 2)
    );
    const admissionPath = join(fixture.root, "admission-failed.json");

    await expect(
      execFileAsync(
        "node",
        [
          scriptPath,
          "admit",
          "--profile",
          fixture.profilePath,
          "--comparison",
          comparisonPath,
          "--visualReview",
          reviewPath,
          "--out",
          admissionPath
        ],
        { maxBuffer: 1024 * 1024 }
      )
    ).rejects.toMatchObject({ code: 1 });

    const admission = JSON.parse(await readFile(admissionPath, "utf8"));
    expect(admission).toMatchObject({
      version: "aurora-placeable-lighting-matched-retail-parity-admission/v1",
      accepted: false,
      proofCompleteness: "failed",
      modelVisibility: "visible",
      captureIntegrityAccepted: true,
      retailParityAccepted: false,
      canonicalParityPromoted: false
    });
    expect(admission.blockerCodes).toContain("human-visual-review-not-passed");
  });

  it("admits only the exact metric-passing comparison with a passing hash-bound visual review", async () => {
    const fixture = await createFixture();
    await execFileAsync(
      "node",
      [scriptPath, "compare", "--profile", fixture.profilePath, "--outDir", fixture.compareDir],
      { maxBuffer: 1024 * 1024 }
    );
    const comparisonPath = join(fixture.compareDir, "matched-comparison.json");
    const comparison = JSON.parse(await readFile(comparisonPath, "utf8"));
    const reviewPath = join(fixture.root, "visual-review-passed.json");
    await writeFile(
      reviewPath,
      JSON.stringify(makeVisualReview(comparisonPath, comparison, "passed"), null, 2)
    );
    const admissionPath = join(fixture.root, "admission-passed.json");

    const { stdout } = await execFileAsync(
      "node",
      [
        scriptPath,
        "admit",
        "--profile",
        fixture.profilePath,
        "--comparison",
        comparisonPath,
        "--visualReview",
        reviewPath,
        "--out",
        admissionPath
      ],
      { maxBuffer: 1024 * 1024 }
    );

    expect(JSON.parse(stdout)).toMatchObject({
      status: "verified",
      accepted: true,
      retailParityAccepted: true
    });
    const admission = JSON.parse(await readFile(admissionPath, "utf8"));
    expect(admission).toMatchObject({
      proofCompleteness: "verified",
      modelVisibility: "visible",
      captureIntegrityAccepted: true,
      retailParityAccepted: true,
      canonicalParityPromoted: true,
      accepted: true,
      blockerCodes: []
    });
  });

  it("rejects a technically settled Web capture whose terrain lineage is not retail", async () => {
    const fixture = await createFixture({ terrainSourceLineageStatus: "blocked" });

    await expect(
      execFileAsync(
        "node",
        [scriptPath, "compare", "--profile", fixture.profilePath, "--outDir", fixture.compareDir],
        { maxBuffer: 1024 * 1024 }
      )
    ).rejects.toMatchObject({ code: 1 });

    const blocker = JSON.parse(
      await readFile(join(fixture.compareDir, "matched-comparison.blocker.json"), "utf8")
    );
    expect(blocker).toMatchObject({
      version: "aurora-placeable-lighting-matched-comparison-blocker/v1",
      captureIntegrityAccepted: false,
      retailParityAccepted: false,
      canonicalParityPromoted: false
    });
    expect(blocker.blockerCodes).toContain("web-terrain-source-lineage-not-retail");
  });
});

async function createFixture(
  options: { terrainSourceLineageStatus?: string } = {}
): Promise<{
  root: string;
  profilePath: string;
  compareDir: string;
}> {
  const root = await mkdtemp(join(tmpdir(), "aurora-placeable-lighting-parity-"));
  await mkdir(join(root, "artifacts"), { recursive: true });

  const nwnPngPath = join(root, "artifacts", "nwn.png");
  const nwnRepeatPngPath = join(root, "artifacts", "nwn-repeat.png");
  const webPngPath = join(root, "artifacts", "web.png");
  const pixels = makeFeaturePng();
  await writeFile(nwnPngPath, pixels);
  await writeFile(nwnRepeatPngPath, makeFeaturePng(-1));
  await writeFile(webPngPath, pixels);

  const geometryPath = join(root, "artifacts", "geometry.json");
  await writeFile(geometryPath, JSON.stringify({ status: "verified" }));
  const observationPath = join(root, "artifacts", "observation.json");
  const engineLogPath = join(root, "artifacts", "engine.log");
  await writeFile(engineLogPath, "module=als_oracle area=als_light_lab loaded=true\n");

  const fixtureRow = {
    id: "als-oracle-campfire-v1",
    resref: "plc_campfr",
    appearance: 58,
    model: "plc_i06",
    position: [65, 65, 0]
  };
  const aurS07ProfilePath = join(root, "aur-s07-profile.json");
  const aurS07Profile = {
    version: "aur-s07-runtime-profile/v1",
    id: "als-oracle-campfire-runtime-v1",
    module: {
      sha256: MODULE_SHA256,
      area: "als_light_lab",
      entryPoint: [65, 55, 0]
    },
    orderedHakList: [],
    geometryGate: {
      status: "verified",
      artifact: geometryPath,
      sha256: await hashFile(geometryPath)
    },
    launch: { mode: "user_owned_test_module_action", processName: "nwmain" },
    fixtures: [fixtureRow]
  };
  await writeFile(aurS07ProfilePath, JSON.stringify(aurS07Profile, null, 2));

  const observation = {
    version: "aur-s07-runtime-observation/v1",
    observedAt: "2026-08-19T10:00:00.000Z",
    profileId: aurS07Profile.id,
    process: { name: "nwmain", pid: 1234 },
    moduleSha256: MODULE_SHA256,
    area: "als_light_lab",
    entryPoint: [65, 55, 0]
  };
  await writeFile(observationPath, JSON.stringify(observation, null, 2));

  const packetPath = join(root, "aur-s07-packet.json");
  const packet = {
    version: "aur-s07-runtime-packet/v1",
    profileId: aurS07Profile.id,
    moduleSha256: MODULE_SHA256,
    area: "als_light_lab",
    entryPoint: [65, 55, 0],
    fixtures: [fixtureRow],
    modelVisibility: { status: "visible", blank: false, placeholder: false },
    artifacts: [
      {
        kind: "runtime-observation",
        path: observationPath,
        sha256: await hashFile(observationPath)
      },
      { kind: "runtime-capture", path: nwnPngPath, sha256: await hashFile(nwnPngPath) },
      { kind: "engine-load-log", path: engineLogPath, sha256: await hashFile(engineLogPath) }
    ]
  };
  await writeFile(packetPath, JSON.stringify(packet, null, 2));

  const validationPath = join(root, "aur-s07-validation.json");
  await writeFile(
    validationPath,
    JSON.stringify({ ok: true, status: "verified", profileId: aurS07Profile.id }, null, 2)
  );

  const webFramePath = join(root, "web.frame.json");
  const webFrame = {
    version: "aurora-vfx-app-route-cdp-capture/v1",
    capturedAt: "2026-08-19T10:02:00.000Z",
    requestedRoute:
      "http://127.0.0.1/dev/area-light-shadow-preview?oracleFixture=als-oracle-campfire-v1",
    finalRoute:
      "http://127.0.0.1/dev/area-light-shadow-preview?oracleFixture=als-oracle-campfire-v1",
    screenshotPath: webPngPath,
    requestedViewport: { width: 4, height: 4, deviceScaleFactor: 1 },
    accepted: false,
    captureIntegrityAccepted: true,
    retailParityAccepted: false,
    staticCaptureTimeSeconds: 1,
    domStatus: {
      routePath: "/dev/area-light-shadow-preview",
      runtimeObservability: {
        version: "aurora-vfx-runtime-observability/v1",
        assetSettlement: { status: "settled" },
        proofGate: { status: "pass", blockerManifest: [] }
      },
      areaPreview: {
        oracleFixture: "als-oracle-campfire-v1",
        renderStatus: "ready",
        placeableModelStatus: "loaded",
        placeableModelTextureSettled: true,
        placeableSourceLineageStatus: "pass",
        placeableSourceModelObjectKeys: [
          "/__aurora/sources/vanilla/models/plc_i06.mdl"
        ],
        placeableSourceModelHashes: [PLACEABLE_MDL_SHA256],
        placeableLightProjectionStatus: "pass",
        terrainSourceLineageStatus: options.terrainSourceLineageStatus ?? "pass",
        terrainSourceModelObjectKeys: [
          "/__aurora/sources/vanilla/models/tin01_d11_01.mdl"
        ],
        terrainSourceModelHashes: [TERRAIN_MDL_SHA256],
        terrainModelAssetObjectKeys: [
          "/__aurora/derived/models/aurora-mdl-to-glb_v18-source-proven-texture-aliases/tin01_d11_01.glb"
        ],
        terrainModelAssetHashes: [TERRAIN_GLB_SHA256],
        terrainTextureObjectKeys: [
          "/__aurora/sources/vanilla/textures/tin01_shpflr1.dds"
        ],
        terrainTextureHashes: [TERRAIN_DDS_SHA256],
        placeableLightingProof: {
          version: "aurora-placeable-lighting-proof-snapshot/v2",
          profile: {
            version: "aurora-placeable-lighting-proof-profile/v1",
            receiver: "area",
            pointLight: true,
            halo: false,
            vfx: true,
            shadow: true,
            postprocess: true
          },
          status: "blocked",
          retailParityStatus: "blocked_pending_matched_nwn_oracle",
          blockerCodes: [
            "APL-PROOF-VFX-ENABLED",
            "APL-PROOF-SHADOW-ENABLED",
            "APL-PROOF-POSTPROCESS-ENABLED"
          ],
          facts: {
            areaReceiverMeshCount: 1,
            debugReceiverMeshCount: 0,
            reactiveReceiverMaterialCount: 1,
            unlitReceiverMaterialCount: 0,
            unknownReceiverMaterialCount: 0,
            pointLightCount: 1,
            assetSettlementStatus: "settled"
          }
        }
      }
    }
  };
  await writeFile(webFramePath, JSON.stringify(webFrame, null, 2));

  const cameraEvidencePath = join(root, "camera-time-alignment.json");
  await writeFile(
    cameraEvidencePath,
    JSON.stringify(
      {
        version: "aurora-placeable-lighting-camera-time-alignment/v1",
        status: "matched",
        fixtureId: "als-oracle-campfire-v1",
        moduleSha256: MODULE_SHA256,
        area: "als_light_lab",
        viewport: { width: 4, height: 4, deviceScaleFactor: 1 },
        timeline: { status: "matched", nwnSeconds: 1, webSeconds: 1 },
        camera: {
          status: "matched",
          method: "als-camera-source-command-plus-web-readback",
          nwn: { directionDegrees: 0, distance: 10, pitchDegrees: 45 },
          web: {
            position: [0, 10, 10],
            target: [0, 0, 0],
            projection: "perspective"
          }
        },
        freshness: { status: "fresh", maxCaptureSkewMs: 300_000 }
      },
      null,
      2
    )
  );

  const policyPath = join(root, "similarity-policy.json");
  const featureTolerance = {
    maxMeanLumaRelativeError: 0.05,
    maxP95LumaRelativeError: 0.05,
    maxMeanRgbDistance: 0.05,
    maxWarmChromaDelta: 0.05,
    maxBrightPixelRatioDelta: 0.05
  };
  await writeFile(
    policyPath,
    JSON.stringify(
      {
        version: "aurora-placeable-lighting-visual-similarity-policy/v1",
        policyId: "als-oracle-campfire-pre-web-tuning-v1",
        status: "frozen-before-parity-tuning",
        frozenAt: "2026-08-19T09:00:00.000Z",
        retailOracleCaptures: [
          { path: nwnPngPath, sha256: await hashFile(nwnPngPath) },
          { path: nwnRepeatPngPath, sha256: await hashFile(nwnRepeatPngPath) }
        ],
        requiredFeatures: [
          "flameCore",
          "additiveGlow",
          "receiverFootprint",
          "backgroundExposure"
        ],
        regions: {
          flameCore: { x: 0, y: 0, width: 2, height: 2, brightLumaThreshold: 0.4 },
          additiveGlow: { x: 2, y: 0, width: 2, height: 2, brightLumaThreshold: 0.2 },
          receiverFootprint: { x: 0, y: 2, width: 2, height: 2, brightLumaThreshold: 0.15 },
          backgroundExposure: { x: 2, y: 2, width: 2, height: 2, brightLumaThreshold: 0.9 }
        },
        tolerances: {
          flameCore: {
            ...featureTolerance,
            maxPeakLumaRelativeError: 0.05,
            maxBrightBoundsWidthRelativeError: 0.05,
            maxBrightBoundsHeightRelativeError: 0.05
          },
          additiveGlow: featureTolerance,
          receiverFootprint: featureTolerance,
          backgroundExposure: {
            maxMeanLumaRelativeError: 0.05,
            maxMeanRgbDistance: 0.05
          }
        }
      },
      null,
      2
    )
  );

  const profilePath = join(root, "matched-profile.json");
  await writeFile(
    profilePath,
    JSON.stringify(
      {
        version: "aurora-placeable-lighting-matched-retail-parity-profile/v1",
        profileId: "als-oracle-campfire-matched-v1",
        fixture: {
          id: "als-oracle-campfire-v1",
          moduleSha256: MODULE_SHA256,
          area: "als_light_lab",
          entryPoint: [65, 55, 0],
          position: [65, 65, 0],
          orderedHakList: [],
          placeable: {
            resref: "plc_campfr",
            appearance: 58,
            modelResref: "plc_i06",
            sourceMdlSha256: PLACEABLE_MDL_SHA256
          },
          receiver: {
            sourceMdlSha256: TERRAIN_MDL_SHA256,
            modelAssetSha256: TERRAIN_GLB_SHA256,
            textureSha256: TERRAIN_DDS_SHA256
          }
        },
        aurS07: {
          profile: { path: aurS07ProfilePath, sha256: await hashFile(aurS07ProfilePath) },
          packet: { path: packetPath, sha256: await hashFile(packetPath) },
          validation: { path: validationPath, sha256: await hashFile(validationPath) }
        },
        web: {
          frame: { path: webFramePath, sha256: await hashFile(webFramePath) },
          screenshot: { path: webPngPath, sha256: await hashFile(webPngPath) }
        },
        comparison: {
          viewport: { width: 4, height: 4, deviceScaleFactor: 1 },
          rendererProfile: "enhanced-performance",
          cameraTimeAlignment: {
            path: cameraEvidencePath,
            sha256: await hashFile(cameraEvidencePath)
          },
          policy: { path: policyPath, sha256: await hashFile(policyPath) }
        }
      },
      null,
      2
    )
  );

  return { root, profilePath, compareDir: join(root, "comparison") };
}

function makeVisualReview(
  comparisonPath: string,
  comparison: Record<string, any>,
  verdict: "passed" | "failed"
): Record<string, unknown> {
  return {
    version: "aurora-placeable-lighting-human-visual-review/v1",
    reviewedAt: "2026-08-19T10:05:00.000Z",
    reviewer: "test-reviewer",
    comparison: { path: comparisonPath, sha256: sha256JsonFileSync(comparisonPath) },
    sideBySideSha256: comparison.outputs.sideBySide.sha256,
    verdict,
    targetReadable: true,
    effectReadable: true,
    features: {
      flameCore: "similar",
      additiveGlow: "similar",
      receiverFootprint: "similar",
      hue: "similar",
      apparentScale: "similar",
      backgroundExposure: "similar"
    },
    forbiddenArtifacts: {
      placeholder: false,
      selectionOverlay: false,
      debugReceiver: false,
      proceduralHaloOrSubstitute: false,
      blankTile: false,
      failedTile: false,
      bridgeTile: false,
      staleArtifact: false
    },
    notes: verdict === "passed" ? ["fixture comparison is visually similar"] : ["not similar"]
  };
}

function makeFeaturePng(firstRedDelta = 0): Buffer {
  const rgba = Buffer.from([
    255, 230, 120, 255, 245, 210, 90, 255, 150, 100, 30, 255, 130, 80, 20, 255,
    250, 220, 100, 255, 240, 200, 80, 255, 140, 90, 25, 255, 120, 70, 15, 255,
    110, 75, 30, 255, 100, 65, 25, 255, 20, 20, 20, 255, 20, 20, 20, 255,
    90, 60, 25, 255, 80, 50, 20, 255, 20, 20, 20, 255, 20, 20, 20, 255
  ]);
  rgba[0] = Math.max(0, Math.min(255, rgba[0] + firstRedDelta));
  return makePngRgba(4, 4, rgba);
}

function makePngRgba(width: number, height: number, rgba: Buffer): Buffer {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (width * 4 + 1);
    raw[rowOffset] = 0;
    rgba.copy(raw, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
  }
  return Buffer.concat([
    Buffer.from("89504e470d0a1a0a", "hex"),
    pngChunk(
      "IHDR",
      Buffer.from([
        (width >>> 24) & 0xff,
        (width >>> 16) & 0xff,
        (width >>> 8) & 0xff,
        width & 0xff,
        (height >>> 24) & 0xff,
        (height >>> 16) & 0xff,
        (height >>> 8) & 0xff,
        height & 0xff,
        8,
        6,
        0,
        0,
        0
      ])
    ),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0))
  ]);
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function hashFile(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function sha256JsonFileSync(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
