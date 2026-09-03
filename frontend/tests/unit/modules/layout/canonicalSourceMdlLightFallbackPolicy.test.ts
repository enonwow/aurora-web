// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import * as THREE from "three";
import type { PlaceableRenderPackageAuroraLightNode } from "../../../../src/modules/placeables/contracts";
import {
  applyCanonicalSourceMdlLightFallbackPolicy,
  resolveCanonicalSourceMdlLightFallbackPolicy,
  writeSourceMdlLightFallbackDiagnostics
} from "../../../../src/modules/layout/adapters/three/canonicalSourceMdlLightFallbackPolicy";

function createLightNode(
  overrides: Partial<PlaceableRenderPackageAuroraLightNode> = {}
): PlaceableRenderPackageAuroraLightNode {
  return {
    source: "aurora-mdl-binary",
    sourceModelAssetId: "asset-light",
    sourceModelFileName: "fx_test.mdl",
    sourceModelObjectKey: "model:fx_test",
    nodeName: "AuroraLight01",
    transform: { position: [0, 0, 1] },
    radius: 10,
    multiplier: 1,
    color: [1, 0.5, 0.25],
    ambientOnly: false,
    ...overrides
  };
}

function createCanonicalLightGroup(lightCount = 1): THREE.Group {
  const group = new THREE.Group();
  for (let index = 0; index < lightCount; index += 1) {
    const light = new THREE.PointLight();
    light.userData = {
      auroraVfxCanonicalSourceMdlLight: true,
      auroraVfxCanonicalSourceMdlLightNodeName: `AuroraLight0${index + 1}`
    };
    group.add(light);
  }
  return group;
}

function createManifest(
  presentFeatures: string[],
  overrides: Record<string, unknown> = {}
): unknown {
  return {
    version: "aurora-source-mdl-light-feature-manifest/v1",
    lightCount: 1,
    nodes: [{ nodeName: "AuroraLight01", presentFeatures }],
    truncated: false,
    diagnosticCodes: [],
    ...overrides
  };
}

