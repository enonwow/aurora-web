import type { AuroraVfxPayload } from "../../scene/contracts";

export const DEV_VFX_DEFAULT_FIXTURE_ID =
  "vfx-retail-dm-visualeffect-row-68-duration-0";
export const DEV_VFX_TEXTURE_REFERENCE = "fx_canonical_fire";
export const DEV_VFX_ORACLE = "render-contract-local-diagnostic";

type DevVfxDrawLane = "textured_quad" | "linked_textured_quad" | "chunk_model";

interface DevVfxFixtureDefinition {
  fixtureId: string;
  title: string;
  rowId: number;
  label: string;
  tableName?: string;
  tableHash?: string;
  sourceAuthority: string;
  constructorKind: string;
  applicationMode: string;
  rawInvocation: string;
  drawParticleCount?: number;
  activeParticleCount?: number;
  drawLane?: DevVfxDrawLane;
  chunkName?: string;
  linkedChain?: boolean;
  p2pGravity?: boolean;
  beamEffect?: boolean;
  fountainAtlas?: {
    textureRef: string;
    xgrid: number;
    ygrid: number;
    fps: number;
    frameStart: number;
    frameEnd: number;
    randomFrameStart: boolean;
  };
  punchMode2Lighten?: boolean;
  pltLayerColors?: readonly {
    layer: string;
    color: { r: number; g: number; b: number };
  }[];
  blendMode?: {
    enum: "normal" | "punch_through" | "lighten";
    rawToken: string;
    modeNumber: number;
  };
  durationType?: "instant" | "temporary";
  durationSeconds?: number;
  targetRef?: string | null;
  effectorRef?: string | null;
  bodyNode?: string | null;
  diagnostics?: readonly {
    bucket: "sourceRows" | "dependencyGraph" | "renderContract" | "payload";
    code: string;
    severity: "info" | "warn" | "error";
    message: string;
  }[];
  palette: readonly [
    { r: number; g: number; b: number },
    { r: number; g: number; b: number }
  ];
}

export interface DevVfxFixtureRequest {
  fixtureId?: string;
  timeSeconds?: number;
  seed?: number;
}

export interface DevVfxFixturePayloadResult {
  fixtureId: string;
  title: string;
  timeSeconds: number;
  seed: number;
  oracle: typeof DEV_VFX_ORACLE;
  comparisonResult: "local-visible";
  canonicalParityPromoted: false;
  textureReference: typeof DEV_VFX_TEXTURE_REFERENCE;
  payload: AuroraVfxPayload;
}

