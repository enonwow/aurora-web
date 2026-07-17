import {
  buildAuroraVfxDependencyGraph,
  type AuroraVfxDependencyCandidate,
  type AuroraVfxRequestedResourceClass
} from "../../src/modules/vfx/domain/aurora-vfx-dependency-graph";
import {
  buildAuroraVfxPhaseSchedule,
  parseAuroraVisualEffectsTwoDa,
  type AuroraVisualEffectSourceRow,
  type AuroraVfxEffectInstance
} from "../../src/modules/vfx/domain/aurora-vfx-source.parser";
import {
  buildAuroraVfxSourcePolicyTrace,
  type AuroraVfxSourceLayer
} from "../../src/modules/vfx/domain/aurora-vfx-source-policy";

const VISUALEFFECTS_GRAPH_HEADER = [
  "Label",
  "Type_FD",
  "Imp_Impact_Node",
  "ProgFX_Impact",
  "SoundImpact",
  "ProgFX_Duration",
  "SoundDuration",
  "ProgFX_Cessation",
  "SoundCessastion"
] as const;

function visualEffectsRow(
  rowId: number,
  overrides: Partial<Record<(typeof VISUALEFFECTS_GRAPH_HEADER)[number], string>>
): string {
  const cells = VISUALEFFECTS_GRAPH_HEADER.map((column) => overrides[column] ?? "****");
  return `${rowId} ${cells.join(" ")}`;
}

function parseGraphSourceRow(): AuroraVisualEffectSourceRow {
  return parseAuroraVisualEffectsTwoDa(
    [
      "2DA V2.0",
      "",
      VISUALEFFECTS_GRAPH_HEADER.join(" "),
      visualEffectsRow(22, {
        Label: "VFX_FNF_FIREBALL",
        Type_FD: "F",
        Imp_Impact_Node: "mdl_fireball",
        ProgFX_Impact: "11",
        SoundImpact: "snd_fire"
      })
    ].join("\n"),
    {
      profile: "dependency-graph-fixture",
      sourceLayer: "hak",
      sourceObjectKey: "__aurora/sources/hak/lc_vfx/visualeffects.2da",
      sourceHash: "sha256:visualeffects"
    }
  ).rows[0];
}

function scheduleFor(row = parseGraphSourceRow()) {
  const effectInstance: AuroraVfxEffectInstance = {
    constructorKind: "EffectVisualEffect",
    sourceRowId: row.rowId,
    applicationMode: "location",
    durationType: "instant",
    targetRef: "location:module_start"
  };
  return buildAuroraVfxPhaseSchedule(row, effectInstance);
}

function sourcePolicyTrace() {
  const enabledSourcePolicy = {
    includeModuleTemp0: true,
    includeModulePacked: true,
    includeHaks: true,
    includeVanilla: true,
    hakProfileId: "lc_vfx",
    hakPriorityList: []
  };
  return buildAuroraVfxSourcePolicyTrace({
    settings: {
      revision: 7,
      sources: {
        placeable: enabledSourcePolicy,
        tile: enabledSourcePolicy,
        area: enabledSourcePolicy,
        sound: enabledSourcePolicy,
        vfx: enabledSourcePolicy
      },
      hakProfiles: {
        lc_vfx: ["lc_vfx.hak", "cep3_vfx.hak"]
      }
    },
    candidates: [
      {
        candidateId: "visualeffects-table",
        layer: "hak",
        resourceKind: "table",
        resourceKey: "visualeffects.2da",
        hakName: "lc_vfx.hak",
        sourceHash: "sha256:visualeffects",
        tableHash: "sha256:visualeffects-table"
      }
    ]
  });
}

function candidate(
  layer: AuroraVfxSourceLayer,
  resourceKey: string,
  resourceHash: string,
  extra: Partial<AuroraVfxDependencyCandidate> = {}
): AuroraVfxDependencyCandidate {
  return {
    candidateId: `${layer}:${resourceKey}`,
    sourceLayer: layer,
    resourceKey,
    resourceHash,
    ...extra
  };
}

