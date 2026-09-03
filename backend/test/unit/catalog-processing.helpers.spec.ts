import {
  addSeed,
  applyCreatureRuntimeAppearanceOverride,
  buildAssetId,
  buildBenchmarkFingerprint,
  buildPlaceableRuntimeProjection,
  buildPlaceableValidationIssues,
  buildCreatureRenderPackage,
  buildCreatureRuntimeProjection,
  buildCreatureValidationIssues,
  buildEncounterRuntimeProjection,
  buildEncounterValidationIssues,
  buildItemRuntimeProjection,
  buildItemValidationIssues,
  buildEmptyPlaceableAssetManifest,
  buildLookupSeeds,
  buildModuleSnapshotIndex,
  buildPlaceableRenderPackage,
  buildRenderContract,
  buildTemplateRenderContract,
  collectPlaceableAssetsFromSnapshot,
  compareAssetRole,
  extractBasename,
  extractExtension,
  extractFileName,
  inferContentTypeForExtension,
  maybeStripBenchmarkMetadata,
  maybeStripTemplateBenchmarkMetadata,
  normalizePlaceableSubtypeHint,
  normalizePrefixForLookup,
  percentile,
  resolvePlaceableClassification,
  roundMetric,
  summarizeDurations
} from "../../src/modules/catalog/application/catalog-processing.helpers";
import { createHash } from "node:crypto";
import type { ModuleBlobSnapshotSummary } from "../../src/modules/runtime-settings/application/ports/module-blob-storage.port";