const DEV_VFX_FIXTURES: readonly DevVfxFixtureDefinition[] = [
  {
    fixtureId: DEV_VFX_DEFAULT_FIXTURE_ID,
    title: "dm_visualeffect 68 0 / VFX_IMP_HEALING_M",
    rowId: 68,
    label: "VFX_IMP_HEALING_M",
    sourceAuthority: "selectedSource2da",
    constructorKind: "dm_visualeffect",
    applicationMode: "object",
    rawInvocation: "dm_visualeffect 68 0",
    palette: [
      { r: 1, g: 0.35, b: 0.22 },
      { r: 0.28, g: 0.95, b: 0.82 }
    ]
  },
  {
    fixtureId: "vfx-retail-scripted-effectvisualeffect-row-50",
    title: "Scripted EffectVisualEffect(VFX_IMP_DEATH)",
    rowId: 50,
    label: "VFX_IMP_DEATH",
    sourceAuthority: "selectedSource2da",
    constructorKind: "EffectVisualEffect",
    applicationMode: "object",
    rawInvocation:
      "ApplyEffectToObject(DURATION_TYPE_INSTANT, EffectVisualEffect(VFX_IMP_DEATH), oTarget);",
    palette: [
      { r: 0.72, g: 0.5, b: 1 },
      { r: 0.9, g: 0.9, b: 1 }
    ]
  },
  {
    fixtureId: "vfx-retail-scripted-effectbeam-row-210-body-chest",
    title: "Scripted EffectBeam(VFX_BEAM_FIRE, BODY_NODE_CHEST)",
    rowId: 210,
    label: "VFX_BEAM_FIRE",
    sourceAuthority: "selectedSource2da",
    constructorKind: "EffectBeam",
    applicationMode: "object",
    rawInvocation:
      "ApplyEffectToObject(DURATION_TYPE_TEMPORARY, EffectBeam(VFX_BEAM_FIRE, oSource, BODY_NODE_CHEST), oTarget, 3.0);",
    durationType: "temporary",
    durationSeconds: 3,
    targetRef: "retail-beam-target",
    effectorRef: "retail-beam-source",
    bodyNode: "BODY_NODE_CHEST",
    drawParticleCount: 5,
    beamEffect: true,
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_BEAM_SELECTED_SOURCE_ROW_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "EffectBeam row 210 is represented as a local diagnostic until retail source/target/body-node runtime evidence is supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_EFFECTBEAM_CONTEXT_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture draws a source-target beam proxy from render-contract context; it is not Aurora retail beam-volume rendering."
      },
      {
        bucket: "payload",
        code: "VFX_EFFECTBEAM_RETAIL_CONTEXT_REQUIRED",
        severity: "warn",
        message:
          "Canonical EffectBeam parity requires retail source object, target object, BODY_NODE_CHEST anchoring, runtime ticks, render contract, capture, and comparison evidence."
      }
    ],
    palette: [
      { r: 1, g: 0.34, b: 0.08 },
      { r: 1, g: 0.88, b: 0.24 }
    ]
  },
  {
    fixtureId: "vfx-retail-explosion-detonate-fireball",
    title: "Explosion emitter with explicit detonate event",
    rowId: 22,
    label: "VFX_FNF_FIREBALL",
    sourceAuthority: "selectedSource2da-candidate",
    constructorKind: "EffectVisualEffect",
    applicationMode: "location",
    rawInvocation: "EffectVisualEffect(VFX_FNF_FIREBALL) plus MDL animation event detonate",
    palette: [
      { r: 1, g: 0.68, b: 0.18 },
      { r: 1, g: 0.18, b: 0.1 }
    ]
  },
  {
    fixtureId: "vfx-retail-fountain-atlas-cot-fx01",
    title: "cot_fx01 local Fountain atlas diagnostic",
    rowId: 1001,
    label: "cot_fx01/fire!03",
    sourceAuthority: "localUntrackedMdlCandidate",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation:
      "backend/tmp_cot_fx01.mdl emitter fire!03 Fountain atlas xgrid/ygrid/fps/framestart/frameend/random",
    drawParticleCount: 6,
    fountainAtlas: {
      textureRef: "fx_canonical_fire",
      xgrid: 4,
      ygrid: 4,
      fps: 12,
      frameStart: 0,
      frameEnd: 15,
      randomFrameStart: true
    },
    palette: [
      { r: 0.35, g: 0.9, b: 1 },
      { r: 1, g: 0.76, b: 0.24 }
    ]
  },
  {
    fixtureId: "vfx-retail-chunk-particles-progfx-type9",
    title: "Chunk particles / progfx Type 9 local diagnostic",
    rowId: 9009,
    label: "progfx_type9_chunk_diagnostic",
    tableName: "progfx.2da",
    tableHash: "A570A8F97F7CA238BCFC7C91E4F229F597C51EC581382BE2404B1B0B3289E54F",
    sourceAuthority: "selectedSource2da-type-distribution",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "Chunk emitter/progFX Type 9 retail fixture required",
    activeParticleCount: 2,
    drawParticleCount: 0,
    drawLane: "chunk_model",
    chunkName: "progfx_type9_chunk_model_pending",
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PROGFX_TYPE9_SELECTED_SOURCE_DISTRIBUTION_ONLY",
        severity: "warn",
        message:
          "progfx Type 9 is represented by selected-source type distribution only; no admitted row/resource candidate is present."
      },
      {
        bucket: "dependencyGraph",
        code: "VFX_CHUNK_MODEL_RESOURCE_CLASS_REQUIRED",
        severity: "warn",
        message:
          "Chunk-particle lane requires a resolved chunk-model resource before canonical retail parity can be claimed."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_CHUNK_LANE_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture preserves chunk-model lane selection with a diagnostic placeholder and zero fake particle draws."
      }
    ],
    palette: [
      { r: 1, g: 0.7, b: 0.28 },
      { r: 1, g: 0.4, b: 0.12 }
    ]
  },
  {
    fixtureId: "vfx-retail-linked-chain",
    title: "Linked chain local diagnostic",
    rowId: 9010,
    label: "linked_chain_diagnostic",
    sourceAuthority: "requiredFixtureFamily-local-diagnostic",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "Linked particle chain retail fixture required",
    drawParticleCount: 5,
    drawLane: "linked_textured_quad",
    linkedChain: true,
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_LINKED_CHAIN_SOURCE_EVIDENCE_REQUIRED",
        severity: "warn",
        message:
          "Linked-chain fixture family is represented as a local diagnostic until source and retail runtime evidence are supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_LINKED_CHAIN_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture preserves linked_textured_quad lane selection; local quads cannot prove Aurora linked segment-buffer parity."
      },
      {
        bucket: "payload",
        code: "VFX_LINKED_CHAIN_RETAIL_SEGMENT_BUFFER_REQUIRED",
        severity: "warn",
        message:
          "Canonical linked-chain parity requires retail runtime/render contract evidence for contiguous segment buffer behavior."
      }
    ],
    palette: [
      { r: 0.22, g: 0.8, b: 1 },
      { r: 0.98, g: 0.92, b: 0.36 }
    ]
  },
  {
    fixtureId: "vfx-retail-p2p-gravity-reference-node",
    title: "P2P gravity reference-node local diagnostic",
    rowId: 9011,
    label: "p2p_gravity_reference_node_diagnostic",
    sourceAuthority: "requiredFixtureFamily-local-diagnostic",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "P2P gravity with target/reference-node context retail fixture required",
    drawParticleCount: 7,
    p2pGravity: true,
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_P2P_GRAVITY_SOURCE_EVIDENCE_REQUIRED",
        severity: "warn",
        message:
          "P2P gravity fixture family is represented as a local diagnostic until source and retail runtime evidence are supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_P2P_GRAVITY_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture samples a deterministic source-target gravity arc; it is not an Aurora retail tick dump."
      },
      {
        bucket: "payload",
        code: "VFX_P2P_GRAVITY_REFERENCE_NODE_REQUIRED",
        severity: "warn",
        message:
          "Canonical P2P gravity parity requires retail reference-node mapping, gravity/drag state, runtime ticks, and render contract evidence."
      }
    ],
    palette: [
      { r: 0.4, g: 0.74, b: 1 },
      { r: 1, g: 0.7, b: 0.22 }
    ]
  },
  {
    fixtureId: "vfx-retail-punch-through-mode2-lighten",
    title: "Punch-through vs mode2/lighten local diagnostic",
    rowId: 9012,
    label: "punch_through_mode2_lighten_diagnostic",
    sourceAuthority: "requiredFixtureFamily-local-diagnostic",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "Punch-through alpha test versus mode2/lighten retail fixture required",
    drawParticleCount: 4,
    punchMode2Lighten: true,
    blendMode: {
      enum: "lighten",
      rawToken: "Mode2_Lighten",
      modeNumber: 2
    },
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PUNCH_MODE2_SOURCE_EVIDENCE_REQUIRED",
        severity: "warn",
        message:
          "Punch-through/mode2 fixture family is represented as a local diagnostic until source and retail runtime evidence are supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_MODE2_LIGHTEN_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture records Mode2/Lighten blend selection locally; it is not Aurora retail alpha/depth state capture."
      },
      {
        bucket: "payload",
        code: "VFX_PUNCH_THROUGH_RETAIL_BLEND_DEPTH_REQUIRED",
        severity: "warn",
        message:
          "Canonical punch-through versus mode2/lighten parity requires retail alpha-test, depth-write, blend-factor, and screenshot comparison evidence."
      }
    ],
    palette: [
      { r: 0.12, g: 0.7, b: 1 },
      { r: 1, g: 0.92, b: 0.18 }
    ]
  },
  {
    fixtureId: "vfx-retail-plt-known-layer-colors",
    title: "PLT known layer colors local diagnostic",
    rowId: 9013,
    label: "plt_known_layer_colors_diagnostic",
    sourceAuthority: "requiredFixtureFamily-local-diagnostic",
    constructorKind: "MDL_EMITTER",
    applicationMode: "source_only",
    rawInvocation: "PLT visual with known layer colors retail fixture required",
    drawParticleCount: 4,
    pltLayerColors: [
      { layer: "skin", color: { r: 1, g: 0.66, b: 0.42 } },
      { layer: "hair", color: { r: 0.62, g: 0.32, b: 0.08 } },
      { layer: "cloth1", color: { r: 0.12, g: 0.48, b: 1 } },
      { layer: "cloth2", color: { r: 0.82, g: 0.12, b: 0.9 } }
    ],
    diagnostics: [
      {
        bucket: "sourceRows",
        code: "VFX_PLT_LAYER_COLOR_SOURCE_EVIDENCE_REQUIRED",
        severity: "warn",
        message:
          "PLT layer-color fixture family is represented as a local diagnostic until source and retail palette evidence are supplied."
      },
      {
        bucket: "renderContract",
        code: "VFX_DEV_PLT_LAYER_COLORS_DIAGNOSTIC_ONLY",
        severity: "warn",
        message:
          "Dev fixture assigns known layer colors to visible records; it is not Aurora retail PLT palette lookup evidence."
      },
      {
        bucket: "payload",
        code: "VFX_PLT_RETAIL_LAYER_PALETTE_REQUIRED",
        severity: "warn",
        message:
          "Canonical PLT parity requires retail layer indices, palette lookup, material binding, capture reference, and comparison evidence."
      }
    ],
    palette: [
      { r: 0.12, g: 0.48, b: 1 },
      { r: 0.82, g: 0.12, b: 0.9 }
    ]
  }
];

