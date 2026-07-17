import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/create-area-lighting-retail-capture-queue.mjs"
);

const requiredArtifacts = [
  "retail-or-toolset-shadowvol-campfire.png",
  "retail-cross-lane-all-lanes-before-budget.png",
  "retail-cross-lane-all-lanes-after-budget.png",
  "retail-cross-lane-active-slots.json",
  "retail-progfx-priority-policy-before.png",
  "retail-progfx-priority-policy-after.png",
  "retail-progfx-proximity-distance-sweep-contact-sheet.png",
  "retail-progfx-attach-scene-before.png",
  "retail-progfx-attach-scene-active.png",
  "retail-progfx-attach-scene-after-remove.png",
  "retail-progfx-blindvision-before.png",
  "retail-progfx-blindvision-active.png"
];

const targets = [
  {
    artifact: "retail-or-toolset-shadowvol-campfire.png",
    caseId: "shadowvol-campfire-pixel-geometry-opacity",
    source: "retail-or-toolset-window-pixels",
    requiredRuntime: ["nwtoolset-or-nwmain"],
    captureKind: "single-reference-png",
    acceptance: "Same campfire/placeable fixture as aurora-web-shadowvol-campfire.png."
  },
  {
    artifact: "retail-cross-lane-all-lanes-before-budget.png",
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "before-budget-reference-png",
    acceptance: "Scene shows all lanes before active-light budget pressure."
  },
  {
    artifact: "retail-cross-lane-all-lanes-after-budget.png",
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "after-budget-reference-png",
    acceptance: "Scene shows accepted/dropped lanes after constrained budget."
  },
  {
    artifact: "retail-cross-lane-active-slots.json",
    caseId: "cross-lane-all-required-lanes-retail-precedence",
    source: "retail-runtime-slot-dump-or-observed-oracle",
    requiredRuntime: ["nwmain"],
    captureKind: "structured-active-slot-oracle",
    acceptance: "Lists accepted/dropped tile/placeable/MDL/item/ProgFX lanes."
  },
  {
    artifact: "retail-progfx-priority-policy-before.png",
    caseId: "progfx-type4-priority-tie-and-zero-policy",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "before-policy-reference-png",
    acceptance: "Before image for priority policy scene."
  },
  {
    artifact: "retail-progfx-priority-policy-after.png",
    caseId: "progfx-type4-priority-tie-and-zero-policy",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "after-policy-reference-png",
    acceptance: "After image proving priority winner."
  },
  {
    artifact: "retail-progfx-proximity-distance-sweep-contact-sheet.png",
    caseId: "progfx-type4-proximity-threshold",
    source: "retail-runtime-distance-sweep-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "distance-sweep-contact-sheet",
    acceptance: "Contact sheet covers distances around suppression threshold."
  },
  {
    artifact: "retail-progfx-attach-scene-before.png",
    caseId: "progfx-type4-attach-to-scene-restore",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "before-attach-reference-png",
    acceptance: "Scene-light state before attach-to-scene effect."
  },
  {
    artifact: "retail-progfx-attach-scene-active.png",
    caseId: "progfx-type4-attach-to-scene-restore",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "active-attach-reference-png",
    acceptance: "Scene-light state while attach-to-scene effect is active."
  },
  {
    artifact: "retail-progfx-attach-scene-after-remove.png",
    caseId: "progfx-type4-attach-to-scene-restore",
    source: "retail-runtime-scene-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "after-remove-attach-reference-png",
    acceptance: "Scene-light state after effect removal."
  },
  {
    artifact: "retail-progfx-blindvision-before.png",
    caseId: "progfx-type4-blind-vision-pixels",
    source: "retail-runtime-vision-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "before-vision-reference-png",
    acceptance: "Viewport before Blind_Vision/Darkvision mutation."
  },
  {
    artifact: "retail-progfx-blindvision-active.png",
    caseId: "progfx-type4-blind-vision-pixels",
    source: "retail-runtime-vision-pixels",
    requiredRuntime: ["nwmain"],
    captureKind: "active-vision-reference-png",
    acceptance: "Viewport while Blind_Vision/Darkvision mutation is active."
  }
].map((target) => ({
  ...target,
  outputPath: `backend/docs/aurora-reverse/artifacts/light-shadow/${target.artifact}`,
  artifactExists: false,
  missingInOracleGate: true,
  runtimeObserved: false,
  readiness: "blocked-retail-runtime-not-running"
}));

