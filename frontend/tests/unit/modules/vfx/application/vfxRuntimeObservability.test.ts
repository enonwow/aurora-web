import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  createVfxRuntimeObservabilityReport,
  readVfxRuntimeAssetSettlement,
  registerVfxRuntimeExpectedAssets,
  recordVfxRuntimeAssetSettlement,
  setVfxRuntimeAssetBound
} from "../../../../../src/modules/vfx/application/vfxRuntimeObservability";

function createCanonicalRoot(): THREE.Group {
  const root = new THREE.Group();
  root.name = "canonical-root";
  root.userData = {
    auroraVfxCanonicalRenderer: true,
    auroraVfxCanonicalPlaceableComposition: true,
    auroraVfxCanonicalPlaceableCompositionMode: "source-mdl-static-emitter-light",
    auroraVfxCanonicalPlaceableCompositionReason: "ready",
    auroraVfxCanonicalRuntimePlayback: true,
    auroraVfxCanonicalRuntimePlaybackOneTrigger: true,
    auroraVfxCanonicalRuntimePlaybackLoop: false,
    auroraVfxCanonicalRuntimePlaybackDurationSeconds: 0.5,
    auroraVfxCanonicalRuntimePlaybackElapsedSeconds: 0.25,
    auroraVfxCanonicalRuntimePlaybackFrameIndex: 1,
    auroraVfxCanonicalRuntimePlaybackPostDurationHidden: false
  };
  const runtimeFrame = new THREE.Group();
  runtimeFrame.userData.auroraVfxCanonicalRuntimeFrame = true;

  const staticHost = new THREE.Group();
  staticHost.name = "static-root";
  staticHost.userData = {
    auroraVfxHostBranchKind: "static",
    auroraVfxHostBranchName: "static-root"
  };
  const emitterHost = new THREE.Group();
  emitterHost.name = "fire";
  emitterHost.userData = {
    auroraVfxHostBranchKind: "emitter",
    auroraVfxHostBranchName: "fire"
  };
  const lightHost = new THREE.PointLight();
  lightHost.name = "torch-light";
  lightHost.userData = {
    auroraVfxHostBranchKind: "light",
    auroraVfxHostBranchName: "torch-light"
  };
  const draw = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial());
  draw.name = "fire:draw:0";
  draw.userData = {
    auroraVfxCanonicalDrawMesh: true,
    auroraVfxCanonicalDrawLane: "textured_quad",
    auroraVfxCanonicalDrawRecordIds: ["fire:draw:0"],
    auroraVfxCanonicalEmitterNodeNames: ["fire"],
    auroraVfxCanonicalDrawParticleCount: 1,
    auroraVfxCanonicalDrawVertexCount: 6,
    auroraVfxCanonicalTextureReference: "fx_fire",
    auroraVfxCanonicalBlendMode: "Lighten",
    auroraVfxCanonicalDepthWrite: false,
    auroraVfxCanonicalRenderedBoundsWidth: 1,
    auroraVfxCanonicalRenderedBoundsHeight: 2,
    auroraVfxCanonicalRenderedBoundsDepth: 1,
    auroraVfxCanonicalParticleShaderApplied: true,
    auroraVfxCanonicalParticleSoftDepthState: {
      status: "enabled",
      sourceMaxHalfExtent: 0.5,
      worldScale: 1,
      maxHalfExtent: 0.5,
      particleSoftness: 10,
      sizeSpace: "three-view-space",
      disableReason: null
    },
    auroraVfxCanonicalParticleDepthInput: {
      status: "bound",
      textureUuid: "scene-depth-uuid",
      source: "aurora-retail-scene-target-depth",
      matchesSceneTarget: true
    },
    auroraVfxCanonicalParticleFogBranch: "additive_alpha_attenuation"
  };
  emitterHost.add(draw);
  root.add(runtimeFrame, staticHost, emitterHost, lightHost);
  return root;
}