export function resolveDevVfxFixtureId(requestedFixtureId: string | undefined): string {
  const normalized = requestedFixtureId?.trim();
  if (!normalized) {
    return DEV_VFX_DEFAULT_FIXTURE_ID;
  }
  return DEV_VFX_FIXTURES.some((fixture) => fixture.fixtureId === normalized)
    ? normalized
    : DEV_VFX_DEFAULT_FIXTURE_ID;
}

export function createDevAuroraVfxPayload(
  request: DevVfxFixtureRequest = {}
): DevVfxFixturePayloadResult {
  const fixtureId = resolveDevVfxFixtureId(request.fixtureId);
  const fixture = DEV_VFX_FIXTURES.find((entry) => entry.fixtureId === fixtureId)!;
  const timeSeconds = clampFinite(request.timeSeconds, 0.5, 0, 12);
  const seed = Math.trunc(clampFinite(request.seed, 1, 0, 999_999));
  const drawLane = fixture.drawLane ?? "textured_quad";
  const drawParticleCount = Math.trunc(
    clampFinite(fixture.drawParticleCount, 2, drawLane === "chunk_model" ? 0 : 1, 24)
  );
  const drawRecords =
    drawLane === "chunk_model"
      ? []
      : Array.from({ length: drawParticleCount }, (_, particleIndex) =>
          createDrawRecord(fixture, drawLane, particleIndex, drawParticleCount, timeSeconds, seed)
        );
  const activeParticleCount = Math.trunc(
    clampFinite(fixture.activeParticleCount, drawRecords.length, 0, 24)
  );
  const verticesPerDrawParticle = drawLane === "chunk_model" ? 0 : 6;
  const fixtureDiagnostics = createFixtureDiagnostics(fixture);

  const payload: AuroraVfxPayload = {
    version: "aurora-vfx-payload/v1",
    canonicalStatus: "canonical",
    backendCanonical: true,
    sourceKind: "effect_instance",
    previewMode: "none",
    diagnostics: {
      sourceRows: [
        {
          code: "VFX_DEV_FIXTURE_SELECTED_SOURCE_ONLY",
          severity: "info",
          message:
            "Dev runner fixture preserves selected-source row identity, but does not include retail execution evidence."
        },
        ...fixtureDiagnostics.sourceRows
      ],
      effectInstance: [],
      phaseSchedule: [],
      dependencyGraph: fixtureDiagnostics.dependencyGraph,
      runtimeState: [
        {
          code: "VFX_DEV_RUNTIME_STATE_DIAGNOSTIC_ONLY",
          severity: "warn",
          message:
            "Runtime state in this runner is deterministic local diagnostic data, not Aurora retail capture."
        }
      ],
      renderContract: [
        {
          code: "VFX_DEV_RENDER_CONTRACT_FIXTURE",
          severity: "info",
          message:
            "Local render-contract fixture used to exercise the frontend canonical renderer."
        },
        ...fixtureDiagnostics.renderContract
      ],
      payload: [
        {
          code: "VFX_DEV_VISUAL_RUNNER_NOT_PARITY_PROOF",
          severity: "warn",
          message:
            "Browser screenshot and Three.js output from this runner cannot promote canonical retail parity."
        },
        {
          code: "VFX_RETAIL_CAPTURE_REFERENCE_REQUIRED",
          severity: "warn",
          message:
            "Retail capture, runtime dump, render contract snapshot, and comparison remain required for canonical parity."
        },
        ...fixtureDiagnostics.payload
      ]
    },
    contracts: {
      sourceRows: {
        version: "aurora-vfx-dev-source-row-anchor/v1",
        fixtureId: fixture.fixtureId,
        tableName: fixture.tableName ?? "visualeffects.2da",
        profile: "nwn-ee-8193.34-selected-source",
        tableHash:
          fixture.tableHash ??
          "ACEFE76F7FB14E88916AE1ADE40DD5108B8A2F601EAADA82A67F751B4EB56EA2",
        rowId: fixture.rowId,
        label: fixture.label,
        sourceAuthority: fixture.sourceAuthority,
        evidenceGrade: "selected-source-manifest-only"
      },
      effectInstance: {
        version: "aurora-vfx-dev-effect-instance/v1",
        fixtureId: fixture.fixtureId,
        constructorKind: fixture.constructorKind,
        applicationMode: fixture.applicationMode,
        durationType: fixture.durationType ?? "instant",
        durationSeconds: fixture.durationSeconds ?? 0,
        sourceRowId: fixture.rowId,
        rawInvocation: fixture.rawInvocation,
        ...(fixture.targetRef !== undefined ? { targetRef: fixture.targetRef } : {}),
        ...(fixture.effectorRef !== undefined ? { effectorRef: fixture.effectorRef } : {}),
        ...(fixture.bodyNode !== undefined ? { bodyNode: fixture.bodyNode } : {})
      },
      phaseSchedule: {
        version: "aurora-vfx-dev-phase-schedule/v1",
        checkpointSeconds: timeSeconds,
        deterministicSeed: seed,
        phase: "local_visual_runner"
      },
      dependencyGraph: {
        version: "aurora-vfx-dependency-graph/v1",
        edges: createDependencyEdges(fixture, drawLane),
        diagnostics: fixtureDiagnostics.dependencyGraph
      },
      runtimeState: {
        version: "aurora-vfx-dev-runtime-state/v1",
        activeParticleCount,
        freeParticleCount: 0,
        checkpointSeconds: timeSeconds,
        deterministicSeed: seed,
        retailCapture: false
      },
      renderContract: {
        version: "aurora-vfx-runtime-render-contract/v1",
        activeParticleCount,
        drawParticleCount: drawRecords.length,
        verticesPerDrawParticle,
        drawVertexCount: drawRecords.length * verticesPerDrawParticle,
        drawLane,
        renderMode: {
          enum:
            drawLane === "chunk_model"
              ? "chunk_model"
              : drawLane === "linked_textured_quad"
                ? "linked_billboard"
                : "billboard_to_world_z",
          rawToken:
            drawLane === "chunk_model"
              ? "Chunk"
              : drawLane === "linked_textured_quad"
                ? "Linked"
                : "Billboard_to_World_Z"
        },
        blendMode: createBlendMode(fixture),
        renderState: {
          depthWriteLane:
            fixture.blendMode?.enum === "punch_through"
              ? "punch_through_depth_write_on"
              : "non_punch_transparent_depth_write_off",
          transparentLane:
            fixture.blendMode?.enum === "punch_through"
              ? "punch_through_alpha_test_lane"
              : "non_punch_transparent_lane"
        },
        renderOrder: {
          value: 7,
          rawValue: 7
        },
        drawRecords,
        diagnostics: [
          {
            code: "VFX_PARTICLE_DRAW_NON_INDEXED_ARRAYS_REQUIRED",
            severity: "info",
            message: "Dev fixture uses renderer-agnostic non-indexed draw records."
          },
          ...fixtureDiagnostics.renderContract
        ],
        ...(drawLane === "chunk_model"
          ? {
              chunkLane: {
                lane: "chunk_model",
                chunkName: fixture.chunkName ?? "chunk_model_pending",
                canonicalResourceResolved: false
              }
            }
          : {}),
        adapterBoundaries: {
          threeMaterialSettingsAreSourceTruth: false,
          spriteMaterialIsCanonical: false,
          shaderMaterialIsCanonical: false,
          glbPreviewIsCanonical: false,
          materialLevelAtlasFrameOffsetAllowed: false
        },
        ...(fixture.beamEffect
          ? {
              beamContext: {
                constructorKind: "EffectBeam",
                applicationMode: fixture.applicationMode,
                durationType: fixture.durationType ?? "temporary",
                durationSeconds: fixture.durationSeconds ?? 3,
                targetRef: fixture.targetRef ?? "retail-beam-target",
                effectorRef: fixture.effectorRef ?? "retail-beam-source",
                bodyNode: fixture.bodyNode ?? "BODY_NODE_CHEST",
                sourceAnchor: { x: -0.62, y: -0.08, z: 0 },
                targetAnchor: { x: 0.62, y: 0.16, z: 0 },
                retailBeamVolumeResolved: false
              }
            }
          : {}),
        ...(fixture.fountainAtlas
          ? {
              fountainAtlas: {
                emitterType: "Fountain",
                textureRef: fixture.fountainAtlas.textureRef,
                xgrid: fixture.fountainAtlas.xgrid,
                ygrid: fixture.fountainAtlas.ygrid,
                fps: fixture.fountainAtlas.fps,
                frameStart: fixture.fountainAtlas.frameStart,
                frameEnd: fixture.fountainAtlas.frameEnd,
                randomFrameStart: fixture.fountainAtlas.randomFrameStart,
                retailPlaybackResolved: false
              }
            }
          : {})
      }
    },
    provenance: {
      backendPayloadVersion: "dev-vfx-runner-local",
      sourceProfile: "nwn-ee-8193.34-selected-source",
      sourceTable: fixture.tableName ?? "visualeffects.2da",
      sourceRowId: fixture.rowId,
      sourceLabel: fixture.label,
      effectInstanceId: fixture.fixtureId,
      runtimeProfile: "dev-vfx-visual-runner-local-diagnostic",
      renderContractVersion: "aurora-vfx-runtime-render-contract/v1"
    }
  };

  return {
    fixtureId: fixture.fixtureId,
    title: fixture.title,
    timeSeconds,
    seed,
    oracle: DEV_VFX_ORACLE,
    comparisonResult: "local-visible",
    canonicalParityPromoted: false,
    textureReference: DEV_VFX_TEXTURE_REFERENCE,
    payload
  };
}