describe("canonicalSourceMdlLightFallbackPolicy", () => {
  it("keeps complete basic source-light output on the canonical renderer", () => {
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["position", "color", "radius", "multiplier", "ambientOnly"]),
      [createLightNode()],
      createCanonicalLightGroup()
    );

    expect(policy).toEqual({
      mode: "canonical_supported",
      requiresFallback: false,
      blocked: false,
      canonicalLightCount: 1,
      sourceLightCount: 1,
      affectedNodeNames: [],
      unsupportedFeatures: [],
      unknownFeatures: [],
      diagnosticCodes: []
    });
  });

  it("requires the richer fallback for every present feature unsupported by canonical lights", () => {
    const unsupportedFeatures = [
      "affectDynamic",
      "animationTracks",
      "dynamicType",
      "fadingLight",
      "flareColorShifts",
      "flarePositions",
      "flareRadius",
      "flareSizes",
      "flareTextureNames",
      "generateFlare",
      "lensFlares",
      "lightPriority",
      "shadow",
      "shadowRadius",
      "verticalDisplacement"
    ];
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest([
        "position",
        "color",
        "radius",
        "multiplier",
        "ambientOnly",
        ...unsupportedFeatures
      ]),
      [
        createLightNode({
          shadow: true,
          shadowRadius: 15,
          verticalDisplacement: 3,
          lightPriority: 2,
          dynamicType: 1,
          affectDynamic: true,
          generateFlare: true,
          textureNames: ["fxpa_dot01"],
          flareSizes: [0.5],
          flarePositions: [0.25],
          flareColorShifts: [[1, 0.5, 0.25]],
          flareRadius: 2,
          lensFlares: true,
          fadingLight: true,
          animations: [{ animationName: "default" }]
        })
      ],
      createCanonicalLightGroup()
    );

    expect(policy.mode).toBe("legacy_fallback_required");
    expect(policy.requiresFallback).toBe(true);
    expect(policy.blocked).toBe(false);
    expect(policy.affectedNodeNames).toEqual(["AuroraLight01"]);
    expect(policy.unsupportedFeatures).toEqual(unsupportedFeatures);
    expect(policy.diagnosticCodes).toContain(
      "VFX_MDL_LIGHT_CANONICAL_UNSUPPORTED_FEATURE_FALLBACK"
    );
    expect(policy.diagnosticCodes).toContain(
      "VFX_MDL_LIGHT_CANONICAL_UNSUPPORTED_SHADOW"
    );
    expect(policy.diagnosticCodes).toContain(
      "VFX_MDL_LIGHT_CANONICAL_UNSUPPORTED_GENERATE_FLARE"
    );
  });

  it("blocks when canonical-supported output is absent or incomplete", () => {
    const missing = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["position", "color", "radius", "multiplier"]),
      [createLightNode()],
      new THREE.Group()
    );
    const incomplete = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius"], {
        lightCount: 2,
        nodes: [
          { nodeName: "AuroraLight01", presentFeatures: ["radius"] },
          { nodeName: "AuroraLight02", presentFeatures: ["radius"] }
        ]
      }),
      [createLightNode(), createLightNode({ nodeName: "AuroraLight02" })],
      createCanonicalLightGroup(1)
    );

    expect(missing.mode).toBe("blocked");
    expect(incomplete.mode).toBe("blocked");
    expect(missing.unknownFeatures).toEqual([]);
    expect(incomplete.unknownFeatures).toEqual([]);
    expect(missing.diagnosticCodes).toContain("VFX_MDL_LIGHT_CANONICAL_OUTPUT_MISSING");
    expect(incomplete.diagnosticCodes).toContain(
      "VFX_MDL_LIGHT_CANONICAL_OUTPUT_COUNT_MISMATCH"
    );
  });

  it("removes only canonical source lights and writes inspectable fallback diagnostics", () => {
    const canonicalGroup = createCanonicalLightGroup();
    const emitterMarker = new THREE.Group();
    emitterMarker.userData = { auroraVfxCanonicalEmitter: true };
    canonicalGroup.add(emitterMarker);
    const fallbackGroup = new THREE.Group();
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["position", "radius", "shadow"]),
      [createLightNode({ shadow: true })],
      canonicalGroup
    );

    const removedCount = applyCanonicalSourceMdlLightFallbackPolicy(
      canonicalGroup,
      policy
    );
    writeSourceMdlLightFallbackDiagnostics(fallbackGroup, policy, removedCount);

    expect(removedCount).toBe(1);
    expect(canonicalGroup.children).toContain(emitterMarker);
    expect(
      canonicalGroup.children.some(
        (child) => child.userData.auroraVfxCanonicalSourceMdlLight === true
      )
    ).toBe(false);
    expect(canonicalGroup.userData).toMatchObject({
      auroraVfxCanonicalSourceMdlLightFallbackRequired: true,
      auroraVfxCanonicalSourceMdlLightSuppressedCount: 1,
      auroraVfxCanonicalSourceMdlLightPolicyDiagnosticCodes: policy.diagnosticCodes,
      auroraVfxCanonicalSourceMdlLightPolicyUnsupportedFeatures: ["shadow"],
      auroraVfxCanonicalSourceMdlLightPolicyUnknownFeatures: [],
      auroraVfxCanonicalSourceMdlLightPolicyAffectedNodeNames: ["AuroraLight01"]
    });
    expect(fallbackGroup.userData).toMatchObject({
      auroraVfxSourceMdlLightFallbackActive: true,
      auroraVfxSourceMdlLightFallbackSuppressedCanonicalCount: 1,
      auroraVfxSourceMdlLightFallbackAffectedNodeNames: ["AuroraLight01"],
      auroraVfxSourceMdlLightFallbackDiagnosticCodes: policy.diagnosticCodes,
      auroraVfxSourceMdlLightFallbackUnsupportedFeatures: ["shadow"]
    });
  });

  it("derives conservative presence tokens when the optional manifest is absent", () => {
    const canonicalGroup = createCanonicalLightGroup();
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      undefined,
      [createLightNode({ shadow: false, textureNames: [] })],
      canonicalGroup
    );

    expect(policy.mode).toBe("legacy_fallback_required");
    expect(policy.requiresFallback).toBe(true);
    expect(policy.unsupportedFeatures).toEqual(["flareTextureNames", "shadow"]);
    expect(policy.diagnosticCodes).toContain(
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_DERIVED_FROM_SOURCE_RECORDS"
    );
  });

  it.each([
    {
      label: "malformed",
      manifest: { version: "aurora-source-mdl-light-feature-manifest/v1", nodes: "bad" },
      code: "VFX_MDL_LIGHT_FEATURE_MANIFEST_MALFORMED"
    },
    {
      label: "truncated",
      manifest: createManifest(["radius"], { truncated: true }),
      code: "VFX_MDL_LIGHT_FEATURE_MANIFEST_TRUNCATED"
    },
    {
      label: "unknown feature",
      manifest: createManifest(["radius", "futureRetailField"]),
      code: "VFX_MDL_LIGHT_FEATURE_MANIFEST_UNKNOWN_FEATURE"
    },
    {
      label: "contradictory source records",
      manifest: createManifest(["radius"], {
        nodes: [{ nodeName: "DifferentLight", presentFeatures: ["radius"] }]
      }),
      code: "VFX_MDL_LIGHT_FEATURE_MANIFEST_CONTRADICTORY"
    }
  ])("fails closed for a $label manifest", ({ label, manifest, code }) => {
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      manifest,
      [createLightNode()],
      createCanonicalLightGroup()
    );

    expect(policy.mode).toBe("blocked");
    expect(policy.blocked).toBe(true);
    expect(policy.requiresFallback).toBe(true);
    expect(policy.diagnosticCodes).toContain(code);
    expect(policy.unknownFeatures).toEqual(
      label === "unknown feature" ? ["futureRetailField"] : []
    );
  });

  it("returns an exact empty-source decision and leaves canonical groups untouched", () => {
    const canonicalGroup = createCanonicalLightGroup();
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      undefined,
      [],
      canonicalGroup
    );

    expect(policy).toEqual({
      mode: "canonical_supported",
      requiresFallback: false,
      blocked: false,
      canonicalLightCount: 1,
      sourceLightCount: 0,
      affectedNodeNames: [],
      unsupportedFeatures: [],
      unknownFeatures: [],
      diagnosticCodes: []
    });
    expect(applyCanonicalSourceMdlLightFallbackPolicy(canonicalGroup, policy)).toBe(0);
    expect(collectCanonicalLights(canonicalGroup)).toHaveLength(1);
    expect(applyCanonicalSourceMdlLightFallbackPolicy(null, policy)).toBe(0);
  });

  it.each([
    ["orientation", { transform: { orientation: { axis: [0, 0, 1], angleRadians: 0 } } }],
    ["scale", { transform: { scale: 1 } }],
    ["transformTracks", { transform: { positionTimeline: [] } }],
    ["shadow", { shadow: false }],
    ["shadowRadius", { shadowRadius: 0 }],
    ["verticalDisplacement", { verticalDisplacement: 0 }],
    ["dynamicType", { dynamicType: 0 }],
    ["affectDynamic", { affectDynamic: false }],
    ["lightPriority", { lightPriority: 0 }],
    ["generateFlare", { generateFlare: false }],
    ["flareTextureNames", { textureNames: [] }],
    ["flareSizes", { flareSizes: [] }],
    ["flarePositions", { flarePositions: [] }],
    ["flareColorShifts", { flareColorShifts: [] }],
    ["flareRadius", { flareRadius: 0 }],
    ["lensFlares", { lensFlares: false }],
    ["fadingLight", { fadingLight: false }],
    ["animationTracks", { animations: [] }]
  ] as const)("derives the %s presence token without a manifest", (feature, overrides) => {
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      undefined,
      [createLightNode(overrides as Partial<PlaceableRenderPackageAuroraLightNode>)],
      createCanonicalLightGroup()
    );

    expect(policy.mode).toBe("legacy_fallback_required");
    expect(policy.unsupportedFeatures).toEqual([feature]);
    expect(policy.affectedNodeNames).toEqual(["AuroraLight01"]);
  });

  it.each([
    ["position", { transform: { position: [0, 0, 1] } }],
    ["color", { transform: undefined, color: [1, 1, 1] }],
    ["radius", { transform: undefined, color: undefined, radius: 1 }],
    ["multiplier", { transform: undefined, color: undefined, radius: undefined, multiplier: 1 }],
    ["ambientOnly", {
      transform: undefined,
      color: undefined,
      radius: undefined,
      multiplier: undefined,
      ambientOnly: false
    }]
  ] as const)("derives canonical-supported %s presence", (_feature, overrides) => {
    const light = createLightNode({
      transform: undefined,
      color: undefined,
      radius: undefined,
      multiplier: undefined,
      ambientOnly: undefined,
      ...(overrides as Partial<PlaceableRenderPackageAuroraLightNode>)
    });
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      undefined,
      [light],
      createCanonicalLightGroup()
    );

    expect(policy.mode).toBe("canonical_supported");
    expect(policy.unsupportedFeatures).toEqual([]);
    expect(policy.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_DERIVED_FROM_SOURCE_RECORDS"
    ]);
  });

  it.each([
    ["null", null],
    ["primitive", 1],
    ["array", []],
    ["null node", createManifest(["radius"], { nodes: [null] })],
    ["primitive node", createManifest(["radius"], { nodes: [1] })],
    ["array node", createManifest(["radius"], { nodes: [[]] })],
    ["node name not string", createManifest(["radius"], {
      nodes: [{ nodeName: 1, presentFeatures: ["radius"] }]
    })],
    ["wrong version", createManifest(["radius"], { version: "future/v2" })],
    ["fractional lightCount", createManifest(["radius"], { lightCount: 1.5 })],
    ["negative lightCount", createManifest(["radius"], { lightCount: -1 })],
    ["nodes not array", createManifest(["radius"], { nodes: {} })],
    ["truncated not boolean", createManifest(["radius"], { truncated: 0 })],
    ["diagnostics not array", createManifest(["radius"], { diagnosticCodes: {} })],
    ["diagnostic not string", createManifest(["radius"], { diagnosticCodes: [1] })],
    ["too many nodes", createManifest(["radius"], {
      lightCount: 129,
      nodes: Array.from({ length: 129 }, (_, index) => ({
        nodeName: `Light${index}`,
        presentFeatures: ["radius"]
      }))
    })],
    ["too many diagnostics", createManifest(["radius"], {
      diagnosticCodes: Array.from({ length: 33 }, (_, index) => `D${index}`)
    })],
    ["byte budget", createManifest(["radius"], {
      nodes: [{ nodeName: "x".repeat(66_000), presentFeatures: ["radius"] }]
    })],
    ["empty node name", createManifest(["radius"], {
      nodes: [{ nodeName: "", presentFeatures: ["radius"] }]
    })],
    ["features not array", createManifest(["radius"], {
      nodes: [{ nodeName: "AuroraLight01", presentFeatures: {} }]
    })],
    ["feature not string", createManifest(["radius"], {
      nodes: [{ nodeName: "AuroraLight01", presentFeatures: [1] }]
    })],
    ["mixed feature types", createManifest(["radius"], {
      nodes: [{ nodeName: "AuroraLight01", presentFeatures: ["radius", 1] }]
    })],
    ["too many features", createManifest(["radius"], {
      nodes: [{
        nodeName: "AuroraLight01",
        presentFeatures: Array.from({ length: 25 }, () => "radius")
      }]
    })]
  ])("blocks malformed manifest shape: %s", (_label, manifest) => {
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      manifest,
      [createLightNode()],
      createCanonicalLightGroup()
    );

    expect(policy.mode).toBe("blocked");
    expect(policy.requiresFallback).toBe(true);
    expect(policy.affectedNodeNames).toEqual(["AuroraLight01"]);
    expect(policy.unsupportedFeatures).toEqual([]);
    expect(policy.unknownFeatures).toEqual([]);
    expect(policy.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_MALFORMED"
    ]);
  });

  it("blocks duplicate feature tokens and manifest diagnostics", () => {
    const duplicate = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius", "radius"]),
      [createLightNode()],
      createCanonicalLightGroup()
    );
    const diagnosed = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius"], { diagnosticCodes: ["SOURCE_TRUNCATED"] }),
      [createLightNode()],
      createCanonicalLightGroup()
    );

    expect(duplicate.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_CONTRADICTORY"
    ]);
    expect(duplicate.unknownFeatures).toEqual([]);
    expect(duplicate.unsupportedFeatures).toEqual([]);
    expect(diagnosed.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_DIAGNOSTIC_PRESENT",
      "SOURCE_TRUNCATED"
    ]);
    expect(diagnosed.unknownFeatures).toEqual([]);
  });

  it.each([
    ["light count", { lightCount: 2 }],
    ["node count", { lightCount: 2, nodes: [{ nodeName: "AuroraLight01", presentFeatures: ["radius"] }] }],
    ["node order", {
      lightCount: 2,
      nodes: [
        { nodeName: "AuroraLight02", presentFeatures: ["radius"] },
        { nodeName: "AuroraLight01", presentFeatures: ["radius"] }
      ]
    }]
  ])("blocks contradictory %s", (_label, overrides) => {
    const lights = _label === "light count"
      ? [createLightNode()]
      : [createLightNode(), createLightNode({ nodeName: "AuroraLight02" })];
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius"], overrides),
      lights,
      createCanonicalLightGroup(lights.length)
    );

    expect(policy.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_CONTRADICTORY"
    ]);
    expect(policy.unknownFeatures).toEqual([]);
  });

  it("sorts/deduplicates unknown tokens and identifies only unsupported nodes", () => {
    const lights = [createLightNode(), createLightNode({ nodeName: "AuroraLight02" })];
    const unknownPolicy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius"], {
        lightCount: 2,
        nodes: [
          { nodeName: "AuroraLight01", presentFeatures: ["futureZ", "radius"] },
          { nodeName: "AuroraLight02", presentFeatures: ["futureA", "futureZ"] }
        ]
      }),
      lights,
      createCanonicalLightGroup(2)
    );
    const fallbackPolicy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius"], {
        lightCount: 2,
        nodes: [
          { nodeName: "AuroraLight01", presentFeatures: ["radius"] },
          { nodeName: "AuroraLight02", presentFeatures: ["shadow"] }
        ]
      }),
      lights,
      createCanonicalLightGroup(2)
    );

    expect(unknownPolicy.unknownFeatures).toEqual(["futureA", "futureZ"]);
    expect(unknownPolicy.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_UNKNOWN_FEATURE"
    ]);
    const unknownCanonicalGroup = createCanonicalLightGroup(2);
    expect(
      applyCanonicalSourceMdlLightFallbackPolicy(unknownCanonicalGroup, unknownPolicy)
    ).toBe(2);
    expect(
      unknownCanonicalGroup.userData.auroraVfxCanonicalSourceMdlLightPolicyUnknownFeatures
    ).toEqual(["futureA", "futureZ"]);
    expect(fallbackPolicy.affectedNodeNames).toEqual(["AuroraLight02"]);
    expect(fallbackPolicy.unsupportedFeatures).toEqual(["shadow"]);
    expect(fallbackPolicy.unknownFeatures).toEqual([]);
  });

  it("accepts exact manifest limits and distinguishes independent contradictions", () => {
    const exactNodeLights = Array.from({ length: 128 }, (_, index) =>
      createLightNode({ nodeName: `Light${index}` })
    );
    const exactNodeManifest = createManifest(["radius"], {
      lightCount: 128,
      nodes: exactNodeLights.map((light) => ({
        nodeName: light.nodeName,
        presentFeatures: ["radius"]
      }))
    });
    const exactNodePolicy = resolveCanonicalSourceMdlLightFallbackPolicy(
      exactNodeManifest,
      exactNodeLights,
      createCanonicalLightGroup(128)
    );
    expect(exactNodePolicy.mode).toBe("canonical_supported");

    const exactDiagnosticPolicy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius"], {
        diagnosticCodes: Array.from({ length: 32 }, (_, index) => `D${index}`)
      }),
      [createLightNode()],
      createCanonicalLightGroup()
    );
    expect(exactDiagnosticPolicy.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_DIAGNOSTIC_PRESENT",
      ...Array.from({ length: 32 }, (_, index) => `D${index}`)
    ]);

    const baseAtByteLimit = createManifest(["radius"], {
      nodes: [{ nodeName: "x", presentFeatures: ["radius"] }]
    }) as Record<string, unknown>;
    const baseBytes = new TextEncoder().encode(JSON.stringify(baseAtByteLimit)).length;
    const exactByteManifest = createManifest(["radius"], {
      nodes: [{
        nodeName: "x".repeat(1 + 64 * 1024 - baseBytes),
        presentFeatures: ["radius"]
      }]
    });
    expect(new TextEncoder().encode(JSON.stringify(exactByteManifest)).length).toBe(64 * 1024);
    const exactBytePolicy = resolveCanonicalSourceMdlLightFallbackPolicy(
      exactByteManifest,
      [createLightNode({ nodeName: "x".repeat(1 + 64 * 1024 - baseBytes) })],
      createCanonicalLightGroup()
    );
    expect(exactBytePolicy.mode).toBe("canonical_supported");

    const zeroCountPolicy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius"], { lightCount: 0, nodes: [] }),
      [createLightNode()],
      createCanonicalLightGroup()
    );
    expect(zeroCountPolicy.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_CONTRADICTORY"
    ]);

    const isolatedLightCountPolicy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius"], {
        lightCount: 2,
        nodes: [
          { nodeName: "AuroraLight01", presentFeatures: ["radius"] },
          { nodeName: "Extra", presentFeatures: ["radius"] }
        ]
      }),
      [createLightNode()],
      createCanonicalLightGroup()
    );
    expect(isolatedLightCountPolicy.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_CONTRADICTORY"
    ]);

    const oneNodeMismatchPolicy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(["radius"], {
        lightCount: 2,
        nodes: [
          { nodeName: "AuroraLight01", presentFeatures: ["radius"] },
          { nodeName: "Wrong", presentFeatures: ["radius"] }
        ]
      }),
      [createLightNode(), createLightNode({ nodeName: "AuroraLight02" })],
      createCanonicalLightGroup(2)
    );
    expect(oneNodeMismatchPolicy.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_CONTRADICTORY"
    ]);
  });

  it("accepts 24 feature tokens before applying unknown-feature fail-closed policy", () => {
    const features = [
      "position", "orientation", "scale", "transformTracks", "color", "radius",
      "multiplier", "ambientOnly", "shadow", "shadowRadius", "verticalDisplacement",
      "dynamicType", "affectDynamic", "lightPriority", "generateFlare",
      "flareTextureNames", "flareSizes", "flarePositions", "flareColorShifts",
      "flareRadius", "lensFlares", "fadingLight", "animationTracks", "futureFeature"
    ];
    const policy = resolveCanonicalSourceMdlLightFallbackPolicy(
      createManifest(features),
      [createLightNode()],
      createCanonicalLightGroup()
    );

    expect(policy.diagnosticCodes).toEqual([
      "VFX_MDL_LIGHT_FEATURE_MANIFEST_UNKNOWN_FEATURE"
    ]);
    expect(policy.unknownFeatures).toEqual(["futureFeature"]);
  });
});

function collectCanonicalLights(group: THREE.Object3D): THREE.Object3D[] {
  const result: THREE.Object3D[] = [];
  group.traverse((node) => {
    if (node.userData.auroraVfxCanonicalSourceMdlLight === true) result.push(node);
  });
  return result;
}