describe("create-area-lighting-retail-capture-queue", () => {
  it("turns the 12 missing runtime artifacts into a safe retail capture queue", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-capture-queue-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const gatePath = join(absoluteArtifactDir, "area-lighting-retail-oracle-artifact-gate.json");
    const readinessPath = join(
      absoluteArtifactDir,
      "area-lighting-retail-runtime-capture-readiness.json"
    );
    const outputPath = join(absoluteArtifactDir, "area-lighting-retail-capture-queue.json");
    const customOverrideManifestPath = join(
      absoluteArtifactDir,
      "custom-progfx-param4-zero-override-manifest.json"
    );
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      gatePath,
      `${JSON.stringify({
        status: "blocked",
        summary: {
          requiredArtifacts: 25,
          presentRequiredArtifacts: 13,
          missingRequiredArtifacts: 12
        },
        missingRequiredArtifacts: requiredArtifacts
      })}\n`
    );
    await writeFile(
      readinessPath,
      `${JSON.stringify({
        version: "aurora-area-lighting-retail-runtime-capture-readiness/v1",
        status: "blocked-no-retail-runtime-process",
        summary: {
          requiredRuntimeArtifacts: 12,
          presentRuntimeArtifacts: 0,
          missingRuntimeArtifacts: 12,
          runtimeReadyTargets: 0,
          blockedRuntimeTargets: 12
        },
        processProbe: {
          status: "not_running",
          processes: []
        },
        targets
      })}\n`
    );
    await writeFile(
      customOverrideManifestPath,
      `${JSON.stringify({
        status: "custom-param4-zero-override-pack-prepared-not-stock-retail-parity",
        customOverrideRequired: true,
        installsOverrideFiles: false,
        canonicalParityPromoted: false,
        customRows: {
          visualeffects2da: {
            rowId: 1302,
            progFxDuration: 1302
          },
          progfx2da: {
            rowId: 1302,
            param4Priority: "0"
          }
        },
        outputs: {
          visualeffects2da: {
            path: "custom/visualeffects.2da",
            sha256: "sha256-visualeffects"
          },
          progfx2da: {
            path: "custom/progfx.2da",
            sha256: "sha256-progfx"
          }
        }
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
        "--readinessReport",
        readinessPath,
        "--out",
        outputPath,
        "--customProgFxZeroOverrideManifest",
        customOverrideManifestPath
      ],
      { maxBuffer: 1024 * 1024 }
    );
    const cli = JSON.parse(stdout);
    const queue = JSON.parse(await readFile(outputPath, "utf8"));

    expect(cli.status).toBe("blocked-no-retail-runtime-process");
    expect(queue.summary).toMatchObject({
      requiredRuntimeArtifactCount: 12,
      missingArtifactCount: 12,
      queueItemCount: 12,
      caseCount: 6,
      runtimeReadyItemCount: 0,
      blockedItemCount: 12,
      missingInOracleGateCount: 12
    });
    expect(queue.safety).toMatchObject({
      usesGlobalCursor: false,
      usesGlobalKeyboard: false,
      launchesRetailProcess: false,
      doesNotFabricateArtifacts: true,
      captureRequiresExistingRuntime: true
    });
    expect(queue.queue.map((item: { artifact: string }) => item.artifact)).toEqual(
      expect.arrayContaining(requiredArtifacts)
    );
    expect(
      queue.queue.find(
        (item: { artifact: string }) => item.artifact === "retail-or-toolset-shadowvol-campfire.png"
      )
    ).toMatchObject({
      caseId: "shadowvol-campfire-pixel-geometry-opacity",
      artifactType: "png",
      status: "blocked-retail-runtime-not-running",
      localInputs: expect.arrayContaining(["aurora-web-shadowvol-campfire.png"]),
      validation: expect.objectContaining({
        retailSourceRequired: true,
        requiredObservations: expect.arrayContaining(["ShadowOpacity-derived alpha"])
      })
    });
    expect(
      queue.queue.find(
        (item: { artifact: string }) => item.artifact === "retail-cross-lane-active-slots.json"
      )
    ).toMatchObject({
      artifactType: "json",
      validation: expect.objectContaining({
        outputSchema: expect.objectContaining({
          requiredFields: expect.arrayContaining(["acceptedSlots", "droppedSlots", "laneOwners"])
        })
      })
    });
  });

  it("keeps a reference capture queue when required runtime artifacts are present", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-capture-reference-queue-"));
    const artifactDir = "backend/docs/aurora-reverse/artifacts/light-shadow";
    const absoluteArtifactDir = join(tempRoot, artifactDir);
    const gatePath = join(absoluteArtifactDir, "area-lighting-retail-oracle-artifact-gate.json");
    const readinessPath = join(
      absoluteArtifactDir,
      "area-lighting-retail-runtime-capture-readiness.json"
    );
    const outputPath = join(absoluteArtifactDir, "area-lighting-retail-capture-queue.json");
    const customOverrideManifestPath = join(
      absoluteArtifactDir,
      "custom-progfx-param4-zero-override-manifest.json"
    );
    await mkdir(absoluteArtifactDir, { recursive: true });
    await writeFile(
      gatePath,
      `${JSON.stringify({
        status: "blocked",
        summary: {
          requiredArtifacts: 25,
          presentRequiredArtifacts: 25,
          missingRequiredArtifacts: 0
        },
        missingRequiredArtifacts: []
      })}\n`
    );
    await writeFile(
      readinessPath,
      `${JSON.stringify({
        version: "aurora-area-lighting-retail-runtime-capture-readiness/v1",
        status: "ready-all-runtime-artifacts-present",
        summary: {
          requiredRuntimeArtifacts: 12,
          presentRuntimeArtifacts: 12,
          missingRuntimeArtifacts: 0
        },
        processProbe: {
          status: "not_running",
          processes: []
        },
        targets: []
      })}\n`
    );
    await writeFile(
      customOverrideManifestPath,
      `${JSON.stringify({
        status: "custom-param4-zero-override-pack-prepared-not-stock-retail-parity",
        customOverrideRequired: true,
        installsOverrideFiles: false,
        canonicalParityPromoted: false,
        customRows: {
          visualeffects2da: {
            rowId: 1302,
            progFxDuration: 1302
          },
          progfx2da: {
            rowId: 1302,
            param4Priority: "0"
          }
        },
        outputs: {
          visualeffects2da: {
            path: "custom/visualeffects.2da",
            sha256: "sha256-visualeffects"
          },
          progfx2da: {
            path: "custom/progfx.2da",
            sha256: "sha256-progfx"
          }
        }
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
        "--readinessReport",
        readinessPath,
        "--out",
        outputPath,
        "--customProgFxZeroOverrideManifest",
        customOverrideManifestPath
      ],
      { maxBuffer: 1024 * 1024 }
    );
    const cli = JSON.parse(stdout);
    const queue = JSON.parse(await readFile(outputPath, "utf8"));

    expect(cli.status).toBe("complete-required-runtime-artifacts-reference-captures-missing");
    expect(queue.summary).toMatchObject({
      missingArtifactCount: 0,
      queueItemCount: 0,
      classifierReferenceQueueItemCount: 7,
      missingClassifierReferenceArtifactCount: 7,
      customProgFxZeroQueueItemCount: 2,
      missingCustomProgFxZeroArtifactCount: 2,
      customProgFxZeroOverridePackPrepared: true
    });
    expect(queue.inputs.customProgFxZeroOverride).toMatchObject({
      present: true,
      prepared: true,
      status: "custom-param4-zero-override-pack-prepared-not-stock-retail-parity",
      canonicalParityPromoted: false,
      installsOverrideFiles: false,
      customRows: {
        progfx2da: {
          rowId: 1302,
          param4Priority: "0"
        }
      }
    });
    expect(queue.classifierReferenceQueue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifact: "retail-cross-lane-openpad-smoke.png",
          utilityScriptResref: "als_refbase",
          referenceModuleFile: "als_refbase.mod",
          manualScriptInputRequired: false,
          autostart: "als_refbase.mod starts in als_light_lab and runs als_refbase through OnEnter."
        }),
        expect.objectContaining({
          artifact: "retail-ref-tile-main-light.png",
          utilityScriptResref: "als_reftmain",
          referenceModuleFile: "als_rtmain.mod",
          manualScriptInputRequired: false,
          autostart: "als_rtmain.mod starts in als_light_lab and runs als_reftmain through OnEnter.",
          safeCapture: expect.objectContaining({
            flags: ["-NoFocus", "-NoTopMost", "-NoEscape"],
            launchesRetailProcess: false,
            requiresExistingRuntime: true,
            usesGlobalCursor: false,
            usesGlobalKeyboard: false,
            usesForegroundWindow: false,
            usesTopmost: false
          })
        }),
        expect.objectContaining({
          artifact: "retail-ref-progfx-type4-light.png",
          utilityScriptResref: "als_refpfx",
          referenceModuleFile: "als_refpfx.mod",
          manualScriptInputRequired: false
        })
      ])
    );
    expect(queue.customProgFxZeroQueue).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          artifact: "retail-progfx-priority-policy-custom-zero-before.png",
          utilityScriptResref: "als_pfxzero",
          referenceModuleFile: "als_pfxzero.mod",
          manualScriptInputRequired: false,
          stockRetailRowPresent: false,
          customOverrideRequired: true,
          customOverridePackPrepared: true,
          customOverrideManifest: expect.objectContaining({
            prepared: true,
            outputs: expect.objectContaining({
              progfx2da: expect.objectContaining({
                sha256: "sha256-progfx"
              })
            })
          }),
          safeCapture: expect.objectContaining({
            flags: ["-NoFocus", "-NoTopMost", "-NoEscape"],
            launchesRetailProcess: false,
            requiresExistingRuntime: true,
            usesGlobalCursor: false,
            usesGlobalKeyboard: false,
            usesForegroundWindow: false,
            usesTopmost: false
          })
        }),
        expect.objectContaining({
          artifact: "retail-progfx-priority-policy-custom-zero-after.png",
          utilityScriptResref: "als_pfxzero",
          referenceModuleFile: "als_pfxzero.mod",
          customOverrideRequired: true
        })
      ])
    );
  });
});