function createFixtureDiagnostics(fixture: DevVfxFixtureDefinition) {
  type DevVfxFixtureDiagnostic = {
    bucket: "sourceRows" | "dependencyGraph" | "renderContract" | "payload";
    code: string;
    severity: "info" | "warn" | "error";
    message: string;
  };
  const byBucket = {
    sourceRows: [] as DevVfxFixtureDiagnostic[],
    dependencyGraph: [] as DevVfxFixtureDiagnostic[],
    renderContract: [] as DevVfxFixtureDiagnostic[],
    payload: [] as DevVfxFixtureDiagnostic[]
  };
  for (const diagnostic of fixture.diagnostics ?? []) {
    byBucket[diagnostic.bucket].push(diagnostic);
  }
  return byBucket;
}

function createDependencyEdges(fixture: DevVfxFixtureDefinition, drawLane: DevVfxDrawLane) {
  if (drawLane === "chunk_model") {
    return [
      {
        edgeType: "chunk_model",
        requestedResourceClass: "chunk_model",
        requestedRef: fixture.chunkName ?? "chunk_model_pending",
        selectedCandidate: null
      }
    ];
  }
  return [
    {
      edgeType: "texture",
      requestedResourceClass: "texture",
      requestedRef: DEV_VFX_TEXTURE_REFERENCE,
      selectedCandidate: {
        resourceKey: `${DEV_VFX_TEXTURE_REFERENCE}.tga`
      }
    }
  ];
}