describe("catalog-processing.helpers", () => {
  it("buildAssetId is deterministic and returns 24 chars", () => {
    const first = buildAssetId("modules/current/a.mdl", "etag1", 10);
    const second = buildAssetId("modules/current/a.mdl", "etag1", 10);
    const different = buildAssetId("modules/current/a.mdl", "etag2", 10);
    const withoutEtag = buildAssetId("modules/current/a.mdl", undefined, 10);
    const explicitEmptyEtag = buildAssetId("modules/current/a.mdl", "", 10);

    expect(first).toHaveLength(24);
    expect(first).toBe(second);
    expect(first).not.toBe(different);
    expect(withoutEtag).toBe(explicitEmptyEtag);
  });

  it("extractFileName normalizes path separators", () => {
    expect(extractFileName("modules/current/models/a.mdl")).toBe("a.mdl");
    expect(extractFileName("modules\\current\\models\\b.dds")).toBe("b.dds");
  });

  it("extractExtension and extractBasename handle edge cases", () => {
    expect(extractExtension("a.mdl")).toBe("mdl");
    expect(extractExtension("A.TGA")).toBe("tga");
    expect(extractExtension("  FILE.DDS  ")).toBe("dds");
    expect(extractExtension(".hidden")).toBe("");
    expect(extractExtension("noext")).toBe("");
    expect(extractExtension("noext.")).toBe("");

    expect(extractBasename("a.mdl")).toBe("a");
    expect(extractBasename("A.TGA")).toBe("a");
    expect(extractBasename("  FILE.DDS  ")).toBe("file");
    expect(extractBasename(".hidden")).toBe(".hidden");
    expect(extractBasename("noext")).toBe("noext");
  });

  it("inferContentTypeForExtension maps known extensions", () => {
    expect(inferContentTypeForExtension("glb")).toBe("model/gltf-binary");
    expect(inferContentTypeForExtension("gltf")).toBe("model/gltf+json");
    expect(inferContentTypeForExtension("dds")).toBe("image/vnd-ms.dds");
    expect(inferContentTypeForExtension("tga")).toBe("image/x-tga");
    expect(inferContentTypeForExtension("png")).toBe("image/png");
    expect(inferContentTypeForExtension("jpg")).toBe("image/jpeg");
    expect(inferContentTypeForExtension("jpeg")).toBe("image/jpeg");
    expect(inferContentTypeForExtension("webp")).toBe("image/webp");
    expect(inferContentTypeForExtension("mdl")).toBe("application/octet-stream");
    expect(inferContentTypeForExtension("unknown")).toBe("application/octet-stream");
  });

  it("compareAssetRole keeps expected order", () => {
    expect(compareAssetRole("model", "texture")).toBeLessThan(0);
    expect(compareAssetRole("metadata", "vfx")).toBeGreaterThan(0);
    expect(compareAssetRole("unknown", "unknown")).toBe(0);
  });

  it("normalizePrefixForLookup trims slashes and keeps trailing slash", () => {
    expect(normalizePrefixForLookup(" modules/current ")).toBe("modules/current/");
    expect(normalizePrefixForLookup("//modules/current")).toBe("modules/current/");
    expect(normalizePrefixForLookup("/modules/current/")).toBe("modules/current/");
    expect(normalizePrefixForLookup("assets////")).toBe("assets/");
    expect(normalizePrefixForLookup("///")).toBe("");
    expect(normalizePrefixForLookup("")).toBe("");
  });

  it("normalizePlaceableSubtypeHint maps aliases and rejects invalid values", () => {
    expect(normalizePlaceableSubtypeHint("vvx")).toBe("vfx");
    expect(normalizePlaceableSubtypeHint("vvxy")).toBe("vfx");
    expect(normalizePlaceableSubtypeHint("vfx")).toBe("vfx");
    expect(normalizePlaceableSubtypeHint("generic")).toBe("generic");
    expect(normalizePlaceableSubtypeHint("door")).toBe("door");
    expect(normalizePlaceableSubtypeHint("container")).toBe("container");
    expect(normalizePlaceableSubtypeHint("light_source")).toBe("light_source");
    expect(normalizePlaceableSubtypeHint(" trigger_proxy ")).toBe("trigger_proxy");
    expect(normalizePlaceableSubtypeHint("corpse")).toBeNull();
    expect(normalizePlaceableSubtypeHint("bad")).toBeNull();
    expect(normalizePlaceableSubtypeHint(undefined)).toBeNull();
  });

  it("resolvePlaceableClassification prefers template subtype and exposes mismatch", () => {
    const same = resolvePlaceableClassification("door", "door");
    const mismatch = resolvePlaceableClassification("door", "vvx");
    const fromHint = resolvePlaceableClassification(undefined, "vvxy");
    const fallback = resolvePlaceableClassification(undefined, "invalid");

    expect(same).toMatchObject({
      source: "template",
      normalizedSubtype: "door",
      mismatchWithTemplate: false
    });
    expect(mismatch).toMatchObject({
      source: "template",
      normalizedSubtype: "door",
      mismatchWithTemplate: true
    });
    expect(fromHint).toMatchObject({
      source: "hint",
      normalizedSubtype: "vfx",
      mismatchWithTemplate: false
    });
    expect(fallback.normalizedSubtype).toBe("generic");
  });

  it("buildRenderContract returns subtype-specific presets", () => {
    expect(buildRenderContract("door")).toMatchObject({
      frontendType: "door",
      rendererPreset: "door-standard",
      isDoor: true,
      isVfx: false
    });
    expect(buildRenderContract("vfx")).toMatchObject({
      frontendType: "vfx",
      rendererPreset: "vfx-emitter",
      isDoor: false,
      isVfx: true
    });
    expect(buildRenderContract("container")).toMatchObject({
      frontendType: "placeable",
      rendererPreset: "placeable-container",
      isDoor: false,
      isVfx: false
    });
    expect(buildRenderContract("light_source")).toMatchObject({
      rendererPreset: "placeable-light",
      isDoor: false,
      isVfx: false
    });
    expect(buildRenderContract("trigger_proxy")).toMatchObject({
      rendererPreset: "placeable-trigger-proxy",
      isDoor: false,
      isVfx: false
    });
    expect(buildRenderContract("generic")).toMatchObject({
      rendererPreset: "placeable-generic",
      isDoor: false,
      isVfx: false
    });
  });

  it("strips benchmark metadata only when requested", () => {
    const placeable = {
      templateId: "plc_1",
      resref: "plc_1",
      name: "Placeable",
      category: "test",
      placeableSubtype: "generic" as const,
      render: buildRenderContract("generic"),
      benchmarkCandidate: true,
      benchmarkBucket: "bucket",
      metadata: {},
      classification: {
        source: "hint" as const,
        normalizedSubtype: "generic" as const,
        mismatchWithTemplate: false
      },
      assetManifest: buildEmptyPlaceableAssetManifest(),
      processedAt: "2026-05-25T00:00:00.000Z"
    };

    expect(maybeStripBenchmarkMetadata(placeable, true)).toBe(placeable);
    expect(maybeStripBenchmarkMetadata(placeable, false)).toMatchObject({
      benchmarkBucket: undefined
    });

    const withoutBucket = {
      ...placeable,
      benchmarkBucket: undefined
    };
    expect(maybeStripBenchmarkMetadata(withoutBucket, false)).toBe(withoutBucket);
  });

  it("strips template benchmark metadata only when requested", () => {
    const template = {
      templateId: "cre_1",
      kind: "creature" as const,
      resref: "cre_1",
      name: "Creature",
      category: "test",
      benchmarkCandidate: true,
      benchmarkBucket: "bucket",
      metadata: {},
      render: buildTemplateRenderContract("creature"),
      processedAt: "2026-05-25T00:00:00.000Z"
    };

    expect(maybeStripTemplateBenchmarkMetadata(template, true)).toBe(template);
    expect(maybeStripTemplateBenchmarkMetadata(template, false)).toMatchObject({
      benchmarkBucket: undefined
    });

    const withoutBucket = {
      ...template,
      benchmarkBucket: undefined
    };
    expect(maybeStripTemplateBenchmarkMetadata(withoutBucket, false)).toBe(withoutBucket);
  });

  it("buildTemplateRenderContract maps creature, item and encounter", () => {
    expect(buildTemplateRenderContract("creature")).toMatchObject({
      backendType: "creature",
      frontendType: "creature",
      rendererPreset: "creature-standard"
    });
    expect(buildTemplateRenderContract("item")).toMatchObject({
      backendType: "item",
      frontendType: "item",
      rendererPreset: "item-standard"
    });
    expect(buildTemplateRenderContract("encounter")).toMatchObject({
      backendType: "encounter",
      frontendType: "encounter",
      rendererPreset: "encounter-standard"
    });
  });

  it("buildCreatureRenderPackage reports missing profile before renderer assembly", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17
    });

    const renderPackage = buildCreatureRenderPackage(runtime);

    expect(renderPackage.status).toBe("missing_profile");
    expect(renderPackage.rendererPreset).toBe("creature-standard");
    expect(renderPackage.appearanceProfile).toBeUndefined();
    expect(renderPackage.sourceModelCandidates).toEqual([]);
    expect(renderPackage.skeletonModelCandidates).toEqual([]);
    expect(renderPackage.partModelCandidates).toEqual([]);
    expect(renderPackage.equipmentModelCandidates).toEqual([]);
    expect(renderPackage.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "CREATURE_RENDER_PROFILE_MISSING"
    );
  });

  it("buildCreatureRenderPackage preserves source-backed profile for future skinned renderer", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17,
      appearanceLabel: "Guard_Human",
      appearanceLabelSource2daRow: 17,
      appearanceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
      appearanceModelType: "P",
      appearanceRaceModel: "Human",
      appearanceDefaultPhenotype: "2",
      appearanceBloodColor: "R",
      appearanceWeaponScale: 0.65,
      appearanceSizeCategory: 4,
      appearanceSizeCategoryLabel: "Large",
      appearanceSizeCategorySource2daRow: 4,
      appearanceSizeCategorySourceKey: "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da",
      phenotype: 2,
      phenotypeLabel: "Large",
      raceAppearanceId: 17,
      bodyPartTorso: 2,
      colorSkin: 8
    });

    const renderPackage = buildCreatureRenderPackage(runtime);

    expect(renderPackage.status).toBe("missing_derived");
    expect(renderPackage.appearanceProfile).toMatchObject({
      appearanceType: 17,
      appearanceLabel: "Guard_Human",
      modelType: "P",
      raceModel: "Human",
      phenotype: 2,
      phenotypeLabel: "Large",
      defaultPhenotype: "2",
      raceAppearanceId: 17,
      bloodColor: "R",
      weaponScale: 0.65,
      sizeCategory: 4,
      sizeCategoryLabel: "Large",
      sizeCategorySource2daRow: 4
    });
    expect(renderPackage.bodyParts.torso).toBe(2);
    expect(renderPackage.colors.skin).toBe(8);
    expect(renderPackage.materialPipelineEvidence).toEqual({
      source: "decompiled-aurora",
      pltVertexShaderName: "vs_pltgen",
      pltFragmentShaderName: "fs_pltgen",
      pltSchemeUniformPattern: "PLTscheme[%d]",
      pltSchemeUniformCount: 15,
      pltReplacementUniformName: "pltreplacement",
      skinPaletteResRef: "pal_skin01"
    });
    expect(renderPackage.skeletonPipelineEvidence).toEqual({
      source: "decompiled-aurora",
      supermodelCommandName: "setsupermodel",
      animationScaleCommandName: "setanimationscale",
      skinnedMeshNodeType: "skinmesh",
      requiresComposedSkeleton: true
    });
    expect(renderPackage.sourceModelCandidates).toEqual([
      {
        resref: "Human",
        role: "appearance-race-model",
        source: "appearance.2da.RACE",
        confidence: "assembly-prefix"
      }
    ]);
    expect(renderPackage.partModelCandidates).toEqual([
      {
        slot: "torso",
        partId: 2,
        partModelName: "chest",
        nodeName: "torso_g",
        modelPrefix: "pmh2_",
        modelResRef: "pmh2_chest002",
        modelResRefPattern: "aurora-player-body-part",
        modelResRefPatternFormat: "p%c%c%s_%s_%03d",
        source: "capart.2da.MDLNAME",
        source2daRow: 7,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      }
    ]);
    expect(renderPackage.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "CREATURE_RENDER_SOURCE_MODEL_CANDIDATE_READY",
        "CREATURE_RENDER_SKINNED_GLB_MISSING",
        "CREATURE_RENDER_CAPART_PART_MODELS_READY",
        "CREATURE_RENDER_BASE_SKELETON_CANDIDATE_READY",
        "CREATURE_RENDER_MATERIAL_TINT_BRIDGE_READY",
        "CREATURE_RENDER_RETAIL_PLT_SHADER_PENDING"
      ])
    );
  });

  it("buildCreatureRenderPackage preserves source-backed CAPart body-part candidates", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17,
      appearanceLabel: "Guard_Human",
      appearanceLabelSource2daRow: 17,
      appearanceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
      appearanceModelType: "P",
      appearanceRaceModel: "H",
      phenotype: 2,
      gender: 1,
      genderLabel: "Female",
      wingsNew: 4,
      tailNew: 5,
      bodyPartRFoot: 4,
      partModelCandidates: JSON.stringify([
        {
          slot: "head",
          partId: 22,
          partModelName: "head",
          modelPrefix: "pfh2_",
          modelResRef: "pfh2_head022",
          modelResRefPattern: "aurora-player-body-part",
          modelResRefPatternFormat: "p%c%c%s_%s_%03d",
          source: "utc.Appearance_Head",
          sourceKey: "modules/current/blueprints/creatures/cre_guard.utc"
        },
        {
          slot: "rFoot",
          partId: 4,
          partModelName: "rfoot",
          nodeName: "rfoot_g",
          modelPrefix: "pfh2_",
          modelResRef: "pfh2_rfoot004",
          modelResRefPattern: "aurora-player-body-part",
          modelResRefPatternFormat: "p%c%c%s_%s_%03d",
          source: "capart.2da.MDLNAME",
          source2daRow: 0,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
        },
        {
          slot: "wings",
          partId: 4,
          partModelName: "Guard_Wings",
          modelResRef: "wing_guard04",
          source: "wingmodel.2da.MODEL",
          source2daRow: 4,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da"
        },
        {
          slot: "tail",
          partId: 5,
          partModelName: "Guard_Tail",
          modelResRef: "tail_guard05",
          source: "tailmodel.2da.MODEL",
          source2daRow: 5,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da"
        }
      ])
    });

    const renderPackage = buildCreatureRenderPackage(runtime);

    expect(runtime.partModelCandidates).toEqual([
      {
        slot: "head",
        partId: 22,
        partModelName: "head",
        modelPrefix: "pfh2_",
        modelResRef: "pfh2_head022",
        modelResRefPattern: "aurora-player-body-part",
        modelResRefPatternFormat: "p%c%c%s_%s_%03d",
        source: "utc.Appearance_Head",
        sourceKey: "modules/current/blueprints/creatures/cre_guard.utc"
      },
      {
        slot: "rFoot",
        partId: 4,
        partModelName: "rfoot",
        nodeName: "rfoot_g",
        modelPrefix: "pfh2_",
        modelResRef: "pfh2_rfoot004",
        modelResRefPattern: "aurora-player-body-part",
        modelResRefPatternFormat: "p%c%c%s_%s_%03d",
        source: "capart.2da.MDLNAME",
        source2daRow: 0,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      },
      {
        slot: "wings",
        partId: 4,
        partModelName: "Guard_Wings",
        modelResRef: "wing_guard04",
        source: "wingmodel.2da.MODEL",
        source2daRow: 4,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da"
      },
      {
        slot: "tail",
        partId: 5,
        partModelName: "Guard_Tail",
        modelResRef: "tail_guard05",
        source: "tailmodel.2da.MODEL",
        source2daRow: 5,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da"
      }
    ]);
    expect(renderPackage.partModelCandidates).toEqual(runtime.partModelCandidates);
    expect(renderPackage.skeletonModelCandidates).toEqual([
      {
        resref: "pfh2",
        role: "base-skeleton",
        source: "part-model-prefix",
        modelPrefix: "pfh2_",
        confidence: "prefix-derived"
      }
    ]);
    expect(renderPackage.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "CREATURE_RENDER_CAPART_PART_MODELS_READY",
        "CREATURE_RENDER_BASE_SKELETON_CANDIDATE_READY",
        "CREATURE_RENDER_SKINNED_GLB_MISSING"
      ])
    );
    expect(renderPackage.diagnostics.map((diagnostic) => diagnostic.code)).not.toContain(
      "CREATURE_RENDER_PART_BASED_ASSEMBLY_PENDING"
    );
  });

  it("buildCreatureRenderPackage synthesizes CAPart body candidates from runtime body parts", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "npc_bimber2",
      appearanceId: 6,
      appearanceLabel: "Human",
      appearanceLabelSource2daRow: 6,
      appearanceModelType: "P",
      appearanceRaceModel: "H",
      phenotype: 9,
      gender: 0,
      genderLabel: "Male",
      appearanceHead: 148,
      bodyPartRFoot: 1,
      bodyPartLFoot: 1,
      bodyPartTorso: 1,
      bodyPartNeck: 1,
      bodyPartRHand: 1,
      bodyPartLHand: 1,
      partModelCandidates: JSON.stringify([
        {
          slot: "head",
          partId: 148,
          partModelName: "head",
          modelPrefix: "pmh9_",
          modelResRef: "pmh9_head148",
          modelResRefPattern: "aurora-player-body-part",
          modelResRefPatternFormat: "p%c%c%s_%s_%03d",
          source: "utc.Appearance_Head",
          sourceKey: "modules/current/blueprints/creatures/npc_bimber2.utc"
        }
      ])
    });

    const renderPackage = buildCreatureRenderPackage(runtime);

    expect(
      renderPackage.partModelCandidates.map((candidate) => ({
        slot: candidate.slot,
        partId: candidate.partId,
        partModelName: candidate.partModelName,
        nodeName: candidate.nodeName,
        modelPrefix: candidate.modelPrefix,
        modelResRef: candidate.modelResRef,
        source: candidate.source,
        source2daRow: candidate.source2daRow,
        sourceKey: candidate.sourceKey
      }))
    ).toEqual([
      {
        slot: "head",
        partId: 148,
        partModelName: "head",
        nodeName: undefined,
        modelPrefix: "pmh9_",
        modelResRef: "pmh9_head148",
        source: "utc.Appearance_Head",
        source2daRow: undefined,
        sourceKey: "modules/current/blueprints/creatures/npc_bimber2.utc"
      },
      {
        slot: "rFoot",
        partId: 1,
        partModelName: "footr",
        nodeName: "rfoot_g",
        modelPrefix: "pmh9_",
        modelResRef: "pmh9_footr001",
        source: "capart.2da.MDLNAME",
        source2daRow: 0,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      },
      {
        slot: "lFoot",
        partId: 1,
        partModelName: "footl",
        nodeName: "lfoot_g",
        modelPrefix: "pmh9_",
        modelResRef: "pmh9_footl001",
        source: "capart.2da.MDLNAME",
        source2daRow: 1,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      },
      {
        slot: "torso",
        partId: 1,
        partModelName: "chest",
        nodeName: "torso_g",
        modelPrefix: "pmh9_",
        modelResRef: "pmh9_chest001",
        source: "capart.2da.MDLNAME",
        source2daRow: 7,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      },
      {
        slot: "neck",
        partId: 1,
        partModelName: "neck",
        nodeName: "neck_g",
        modelPrefix: "pmh9_",
        modelResRef: "pmh9_neck001",
        source: "capart.2da.MDLNAME",
        source2daRow: 9,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      },
      {
        slot: "rHand",
        partId: 1,
        partModelName: "handr",
        nodeName: "rhand_g",
        modelPrefix: "pmh9_",
        modelResRef: "pmh9_handr001",
        source: "capart.2da.MDLNAME",
        source2daRow: 16,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      },
      {
        slot: "lHand",
        partId: 1,
        partModelName: "handl",
        nodeName: "lhand_g",
        modelPrefix: "pmh9_",
        modelResRef: "pmh9_handl001",
        source: "capart.2da.MDLNAME",
        source2daRow: 17,
        sourceKey: "modules/current/__aurora/sources/hak/lc_2da/capart.2da"
      }
    ]);
    expect(renderPackage.skeletonModelCandidates).toEqual([
      {
        resref: "pmh9",
        role: "base-skeleton",
        source: "part-model-prefix",
        modelPrefix: "pmh9_",
        confidence: "prefix-derived"
      }
    ]);
    expect(renderPackage.diagnostics.map((diagnostic) => diagnostic.code)).toEqual(
      expect.arrayContaining([
        "CREATURE_RENDER_CAPART_PART_MODELS_READY",
        "CREATURE_RENDER_BASE_SKELETON_CANDIDATE_READY"
      ])
    );
  });

  it("applies creature appearance overrides to part-based runtime candidates", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "nw_hen_dae_01",
      sourceModelResRef: "nw_hen_dae_01",
      appearanceId: 18,
      appearanceLabel: "Half-Orc",
      appearanceLabelSource2daRow: 18,
      appearanceModelType: "P",
      appearanceRaceModel: "O",
      phenotype: 0,
      gender: 0,
      genderLabel: "Male",
      appearanceHead: 4,
      bodyPartTorso: 1,
      bodyPartRFoot: 1,
      colorSkin: 41,
      colorHair: 1,
      partModelCandidates: JSON.stringify([
        {
          slot: "head",
          partId: 4,
          partModelName: "head",
          modelPrefix: "pmo0_",
          modelResRef: "pmo0_head004",
          modelResRefPattern: "aurora-player-body-part",
          modelResRefPatternFormat: "p%c%c%s_%s_%03d",
          source: "utc.Appearance_Head",
          sourceKey: "modules/current/blueprints/creatures/nw_hen_dae_01.utc"
        }
      ])
    });

    const overridden = applyCreatureRuntimeAppearanceOverride(runtime, {
      appearanceHead: 12,
      bodyParts: {
        torso: 2,
        rFoot: 3
      },
      colors: {
        skin: 30,
        hair: 53
      }
    });
    const renderPackage = buildCreatureRenderPackage(overridden);

    expect(overridden.appearance.appearanceHead).toBe(12);
    expect(overridden.bodyParts.torso).toBe(2);
    expect(overridden.colors.skin).toBe(30);
    expect(overridden.colors.hair).toBe(53);
    expect(
      renderPackage.partModelCandidates.map((candidate) => ({
        slot: candidate.slot,
        partId: candidate.partId,
        modelResRef: candidate.modelResRef
      }))
    ).toEqual(
      expect.arrayContaining([
        { slot: "head", partId: 12, modelResRef: "pmo0_head012" },
        { slot: "torso", partId: 2, modelResRef: "pmo0_chest002" },
        { slot: "rFoot", partId: 3, modelResRef: "pmo0_footr003" }
      ])
    );
    expect(
      renderPackage.partModelCandidates.map((candidate) => candidate.modelResRef)
    ).not.toContain("pmo0_head004");
  });

  it("rebuilds part-model candidates for an admitted Creature Phenotype override", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "nw_hen_dae_01",
      appearanceId: 18,
      appearanceModelType: "P",
      appearanceRaceModel: "O",
      phenotype: 0,
      gender: 0,
      appearanceHead: 4,
      bodyPartTorso: 1
    });

    const overridden = applyCreatureRuntimeAppearanceOverride(runtime, { phenotype: 5 });
    const renderPackage = buildCreatureRenderPackage(overridden);

    expect(overridden.identity.phenotype).toBe(5);
    expect(renderPackage.partModelCandidates.map((candidate) => candidate.modelResRef)).toEqual(
      expect.arrayContaining(["pmo5_head004", "pmo5_chest001"])
    );
    expect(renderPackage.partModelCandidates.map((candidate) => candidate.modelResRef))
      .not.toContain("pmo0_head004");
  });

  it("buildCreatureRenderPackage exposes source-backed equipment attachment candidates", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17,
      appearanceLabel: "Guard_Human",
      appearanceLabelSource2daRow: 17,
      appearanceModelType: "P",
      appearanceRaceModel: "Human",
      equipItemListEntries: JSON.stringify([
        {
          resRef: "nw_wswmls001",
          itemTemplateId: "itm_nw_wswmls001",
          itemSourceObjectKey: "modules/current/blueprints/items/nw_wswmls001.uti",
          itemTemplateMetadata: {
            templateResRef: "nw_wswmls001",
            localizedName: "Longsword",
            baseItem: 6,
            baseItemModelType: "wsw",
            baseItem2daSourceKey: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
            modelPart1: 2,
            modelPart2: 1,
            modelPart3: 3,
            itemPropertyListEntries: JSON.stringify([
              {
                propertyName: 44,
                propertyLabel: "Light",
                costValue: 4,
                costTableDefinition: "iprp_lightcost",
                param1Value: 3,
                param1Table: "iprp_color",
                propertyDefinitionSource2daRow: 44,
                propertyDefinitionSourceKey:
                  "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da"
              }
            ])
          },
          slotMask: 0x10
        },
        {
          resRef: "cre_hide_001",
          itemTemplateMetadata: {
            templateResRef: "cre_hide_001",
            displayName: "Creature Hide",
            baseItem: 77,
            baseItemModelType: "it_cr_item",
            modelPart1: 1
          },
          slotMask: 0x20000
        }
      ])
    });

    const renderPackage = buildCreatureRenderPackage(runtime);

    expect(renderPackage.equipmentModelCandidates).toEqual([
      {
        resref: "nw_wswmls001",
        itemTemplateId: "itm_nw_wswmls001",
        itemSourceObjectKey: "modules/current/blueprints/items/nw_wswmls001.uti",
        slotMask: 0x10,
        slotLabels: ["right hand"],
        attachmentTargets: ["rhand_g"],
        primaryAttachmentTarget: "rhand_g",
        baseItem: 6,
        itemName: "Longsword",
        itemModelType: "wsw",
        itemModelParts: [2, 1, 3],
        itemModelPartRoles: ["blade", "middle", "top"],
        itemModelPartResRefs: ["wswb_002", "wswm_001", "wswt_003"],
        itemModelPartCandidates: [
          {
            resref: "wswb_002",
            role: "blade",
            partId: 2
          },
          {
            resref: "wswm_001",
            role: "middle",
            partId: 1
          },
          {
            resref: "wswt_003",
            role: "top",
            partId: 3
          }
        ],
        itemModelPartSourceKey: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
        itemProperties: [
          {
            propertyName: 44,
            propertyLabel: "Light",
            costValue: 4,
            costTableDefinition: "iprp_lightcost",
            param1Value: 3,
            param1Table: "iprp_color",
            propertyDefinitionSource2daRow: 44,
            propertyDefinitionSourceKey:
              "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da"
          }
        ],
        source: "utc.Equip_ItemList",
        sourceModelStatus: "model-resrefs-ready"
      },
      {
        resref: "cre_hide_001",
        slotMask: 0x20000,
        slotLabels: ["creature armor"],
        attachmentTargets: ["torso_g"],
        primaryAttachmentTarget: "torso_g",
        baseItem: 77,
        itemName: "Creature Hide",
        itemModelType: "it_cr_item",
        source: "utc.Equip_ItemList",
        sourceModelStatus: "metadata-only"
      }
    ]);
    expect(renderPackage.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "CREATURE_RENDER_EQUIPMENT_CANDIDATES_READY"
    );
  });

  it("buildCreatureRenderPackage anchors Aurora crossbows on the right-hand capart node", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_crossbow_guard",
      appearanceId: 6,
      appearanceLabel: "(Dynamic) Human",
      appearanceModelType: "P",
      appearanceRaceModel: "H",
      phenotype: 0,
      gender: 0,
      equipItemListEntries: JSON.stringify([
        {
          resRef: "nw_wbwxl001",
          itemTemplateMetadata: {
            templateResRef: "nw_wbwxl001",
            displayName: "Light Crossbow",
            baseItem: 7,
            baseItemModelType: "wbwxl",
            baseItemEquipableSlots: "0x00030",
            baseItemWeaponWield: 6,
            baseItemWeaponType: 1,
            baseItemWeaponSize: 2,
            baseItemRangedWeapon: 25,
            baseItemRotateOnGround: 2,
            baseItemAmmunitionType: 2,
            modelPart1: 11,
            modelPartResRef1: "wbwxl_b_011",
            modelPartResRefRole1: "blade"
          },
          slotMask: 0x10
        }
      ])
    });

    const renderPackage = buildCreatureRenderPackage(runtime);

    expect(renderPackage.equipmentModelCandidates).toEqual([
      {
        resref: "nw_wbwxl001",
        slotMask: 0x10,
        slotLabels: ["right hand"],
        attachmentTargets: ["rhand_g"],
        primaryAttachmentTarget: "rhand_g",
        baseItem: 7,
        baseItemEquipableSlots: "0x00030",
        weaponWield: 6,
        weaponType: 1,
        weaponSize: 2,
        rangedWeapon: 25,
        rotateOnGround: 2,
        ammunitionType: 2,
        itemName: "Light Crossbow",
        itemModelType: "wbwxl",
        itemModelParts: [11],
        itemModelPartRoles: ["blade"],
        itemModelPartResRefs: ["wbwxl_b_011"],
        itemModelPartCandidates: [
          {
            resref: "wbwxl_b_011",
            role: "blade",
            partId: 11
          }
        ],
        source: "utc.Equip_ItemList",
        sourceModelStatus: "model-resrefs-ready"
      }
    ]);
  });

  it("buildCreatureRenderPackage applies equipped armor body-part overrides", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_auctioneer",
      appearanceId: 6,
      appearanceLabel: "(Dynamic) Human",
      appearanceLabelSource2daRow: 6,
      appearanceModelType: "P",
      appearanceRaceModel: "H",
      phenotype: 0,
      gender: 0,
      genderLabel: "Male",
      bodyPartTorso: 1,
      bodyPartPelvis: 1,
      bodyPartRFoot: 1,
      equipItemListEntries: JSON.stringify([
        {
          resRef: "nw_aarcl002",
          itemTemplateMetadata: {
            templateResRef: "nw_aarcl002",
            baseItem: 16,
            baseItemModelType: "AArCl"
          },
          slotMask: 0x2
        }
      ])
    });

    const renderPackage = buildCreatureRenderPackage(runtime);
    const partBySlot = new Map(
      renderPackage.partModelCandidates.map((candidate) => [candidate.slot, candidate])
    );

    expect(partBySlot.get("torso")).toMatchObject({
      partId: 2,
      modelPrefix: "pmh0_",
      modelResRef: "pmh0_chest002",
      source: "capart.2da.MDLNAME",
      sourceKey:
        "creature-equipment-armor-part:nw_aarcl002:resref-fallback:torso"
    });
    expect(partBySlot.get("pelvis")).toMatchObject({
      partId: 2,
      modelResRef: "pmh0_pelvis002"
    });
    expect(partBySlot.get("rFoot")).toMatchObject({
      partId: 2,
      modelResRef: "pmh0_footr002"
    });
    expect(
      renderPackage.partModelCandidates.map((candidate) => candidate.modelResRef)
    ).not.toEqual(expect.arrayContaining(["pmh0_chest001", "pmh0_pelvis001"]));
    expect(renderPackage.diagnostics.map((diagnostic) => diagnostic.code)).toContain(
      "CREATURE_RENDER_EQUIPPED_ARMOR_PART_OVERRIDES_READY"
    );
  });

  it("buildCreatureRenderPackage prefers explicit equipped ArmorPart fields", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 6,
      appearanceLabel: "(Dynamic) Human",
      appearanceLabelSource2daRow: 6,
      appearanceModelType: "P",
      appearanceRaceModel: "H",
      phenotype: 0,
      gender: 0,
      genderLabel: "Male",
      bodyPartTorso: 1,
      bodyPartRFoot: 1,
      equipItemListEntries: JSON.stringify([
        {
          resRef: "custom_armor",
          itemTemplateMetadata: {
            templateResRef: "custom_armor",
            baseItem: 16,
            baseItemModelType: "AArCl",
            bodyPartTorso: 20,
            bodyPartRFoot: 4,
            leather1Color: 12,
            leather2Color: 13,
            cloth1Color: 14,
            cloth2Color: 15,
            metal1Color: 16,
            metal2Color: 17
          },
          slotMask: 0x2
        }
      ])
    });

    const renderPackage = buildCreatureRenderPackage(runtime);
    const partBySlot = new Map(
      renderPackage.partModelCandidates.map((candidate) => [candidate.slot, candidate])
    );

    expect(partBySlot.get("torso")).toMatchObject({
      partId: 20,
      modelResRef: "pmh0_chest020",
      sourceKey: "creature-equipment-armor-part:custom_armor:ArmorPart:torso",
      materialColors: {
        leather1: 12,
        leather2: 13,
        cloth1: 14,
        cloth2: 15,
        metal1: 16,
        metal2: 17
      }
    });
    expect(partBySlot.get("rFoot")).toMatchObject({
      partId: 4,
      modelResRef: "pmh0_footr004",
      sourceKey: "creature-equipment-armor-part:custom_armor:ArmorPart:rFoot"
    });
  });

  it("buildCreatureRenderPackage filters body parts hidden by equipped robe masks", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_robe",
      appearanceId: 6,
      appearanceLabel: "(Dynamic) Human",
      appearanceLabelSource2daRow: 6,
      appearanceModelType: "P",
      appearanceRaceModel: "H",
      phenotype: 0,
      gender: 0,
      genderLabel: "Male",
      bodyPartRFoot: 1,
      bodyPartRShin: 1,
      bodyPartRThigh: 1,
      bodyPartPelvis: 1,
      bodyPartTorso: 1,
      bodyPartBelt: 1,
      equipItemListEntries: JSON.stringify([
        {
          resRef: "custom_robe",
          itemTemplateMetadata: {
            templateResRef: "custom_robe",
            baseItem: 16,
            baseItemModelType: "AArCl",
            bodyPartRFoot: 4,
            bodyPartRShin: 13,
            bodyPartRThigh: 3,
            bodyPartPelvis: 8,
            bodyPartTorso: 43,
            bodyPartBelt: 5,
            bodyPartRobe: 5,
            armorRobeHiddenSlots: "rShin|rThigh|pelvis|torso|belt"
          },
          slotMask: 0x2
        }
      ])
    });

    const renderPackage = buildCreatureRenderPackage(runtime);
    const partBySlot = new Map(
      renderPackage.partModelCandidates.map((candidate) => [candidate.slot, candidate])
    );

    expect(Array.from(partBySlot.keys())).toEqual(["rFoot", "robe"]);
    expect(partBySlot.get("rFoot")).toMatchObject({
      partId: 4,
      modelResRef: "pmh0_footr004"
    });
    expect(partBySlot.get("robe")).toMatchObject({
      partId: 5,
      modelResRef: "pmh0_robe005",
      nodeName: "root",
      sourceKey: "creature-equipment-armor-part:custom_robe:ArmorPart:robe"
    });
  });

  it("buildCreatureRenderPackage exposes equipped shield model parts from left hand", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17,
      appearanceLabel: "Guard_Human",
      appearanceLabelSource2daRow: 17,
      appearanceModelType: "P",
      appearanceRaceModel: "Human",
      equipItemListEntries: JSON.stringify([
        {
          resRef: "wnd_hiena_hood",
          itemTemplateMetadata: {
            templateResRef: "wnd_hiena_hood",
            localizedName: "Hyena Hood",
            baseItem: 75,
            baseItemModelType: "helm",
            modelPart1: 33
          },
          slotMask: 0x1
        },
        {
          resRef: "wnd_rene_tshield",
          itemTemplateMetadata: {
            templateResRef: "wnd_rene_tshield",
            localizedName: "Tower Shield",
            baseItem: 14,
            baseItemModelType: "ashto",
            baseItemWeaponWield: 7,
            modelPart1: 95
          },
          slotMask: 0x20
        },
        {
          resRef: "nw_it_torch001",
          itemTemplateMetadata: {
            templateResRef: "nw_it_torch001",
            localizedName: "Torch",
            baseItem: 15,
            baseItemModelType: "it_torch",
            modelPart1: 0
          },
          slotMask: 0x20
        }
      ])
    });

    const renderPackage = buildCreatureRenderPackage(runtime);

    expect(renderPackage.equipmentModelCandidates).toEqual([
      expect.objectContaining({
        resref: "wnd_hiena_hood",
        slotLabels: ["head"],
        itemModelType: "helm",
        sourceModelStatus: "metadata-only"
      }),
      expect.objectContaining({
        resref: "wnd_rene_tshield",
        slotLabels: ["left hand"],
        attachmentTargets: ["lhand_g"],
        primaryAttachmentTarget: "lhand_g",
        itemModelType: "ashto",
        weaponWield: 7,
        sourceModelStatus: "model-resrefs-ready",
        itemModelPartCandidates: [
          expect.objectContaining({
            partId: 95,
            resref: "ashto_095"
          })
        ]
      }),
      expect.objectContaining({
        resref: "nw_it_torch001",
        slotLabels: ["left hand"],
        itemModelType: "it_torch",
        sourceModelStatus: "metadata-only"
      })
    ]);
    expect(
      renderPackage.equipmentModelCandidates
        .filter((candidate) => candidate.resref !== "wnd_rene_tshield")
        .flatMap((candidate) => candidate.itemModelPartCandidates ?? [])
    ).toEqual([]);
  });

  it("buildCreatureRenderPackage marks non-part race models as direct source candidates", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_bear_001",
      appearanceId: 23,
      appearanceLabel: "Bear",
      appearanceLabelSource2daRow: 23,
      appearanceModelType: "S",
      appearanceRaceModel: "n_bear"
    });

    const renderPackage = buildCreatureRenderPackage(runtime);

    expect(renderPackage.sourceModelCandidates).toEqual([
      {
        resref: "n_bear",
        role: "appearance-race-model",
        source: "appearance.2da.RACE",
        confidence: "direct-model"
      }
    ]);
  });

  it("buildPlaceableRuntimeProjection maps Aurora placeable runtime fields", () => {
    const runtime = buildPlaceableRuntimeProjection({
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 44,
      templateResRef: "plc_city_gate",
      tag: "city_gate_main",
      conversation: "conv_gate",
      keyName: "city_gate_key",
      useable: true,
      hasInventory: 1,
      bodyBag: "0",
      isStatic: false,
      autoRemoveKey: "1",
      interruptable: "false",
      factionId: 3,
      keyRequired: true,
      lockable: true,
      locked: true,
      closeLockDc: 22,
      openLockDc: 24,
      invulnerable: false,
      trapDetectable: "1",
      trapDetectDc: 12,
      trapDisarmable: true,
      disarmDc: 16,
      trapFlag: false,
      trapOneShot: false,
      trapType: 7,
      appearanceId: 104,
      animationState: 2,
      portraitId: 9,
      portraitResRef: "po_gate",
      currentHitPoints: 50,
      hardness: 5,
      lightState: 1,
      "script.onused": "plc_gate_onused",
      "script.onopen": "plc_gate_onopen"
    });

    expect(runtime.source).toMatchObject({
      fileType: "UTP",
      fileVersion: "V3.2",
      structTypeId: 44
    });
    expect(runtime.identity).toMatchObject({
      templateResRef: "plc_city_gate",
      keyName: "city_gate_key"
    });
    expect(runtime.interaction).toMatchObject({
      useable: true,
      hasInventory: true,
      bodyBag: false,
      autoRemoveKey: true,
      interruptable: false
    });
    expect(runtime.locking).toMatchObject({
      keyRequired: true,
      lockable: true,
      locked: true,
      closeLockDc: 22,
      openLockDc: 24
    });
    expect(runtime.trap).toMatchObject({
      trapDetectable: true,
      trapDisarmable: true,
      trapType: 7
    });
    expect(runtime.state).toMatchObject({
      appearanceType: 104,
      animationState: 2,
      hardness: 5,
      lightState: 1,
      lightStateSource: "utp.LightState",
      lightStateProofStatus: "source-backed-utp-lightstate",
      lightStateDefaulted: false
    });
    expect(runtime.scripts).toMatchObject({
      onused: "plc_gate_onused",
      onopen: "plc_gate_onopen"
    });
  });

  it("buildPlaceableRuntimeProjection records retail-binary default LightState as on", () => {
    const runtime = buildPlaceableRuntimeProjection({
      sourceFileType: "UTP ",
      templateResRef: "plc_missing_lightstate"
    });

    expect(runtime.state).toMatchObject({
      lightState: 1,
      lightStateSource:
        "C:/Program Files (x86)/Steam/steamapps/common/Neverwinter Nights/bin/win32/nwserver.exe .pdata function 0x1404484d0..0x14044a2ec contains LightState xref at 0x140448ed0 and mov [rbx+0x368],1 at 0x140448eb5 before the optional LightState read",
      lightStateProofStatus:
        "retail-binary-backed-nwserver-lightstate-default-on-xref",
      lightStateDefaulted: true
    });
  });

  it("buildPlaceableValidationIssues reports missing lock/key/trap/script rules", () => {
    const runtime = buildPlaceableRuntimeProjection({
      templateResRef: "plc_broken",
      useable: true,
      lockable: true,
      keyRequired: true,
      trapFlag: true
    });

    const issues = buildPlaceableValidationIssues(runtime);
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "PLACEABLE_OPEN_LOCK_DC_MISSING",
        "PLACEABLE_CLOSE_LOCK_DC_MISSING",
        "PLACEABLE_KEY_REQUIRED_WITHOUT_KEYNAME",
        "PLACEABLE_TRAP_TYPE_MISSING",
        "PLACEABLE_ONUSED_SCRIPT_MISSING"
      ])
    );
  });

  it("buildCreatureRuntimeProjection maps creature metadata and scripts", () => {
    const runtime = buildCreatureRuntimeProjection({
      sourceEtag: "utc-etag-123",
      sourceFileType: "UTC ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 42,
      modelResRef: "raw_creature_model",
      templateResRef: "cre_guard_human_001",
      firstName: "City",
      firstNameStrRef: 1001,
      lastName: "Guard",
      lastNameStrRef: 1002,
      localizedName: "City Guard Localized",
      localizedNameStrRef: 1003,
      displayName: "City Guard Display",
      description: "Guard stationed at city gate",
      descriptionStrRef: 2001,
      identifiedDescription: "Identified city guard",
      identifiedDescriptionStrRef: 2002,
      comments: "Palette guard comment",
      paletteId: 9,
      tag: "city_guard",
      conversation: "conv_city_guard",
      gender: 1,
      genderLabel: "Female",
      genderLabelSource2daRow: 1,
      genderLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/gender.2da",
      race: 6,
      raceLabel: "Human",
      raceLabelSource2daRow: 6,
      raceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da",
      raceAppearanceId: 17,
      subrace: "veteran",
      subraceStrRef: 3001,
      deity: "Helm",
      deityStrRef: 3002,
      appearanceId: 17,
      appearanceLabel: "Guard_Human",
      appearanceLabelSource2daRow: 17,
      appearanceLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
      appearanceModelType: "P",
      appearanceRaceModel: "Human",
      appearancePortrait2da: "po_hm_guard",
      appearanceEnvMap: "default_env",
      appearanceDefaultPhenotype: "2",
      appearanceBloodColor: "R",
      appearanceWeaponScale: 0.65,
      appearanceSizeCategory: 4,
      appearanceSizeCategoryLabel: "Large",
      appearanceSizeCategorySource2daRow: 4,
      appearanceSizeCategorySourceKey: "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da",
      portraitId: 41,
      portraitIdEffective: 41,
      portraitResolvedResRef: "po_hm_guard",
      portraitResolvedSource2daRow: 41,
      portraitResolvedSourceKey: "modules/current/__aurora/sources/hak/lc_2da/portraits.2da",
      soundSetFile: 55,
      soundSetLabel: "Guard",
      soundSetResRef: "ss_guard",
      soundSetSource2daRow: 55,
      soundSetSourceKey: "modules/current/__aurora/sources/hak/lc_2da/soundset.2da",
      appearanceHead: 44,
      plot: true,
      isPc: true,
      isImmortal: true,
      lootable: true,
      interruptable: false,
      noPermDeath: true,
      bodyBag: true,
      decayTime: 30,
      startingPackage: true,
      walkRate: 4,
      animationState: 2,
      bodyPartRFoot: 1,
      bodyPartLFoot: 2,
      bodyPartRobe: 3,
      colorSkin: 10,
      colorHair: 11,
      colorTattoo1: 12,
      colorTattoo2: 13,
      factionId: 3,
      challengeRating: 6,
      perceptionRange: 9,
      disarmable: false,
      goodEvil: 65,
      lawfulChaotic: 35,
      strength: 16,
      dexterity: 14,
      constitution: 13,
      intelligence: 10,
      wisdom: 12,
      charisma: 8,
      strengthAdjust: 1,
      dexterityAdjust: 2,
      constitutionAdjust: 3,
      intelligenceAdjust: 4,
      wisdomAdjust: 5,
      charismaAdjust: 6,
      classListCount: 2,
      classListEntries: JSON.stringify([
        {
          classId: 1,
          level: 7,
          knownSpellCount: 2,
          memorizedSpellCount: 1,
          knownSpells: [
            {
              spellId: 501,
              spellLabel: "Magic_Missile",
              spellLabelSource2daRow: 501,
              spellLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/spells.2da",
              metaMagic: 2,
              flags: 1
            },
            { spellId: 502, spellLabel: "Shield" }
          ],
          memorizedSpells: [{ spellId: 601, spellLabel: "Cure_Wounds", metaMagic: 4, flags: 3 }]
        }
      ]),
      inventoryItemListCount: 1,
      equipItemListCount: 5,
      featListEntries: JSON.stringify([
        {
          featId: 42,
          featLabel: "Weapon_Focus",
          featLabelSource2daRow: 42,
          featLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/feat.2da"
        }
      ]),
      templateListEntries: JSON.stringify([{ templateId: 77 }]),
      specAbilityListEntries: JSON.stringify([
        {
          spellId: 123,
          spellLabel: "Flame_Weapon",
          spellLabelSource2daRow: 123,
          spellLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/spells.2da",
          flags: 5,
          casterLevel: 12
        }
      ]),
      inventoryItemListEntries: JSON.stringify([
        {
          resRef: "nw_it_mpotion001",
          itemTemplateId: "itm_nw_it_mpotion001",
          itemResref: "nw_it_mpotion001",
          itemSourceFingerprint: "item-fp-potion",
          itemSourceObjectKey: "modules/current/blueprints/items/nw_it_mpotion001.uti",
          x: 3,
          y: 4,
          dropable: true,
          pickpocketable: true
        }
      ]),
      equipItemListEntries: JSON.stringify([
        {
          resRef: "nw_wswmls001",
          itemTemplateId: "itm_nw_wswmls001",
          itemResref: "nw_wswmls001",
          itemSourceFingerprint: "item-fp-sword",
          itemSourceObjectKey: "modules/current/blueprints/items/nw_wswmls001.uti",
          slotMask: 16,
          dropable: true,
          infinite: false
        }
      ]),
      skillListEntries: JSON.stringify([
        {
          skillId: 0,
          skillLabel: "Animal_Empathy",
          skillLabelSource2daRow: 0,
          skillLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/skills.2da",
          rank: 4
        },
        { skillId: 1, skillLabel: "Concentration", rank: 0 }
      ]),
      scriptCount: 2,
      "script.scriptheartbeat": "hb_city_guard",
      "script.scriptonblocked": "block_city_guard"
    });

    expect(runtime.source.etag).toBe("utc-etag-123");
    expect(runtime.source.fileType).toBe("UTC");
    expect(runtime.source.modelResRef).toBe("raw_creature_model");
    expect(runtime.identity.templateResRef).toBe("cre_guard_human_001");
    expect(runtime.identity.firstName).toBe("City");
    expect(runtime.identity.firstNameStrRef).toBe(1001);
    expect(runtime.identity.lastName).toBe("Guard");
    expect(runtime.identity.lastNameStrRef).toBe(1002);
    expect(runtime.identity.localizedName).toBe("City Guard Localized");
    expect(runtime.identity.localizedNameStrRef).toBe(1003);
    expect(runtime.identity.displayName).toBe("City Guard Display");
    expect(runtime.identity.identifiedDescription).toBe("Identified city guard");
    expect(runtime.identity.descriptionStrRef).toBe(2001);
    expect(runtime.identity.identifiedDescriptionStrRef).toBe(2002);
    expect(runtime.identity.comments).toBe("Palette guard comment");
    expect(runtime.identity.paletteId).toBe(9);
    expect(runtime.identity.gender).toBe(1);
    expect(runtime.identity.genderLabel).toBe("Female");
    expect(runtime.identity.genderLabelSource2daRow).toBe(1);
    expect(runtime.identity.genderLabelSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/gender.2da"
    );
    expect(runtime.identity.race).toBe(6);
    expect(runtime.identity.raceLabel).toBe("Human");
    expect(runtime.identity.raceLabelSource2daRow).toBe(6);
    expect(runtime.identity.raceLabelSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/racialtypes.2da"
    );
    expect(runtime.identity.raceAppearanceId).toBe(17);
    expect(runtime.identity.subrace).toBe("veteran");
    expect(runtime.identity.subraceStrRef).toBe(3001);
    expect(runtime.identity.deity).toBe("Helm");
    expect(runtime.identity.deityStrRef).toBe(3002);
    expect(runtime.appearance.appearanceType).toBe(17);
    expect(runtime.appearance.appearanceLabel).toBe("Guard_Human");
    expect(runtime.appearance.appearanceLabelSource2daRow).toBe(17);
    expect(runtime.appearance.appearanceLabelSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/appearance.2da"
    );
    expect(runtime.appearance.appearanceModelType).toBe("P");
    expect(runtime.appearance.appearanceRaceModel).toBe("Human");
    expect(runtime.appearance.appearancePortrait2da).toBe("po_hm_guard");
    expect(runtime.appearance.appearanceEnvMap).toBe("default_env");
    expect(runtime.appearance.appearanceDefaultPhenotype).toBe("2");
    expect(runtime.appearance.appearanceBloodColor).toBe("R");
    expect(runtime.appearance.appearanceWeaponScale).toBe(0.65);
    expect(runtime.appearance.appearanceSizeCategory).toBe(4);
    expect(runtime.appearance.appearanceSizeCategoryLabel).toBe("Large");
    expect(runtime.appearance.appearanceSizeCategorySource2daRow).toBe(4);
    expect(runtime.appearance.appearanceSizeCategorySourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/creaturesize.2da"
    );
    expect(runtime.appearance.portraitId).toBe(41);
    expect(runtime.appearance.portraitIdEffective).toBe(41);
    expect(runtime.appearance.portraitResolvedResRef).toBe("po_hm_guard");
    expect(runtime.appearance.portraitResolvedSource2daRow).toBe(41);
    expect(runtime.appearance.portraitResolvedSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/portraits.2da"
    );
    expect(runtime.appearance.soundSetFile).toBe(55);
    expect(runtime.appearance.soundSetLabel).toBe("Guard");
    expect(runtime.appearance.soundSetResRef).toBe("ss_guard");
    expect(runtime.appearance.soundSetSource2daRow).toBe(55);
    expect(runtime.appearance.soundSetSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/soundset.2da"
    );
    expect(runtime.appearance.appearanceHead).toBe(44);
    expect(runtime.state).toMatchObject({
      plot: true,
      isPc: true,
      isImmortal: true,
      lootable: true,
      interruptable: false,
      noPermDeath: true,
      bodyBag: true,
      decayTime: 30,
      startingPackage: true,
      walkRate: 4,
      animationState: 2
    });
    expect(runtime.bodyParts.rFoot).toBe(1);
    expect(runtime.bodyParts.lFoot).toBe(2);
    expect(runtime.bodyParts.robe).toBe(3);
    expect(runtime.colors.skin).toBe(10);
    expect(runtime.colors.hair).toBe(11);
    expect(runtime.faction.factionId).toBe(3);
    expect(runtime.stats.challengeRating).toBe(6);
    expect(runtime.stats.perceptionRange).toBe(9);
    expect(runtime.combat.disarmable).toBe(false);
    expect(runtime.stats.goodEvil).toBe(65);
    expect(runtime.stats.lawfulChaotic).toBe(35);
    expect(runtime.stats.strength).toBe(16);
    expect(runtime.stats.dexterity).toBe(14);
    expect(runtime.stats.constitution).toBe(13);
    expect(runtime.stats.intelligence).toBe(10);
    expect(runtime.stats.wisdom).toBe(12);
    expect(runtime.stats.charisma).toBe(8);
    expect(runtime.stats.strengthAdjust).toBe(1);
    expect(runtime.stats.dexterityAdjust).toBe(2);
    expect(runtime.stats.constitutionAdjust).toBe(3);
    expect(runtime.stats.intelligenceAdjust).toBe(4);
    expect(runtime.stats.wisdomAdjust).toBe(5);
    expect(runtime.stats.charismaAdjust).toBe(6);
    expect(runtime.effective).toEqual({
      challengeRating: 6,
      factionId: 3,
      goodEvil: 65,
      lawfulChaotic: 35,
      perceptionRange: 9,
      disarmable: false,
      plot: true,
      isPc: true,
      isImmortal: true,
      lootable: true,
      interruptable: false,
      noPermDeath: true,
      bodyBag: true,
      startingPackage: true,
      decayTime: 30,
      walkRate: 4
    });
    expect(runtime.lists.classListCount).toBe(2);
    expect(runtime.lists.inventoryItemListCount).toBe(1);
    expect(runtime.lists.equipItemListCount).toBe(5);
    expect(runtime.lists.classes).toEqual([
      {
        classId: 1,
        level: 7,
        knownSpellCount: 2,
        memorizedSpellCount: 1,
        knownSpells: [
          {
            spellId: 501,
            spellLabel: "Magic_Missile",
            spellLabelSource2daRow: 501,
            spellLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/spells.2da",
            metaMagic: 2,
            flags: 1
          },
          { spellId: 502, spellLabel: "Shield" }
        ],
        memorizedSpells: [{ spellId: 601, spellLabel: "Cure_Wounds", metaMagic: 4, flags: 3 }]
      }
    ]);
    expect(runtime.lists.feats).toEqual([
      {
        featId: 42,
        featLabel: "Weapon_Focus",
        featLabelSource2daRow: 42,
        featLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/feat.2da"
      }
    ]);
    expect(runtime.lists.templates).toEqual([{ templateId: 77 }]);
    expect(runtime.lists.specialAbilities).toEqual([
      {
        spellId: 123,
        spellLabel: "Flame_Weapon",
        spellLabelSource2daRow: 123,
        spellLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/spells.2da",
        flags: 5,
        casterLevel: 12
      }
    ]);
    expect(runtime.lists.inventoryItems).toEqual([
      {
        resRef: "nw_it_mpotion001",
        itemTemplateId: "itm_nw_it_mpotion001",
        itemResref: "nw_it_mpotion001",
        itemSourceFingerprint: "item-fp-potion",
        itemSourceObjectKey: "modules/current/blueprints/items/nw_it_mpotion001.uti",
        x: 3,
        y: 4,
        dropable: true,
        pickpocketable: true
      }
    ]);
    expect(runtime.lists.equippedItems).toEqual([
      {
        resRef: "nw_wswmls001",
        itemTemplateId: "itm_nw_wswmls001",
        itemResref: "nw_wswmls001",
        itemSourceFingerprint: "item-fp-sword",
        itemSourceObjectKey: "modules/current/blueprints/items/nw_wswmls001.uti",
        slotMask: 16,
        dropable: true,
        infinite: false
      }
    ]);
    expect(runtime.lists.skills).toEqual([
      {
        skillId: 0,
        skillLabel: "Animal_Empathy",
        skillLabelSource2daRow: 0,
        skillLabelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/skills.2da",
        rank: 4
      },
      { skillId: 1, skillLabel: "Concentration", rank: 0 }
    ]);
    expect(runtime.scripts).toMatchObject({
      scriptheartbeat: "hb_city_guard",
      scriptonblocked: "block_city_guard"
    });
  });

  it("buildCreatureRuntimeProjection embeds linked inventory and equipment item runtime", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      inventoryItemListEntries: JSON.stringify([
        {
          resRef: "nw_it_mpotion001",
          itemTemplateId: "itm_nw_it_mpotion001",
          itemTemplateMetadata: {
            sourceFileType: "UTI ",
            sourceFileVersion: "V3.2",
            sourceStructTypeId: 43,
            templateResRef: "nw_it_mpotion001",
            localizedName: "Healing Potion",
            baseItem: 46,
            costValue: 11,
            stackSize: 3,
            identified: true,
            "script.scriptactivated": "it_potion_use"
          },
          x: 3,
          y: 4
        }
      ]),
      equipItemListEntries: JSON.stringify([
        {
          resRef: "nw_wswmls001",
          itemTemplateId: "itm_nw_wswmls001",
          itemTemplateMetadata: {
            templateResRef: "nw_wswmls001",
            displayName: "Longsword",
            baseItem: 6,
            charges: 0,
            stolen: false
          },
          slotMask: 16
        }
      ])
    });

    expect(runtime.lists.inventoryItems?.[0]).toMatchObject({
      resRef: "nw_it_mpotion001",
      itemTemplateId: "itm_nw_it_mpotion001",
      x: 3,
      y: 4,
      itemRuntime: {
        source: {
          fileType: "UTI",
          fileVersion: "V3.2",
          structTypeId: 43
        },
        identity: {
          templateResRef: "nw_it_mpotion001",
          localizedName: "Healing Potion"
        },
        classification: {
          baseItem: 46
        },
        pricing: {
          costValue: 11
        },
        state: {
          stackSize: 3,
          identified: true
        },
        scripts: {
          scriptactivated: "it_potion_use"
        }
      }
    });
    expect(runtime.lists.inventoryItems?.[0]).not.toHaveProperty("itemTemplateMetadata");

    expect(runtime.lists.equippedItems?.[0]).toMatchObject({
      resRef: "nw_wswmls001",
      itemTemplateId: "itm_nw_wswmls001",
      slotMask: 16,
      itemRuntime: {
        identity: {
          templateResRef: "nw_wswmls001",
          localizedName: "Longsword"
        },
        classification: {
          baseItem: 6
        },
        state: {
          charges: 0,
          stolen: false
        }
      }
    });
    expect(runtime.lists.equippedItems?.[0]).not.toHaveProperty("itemTemplateMetadata");
  });

  it("buildCreatureValidationIssues reports Aurora fallback warnings", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001"
    });

    const issues = buildCreatureValidationIssues(runtime);
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "CREATURE_APPEARANCE_MISSING",
        "CREATURE_CHALLENGE_RATING_MISSING",
        "CREATURE_FACTION_MISSING",
        "CREATURE_ALIGNMENT_DEFAULTED",
        "CREATURE_SCRIPTS_EMPTY"
      ])
    );
    expect(runtime.effective).toEqual({
      challengeRating: 1,
      factionId: 0,
      goodEvil: 50,
      lawfulChaotic: 50,
      perceptionRange: 11,
      disarmable: true,
      plot: false,
      isPc: false,
      isImmortal: false,
      lootable: false,
      interruptable: true,
      noPermDeath: false,
      bodyBag: false,
      startingPackage: false,
      decayTime: 0
    });
  });

  it("buildCreatureRuntimeProjection uses source-backed walkRateEffective when UTC omits WalkRate", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 42,
      walkRateEffective: 7,
      walkRateSource2daRow: 42,
      walkRateSource2daName: "appearance.2da",
      walkRateSpeed2daRow: 7,
      walkRateAppearance2daSourceKey: "modules/current/__aurora/sources/hak/lc_2da/appearance.2da",
      walkRateSpeed2daSourceKey: "modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da"
    });

    expect(runtime.state.walkRate).toBeUndefined();
    expect(runtime.state.walkRateSource2daRow).toBe(42);
    expect(runtime.state.walkRateSource2daName).toBe("appearance.2da");
    expect(runtime.state.walkRateSpeed2daRow).toBe(7);
    expect(runtime.state.walkRateAppearance2daSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/appearance.2da"
    );
    expect(runtime.state.walkRateSpeed2daSourceKey).toBe(
      "modules/current/__aurora/sources/hak/lc_2da/creaturespeed.2da"
    );
    expect(runtime.effective.walkRate).toBe(7);
  });

  it("buildCreatureValidationIssues reports partial color and missing appearance head", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17,
      colorSkin: 10
    });

    const issues = buildCreatureValidationIssues(runtime);
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["CREATURE_APPEARANCE_HEAD_MISSING", "CREATURE_COLORS_PARTIAL"])
    );
  });

  it("buildCreatureValidationIssues reports detectable reverse-spec creature gaps", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17,
      appearanceHead: 44,
      portraitId: 41,
      wingsNew: 4,
      tailNew: 5,
      challengeRating: 1,
      factionId: 1,
      goodEvil: 50,
      lawfulChaotic: 50,
      "script.scriptheartbeat": "hb_city_guard"
    });

    const issues = buildCreatureValidationIssues(runtime);
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "CREATURE_APPEARANCE_ROW_MISSING",
        "CREATURE_PORTRAIT_LOOKUP_MISSING",
        "CREATURE_WINGS_TAIL_RUNTIME_GAP",
      "CREATURE_OPTIONAL_LIST_ABSENT"
      ])
    );
  });

  it("buildCreatureValidationIssues accepts source-backed wing and tail model candidates", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17,
      appearanceHead: 44,
      appearanceModelType: "P",
      wingsNew: 4,
      tailNew: 5,
      challengeRating: 1,
      factionId: 1,
      goodEvil: 50,
      lawfulChaotic: 50,
      "script.scriptheartbeat": "hb_city_guard",
      partModelCandidates: JSON.stringify([
        {
          slot: "wings",
          partId: 4,
          partModelName: "Guard_Wings",
          modelResRef: "wing_guard04",
          source: "wingmodel.2da.MODEL",
          source2daRow: 4,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/wingmodel.2da"
        },
        {
          slot: "tail",
          partId: 5,
          partModelName: "Guard_Tail",
          modelResRef: "tail_guard05",
          source: "tailmodel.2da.MODEL",
          source2daRow: 5,
          sourceKey: "modules/current/__aurora/sources/hak/lc_2da/tailmodel.2da"
        }
      ])
    });

    const issues = buildCreatureValidationIssues(runtime);
    expect(issues.map((issue) => issue.code)).not.toContain(
      "CREATURE_WINGS_TAIL_RUNTIME_GAP"
    );
  });

  it("buildCreatureValidationIssues accepts source-backed appearance profile without label", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17,
      appearanceHead: 44,
      appearanceModelType: "P",
      challengeRating: 1,
      factionId: 1,
      goodEvil: 50,
      lawfulChaotic: 50,
      "script.scriptheartbeat": "hb_city_guard"
    });

    const issues = buildCreatureValidationIssues(runtime);
    expect(issues.map((issue) => issue.code)).not.toContain(
      "CREATURE_APPEARANCE_ROW_MISSING"
    );
  });

  it("buildCreatureValidationIssues reports unresolved inventory and equipment item references", () => {
    const runtime = buildCreatureRuntimeProjection({
      templateResRef: "cre_guard_human_001",
      appearanceId: 17,
      appearanceHead: 44,
      challengeRating: 1,
      factionId: 1,
      goodEvil: 50,
      lawfulChaotic: 50,
      inventoryItemListEntries: JSON.stringify([{ resRef: "missing_potion", x: 1, y: 2 }]),
      equipItemListEntries: JSON.stringify([{ resRef: "missing_sword", slotMask: 16 }]),
      "script.scriptheartbeat": "hb_city_guard"
    });

    const issues = buildCreatureValidationIssues(runtime);
    expect(issues.map((issue) => issue.code)).toContain("CREATURE_ITEM_REFERENCE_UNRESOLVED");
  });

  it("buildItemRuntimeProjection maps item metadata fields", () => {
    const runtime = buildItemRuntimeProjection({
      sourceFileType: "UTI ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 43,
      templateResRef: "itm_scroll_fire_01",
      localizedName: "Scroll of Fire",
      description: "Unknown scroll",
      identifiedDescription: "Fireball scroll",
      comments: "Item palette comment",
      paletteId: 7,
      tag: "itm_scroll_fire_tag",
      plot: true,
      baseItem: 75,
      baseItem2daLabel: "Scroll",
      baseItem2daItemClass: "isc",
      baseItemDefaultIcon: "iit_scroll",
      baseItemInvSlotWidth: 1,
      baseItemInvSlotHeight: 1,
      baseItemEquipableSlots: "0x0",
      baseItemBaseCost: 0,
      baseItemStacking: 1,
      baseItemItemMultiplier: 1,
      baseItemMaxProps: 3,
      baseItemMinProps: 0,
      baseItemPropColumn: "Scroll",
      baseItemStorePanel: 4,
      baseItemStorePanelSort: 75,
      baseItemChargesStarting: 1,
      baseItemIlrStackSize: 10,
      baseItemWeaponMatType: 0,
      baseItemAmmunitionType: 0,
      baseItemArcaneSpellFailure: 0,
      baseItemModelType: "isc",
      baseItemDefaultModel: "isc_default",
      baseItem2daSourceKey: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
      modelPart1: 2,
      modelPart2: 1,
      modelPart3: 3,
      cost: 1648,
      addCost: 50,
      costTable: 3,
      costValue: 11,
      charges: 8,
      stackSize: 5,
      identified: false,
      stolen: true,
      cursed: true,
      bodyPartRFoot: 4,
      bodyPartTorso: 20,
      bodyPartBelt: 8,
      bodyPartRShoul: 15,
      bodyPartLShoul: 16,
      armorPartCostModifierRFoot: 1.5,
      armorPartCostModifierTorso: 4,
      armorPartCostModifierBelt: 2,
      armorPartCostModifierResolvedCount: 3,
      armorPartCostModifierUnresolvedCount: 2,
      armorPartCostModifierTotal: 7.5,
      leather1Color: 12,
      leather2Color: 13,
      cloth1Color: 14,
      cloth2Color: 15,
      metal1Color: 16,
      metal2Color: 17,
      itemPropertyListEntries: JSON.stringify([
        {
          propertyName: 15,
          subtype: 66,
          costTable: 3,
          costValue: 1,
          param1: 255,
          param1Value: 255,
          chanceAppear: 100,
          propertyLabel: "CastSpell",
          propertyDefinitionSource2daRow: 15,
          propertyDefinitionSourceKey:
            "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da",
          subTypeTable: "iprp_spells",
          costTableDefinition: "iprp_spellcost",
          param1Table: "iprp_paramtable",
          nameStrRef: 1234,
          gameStrRef: 4321,
          descriptionStrRef: 4322
        }
      ])
    });

    expect(runtime.source).toMatchObject({
      fileType: "UTI",
      fileVersion: "V3.2",
      structTypeId: 43
    });
    expect(runtime.identity).toMatchObject({
      templateResRef: "itm_scroll_fire_01",
      localizedName: "Scroll of Fire",
      description: "Unknown scroll",
      identifiedDescription: "Fireball scroll",
      tag: "itm_scroll_fire_tag"
    });
    expect(runtime.classification).toMatchObject({
      baseItem: 75,
      baseItemLabel: "Scroll",
      baseItemSourceKey: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
      itemClass: "isc",
      defaultIcon: "iit_scroll",
      invSlotWidth: 1,
      invSlotHeight: 1,
      equipableSlots: "0x0",
      baseCost: 0,
      stacking: 1,
      itemMultiplier: 1,
      maxProps: 3,
      minProps: 0,
      propColumn: "Scroll",
      storePanel: 4,
      storePanelSort: 75,
      chargesStarting: 1,
      ilrStackSize: 10,
      weaponMatType: 0,
      ammunitionType: 0,
      arcaneSpellFailure: 0
    });
    expect(runtime.visual).toMatchObject({
      baseItemModelType: "isc",
      baseItemDefaultModel: "isc_default",
      baseItemModelSourceKey: "modules/current/__aurora/sources/hak/lc_2da/baseitems.2da",
      modelPart1: 2,
      modelPart2: 1,
      modelPart3: 3,
      modelParts: [2, 1, 3],
      modelPartRoles: ["blade", "middle", "top"],
      modelPartResRefs: ["iscb_002", "iscm_001", "isct_003"],
      modelPartResRefRoles: ["blade", "middle", "top"],
      armorParts: {
        rFoot: 4,
        torso: 20,
        belt: 8,
        rShoul: 15,
        lShoul: 16
      },
      materialColors: {
        leather1: 12,
        leather2: 13,
        cloth1: 14,
        cloth2: 15,
        metal1: 16,
        metal2: 17
      }
    });
    expect(runtime.visual.armorPartModelCandidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          slot: "rFoot",
          partId: 4,
          partModelName: "footr",
          nodeName: "rfoot_g",
          modelPrefix: "pmh0_",
          modelResRef: "pmh0_footr004"
        }),
        expect.objectContaining({
          slot: "torso",
          partId: 20,
          partModelName: "chest",
          nodeName: "torso_g",
          modelPrefix: "pmh0_",
          modelResRef: "pmh0_chest020"
        }),
        expect.objectContaining({
          slot: "belt",
          partId: 8,
          nodeName: "belt_g",
          modelResRef: "pmh0_belt008"
        }),
        expect.objectContaining({
          slot: "rShoul",
          partId: 15,
          nodeName: "rshoulder_g",
          modelResRef: "pmh0_shor015"
        }),
        expect.objectContaining({
          slot: "lShoul",
          partId: 16,
          nodeName: "lshoulder_g",
          modelResRef: "pmh0_shol016"
        })
      ])
    );
    expect(runtime.pricing).toMatchObject({
      cost: 1648,
      addCost: 50,
      costTable: 3,
      costValue: 11,
      armorPartCostModifiers: {
        rFoot: 1.5,
        torso: 4,
        belt: 2
      },
      armorPartCostModifierResolvedCount: 3,
      armorPartCostModifierUnresolvedCount: 2,
      armorPartCostModifierTotal: 7.5
    });
    expect(runtime.state).toMatchObject({
      plot: true,
      cursed: true,
      charges: 8,
      stackSize: 5,
      identified: false,
      stolen: true
    });
    expect(runtime.palette).toEqual({
      comments: "Item palette comment",
      paletteId: 7
    });
    expect(runtime.itemProperties).toEqual([
      {
        propertyName: 15,
        propertyLabel: "CastSpell",
        subtype: 66,
        costTable: 3,
        costValue: 1,
        param1: 255,
        param1Value: 255,
        chanceAppear: 100,
        propertyDefinitionSource2daRow: 15,
        propertyDefinitionSourceKey:
          "modules/current/__aurora/sources/hak/lc_2da/itempropdef.2da",
        subTypeTable: "iprp_spells",
        costTableDefinition: "iprp_spellcost",
        param1Table: "iprp_paramtable",
        nameStrRef: 1234,
        gameStrRef: 4321,
        descriptionStrRef: 4322
      }
    ]);
  });

  it("buildItemRuntimeProjection builds Aurora item-class model part resrefs", () => {
    const runtime = buildItemRuntimeProjection({
      templateResRef: "nw_wswls001",
      baseItem: 6,
      baseItemModelType: "WSwLs",
      modelPart1: 2,
      modelPart2: 1,
      modelPart3: 3
    });

    expect(runtime.visual).toMatchObject({
      baseItemModelType: "WSwLs",
      modelParts: [2, 1, 3],
      modelPartResRefs: ["wswls_b_002", "wswls_m_001", "wswls_t_003"],
      modelPartResRefRoles: ["blade", "middle", "top"]
    });
  });

  it("buildItemRuntimeProjection uses the Aurora default model for potions", () => {
    const runtime = buildItemRuntimeProjection({
      templateResRef: "nw_it_mpotion002",
      baseItem: 49,
      baseItemModelType: "it_potion",
      baseItemDefaultModel: "it_potion_000",
      modelPart1: 41,
      modelPart2: 13,
      modelPart3: 33
    });

    expect(runtime.visual).toMatchObject({
      baseItemModelType: "it_potion",
      baseItemDefaultModel: "it_potion_000",
      modelParts: [41, 13, 33],
      modelPartResRefs: ["it_potion_000"],
      modelPartResRefRoles: ["default"]
    });
  });

  it("buildItemRuntimeProjection builds single-piece thrown weapon resrefs", () => {
    const runtime = buildItemRuntimeProjection({
      templateResRef: "wnd_wright11_shu",
      baseItem: 59,
      baseItemModelType: "WThSh",
      modelPart1: 21
    });

    expect(runtime.visual).toMatchObject({
      baseItemModelType: "WThSh",
      modelParts: [21],
      modelPartResRefs: ["wthsh_021"],
      modelPartResRefRoles: ["blade"]
    });
  });

  it("buildItemRuntimeProjection builds single-piece shield resrefs", () => {
    const runtime = buildItemRuntimeProjection({
      templateResRef: "wnd_rene_tshield",
      baseItem: 57,
      baseItemModelType: "AShTo",
      modelPart1: 95
    });

    expect(runtime.visual).toMatchObject({
      baseItemModelType: "AShTo",
      modelParts: [95],
      modelPartResRefs: ["ashto_095"],
      modelPartResRefRoles: ["blade"]
    });
  });

  it("buildItemRuntimeProjection builds cloakmodel-backed cloak resrefs", () => {
    const runtime = buildItemRuntimeProjection({
      templateResRef: "nw_cloak_arcane",
      baseItem: 80,
      baseItemModelType: "cloak",
      modelPart1: 2,
      cloakModelRow: 2,
      cloakModel: 1,
      cloakTexture: 10,
      cloakIcon: 2,
      cloakHiddenSlots: "wing|rShoul",
      cloakModelResRef: "pmh0_cloak_001",
      cloakTextureResRef: "pmh0_cloak_010",
      cloakIconResRef: "icloak_m_002"
    });

    expect(runtime.visual).toMatchObject({
      baseItemModelType: "cloak",
      modelParts: [2],
      modelPartResRefs: ["pmh0_cloak_001"],
      modelPartResRefRoles: ["cloak"],
      cloakModelRow: 2,
      cloakModel: 1,
      cloakTexture: 10,
      cloakIcon: 2,
      cloakModelResRef: "pmh0_cloak_001",
      cloakTextureResRef: "pmh0_cloak_010",
      cloakIconResRef: "icloak_m_002",
      cloakHiddenSlots: ["wing", "rShoul"]
    });
  });

  it("buildItemRuntimeProjection applies item armor preview context to body parts and cloaks", () => {
    const runtime = buildItemRuntimeProjection({
      templateResRef: "nw_context_armor",
      baseItem: 16,
      baseItemModelType: "cloak",
      modelPart1: 2,
      cloakModel: 1,
      cloakTexture: 10,
      bodyPartTorso: 43,
      itemArmorPreviewModelPrefix: "pfh2_",
      itemArmorPreviewContextLabel: "human-female-phenotype2",
      itemArmorPreviewGender: 1,
      itemArmorPreviewPhenotype: 2,
      itemArmorPreviewRaceModel: "human"
    });

    expect(runtime.visual.armorPreviewContext).toEqual({
      modelPrefix: "pfh2_",
      sourceKey: "item-armor-preview.human-female-phenotype2.ArmorPart",
      label: "human-female-phenotype2",
      gender: 1,
      phenotype: 2,
      raceModel: "human"
    });
    expect(runtime.visual.cloakModelResRef).toBe("pfh2_cloak_001");
    expect(runtime.visual.cloakTextureResRef).toBe("pfh2_cloak_010");
    expect(runtime.visual.armorPartModelCandidates).toEqual([
      expect.objectContaining({
        slot: "torso",
        partId: 43,
        modelPrefix: "pfh2_",
        modelResRef: "pfh2_chest043",
        sourceKey: "item-armor-preview.human-female-phenotype2.ArmorPart"
      })
    ]);
  });

  it("buildItemRuntimeProjection filters armor CAPart candidates hidden by robe masks", () => {
    const runtime = buildItemRuntimeProjection({
      templateResRef: "nw_robe_masked",
      baseItem: 16,
      bodyPartRFoot: 4,
      bodyPartRShin: 13,
      bodyPartRThigh: 3,
      bodyPartPelvis: 8,
      bodyPartTorso: 43,
      bodyPartBelt: 5,
      bodyPartRobe: 5,
      armorRobeHiddenSlots: "rShin|rThigh|pelvis|torso|belt"
    });

    expect(runtime.visual.armorRobeHiddenSlots).toEqual([
      "rShin",
      "rThigh",
      "pelvis",
      "torso",
      "belt"
    ]);
    expect(runtime.visual.armorPartModelCandidates.map((candidate) => candidate.slot)).toEqual([
      "rFoot",
      "robe"
    ]);
    expect(runtime.visual.armorPartModelCandidates.map((candidate) => candidate.modelResRef)).toEqual([
      "pmh0_footr004",
      "pmh0_robe005"
    ]);
  });

  it("buildItemRuntimeProjection keeps three-piece throwing axe resrefs", () => {
    const runtime = buildItemRuntimeProjection({
      templateResRef: "nw_wthax001",
      baseItem: 63,
      baseItemModelType: "WThAx",
      modelPart1: 2,
      modelPart2: 1,
      modelPart3: 3
    });

    expect(runtime.visual).toMatchObject({
      baseItemModelType: "WThAx",
      modelParts: [2, 1, 3],
      modelPartResRefs: ["wthax_b_002", "wthax_m_001", "wthax_t_003"],
      modelPartResRefRoles: ["blade", "middle", "top"]
    });
  });

  it("buildItemValidationIssues reports expected Aurora item warnings", () => {
    const runtime = buildItemRuntimeProjection({
      templateResRef: "itm_broken_01",
      identified: false,
      stackSize: 0,
      charges: -1,
      costTable: 5
    });

    const issues = buildItemValidationIssues(runtime);
    expect(issues.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "ITEM_BASE_ITEM_MISSING",
        "ITEM_STACK_SIZE_INVALID",
        "ITEM_CHARGES_INVALID",
        "ITEM_IDENTIFIED_DESC_MISSING",
        "ITEM_COST_VALUE_MISSING"
      ])
    );
  });

  it("buildEncounterRuntimeProjection maps encounter metadata and validation", () => {
    const runtime = buildEncounterRuntimeProjection({
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 42,
      templateResRef: "enc_forest_ambush_01",
      localizedName: "Forest Ambush",
      description: "Hidden ambush trigger",
      tag: "enc_forest_ambush_tag",
      active: true,
      difficulty: 2,
      difficultyIndex: 1,
      factionId: 5,
      maxCreatures: 6,
      recCreatures: 3,
      playerOnly: true,
      reset: true,
      resetTime: 120,
      respawns: 2,
      spawnOption: 1,
      encounterCreatureListEntries: JSON.stringify([
        {
          resRef: "nw_wolf001",
          appearance: 11,
          challengeRating: 1.5,
          singleSpawn: false
        },
        {
          resRef: "nw_bandit001",
          appearance: 22,
          challengeRating: 2.25,
          singleSpawn: true
        }
      ]),
      "script.onentered": "enc_enter",
      "script.onexit": "enc_exit",
      "script.onexhausted": "enc_empty"
    });

    expect(runtime.source).toMatchObject({
      fileType: "UTE",
      fileVersion: "V3.2",
      structTypeId: 42
    });
    expect(runtime.identity).toMatchObject({
      templateResRef: "enc_forest_ambush_01",
      localizedName: "Forest Ambush",
      tag: "enc_forest_ambush_tag"
    });
    expect(runtime.settings).toMatchObject({
      active: true,
      difficulty: 2,
      difficultyIndex: 1,
      factionId: 5,
      maxCreatures: 6,
      recCreatures: 3,
      playerOnly: true,
      reset: true,
      resetTime: 120,
      respawns: 2,
      spawnOption: 1
    });
    expect(runtime.creatureList).toEqual([
      {
        resRef: "nw_wolf001",
        appearance: 11,
        challengeRating: 1.5,
        singleSpawn: false
      },
      {
        resRef: "nw_bandit001",
        appearance: 22,
        challengeRating: 2.25,
        singleSpawn: true
      }
    ]);
    expect(runtime.scripts).toMatchObject({
      onentered: "enc_enter",
      onexit: "enc_exit",
      onexhausted: "enc_empty"
    });
    expect(buildEncounterValidationIssues(runtime)).toEqual([]);

    const invalid = buildEncounterRuntimeProjection({
      maxCreatures: 1,
      recCreatures: 2
    });
    expect(buildEncounterValidationIssues(invalid).map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "ENCOUNTER_TEMPLATE_RESREF_MISSING",
        "ENCOUNTER_CREATURE_LIST_EMPTY",
        "ENCOUNTER_MAX_BELOW_RECOMMENDED",
        "ENCOUNTER_SCRIPTS_EMPTY"
      ])
    );
  });

  it("buildLookupSeeds and addSeed include expected values and skip short ones", () => {
    const input = {
      templateId: "plc_demo_001",
      resref: "plc_demo",
      subtype: "vfx" as const,
      metadata: {
        modelResref: "plc_demo_model",
        appearanceResref: "ap_demo",
        model: "plc_demo_model",
        texturePrefix: "tx_demo",
        materialPrefix: "mt_demo",
        vfxPreset: "vfx_demo",
        ignored: "ab"
      }
    };

    const seeds = buildLookupSeeds(input);
    expect(seeds).toContain("plc_demo");
    expect(seeds).toContain("plc_demo_001");
    expect(seeds).toContain("plc_demo_model");
    expect(seeds).toContain("tx_demo");
    expect(seeds).toContain("vfx_demo");
    expect(seeds).toContain("plc_demo_vfx");

    const set = new Set<string>();
    addSeed(set, "ab");
    addSeed(set, "abc");
    expect([...set]).toEqual(["abc"]);
  });

  it("buildLookupSeeds consumes each metadata lookup key", () => {
    const seeds = buildLookupSeeds({
      templateId: "tpl",
      resref: "aa",
      subtype: "generic",
      metadata: {
        modelResref: "x_modelresref",
        appearanceResref: "x_appearance",
        model: "x_model",
        texturePrefix: "x_tex",
        materialPrefix: "x_mat",
        vfxPreset: "x_vfx",
        modelTextureReferences: "x_model_tex"
      }
    });

    expect(seeds).toEqual(
      expect.arrayContaining([
        "x_modelresref",
        "x_appearance",
        "x_model",
        "x_tex",
        "x_mat",
        "x_vfx",
        "x_model_tex"
      ])
    );
  });

  it("buildLookupSeeds adds vfx suffix only for vfx subtype", () => {
    const genericSeeds = buildLookupSeeds({
      templateId: "plc_generic_001",
      resref: "plc_generic",
      subtype: "generic",
      metadata: {}
    });

    expect(genericSeeds).not.toContain("plc_generic_vfx");
  });

  it("buildModuleSnapshotIndex groups by basename/prefix and counts scanned files", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/models/plc_gate.mdl", size: 10, etag: "e1" },
      { key: "modules/current/__aurora/derived/models/plc_gate.glb", size: 15, etag: "eglb" },
      { key: "modules/current/textures/plc_gate.dds", size: 20, etag: "e2" },
      { key: "modules/current/fx/plc_gate_vfx.vis", size: 30, etag: "e3" },
      { key: "modules/current/misc/plc_gate.custom", size: 5, etag: "e5" },
      { key: "modules/current/fx/", size: 40, etag: "e4" }
    ]);

    const index = buildModuleSnapshotIndex(snapshot);
    expect(index.moduleHash).toBe("hash-v1");
    expect(index.candidatesScanned).toBe(6);
    expect(index.byBasename.get("plc_gate")?.length).toBe(4);
    expect(index.byPrefix.get("plc_")?.length).toBe(5);
    expect(index.byBasename.has("")).toBe(false);
    expect(
      index.byBasename.get("plc_gate")?.find((asset) => asset.fileName === "plc_gate.glb")?.role
    ).toBe("model");
    expect(index.byBasename.get("plc_gate")?.some((asset) => asset.role === "unknown")).toBe(true);
  });

  it("collectPlaceableAssetsFromSnapshot deduplicates and sorts by role then name", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/models/plc_gate.mdl", size: 10, etag: "1" },
      { key: "modules/current/textures/plc_gate_a.dds", size: 10, etag: "5" },
      { key: "modules/current/textures/plc_gate_b.dds", size: 10, etag: "6" },
      { key: "modules/current/textures/plc_gate_c.png", size: 10, etag: "8" },
      { key: "modules/current/materials/plc_gate.mtr", size: 10, etag: "2" },
      { key: "modules/current/textures/plc_gate.dds", size: 10, etag: "3" },
      { key: "modules/current/fx/plc_gate_vfx.vis", size: 10, etag: "4" },
      { key: "modules/current/models/plc_other.mdl", size: 10, etag: "7" }
    ]);
    const index = buildModuleSnapshotIndex(snapshot);

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_gate_001",
      resref: "plc_gate",
      subtype: "vfx",
      metadata: {}
    });

    expect(result.length).toBe(7);
    expect(new Set(result.map((entry) => entry.objectKey)).size).toBe(7);
    expect(result.map((entry) => entry.role)).toEqual([
      "model",
      "texture",
      "texture",
      "texture",
      "texture",
      "material",
      "vfx"
    ]);
    const textureNames = result
      .filter((entry) => entry.role === "texture")
      .map((entry) => entry.fileName);
    expect(textureNames).toHaveLength(4);
    expect(textureNames).toEqual([...textureNames].sort((left, right) => left.localeCompare(right)));
  });

  it("collectPlaceableAssetsFromSnapshot classifies PLT palette assets as textures", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/models/pfh2_rfoot004.glb", size: 20, etag: "model" },
      { key: "modules/current/textures/pfh2_rfoot004.plt", size: 10, etag: "palette" }
    ]);
    const index = buildModuleSnapshotIndex(snapshot);

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "cre_guard_human_001",
      resref: "pfh2_rfoot004",
      subtype: "generic",
      metadata: {
        lookupModelResRef: "pfh2_rfoot004",
        modelTextureReferences: "pfh2_rfoot004"
      }
    });

    expect(result).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fileName: "pfh2_rfoot004.plt",
          role: "texture",
          contentType: "application/octet-stream"
        })
      ])
    );
  });

  it("collectPlaceableAssetsFromSnapshot resolves item DefaultIcon refs as texture assets", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/models/iiw_sword.mdl", size: 20, etag: "model" },
      { key: "modules/current/textures/iiw_sword.png", size: 10, etag: "png" },
      { key: "modules/current/textures/iiw_sword.tga", size: 12, etag: "tga" },
      { key: "modules/current/materials/iiw_sword.mtr", size: 8, etag: "mtr" }
    ]);
    const index = buildModuleSnapshotIndex(snapshot);

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "itm_longsword",
      resref: "nw_wswm001",
      subtype: "generic",
      metadata: {
        itemIconRefs: "iiw_sword"
      }
    });

    expect(result.map((entry) => [entry.fileName, entry.role])).toEqual([
      ["iiw_sword.png", "texture"],
      ["iiw_sword.tga", "texture"],
      ["iiw_sword.mtr", "material"]
    ]);
  });

  it("collectPlaceableAssetsFromSnapshot keeps creature model references exact while including same-part textures", () => {
    const index = buildModuleSnapshotIndex(
      buildSnapshot([
        { key: "modules/current/models/pmh0.mdl", size: 10, etag: "skeleton" },
        { key: "modules/current/models/pmh0_head001.mdl", size: 10, etag: "head-001" },
        { key: "modules/current/models/pmh0_head006.mdl", size: 10, etag: "head-006" },
        { key: "modules/current/models/pmh0_chest001.mdl", size: 10, etag: "chest-001" },
        { key: "modules/current/models/pfh0.mdl", size: 10, etag: "other-skeleton" },
        { key: "modules/current/textures/pmh0_head001.dds", size: 10, etag: "texture" }
      ])
    );

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "cre_auctioneer",
      resref: "auctioneer",
      subtype: "generic",
      metadata: {
        creatureSkeletonModelRefs: "pmh0",
        creaturePartModelRefs: "pmh0_head001"
      }
    });

    expect(result.map((entry) => entry.fileName).sort()).toEqual(
      ["pmh0.mdl", "pmh0_head001.dds", "pmh0_head001.mdl"].sort()
    );
    expect(result.map((entry) => entry.fileName)).not.toContain("pmh0_head006.mdl");
    expect(result.map((entry) => entry.fileName)).not.toContain("pmh0_chest001.mdl");
  });

  it("collectPlaceableAssetsFromSnapshot keeps lookupModelResRef exact instead of prefix-matching scene variants", () => {
    const index = buildModuleSnapshotIndex(
      buildSnapshot([
        { key: "modules/current/models/dag_applescene.mdl", size: 10, etag: "scene-mdl" },
        {
          key: "modules/current/__aurora/derived/models/dag_applescene.glb",
          size: 20,
          etag: "scene-glb"
        },
        { key: "modules/current/models/dag_apple.mdl", size: 30, etag: "apple-mdl" },
        { key: "modules/current/textures/dag_apple.dds", size: 5, etag: "apple-texture" }
      ])
    );

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "tm_pl_frutapple1",
      resref: "tm_pl_frutapple1",
      subtype: "generic",
      metadata: {
        lookupModelResRef: "dag_apple"
      }
    });

    expect(result.map((entry) => entry.fileName)).toEqual([
      "dag_apple.mdl",
      "dag_apple.dds"
    ]);
  });

  it("collectPlaceableAssetsFromSnapshot breaks ties with objectKey for identical file names", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/z/plc_gate.dds", size: 1, etag: "a" },
      { key: "modules/current/a/plc_gate.dds", size: 1, etag: "b" }
    ]);
    const index = buildModuleSnapshotIndex(snapshot);

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_gate",
      resref: "plc_gate",
      subtype: "generic",
      metadata: {}
    });

    const tie = result.filter((entry) => entry.fileName === "plc_gate.dds");
    expect(tie).toHaveLength(2);
    expect(tie.map((entry) => entry.objectKey)).toEqual([
      "modules/current/a/plc_gate.dds",
      "modules/current/z/plc_gate.dds"
    ]);
  });

  it("collectPlaceableAssetsFromSnapshot sorts by file name before object key for same role", () => {
    const snapshot = buildSnapshot([
      { key: "modules/current/z/plc_gate_a.dds", size: 1, etag: "a" },
      { key: "modules/current/0/plc_gate_b.dds", size: 1, etag: "b" }
    ]);
    const index = buildModuleSnapshotIndex(snapshot);

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_gate",
      resref: "plc_gate",
      subtype: "generic",
      metadata: {}
    });

    expect(result.filter((entry) => entry.role === "texture").map((entry) => entry.fileName)).toEqual([
      "plc_gate_a.dds",
      "plc_gate_b.dds"
    ]);
  });

  it("collectPlaceableAssetsFromSnapshot enforces 200 items cap", () => {
    const objects = Array.from({ length: 220 }, (_, index) => ({
      key: `modules/current/models/plc_big_${String(index).padStart(3, "0")}.mdl`,
      size: index + 1,
      etag: `etag-${index}`
    }));
    const index = buildModuleSnapshotIndex(buildSnapshot(objects));

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_big_template",
      resref: "plc_big",
      subtype: "generic",
      metadata: {}
    });

    expect(result).toHaveLength(200);
  });

  it("collectPlaceableAssetsFromSnapshot orders duplicate texture resrefs by Aurora source priority", () => {
    const index = buildModuleSnapshotIndex(
      buildSnapshot([
        {
          key: "modules/current/__aurora/sources/vanilla/textures/tx_shared.dds",
          size: 1,
          etag: "vanilla"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_low/textures/tx_shared.dds",
          size: 1,
          etag: "hak-low"
        },
        {
          key: "modules/current/textures/tx_shared.dds",
          size: 1,
          etag: "module"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_high/textures/tx_shared.dds",
          size: 1,
          etag: "hak-high"
        }
      ])
    );

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_shared",
      resref: "plc_shared",
      subtype: "generic",
      metadata: {
        modelTextureReferences: "tx_shared"
      },
      sourcePriority: {
        hakNames: ["lc_high", "lc_low"]
      }
    });

    expect(result.filter((entry) => entry.role === "texture").map((entry) => entry.objectKey)).toEqual([
      "modules/current/textures/tx_shared.dds",
      "modules/current/__aurora/sources/hak/lc_high/textures/tx_shared.dds",
      "modules/current/__aurora/sources/hak/lc_low/textures/tx_shared.dds",
      "modules/current/__aurora/sources/vanilla/textures/tx_shared.dds"
    ]);
  });

  it("collectPlaceableAssetsFromSnapshot keeps out-of-profile HAK textures behind vanilla", () => {
    const index = buildModuleSnapshotIndex(
      buildSnapshot([
        {
          key: "modules/current/__aurora/sources/hak/cep3_vfx/textures/fxpa_flame00.tga",
          size: 1,
          etag: "foreign-vfx-hak"
        },
        {
          key: "modules/current/__aurora/sources/hak/lc_hd_plcbls/textures/fxpa_flame00.tga",
          size: 1,
          etag: "placeable-hak"
        },
        {
          key: "modules/current/__aurora/sources/vanilla/textures/fxpa_flame00.tga",
          size: 1,
          etag: "vanilla"
        }
      ])
    );

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_plc_i06",
      resref: "plc_i06",
      subtype: "light_source",
      metadata: {
        modelTextureReferences: "fxpa_flame00"
      },
      sourcePriority: {
        hakNames: ["lc_hd_plcbls"]
      }
    });

    expect(result.filter((entry) => entry.role === "texture").map((entry) => entry.objectKey)).toEqual([
      "modules/current/__aurora/sources/hak/lc_hd_plcbls/textures/fxpa_flame00.tga",
      "modules/current/__aurora/sources/vanilla/textures/fxpa_flame00.tga",
      "modules/current/__aurora/sources/hak/cep3_vfx/textures/fxpa_flame00.tga"
    ]);
  });

  it("collectPlaceableAssetsFromSnapshot does not use texture references to pull sibling models", () => {
    const index = buildModuleSnapshotIndex(
      buildSnapshot([
        {
          key: "modules/current/__aurora/sources/hak/cep3_core2/plc_arcirc_01blh.mdl",
          size: 1,
          etag: "horizontal-model"
        },
        {
          key: "modules/current/__aurora/sources/hak/cep3_core2/plc_arcirc_01blv.mdl",
          size: 1,
          etag: "vertical-model"
        },
        {
          key: "modules/current/__aurora/sources/hak/cep3_core2/plc_arcirc_01b.dds",
          size: 1,
          etag: "shared-texture"
        }
      ])
    );

    const result = collectPlaceableAssetsFromSnapshot(index, {
      templateId: "plc_plc_arcirc_01blv",
      resref: "plc_arcirc_01blv",
      subtype: "vfx",
      metadata: {
        lookupModelResRef: "plc_arcirc_01blv",
        modelTextureReferences: "plc_arcirc_01b"
      }
    });

    expect(result.map((entry) => entry.fileName)).toEqual([
      "plc_arcirc_01blv.mdl",
      "plc_arcirc_01b.dds"
    ]);
  });

  it("summarizeDurations and percentile produce stable metrics", () => {
    const values = [4, 1, 3, 2];
    const summary = summarizeDurations(values);

    expect(summary).toEqual({
      minMs: 1,
      maxMs: 4,
      avgMs: 2.5,
      p50Ms: 2,
      p95Ms: 4,
      p99Ms: 4
    });
    expect(summarizeDurations([])).toEqual({
      minMs: 0,
      maxMs: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0
    });
    expect(percentile([1, 2, 3], 0)).toBe(1);
    expect(percentile([1, 2, 3], 2)).toBe(3);
    expect(roundMetric(1.23456)).toBe(1.2346);
  });

  it("buildBenchmarkFingerprint is deterministic and sensitive to input", () => {
    const query = {
      iterations: 10,
      warmupIterations: 2,
      bypassCache: true
    };
    const candidates = [
      { templateId: "a", resref: "ra", placeableSubtype: "generic" as const },
      { templateId: "b", resref: "rb", placeableSubtype: "vfx" as const }
    ];

    const first = buildBenchmarkFingerprint(candidates, query);
    const second = buildBenchmarkFingerprint(candidates, query);
    const changed = buildBenchmarkFingerprint(
      [{ templateId: "a", resref: "ra", placeableSubtype: "generic" as const }],
      query
    );

    expect(first).toHaveLength(64);
    expect(first).toBe(second);
    expect(first).not.toBe(changed);
  });

  it("buildBenchmarkFingerprint uses canonical payload shape", () => {
    const query = {
      iterations: 7,
      warmupIterations: 3,
      bypassCache: false
    };
    const candidates = [
      { templateId: "x", resref: "rx", placeableSubtype: undefined },
      { templateId: "y", resref: "ry", placeableSubtype: "vfx" as const }
    ];

    const expected = createHash("sha256")
      .update(
        JSON.stringify({
          type: "placeable-benchmark/v1",
          iterations: 7,
          warmupIterations: 3,
          bypassCache: false,
          candidates: [
            { templateId: "x", resref: "rx", placeableSubtype: "generic" },
            { templateId: "y", resref: "ry", placeableSubtype: "vfx" }
          ]
        })
      )
      .digest("hex");

    expect(buildBenchmarkFingerprint(candidates, query)).toBe(expected);
  });

  it("buildEmptyPlaceableAssetManifest returns empty manifest descriptor", () => {
    const manifest = buildEmptyPlaceableAssetManifest();
    expect(manifest.version).toBe("placeable-asset-manifest/v1");
    expect(manifest.source).toBe("module-blob-snapshot");
    expect(manifest.assetCount).toBe(0);
    expect(manifest.assets).toEqual([]);
  });

  it("buildPlaceableRenderPackage reports missing assets without model entries", () => {
    const manifest = buildEmptyPlaceableAssetManifest();

    const renderPackage = buildPlaceableRenderPackage(manifest);

    expect(renderPackage.status).toBe("missing_assets");
    expect(renderPackage.assetRefs).toEqual({});
    expect(renderPackage.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PLACEABLE_RENDER_ASSETS_MISSING",
          severity: "error"
        })
      ])
    );
  });

  it("buildPlaceableRenderPackage flags raw model assets as missing derived", () => {
    const manifest = buildEmptyPlaceableAssetManifest();
    manifest.assets = [
      {
        assetId: "abc",
        role: "model",
        fileName: "plc_raw.mdl",
        objectKey: "modules/current/models/plc_raw.mdl",
        extension: "mdl",
        sizeBytes: 1,
        contentType: "application/octet-stream",
        etag: "e"
      }
    ];

    const renderPackage = buildPlaceableRenderPackage(manifest);

    expect(renderPackage.status).toBe("missing_derived");
    expect(renderPackage.assetRefs.modelAssetIds).toEqual(["abc"]);
    expect(renderPackage.glbUrl).toBeUndefined();
    expect(renderPackage.modelUrl).toBeUndefined();
    expect(renderPackage.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PLACEABLE_RENDER_DERIVED_MISSING",
          severity: "error"
        })
      ])
    );
  });

  it("buildPlaceableRenderPackage reports unknown source model assets as no-geometry helpers", () => {
    const manifest = buildEmptyPlaceableAssetManifest();
    manifest.assets = [
      {
        assetId: "legacy-mdl",
        role: "unknown",
        fileName: "plc_u02.mdl",
        objectKey: "modules/current/__aurora/sources/vanilla/models/plc_u02.mdl",
        extension: "mdl",
        sizeBytes: 1,
        contentType: "application/octet-stream",
        etag: "e"
      }
    ];

    const renderPackage = buildPlaceableRenderPackage(manifest);

    expect(renderPackage.status).toBe("unsupported");
    expect(renderPackage.assetRefs.otherAssetIds).toEqual(["legacy-mdl"]);
    expect(renderPackage.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "PLACEABLE_RENDER_SOURCE_MODEL_NO_GEOMETRY",
          severity: "warn",
          message:
            "Source model assets were found, but conversion reported no renderable mesh geometry; treating this as an invisible/helper placeable."
        })
      ])
    );
  });

  it("buildPlaceableRenderPackage is ready when derived model asset is present", () => {
    const manifest = buildEmptyPlaceableAssetManifest();
    manifest.assets = [
      {
        assetId: "abc",
        role: "unknown",
        fileName: "plc.raw.glb",
        objectKey: "modules/current/models/plc.raw.glb",
        extension: "glb",
        sizeBytes: 2,
        contentType: "model/gltf-binary",
        etag: "g"
      },
      {
        assetId: "ddd",
        role: "texture",
        fileName: "plc.diffuse.dds",
        objectKey: "modules/current/textures/plc.diffuse.dds",
        extension: "dds",
        sizeBytes: 3,
        contentType: "image/vnd-ms.dds",
        etag: "d"
      }
    ];

    const renderPackage = buildPlaceableRenderPackage(manifest);

    expect(renderPackage.status).toBe("ready");
    expect(renderPackage.assetRefs.derivedModelAssetIds).toEqual(["abc"]);
    expect(renderPackage.assetRefs.textureAssetIds).toEqual(["ddd"]);
  });

  it("buildPlaceableRenderPackage prefers GLB over GLTF when both derived model assets exist", () => {
    const manifest = buildEmptyPlaceableAssetManifest();
    manifest.assets = [
      {
        assetId: "model-gltf",
        role: "model",
        fileName: "plc_dual.gltf",
        objectKey: "modules/current/models/plc_dual.gltf",
        extension: "gltf",
        sizeBytes: 4,
        contentType: "model/gltf+json",
        etag: "gltf"
      },
      {
        assetId: "model-glb",
        role: "model",
        fileName: "plc_dual.glb",
        objectKey: "modules/current/models/plc_dual.glb",
        extension: "glb",
        sizeBytes: 5,
        contentType: "model/gltf-binary",
        etag: "glb"
      }
    ];

    const renderPackage = buildPlaceableRenderPackage(manifest);

    expect(renderPackage.status).toBe("ready");
    expect(renderPackage.assetRefs.derivedModelAssetIds).toEqual(["model-glb", "model-gltf"]);
  });

  it("buildPlaceableRenderPackage keeps all texture references when many textures are discovered", () => {
    const manifest = buildEmptyPlaceableAssetManifest();
    manifest.assets = [
      {
        assetId: "tex-a",
        role: "texture",
        fileName: "plc_multi.a.dds",
        objectKey: "modules/current/textures/plc_multi.a.dds",
        extension: "dds",
        sizeBytes: 3,
        contentType: "image/vnd-ms.dds",
        etag: "ta"
      },
      {
        assetId: "tex-b",
        role: "texture",
        fileName: "plc_multi.b.dds",
        objectKey: "modules/current/textures/plc_multi.b.dds",
        extension: "dds",
        sizeBytes: 3,
        contentType: "image/vnd-ms.dds",
        etag: "tb"
      },
      {
        assetId: "model",
        role: "model",
        fileName: "plc_multi.mdl",
        objectKey: "modules/current/models/plc_multi.mdl",
        extension: "mdl",
        sizeBytes: 12,
        contentType: "application/octet-stream",
        etag: "m"
      },
      {
        assetId: "tex-c",
        role: "texture",
        fileName: "plc_multi.c.dds",
        objectKey: "modules/current/textures/plc_multi.c.dds",
        extension: "dds",
        sizeBytes: 3,
        contentType: "image/vnd-ms.dds",
        etag: "tc"
      }
    ];

    const renderPackage = buildPlaceableRenderPackage(manifest);

    expect(renderPackage.status).toBe("missing_derived");
    expect(renderPackage.assetRefs.textureAssetIds).toEqual(["tex-a", "tex-b", "tex-c"]);
    expect(renderPackage.assetRefs.modelAssetIds).toEqual(["model"]);
  });
});

function buildSnapshot(
  objects: Array<{ key: string; size: number; etag?: string }>
): ModuleBlobSnapshotSummary {
  return {
    bucket: "aurora-module-assets",
    prefix: "modules/current/",
    moduleHash: "hash-v1",
    totalFiles: objects.length,
    totalBytes: objects.reduce((sum, object) => sum + object.size, 0),
    objects,
    truncated: false
  };
}