function registerSettledAssets(runtime: object) {
  registerVfxRuntimeExpectedAssets(runtime, [
    { key: "model.glb", kind: "model", reference: "static-root" },
    { key: "fire.dds", kind: "texture", reference: "fx_fire" }
  ]);
  ["model.glb", "fire.dds"].forEach((key) => {
    recordVfxRuntimeAssetSettlement(runtime, key, {
      stage: "requested",
      startedAtMs: 100,
      httpStatus: 200
    });
    recordVfxRuntimeAssetSettlement(runtime, key, { stage: "decoded", completedAtMs: 130 });
    recordVfxRuntimeAssetSettlement(runtime, key, { stage: "cached", completedAtMs: 135 });
    setVfxRuntimeAssetBound(runtime, key, 140);
  });
}

describe("VFX runtime observability", () => {
  it("recognizes a canonical source-model mesh as a static host branch", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    const staticHost = root.getObjectByName("static-root");
    if (!staticHost) throw new Error("static host fixture is missing");
    staticHost.name = "aurora_vfx_source_model_geometry:renamed_mesh_a";
    staticHost.userData = {
      auroraVfxCanonicalSourceModelGeometry: true,
      auroraVfxCanonicalSourceModelNodeName: "renamed_mesh_a"
    };

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["renamed_mesh_a"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "worktree-proof-token" },
        backend: { commit: "worktree-proof-token" },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-static-source-model"
      }
    });

    expect(report.hostGraph.status).toBe("pass");
    expect(report.hostGraph.attached.static).toEqual(["renamed_mesh_a"]);
  });

  it("creates a bounded, explicit report for an actually settled canonical runtime", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    const emitter = root.getObjectByName("fire");
    const draw = emitter?.children[0];
    if (!emitter || !draw) throw new Error("draw fixture is missing");
    emitter.add(draw.clone());

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: true,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: {
          commit: "worktree-proof-token",
          imageDigest: `sha256:${"a".repeat(64)}`,
          builtAt: "2026-07-19T10:00:00.000Z"
        },
        backend: {
          commit: "worktree-proof-token",
          imageDigest: `sha256:${"a".repeat(64)}`,
          builtAt: "2026-07-19T10:00:00.000Z",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.version).toBe("aurora-vfx-runtime-observability/v1");
    expect(report.identity.status).toBe("ready");
    expect(report.hostGraph.status).toBe("pass");
    expect(report.hostGraph.attached).toEqual({ static: ["static-root"], emitter: ["fire"], light: ["torch-light"] });
    expect(report.assetSettlement.status).toBe("settled");
    expect(report.assetSettlement.entries).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "fire.dds", stage: "bound", httpStatus: 200, retryCount: 0 })
      ])
    );
    expect(report.drawLedger.entries).toEqual([
      expect.objectContaining({ drawRecordId: "fire:draw:0", emitter: "fire", vertexCount: 6, textureReference: "fx_fire" })
    ]);
    expect(report.particleShaderLedger).toEqual(
      expect.objectContaining({
        status: "pass",
        mismatches: [],
        entries: [
          expect.objectContaining({
            drawRecordIds: ["fire:draw:0"],
            emitter: "fire",
            softDepthGate: "enabled",
            softDepthDisableReason: null,
            sourceMaxHalfExtent: 0.5,
            worldScale: 1,
            maxHalfExtent: 0.5,
            particleSoftness: 10,
            sizeSpace: "three-view-space",
            framebufferDepthIdentity: "scene-depth-uuid",
            framebufferDepthSource: "aurora-retail-scene-target-depth",
            framebufferDepthStatus: "bound",
            framebufferDepthMatchesSceneTarget: true,
            fogBranch: "additive_alpha_attenuation",
            shaderApplied: true
          })
        ]
      })
    );
    expect(report.playbackGuard).toEqual(
      expect.objectContaining({ triggerCount: 1, loop: false, overlapCount: 0, status: "pass" })
    );
    expect(report.debugOverlay).toEqual({ enabled: true, finalProfileDisabled: false });
    expect(report.proofGate.status).toBe("pass");
  });

  it("fails proof when an enabled soft-depth draw has no bound scene depth", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    const draw = root.getObjectByName("fire:draw:0");
    if (!draw) throw new Error("draw fixture is missing");
    draw.userData.auroraVfxCanonicalParticleDepthInput = {
      status: "unbound",
      textureUuid: null,
      source: null,
      matchesSceneTarget: false
    };

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.particleShaderLedger.status).toBe("fail");
    expect(report.particleShaderLedger.mismatches).toContain(
      "fire:soft-depth-enabled-without-bound-scene-depth"
    );
    expect(report.proofGate.blockerManifest).toContain(
      "particle-shader-ledger-failed"
    );
  });

  it("merges deduplicated external scene blockers into the proof gate", () => {
    const blocker = "proof-scene-mdl-material-unsupported:1";
    const report = createVfxRuntimeObservabilityReport({
      runtime: {},
      root: null,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: [],
        emitterBranches: [],
        lightBranches: []
      },
      buildIdentity: {},
      additionalProofBlockers: [blocker, "", blocker]
    });

    expect(report.proofGate.status).toBe("fail");
    expect(report.proofGate.blockerManifest.filter((entry) => entry === blocker)).toEqual([
      blocker
    ]);
  });

  it("accepts a source-gated soft-depth disable reason without a depth binding", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    const draw = root.getObjectByName("fire:draw:0");
    if (!draw) throw new Error("draw fixture is missing");
    draw.userData.auroraVfxCanonicalParticleSoftDepthState = {
      status: "disabled",
      maxHalfExtent: 0.5,
      particleSoftness: 0,
      disableReason: "billboard_to_world_z"
    };
    draw.userData.auroraVfxCanonicalParticleDepthInput = {
      status: "unbound",
      textureUuid: null,
      source: null,
      matchesSceneTarget: false
    };

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.particleShaderLedger.status).toBe("pass");
    expect(report.particleShaderLedger.entries[0]).toMatchObject({
      softDepthGate: "disabled",
      softDepthDisableReason: "billboard_to_world_z",
      particleSoftness: 0,
      framebufferDepthStatus: "unbound"
    });
    expect(report.proofGate.blockerManifest).not.toContain(
      "particle-shader-ledger-failed"
    );
  });

  it("admits an armed hidden pre-roll without evaluating unrendered runtime frames", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    root.visible = false;

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      requirePlaceableComposition: false,
      expectedHostGraph: {
        staticBranches: [],
        emitterBranches: [],
        lightBranches: []
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.particleShaderLedger).toEqual({
      status: "pass",
      phase: "preplayback-hidden",
      entries: [],
      mismatches: []
    });
    expect(report.proofGate.blockerManifest).not.toContain(
      "particle-shader-ledger-failed"
    );
  });

  it("retains the best bounded shader sample for every draw record across one playback", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    const fireDraw = root.getObjectByName("fire:draw:0");
    const emitterHost = root.getObjectByName("fire");
    if (!(fireDraw instanceof THREE.Mesh) || !emitterHost) {
      throw new Error("particle draw fixture is missing");
    }

    root.userData.auroraVfxCanonicalRuntimePlaybackFrameIndex = 1;
    root.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds = 1 / 30;
    createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    fireDraw.userData.auroraVfxCanonicalParticleSoftDepthState = {
      status: "disabled",
      maxHalfExtent: 0,
      particleSoftness: 0,
      disableReason: "non_positive_evaluated_size"
    };
    const smokeDraw = fireDraw.clone();
    smokeDraw.name = "smoke:draw:0";
    smokeDraw.userData = {
      ...fireDraw.userData,
      auroraVfxCanonicalDrawRecordIds: ["smoke:draw:0"],
      auroraVfxCanonicalEmitterNodeNames: ["smoke"],
      auroraVfxCanonicalParticleSoftDepthState: {
        status: "enabled",
        sourceMaxHalfExtent: 1,
        worldScale: 1,
        maxHalfExtent: 1,
        particleSoftness: 5,
        sizeSpace: "three-view-space",
        disableReason: null
      }
    };
    emitterHost.add(smokeDraw);
    root.userData.auroraVfxCanonicalRuntimePlaybackFrameIndex = 15;
    root.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds = 0.5;
    createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    emitterHost.remove(fireDraw, smokeDraw);
    root.userData.auroraVfxCanonicalRuntimePlaybackFrameIndex = 30;
    root.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds = 1;
    root.userData.auroraVfxCanonicalRuntimePlaybackCompleted = true;
    root.userData.auroraVfxCanonicalRuntimePlaybackPostDurationHidden = true;
    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.particleShaderLedger).toEqual(
      expect.objectContaining({
        status: "pass",
        phase: "postplayback-retained-coverage",
        entries: [
          expect.objectContaining({
            drawRecordIds: ["fire:draw:0"],
            emitter: "fire",
            softDepthGate: "enabled",
            maxHalfExtent: 0.5,
            sampledFrameIndex: 1,
            sampledElapsedSeconds: 1 / 30
          }),
          expect.objectContaining({
            drawRecordIds: ["smoke:draw:0"],
            emitter: "smoke",
            softDepthGate: "enabled",
            maxHalfExtent: 1,
            sampledFrameIndex: 15,
            sampledElapsedSeconds: 0.5
          })
        ]
      })
    );
  });

  it("retains every asset transition and blocks proof on pending, failed, or duplicate playback", () => {
    const runtime = {};
    registerVfxRuntimeExpectedAssets(runtime, [{ key: "pending.dds", kind: "texture" }]);
    recordVfxRuntimeAssetSettlement(runtime, "pending.dds", {
      stage: "requested",
      startedAtMs: 55,
      httpStatus: 503,
      retryCount: 2,
      error: "upstream-timeout"
    });
    const root = createCanonicalRoot();
    root.userData.auroraVfxCanonicalRuntimePlaybackTriggerCount = 2;

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: { staticBranches: ["static-root"], emitterBranches: ["fire"], lightBranches: ["torch-light"] },
      buildIdentity: { contractVersion: "1.0.0", cacheKey: "cache" },
      timeoutMs: 4000
    });

    expect(readVfxRuntimeAssetSettlement(runtime)).toEqual([
      expect.objectContaining({ key: "pending.dds", stage: "requested", retryCount: 2, error: "upstream-timeout" })
    ]);
    expect(report.identity.status).toBe("blocked");
    expect(report.assetSettlement.status).toBe("pending");
    expect(report.playbackGuard.status).toBe("blocked");
    expect(report.proofGate).toEqual(
      expect.objectContaining({
        status: "fail",
        blockerManifest: expect.arrayContaining([
          "runtime-build-identity-missing",
          "asset-settlement-pending",
          "single-playback-guard-failed",
          "settlement-timeout-4000ms"
        ])
      })
    );
  });

  it("rejects syntactically present but empty build identity placeholders", () => {
    const runtime = {};
    registerSettledAssets(runtime);

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root: createCanonicalRoot(),
      profile: "final",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: {
          commit: "frontend-sha-dirty-",
          imageDigest: "sha256:"
        },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.identity.status).toBe("blocked");
    expect(report.proofGate.blockerManifest).toContain(
      "runtime-build-identity-missing"
    );
  });

  it("blocks proof while runtime emitters are still deferred", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root: createCanonicalRoot(),
      profile: "final",
      overlayRequested: false,
      runtimeEmittersDeferred: true,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.proofGate).toEqual({
      status: "fail",
      blockerManifest: ["deferred-runtime-emitters-unhydrated"]
    });
  });

  it("rejects a requested post-duration proof when the completed playback did not hide its runtime frame", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    root.userData.auroraVfxCanonicalRuntimePlaybackElapsedSeconds = 0.5;
    root.userData.auroraVfxCanonicalRuntimePlaybackCompleted = true;
    root.userData.auroraVfxCanonicalRuntimePlaybackPostDurationHidden = false;

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "final",
      overlayRequested: false,
      requirePostDurationHidden: true,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.playbackGuard).toEqual(
      expect.objectContaining({
        status: "blocked",
        completed: true,
        postDurationHidden: false,
        postDurationHiddenRequired: true
      })
    );
    expect(report.proofGate).toEqual(
      expect.objectContaining({
        status: "fail",
        blockerManifest: expect.arrayContaining(["post-duration-playback-not-hidden"])
      })
    );
  });

  it("never enables the overlay in a final profile and identifies host graph divergence", () => {
    const report = createVfxRuntimeObservabilityReport({
      runtime: {},
      root: createCanonicalRoot(),
      profile: "final",
      overlayRequested: true,
      expectedHostGraph: { staticBranches: [], emitterBranches: ["fire"], lightBranches: [] },
      buildIdentity: { contractVersion: "1.0.0", cacheKey: "cache" }
    });

    expect(report.debugOverlay).toEqual({ enabled: false, finalProfileDisabled: true });
    expect(report.hostGraph.status).toBe("fail");
    expect(report.hostGraph.mismatches).toEqual(
      expect.arrayContaining(["static:unexpected:static-root", "light:unexpected:torch-light"])
    );
  });

  it("admits lifecycle-transient emitter branches when present or absent but still rejects unrelated emitters", () => {
    const expectedHostGraph = {
      staticBranches: ["static-root"],
      emitterBranches: ["fire"],
      transientEmitterBranches: ["meteor-impact-smoke"],
      lightBranches: ["torch-light"]
    };
    const createReport = (root: THREE.Object3D) =>
      createVfxRuntimeObservabilityReport({
        runtime: {},
        root,
        profile: "final",
        overlayRequested: false,
        expectedHostGraph,
        buildIdentity: { contractVersion: "1.0.0", cacheKey: "cache" }
      });

    const presentRoot = createCanonicalRoot();
    presentRoot.userData.auroraVfxCanonicalRuntimeEmitterNodeNames = [
      "meteor-impact-smoke"
    ];
    const present = createReport(presentRoot);
    expect(present.hostGraph.status).toBe("pass");
    expect(present.hostGraph.allowedTransient).toEqual({
      static: [],
      emitter: ["meteor-impact-smoke"],
      light: []
    });
    expect(present.hostGraph.attached.emitter).toContain(
      "meteor-impact-smoke"
    );

    const absent = createReport(createCanonicalRoot());
    expect(absent.hostGraph.status).toBe("pass");
    expect(absent.hostGraph.mismatches).toEqual([]);

    const unexpectedRoot = createCanonicalRoot();
    unexpectedRoot.userData.auroraVfxCanonicalRuntimeEmitterNodeNames = [
      "meteor-impact-smoke",
      "unrelated-emitter"
    ];
    const unexpected = createReport(unexpectedRoot);
    expect(unexpected.hostGraph.status).toBe("fail");
    expect(unexpected.hostGraph.mismatches).toContain(
      "emitter:unexpected:unrelated-emitter"
    );
  });

  it("reports exact missing branch names and reserves owner-qualified matching for emitters", () => {
    const missingEmitterRoot = createCanonicalRoot();
    missingEmitterRoot.getObjectByName("fire")?.removeFromParent();
    const createReport = (root: THREE.Object3D) =>
      createVfxRuntimeObservabilityReport({
        runtime: {},
        root,
        profile: "final",
        overlayRequested: false,
        expectedHostGraph: {
          staticBranches: ["static-root"],
          emitterBranches: ["fire"],
          lightBranches: ["torch-light"]
        },
        buildIdentity: { contractVersion: "1.0.0", cacheKey: "cache" }
      });

    expect(createReport(missingEmitterRoot).hostGraph.mismatches).toEqual([
      "emitter:missing:fire"
    ]);

    const ownerQualifiedStaticRoot = createCanonicalRoot();
    const staticHost = ownerQualifiedStaticRoot.getObjectByName("static-root");
    if (!staticHost) throw new Error("static host fixture is missing");
    staticHost.userData.auroraVfxHostBranchName = "static-root@owner:1";
    expect(createReport(ownerQualifiedStaticRoot).hostGraph.mismatches).toEqual([
      "static:missing:static-root",
      "static:unexpected:static-root@owner:1"
    ]);
  });

  it("matches owner-qualified runtime emitter instances to their canonical source branch", () => {
    const root = createCanonicalRoot();
    root.userData.auroraVfxCanonicalRuntimeEmitterNodeNames = [
      "fire@aoe:0:slot:1:owner:0",
      "fire@aoe:0:slot:2:owner:4"
    ];

    const report = createVfxRuntimeObservabilityReport({
      runtime: {},
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: { contractVersion: "1.0.0", cacheKey: "cache" }
    });

    expect(report.hostGraph.status).toBe("pass");
    expect(report.hostGraph.mismatches).toEqual([]);
    expect(report.hostGraph.attached.emitter).toEqual(
      expect.arrayContaining([
        "fire",
        "fire@aoe:0:slot:1:owner:0",
        "fire@aoe:0:slot:2:owner:4"
      ])
    );
  });

  it("still rejects an owner-qualified runtime emitter without a canonical source branch", () => {
    const root = createCanonicalRoot();
    root.userData.auroraVfxCanonicalRuntimeEmitterNodeNames = [
      "smoke@aoe:0:slot:1:owner:0"
    ];

    const report = createVfxRuntimeObservabilityReport({
      runtime: {},
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: { contractVersion: "1.0.0", cacheKey: "cache" }
    });

    expect(report.hostGraph.status).toBe("fail");
    expect(report.hostGraph.mismatches).toContain(
      "emitter:unexpected:smoke@aoe:0:slot:1:owner:0"
    );
  });

  it("recognizes expected static node names and ignores playback markers without runtime frames", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    const staticHost = root.getObjectByName("static-root");
    if (!staticHost) throw new Error("static host fixture is missing");
    staticHost.userData = {};
    const copiedPlaybackMarker = new THREE.Group();
    copiedPlaybackMarker.userData = {
      auroraVfxCanonicalRuntimePlayback: true,
      auroraVfxCanonicalRuntimePlaybackOneTrigger: true,
      auroraVfxCanonicalRuntimePlaybackLoop: false
    };
    root.add(copiedPlaybackMarker);

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: { commit: "backend-sha", processStartedAt: "2026-07-19T10:01:00.000Z" },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.hostGraph).toEqual(
      expect.objectContaining({
        status: "pass",
        attached: {
          static: ["static-root"],
          emitter: ["fire"],
          light: ["torch-light"]
        }
      })
    );
    expect(report.playbackGuard).toEqual(
      expect.objectContaining({ status: "pass", triggerCount: 1, overlapCount: 0 })
    );
    expect(report.proofGate.status).toBe("pass");
  });

  it("counts only top-level playback roots when canonical emitter runtimes are nested", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    const runtimeFrame = root.children.find(
      (child) => child.userData.auroraVfxCanonicalRuntimeFrame === true
    );
    if (!runtimeFrame) throw new Error("runtime frame fixture is missing");

    const nestedPlayback = new THREE.Group();
    nestedPlayback.userData = {
      auroraVfxCanonicalRuntimePlayback: true,
      auroraVfxCanonicalRuntimePlaybackTriggerCount: 1,
      auroraVfxCanonicalRuntimePlaybackLoop: false
    };
    const nestedFrame = new THREE.Group();
    nestedFrame.userData.auroraVfxCanonicalRuntimeFrame = true;
    nestedPlayback.add(nestedFrame);
    runtimeFrame.add(nestedPlayback);

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.playbackGuard).toEqual(
      expect.objectContaining({
        status: "pass",
        triggerCount: 1,
        overlapCount: 0
      })
    );
    expect(report.proofGate.status).toBe("pass");
  });

  it("accepts one playback per persistent placeable in a multi-root area proof", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const areaRoot = new THREE.Group();
    const placeableRoots = Array.from({ length: 3 }, (_, index) => {
      const root = createCanonicalRoot();
      root.name = `canonical-placeable-${index + 1}`;
      root.userData.auroraVfxCanonicalRuntimePlaybackTriggerCount = 1;
      root.userData.auroraVfxCanonicalRuntimePlaybackOneTrigger = true;
      areaRoot.add(root);
      return root;
    });

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root: areaRoot,
      compositionRoots: placeableRoots,
      expectedPlaybackRootCount: 3,
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-area"
      }
    });

    expect(report.hostGraph).toEqual(
      expect.objectContaining({
        status: "pass",
        composition: true,
        compositionRootCount: 3
      })
    );
    expect(report.playbackGuard).toEqual(
      expect.objectContaining({
        status: "pass",
        rootCount: 3,
        expectedRootCount: 3,
        triggerCount: 3,
        oneTriggerPerRoot: true,
        overlapCount: 0
      })
    );
    expect(report.proofGate.status).toBe("pass");
  });

  it("treats cached decoded assets as settled even when they are not material bindings", () => {
    const runtime = {};
    registerVfxRuntimeExpectedAssets(runtime, [
      { key: "model.glb", kind: "model" },
      { key: "normal-map.dds", kind: "texture" }
    ]);
    ["model.glb", "normal-map.dds"].forEach((key) => {
      recordVfxRuntimeAssetSettlement(runtime, key, {
        stage: "requested",
        startedAtMs: 100,
        httpStatus: 200
      });
      recordVfxRuntimeAssetSettlement(runtime, key, {
        stage: "cached",
        completedAtMs: 140
      });
    });

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root: createCanonicalRoot(),
      profile: "development",
      overlayRequested: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: { commit: "backend-sha", processStartedAt: "2026-07-19T10:01:00.000Z" },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.assetSettlement.status).toBe("settled");
    expect(report.proofGate.status).toBe("pass");
  });

  it("accepts a canonical effect host graph without requiring placeable composition", () => {
    const runtime = {};
    registerSettledAssets(runtime);
    const root = createCanonicalRoot();
    root.userData.auroraVfxCanonicalPlaceableComposition = false;
    const sourceLight = root.getObjectByName("torch-light");
    if (!sourceLight) throw new Error("source light fixture is missing");
    sourceLight.name = "aurora_vfx_source_mdl_light:torch-light";
    sourceLight.userData = {
      auroraVfxCanonicalSourceMdlLight: true,
      auroraVfxCanonicalSourceMdlLightNodeName: "torch-light"
    };

    const report = createVfxRuntimeObservabilityReport({
      runtime,
      root,
      profile: "final",
      overlayRequested: true,
      requirePlaceableComposition: false,
      expectedHostGraph: {
        staticBranches: ["static-root"],
        emitterBranches: ["fire"],
        lightBranches: ["torch-light"]
      },
      buildIdentity: {
        frontend: { commit: "frontend-sha" },
        backend: {
          commit: "backend-sha",
          processStartedAt: "2026-07-19T10:01:00.000Z"
        },
        contractVersion: "1.0.0",
        cacheKey: "cache-vfx-1"
      }
    });

    expect(report.hostGraph).toEqual(
      expect.objectContaining({
        status: "pass",
        compositionRequired: false,
        attached: {
          static: ["static-root"],
          emitter: ["fire"],
          light: ["torch-light"]
        }
      })
    );
    expect(report.debugOverlay).toEqual({
      enabled: false,
      finalProfileDisabled: true
    });
    expect(report.proofGate.status).toBe("pass");
  });
});