function trace(
  requestedResourceClass: AuroraVfxRequestedResourceClass,
  requestedRef: string,
  selectedCandidate?: AuroraVfxDependencyCandidate,
  lowerPrecedenceCandidates: AuroraVfxDependencyCandidate[] = []
) {
  return {
    requestedResourceClass,
    requestedRef,
    selectedCandidate,
    lowerPrecedenceCandidates
  };
}

describe("aurora-vfx dependency graph", () => {
  it("records module vs HAK precedence and source-policy cache-key contribution", () => {
    const sourceRow = parseGraphSourceRow();
    const graph = buildAuroraVfxDependencyGraph({
      sourceRow,
      phaseSchedule: scheduleFor(sourceRow),
      sourcePolicyTrace: sourcePolicyTrace(),
      resourceTraces: [
        trace(
          "model",
          "mdl_fireball",
          candidate("module", "modules/current/mdl_fireball.mdl", "sha256:module-model"),
          [
            candidate("hak", "hak/lc_vfx/mdl_fireball.mdl", "sha256:hak-model", {
              hakName: "lc_vfx.hak"
            })
          ]
        ),
        trace(
          "progfx_row",
          "11",
          candidate("hak", "progfx.2da#row=11", "sha256:progfx-row", {
            hakName: "lc_vfx.hak"
          })
        ),
        trace(
          "sound",
          "snd_fire",
          candidate("hak", "sounds/snd_fire.wav", "sha256:sound", {
            hakName: "lc_vfx.hak"
          })
        )
      ]
    });

    const modelEdge = graph.edges.find((edge) => edge.edgeType === "phase_model");

    expect(modelEdge).toMatchObject({
      requestedResourceClass: "model",
      requestedRef: "mdl_fireball",
      resolveStatus: "resolved",
      sourceTable: "visualeffects.2da",
      sourceRowId: 22,
      sourcePhase: "impact",
      sourceLayer: "hak",
      selectedCandidate: {
        sourceLayer: "module",
        resourceKey: "modules/current/mdl_fireball.mdl",
        resourceHash: "sha256:module-model"
      },
      lowerPrecedenceCandidates: [
        expect.objectContaining({
          sourceLayer: "hak",
          resourceKey: "hak/lc_vfx/mdl_fireball.mdl"
        })
      ]
    });
    expect(modelEdge?.cacheKeyParts).toMatchObject({
      sourceHash: "sha256:visualeffects",
      selectedResourceHash: "sha256:module-model",
      runtimeSettingsRevision: 7,
      selectedTableHash: "sha256:visualeffects-table"
    });
    expect(graph.cacheKeyParts).toMatchObject({
      sourceHash: "sha256:visualeffects",
      runtimeSettingsRevision: 7,
      selectedTableHash: "sha256:visualeffects-table"
    });
    expect(graph.cacheKeyParts.edgeKeys).toHaveLength(graph.edges.length);
  });

  it("records ordered HAK conflicts on resolved edges", () => {
    const sourceRow = parseGraphSourceRow();
    const graph = buildAuroraVfxDependencyGraph({
      sourceRow,
      phaseSchedule: scheduleFor(sourceRow),
      sourcePolicyTrace: sourcePolicyTrace(),
      resourceTraces: [
        trace(
          "sound",
          "snd_fire",
          candidate("hak", "hak/lc_vfx/snd_fire.wav", "sha256:lc-sound", {
            hakName: "lc_vfx.hak",
            precedenceRank: 100
          }),
          [
            candidate("hak", "hak/cep3_vfx/snd_fire.wav", "sha256:cep-sound", {
              hakName: "cep3_vfx.hak",
              precedenceRank: 101
            }),
            candidate("vanilla", "vanilla/snd_fire.wav", "sha256:vanilla-sound", {
              precedenceRank: 300
            })
          ]
        )
      ]
    });

    const soundEdge = graph.edges.find((edge) => edge.edgeType === "sound");

    expect(soundEdge).toMatchObject({
      resolveStatus: "resolved",
      selectedCandidate: {
        sourceLayer: "hak",
        hakName: "lc_vfx.hak",
        resourceHash: "sha256:lc-sound"
      }
    });
    expect(soundEdge?.lowerPrecedenceCandidates.map((entry) => entry.hakName)).toEqual([
      "cep3_vfx.hak",
      undefined
    ]);
  });

  it("keeps missing texture as an unresolved edge without deleting source or emitter edges", () => {
    const sourceRow = parseGraphSourceRow();
    const graph = buildAuroraVfxDependencyGraph({
      sourceRow,
      phaseSchedule: scheduleFor(sourceRow),
      sourcePolicyTrace: sourcePolicyTrace(),
      emitters: [
        {
          nodeName: "emit_fire",
          sourceModelRef: "vfx_fireball",
          texture: "missing_tex"
        }
      ]
    });

    expect(graph.sourceRowId).toBe(22);
    expect(graph.edges.some((edge) => edge.edgeType === "emitter_node")).toBe(true);
    const textureEdge = graph.edges.find(
      (edge) => edge.edgeType === "texture" && edge.requestedRef === "missing_tex"
    );
    expect(textureEdge).toMatchObject({
      resolveStatus: "unresolved",
      preloadIntent: "runtime_required"
    });
    expect(textureEdge?.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_TEXTURE_RESOURCE_MISSING_DIAGNOSTIC"
    );
  });

  it("keeps missing chunk model unresolved and does not fall back to texture billboard", () => {
    const sourceRow = parseGraphSourceRow();
    const graph = buildAuroraVfxDependencyGraph({
      sourceRow,
      phaseSchedule: scheduleFor(sourceRow),
      sourcePolicyTrace: sourcePolicyTrace(),
      emitters: [
        {
          nodeName: "emit_chunk",
          texture: "fallback_tex",
          chunkName: "missing_chunk"
        }
      ],
      resourceTraces: [
        trace(
          "texture",
          "fallback_tex",
          candidate("hak", "textures/fallback_tex.tga", "sha256:texture", {
            hakName: "lc_vfx.hak"
          })
        )
      ]
    });

    const chunkEdge = graph.edges.find((edge) => edge.edgeType === "chunk_model");
    const textureEdge = graph.edges.find((edge) => edge.edgeType === "texture");

    expect(chunkEdge).toMatchObject({
      requestedRef: "missing_chunk",
      resolveStatus: "unresolved",
      preloadIntent: "runtime_required"
    });
    expect(chunkEdge?.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining(["VFX_CHUNK_MODEL_MISSING", "VFX_CHUNKNAME_OVERRIDES_TEXTURE"])
    );
    expect(textureEdge).toMatchObject({
      requestedRef: "fallback_tex",
      resolveStatus: "resolved",
      preloadIntent: "preserve_raw"
    });
    expect(textureEdge?.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_CHUNKNAME_OVERRIDES_TEXTURE"
    );
  });

  it("records TXI sidecar, MTR/material, and custom shader edges", () => {
    const sourceRow = parseGraphSourceRow();
    const graph = buildAuroraVfxDependencyGraph({
      sourceRow,
      phaseSchedule: scheduleFor(sourceRow),
      sourcePolicyTrace: sourcePolicyTrace(),
      emitters: [
        {
          nodeName: "emit_material",
          texture: "fx_fire",
          materialName: "mat_fire",
          customShader: "sh_fire"
        }
      ],
      resourceTraces: [
        trace("texture", "fx_fire", candidate("hak", "textures/fx_fire.tga", "sha256:tex")),
        trace("txi", "fx_fire.txi", candidate("hak", "textures/fx_fire.txi", "sha256:txi")),
        trace("material", "mat_fire", candidate("hak", "materials/mat_fire.mtr", "sha256:mtr")),
        trace("shader", "sh_fire", candidate("hak", "shaders/sh_fire.shd", "sha256:shader"))
      ]
    });

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          edgeType: "txi_sidecar",
          requestedResourceClass: "txi",
          requestedRef: "fx_fire.txi",
          resolveStatus: "resolved"
        }),
        expect.objectContaining({
          edgeType: "mtr_material",
          requestedResourceClass: "material",
          requestedRef: "mat_fire",
          resolveStatus: "resolved"
        }),
        expect.objectContaining({
          edgeType: "shader",
          requestedResourceClass: "shader",
          requestedRef: "sh_fire",
          resolveStatus: "resolved"
        })
      ])
    );
  });

  it("records PLT dependencies as profile-gated diagnostics", () => {
    const sourceRow = parseGraphSourceRow();
    const graph = buildAuroraVfxDependencyGraph({
      sourceRow,
      phaseSchedule: scheduleFor(sourceRow),
      sourcePolicyTrace: sourcePolicyTrace(),
      emitters: [
        {
          nodeName: "emit_plt",
          texture: "robe_fx.plt"
        }
      ]
    });

    const textureEdge = graph.edges.find((edge) => edge.edgeType === "texture");

    expect(textureEdge?.diagnostics.map((entry) => entry.code)).toEqual(
      expect.arrayContaining([
        "VFX_PLT_PROFILE_GATED",
        "VFX_TEXTURE_RESOURCE_MISSING_DIAGNOSTIC"
      ])
    );
  });

  it("keeps the same raw token in texture, texture0, materialname, and chunkName as separate lanes", () => {
    const sourceRow = parseGraphSourceRow();
    const graph = buildAuroraVfxDependencyGraph({
      sourceRow,
      phaseSchedule: scheduleFor(sourceRow),
      sourcePolicyTrace: sourcePolicyTrace(),
      emitters: [
        {
          nodeName: "emit_same",
          texture: "same_ref",
          texture0: "same_ref",
          materialName: "same_ref",
          chunkName: "same_ref"
        }
      ]
    });

    const sameRefEdges = graph.edges.filter((edge) => edge.requestedRef === "same_ref");

    expect(sameRefEdges.map((edge) => `${edge.edgeType}:${edge.ownerPath}`).sort()).toEqual([
      "chunk_model:visualeffects.2da:22/emitter:emit_same/chunkName",
      "mtr_material:visualeffects.2da:22/emitter:emit_same/materialname",
      "texture:visualeffects.2da:22/emitter:emit_same/texture",
      "texture:visualeffects.2da:22/emitter:emit_same/texture0"
    ]);
    expect(new Set(sameRefEdges.map((edge) => edge.edgeId)).size).toBe(sameRefEdges.length);
  });

  it("records source model and spell/item/combat owner-slot edges", () => {
    const sourceRow = parseGraphSourceRow();
    const graph = buildAuroraVfxDependencyGraph({
      sourceRow,
      phaseSchedule: scheduleFor(sourceRow),
      sourcePolicyTrace: sourcePolicyTrace(),
      emitters: [
        {
          nodeName: "emit_source_model",
          sourceModelRef: "vfx_source_model"
        }
      ],
      ownerSlots: [
        {
          ownerPath: "spells.2da:0/ImpactScript",
          ownerKind: "spell",
          requestedRef: "nw_s0_magicmissile"
        }
      ],
      resourceTraces: [
        trace(
          "source_model",
          "vfx_source_model",
          candidate("hak", "models/vfx_source_model.mdl", "sha256:source-model")
        ),
        trace(
          "owner_slot",
          "nw_s0_magicmissile",
          candidate("module", "scripts/nw_s0_magicmissile.ncs", "sha256:script")
        )
      ]
    });

    expect(graph.edges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          edgeType: "source_model",
          requestedRef: "vfx_source_model",
          resolveStatus: "resolved"
        }),
        expect.objectContaining({
          edgeType: "owner_slot",
          ownerPath: "spells.2da:0/ImpactScript",
          requestedRef: "nw_s0_magicmissile",
          resolveStatus: "resolved"
        })
      ])
    );
  });

  it("diagnoses graphs built without a source-policy trace", () => {
    const sourceRow = parseGraphSourceRow();
    const graph = buildAuroraVfxDependencyGraph({
      sourceRow,
      phaseSchedule: scheduleFor(sourceRow)
    });

    expect(graph.diagnostics.map((entry) => entry.code)).toContain(
      "VFX_DEPENDENCY_GRAPH_SOURCE_TRACE_REQUIRED"
    );
    expect(graph.cacheKeyParts.runtimeSettingsRevision).toBeUndefined();
  });
});