function createBlendMode(fixture: DevVfxFixtureDefinition) {
  return (
    fixture.blendMode ?? {
      enum: "normal" as const,
      rawToken: "Normal",
      modeNumber: 0
    }
  );
}

function createDrawRecord(
  fixture: DevVfxFixtureDefinition,
  drawLane: DevVfxDrawLane,
  particleIndex: number,
  particleCount: number,
  timeSeconds: number,
  seed: number
) {
  const phase = timeSeconds * Math.PI * 2 + seed * 0.017 + particleIndex * 1.35;
  const normalizedIndex = particleCount <= 1 ? 0.5 : particleIndex / (particleCount - 1);
  const side = particleIndex % 2 === 0 ? -1 : 1;
  const frameIndex = (fixture.rowId + seed + particleIndex * 3) % 16;
  const fountainLift = (normalizedIndex - 0.5) * 0.34;
  const linkedPhase = timeSeconds * Math.PI + seed * 0.011;
  const linkedX = (normalizedIndex - 0.5) * 0.78;
  const linkedY = Math.sin(normalizedIndex * Math.PI * 2 + linkedPhase) * 0.16;
  const p2pX = -0.48 + normalizedIndex * 0.96;
  const p2pArc = 4 * normalizedIndex * (1 - normalizedIndex);
  const p2pY = -0.2 + p2pArc * 0.46 - normalizedIndex * normalizedIndex * 0.18;
  const beamX = -0.62 + normalizedIndex * 1.24;
  const beamY = -0.08 + normalizedIndex * 0.24 + Math.sin(normalizedIndex * Math.PI) * 0.04;
  const punchX = -0.3 + normalizedIndex * 0.6;
  const punchY = particleIndex % 2 === 0 ? -0.11 : 0.11;
  const pltX = -0.36 + normalizedIndex * 0.72;
  const pltY = -0.02 + Math.sin(normalizedIndex * Math.PI) * 0.1;
  const blendMode = createBlendMode(fixture);
  const pltLayerColor = fixture.pltLayerColors?.[particleIndex % fixture.pltLayerColors.length];
  return {
    recordKind: "aurora-particle-draw-record",
    drawRecordId: `${fixture.fixtureId}:draw:${particleIndex}`,
    emitterNodeName: "dev_vfx_fixture_emit",
    lane: drawLane === "linked_textured_quad" ? "linked_textured_quad" : "textured_quad",
    particleId: fixture.rowId * 10 + particleIndex,
    particleIndex,
    verticesPerParticle: 6,
    vertexCount: 6,
    drawRoute: {
      route: "non_indexed_draw_arrays",
      indexed: false,
      drawModeArgument: 3,
      drawModeArgumentSource: "aurora-draw-wrapper-mode-arg3",
      enumTableCaptured: false,
      triangleListInferenceProof: "diagnostic_pending"
    },
    renderMode: {
      enum: drawLane === "linked_textured_quad" ? "linked_billboard" : "billboard_to_world_z",
      rawToken: drawLane === "linked_textured_quad" ? "Linked" : "Billboard_to_World_Z"
    },
    blendMode: {
      enum: blendMode.enum,
      rawToken: blendMode.rawToken,
      modeNumber: blendMode.modeNumber
    },
    renderOrder: {
      value: 7,
      rawValue: 7
    },
    position: {
      x: fixture.p2pGravity
        ? p2pX
        : fixture.beamEffect
          ? beamX
        : fixture.punchMode2Lighten
          ? punchX
          : fixture.pltLayerColors
            ? pltX
        : fixture.linkedChain
        ? linkedX
        : side * (0.14 + 0.04 * Math.sin(phase)) + (normalizedIndex - 0.5) * 0.18,
      y: fixture.p2pGravity
        ? p2pY
        : fixture.beamEffect
          ? beamY
        : fixture.punchMode2Lighten
          ? punchY
          : fixture.pltLayerColors
            ? pltY
        : fixture.linkedChain
          ? linkedY
          : fountainLift + 0.04 * Math.cos(phase * 0.7),
      z: 0
    },
    velocity: {
      x: fixture.p2pGravity
        ? 0.12
        : fixture.beamEffect
          ? 0.18
        : fixture.punchMode2Lighten
          ? 0.03 * side
          : fixture.pltLayerColors
            ? 0.01 * side
          : fixture.linkedChain
            ? 0.05
            : side * 0.03,
      y: fixture.p2pGravity
        ? 0.16 - normalizedIndex * 0.22
        : fixture.beamEffect
          ? 0.04
        : fixture.punchMode2Lighten
          ? 0.02 * Math.sin(phase)
          : fixture.pltLayerColors
            ? 0.01 * Math.cos(phase)
        : fixture.linkedChain
          ? 0.02 * Math.cos(linkedPhase)
          : 0.06 + normalizedIndex * 0.05,
      z: 0
    },
    color: pltLayerColor?.color ?? fixture.palette[particleIndex % fixture.palette.length],
    alpha: Math.max(0.32, 0.78 - normalizedIndex * 0.28),
    size: {
      x: fixture.p2pGravity
        ? 0.18 + 0.04 * Math.sin(phase)
        : fixture.beamEffect
          ? 0.34
        : fixture.punchMode2Lighten
          ? 0.38 + 0.03 * Math.sin(phase)
          : fixture.pltLayerColors
            ? 0.18
        : fixture.linkedChain
        ? 0.22 + 0.04 * Math.sin(phase)
        : 0.34 + 0.08 * (1 - normalizedIndex) + 0.04 * Math.sin(phase),
      y: fixture.p2pGravity
        ? 0.22 + 0.04 * Math.cos(phase)
        : fixture.beamEffect
          ? 0.12 + 0.02 * Math.sin(phase)
        : fixture.punchMode2Lighten
          ? 0.38 + 0.03 * Math.cos(phase)
          : fixture.pltLayerColors
            ? 0.28
        : fixture.linkedChain
        ? 0.3 + 0.04 * Math.cos(phase)
        : 0.4 + 0.1 * (1 - normalizedIndex) + 0.05 * Math.cos(phase)
    },
    atlasUv: createAtlasUv(frameIndex),
    atlasProvenance: {
      checkpointSeconds: timeSeconds,
      randomResetPath: "deterministic_dev_runner_seed",
      materialLevelFrameOffsetAllowed: false,
      frameStepIntegerConversion: "already_integer",
      ...(pltLayerColor
        ? {
            pltLayer: pltLayerColor.layer,
            pltLayerColorSource: "dev_known_layer_color_diagnostic"
          }
        : {}),
      ...(fixture.beamEffect
        ? {
            beamSegmentIndex: particleIndex,
            beamSegmentCount: particleCount,
            beamContextSource: "dev_effectbeam_context_diagnostic",
            bodyNode: fixture.bodyNode ?? "BODY_NODE_CHEST"
          }
        : {}),
      ...(fixture.fountainAtlas
        ? {
            emitterType: "Fountain",
            textureRef: fixture.fountainAtlas.textureRef,
            atlasGrid: {
              x: fixture.fountainAtlas.xgrid,
              y: fixture.fountainAtlas.ygrid
            },
            atlasFrameStart: fixture.fountainAtlas.frameStart,
            atlasFrameEnd: fixture.fountainAtlas.frameEnd,
            atlasFps: fixture.fountainAtlas.fps,
            randomFrameStart: fixture.fountainAtlas.randomFrameStart,
            atlasPlaybackSource: "dev_fountain_atlas_diagnostic"
          }
        : {})
    },
    diagnostics: []
  };
}

function createAtlasUv(frameIndex: number) {
  const frameColumn = frameIndex % 4;
  const frameRow = Math.floor(frameIndex / 4);
  const frameSize = 0.25;
  return {
    u0: frameColumn * frameSize,
    v0: frameRow * frameSize,
    u1: (frameColumn + 1) * frameSize,
    v1: (frameRow + 1) * frameSize,
    frameIndex,
    rawFrameIndex: frameIndex,
    mapping: "row_major_top_down_v"
  };
}

function clampFinite(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number
): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}
