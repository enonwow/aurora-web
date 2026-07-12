import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const RESOURCE_TYPES = {
  are: 2012,
  ifo: 2014,
  git: 2023,
  gic: 2046,
  txt: 10
};

const FIELD_TYPE = {
  BYTE: 0,
  CHAR: 1,
  WORD: 2,
  SHORT: 3,
  DWORD: 4,
  INT: 5,
  FLOAT: 8,
  CEXOSTRING: 10,
  RESREF: 11,
  CEXOLOCSTRING: 12,
  VOID: 13,
  STRUCT: 14,
  LIST: 15
};

const AREA_RESREF = "cdx_mapflat01";
const AREA_NAME = "Ostatnie Miasto - Port, Mieszkanie Kartografa";
const BASE_AREA_RESREF =
  process.env.AURORA_LAST_CITY_APARTMENT_BASE_AREA_RESREF ?? "wnd_tmplt_flat_5";
const START_LOCATION = {
  x: 15,
  y: 10,
  z: 0,
  dirX: 0,
  dirY: -1
};
const GIT_GIC_LIST_LABELS = [
  "Creature List",
  "Door List",
  "Encounter List",
  "List",
  "Placeable List",
  "SoundList",
  "StoreList",
  "TriggerList",
  "WaypointList"
];
const GIC_COMMENT_STRUCT_TYPE_BY_LABEL = new Map([
  ["Door List", 8],
  ["Placeable List", 9]
]);

const backendRoot = resolve(import.meta.dirname, "..");
const outputRoot = resolve(
  backendRoot,
  "docs",
  "aurora-reverse",
  "artifacts",
  "last-city-apartment-area"
);
const criticalFailureRegistryPath = join(outputRoot, "toolset-critical-failures.json");
const dryRun = process.env.AURORA_LAST_CITY_APARTMENT_DRY_RUN === "1";
const apartmentVariant = process.env.AURORA_LAST_CITY_APARTMENT_VARIANT ?? "full";
const updateModuleEntry = process.env.AURORA_LAST_CITY_APARTMENT_SET_MODULE_ENTRY === "1";
const rawClone = process.env.AURORA_LAST_CITY_APARTMENT_RAW_CLONE === "1";
const allowFullModuleConceptTilemapTarget =
  process.env.AURORA_LAST_CITY_ALLOW_FULL_MODULE_CONCEPT_TILEMAP_TARGET === "1";
const conceptTilemapLabMaxBytes = 10 * 1024 * 1024;
const targetModulePathOverride = process.env.AURORA_LAST_CITY_APARTMENT_MODULE_PATH
  ? resolve(process.env.AURORA_LAST_CITY_APARTMENT_MODULE_PATH)
  : null;
const mistakenTargetModulePathOverride =
  process.env.AURORA_LAST_CITY_APARTMENT_TARGET_MODULE ??
  process.env.AURORA_LAST_CITY_APARTMENT_TARGET_MODULE_PATH ??
  null;
if (!targetModulePathOverride && mistakenTargetModulePathOverride) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_TARGET_MODULE(_PATH) is not supported. Use AURORA_LAST_CITY_APARTMENT_MODULE_PATH; refusing to fall back to the default module target."
  );
}
const sourceModulePathOverride = process.env.AURORA_LAST_CITY_APARTMENT_SOURCE_MODULE_PATH
  ? resolve(process.env.AURORA_LAST_CITY_APARTMENT_SOURCE_MODULE_PATH)
  : null;
const mistakenSourceModulePathOverride = process.env.AURORA_LAST_CITY_APARTMENT_SOURCE_MODULE ?? null;
if (!sourceModulePathOverride && mistakenSourceModulePathOverride) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_SOURCE_MODULE is not supported. Use AURORA_LAST_CITY_APARTMENT_SOURCE_MODULE_PATH so the source module is explicit."
  );
}
const safeLastCityLabHakList = [
  "lc_2da",
  "lc_hd_plcbls",
  "lc_placeable",
  "lc_placeable_cust",
  "q_tilesets",
  "q_!tilesets",
  "medieval",
  "medievalrural",
  "+sic_builder",
  "+sic_winter",
  "+sic11",
  "cep3_core0",
  "cep3_core1",
  "cep3_core2",
  "cep3_tiles",
  "nwic_placeables",
  "q_placeables",
  "witcher",
  "witcher2"
];
const safeLastCityHakProfileEnabled =
  process.env.AURORA_LAST_CITY_APARTMENT_SAFE_HAK_PROFILE !== "0";
const explicitSourceHakListOverride = parseDelimitedEnvList(
  process.env.AURORA_LAST_CITY_APARTMENT_SOURCE_HAK_LIST
);
const sourceHakListOverride =
  explicitSourceHakListOverride ??
  (safeLastCityHakProfileEnabled ? safeLastCityLabHakList : null);
const nativeTemplateDir = process.env.AURORA_LAST_CITY_APARTMENT_NATIVE_TEMPLATE_DIR
  ? resolve(process.env.AURORA_LAST_CITY_APARTMENT_NATIVE_TEMPLATE_DIR)
  : null;
const nativeTemplateResref = process.env.AURORA_LAST_CITY_APARTMENT_NATIVE_TEMPLATE_RESREF ?? "area002";
const clearDoors =
  process.env.AURORA_LAST_CITY_APARTMENT_CLEAR_DOORS === "1" ||
  apartmentVariant === "shell" ||
  apartmentVariant === "empty-shell";
const preserveTileLights = process.env.AURORA_LAST_CITY_APARTMENT_PRESERVE_TILE_LIGHTS === "1";
const conceptWarmLighting = process.env.AURORA_LAST_CITY_APARTMENT_CONCEPT_WARM_LIGHTING === "1";
const conceptMoodLighting = process.env.AURORA_LAST_CITY_APARTMENT_CONCEPT_MOOD_LIGHTING === "1";
const conceptDeepMoodLighting = process.env.AURORA_LAST_CITY_APARTMENT_CONCEPT_DEEP_MOOD_LIGHTING === "1";
if ([conceptWarmLighting, conceptMoodLighting, conceptDeepMoodLighting].filter(Boolean).length > 1) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_CONCEPT_WARM_LIGHTING, AURORA_LAST_CITY_APARTMENT_CONCEPT_MOOD_LIGHTING, and AURORA_LAST_CITY_APARTMENT_CONCEPT_DEEP_MOOD_LIGHTING are mutually exclusive."
  );
}
const readableConceptPass =
  process.env.AURORA_LAST_CITY_APARTMENT_READABLE_CONCEPT_PASS === "1";
const edgeArtifactMaskedFocusPass =
  process.env.AURORA_LAST_CITY_APARTMENT_EDGE_ARTIFACT_MASKED_FOCUS_PASS === "1";
const structuralMassPass =
  process.env.AURORA_LAST_CITY_APARTMENT_STRUCTURAL_MASS_PASS === "1";
const conceptContrastVtPass =
  process.env.AURORA_LAST_CITY_APARTMENT_CONCEPT_CONTRAST_VT_PASS === "1";
const conceptAnchorAlignmentPass =
  process.env.AURORA_LAST_CITY_APARTMENT_CONCEPT_ANCHOR_ALIGNMENT_PASS === "1";
const fastPlanExistingRebalancePass =
  process.env.AURORA_LAST_CITY_APARTMENT_FASTPLAN_EXISTING_REBALANCE_PASS === "1";
const maskedVisualCorrectionPass =
  process.env.AURORA_LAST_CITY_APARTMENT_MASKED_VISUAL_CORRECTION_PASS === "1";
const nHeroSideCabinetPositionPass =
  process.env.AURORA_LAST_CITY_APARTMENT_N_HERO_SIDE_CABINET_POSITION_PASS === "1";
const nwTileFirstLargeSilhouettePass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_TILE_FIRST_LARGE_SILHOUETTE_PASS === "1";
const safeWallVisualTransformPass =
  process.env.AURORA_LAST_CITY_APARTMENT_SAFE_WALL_VISUAL_TRANSFORM_PASS === "1";
const nwExistingVtMaterialPivotPass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_EXISTING_VT_MATERIAL_PIVOT_PASS === "1";
const nwSouthwestFurnitureSilhouettePass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_SOUTHWEST_FURNITURE_SILHOUETTE_PASS === "1";
const nwNonVtRugFloorPass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_NON_VT_RUG_FLOOR_PASS === "1";
const nwExistingRugAlignPass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_EXISTING_RUG_ALIGN_PASS === "1";
const nwCouchBenchMaterialPass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_COUCH_BENCH_MATERIAL_PASS === "1";
const nwWornRugShrinkVisualTransformPass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_WORN_RUG_SHRINK_VISUAL_TRANSFORM_PASS === "1";
if (nwWornRugShrinkVisualTransformPass) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_NW_WORN_RUG_SHRINK_VISUAL_TRANSFORM_PASS is retired: tilemap73 triggered a Toolset access violation during module load."
  );
}
const nwWornRugRedCarpetTemplatePass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_WORN_RUG_RED_CARPET_TEMPLATE_PASS === "1";
if (nwWornRugRedCarpetTemplatePass) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_NW_WORN_RUG_RED_CARPET_TEMPLATE_PASS is retired: tilemap74 triggered a Toolset access violation during module load."
  );
}
const nwRightScreenVisualTransformPass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_RIGHT_SCREEN_VISUAL_TRANSFORM_PASS === "1";
if (nwRightScreenVisualTransformPass) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_NW_RIGHT_SCREEN_VISUAL_TRANSFORM_PASS is retired: tilemap72 was blocked by concept-map as repeat right-screen growth before Toolset proof."
  );
}
const nwRoundTableVisualTransformPass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_ROUND_TABLE_VISUAL_TRANSFORM_PASS === "1";
if (nwRoundTableVisualTransformPass) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_NW_ROUND_TABLE_VISUAL_TRANSFORM_PASS is retired: tilemap66 triggered a Toolset access violation during readonly capture."
  );
}
const nwRoundTableTemplatePass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_ROUND_TABLE_TEMPLATE_PASS === "1";
const nwDeepRugMaterialPass =
  process.env.AURORA_LAST_CITY_APARTMENT_NW_DEEP_RUG_MATERIAL_PASS === "1";
if (nwDeepRugMaterialPass) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_NW_DEEP_RUG_MATERIAL_PASS is retired: tilemap68 triggered a Toolset access violation during module load."
  );
}
const conceptSwDarkMassPass =
  process.env.AURORA_LAST_CITY_APARTMENT_CONCEPT_SW_DARK_MASS_PASS === "1";
if (conceptSwDarkMassPass) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_CONCEPT_SW_DARK_MASS_PASS is retired: tilemap45 triggered a Toolset access violation during capture."
  );
}
const removeConceptStoneSpine =
  process.env.AURORA_LAST_CITY_APARTMENT_REMOVE_CONCEPT_STONE_SPINE === "1";
const shrinkConceptStoneSpine =
  process.env.AURORA_LAST_CITY_APARTMENT_SHRINK_CONCEPT_STONE_SPINE !== "0";
const conceptStoneSpineScale = numberFromEnv(
  "AURORA_LAST_CITY_APARTMENT_CONCEPT_STONE_SPINE_SCALE",
  0.42
);
const conceptStoneSpineScaleY = numberFromEnv(
  "AURORA_LAST_CITY_APARTMENT_CONCEPT_STONE_SPINE_SCALE_Y",
  0.48
);
if (conceptStoneSpineScale <= 0 || conceptStoneSpineScaleY <= 0) {
  throw new Error(
    "AURORA_LAST_CITY_APARTMENT_CONCEPT_STONE_SPINE_SCALE and AURORA_LAST_CITY_APARTMENT_CONCEPT_STONE_SPINE_SCALE_Y must be positive."
  );
}
const readableSafeMoodTemplates = new Set([
  "nwic026",
  "q_278",
  "witcher390",
  "witcher414",
  "witcher418",
  "witcher840",
  "witcher939",
  "witcher984",
  "witcher987",
  "zep_tapstry_001",
  "zep_throwrug054",
  "zep_throwrug058"
]);
const tileLayoutOverrideIds = parseIntegerEnvList("AURORA_LAST_CITY_APARTMENT_TILE_IDS");
const tileLayoutOverrideOrientations = parseIntegerEnvList(
  "AURORA_LAST_CITY_APARTMENT_TILE_ORIENTATIONS"
);
const tileLayoutOverrideNote = process.env.AURORA_LAST_CITY_APARTMENT_TILE_LAYOUT_NOTE ?? null;
if (isKnownUnsafeTileLayoutOverride(tileLayoutOverrideIds, tileLayoutOverrideOrientations)) {
  throw new Error(
    "Refusing known unsafe tile layout override: tilemap44 mixed enon_house_6 crop triggered a Toolset access violation during capture."
  );
}
const areaDimensionOverride = {
  width: integerFromEnv("AURORA_LAST_CITY_APARTMENT_AREA_WIDTH", null),
  height: integerFromEnv("AURORA_LAST_CITY_APARTMENT_AREA_HEIGHT", null)
};
const placeablePlacementTransform = {
  offsetX: numberFromEnv("AURORA_LAST_CITY_APARTMENT_PLACEABLE_OFFSET_X", 0),
  offsetY: numberFromEnv("AURORA_LAST_CITY_APARTMENT_PLACEABLE_OFFSET_Y", 0),
  offsetZ: numberFromEnv("AURORA_LAST_CITY_APARTMENT_PLACEABLE_OFFSET_Z", 0),
  scaleX: numberFromEnv("AURORA_LAST_CITY_APARTMENT_PLACEABLE_SCALE_X", 1),
  scaleY: numberFromEnv("AURORA_LAST_CITY_APARTMENT_PLACEABLE_SCALE_Y", 1),
  scaleZ: numberFromEnv("AURORA_LAST_CITY_APARTMENT_PLACEABLE_SCALE_Z", 1)
};

function parseDelimitedEnvList(value) {
  if (!value) {
    return null;
  }
  const entries = value
    .split(/[|,;]/u)
    .map((entry) => entry.trim())
    .filter(Boolean);
  return entries.length > 0 ? entries : null;
}

function parseIntegerEnvList(name) {
  const raw = process.env[name];
  if (!raw) {
    return null;
  }
  const values = raw
    .split(/[|,;]/u)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const value = Number(entry);
      if (!Number.isInteger(value)) {
        throw new Error(`${name} entries must be integers, got ${JSON.stringify(entry)}.`);
      }
      return value;
    });
  return values.length > 0 ? values : null;
}

function isKnownUnsafeTileLayoutOverride(ids, orientations) {
  const unsafeLayouts = [
    {
      ids: [280, 303, 280, 72, 86, 73],
      orientations: [0, 0, 3, 3, 0, 1],
      reason: "tilemap44-mixedtile"
    }
  ];
  return unsafeLayouts.some(
    (layout) => sameNumberList(ids, layout.ids) && sameNumberList(orientations, layout.orientations)
  );
}

function sameNumberList(left, right) {
  if (!left || !right || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function normalizeHakName(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\.hak$/u, "");
}

function numberFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    throw new Error(`${name} must be a finite number, got ${JSON.stringify(raw)}.`);
  }
  return numeric;
}

function integerFromEnv(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") {
    return fallback;
  }
  const numeric = Number(raw);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    throw new Error(`${name} must be a positive integer, got ${JSON.stringify(raw)}.`);
  }
  return numeric;
}

function applyPlaceablePlacementTransform(spec) {
  return {
    x: spec.x * placeablePlacementTransform.scaleX + placeablePlacementTransform.offsetX,
    y: spec.y * placeablePlacementTransform.scaleY + placeablePlacementTransform.offsetY,
    z: (spec.z ?? 0) * placeablePlacementTransform.scaleZ + placeablePlacementTransform.offsetZ
  };
}

function getReadableConceptDropReason(spec) {
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  const template = String(spec.template ?? "").toLowerCase();
  const sourceTag = String(spec.tag ?? "").toLowerCase();
  const isSafeReadableMoodTemplate = readableSafeMoodTemplates.has(template);
  const isAllowedStructuralFloorMotif = tag.includes("concept_stone_spine");
  if (removeConceptStoneSpine && isAllowedStructuralFloorMotif) {
    return "stone-spine-image-delta-experiment";
  }
  const isHeavyFullHakOverlay =
    [
      "zep_splat007",
      "zep_splat003",
      "ke_plama001",
      "ke_kalurza001",
      "q_314"
    ].includes(template) ||
    ["zep_splat007", "zep_splat003", "ke_plama001", "ke_kalurza001", "q_floor_20"].includes(
      sourceTag
    );
  if (isHeavyFullHakOverlay) {
    return "heavy-overlay";
  }
  if (
    !isAllowedStructuralFloorMotif &&
    (["q_148", "q_154", "zep_house001"].includes(template) ||
      tag.includes("cobble") ||
      tag.includes("stone_floor") ||
      tag.includes("dirty_stone_slab"))
  ) {
    return "floor-overlay-density";
  }
  if (tag.includes("readable_saturation_entry_rug")) {
    return "entry-rug-density";
  }
  if (tag.includes("readable_saturation_hero_rug")) {
    return "hero-rug-density";
  }
  if (
    tag.includes("readable_lower_center_green_carpet") ||
    tag.includes("readable_lower_center_red_carpet")
  ) {
    return "lower-hall-rug-density";
  }
  const isDarkShortcut =
    /_final$/u.test(tag) ||
    tag.includes("shadow") ||
    tag.includes("stain") ||
    tag.includes("soot") ||
    tag.includes("grime") ||
    tag.includes("puddle") ||
    tag.includes("wear") ||
    tag.includes("splotch") ||
    tag.includes("luma_shadow") ||
    tag.includes("shadow_floor") ||
    tag.includes("dark_mass") ||
    tag.includes("dark_floor") ||
    tag.includes("dark_runner") ||
    tag.includes("deep_runner") ||
    tag.includes("dark_rug") ||
    tag.includes("deep_rug") ||
    tag.includes("dark_grime") ||
    tag.includes("deep_soot") ||
    tag.includes("deep_shadow") ||
    tag.includes("floor_shadow") ||
    tag.includes("shadow_mass") ||
    tag.includes("under_bed_shadow") ||
    tag === "center_dark_splotch" ||
    tag === "storage_floor_dark_mass_b";
  return isDarkShortcut && !isSafeReadableMoodTemplate ? "dark-shortcut" : null;
}

function applyReadableConceptPass(storyPlaceables) {
  const removedDarkOverlayTags = [];
  const kept = storyPlaceables.flatMap((spec) => {
    const alignedSpec = applyMaskedVisualCorrection(
      applyFastPlanExistingRebalance(applyConceptAnchorAlignment(spec))
    );
    const nMaterialSpec = applyNHeroSideCabinetPositionPass(alignedSpec);
    const alignSpec = applyNwExistingRugAlignPass(nMaterialSpec);
    const floorSpec = applyNwNonVtRugFloorPass(alignSpec);
    const couchSpec = applyNwCouchBenchMaterialPass(floorSpec);
    const materialSpec = applyNwDeepRugMaterialPass(applyNwRoundTableTemplatePass(couchSpec));
    const visualSpec = applySafeWallVisualTransform(materialSpec);
    const pivotSpec = applyNwExistingVtMaterialPivot(visualSpec);
    const roundTableSpec = applyNwRoundTableVisualTransform(pivotSpec);
    const wornRugSpec = applyNwWornRugShrinkVisualTransformPass(roundTableSpec);
    const redCarpetSpec = applyNwWornRugRedCarpetTemplatePass(wornRugSpec);
    const rightScreenSpec = applyNwRightScreenVisualTransformPass(redCarpetSpec);
    const dropReason = getReadableConceptDropReason(rightScreenSpec);
    if (dropReason) {
      removedDarkOverlayTags.push(`${String(rightScreenSpec.tagSuffix ?? "")} [${dropReason}]`);
    }
    return dropReason ? [] : [rightScreenSpec];
  });
  const readableAnchorsRaw = [
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 15.0, y: 15.05, z: 0.24, bearingDegrees: 90, tagSuffix: "readable_hero_red_carpet", visualTransform: vt(1.38, { scaleY: 1.2 }) },
    { from: "enon_house_6", template: "zep_ci_tbl_002", tag: "ZEP_CI_TBL_002", x: 15.0, y: 14.95, z: 0.08, bearingDegrees: 90, tagSuffix: "readable_hero_map_table", visualTransform: vt(1.18) },
    { from: "enon_shop_1", template: "nwic245", tag: "nwic_map_8", x: 15.0, y: 14.95, z: 1.13, bearingDegrees: 8, tagSuffix: "readable_hero_large_table_map", visualTransform: vt(1.68, { scaleY: 1.18 }) },
    { from: "guild_merchants", template: "ke_mapa001", tag: "ke_mapa001", x: 15.05, y: 14.7, z: 1.16, bearingDegrees: 18, tagSuffix: "readable_hero_table_map_overlay", visualTransform: vt(1.42, { scaleY: 1.16 }) },
    { from: "guild_merchants", template: "ke_papier014", tag: "ke_papier014", x: 13.65, y: 14.35, z: 1.15, bearingDegrees: 334, tagSuffix: "readable_hero_left_papers", visualTransform: vt(1.08) },
    { from: "guild_merchants", template: "ke_papier010", tag: "ke_papier010", x: 16.45, y: 14.35, z: 1.15, bearingDegrees: 32, tagSuffix: "readable_hero_right_papers", visualTransform: vt(1.08) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 12.65, y: 16.35, z: 1.05, bearingDegrees: 0, tagSuffix: "readable_hero_warm_candle_w", visualTransform: vt(1.1) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 17.35, y: 16.35, z: 1.05, bearingDegrees: 0, tagSuffix: "readable_hero_warm_candle_e", visualTransform: vt(1.1) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 12.5, y: 8.0, z: 0.24, bearingDegrees: 90, tagSuffix: "readable_lower_center_stone_w", visualTransform: vt(1.08) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 15.0, y: 8.0, z: 0.24, bearingDegrees: 90, tagSuffix: "readable_lower_center_stone_c", visualTransform: vt(1.08) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 17.5, y: 8.0, z: 0.24, bearingDegrees: 90, tagSuffix: "readable_lower_center_stone_e", visualTransform: vt(1.08) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 12.5, y: 5.6, z: 0.3, bearingDegrees: 90, tagSuffix: "readable_lower_entry_stone_w", visualTransform: vt(1.12) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 15.0, y: 5.6, z: 0.3, bearingDegrees: 90, tagSuffix: "readable_lower_entry_stone_c", visualTransform: vt(1.12) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 17.5, y: 5.6, z: 0.3, bearingDegrees: 90, tagSuffix: "readable_lower_entry_stone_e", visualTransform: vt(1.12) },
    { from: "enon_house_1", template: "zep_throwrug054", tag: "ZEP_THROWRUG054", x: 15.0, y: 6.05, z: 0.34, bearingDegrees: 90, tagSuffix: "readable_entry_runner", visualTransform: vt(1.36, { scaleY: 1.2 }) },
    { from: "enon_house_6", template: "nwic026", tag: "nwic_carpet_9", x: 15.0, y: 8.15, z: 0.35, bearingDegrees: 90, tagSuffix: "readable_lower_center_green_carpet", visualTransform: vt(1.24, { scaleY: 1.08 }) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 15.0, y: 8.55, z: 0.38, bearingDegrees: 90, tagSuffix: "readable_lower_center_red_carpet", visualTransform: vt(1.34, { scaleY: 1.12 }) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 12.55, y: 8.95, z: 1.05, bearingDegrees: 0, tagSuffix: "readable_lower_center_candle_w", visualTransform: vt(1.18) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 17.45, y: 8.95, z: 1.05, bearingDegrees: 0, tagSuffix: "readable_lower_center_candle_e", visualTransform: vt(1.18) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 12.5, y: 14.9, z: 0.2, bearingDegrees: 90, tagSuffix: "readable_concept_stone_spine_n_w", visualTransform: vt(0.78, { scaleY: 0.86 }) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 15.0, y: 14.9, z: 0.2, bearingDegrees: 90, tagSuffix: "readable_concept_stone_spine_n_c", visualTransform: vt(0.78, { scaleY: 0.86 }) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 17.5, y: 14.9, z: 0.2, bearingDegrees: 90, tagSuffix: "readable_concept_stone_spine_n_e", visualTransform: vt(0.78, { scaleY: 0.86 }) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 12.5, y: 7.25, z: 0.24, bearingDegrees: 90, tagSuffix: "readable_concept_stone_spine_s_w", visualTransform: vt(0.82, { scaleY: 0.9 }) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 15.0, y: 7.25, z: 0.24, bearingDegrees: 90, tagSuffix: "readable_concept_stone_spine_s_c", visualTransform: vt(0.82, { scaleY: 0.9 }) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 17.5, y: 7.25, z: 0.24, bearingDegrees: 90, tagSuffix: "readable_concept_stone_spine_s_e", visualTransform: vt(0.82, { scaleY: 0.9 }) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 5.2, y: 15.0, z: 0.22, bearingDegrees: 90, tagSuffix: "readable_study_red_carpet", visualTransform: vt(1.34, { scaleY: 1.14 }) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 4.3, y: 17.35, z: 1.1, bearingDegrees: 0, tagSuffix: "readable_study_desk_light", visualTransform: vt(1.22) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 7.9, y: 17.3, z: 1.08, bearingDegrees: 0, tagSuffix: "readable_study_shelf_warm_light", visualTransform: vt(1.16) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 25.6, y: 15.0, z: 0.22, bearingDegrees: 90, tagSuffix: "readable_bedroom_red_carpet", visualTransform: vt(1.32, { scaleY: 1.16 }) },
    { from: "mtt_hire_rch_1", template: "nwic004", tag: "nwic_bed_4", x: 26.35, y: 16.05, z: 0.08, bearingDegrees: 270, tagSuffix: "readable_bedroom_large_bed", visualTransform: vt(1.25, { scaleY: 1.35 }) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 27.9, y: 16.1, z: 1.05, bearingDegrees: 0, tagSuffix: "readable_bedroom_bed_light", visualTransform: vt(1.2) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 22.4, y: 17.4, z: 1.08, bearingDegrees: 0, tagSuffix: "readable_bedroom_wardrobe_warm_light", visualTransform: vt(1.16) },
    { from: "mtt_hire_rch_1", template: "witcher418", tag: "witcher_carpet_7", x: 5.1, y: 5.0, z: 0.2, bearingDegrees: 0, tagSuffix: "readable_utility_warm_carpet", visualTransform: vt(1.32, { scaleY: 1.1 }) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 2.7, y: 6.7, z: 1.0, bearingDegrees: 0, tagSuffix: "readable_utility_wall_warm_light", visualTransform: vt(1.16) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 25.6, y: 4.05, z: 0.2, bearingDegrees: 180, tagSuffix: "readable_storage_red_carpet", visualTransform: vt(1.26, { scaleY: 1.1 }) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 28.0, y: 3.2, z: 1.03, bearingDegrees: 0, tagSuffix: "readable_storage_warm_light", visualTransform: vt(1.18) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 23.0, y: 4.8, z: 1.03, bearingDegrees: 0, tagSuffix: "readable_storage_front_warm_light", visualTransform: vt(1.14) },

    { from: "enon_house_1", template: "witcher939", tag: "witcher_wall_1", x: 10.55, y: 15.05, z: 0.02, bearingDegrees: 90, tagSuffix: "readable_concept_left_center_wall_weight", visualTransform: vt(1.38, { scaleY: 1.34 }) },
    { from: "mtt_hire_rch_1", template: "witcher939", tag: "witcher_wall_1", x: 19.45, y: 15.05, z: 0.02, bearingDegrees: 270, tagSuffix: "readable_concept_right_center_wall_weight", visualTransform: vt(1.38, { scaleY: 1.34 }) },
    { from: "enon_house_1", template: "witcher939", tag: "witcher_wall_1", x: 10.55, y: 10.9, z: 0.02, bearingDegrees: 90, tagSuffix: "readable_concept_left_lower_wall_weight", visualTransform: vt(1.32, { scaleY: 1.28 }) },
    { from: "mtt_hire_rch_1", template: "witcher939", tag: "witcher_wall_1", x: 19.45, y: 10.9, z: 0.02, bearingDegrees: 270, tagSuffix: "readable_concept_right_lower_wall_weight", visualTransform: vt(1.32, { scaleY: 1.28 }) },
    { from: "enon_house_6", template: "q_278", tag: "q_tapestry", x: 1.15, y: 15.8, z: 0.02, bearingDegrees: 90, tagSuffix: "readable_concept_study_left_hanging_textile", visualTransform: vt(1.22, { scaleY: 1.36 }) },
    { from: "guild_merchants", template: "zep_tapstry_001", tag: "ZEP_TAPSTRY_001", x: 28.85, y: 15.35, z: 0.02, bearingDegrees: 270, tagSuffix: "readable_concept_bedroom_right_hanging_textile", visualTransform: vt(1.22, { scaleY: 1.34 }) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 15.0, y: 15.0, z: 0.5, bearingDegrees: 90, tagSuffix: "readable_concept_hero_rich_table_rug", visualTransform: vt(1.92, { scaleY: 1.58 }) },
    { from: "mtt_hire_rch_1", template: "witcher418", tag: "witcher_carpet_7", x: 15.0, y: 8.0, z: 0.5, bearingDegrees: 90, tagSuffix: "readable_concept_lower_rich_runner", visualTransform: vt(1.72, { scaleY: 1.54 }) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 5.25, y: 15.0, z: 0.5, bearingDegrees: 90, tagSuffix: "readable_concept_study_deep_red_zone", visualTransform: vt(1.58, { scaleY: 1.36 }) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 25.65, y: 15.15, z: 0.5, bearingDegrees: 90, tagSuffix: "readable_concept_bedroom_deep_red_zone", visualTransform: vt(1.56, { scaleY: 1.38 }) },
    { from: "guild_merchants", template: "bookpiles001", tag: "BookPiles", x: 14.15, y: 15.25, z: 1.18, bearingDegrees: 36, tagSuffix: "readable_concept_hero_table_book_mound_w", visualTransform: vt(0.92) },
    { from: "guild_merchants", template: "bookpiles001", tag: "BookPiles", x: 15.9, y: 14.65, z: 1.18, bearingDegrees: 326, tagSuffix: "readable_concept_hero_table_book_mound_e", visualTransform: vt(0.9) },
    { from: "hx_library", template: "q_241", tag: "q_scroll", x: 13.25, y: 13.1, z: 0.18, bearingDegrees: 78, tagSuffix: "readable_concept_hero_floor_scrolls_w", visualTransform: vt(1.14) },
    { from: "hx_library", template: "q_241", tag: "q_scroll", x: 16.75, y: 13.1, z: 0.18, bearingDegrees: 282, tagSuffix: "readable_concept_hero_floor_scrolls_e", visualTransform: vt(1.14) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 11.25, y: 17.7, z: 1.12, bearingDegrees: 0, tagSuffix: "readable_concept_left_chart_wall_light", visualTransform: vt(1.18) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 18.75, y: 17.7, z: 1.12, bearingDegrees: 0, tagSuffix: "readable_concept_right_chart_wall_light", visualTransform: vt(1.18) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 3.8, y: 14.55, z: 0.42, bearingDegrees: 90, tagSuffix: "readable_saturation_study_rug_w" },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 6.5, y: 14.55, z: 0.42, bearingDegrees: 90, tagSuffix: "readable_saturation_study_rug_e" },
    { from: "mtt_hire_rch_1", template: "witcher418", tag: "witcher_carpet_7", x: 13.4, y: 14.15, z: 0.48, bearingDegrees: 90, tagSuffix: "readable_saturation_hero_rug_w", visualTransform: vt(1.34, { scaleY: 1.24 }) },
    { from: "mtt_hire_rch_1", template: "witcher418", tag: "witcher_carpet_7", x: 16.6, y: 14.15, z: 0.48, bearingDegrees: 90, tagSuffix: "readable_saturation_hero_rug_e", visualTransform: vt(1.34, { scaleY: 1.24 }) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 13.4, y: 7.3, z: 0.43, bearingDegrees: 90, tagSuffix: "readable_saturation_entry_rug_w", visualTransform: vt(1.16, { scaleY: 1.12 }) },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 16.6, y: 7.3, z: 0.43, bearingDegrees: 90, tagSuffix: "readable_saturation_entry_rug_e", visualTransform: vt(1.16, { scaleY: 1.12 }) },
    { from: "mtt_hire_rch_1", template: "witcher418", tag: "witcher_carpet_7", x: 24.1, y: 14.35, z: 0.42, bearingDegrees: 90, tagSuffix: "readable_saturation_bedroom_rug_w" },
    { from: "mtt_hire_rch_1", template: "witcher418", tag: "witcher_carpet_7", x: 27.0, y: 14.35, z: 0.42, bearingDegrees: 90, tagSuffix: "readable_saturation_bedroom_rug_e" },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 24.1, y: 4.8, z: 0.42, bearingDegrees: 180, tagSuffix: "readable_saturation_storage_rug_w" },
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 27.0, y: 4.8, z: 0.42, bearingDegrees: 180, tagSuffix: "readable_saturation_storage_rug_e" }
  ];
  if (edgeArtifactMaskedFocusPass) {
    readableAnchorsRaw.push(
      // Edge-artifact-masked image delta says NW/SE/NE, not SW, are the next real visual gaps.
      { from: "enon_house_1", template: "witcher840", tag: "witcher_screen", x: 1.25, y: 13.65, bearingDegrees: 90, tagSuffix: "edgefocus_study_lower_left_screen", visualTransform: vt(1.1, { scaleY: 1.18 }) },
      { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 8.55, y: 13.05, bearingDegrees: 270, tagSuffix: "edgefocus_study_low_cabinet_weight" },
      { from: "enon_house_1", template: "witcher531", tag: "witcher_fabricbale_4", x: 3.2, y: 12.45, z: 0.08, bearingDegrees: 20, tagSuffix: "edgefocus_study_floor_textile_roll", visualTransform: vt(0.86) },

      { from: "enon_house_6", template: "q_278", tag: "q_tapestry", x: 28.85, y: 7.15, bearingDegrees: 270, tagSuffix: "edgefocus_storage_wall_tapestry", visualTransform: vt(1.08, { scaleY: 1.18 }) },
      { from: "enon_house_1", template: "witcher840", tag: "witcher_screen", x: 21.1, y: 6.85, bearingDegrees: 90, tagSuffix: "edgefocus_storage_left_screen", visualTransform: vt(1.08, { scaleY: 1.12 }) },
      { from: "enon_house_1", template: "witcher531", tag: "witcher_fabricbale_4", x: 24.2, y: 2.55, z: 0.08, bearingDegrees: 18, tagSuffix: "edgefocus_storage_front_textile_roll", visualTransform: vt(0.84) },
      { from: "guild_merchants", template: "bookpiles001", tag: "BookPiles", x: 22.7, y: 7.2, z: 0.78, bearingDegrees: 42, tagSuffix: "edgefocus_storage_manifest_books", visualTransform: vt(0.78) },

      { from: "enon_house_1", template: "witcher840", tag: "witcher_screen", x: 22.0, y: 15.25, bearingDegrees: 90, tagSuffix: "edgefocus_bedroom_left_screen_depth", visualTransform: vt(1.06, { scaleY: 1.14 }) }
    );
  }
  if (structuralMassPass) {
    readableAnchorsRaw.push(
      // Tilemap36 proved small edge clutter is neutral. This pass uses larger safe silhouettes.
      { from: "enon_gang_2", template: "q_052", tag: "q_bookshelf_1", x: 1.55, y: 12.55, bearingDegrees: 90, tagSuffix: "structuralmass_study_lower_bookcase", visualTransform: vt(1.08, { scaleY: 1.18 }) },
      { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 8.45, y: 12.55, bearingDegrees: 270, tagSuffix: "structuralmass_study_lower_cabinet", visualTransform: vt(1.06, { scaleY: 1.12 }) },
      { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 1.05, y: 11.55, bearingDegrees: 90, tagSuffix: "structuralmass_study_left_post", visualTransform: vt(1.1, { scaleY: 1.28 }) },
      { from: "enon_bakery", template: "witcher853", tag: "witcher_shelf_2", x: 8.55, y: 14.15, bearingDegrees: 270, tagSuffix: "structuralmass_study_mid_shelf", visualTransform: vt(1.04, { scaleY: 1.08 }) },

      { from: "mtt_hire_rch_1", template: "nwic041", tag: "nwic_cabin_5", x: 21.25, y: 12.85, bearingDegrees: 90, tagSuffix: "structuralmass_bedroom_lower_wardrobe", visualTransform: vt(1.06, { scaleY: 1.12 }) },

      { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 21.05, y: 3.55, bearingDegrees: 90, tagSuffix: "structuralmass_storage_left_post", visualTransform: vt(1.08, { scaleY: 1.24 }) },
      { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 21.65, y: 5.7, bearingDegrees: 90, tagSuffix: "structuralmass_storage_left_cabinet", visualTransform: vt(1.04, { scaleY: 1.12 }) },
      { from: "mar_house_1", template: "q_125", tag: "q_crate_1", x: 22.0, y: 2.8, bearingDegrees: 74, tagSuffix: "structuralmass_storage_front_crate_a", visualTransform: vt(1.08) },
      { from: "mar_house_1", template: "q_126", tag: "q_crate_2", x: 22.65, y: 3.35, bearingDegrees: 20, tagSuffix: "structuralmass_storage_front_crate_b", visualTransform: vt(1.06) },
      { from: "enon_house_6", template: "q_016", tag: "q_barrel_1", x: 28.55, y: 3.55, bearingDegrees: 0, tagSuffix: "structuralmass_storage_right_barrel", visualTransform: vt(1.08) }
    );
  }
  if (nwTileFirstLargeSilhouettePass) {
    readableAnchorsRaw.push(
      // Fast plan tilemap49: NW is tile_first. Do not move existing anchors
      // or add VT here; test only a small set of large, non-VT silhouettes.
      { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 1.06, y: 11.72, z: 0, bearingDegrees: 90, tagSuffix: "tilefirst_nw_southwest_wall_weight" },
      { from: "enon_house_1", template: "witcher840", tag: "witcher_screen", x: 8.34, y: 15.0, z: 0, bearingDegrees: 270, tagSuffix: "tilefirst_nw_east_screen_weight" },
      { from: "enon_gang_2", template: "q_052", tag: "q_bookshelf_1", x: 1.58, y: 12.58, z: 0, bearingDegrees: 90, tagSuffix: "tilefirst_nw_bookshelf_weight" },
      { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 8.42, y: 13.22, z: 0, bearingDegrees: 270, tagSuffix: "tilefirst_nw_cabinet_weight" }
    );
  }
  if (nwSouthwestFurnitureSilhouettePass) {
    readableAnchorsRaw.push(
      // Visual-intent map after tilemap64: NW_r2c0 needs a real furniture
      // silhouette, not a floor overlay or repeated VT growth.
      { from: "mar_house_1", template: "q_100", tag: "q_chair_6", x: 2.35, y: 12.28, z: 0, bearingDegrees: 135, tagSuffix: "visualintent_nw_southwest_low_chair" }
    );
  }
  if (conceptSwDarkMassPass) {
    readableAnchorsRaw.push(
      // Fixed-crop parity for tilemap42 made SW the worst cell. Use safe
      // vertical/solid silhouettes around the utility room instead of floor
      // overlays, which were the repeated Toolset risk.
      { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 1.05, y: 6.6, bearingDegrees: 90, tagSuffix: "sw_darkmass_left_wall_panel", visualTransform: vt(1.08, { scaleY: 1.24 }) },
      { from: "enon_house_1", template: "witcher840", tag: "witcher_screen", x: 1.35, y: 4.7, bearingDegrees: 90, tagSuffix: "sw_darkmass_hearth_screen", visualTransform: vt(1.08, { scaleY: 1.18 }) },
      { from: "enon_bakery", template: "witcher853", tag: "witcher_shelf_2", x: 1.45, y: 7.35, bearingDegrees: 90, tagSuffix: "sw_darkmass_left_shelf", visualTransform: vt(1.04, { scaleY: 1.08 }) },
      { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 8.55, y: 6.35, bearingDegrees: 270, tagSuffix: "sw_darkmass_right_cabinet", visualTransform: vt(1.04, { scaleY: 1.1 }) },
      { from: "enon_house_6", template: "q_016", tag: "q_barrel_1", x: 8.15, y: 3.05, bearingDegrees: 0, tagSuffix: "sw_darkmass_right_barrel", visualTransform: vt(1.06) },
      { from: "enon_house_6", template: "q_278", tag: "q_tapestry", x: 1.15, y: 8.35, bearingDegrees: 90, tagSuffix: "sw_darkmass_upper_textile", visualTransform: vt(1.05, { scaleY: 1.16 }) },
      { from: "mtt_hire_rch_1", template: "witcher418", tag: "witcher_carpet_7", x: 5.0, y: 4.8, z: 0.44, bearingDegrees: 0, tagSuffix: "sw_darkmass_rich_floor_textile", visualTransform: vt(1.12, { scaleY: 1.05 }) }
    );
  }

  const readableAnchors = readableAnchorsRaw.flatMap((spec) => {
    const tagSuffix = String(spec.tagSuffix ?? "").toLowerCase();
    const shrunkSpec =
      shrinkConceptStoneSpine && tagSuffix.includes("concept_stone_spine")
        ? { ...spec, visualTransform: vt(conceptStoneSpineScale, { scaleY: conceptStoneSpineScaleY }) }
        : spec;
    const contrastSpec = applyConceptContrastVisualTransform(shrunkSpec);
    const placedSpec = applyMaskedVisualCorrection(
      applyFastPlanExistingRebalance(applyConceptAnchorAlignment(contrastSpec))
    );
    const nMaterialSpec = applyNHeroSideCabinetPositionPass(placedSpec);
    const alignSpec = applyNwExistingRugAlignPass(nMaterialSpec);
    const floorSpec = applyNwNonVtRugFloorPass(alignSpec);
    const couchSpec = applyNwCouchBenchMaterialPass(floorSpec);
    const materialSpec = applyNwDeepRugMaterialPass(applyNwRoundTableTemplatePass(couchSpec));
    const nextSpec = applySafeWallVisualTransform(materialSpec);
    const pivotSpec = applyNwExistingVtMaterialPivot(nextSpec);
    const roundTableSpec = applyNwRoundTableVisualTransform(pivotSpec);
    const wornRugSpec = applyNwWornRugShrinkVisualTransformPass(roundTableSpec);
    const redCarpetSpec = applyNwWornRugRedCarpetTemplatePass(wornRugSpec);
    const rightScreenSpec = applyNwRightScreenVisualTransformPass(redCarpetSpec);
    const dropReason = getReadableConceptDropReason(rightScreenSpec);
    if (dropReason) {
      removedDarkOverlayTags.push(`${String(rightScreenSpec.tagSuffix ?? "")} [${dropReason}]`);
      return [];
    }
    return [rightScreenSpec];
  });

  return {
    placeables: [...kept, ...readableAnchors],
    removedDarkOverlayCount: removedDarkOverlayTags.length,
    removedDarkOverlayTags: removedDarkOverlayTags.slice(0, 40),
    addedReadableAnchorCount: readableAnchors.length
  };
}

function applyConceptContrastVisualTransform(spec) {
  if (!conceptContrastVtPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  const transforms = new Map([
    ["readable_hero_large_table_map", vt(1.78, { scaleY: 1.24 })],
    ["readable_hero_table_map_overlay", vt(1.5, { scaleY: 1.22 })],
    ["readable_concept_hero_rich_table_rug", vt(2.08, { scaleY: 1.74 })],
    ["readable_concept_lower_rich_runner", vt(1.82, { scaleY: 1.62 })],
    ["readable_concept_study_deep_red_zone", vt(1.66, { scaleY: 1.44 })],
    ["readable_concept_bedroom_deep_red_zone", vt(1.64, { scaleY: 1.46 })],
    ["readable_concept_study_left_hanging_textile", vt(1.32, { scaleY: 1.5 })],
    ["readable_concept_bedroom_right_hanging_textile", vt(1.32, { scaleY: 1.5 })],
    ["readable_lower_center_red_carpet", vt(1.42, { scaleY: 1.2 })],
    ["readable_storage_red_carpet", vt(1.34, { scaleY: 1.18 })]
  ]);
  if (tag.includes("readable_concept_stone_spine")) {
    // Tilemap41 showed that scaling flat structural spine placeables can poison
    // the Toolset area viewer. Keep those on the proven shrink pass.
    return spec;
  }
  if (tag.includes("wall_weight")) {
    // Wall-weight contrast now belongs in real placement/Adjust Location or a
    // separate disposable proof, not in the broad VT contrast pass.
    return spec;
  }
  const visualTransform = transforms.get(tag);
  return visualTransform ? { ...spec, visualTransform } : spec;
}

function applySafeWallVisualTransform(spec) {
  if (!safeWallVisualTransformPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  const transforms = new Map([
    ["readable_concept_left_center_wall_weight", vt(1.42, { scaleY: 1.4 })],
    ["readable_concept_right_center_wall_weight", vt(1.42, { scaleY: 1.4 })],
    ["readable_concept_left_lower_wall_weight", vt(1.42, { scaleY: 1.4 })],
    ["readable_concept_right_lower_wall_weight", vt(1.42, { scaleY: 1.4 })],
    ["hero_left_wood_panel_lock", vt(1.28, { scaleY: 1.34 })],
    ["hero_right_wood_panel_lock", vt(1.28, { scaleY: 1.34 })],
    ["hero_left_lower_wood_panel_parity", vt(1.26, { scaleY: 1.32 })],
    ["hero_right_lower_wood_panel_parity", vt(1.26, { scaleY: 1.32 })],
    ["entry_left_heavy_post_parity", vt(1.24, { scaleY: 1.3 })],
    ["entry_right_heavy_post_parity", vt(1.24, { scaleY: 1.3 })],
    ["hero_left_mid_dark_post_final", vt(1.28, { scaleY: 1.34 })],
    ["hero_right_mid_dark_post_final", vt(1.28, { scaleY: 1.34 })],
    ["study_lower_left_wall_mass_final", vt(1.3, { scaleY: 1.36 })],
    ["bedroom_upper_right_wall_mass_final", vt(1.28, { scaleY: 1.34 })]
  ]);
  const visualTransform = transforms.get(tag);
  return visualTransform ? { ...spec, visualTransform } : spec;
}

function applyNwExistingVtMaterialPivot(spec) {
  if (!nwExistingVtMaterialPivotPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  const transforms = new Map([
    // Scorecard tilemap58: NW is still too bright in middle-center,
    // south-west, and middle-east. Keep positions/Bearing/tile layout stable
    // and only reshape existing NW material/silhouette VT.
    ["study_lounge_luma_shadow_final", vt(1.28, { scaleY: 1.18 })],
    ["readable_study_red_carpet", vt(1.42, { scaleY: 1.22 })],
    ["readable_concept_study_deep_red_zone", vt(1.64, { scaleY: 1.42 })],
    ["study_right_shadow_screen", vt(1.34, { scaleY: 1.48 })],
    ["study_lower_left_wall_mass_final", vt(1.18, { scaleY: 1.24 })]
  ]);
  const visualTransform = transforms.get(tag);
  return visualTransform ? { ...spec, visualTransform } : spec;
}

function applyNwRoundTableVisualTransform(spec) {
  if (!nwRoundTableVisualTransformPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  if (tag !== "round_planning_table") {
    return spec;
  }
  // Tilemap58 scorecard: NW_r1c1 is too bright and the round table reads as a
  // large pale disk. Shrink only this existing object; no tile, anchor, or
  // lighting changes are mixed into this candidate.
  return { ...spec, visualTransform: vt(0.72) };
}

function applyNwRoundTableTemplatePass(spec) {
  if (!nwRoundTableTemplatePass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  if (tag !== "round_planning_table") {
    return spec;
  }
  // Tilemap67 candidate: replace the pale round table material/silhouette with
  // an existing Last City work-table prototype. Keep coordinates, bearing,
  // lighting, tile layout, and all surrounding clutter unchanged.
  return {
    ...spec,
    from: "enon_house_6",
    template: "zep_tblcltc_002",
    tag: "ZEP_TBLCLTC_002",
    visualTransform: undefined
  };
}

function applyNwNonVtRugFloorPass(spec) {
  if (!nwNonVtRugFloorPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  const placements = new Map([
    [
      "readable_saturation_study_rug_w",
      {
        x: 4.28,
        y: 14.82,
        z: 0.18,
        bearingDegrees: 90
      }
    ],
    [
      "readable_saturation_study_rug_e",
      {
        x: 6.12,
        y: 14.82,
        z: 0.18,
        bearingDegrees: 90
      }
    ]
  ]);
  const placement = placements.get(tag);
  if (!placement) {
    return spec;
  }
  // Tilemap69 candidate: keep the NW table, tile, lighting, and all VT stable.
  // Only settle two existing non-VT saturation rugs closer to the floor.
  return {
    ...spec,
    ...placement,
    visualTransform: undefined
  };
}

function applyNwExistingRugAlignPass(spec) {
  if (!nwExistingRugAlignPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  if (tag !== "study_worn_rug") {
    return spec;
  }
  // Tilemap71 candidate: concept map target for NW middle-center points at this
  // existing rug. Keep its template, VT, bearing, tile, and lighting stable.
  return {
    ...spec,
    x: 5.0,
    y: 15.0,
    z: spec.z ?? 0.02
  };
}

function applyNwCouchBenchMaterialPass(spec) {
  if (!nwCouchBenchMaterialPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  if (tag !== "study_worn_couch") {
    return spec;
  }
  // Tilemap58 visual planner: NW still needs a darker lounge silhouette, but
  // table/rug/screen VT families are blocked. Replace one existing couch motif
  // with a concept-approved bench template; keep x/y/z, Bearing, tile layout,
  // area lighting, and every VisualTransform stable.
  return {
    ...spec,
    from: "enon_house_1",
    template: "q_032",
    tag: "q_bench",
    visualTransform: undefined
  };
}

function applyNwWornRugShrinkVisualTransformPass(spec) {
  if (!nwWornRugShrinkVisualTransformPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  if (tag !== "study_worn_rug") {
    return spec;
  }
  // Tilemap73 candidate: reduce one pale NW worn-rug rectangle only. Keep
  // position, Bearing, template, tile layout, lighting, and every other VT stable.
  return {
    ...spec,
    visualTransform: vt(0.84, { scaleY: 0.78 })
  };
}

function applyNwWornRugRedCarpetTemplatePass(spec) {
  if (!nwWornRugRedCarpetTemplatePass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  if (tag !== "study_worn_rug") {
    return spec;
  }
  // Tilemap74 candidate: replace the pale worn rug material with an existing
  // Last City red carpet. Keep x/y/z, Bearing, VT scale, tile layout, and lighting.
  return {
    ...spec,
    from: "enon_house_1",
    template: "witcher414",
    tag: "witcher_carpet_3"
  };
}

function applyNwRightScreenVisualTransformPass(spec) {
  if (!nwRightScreenVisualTransformPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  if (tag !== "study_right_shadow_screen") {
    return spec;
  }
  // Tilemap72 candidate: one existing NW screen silhouette only. Keep x/y/z,
  // Bearing, tile layout, lighting, template, and all other VT stable.
  return {
    ...spec,
    visualTransform: vt(1.38, { scaleY: 1.54 })
  };
}

function applyNwDeepRugMaterialPass(spec) {
  if (!nwDeepRugMaterialPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  if (tag !== "readable_concept_study_deep_red_zone") {
    return spec;
  }
  // Tilemap68 candidate: the NW center still reads too bright/flat in Toolset.
  // Swap only the existing elevated study textile to a darker Last City rug and
  // lower it closer to the floor; keep x/y, bearing, tile layout, table, and
  // lighting unchanged.
  return {
    ...spec,
    from: "enon_house_1",
    template: "zep_throwrug058",
    tag: "ZEP_THROWRUG058",
    z: 0.18,
    visualTransform: vt(1.24, { scaleY: 1.18 })
  };
}

function applyConceptAnchorAlignment(spec) {
  if (!conceptAnchorAlignmentPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  const placementByTag = new Map([
    // Anchor compare tilemap40: S.door_front missed lighting/textile/structure.
    ["entry_red_runner_lock", { x: 15.0, y: 2.55, z: 0.16, bearingDegrees: 90 }],
    ["entry_candelabra", { x: 13.85, y: 3.15, z: 0, bearingDegrees: 0 }],
    ["entry_left_heavy_post_parity", { x: 13.45, y: 3.45, z: 0.02, bearingDegrees: 0 }],
    ["entry_right_heavy_post_parity", { x: 16.55, y: 3.45, z: 0.02, bearingDegrees: 180 }],

    // Same report: S.lower_hall needed structural silhouettes inside the hall,
    // not just near the tile edge. Keep these inside the overlap with transition_to_maproom.
    ["lower_hall_left_screen_lock", { x: 12.15, y: 8.65, z: 0, bearingDegrees: 90 }],
    ["lower_hall_right_screen_lock", { x: 17.85, y: 8.65, z: 0, bearingDegrees: 270 }],

    // NW.desk_wall and NE.private_storage_wall were only spatial misses.
    ["study_left_dark_window_parity", { x: 1.55, y: 17.65, z: 0, bearingDegrees: 90 }],
    ["bedroom_left_wall_tapestry_lock", { x: 21.75, y: 17.1, z: 0, bearingDegrees: 90 }]
  ]);
  const placement = placementByTag.get(tag);
  return placement ? { ...spec, ...placement } : spec;
}

function applyFastPlanExistingRebalance(spec) {
  if (!fastPlanExistingRebalancePass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  const placementByTag = new Map([
    // Fast-plan tilemap42 target: SW middle-west/south-west/north-west.
    // These are existing, non-VT placeables from the safe tilemap42 baseline.
    ["utility_left_tapestry_lock", { x: 1.62, y: 5.0, z: 0, bearingDegrees: 90 }],
    ["utility_tapestry", { x: 1.62, y: 8.25, z: 0, bearingDegrees: 90 }],
    ["utility_barrel_b", { x: 1.62, y: 5.65, z: 0, bearingDegrees: 0 }],
    ["hearth_side_barrel_a", { x: 1.62, y: 1.85, z: 0, bearingDegrees: 62 }],
    ["hearth_side_barrel_b", { x: 2.25, y: 1.55, z: 0, bearingDegrees: 0 }],
    ["utility_rolled_fabric_lock", { x: 1.85, y: 7.7, z: 0.04, bearingDegrees: 90 }],

    // Fast-plan SE middle-center/north-center without adding new VT.
    ["storage_small_sack", { x: 25.0, y: 5.05, z: 0.5, bearingDegrees: 120 }],
    ["storage_crate_back_c", { x: 25.0, y: 8.2, z: 0, bearingDegrees: 180 }],
    ["storage_rolled_canvas_lock", { x: 24.45, y: 8.05, z: 0.04, bearingDegrees: 18 }],

    // Fast-plan NW middle-center with existing non-VT saturation rugs only.
    ["readable_saturation_study_rug_w", { x: 4.35, y: 15.0, z: 0.42, bearingDegrees: 90 }],
    ["readable_saturation_study_rug_e", { x: 5.95, y: 15.0, z: 0.42, bearingDegrees: 90 }]
  ]);
  const placement = placementByTag.get(tag);
  return placement ? { ...spec, ...placement } : spec;
}

function applyMaskedVisualCorrection(spec) {
  if (!maskedVisualCorrectionPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  const placementByTag = new Map([
    // Masked tilemap47 dashboard: real top priority is NW, not SW. Strengthen
    // the middle/south-west dark read by moving existing wall/screen/rug mass.
    ["study_lower_left_wall_mass_final", { x: 1.08, y: 11.85, z: 0, bearingDegrees: 90 }],
    ["study_left_shadow_screen", { x: 1.35, y: 14.35, z: 0, bearingDegrees: 90 }],
    ["study_right_shadow_screen", { x: 8.35, y: 15.05, z: 0, bearingDegrees: 270 }],
    ["study_worn_rug", { x: 4.75, y: 14.65, z: 0.02, bearingDegrees: 101 }],
    ["study_rich_red_carpet_lock", { x: 5.55, y: 15.0, z: 0.16, bearingDegrees: 90 }],

    // SE middle-center/middle-west/north-center: reuse ordinary storage mass.
    ["storage_crate_c", { x: 21.75, y: 5.05, z: 0, bearingDegrees: 90 }],
    ["storage_small_sack", { x: 25.0, y: 5.05, z: 0.5, bearingDegrees: 120 }],
    ["storage_crate_back_c", { x: 25.0, y: 8.25, z: 0, bearingDegrees: 180 }],
    ["storage_wine_crate_stack_a", { x: 23.55, y: 5.0, z: 0, bearingDegrees: 15 }],
    ["storage_wine_crate_stack_b", { x: 24.2, y: 5.15, z: 0, bearingDegrees: 345 }],
    ["readable_storage_red_carpet", { x: 25.15, y: 5.0, z: 0.2, bearingDegrees: 180 }],

    // NE middle-west/south-center/middle-center: pull existing textile/screen
    // mass toward the measured gap without adding a new VT pass.
    ["bedroom_left_wall_tapestry_lock", { x: 21.65, y: 15.2, z: 0, bearingDegrees: 90 }],
    ["bed_storage_split_screen_a", { x: 22.0, y: 15.0, z: 0, bearingDegrees: 90 }],
    ["bed_storage_split_screen_b", { x: 23.35, y: 14.35, z: 0, bearingDegrees: 90 }],
    ["bedroom_dark_red_rug_lock", { x: 25.05, y: 14.75, z: 0.15, bearingDegrees: 90 }],
    ["readable_bedroom_red_carpet", { x: 25.25, y: 14.95, z: 0.22, bearingDegrees: 90 }],

    // S and N are lower-priority masked deltas; nudge existing reads only.
    ["lower_hall_deep_runner", { x: 15.0, y: 8.35, z: 0.11, bearingDegrees: 90 }],
    ["hero_map_room_deep_rug", { x: 14.75, y: 15.2, z: 0.11, bearingDegrees: 90 }],
    ["hero_deep_center_carpet_lock", { x: 15.25, y: 15.05, z: 0.18, bearingDegrees: 90 }]
  ]);
  const placement = placementByTag.get(tag);
  return placement ? { ...spec, ...placement } : spec;
}

function applyNHeroSideCabinetPositionPass(spec) {
  if (!nHeroSideCabinetPositionPass) {
    return spec;
  }
  const tag = String(spec.tagSuffix ?? "").toLowerCase();
  const placementByTag = new Map([
    // Tilemap75: central map room local material pass. Reuse existing non-VT
    // side cabinets as darker side mass around the hero table without touching
    // templates, Bearing, VisualTransform, tiles, or lighting.
    ["hero_room_left_dark_cabinet", { x: 11.55, y: 14.0 }],
    ["hero_room_right_dark_cabinet", { x: 18.45, y: 14.0 }]
  ]);
  const placement = placementByTag.get(tag);
  return placement ? { ...spec, ...placement } : spec;
}

function getNwnUserRoot() {
  const home = process.env.USERPROFILE ?? process.env.HOME;
  if (!home) {
    throw new Error("USERPROFILE/HOME is required to locate Neverwinter Nights documents.");
  }
  return join(home, "Documents", "Neverwinter Nights");
}

async function findTargetModulePath() {
  if (targetModulePathOverride) {
    return targetModulePathOverride;
  }
  const modulesDir = join(getNwnUserRoot(), "modules");
  const names = await readdir(modulesDir);
  const exact = names.find(
    (name) =>
      name.startsWith("the_last_city") &&
      name.endsWith("codex.mod") &&
      !name.includes("vfx") &&
      !name.includes("new") &&
      !name.includes("pre-")
  );
  if (!exact) {
    throw new Error(`Could not find exact the_last_city codex module in ${modulesDir}`);
  }
  return join(modulesDir, exact);
}

async function findCriticalFailureForModule(modulePath) {
  if (!existsSync(criticalFailureRegistryPath)) {
    return null;
  }
  const registry = JSON.parse(await readFile(criticalFailureRegistryPath, "utf8"));
  const records = Array.isArray(registry.records) ? registry.records : [];
  const moduleBaseName = basename(modulePath).toLowerCase();
  const normalizedPath = resolve(modulePath).toLowerCase();
  const match = [...records].reverse().find((record) => {
    if (record.status !== "rejected") {
      return false;
    }
    const recordPath = record.modulePath ? resolve(record.modulePath).toLowerCase() : null;
    const recordBaseName = record.moduleBaseName ? String(record.moduleBaseName).toLowerCase() : null;
    return recordPath === normalizedPath || recordBaseName === moduleBaseName;
  });
  if (!match) {
    return null;
  }
  return {
    reason: match.reason,
    recordedAt: match.recordedAt,
    modulePath: match.modulePath,
    moduleBaseName: match.moduleBaseName,
    registryPath: criticalFailureRegistryPath
  };
}

function readErfEntries(bytes, sourcePath) {
  if (bytes.length < 160) {
    throw new Error(`ERF file is too small: ${sourcePath}`);
  }

  const signature = bytes.toString("ascii", 0, 4);
  const version = bytes.toString("ascii", 4, 8);
  if (!["MOD ", "HAK ", "ERF ", "NWM "].includes(signature)) {
    throw new Error(`Unsupported ERF signature ${JSON.stringify(signature)} in ${sourcePath}`);
  }
  if (version !== "V1.0" && version !== "V1.1") {
    throw new Error(`Unsupported ERF version ${JSON.stringify(version)} in ${sourcePath}`);
  }

  const keyEntrySize = version === "V1.1" ? 40 : 24;
  const resrefLength = version === "V1.1" ? 32 : 16;
  const entryCount = bytes.readUInt32LE(16);
  const localizedStringSize = bytes.readUInt32LE(12);
  const localizedStringOffset = bytes.readUInt32LE(20);
  const keyListOffset = bytes.readUInt32LE(24);
  const resourceListOffset = bytes.readUInt32LE(28);
  const localizedStrings =
    localizedStringSize > 0
      ? Buffer.from(
          bytes.subarray(localizedStringOffset, localizedStringOffset + localizedStringSize)
        )
      : Buffer.alloc(0);

  const entries = [];
  for (let index = 0; index < entryCount; index += 1) {
    const keyOffset = keyListOffset + index * keyEntrySize;
    const resourceOffset = resourceListOffset + index * 8;
    const resref = bytes
      .subarray(keyOffset, keyOffset + resrefLength)
      .toString("ascii")
      .replace(/\0.*$/u, "")
      .trim()
      .toLowerCase();
    const type = bytes.readUInt16LE(keyOffset + resrefLength + 4);
    const dataOffset = bytes.readUInt32LE(resourceOffset);
    const size = bytes.readUInt32LE(resourceOffset + 4);
    entries.push({
      resref,
      type,
      bytes: Buffer.from(bytes.subarray(dataOffset, dataOffset + size))
    });
  }

  return {
    header: Buffer.from(bytes.subarray(0, 160)),
    localizedStrings,
    entries
  };
}

function buildErfV10FromEntries(originalHeader, localizedStrings, entries) {
  const keyEntrySize = 24;
  const resourceEntrySize = 8;
  const header = Buffer.from(originalHeader);
  const entryCount = entries.length;
  const localizedStringOffset = 160;
  const keyListOffset = localizedStringOffset + localizedStrings.length;
  const resourceListOffset = keyListOffset + entryCount * keyEntrySize;
  const resourceDataOffsetStart = resourceListOffset + entryCount * resourceEntrySize;

  header.writeUInt32LE(entryCount, 16);
  header.writeUInt32LE(localizedStringOffset, 20);
  header.writeUInt32LE(keyListOffset, 24);
  header.writeUInt32LE(resourceListOffset, 28);

  const keyTable = Buffer.alloc(entryCount * keyEntrySize);
  const resourceTable = Buffer.alloc(entryCount * resourceEntrySize);
  const payloads = [];
  let currentOffset = resourceDataOffsetStart;

  entries.forEach((entry, index) => {
    if (entry.resref.length > 16) {
      throw new Error(`Resource resref exceeds ERF V1.0 limit: ${entry.resref}`);
    }
    const keyOffset = index * keyEntrySize;
    const resourceOffset = index * resourceEntrySize;
    Buffer.from(entry.resref.toLowerCase(), "ascii").copy(keyTable, keyOffset);
    keyTable.writeUInt32LE(index, keyOffset + 16);
    keyTable.writeUInt16LE(entry.type, keyOffset + 20);
    keyTable.writeUInt16LE(0, keyOffset + 22);

    resourceTable.writeUInt32LE(currentOffset, resourceOffset);
    resourceTable.writeUInt32LE(entry.bytes.length, resourceOffset + 4);
    payloads.push(entry.bytes);
    currentOffset += entry.bytes.length;
  });

  return Buffer.concat([header, localizedStrings, keyTable, resourceTable, ...payloads]);
}

function parseGff(bytes, sourceLabel) {
  if (bytes.length < 56) {
    throw new Error(`GFF file too small: ${sourceLabel}`);
  }

  const header = {
    fileType: bytes.toString("ascii", 0, 4),
    fileVersion: bytes.toString("ascii", 4, 8),
    structOffset: bytes.readUInt32LE(8),
    structCount: bytes.readUInt32LE(12),
    fieldOffset: bytes.readUInt32LE(16),
    fieldCount: bytes.readUInt32LE(20),
    labelOffset: bytes.readUInt32LE(24),
    labelCount: bytes.readUInt32LE(28),
    fieldDataOffset: bytes.readUInt32LE(32),
    fieldIndicesOffset: bytes.readUInt32LE(40),
    listIndicesOffset: bytes.readUInt32LE(48)
  };

  const labels = [];
  for (let index = 0; index < header.labelCount; index += 1) {
    labels.push(
      bytes
        .subarray(header.labelOffset + index * 16, header.labelOffset + index * 16 + 16)
        .toString("ascii")
        .replace(/\0.*$/u, "")
    );
  }

  const structEntries = [];
  for (let index = 0; index < header.structCount; index += 1) {
    const offset = header.structOffset + index * 12;
    structEntries.push({
      typeId: bytes.readUInt32LE(offset),
      dataOrOffset: bytes.readUInt32LE(offset + 4),
      fieldCount: bytes.readUInt32LE(offset + 8)
    });
  }

  const fieldEntries = [];
  for (let index = 0; index < header.fieldCount; index += 1) {
    const offset = header.fieldOffset + index * 12;
    fieldEntries.push({
      typeId: bytes.readUInt32LE(offset),
      label: labels[bytes.readUInt32LE(offset + 4)] ?? "",
      dataOrOffset: bytes.readUInt32LE(offset + 8)
    });
  }

  function readStructFieldIndices(structEntry) {
    if (structEntry.fieldCount === 0) {
      return [];
    }
    if (structEntry.fieldCount === 1) {
      return [structEntry.dataOrOffset];
    }
    const indices = [];
    for (let index = 0; index < structEntry.fieldCount; index += 1) {
      indices.push(
        bytes.readUInt32LE(header.fieldIndicesOffset + structEntry.dataOrOffset + index * 4)
      );
    }
    return indices;
  }

  function readListIndices(fieldEntry) {
    const offset = header.listIndicesOffset + fieldEntry.dataOrOffset;
    const count = bytes.readUInt32LE(offset);
    const indices = [];
    for (let index = 0; index < count; index += 1) {
      indices.push(bytes.readUInt32LE(offset + 4 + index * 4));
    }
    return indices;
  }

  function readFieldValue(fieldEntry) {
    const offset = header.fieldDataOffset + fieldEntry.dataOrOffset;
    switch (fieldEntry.typeId) {
      case FIELD_TYPE.BYTE:
      case FIELD_TYPE.CHAR:
        return fieldEntry.dataOrOffset & 0xff;
      case FIELD_TYPE.WORD:
      case FIELD_TYPE.SHORT:
        return fieldEntry.dataOrOffset & 0xffff;
      case FIELD_TYPE.DWORD:
        return fieldEntry.dataOrOffset >>> 0;
      case FIELD_TYPE.INT:
        return fieldEntry.dataOrOffset | 0;
      case FIELD_TYPE.FLOAT: {
        const inline = Buffer.allocUnsafe(4);
        inline.writeUInt32LE(fieldEntry.dataOrOffset, 0);
        return inline.readFloatLE(0);
      }
      case FIELD_TYPE.CEXOSTRING: {
        const length = bytes.readUInt32LE(offset);
        return bytes.subarray(offset + 4, offset + 4 + length).toString("utf-8");
      }
      case FIELD_TYPE.RESREF: {
        const length = bytes.readUInt8(offset);
        return bytes.subarray(offset + 1, offset + 1 + length).toString("ascii");
      }
      case FIELD_TYPE.CEXOLOCSTRING: {
        const totalSize = bytes.readUInt32LE(offset);
        const strRef = bytes.readUInt32LE(offset + 4);
        const count = bytes.readUInt32LE(offset + 8);
        const entries = [];
        let cursor = offset + 12;
        for (let index = 0; index < count; index += 1) {
          const id = bytes.readUInt32LE(cursor);
          const length = bytes.readUInt32LE(cursor + 4);
          const text = bytes.subarray(cursor + 8, cursor + 8 + length).toString("utf-8");
          entries.push({ id, text });
          cursor += 8 + length;
        }
        return { totalSize, strRef, entries };
      }
      case FIELD_TYPE.VOID: {
        const length = bytes.readUInt32LE(offset);
        return {
          bytesBase64: Buffer.from(bytes.subarray(offset + 4, offset + 4 + length)).toString(
            "base64"
          )
        };
      }
      case FIELD_TYPE.STRUCT:
        return fieldEntry.dataOrOffset;
      case FIELD_TYPE.LIST:
        return readListIndices(fieldEntry);
      default:
        throw new Error(
          `Unsupported GFF field type ${fieldEntry.typeId} for ${fieldEntry.label} in ${sourceLabel}`
        );
    }
  }

  const structs = structEntries.map((structEntry) => ({
    typeId: structEntry.typeId,
    fields: readStructFieldIndices(structEntry).map((fieldIndex) => {
      const fieldEntry = fieldEntries[fieldIndex];
      return {
        label: fieldEntry.label,
        typeId: fieldEntry.typeId,
        value: readFieldValue(fieldEntry)
      };
    })
  }));

  return {
    fileType: header.fileType,
    fileVersion: header.fileVersion,
    structs
  };
}

function buildGff(gff) {
  const labels = [];
  const labelIndexByName = new Map();
  for (const struct of gff.structs) {
    for (const field of struct.fields) {
      if (!labelIndexByName.has(field.label)) {
        const labelBytes = Buffer.from(field.label, "ascii");
        if (labelBytes.length > 16) {
          throw new Error(`GFF label exceeds 16 bytes: ${field.label}`);
        }
        labelIndexByName.set(field.label, labels.length);
        labels.push(field.label);
      }
    }
  }

  const fieldDataChunks = [];
  const listIndicesChunks = [];
  const fieldIndicesChunks = [];
  const fieldEntries = [];
  const structEntries = [];

  function pushFieldData(chunk) {
    const offset = fieldDataChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldDataChunks.push(chunk);
    return offset;
  }

  function pushListIndices(chunk) {
    const offset = listIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    listIndicesChunks.push(chunk);
    return offset;
  }

  function pushFieldIndices(indices) {
    const chunk = Buffer.alloc(indices.length * 4);
    indices.forEach((fieldIndex, index) => chunk.writeUInt32LE(fieldIndex, index * 4));
    const offset = fieldIndicesChunks.reduce((sum, entry) => sum + entry.length, 0);
    fieldIndicesChunks.push(chunk);
    return offset;
  }

  function encodeInlineInt(value) {
    const inline = Buffer.allocUnsafe(4);
    inline.writeInt32LE(Number(value) | 0, 0);
    return inline.readUInt32LE(0);
  }

  function encodeField(field) {
    const labelIndex = labelIndexByName.get(field.label);
    if (labelIndex === undefined) {
      throw new Error(`Missing label index for ${field.label}`);
    }

    let dataOrOffset;
    switch (field.typeId) {
      case FIELD_TYPE.BYTE:
      case FIELD_TYPE.CHAR:
        dataOrOffset = Number(field.value) & 0xff;
        break;
      case FIELD_TYPE.WORD:
      case FIELD_TYPE.SHORT:
        dataOrOffset = Number(field.value) & 0xffff;
        break;
      case FIELD_TYPE.DWORD:
        dataOrOffset = Number(field.value) >>> 0;
        break;
      case FIELD_TYPE.INT:
        dataOrOffset = encodeInlineInt(field.value);
        break;
      case FIELD_TYPE.FLOAT: {
        const inline = Buffer.allocUnsafe(4);
        inline.writeFloatLE(Number(field.value), 0);
        dataOrOffset = inline.readUInt32LE(0);
        break;
      }
      case FIELD_TYPE.CEXOSTRING: {
        const valueBytes = Buffer.from(String(field.value ?? ""), "utf-8");
        const payload = Buffer.alloc(4 + valueBytes.length);
        payload.writeUInt32LE(valueBytes.length, 0);
        valueBytes.copy(payload, 4);
        dataOrOffset = pushFieldData(payload);
        break;
      }
      case FIELD_TYPE.RESREF: {
        const valueBytes = Buffer.from(String(field.value ?? ""), "ascii");
        if (valueBytes.length > 16) {
          throw new Error(`RESREF exceeds 16 bytes: ${field.value}`);
        }
        const payload = Buffer.alloc(1 + valueBytes.length);
        payload.writeUInt8(valueBytes.length, 0);
        valueBytes.copy(payload, 1);
        dataOrOffset = pushFieldData(payload);
        break;
      }
      case FIELD_TYPE.CEXOLOCSTRING: {
        const loc = field.value ?? { strRef: 0xffffffff, entries: [] };
        const entries = loc.entries ?? [];
        const entryChunks = entries.map((entry) => {
          const textBytes = Buffer.from(String(entry.text ?? ""), "utf-8");
          const chunk = Buffer.alloc(8 + textBytes.length);
          chunk.writeUInt32LE(Number(entry.id ?? 0) >>> 0, 0);
          chunk.writeUInt32LE(textBytes.length, 4);
          textBytes.copy(chunk, 8);
          return chunk;
        });
        const entrySize = entryChunks.reduce((sum, entry) => sum + entry.length, 0);
        const payload = Buffer.alloc(12 + entrySize);
        payload.writeUInt32LE(8 + entrySize, 0);
        payload.writeUInt32LE(Number(loc.strRef ?? 0xffffffff) >>> 0, 4);
        payload.writeUInt32LE(entries.length, 8);
        let cursor = 12;
        for (const chunk of entryChunks) {
          chunk.copy(payload, cursor);
          cursor += chunk.length;
        }
        dataOrOffset = pushFieldData(payload);
        break;
      }
      case FIELD_TYPE.VOID: {
        const valueBytes = Buffer.from(String(field.value?.bytesBase64 ?? ""), "base64");
        const payload = Buffer.alloc(4 + valueBytes.length);
        payload.writeUInt32LE(valueBytes.length, 0);
        valueBytes.copy(payload, 4);
        dataOrOffset = pushFieldData(payload);
        break;
      }
      case FIELD_TYPE.STRUCT:
        dataOrOffset = Number(field.value) >>> 0;
        break;
      case FIELD_TYPE.LIST: {
        const values = Array.isArray(field.value) ? field.value : [];
        const payload = Buffer.alloc(4 + values.length * 4);
        payload.writeUInt32LE(values.length, 0);
        values.forEach((structIndex, index) => {
          payload.writeUInt32LE(Number(structIndex) >>> 0, 4 + index * 4);
        });
        dataOrOffset = pushListIndices(payload);
        break;
      }
      default:
        throw new Error(`Unsupported GFF field type for write: ${field.typeId}`);
    }

    return {
      typeId: field.typeId,
      labelIndex,
      dataOrOffset
    };
  }

  for (const struct of gff.structs) {
    const fieldIndices = [];
    for (const field of struct.fields) {
      const fieldIndex = fieldEntries.length;
      fieldEntries.push(encodeField(field));
      fieldIndices.push(fieldIndex);
    }

    let dataOrOffset = 0;
    if (fieldIndices.length === 1) {
      dataOrOffset = fieldIndices[0];
    } else if (fieldIndices.length > 1) {
      dataOrOffset = pushFieldIndices(fieldIndices);
    }

    structEntries.push({
      typeId: struct.typeId,
      dataOrOffset,
      fieldCount: fieldIndices.length
    });
  }

  const headerSize = 56;
  const structOffset = headerSize;
  const fieldOffset = structOffset + structEntries.length * 12;
  const labelOffset = fieldOffset + fieldEntries.length * 12;
  const fieldDataOffset = labelOffset + labels.length * 16;
  const fieldData = Buffer.concat(fieldDataChunks);
  const fieldIndicesOffset = fieldDataOffset + fieldData.length;
  const fieldIndices = Buffer.concat(fieldIndicesChunks);
  const listIndicesOffset = fieldIndicesOffset + fieldIndices.length;
  const listIndices = Buffer.concat(listIndicesChunks);

  const header = Buffer.alloc(headerSize);
  Buffer.from(gff.fileType, "ascii").copy(header, 0);
  Buffer.from(gff.fileVersion, "ascii").copy(header, 4);
  header.writeUInt32LE(structOffset, 8);
  header.writeUInt32LE(structEntries.length, 12);
  header.writeUInt32LE(fieldOffset, 16);
  header.writeUInt32LE(fieldEntries.length, 20);
  header.writeUInt32LE(labelOffset, 24);
  header.writeUInt32LE(labels.length, 28);
  header.writeUInt32LE(fieldDataOffset, 32);
  header.writeUInt32LE(fieldData.length, 36);
  header.writeUInt32LE(fieldIndicesOffset, 40);
  header.writeUInt32LE(fieldIndices.length, 44);
  header.writeUInt32LE(listIndicesOffset, 48);
  header.writeUInt32LE(listIndices.length, 52);

  const structTable = Buffer.alloc(structEntries.length * 12);
  structEntries.forEach((entry, index) => {
    const offset = index * 12;
    structTable.writeUInt32LE(entry.typeId, offset);
    structTable.writeUInt32LE(entry.dataOrOffset, offset + 4);
    structTable.writeUInt32LE(entry.fieldCount, offset + 8);
  });

  const fieldTable = Buffer.alloc(fieldEntries.length * 12);
  fieldEntries.forEach((entry, index) => {
    const offset = index * 12;
    fieldTable.writeUInt32LE(entry.typeId, offset);
    fieldTable.writeUInt32LE(entry.labelIndex, offset + 4);
    fieldTable.writeUInt32LE(entry.dataOrOffset, offset + 8);
  });

  const labelTable = Buffer.alloc(labels.length * 16);
  labels.forEach((label, index) => {
    Buffer.from(label, "ascii").copy(labelTable, index * 16);
  });

  return Buffer.concat([
    header,
    structTable,
    fieldTable,
    labelTable,
    fieldData,
    fieldIndices,
    listIndices
  ]);
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function getField(struct, label) {
  return struct.fields.find((field) => field.label === label);
}

function setFieldValue(struct, label, value) {
  const field = getField(struct, label);
  if (!field) {
    throw new Error(`Missing field ${label}`);
  }
  field.value = value;
}

function setFieldValueIfPresent(struct, label, value) {
  const field = getField(struct, label);
  if (field) {
    field.value = value;
  }
}

function locString(text) {
  return {
    strRef: 0xffffffff,
    entries: [{ id: 0, text }]
  };
}

function degreesToRadians(value) {
  return (Number(value) * Math.PI) / 180;
}

function vt(scale, overrides = {}) {
  return {
    scaleX: scale,
    scaleY: scale,
    scaleZ: scale,
    ...overrides
  };
}

function numberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeVisualTransform(transform) {
  const uniformScale = numberOr(transform?.scale, 1);
  return {
    scaleX: numberOr(transform?.scaleX, uniformScale),
    scaleY: numberOr(transform?.scaleY, uniformScale),
    scaleZ: numberOr(transform?.scaleZ, uniformScale),
    rotateX: numberOr(transform?.rotateX, 0),
    rotateY: numberOr(transform?.rotateY, 0),
    rotateZ: numberOr(transform?.rotateZ, 0),
    translateX: numberOr(transform?.translateX, 0),
    translateY: numberOr(transform?.translateY, 0),
    translateZ: numberOr(transform?.translateZ, 0)
  };
}

function hasNonDefaultVisualTransform(transform) {
  if (!transform) {
    return false;
  }
  const vt = normalizeVisualTransform(transform);
  return (
    vt.scaleX !== 1 ||
    vt.scaleY !== 1 ||
    vt.scaleZ !== 1 ||
    vt.rotateX !== 0 ||
    vt.rotateY !== 0 ||
    vt.rotateZ !== 0 ||
    vt.translateX !== 0 ||
    vt.translateY !== 0 ||
    vt.translateZ !== 0
  );
}

function removeVisualTransformFields(struct) {
  struct.fields = struct.fields.filter(
    (field) => field.label !== "VisTransformList" && field.label !== "VisualTransform"
  );
}

function addVisualTransformControllerStruct(targetGff, value) {
  const structIndex = targetGff.structs.length;
  targetGff.structs.push({
    typeId: 0,
    fields: [
      { label: "TimerType", typeId: FIELD_TYPE.INT, value: 0 },
      { label: "ValueTo", typeId: FIELD_TYPE.FLOAT, value },
      { label: "LerpType", typeId: FIELD_TYPE.INT, value: 0 }
    ]
  });
  return structIndex;
}

function setVisualTransform(struct, targetGff, transform) {
  removeVisualTransformFields(struct);
  if (!hasNonDefaultVisualTransform(transform)) {
    return false;
  }

  const normalized = normalizeVisualTransform(transform);
  const transformStructIndex = targetGff.structs.length;
  targetGff.structs.push({ typeId: 6, fields: [] });
  const transformStruct = targetGff.structs[transformStructIndex];

  transformStruct.fields = [
    { label: "Scope", typeId: FIELD_TYPE.INT, value: 0 },
    {
      label: "AnimationSpeed",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, 1)
    },
    {
      label: "ScaleX",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, normalized.scaleX)
    },
    {
      label: "ScaleY",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, normalized.scaleY)
    },
    {
      label: "ScaleZ",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, normalized.scaleZ)
    },
    {
      label: "RotateX",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, normalized.rotateX)
    },
    {
      label: "RotateY",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, normalized.rotateY)
    },
    {
      label: "RotateZ",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, normalized.rotateZ)
    },
    {
      label: "TranslateX",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, normalized.translateX)
    },
    {
      label: "TranslateY",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, normalized.translateY)
    },
    {
      label: "TranslateZ",
      typeId: FIELD_TYPE.STRUCT,
      value: addVisualTransformControllerStruct(targetGff, normalized.translateZ)
    }
  ];

  struct.fields.push({
    label: "VisTransformList",
    typeId: FIELD_TYPE.LIST,
    value: [transformStructIndex]
  });
  return true;
}

function cloneStructTree(sourceGff, sourceIndex, targetGff, indexMap = new Map()) {
  if (indexMap.has(sourceIndex)) {
    return indexMap.get(sourceIndex);
  }
  const sourceStruct = sourceGff.structs[sourceIndex];
  const targetIndex = targetGff.structs.length;
  indexMap.set(sourceIndex, targetIndex);
  const cloned = {
    typeId: sourceStruct.typeId,
    fields: deepClone(sourceStruct.fields)
  };
  targetGff.structs.push(cloned);

  for (const field of cloned.fields) {
    if (field.typeId === FIELD_TYPE.STRUCT) {
      field.value = cloneStructTree(sourceGff, field.value, targetGff, indexMap);
    } else if (field.typeId === FIELD_TYPE.LIST) {
      field.value = (field.value ?? []).map((childIndex) =>
        cloneStructTree(sourceGff, childIndex, targetGff, indexMap)
      );
    }
  }

  return targetIndex;
}

function cloneFieldIntoGff(sourceGff, sourceField, targetGff) {
  const cloned = deepClone(sourceField);
  const indexMap = new Map();
  if (sourceField.typeId === FIELD_TYPE.STRUCT) {
    cloned.value = cloneStructTree(sourceGff, sourceField.value, targetGff, indexMap);
  } else if (sourceField.typeId === FIELD_TYPE.LIST) {
    cloned.value = (sourceField.value ?? []).map((structIndex) =>
      cloneStructTree(sourceGff, structIndex, targetGff, indexMap)
    );
  }
  return cloned;
}

function summarizeCopiedModuleField(field) {
  if (!field) {
    return null;
  }
  if (field.typeId === FIELD_TYPE.LIST) {
    return { typeId: field.typeId, count: field.value?.length ?? 0 };
  }
  return { typeId: field.typeId, value: field.value ?? null };
}

function cloneFilteredHakListField(sourceGff, sourceField, targetGff, requestedHakList) {
  if (sourceField.typeId !== FIELD_TYPE.LIST) {
    throw new Error(`Mod_HakList has unexpected type ${sourceField.typeId}`);
  }
  const sourceIndices = sourceField.value ?? [];
  const sourceByName = new Map();
  for (const structIndex of sourceIndices) {
    const hakName = getField(sourceGff.structs[structIndex], "Mod_Hak")?.value;
    if (hakName) {
      sourceByName.set(normalizeHakName(hakName), structIndex);
    }
  }

  const indexMap = new Map();
  const cloned = {
    label: sourceField.label,
    typeId: FIELD_TYPE.LIST,
    value: []
  };
  const missing = [];
  const selected = [];
  const seen = new Set();
  for (const requested of requestedHakList) {
    const normalized = normalizeHakName(requested);
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    const sourceIndex = sourceByName.get(normalized);
    if (sourceIndex === undefined) {
      missing.push(requested);
      continue;
    }
    selected.push(getField(sourceGff.structs[sourceIndex], "Mod_Hak")?.value ?? requested);
    cloned.value.push(cloneStructTree(sourceGff, sourceIndex, targetGff, indexMap));
  }

  return {
    field: cloned,
    selected,
    missing
  };
}

function copyModuleResourceFieldsFromSource(targetGff, sourceIfoBytes) {
  if (!sourceIfoBytes) {
    return [];
  }
  const sourceGff = parseGff(sourceIfoBytes, "source module.ifo");
  if (sourceGff.fileType !== "IFO ") {
    throw new Error(`Expected source IFO resource, got ${JSON.stringify(sourceGff.fileType)}`);
  }

  const targetRoot = targetGff.structs[0];
  const sourceRoot = sourceGff.structs[0];
  const copied = [];
  for (const label of ["Mod_CustomTlk", "Mod_HakList"]) {
    const sourceField = getField(sourceRoot, label);
    if (!sourceField) {
      continue;
    }
    const existingIndex = targetRoot.fields.findIndex((field) => field.label === label);
    const previous = existingIndex >= 0 ? targetRoot.fields[existingIndex] : null;
    const filteredHakList =
      label === "Mod_HakList" && sourceHakListOverride
        ? cloneFilteredHakListField(sourceGff, sourceField, targetGff, sourceHakListOverride)
        : null;
    const cloned = filteredHakList?.field ?? cloneFieldIntoGff(sourceGff, sourceField, targetGff);
    if (existingIndex >= 0) {
      targetRoot.fields[existingIndex] = cloned;
    } else {
      targetRoot.fields.push(cloned);
    }
    copied.push({
      label,
      action: existingIndex >= 0 ? "replaced" : "added",
      previous: summarizeCopiedModuleField(previous),
      next: summarizeCopiedModuleField(cloned),
      ...(filteredHakList
        ? {
            requested: sourceHakListOverride,
            selected: filteredHakList.selected,
            missing: filteredHakList.missing
          }
        : {})
    });
  }
  return copied;
}

function pruneGffToReachableStructs(sourceGff) {
  const targetGff = {
    fileType: sourceGff.fileType,
    fileVersion: sourceGff.fileVersion,
    structs: []
  };
  cloneStructTree(sourceGff, 0, targetGff);
  return {
    gff: targetGff,
    removedStructCount: sourceGff.structs.length - targetGff.structs.length
  };
}

function findEntry(erf, resref, type) {
  return erf.entries.find((entry) => entry.resref === resref && entry.type === type);
}

async function readNativeTemplateResource(extension, type) {
  if (!nativeTemplateDir) {
    return null;
  }
  const exactName = `${nativeTemplateResref}.${extension}`;
  const candidates = await readdir(nativeTemplateDir);
  const match = candidates.find((name) => name.toLowerCase() === exactName.toLowerCase());
  if (!match) {
    throw new Error(`Missing native Area Wizard template resource ${exactName} in ${nativeTemplateDir}`);
  }
  return {
    resref: nativeTemplateResref.toLowerCase(),
    type,
    bytes: await readFile(join(nativeTemplateDir, match))
  };
}

function readSourceAreaGff(erf, resref, type, label) {
  const entry = findEntry(erf, resref, type);
  if (!entry) {
    throw new Error(`Missing ${resref}.${label} in module`);
  }
  return parseGff(entry.bytes, `${resref}.${label}`);
}

function findPlaceable(sourceGffs, matcher) {
  for (const [areaResref, gff] of Object.entries(sourceGffs)) {
    const root = gff.structs[0];
    const list = getField(root, "Placeable List");
    for (const structIndex of list?.value ?? []) {
      const struct = gff.structs[structIndex];
      const text = [
        getField(struct, "TemplateResRef")?.value,
        getField(struct, "Tag")?.value,
        getField(struct, "LocName")?.value?.entries?.map((entry) => entry.text).join(" "),
        getField(struct, "Description")?.value?.entries?.map((entry) => entry.text).join(" ")
      ]
        .filter(Boolean)
        .join(" ");
      if (matcher(text, struct, areaResref)) {
        return { areaResref, gff, structIndex };
      }
    }
  }
  throw new Error("Could not find requested placeable prototype.");
}

function place(sourceGffs, targetGff, spec) {
  let prototype;
  try {
    prototype = findPlaceable(sourceGffs, (text, struct, areaResref) => {
      if (spec.from && areaResref !== spec.from) {
        return false;
      }
      if (spec.template && getField(struct, "TemplateResRef")?.value !== spec.template) {
        return false;
      }
      if (spec.tag && getField(struct, "Tag")?.value !== spec.tag) {
        return false;
      }
      return spec.match ? spec.match.test(text) : true;
    });
  } catch (error) {
    throw new Error(
      [
        "Could not find requested placeable prototype.",
        `from=${spec.from ?? "*"}`,
        `template=${spec.template ?? "*"}`,
        `tag=${spec.tag ?? "*"}`,
        `tagSuffix=${spec.tagSuffix ?? ""}`
      ].join(" "),
      { cause: error }
    );
  }
  const clonedIndex = cloneStructTree(prototype.gff, prototype.structIndex, targetGff);
  const cloned = targetGff.structs[clonedIndex];
  const placement = applyPlaceablePlacementTransform(spec);
  setFieldValue(cloned, "X", placement.x);
  setFieldValue(cloned, "Y", placement.y);
  setFieldValue(cloned, "Z", placement.z);
  setFieldValue(cloned, "Bearing", degreesToRadians(spec.bearingDegrees ?? 0));
  const hasVisualTransform = setVisualTransform(cloned, targetGff, spec.visualTransform);
  if (hasVisualTransform) {
    setFieldValueIfPresent(cloned, "Static", 0);
  }
  if (spec.tagSuffix) {
    const currentTag = getField(cloned, "Tag")?.value ?? getField(cloned, "TemplateResRef")?.value;
    setFieldValue(cloned, "Tag", `${currentTag}_${spec.tagSuffix}`.slice(0, 64));
  }
  return clonedIndex;
}

function mutateAreaMetadata(areBytes) {
  const gff = parseGff(areBytes, `${BASE_AREA_RESREF}.are`);
  if (gff.fileType !== "ARE ") {
    throw new Error(`Expected ARE resource, got ${JSON.stringify(gff.fileType)}`);
  }
  const root = gff.structs[0];
  setFieldValue(root, "Name", locString(AREA_NAME));
  setFieldValue(root, "Tag", AREA_RESREF);
  setFieldValue(root, "ResRef", AREA_RESREF);
  setFieldValue(
    root,
    "Comments",
    "Codex-generated Last City quality apartment: port cartographer flat, built from sic11 residential statistics with a custom story layer."
  );
  const lightingProfile = getAreaLightingProfile();
  setFieldValueIfPresent(root, "ShadowOpacity", lightingProfile.shadowOpacity);
  setFieldValueIfPresent(root, "MoonAmbientColor", lightingProfile.moonAmbientColor);
  setFieldValueIfPresent(root, "MoonDiffuseColor", lightingProfile.moonDiffuseColor);
  setFieldValueIfPresent(root, "SunAmbientColor", lightingProfile.sunAmbientColor);
  setFieldValueIfPresent(root, "SunDiffuseColor", lightingProfile.sunDiffuseColor);
  setFieldValueIfPresent(root, "SunShadows", lightingProfile.sunShadows);
  setFieldValueIfPresent(root, "MoonShadows", lightingProfile.moonShadows);

  const tileList = getField(root, "Tile_List");
  if ((areaDimensionOverride.width || areaDimensionOverride.height) && tileList?.typeId === FIELD_TYPE.LIST) {
    if (!areaDimensionOverride.width || !areaDimensionOverride.height) {
      throw new Error(
        "AURORA_LAST_CITY_APARTMENT_AREA_WIDTH and AURORA_LAST_CITY_APARTMENT_AREA_HEIGHT must be set together."
      );
    }
    const nextTileCount = areaDimensionOverride.width * areaDimensionOverride.height;
    if ((tileList.value ?? []).length < nextTileCount) {
      throw new Error(
        `Cannot crop Tile_List to ${nextTileCount}; base only has ${(tileList.value ?? []).length} tiles.`
      );
    }
    setFieldValueIfPresent(root, "Width", areaDimensionOverride.width);
    setFieldValueIfPresent(root, "Height", areaDimensionOverride.height);
    tileList.value = (tileList.value ?? []).slice(0, nextTileCount);
  }
  if (tileLayoutOverrideIds && tileList?.typeId === FIELD_TYPE.LIST) {
    if (tileLayoutOverrideIds.length !== tileList.value.length) {
      throw new Error(
        `AURORA_LAST_CITY_APARTMENT_TILE_IDS length ${tileLayoutOverrideIds.length} does not match Tile_List length ${tileList.value.length}.`
      );
    }
    for (let index = 0; index < tileList.value.length; index += 1) {
      const tile = gff.structs[tileList.value[index]];
      setFieldValueIfPresent(tile, "Tile_ID", tileLayoutOverrideIds[index]);
    }
  }
  if (tileLayoutOverrideOrientations && tileList?.typeId === FIELD_TYPE.LIST) {
    if (tileLayoutOverrideOrientations.length !== tileList.value.length) {
      throw new Error(
        `AURORA_LAST_CITY_APARTMENT_TILE_ORIENTATIONS length ${tileLayoutOverrideOrientations.length} does not match Tile_List length ${tileList.value.length}.`
      );
    }
    for (let index = 0; index < tileList.value.length; index += 1) {
      const orientation = tileLayoutOverrideOrientations[index];
      if (orientation < 0 || orientation > 3) {
        throw new Error(
          `AURORA_LAST_CITY_APARTMENT_TILE_ORIENTATIONS must be quarter-turn values 0..3, got ${orientation}.`
        );
      }
      const tile = gff.structs[tileList.value[index]];
      setFieldValueIfPresent(tile, "Tile_Orientation", orientation);
    }
  }
  if (conceptWarmLighting && tileList?.typeId === FIELD_TYPE.LIST) {
    for (const tileStructIndex of tileList.value ?? []) {
      const tile = gff.structs[tileStructIndex];
      setFieldValueIfPresent(tile, "Tile_MainLight1", 28);
      setFieldValueIfPresent(tile, "Tile_MainLight2", 31);
      setFieldValueIfPresent(tile, "Tile_SrcLight1", 28);
      setFieldValueIfPresent(tile, "Tile_SrcLight2", 31);
    }
  } else if (!preserveTileLights && tileList?.typeId === FIELD_TYPE.LIST) {
    for (const tileStructIndex of tileList.value ?? []) {
      const tile = gff.structs[tileStructIndex];
      setFieldValueIfPresent(tile, "Tile_MainLight1", 0);
      setFieldValueIfPresent(tile, "Tile_MainLight2", 0);
      setFieldValueIfPresent(tile, "Tile_SrcLight1", 0);
      setFieldValueIfPresent(tile, "Tile_SrcLight2", 0);
    }
  }
  return buildGff(pruneGffToReachableStructs(gff).gff);
}

function getAreaLightingProfile() {
  if (conceptWarmLighting) {
    return {
      name: "warm-candle-test",
      shadowOpacity: 12,
      moonAmbientColor: 0x6c4a2a,
      moonDiffuseColor: 0xc18b52,
      sunAmbientColor: 0x705034,
      sunDiffuseColor: 0xce9357,
      sunShadows: 0,
      moonShadows: 0
    };
  }
  if (conceptMoodLighting) {
    return {
      name: "concept-mood-contrast",
      shadowOpacity: 100,
      moonAmbientColor: 0x010101,
      moonDiffuseColor: 0x040302,
      sunAmbientColor: 0x010101,
      sunDiffuseColor: 0x040302,
      sunShadows: 1,
      moonShadows: 1
    };
  }
  if (conceptDeepMoodLighting) {
    return {
      name: "concept-deep-mood-proof",
      shadowOpacity: 100,
      moonAmbientColor: 0x000000,
      moonDiffuseColor: 0x010101,
      sunAmbientColor: 0x000000,
      sunDiffuseColor: 0x010101,
      sunShadows: 1,
      moonShadows: 1
    };
  }
  return {
    name: "dark-baseline",
    shadowOpacity: 85,
    moonAmbientColor: 0x020202,
    moonDiffuseColor: 0x080808,
    sunAmbientColor: 0x020202,
    sunDiffuseColor: 0x080808,
    sunShadows: 1,
    moonShadows: 1
  };
}

function mutateAreaGit(baseGitBytes, sourceGffs) {
  const gff = parseGff(baseGitBytes, `${BASE_AREA_RESREF}.git`);
  if (gff.fileType !== "GIT ") {
    throw new Error(`Expected GIT resource, got ${JSON.stringify(gff.fileType)}`);
  }
  const root = gff.structs[0];
  const placeableList = getField(root, "Placeable List");
  if (!placeableList || placeableList.typeId !== FIELD_TYPE.LIST) {
    throw new Error("Base GIT missing Placeable List.");
  }
  const clearedBasePlaceableCount = (placeableList.value ?? []).length;
  placeableList.value = [];
  const doorList = getField(root, "Door List");
  const clearedBaseDoorCount = doorList?.typeId === FIELD_TYPE.LIST && clearDoors
    ? (doorList.value ?? []).length
    : 0;
  if (doorList?.typeId === FIELD_TYPE.LIST && clearDoors) {
    doorList.value = [];
  }

  const storyPlaceables = [
    // Top-left work lounge: a cramped broker corner, not the source flat's old layout.
    { from: "enon_house_1", template: "zep_throwrug058", tag: "ZEP_THROWRUG058", x: 5.0, y: 15.2, z: 0.02, bearingDegrees: 101, tagSuffix: "study_worn_rug", visualTransform: vt(1.08) },
    { from: "mtt_hire_rch_1", template: "nwic048", tag: "nwic_desk_1", x: 3.1, y: 17.4, bearingDegrees: 180, tagSuffix: "study_desk" },
    { from: "mtt_hire_rch_1", template: "nwic266", tag: "nwic_chair_4", x: 4.4, y: 16.6, bearingDegrees: 25, tagSuffix: "study_chair" },
    { from: "mtt_hire_rch_1", template: "witcher254", tag: "witcher2_book_2", x: 3.2, y: 17.3, z: 0.96, bearingDegrees: 80, tagSuffix: "study_book" },
    { from: "mtt_hire_rch_1", template: "witcher231", tag: "witcher2_hourglass", x: 3.8, y: 17.5, z: 1.04, bearingDegrees: 0, tagSuffix: "study_hourglass" },
    { from: "mtt_hire_rch_1", template: "witcher402", tag: "witcher_swieca_1", x: 2.4, y: 17.4, z: 0.96, bearingDegrees: 0, tagSuffix: "study_candle" },
    { from: "enon_house_6", template: "nwn2_001", tag: "nwn2_roundtable", x: 6.3, y: 13.4, bearingDegrees: 0, tagSuffix: "round_planning_table" },
    { from: "mar_house_1", template: "q_100", tag: "q_chair_6", x: 5.0, y: 13.4, bearingDegrees: 270, tagSuffix: "round_west_chair" },
    { from: "mar_house_1", template: "q_100", tag: "q_chair_6", x: 7.5, y: 13.4, bearingDegrees: 90, tagSuffix: "round_east_chair" },
    { from: "mar_house_1", template: "witcher355", tag: "witcher_bottle_4", x: 6.1, y: 13.5, z: 0.82, bearingDegrees: 0, tagSuffix: "round_ink_bottle" },
    { from: "enon_gang_2", template: "witcher689", tag: "witcher_map_1", x: 5.2, y: 18.8, z: 2.0, bearingDegrees: 180, tagSuffix: "study_wall_chart", visualTransform: vt(1.12) },
    { from: "mtt_hire_rch_1", template: "witcher763", tag: "witcher_plant_3", x: 8.0, y: 18.0, bearingDegrees: 155, tagSuffix: "study_plant" },
    { from: "guild_merchants", template: "zep_ci_fch_002", tag: "ZEP_CI_FCH_002", x: 2.2, y: 14.8, bearingDegrees: 90, tagSuffix: "study_worn_couch" },
    { from: "enon_gang_2", template: "q_052", tag: "q_bookshelf_1", x: 1.7, y: 18.4, bearingDegrees: 90, tagSuffix: "study_bookshelf_w" },
    { from: "enon_gang_1", template: "zep_bbook001", tag: "ZEP_BBOOK001", x: 3.8, y: 17.0, z: 0.96, bearingDegrees: 18, tagSuffix: "study_open_notes" },
    { from: "enon_gang_1", template: "zep_bbook003", tag: "ZEP_BBOOK003", x: 6.2, y: 13.8, z: 0.82, bearingDegrees: 310, tagSuffix: "round_table_book" },
    { from: "enon_gang_1", template: "q_051", tag: "q_bookstack", x: 6.7, y: 13.1, z: 0.82, bearingDegrees: 25, tagSuffix: "round_table_books" },
    { from: "guild_merchants", template: "witcher144", tag: "witcher001", x: 6.25, y: 13.35, z: 0.83, bearingDegrees: 146, tagSuffix: "round_table_map" },
    { from: "enon_house_1", template: "witcher411", tag: "witcher_cards", x: 6.05, y: 13.1, z: 0.84, bearingDegrees: 25, tagSuffix: "round_table_cards" },
    { from: "enon_house_6", template: "witcher937", tag: "witcher_vial", x: 6.65, y: 13.65, z: 0.84, bearingDegrees: 0, tagSuffix: "round_table_ink_vial" },

    // North chart wall: the concept's parchment wall and shelves.
    { from: "enon_gang_1", template: "witcher690", tag: "witcher_map_2", x: 12.0, y: 18.8, z: 2.0, bearingDegrees: 180, tagSuffix: "north_big_chart_a", visualTransform: vt(1.14) },
    { from: "guild_merchants", template: "ke_mapa001", tag: "ke_mapa001", x: 15.2, y: 18.8, z: 2.25, bearingDegrees: 180, tagSuffix: "north_big_chart_b", visualTransform: vt(1.12) },
    { from: "guild_merchants", template: "ke_papier014", tag: "ke_papier014", x: 17.8, y: 18.6, z: 2.05, bearingDegrees: 180, tagSuffix: "north_notes_a" },
    { from: "guild_merchants", template: "ke_papier010", tag: "ke_papier010", x: 18.7, y: 18.3, z: 2.05, bearingDegrees: 180, tagSuffix: "north_notes_b" },
    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 20.8, y: 17.7, bearingDegrees: 270, tagSuffix: "chart_wall_cabinet" },
    { from: "enon_bakery", template: "witcher853", tag: "witcher_shelf_2", x: 21.4, y: 15.8, bearingDegrees: 270, tagSuffix: "chart_wall_shelf" },
    { from: "mtt_hire_rch_1", template: "nwic032", tag: "nwic_chest_5", x: 21.4, y: 14.2, bearingDegrees: 270, tagSuffix: "chart_wall_box" },
    { from: "mtt_hire_rch_1", template: "witcher401", tag: "witcher_swiecznik_3", x: 10.8, y: 17.0, bearingDegrees: 0, tagSuffix: "north_candelabra_a" },
    { from: "mtt_hire_rch_1", template: "witcher401", tag: "witcher_swiecznik_3", x: 19.2, y: 17.0, bearingDegrees: 0, tagSuffix: "north_candelabra_b" },
    { from: "guild_merchants", template: "witcher391", tag: "witcher001", x: 10.8, y: 18.5, bearingDegrees: 180, tagSuffix: "north_map_cabinet_w" },
    { from: "guild_merchants", template: "witcher1szafmap", tag: "witcher006", x: 19.4, y: 18.5, bearingDegrees: 180, tagSuffix: "north_map_cabinet_e" },
    { from: "guild_merchants", template: "ke_ksiazka013", tag: "ke_ksiazka013", x: 13.2, y: 18.55, z: 2.08, bearingDegrees: 180, tagSuffix: "north_book_row_a" },
    { from: "guild_merchants", template: "ke_ksiazka014", tag: "ke_ksiazka014", x: 14.1, y: 18.55, z: 2.08, bearingDegrees: 180, tagSuffix: "north_book_row_b" },
    { from: "guild_merchants", template: "ke_ksiazka015", tag: "ke_ksiazka015", x: 16.0, y: 18.55, z: 2.08, bearingDegrees: 180, tagSuffix: "north_book_row_c" },
    { from: "guild_merchants", template: "ke_ksiazka016", tag: "ke_ksiazka016", x: 16.9, y: 18.55, z: 2.08, bearingDegrees: 180, tagSuffix: "north_book_row_d" },
    { from: "guild_merchants", template: "ke_papier012", tag: "ke_papier012", x: 12.7, y: 18.25, z: 2.12, bearingDegrees: 180, tagSuffix: "north_pinned_note_a" },
    { from: "guild_merchants", template: "ke_papier011", tag: "ke_papier011", x: 13.9, y: 18.15, z: 2.05, bearingDegrees: 180, tagSuffix: "north_pinned_note_b" },
    { from: "guild_merchants", template: "ke_papier009", tag: "ke_papier009", x: 16.2, y: 18.15, z: 2.06, bearingDegrees: 180, tagSuffix: "north_pinned_note_c" },
    { from: "guild_merchants", template: "ke_papier001", tag: "ke_papier001", x: 17.0, y: 18.2, z: 2.1, bearingDegrees: 180, tagSuffix: "north_pinned_note_d" },
    { from: "enon_house_6", template: "zep_tblcltc_002", tag: "ZEP_TBLCLTC_002", x: 15.0, y: 15.9, bearingDegrees: 0, tagSuffix: "north_work_table" },
    { from: "enon_house_6", template: "nwic026", tag: "nwic_carpet_9", x: 15.0, y: 15.15, z: 0.12, bearingDegrees: 0, tagSuffix: "north_table_rug", visualTransform: vt(1.1) },
    { from: "enon_house_6", template: "zep_ci_tbl_002", tag: "ZEP_CI_TBL_002", x: 15.0, y: 14.65, bearingDegrees: 90, tagSuffix: "north_hero_map_table" },
    { from: "enon_house_6", template: "nwic268", tag: "nwic_chair_6", x: 13.8, y: 15.9, bearingDegrees: 270, tagSuffix: "north_work_chair_w" },
    { from: "enon_house_6", template: "nwic268", tag: "nwic_chair_6", x: 16.2, y: 15.9, bearingDegrees: 90, tagSuffix: "north_work_chair_e" },
    { from: "mar_house_1", template: "q_100", tag: "q_chair_6", x: 15.0, y: 13.7, bearingDegrees: 180, tagSuffix: "north_south_chair" },
    { from: "mtt_hire_rch_1", template: "witcher283", tag: "witcher_sphere", x: 11.8, y: 15.4, bearingDegrees: 337, tagSuffix: "north_sky_model" },
    { from: "mtt_hire_rch_1", template: "nwic034", tag: "nwic_chest_7", x: 18.1, y: 14.6, bearingDegrees: 90, tagSuffix: "north_chart_chest" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_4", x: 14.0, y: 15.9, z: 0.98, bearingDegrees: 0, tagSuffix: "north_table_candle_w" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_4", x: 16.0, y: 15.9, z: 0.98, bearingDegrees: 0, tagSuffix: "north_table_candle_e" },
    { from: "guild_merchants", template: "ke_papier010", tag: "ke_papier010", x: 15.0, y: 16.0, z: 1.04, bearingDegrees: 305, tagSuffix: "north_table_chart" },
    { from: "enon_shop_1", template: "nwic245", tag: "nwic_map_8", x: 15.05, y: 14.8, z: 1.06, bearingDegrees: 8, tagSuffix: "north_hero_large_table_map", visualTransform: vt(1.16) },
    { from: "guild_merchants", template: "witcher144", tag: "witcher001", x: 14.95, y: 14.62, z: 1.1, bearingDegrees: 146, tagSuffix: "north_hero_table_map_w", visualTransform: vt(0.86) },
    { from: "guild_merchants", template: "ke_mapa001", tag: "ke_mapa001", x: 15.05, y: 14.75, z: 1.08, bearingDegrees: 8, tagSuffix: "north_hero_table_map", visualTransform: vt(1.08) },
    { from: "guild_merchants", template: "ke_papier014", tag: "ke_papier014", x: 14.2, y: 14.45, z: 1.08, bearingDegrees: 345, tagSuffix: "north_hero_scroll_stack" },
    { from: "guild_merchants", template: "ke_papier010", tag: "ke_papier010", x: 16.0, y: 14.45, z: 1.08, bearingDegrees: 28, tagSuffix: "north_hero_loose_chart" },
    { from: "mtt_hire_rch_1", template: "witcher345", tag: "witcher_book_2", x: 14.0, y: 15.35, z: 0.98, bearingDegrees: 160, tagSuffix: "north_hero_book_scroll" },
    { from: "mar_house_1", template: "witcher994", tag: "witcher_woodentray", x: 16.0, y: 15.25, z: 0.98, bearingDegrees: 8, tagSuffix: "north_hero_tray" },

    // Central planning room: translated directly from the generated concept.
    { from: "wnd_citymarket", template: "zep_house001", tag: "lc_road_6", x: 15.0, y: 7.1, z: 0.02, bearingDegrees: 90, tagSuffix: "center_dirty_stone_slab_s" },
    { from: "wnd_citymarket", template: "zep_house001", tag: "lc_road_6", x: 15.0, y: 9.6, z: 0.02, bearingDegrees: 90, tagSuffix: "center_dirty_stone_slab_n" },
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 12.5, y: 5.0, z: 0.05, bearingDegrees: 0, tagSuffix: "entry_cobble_w" },
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 15.0, y: 5.0, z: 0.05, bearingDegrees: 0, tagSuffix: "entry_cobble_c" },
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 17.5, y: 5.0, z: 0.05, bearingDegrees: 0, tagSuffix: "entry_cobble_e" },
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 12.5, y: 7.5, z: 0.05, bearingDegrees: 0, tagSuffix: "center_cobble_w" },
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 15.0, y: 7.5, z: 0.05, bearingDegrees: 0, tagSuffix: "center_cobble_c" },
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 17.5, y: 7.5, z: 0.05, bearingDegrees: 0, tagSuffix: "center_cobble_e" },
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 12.5, y: 10.0, z: 0.05, bearingDegrees: 0, tagSuffix: "maproom_cobble_w" },
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 15.0, y: 10.0, z: 0.05, bearingDegrees: 0, tagSuffix: "maproom_cobble_c" },
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 17.5, y: 10.0, z: 0.05, bearingDegrees: 0, tagSuffix: "maproom_cobble_e" },
    { from: "enon_distillery", template: "q_314", tag: "q_floor_20", x: 12.5, y: 7.5, z: 0.055, bearingDegrees: 0, tagSuffix: "center_shadow_floor_w" },
    { from: "enon_distillery", template: "q_314", tag: "q_floor_20", x: 17.5, y: 7.5, z: 0.055, bearingDegrees: 0, tagSuffix: "center_shadow_floor_e" },
    { from: "enon_distillery", template: "q_314", tag: "q_floor_20", x: 15.0, y: 5.0, z: 0.055, bearingDegrees: 0, tagSuffix: "entry_shadow_floor_c" },
    { from: "enon_distillery", template: "q_314", tag: "q_floor_20", x: 15.0, y: 10.0, z: 0.055, bearingDegrees: 0, tagSuffix: "maproom_shadow_floor_c" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 13.2, y: 7.1, z: 0.04, bearingDegrees: 22, tagSuffix: "center_floor_stain_a" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 17.1, y: 6.9, z: 0.04, bearingDegrees: 310, tagSuffix: "center_floor_stain_b" },
    { from: "enon_start_ship", template: "ke_kalurza001", tag: "ke_kalurza001", x: 14.1, y: 6.1, z: 0.06, bearingDegrees: 191, tagSuffix: "entry_dirty_puddle" },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 16.8, y: 8.7, z: 0.06, bearingDegrees: 315, tagSuffix: "center_dark_splotch" },
    { from: "enon_house_1", template: "zep_throwrug058", tag: "ZEP_THROWRUG058", x: 15.0, y: 5.7, z: 0.06, bearingDegrees: 91, tagSuffix: "entry_hall_dark_runner" },
    { from: "enon_house_6", template: "witcher486", tag: "witcher_commode_2", x: 13.0, y: 6.1, bearingDegrees: 90, tagSuffix: "entry_hall_low_commode_w" },
    { from: "mtt_hire_rch_1", template: "nwic262", tag: "nwic_bench_6", x: 16.9, y: 6.0, bearingDegrees: 270, tagSuffix: "entry_hall_bench_e" },
    { from: "mtt_hire_rch_1", template: "witcher426", tag: "witcher_casket_1", x: 16.8, y: 5.8, z: 0.8, bearingDegrees: 315, tagSuffix: "entry_hall_bench_box" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_4", x: 13.05, y: 6.2, z: 0.95, bearingDegrees: 0, tagSuffix: "entry_hall_commode_candle" },
    { from: "guild_merchants", template: "ke_papier014", tag: "ke_papier014", x: 13.05, y: 6.0, z: 1.02, bearingDegrees: 12, tagSuffix: "entry_hall_folded_notice" },
    { from: "mtt_hire_rch_1", template: "witcher345", tag: "witcher_book_2", x: 14.25, y: 5.15, z: 0.08, bearingDegrees: 170, tagSuffix: "entry_hall_dropped_book" },
    { from: "hx_library", template: "q_241", tag: "q_scroll", x: 15.8, y: 6.85, z: 0.08, bearingDegrees: 335, tagSuffix: "entry_hall_fallen_scroll" },
    { from: "hx_library", template: "q_241", tag: "q_scroll", x: 13.7, y: 4.95, z: 0.08, bearingDegrees: 335, tagSuffix: "fallen_scroll_near_table" },
    { from: "enon_gang_1", template: "q_051", tag: "q_bookstack", x: 16.4, y: 4.75, z: 0.08, bearingDegrees: 25, tagSuffix: "fallen_bookstack_near_table" },
    { from: "enon_house_6", template: "witcher401", tag: "witcher_swiecznik_3", x: 18.2, y: 5.2, bearingDegrees: 0, tagSuffix: "center_floor_candelabra" },
    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 11.2, y: 7.35, bearingDegrees: 90, tagSuffix: "central_west_map_cabinet" },
    { from: "enon_bakery", template: "witcher853", tag: "witcher_shelf_2", x: 18.8, y: 7.35, bearingDegrees: 270, tagSuffix: "central_east_shelf" },
    { from: "mtt_hire_rch_1", template: "nwic262", tag: "nwic_bench_6", x: 14.8, y: 3.55, bearingDegrees: 0, tagSuffix: "central_entry_bench" },
    { from: "mtt_hire_rch_1", template: "q_224", tag: "q_plants_potted_7", x: 18.4, y: 3.8, bearingDegrees: 45, tagSuffix: "central_entry_plant" },

    // Top-right sleeping nook.
    { from: "enon_house_1", template: "zep_throwrug058", tag: "ZEP_THROWRUG058", x: 25.5, y: 14.6, z: 0.02, bearingDegrees: 92, tagSuffix: "bedroom_dark_rug" },
    { from: "mtt_hire_rch_1", template: "nwic004", tag: "nwic_bed_4", x: 26.5, y: 15.9, bearingDegrees: 270, tagSuffix: "bedroom_bed" },
    { from: "mar_house_1", template: "q_144", tag: "q_endtable", x: 23.2, y: 16.2, bearingDegrees: 180, tagSuffix: "bedroom_bedside" },
    { from: "mar_house_1", template: "witcher405", tag: "witcher_swieca_4", x: 23.2, y: 16.2, z: 0.95, bearingDegrees: 0, tagSuffix: "bedroom_candle" },
    { from: "mtt_hire_rch_1", template: "nwic047", tag: "nwic_commode_4", x: 28.4, y: 18.0, bearingDegrees: 270, tagSuffix: "bedroom_commode" },
    { from: "mtt_hire_rch_1", template: "nwic041", tag: "nwic_cabin_5", x: 22.3, y: 18.1, bearingDegrees: 180, tagSuffix: "bedroom_wardrobe" },
    { from: "mtt_hire_rch_1", template: "q_105", tag: "q_clothingstand_1", x: 22.2, y: 14.2, bearingDegrees: 270, tagSuffix: "bedroom_clothes" },
    { from: "mar_house_1", template: "q_226", tag: "q_plants_potted_9", x: 28.0, y: 13.0, bearingDegrees: 115, tagSuffix: "bedroom_plant" },
    { from: "guild_merchants", template: "zep_tapstry_001", tag: "ZEP_TAPSTRY_001", x: 21.2, y: 18.65, bearingDegrees: 180, tagSuffix: "bedroom_wall_textile" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_1", x: 27.8, y: 16.9, z: 0.95, bearingDegrees: 0, tagSuffix: "bedroom_far_candle" },
    { from: "mtt_hire_rch_1", template: "witcher228", tag: "witcher2_pillow", x: 26.0, y: 15.45, z: 0.95, bearingDegrees: 20, tagSuffix: "bedroom_pillow_a" },
    { from: "mtt_hire_rch_1", template: "witcher228", tag: "witcher2_pillow", x: 26.65, y: 15.45, z: 0.95, bearingDegrees: 335, tagSuffix: "bedroom_pillow_b" },
    { from: "enon_house_6", template: "witcher497", tag: "witcher_crate_sloj_2", x: 28.0, y: 17.75, z: 1.05, bearingDegrees: 0, tagSuffix: "bedroom_commode_jars" },

    // Bottom-left utility/hearth room.
    { from: "mtt_hire_rch_1", template: "witcher547", tag: "witcher_fireplace_3", x: 3.0, y: 3.2, bearingDegrees: 90, tagSuffix: "hearth" },
    { from: "enon_bakery", template: "plc_campfr", tag: "VALELightNodeOrange03m", x: 3.0, y: 3.2, bearingDegrees: 0, tagSuffix: "hearth_light" },
    { from: "enon_bakery", template: "witcher374", tag: "witcher_broom", x: 1.8, y: 4.8, bearingDegrees: 325, tagSuffix: "utility_broom" },
    { from: "enon_bakery", template: "witcher377", tag: "witcher_bucket_3", x: 4.7, y: 2.5, bearingDegrees: 90, tagSuffix: "utility_bucket" },
    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 6.2, y: 2.2, bearingDegrees: 55, tagSuffix: "utility_sack_a" },
    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 7.0, y: 2.4, bearingDegrees: 140, tagSuffix: "utility_sack_b" },
    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 6.6, y: 3.1, bearingDegrees: 10, tagSuffix: "utility_sack_c" },
    { from: "enon_bakery", template: "q_017", tag: "QBarrel2static", x: 7.4, y: 4.2, bearingDegrees: 90, tagSuffix: "utility_barrel" },
    { from: "enon_bakery", template: "witcher853", tag: "witcher_shelf_2", x: 1.2, y: 7.8, bearingDegrees: 90, tagSuffix: "utility_shelf" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_1", x: 6.4, y: 7.4, bearingDegrees: 0, tagSuffix: "utility_candle" },
    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 8.3, y: 7.4, bearingDegrees: 90, tagSuffix: "utility_cabinet" },
    { from: "enon_house_6", template: "q_016", tag: "q_barrel_1", x: 2.0, y: 6.1, bearingDegrees: 0, tagSuffix: "utility_barrel_b" },
    { from: "mtt_hire_rch_1", template: "q_226", tag: "q_plants_potted_9", x: 8.4, y: 2.1, bearingDegrees: 135, tagSuffix: "utility_plant" },
    { from: "guild_merchants", template: "zep_tapstry_005", tag: "ZEP_TAPSTRY_005", x: 1.3, y: 4.8, bearingDegrees: 90, tagSuffix: "utility_wall_textile" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 3.9, y: 3.8, z: 0.04, bearingDegrees: 15, tagSuffix: "hearth_soot_stain" },
    { from: "enon_house_1", template: "zep_splat003", tag: "ZEP_SPLAT003", x: 3.1, y: 4.2, z: 0.06, bearingDegrees: 180, tagSuffix: "hearth_wall_soot_splotch" },
    { from: "enon_gang_1", template: "q_209", tag: "q_barrels", x: 5.1, y: 5.6, bearingDegrees: 215, tagSuffix: "hearth_barrel_group" },
    { from: "enon_start_ship", template: "ke_kalurza001", tag: "ke_kalurza001", x: 4.8, y: 3.3, z: 0.06, bearingDegrees: 71, tagSuffix: "hearth_dirty_puddle" },
    { from: "enon_house_1", template: "witcher264", tag: "witcher2_campfire_2", x: 3.0, y: 3.2, z: 0.04, bearingDegrees: 0, tagSuffix: "hearth_ember_bed" },
    { from: "enon_house_6", template: "witcher497", tag: "witcher_crate_sloj_2", x: 1.65, y: 7.35, z: 0.92, bearingDegrees: 90, tagSuffix: "utility_shelf_jars" },
    { from: "enon_house_1", template: "witcher937", tag: "witcher_vial", x: 1.55, y: 7.0, z: 0.92, bearingDegrees: 0, tagSuffix: "utility_shelf_vial" },
    { from: "mar_shipyard_war", template: "witcher908", tag: "witcher_tool", x: 6.95, y: 5.15, z: 0.08, bearingDegrees: 72, tagSuffix: "utility_hammer_map_required" },
    { from: "enon_house_6", template: "witcher497", tag: "witcher_crate_sloj_2", x: 1.65, y: 6.75, z: 0.92, bearingDegrees: 90, tagSuffix: "utility_shelf_jars_map_density" },
    { from: "enon_house_1", template: "witcher937", tag: "witcher_vial", x: 2.05, y: 7.2, z: 0.92, bearingDegrees: 0, tagSuffix: "utility_shelf_vial_map_density" },
    { from: "enon_bakery", template: "witcher377", tag: "witcher_bucket_3", x: 4.35, y: 5.35, bearingDegrees: 25, tagSuffix: "utility_bucket_map_density" },
    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 7.65, y: 5.35, bearingDegrees: 210, tagSuffix: "utility_sack_map_density" },
    { from: "enon_house_6", template: "q_016", tag: "q_barrel_1", x: 7.9, y: 6.45, bearingDegrees: 0, tagSuffix: "utility_barrel_map_density" },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 1.85, y: 3.25, z: 1.02, bearingDegrees: 0, tagSuffix: "utility_low_warm_light_map_density" },

    // Entry/corridor: sparse breathing room.
    { from: "enon_house_6", template: "q_154", tag: "q_floor_7", x: 15.0, y: 4.8, z: 0.05, bearingDegrees: 0, tagSuffix: "entry_inner_cobble" },
    { from: "enon_house_6", template: "witcher486", tag: "witcher_commode_2", x: 11.7, y: 4.5, bearingDegrees: 0, tagSuffix: "entry_low_commode" },
    { from: "enon_house_6", template: "witcher401", tag: "witcher_swiecznik_3", x: 11.8, y: 4.8, bearingDegrees: 0, tagSuffix: "entry_candelabra" },
    { from: "mtt_hire_rch_1", template: "nwic262", tag: "nwic_bench_6", x: 17.8, y: 3.4, bearingDegrees: 0, tagSuffix: "entry_bench" },
    { from: "enon_shop_1", template: "q_051", tag: "q_bookstack", x: 18.4, y: 4.2, bearingDegrees: 0, tagSuffix: "entry_bookstack" },
    { from: "mtt_hire_rch_1", template: "q_224", tag: "q_plants_potted_7", x: 19.0, y: 6.2, bearingDegrees: 45, tagSuffix: "entry_plant" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 15.0, y: 4.0, z: 0.04, bearingDegrees: 90, tagSuffix: "entry_floor_wear" },
    { from: "mtt_hire_rch_1", template: "witcher426", tag: "witcher_casket_1", x: 18.15, y: 3.7, z: 0.8, bearingDegrees: 20, tagSuffix: "entry_bench_casket" },

    // Bottom-right port storage.
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 25.0, y: 4.3, z: 0.06, bearingDegrees: 315, tagSuffix: "storage_dark_floor_wear" },
    { from: "enon_start_ship", template: "nw_plc_ropecoil1", tag: "nw_plc_ropecoil1", x: 25.0, y: 5.4, bearingDegrees: 280, tagSuffix: "storage_rope_a" },
    { from: "enon_start_ship", template: "nw_plc_ropecoil1", tag: "nw_plc_ropecoil1", x: 26.4, y: 5.7, bearingDegrees: 55, tagSuffix: "storage_rope_b" },
    { from: "mar_house_1", template: "q_125", tag: "q_crate_1", x: 23.4, y: 2.8, bearingDegrees: 20, tagSuffix: "storage_crate_a" },
    { from: "mar_house_1", template: "q_126", tag: "q_crate_2", x: 24.9, y: 2.7, bearingDegrees: 310, tagSuffix: "storage_crate_b" },
    { from: "enon_gang_1", template: "witcher494", tag: "witcher_crate_mine", x: 27.3, y: 2.6, bearingDegrees: 225, tagSuffix: "storage_locked_crate" },
    { from: "enon_house_3", template: "q_127", tag: "q_crate_3", x: 26.2, y: 3.3, bearingDegrees: 300, tagSuffix: "storage_crate_c" },
    { from: "enon_house_6", template: "q_016", tag: "q_barrel_1", x: 28.2, y: 4.9, bearingDegrees: 0, tagSuffix: "storage_barrel_a" },
    { from: "enon_house_6", template: "q_016", tag: "q_barrel_1", x: 27.2, y: 6.8, bearingDegrees: 0, tagSuffix: "storage_barrel_b" },
    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 23.2, y: 6.6, bearingDegrees: 90, tagSuffix: "storage_sack" },
    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 24.0, y: 6.9, bearingDegrees: 45, tagSuffix: "storage_sack_b" },
    { from: "enon_bakery", template: "witcher374", tag: "witcher_broom", x: 28.8, y: 7.6, bearingDegrees: 315, tagSuffix: "storage_broom" },
    { from: "enon_bakery", template: "witcher377", tag: "witcher_bucket_3", x: 28.25, y: 6.95, bearingDegrees: 130, tagSuffix: "storage_tool_bucket_map_required" },
    { from: "mar_shipyard_war", template: "witcher653", tag: "witcher_ladder_2", x: 21.75, y: 7.75, bearingDegrees: 88, tagSuffix: "storage_ladder_map_required" },
    { from: "mar_shipyard_war", template: "witcher908", tag: "witcher_tool", x: 23.35, y: 6.15, z: 0.12, bearingDegrees: 18, tagSuffix: "storage_hammer_map_required" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_1", x: 27.8, y: 2.4, bearingDegrees: 0, tagSuffix: "storage_candle" },
    { from: "guild_merchants", template: "zep_tapstry_006", tag: "ZEP_TAPSTRY_006", x: 28.8, y: 5.1, bearingDegrees: 270, tagSuffix: "storage_wall_textile" },
    { from: "enon_house_6", template: "zep_cask001", tag: "CrateWine1", x: 24.0, y: 4.2, bearingDegrees: 15, tagSuffix: "storage_wine_crate_stack_a" },
    { from: "enon_house_6", template: "zep_cask001", tag: "CrateWine4", x: 24.6, y: 4.2, bearingDegrees: 340, tagSuffix: "storage_wine_crate_stack_b" },
    { from: "enon_house_1", template: "q_239", tag: "q_sack", x: 25.5, y: 6.6, z: 0.5, bearingDegrees: 120, tagSuffix: "storage_small_sack" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 26.5, y: 3.9, z: 0.04, bearingDegrees: 275, tagSuffix: "storage_floor_stain" },
    { from: "mar_house_1", template: "q_125", tag: "q_crate_1", x: 22.15, y: 4.95, bearingDegrees: 82, tagSuffix: "storage_left_crate_map_density" },
    { from: "enon_house_6", template: "q_016", tag: "q_barrel_1", x: 28.45, y: 7.05, bearingDegrees: 0, tagSuffix: "storage_wall_barrel_map_density" },
    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 23.75, y: 5.55, bearingDegrees: 290, tagSuffix: "storage_sack_map_density" },
    { from: "enon_start_ship", template: "nw_plc_ropecoil1", tag: "nw_plc_ropecoil1", x: 26.95, y: 4.45, bearingDegrees: 208, tagSuffix: "storage_rope_map_density" },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 28.4, y: 7.65, z: 1.02, bearingDegrees: 0, tagSuffix: "storage_wall_warm_light_map_density" },

    // Wall flavor and Last City clutter.
    { from: "mar_house_1", template: "q_207", tag: "q_painting_10", x: 9.2, y: 18.8, bearingDegrees: 180, tagSuffix: "old_painting" },
    { from: "mtt_hire_rch_1", template: "witcher899", tag: "witcher_tapestry_1", x: 20.3, y: 13.4, bearingDegrees: 90, tagSuffix: "side_tapestry" },
    { from: "enon_house_6", template: "q_278", tag: "q_tapestry", x: 1.3, y: 8.2, bearingDegrees: 90, tagSuffix: "utility_tapestry" },

    // Concept-art mood pass: denser perimeter, darker floor breaks, one clear hero map room.
    { from: "enon_gang_2", template: "q_052", tag: "q_bookshelf_1", x: 8.55, y: 18.35, bearingDegrees: 270, tagSuffix: "study_bookshelf_e" },
    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 8.45, y: 16.15, bearingDegrees: 270, tagSuffix: "study_dark_cabinet_e" },
    { from: "mtt_hire_rch_1", template: "nwic034", tag: "nwic_chest_7", x: 8.35, y: 13.15, bearingDegrees: 270, tagSuffix: "study_chart_chest_e" },
    { from: "guild_merchants", template: "ke_papier012", tag: "ke_papier012", x: 2.55, y: 18.5, z: 2.05, bearingDegrees: 180, tagSuffix: "study_pinned_note_a" },
    { from: "guild_merchants", template: "ke_papier011", tag: "ke_papier011", x: 3.2, y: 18.55, z: 2.04, bearingDegrees: 180, tagSuffix: "study_pinned_note_b" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_1", x: 7.95, y: 16.2, z: 0.95, bearingDegrees: 0, tagSuffix: "study_side_candle" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 6.0, y: 16.5, z: 0.045, bearingDegrees: 44, tagSuffix: "study_floor_worn_shadow" },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 7.5, y: 14.15, z: 0.06, bearingDegrees: 293, tagSuffix: "study_dark_corner_grime" },

    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 10.8, y: 13.05, bearingDegrees: 90, tagSuffix: "north_room_left_cabinet" },
    { from: "enon_bakery", template: "witcher853", tag: "witcher_shelf_2", x: 19.2, y: 13.15, bearingDegrees: 270, tagSuffix: "north_room_right_shelf" },
    { from: "mtt_hire_rch_1", template: "nwic032", tag: "nwic_chest_5", x: 12.0, y: 13.0, bearingDegrees: 180, tagSuffix: "north_room_low_map_box" },
    { from: "mtt_hire_rch_1", template: "nwic034", tag: "nwic_chest_7", x: 18.0, y: 13.0, bearingDegrees: 180, tagSuffix: "north_room_low_chart_chest" },
    { from: "guild_merchants", template: "ke_papier001", tag: "ke_papier001", x: 14.0, y: 18.15, z: 2.12, bearingDegrees: 180, tagSuffix: "north_wall_extra_note_a" },
    { from: "guild_merchants", template: "ke_papier009", tag: "ke_papier009", x: 15.0, y: 18.2, z: 2.1, bearingDegrees: 180, tagSuffix: "north_wall_extra_note_b" },
    { from: "guild_merchants", template: "ke_papier010", tag: "ke_papier010", x: 16.1, y: 18.25, z: 2.1, bearingDegrees: 180, tagSuffix: "north_wall_extra_note_c" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 15.0, y: 13.2, z: 0.045, bearingDegrees: 15, tagSuffix: "north_room_under_table_wear" },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 12.8, y: 14.0, z: 0.06, bearingDegrees: 333, tagSuffix: "north_room_left_dark_grime" },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 17.2, y: 14.0, z: 0.06, bearingDegrees: 24, tagSuffix: "north_room_right_dark_grime" },

    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 21.8, y: 15.2, bearingDegrees: 90, tagSuffix: "bedroom_left_map_cabinet" },
    { from: "mtt_hire_rch_1", template: "nwic047", tag: "nwic_commode_4", x: 28.45, y: 14.0, bearingDegrees: 270, tagSuffix: "bedroom_lower_commode" },
    { from: "mar_house_1", template: "q_207", tag: "q_painting_10", x: 28.7, y: 18.25, bearingDegrees: 270, tagSuffix: "bedroom_old_painting" },
    { from: "mtt_hire_rch_1", template: "witcher899", tag: "witcher_tapestry_1", x: 28.7, y: 16.1, bearingDegrees: 270, tagSuffix: "bedroom_side_tapestry" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_1", x: 28.05, y: 14.1, z: 0.95, bearingDegrees: 0, tagSuffix: "bedroom_lower_candle" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 25.2, y: 13.3, z: 0.045, bearingDegrees: 205, tagSuffix: "bedroom_floor_shadow" },

    { from: "enon_house_1", template: "zep_throwrug058", tag: "ZEP_THROWRUG058", x: 5.1, y: 5.45, z: 0.04, bearingDegrees: 0, tagSuffix: "hearth_dark_runner" },
    { from: "enon_bakery", template: "q_017", tag: "QBarrel2static", x: 1.65, y: 2.8, bearingDegrees: 60, tagSuffix: "hearth_side_barrel_a" },
    { from: "enon_house_6", template: "q_016", tag: "q_barrel_1", x: 2.25, y: 2.15, bearingDegrees: 0, tagSuffix: "hearth_side_barrel_b" },
    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 7.6, y: 6.95, bearingDegrees: 200, tagSuffix: "utility_corner_sack_d" },
    { from: "mtt_hire_rch_1", template: "nwic032", tag: "nwic_chest_5", x: 8.3, y: 5.65, bearingDegrees: 270, tagSuffix: "utility_low_chest_e" },
    { from: "guild_merchants", template: "zep_tapstry_005", tag: "ZEP_TAPSTRY_005", x: 8.75, y: 4.2, bearingDegrees: 270, tagSuffix: "utility_side_wall_textile" },

    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 14.9, y: 4.95, z: 0.06, bearingDegrees: 11, tagSuffix: "entry_hall_dark_floor_mass" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 13.1, y: 4.8, z: 0.045, bearingDegrees: 62, tagSuffix: "entry_hall_wear_w" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 16.9, y: 5.15, z: 0.045, bearingDegrees: 297, tagSuffix: "entry_hall_wear_e" },
    { from: "enon_house_6", template: "witcher497", tag: "witcher_crate_sloj_2", x: 11.6, y: 4.55, z: 0.92, bearingDegrees: 90, tagSuffix: "entry_low_commode_jars" },
    { from: "mtt_hire_rch_1", template: "nwic034", tag: "nwic_chest_7", x: 18.7, y: 4.7, bearingDegrees: 270, tagSuffix: "entry_side_chest" },

    { from: "enon_house_1", template: "zep_throwrug058", tag: "ZEP_THROWRUG058", x: 25.6, y: 3.95, z: 0.04, bearingDegrees: 180, tagSuffix: "storage_dark_rug" },
    { from: "enon_start_ship", template: "nw_plc_ropecoil1", tag: "nw_plc_ropecoil1", x: 28.2, y: 2.7, bearingDegrees: 120, tagSuffix: "storage_rope_c" },
    { from: "mar_house_1", template: "q_125", tag: "q_crate_1", x: 23.1, y: 7.35, bearingDegrees: 90, tagSuffix: "storage_crate_back_a" },
    { from: "mar_house_1", template: "q_126", tag: "q_crate_2", x: 24.5, y: 7.35, bearingDegrees: 270, tagSuffix: "storage_crate_back_b" },
    { from: "enon_house_3", template: "q_127", tag: "q_crate_3", x: 25.8, y: 7.35, bearingDegrees: 180, tagSuffix: "storage_crate_back_c" },
    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 28.55, y: 7.55, bearingDegrees: 270, tagSuffix: "storage_tall_side_cabinet" },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 27.0, y: 4.95, z: 0.06, bearingDegrees: 44, tagSuffix: "storage_floor_dark_mass_b" },

    // Visual composition pass: bigger readable masses to close the gap with the concept art.
    { from: "enon_house_1", template: "zep_throwrug058", tag: "ZEP_THROWRUG058", x: 15.0, y: 15.2, z: 0.11, bearingDegrees: 90, tagSuffix: "hero_map_room_deep_rug", visualTransform: vt(1.12) },
    { from: "enon_house_6", template: "nwic026", tag: "nwic_carpet_9", x: 15.0, y: 14.95, z: 0.13, bearingDegrees: 90, tagSuffix: "hero_map_room_visible_carpet", visualTransform: vt(1.08) },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 15.2, y: 14.7, z: 0.12, bearingDegrees: 12, tagSuffix: "hero_map_room_floor_shadow", visualTransform: vt(1.25) },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 13.4, y: 15.0, z: 0.115, bearingDegrees: 67, tagSuffix: "hero_map_room_worn_floor_w" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 16.7, y: 15.0, z: 0.115, bearingDegrees: 298, tagSuffix: "hero_map_room_worn_floor_e" },
    { from: "enon_gang_1", template: "witcher690", tag: "witcher_map_2", x: 13.6, y: 18.75, z: 2.08, bearingDegrees: 180, tagSuffix: "hero_wall_chart_wide_a", visualTransform: vt(1.16) },
    { from: "enon_gang_2", template: "witcher689", tag: "witcher_map_1", x: 16.4, y: 18.78, z: 2.06, bearingDegrees: 180, tagSuffix: "hero_wall_chart_wide_b", visualTransform: vt(1.16) },
    { from: "enon_shop_1", template: "nwic245", tag: "nwic_map_8", x: 15.0, y: 18.65, z: 2.18, bearingDegrees: 180, tagSuffix: "hero_wall_large_center_map", visualTransform: vt(1.24) },
    { from: "guild_merchants", template: "ke_papier012", tag: "ke_papier012", x: 11.7, y: 18.35, z: 2.12, bearingDegrees: 180, tagSuffix: "hero_wall_left_note_stack_a" },
    { from: "guild_merchants", template: "ke_papier011", tag: "ke_papier011", x: 18.2, y: 18.35, z: 2.12, bearingDegrees: 180, tagSuffix: "hero_wall_right_note_stack_a" },
    { from: "enon_bakery", template: "witcher853", tag: "witcher_shelf_2", x: 11.25, y: 16.0, bearingDegrees: 90, tagSuffix: "hero_room_left_tall_shelf", visualTransform: vt(1.06) },
    { from: "enon_bakery", template: "witcher853", tag: "witcher_shelf_2", x: 18.75, y: 16.0, bearingDegrees: 270, tagSuffix: "hero_room_right_tall_shelf", visualTransform: vt(1.06) },
    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 11.15, y: 14.0, bearingDegrees: 90, tagSuffix: "hero_room_left_dark_cabinet" },
    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 18.85, y: 14.0, bearingDegrees: 270, tagSuffix: "hero_room_right_dark_cabinet" },
    { from: "enon_house_6", template: "witcher497", tag: "witcher_crate_sloj_2", x: 11.4, y: 16.0, z: 0.92, bearingDegrees: 90, tagSuffix: "hero_left_shelf_jars", visualTransform: vt(0.82) },
    { from: "enon_house_6", template: "witcher497", tag: "witcher_crate_sloj_2", x: 18.6, y: 16.0, z: 0.92, bearingDegrees: 270, tagSuffix: "hero_right_shelf_jars", visualTransform: vt(0.82) },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_4", x: 12.1, y: 17.25, z: 0.98, bearingDegrees: 0, tagSuffix: "hero_left_low_candle" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_4", x: 17.9, y: 17.25, z: 0.98, bearingDegrees: 0, tagSuffix: "hero_right_low_candle" },

    { from: "enon_house_1", template: "zep_throwrug058", tag: "ZEP_THROWRUG058", x: 15.0, y: 8.15, z: 0.11, bearingDegrees: 90, tagSuffix: "lower_hall_deep_runner", visualTransform: vt(1.1) },
    { from: "enon_house_6", template: "nwic026", tag: "nwic_carpet_9", x: 15.0, y: 8.05, z: 0.13, bearingDegrees: 90, tagSuffix: "lower_hall_visible_carpet" },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 15.0, y: 8.55, z: 0.12, bearingDegrees: 187, tagSuffix: "lower_hall_shadow_mass", visualTransform: vt(1.2) },
    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 11.2, y: 9.0, bearingDegrees: 90, tagSuffix: "lower_hall_west_tall_cabinet" },
    { from: "enon_bakery", template: "witcher853", tag: "witcher_shelf_2", x: 18.8, y: 9.0, bearingDegrees: 270, tagSuffix: "lower_hall_east_tall_shelf" },
    { from: "guild_merchants", template: "ke_papier014", tag: "ke_papier014", x: 12.0, y: 9.2, z: 0.95, bearingDegrees: 12, tagSuffix: "lower_hall_cabinet_notice" },
    { from: "hx_library", template: "q_241", tag: "q_scroll", x: 17.8, y: 8.6, z: 0.95, bearingDegrees: 334, tagSuffix: "lower_hall_shelf_scroll" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_4", x: 18.2, y: 9.05, z: 0.95, bearingDegrees: 0, tagSuffix: "lower_hall_shelf_candle" },

    { from: "enon_gang_2", template: "q_052", tag: "q_bookshelf_1", x: 1.65, y: 16.2, bearingDegrees: 90, tagSuffix: "study_left_wall_bookcase_mid" },
    { from: "mtt_hire_rch_1", template: "witcher390", tag: "witcher_cabinet_2", x: 8.45, y: 17.35, bearingDegrees: 270, tagSuffix: "study_right_wall_dark_cabinet_mid" },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 5.4, y: 13.6, z: 0.11, bearingDegrees: 96, tagSuffix: "study_round_table_shadow" },
    { from: "enon_house_6", template: "witcher402", tag: "witcher_swieca_1", x: 7.7, y: 13.3, z: 0.84, bearingDegrees: 0, tagSuffix: "study_round_table_candle" },

    { from: "mtt_hire_rch_1", template: "nwic041", tag: "nwic_cabin_5", x: 22.2, y: 13.4, bearingDegrees: 90, tagSuffix: "bedroom_left_low_wardrobe" },
    { from: "mtt_hire_rch_1", template: "nwic034", tag: "nwic_chest_7", x: 28.4, y: 13.2, bearingDegrees: 270, tagSuffix: "bedroom_right_low_chest" },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 25.9, y: 15.0, z: 0.11, bearingDegrees: 8, tagSuffix: "bedroom_under_bed_shadow" },
    { from: "guild_merchants", template: "ke_papier010", tag: "ke_papier010", x: 22.0, y: 18.2, z: 2.06, bearingDegrees: 180, tagSuffix: "bedroom_wall_private_note" },
    { from: "enon_house_6", template: "witcher497", tag: "witcher_crate_sloj_2", x: 23.1, y: 16.1, z: 0.98, bearingDegrees: 0, tagSuffix: "bedroom_bedside_jars" },

    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 22.6, y: 4.0, bearingDegrees: 35, tagSuffix: "storage_front_sack_cluster_a" },
    { from: "enon_bakery", template: "witcher230", tag: "witcher2_bag", x: 23.0, y: 4.9, bearingDegrees: 112, tagSuffix: "storage_front_sack_cluster_b" },
    { from: "enon_house_6", template: "q_016", tag: "q_barrel_1", x: 28.1, y: 6.0, bearingDegrees: 0, tagSuffix: "storage_right_barrel_stack_c" },
    { from: "enon_start_ship", template: "nw_plc_ropecoil1", tag: "nw_plc_ropecoil1", x: 26.6, y: 2.4, bearingDegrees: 25, tagSuffix: "storage_floor_rope_d" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 24.2, y: 5.8, z: 0.11, bearingDegrees: 212, tagSuffix: "storage_wet_floor_wear" },

    // Concept lock pass: richer silhouettes and warmer saturated masses visible from top-down Toolset view.
    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 5.2, y: 15.15, z: 0.16, bearingDegrees: 90, tagSuffix: "study_rich_red_carpet_lock", visualTransform: vt(1.08) },
    { from: "enon_house_1", template: "witcher840", tag: "witcher_screen", x: 1.35, y: 16.0, bearingDegrees: 90, tagSuffix: "study_left_shadow_screen", visualTransform: vt(1.32, { scaleY: 1.42 }) },
    { from: "enon_house_1", template: "witcher840", tag: "witcher_screen", x: 8.7, y: 15.4, bearingDegrees: 270, tagSuffix: "study_right_shadow_screen", visualTransform: vt(1.28, { scaleY: 1.36 }) },
    { from: "guild_merchants", template: "bookpiles001", tag: "BookPiles", x: 4.0, y: 17.25, z: 0.98, bearingDegrees: 21, tagSuffix: "study_desk_bookpile_lock" },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 2.0, y: 18.05, z: 1.08, bearingDegrees: 0, tagSuffix: "study_wall_warm_light_lock" },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 8.05, y: 17.65, z: 1.08, bearingDegrees: 0, tagSuffix: "study_shelf_warm_light_lock" },
    { from: "enon_house_1", template: "witcher531", tag: "witcher_fabricbale_4", x: 7.6, y: 12.7, z: 0.04, bearingDegrees: 340, tagSuffix: "study_canvas_roll_lock", visualTransform: vt(0.88) },

    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 15.0, y: 15.05, z: 0.18, bearingDegrees: 90, tagSuffix: "hero_deep_center_carpet_lock", visualTransform: vt(1.12) },
    { from: "enon_house_1", template: "zep_throwrug058", tag: "ZEP_THROWRUG058", x: 15.0, y: 14.05, z: 0.19, bearingDegrees: 90, tagSuffix: "hero_front_dark_rug_lock", visualTransform: vt(1.08) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 12.5, y: 13.4, z: 0.13, bearingDegrees: 90, tagSuffix: "hero_stone_floor_front_w_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 15.0, y: 13.4, z: 0.13, bearingDegrees: 90, tagSuffix: "hero_stone_floor_front_c_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 17.5, y: 13.4, z: 0.13, bearingDegrees: 90, tagSuffix: "hero_stone_floor_front_e_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 12.5, y: 16.7, z: 0.13, bearingDegrees: 90, tagSuffix: "hero_stone_floor_back_w_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 15.0, y: 16.7, z: 0.13, bearingDegrees: 90, tagSuffix: "hero_stone_floor_back_c_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 17.5, y: 16.7, z: 0.13, bearingDegrees: 90, tagSuffix: "hero_stone_floor_back_e_visual" },
    { from: "enon_house_1", template: "witcher939", tag: "witcher_wall_1", x: 10.55, y: 16.7, bearingDegrees: 90, tagSuffix: "hero_left_wood_panel_lock", visualTransform: vt(1.12) },
    { from: "mtt_hire_rch_1", template: "witcher939", tag: "witcher_wall_1", x: 19.45, y: 16.7, bearingDegrees: 270, tagSuffix: "hero_right_wood_panel_lock", visualTransform: vt(1.12) },
    { from: "enon_house_1", template: "witcher840", tag: "witcher_screen", x: 11.0, y: 17.9, bearingDegrees: 90, tagSuffix: "hero_left_screen_lock", visualTransform: vt(1.58, { scaleY: 1.74 }) },
    { from: "mar_house_1", template: "witcher840", tag: "witcher_screen", x: 19.0, y: 17.9, bearingDegrees: 270, tagSuffix: "hero_right_screen_lock", visualTransform: vt(1.58, { scaleY: 1.74 }) },
    { from: "guild_merchants", template: "bookpiles001", tag: "BookPiles", x: 15.85, y: 14.85, z: 1.12, bearingDegrees: 328, tagSuffix: "hero_table_bookpile_lock", visualTransform: vt(0.82) },
    { from: "enon_house_6", template: "zep_bbook004", tag: "ZEP_BBOOK004", x: 14.35, y: 15.2, z: 1.12, bearingDegrees: 42, tagSuffix: "hero_table_open_book_lock", visualTransform: vt(0.9) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 12.15, y: 18.15, z: 1.2, bearingDegrees: 0, tagSuffix: "hero_chart_wall_candle_w_lock" },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 17.85, y: 18.15, z: 1.2, bearingDegrees: 0, tagSuffix: "hero_chart_wall_candle_e_lock" },
    { from: "hx_library", template: "q_241", tag: "q_scroll", x: 12.4, y: 13.05, z: 0.12, bearingDegrees: 88, tagSuffix: "hero_left_scroll_bundle_lock" },
    { from: "hx_library", template: "q_241", tag: "q_scroll", x: 17.6, y: 13.05, z: 0.12, bearingDegrees: 272, tagSuffix: "hero_right_scroll_bundle_lock" },

    { from: "enon_house_1", template: "witcher414", tag: "witcher_carpet_3", x: 25.6, y: 15.2, z: 0.15, bearingDegrees: 90, tagSuffix: "bedroom_dark_red_rug_lock", visualTransform: vt(1.08) },
    { from: "enon_house_6", template: "q_278", tag: "q_tapestry", x: 21.15, y: 17.1, bearingDegrees: 90, tagSuffix: "bedroom_left_wall_tapestry_lock" },
    { from: "mtt_hire_rch_1", template: "witcher987", tag: "witcher_window_7", x: 28.95, y: 16.2, bearingDegrees: 270, tagSuffix: "bedroom_side_window_lock" },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 22.35, y: 13.75, z: 1.05, bearingDegrees: 0, tagSuffix: "bedroom_warm_corner_lock" },
    { from: "enon_house_1", template: "witcher531", tag: "witcher_fabricbale_4", x: 28.0, y: 13.1, z: 0.04, bearingDegrees: 180, tagSuffix: "bedroom_textile_roll_lock", visualTransform: vt(0.9) },

    // Concept parity pass: heavier dark silhouettes and more closed private niches from the Toolset top-down view.
    { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 10.55, y: 13.1, bearingDegrees: 90, tagSuffix: "hero_left_lower_wood_panel_parity", visualTransform: vt(1.1) },
    { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 19.45, y: 13.1, bearingDegrees: 270, tagSuffix: "hero_right_lower_wood_panel_parity", visualTransform: vt(1.1) },
    { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 10.55, y: 9.35, bearingDegrees: 90, tagSuffix: "entry_left_heavy_post_parity", visualTransform: vt(1.12) },
    { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 19.45, y: 9.35, bearingDegrees: 270, tagSuffix: "entry_right_heavy_post_parity", visualTransform: vt(1.12) },
    { from: "enon_house_3", template: "witcher984", tag: "witcher_window_4", x: 1.05, y: 15.8, z: 0, bearingDegrees: 90, tagSuffix: "study_left_dark_window_parity" },
    { from: "enon_house_6", template: "witcher987", tag: "witcher_window_7", x: 28.95, y: 13.15, z: 0, bearingDegrees: 270, tagSuffix: "bedroom_lower_side_window_parity" },
    { from: "mtt_hire_rch_1", template: "nwic051", tag: "nwic_screen_1", x: 22.1, y: 11.95, z: 0, bearingDegrees: 90, tagSuffix: "bedroom_storage_left_return_screen_parity" },
    { from: "mtt_hire_rch_1", template: "nwic051", tag: "nwic_screen_1", x: 28.25, y: 11.95, z: 0, bearingDegrees: 270, tagSuffix: "bedroom_storage_right_return_screen_parity" },

    { from: "enon_house_6", template: "witcher530", tag: "witcher_fabricbale_3", x: 2.0, y: 7.2, z: 0.04, bearingDegrees: 90, tagSuffix: "utility_rolled_fabric_lock" },
    { from: "mtt_hire_rch_1", template: "witcher418", tag: "witcher_carpet_7", x: 5.1, y: 5.0, z: 0.16, bearingDegrees: 0, tagSuffix: "utility_warm_carpet_lock" },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 8.2, y: 4.4, z: 1.03, bearingDegrees: 0, tagSuffix: "utility_side_candle_lock" },
    { from: "enon_house_6", template: "q_278", tag: "q_tapestry", x: 1.15, y: 5.3, bearingDegrees: 90, tagSuffix: "utility_left_tapestry_lock" },

    { from: "enon_house_1", template: "zep_throwrug054", tag: "ZEP_THROWRUG054", x: 15.0, y: 5.5, z: 0.16, bearingDegrees: 90, tagSuffix: "entry_red_runner_lock", visualTransform: vt(1.08) },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 12.5, y: 5.0, z: 0.12, bearingDegrees: 0, tagSuffix: "entry_stone_floor_w_lock" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 17.5, y: 5.0, z: 0.12, bearingDegrees: 0, tagSuffix: "entry_stone_floor_e_lock" },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 13.7, y: 6.85, z: 0.18, bearingDegrees: 36, tagSuffix: "lower_hall_dark_floor_w_lock", visualTransform: vt(1.18) },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 16.4, y: 6.75, z: 0.18, bearingDegrees: 304, tagSuffix: "lower_hall_worn_floor_e_lock" },
    { from: "enon_house_1", template: "witcher840", tag: "witcher_screen", x: 11.0, y: 8.1, bearingDegrees: 90, tagSuffix: "lower_hall_left_screen_lock", visualTransform: vt(1.5, { scaleY: 1.66 }) },
    { from: "mar_house_1", template: "witcher840", tag: "witcher_screen", x: 19.0, y: 8.1, bearingDegrees: 270, tagSuffix: "lower_hall_right_screen_lock", visualTransform: vt(1.5, { scaleY: 1.66 }) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 12.4, y: 9.05, z: 1.04, bearingDegrees: 0, tagSuffix: "lower_hall_warm_left_lock" },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 17.6, y: 9.05, z: 1.04, bearingDegrees: 0, tagSuffix: "lower_hall_warm_right_lock" },

    // Aurora visual pass: stronger stone mass in the centre and clearer right-column split.
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 12.5, y: 7.5, z: 0.14, bearingDegrees: 90, tagSuffix: "lower_hall_stone_w_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 15.0, y: 7.5, z: 0.14, bearingDegrees: 90, tagSuffix: "lower_hall_stone_c_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 17.5, y: 7.5, z: 0.14, bearingDegrees: 90, tagSuffix: "lower_hall_stone_e_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 12.5, y: 10.0, z: 0.14, bearingDegrees: 90, tagSuffix: "maproom_stone_w_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 15.0, y: 10.0, z: 0.14, bearingDegrees: 90, tagSuffix: "maproom_stone_c_visual" },
    { from: "enon_house_1", template: "q_148", tag: "q_floor_1", x: 17.5, y: 10.0, z: 0.14, bearingDegrees: 90, tagSuffix: "maproom_stone_e_visual" },
    { from: "wnd_tmplt_flat_5", template: "nwic052", tag: "nwic_screen_2", x: 23.9, y: 10.95, z: 0, bearingDegrees: 0, tagSuffix: "bed_storage_split_screen_a" },
    { from: "wnd_tmplt_flat_5", template: "nwic052", tag: "nwic_screen_2", x: 25.4, y: 10.95, z: 0, bearingDegrees: 0, tagSuffix: "bed_storage_split_screen_b" },
    { from: "wnd_tmplt_flat_5", template: "nwic052", tag: "nwic_screen_2", x: 26.9, y: 10.95, z: 0, bearingDegrees: 0, tagSuffix: "bed_storage_split_screen_c" },
    { from: "wnd_tmplt_flat_5", template: "nwic052", tag: "nwic_screen_2", x: 28.4, y: 10.95, z: 0, bearingDegrees: 0, tagSuffix: "bed_storage_split_screen_d" },

    { from: "guild_merchants", template: "zep_tapstry_001", tag: "ZEP_TAPSTRY_001", x: 28.85, y: 4.1, bearingDegrees: 270, tagSuffix: "storage_persian_wall_lock" },
    { from: "enon_house_1", template: "witcher531", tag: "witcher_fabricbale_4", x: 23.8, y: 7.0, z: 0.04, bearingDegrees: 18, tagSuffix: "storage_rolled_canvas_lock" },
    { from: "guild_merchants", template: "bookpiles001", tag: "BookPiles", x: 27.6, y: 7.0, z: 0.74, bearingDegrees: 338, tagSuffix: "storage_manifest_stack_lock", visualTransform: vt(0.86) },
    { from: "mtt_hire_rch_1", template: "witcher409", tag: "witcher_swieca_8", x: 28.15, y: 2.9, z: 0.9, bearingDegrees: 0, tagSuffix: "storage_back_candle_lock" },

    // Final mood parity pass: the concept reads darker and less modular than the first Toolset proof.
    { from: "enon_distillery", template: "q_314", tag: "q_floor_20", x: 12.5, y: 15.0, z: 0.21, bearingDegrees: 90, tagSuffix: "hero_left_low_luma_shadow_final", visualTransform: vt(1.18) },
    { from: "enon_distillery", template: "q_314", tag: "q_floor_20", x: 17.5, y: 15.0, z: 0.21, bearingDegrees: 90, tagSuffix: "hero_right_low_luma_shadow_final", visualTransform: vt(1.18) },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 15.0, y: 15.25, z: 0.22, bearingDegrees: 274, tagSuffix: "hero_center_table_dark_mass_final", visualTransform: vt(1.35) },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 15.0, y: 11.8, z: 0.19, bearingDegrees: 92, tagSuffix: "hero_entry_threshold_shadow_final", visualTransform: vt(1.22) },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 12.6, y: 11.2, z: 0.18, bearingDegrees: 24, tagSuffix: "maproom_worn_shadow_w_final" },
    { from: "enon_house_1", template: "ke_plama001", tag: "ke_plama001", x: 17.4, y: 11.2, z: 0.18, bearingDegrees: 336, tagSuffix: "maproom_worn_shadow_e_final" },
    { from: "enon_distillery", template: "q_314", tag: "q_floor_20", x: 5.1, y: 15.1, z: 0.19, bearingDegrees: 16, tagSuffix: "study_lounge_luma_shadow_final", visualTransform: vt(1.16) },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 7.7, y: 16.6, z: 0.18, bearingDegrees: 201, tagSuffix: "study_back_corner_shadow_final", visualTransform: vt(1.24) },
    { from: "enon_distillery", template: "q_314", tag: "q_floor_20", x: 25.6, y: 15.2, z: 0.19, bearingDegrees: 86, tagSuffix: "bedroom_luma_shadow_final", visualTransform: vt(1.16) },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 28.1, y: 14.0, z: 0.18, bearingDegrees: 316, tagSuffix: "bedroom_storage_side_shadow_final", visualTransform: vt(1.2) },
    { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 10.55, y: 15.0, bearingDegrees: 90, tagSuffix: "hero_left_mid_dark_post_final", visualTransform: vt(1.12) },
    { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 19.45, y: 15.0, bearingDegrees: 270, tagSuffix: "hero_right_mid_dark_post_final", visualTransform: vt(1.12) },
    { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 1.05, y: 13.3, bearingDegrees: 90, tagSuffix: "study_lower_left_wall_mass_final", visualTransform: vt(1.12) },
    { from: "enon_gang_2", template: "witcher939", tag: "witcher_wall_1", x: 28.95, y: 17.7, bearingDegrees: 270, tagSuffix: "bedroom_upper_right_wall_mass_final", visualTransform: vt(1.12) },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 5.1, y: 5.2, z: 0.18, bearingDegrees: 265, tagSuffix: "hearth_utility_deep_soot_final", visualTransform: vt(1.25) },
    { from: "enon_house_1", template: "zep_splat007", tag: "ZEP_SPLAT007", x: 25.8, y: 4.4, z: 0.18, bearingDegrees: 41, tagSuffix: "dock_storage_deep_shadow_final", visualTransform: vt(1.25) }
  ];

  const selectedStoryPlaceablesBase =
    apartmentVariant === "empty" ||
    apartmentVariant === "minimal" ||
    apartmentVariant === "shell" ||
    apartmentVariant === "empty-shell"
      ? []
      : storyPlaceables;
  const readablePassResult =
    readableConceptPass && selectedStoryPlaceablesBase.length > 0
      ? applyReadableConceptPass(selectedStoryPlaceablesBase)
      : {
          placeables: selectedStoryPlaceablesBase,
          removedDarkOverlayCount: 0,
          removedDarkOverlayTags: [],
          addedReadableAnchorCount: 0
        };
  const selectedStoryPlaceables = readablePassResult.placeables;
  const added = [];
  for (const spec of selectedStoryPlaceables) {
    added.push(place(sourceGffs, gff, spec));
  }
  placeableList.value = [...(placeableList.value ?? []), ...added];
  const visualTransformPlaceableCount = selectedStoryPlaceables.filter((spec) =>
    hasNonDefaultVisualTransform(spec.visualTransform)
  ).length;

  const pruned = pruneGffToReachableStructs(gff);

  return {
    bytes: buildGff(pruned.gff),
    variant: apartmentVariant,
    listCounts: getRootListCounts(pruned.gff, GIT_GIC_LIST_LABELS),
    removedOrphanStructCount: pruned.removedStructCount,
    clearedBasePlaceableCount,
    clearedBaseDoorCount,
    retainedBasePlaceableCount: 0,
    addedPlaceableCount: added.length,
    finalPlaceableCount: getField(pruned.gff.structs[0], "Placeable List")?.value?.length ?? 0,
    visualTransformPlaceableCount,
      readableConceptPass: {
        enabled: readableConceptPass,
        edgeArtifactMaskedFocusPass,
        structuralMassPass,
        conceptSwDarkMassPass,
        conceptAnchorAlignmentPass,
        fastPlanExistingRebalancePass,
        maskedVisualCorrectionPass,
        nHeroSideCabinetPositionPass,
        nwTileFirstLargeSilhouettePass,
        nwSouthwestFurnitureSilhouettePass,
        nwNonVtRugFloorPass,
        nwExistingRugAlignPass,
        nwCouchBenchMaterialPass,
        nwWornRugShrinkVisualTransformPass,
        nwWornRugRedCarpetTemplatePass,
        nwRightScreenVisualTransformPass,
        nwRoundTableVisualTransformPass,
        nwRoundTableTemplatePass,
        safeWallVisualTransformPass,
        nwExistingVtMaterialPivotPass,
        removedDarkOverlayCount: readablePassResult.removedDarkOverlayCount,
      removedDarkOverlayTags: readablePassResult.removedDarkOverlayTags,
      addedReadableAnchorCount: readablePassResult.addedReadableAnchorCount
    }
  };
}

function getRootListCounts(gff, labels) {
  const root = gff.structs[0];
  const counts = {};
  for (const label of labels) {
    const field = getField(root, label);
    if (field?.typeId === FIELD_TYPE.LIST) {
      counts[label] = (field.value ?? []).length;
    }
  }
  return counts;
}

function createGicCommentStruct(gff, typeId, comment = "") {
  const index = gff.structs.length;
  gff.structs.push({
    typeId,
    fields: [{ label: "Comment", typeId: FIELD_TYPE.CEXOSTRING, value: comment }]
  });
  return index;
}

function inferGicCommentStructType(sourceGff, sourceIndices, label) {
  const mapped = GIC_COMMENT_STRUCT_TYPE_BY_LABEL.get(label);
  if (mapped !== undefined) {
    return mapped;
  }
  for (const index of sourceIndices) {
    const typeId = sourceGff.structs[index]?.typeId;
    if (typeId !== undefined) {
      return typeId;
    }
  }
  throw new Error(`Cannot infer GIC comment struct type for ${label}.`);
}

function mutateAreaGic(baseGicBytes, targetListCounts) {
  const sourceGff = parseGff(baseGicBytes, `${BASE_AREA_RESREF}.gic`);
  if (sourceGff.fileType !== "GIC ") {
    throw new Error(`Expected GIC resource, got ${JSON.stringify(sourceGff.fileType)}`);
  }

  const sourceRoot = sourceGff.structs[0];
  const targetGff = {
    fileType: sourceGff.fileType,
    fileVersion: sourceGff.fileVersion,
    structs: [
      {
        typeId: sourceRoot.typeId,
        fields: deepClone(sourceRoot.fields)
      }
    ]
  };
  const targetRoot = targetGff.structs[0];
  const adjusted = [];

  for (const field of targetRoot.fields) {
    if (field.typeId !== FIELD_TYPE.LIST) {
      continue;
    }
    const sourceField = getField(sourceRoot, field.label);
    const sourceIndices = sourceField?.typeId === FIELD_TYPE.LIST ? sourceField.value ?? [] : [];
    const targetCount = targetListCounts[field.label] ?? sourceIndices.length;
    if (sourceIndices.length !== targetCount) {
      adjusted.push({
        label: field.label,
        sourceCount: sourceIndices.length,
        targetCount
      });
    }

    field.value = [];
    const commentStructType = targetCount > 0
      ? inferGicCommentStructType(sourceGff, sourceIndices, field.label)
      : null;
    const preserveSourceComments =
      field.label !== "Placeable List" && sourceIndices.length === targetCount;

    for (let index = 0; index < targetCount; index += 1) {
      if (preserveSourceComments && sourceIndices[index] !== undefined) {
        const clonedIndex = cloneStructTree(sourceGff, sourceIndices[index], targetGff);
        field.value.push(clonedIndex);
      } else {
        field.value.push(createGicCommentStruct(targetGff, commentStructType, ""));
      }
    }
  }

  return {
    bytes: buildGff(targetGff),
    listCounts: getRootListCounts(targetGff, GIT_GIC_LIST_LABELS),
    adjusted
  };
}

function remapStructReferencesAfterInsert(gff, insertIndex) {
  for (const struct of gff.structs) {
    for (const field of struct.fields ?? []) {
      if (field.typeId === FIELD_TYPE.STRUCT && field.value >= insertIndex) {
        field.value += 1;
      } else if (field.typeId === FIELD_TYPE.LIST) {
        field.value = (field.value ?? []).map((structIndex) =>
          structIndex >= insertIndex ? structIndex + 1 : structIndex
        );
      }
    }
  }
}

function insertStructAt(gff, insertIndex, struct) {
  if (!Number.isInteger(insertIndex) || insertIndex < 0 || insertIndex > gff.structs.length) {
    throw new Error(`Invalid GFF struct insert index: ${insertIndex}`);
  }
  gff.structs.splice(insertIndex, 0, struct);
  remapStructReferencesAfterInsert(gff, insertIndex);
  return insertIndex;
}

function summarizeExistingGit(gitBytes) {
  const gff = parseGff(gitBytes, `${BASE_AREA_RESREF}.git`);
  const placeableList = getField(gff.structs[0], "Placeable List")?.value ?? [];
  let visualTransformPlaceableCount = 0;
  for (const structIndex of placeableList) {
    const placeable = gff.structs[structIndex];
    if (getField(placeable, "VisTransformList") || getField(placeable, "VisualTransform")) {
      visualTransformPlaceableCount += 1;
    }
  }
  return {
    bytes: gitBytes,
    variant: "raw-clone",
    listCounts: getRootListCounts(gff, GIT_GIC_LIST_LABELS),
    removedOrphanStructCount: 0,
    clearedBasePlaceableCount: 0,
    retainedBasePlaceableCount: placeableList.length,
    addedPlaceableCount: 0,
    finalPlaceableCount: placeableList.length,
    visualTransformPlaceableCount
  };
}

function summarizeExistingGic(gicBytes) {
  const gff = parseGff(gicBytes, `${BASE_AREA_RESREF}.gic`);
  return {
    bytes: gicBytes,
    listCounts: getRootListCounts(gff, GIT_GIC_LIST_LABELS),
    adjusted: []
  };
}

function mutateModuleIfo(ifoBytes, sourceIfoBytes = null) {
  const gff = parseGff(ifoBytes, "module.ifo");
  if (gff.fileType !== "IFO ") {
    throw new Error(`Expected IFO resource, got ${JSON.stringify(gff.fileType)}`);
  }
  const root = gff.structs[0];
  const areaList = getField(root, "Mod_Area_list");
  if (!areaList || areaList.typeId !== FIELD_TYPE.LIST) {
    throw new Error("module.ifo missing Mod_Area_list.");
  }
  const previous = {
    startArea: getField(root, "Mod_Entry_Area")?.value ?? "",
    x: getField(root, "Mod_Entry_X")?.value ?? null,
    y: getField(root, "Mod_Entry_Y")?.value ?? null,
    z: getField(root, "Mod_Entry_Z")?.value ?? null,
    dirX: getField(root, "Mod_Entry_Dir_X")?.value ?? null,
    dirY: getField(root, "Mod_Entry_Dir_Y")?.value ?? null,
    areaCount: areaList.value.length
  };

  const alreadyPresent = areaList.value.some((structIndex) => {
    const struct = gff.structs[structIndex];
    return getField(struct, "Area_Name")?.value === AREA_RESREF;
  });
  if (!alreadyPresent) {
    const areaStructIndices = areaList.value ?? [];
    const expectedAreaStructIndices = areaStructIndices.map((_, index) => index + 1);
    const areaStructsAreContiguous = areaStructIndices.every(
      (structIndex, index) => structIndex === expectedAreaStructIndices[index]
    );
    if (!areaStructsAreContiguous) {
      throw new Error(
        `module.ifo Mod_Area_list is not contiguous; refusing to append ${AREA_RESREF} unsafely.`
      );
    }
    const nextAreaStructIndex = areaStructIndices.length + 1;
    insertStructAt(gff, nextAreaStructIndex, {
      typeId: 6,
      fields: [{ label: "Area_Name", typeId: FIELD_TYPE.RESREF, value: AREA_RESREF }]
    });
    areaList.value.push(nextAreaStructIndex);
  }

  if (updateModuleEntry) {
    setFieldValue(root, "Mod_Entry_Area", AREA_RESREF);
    setFieldValue(root, "Mod_Entry_X", START_LOCATION.x);
    setFieldValue(root, "Mod_Entry_Y", START_LOCATION.y);
    setFieldValue(root, "Mod_Entry_Z", START_LOCATION.z);
    setFieldValue(root, "Mod_Entry_Dir_X", START_LOCATION.dirX);
    setFieldValue(root, "Mod_Entry_Dir_Y", START_LOCATION.dirY);
  }

  const copiedSourceFields = copyModuleResourceFieldsFromSource(gff, sourceIfoBytes);

  return {
    bytes: buildGff(gff),
    previous,
    next: {
      startArea: updateModuleEntry ? AREA_RESREF : previous.startArea,
      x: updateModuleEntry ? START_LOCATION.x : previous.x,
      y: updateModuleEntry ? START_LOCATION.y : previous.y,
      z: updateModuleEntry ? START_LOCATION.z : previous.z,
      dirX: updateModuleEntry ? START_LOCATION.dirX : previous.dirX,
      dirY: updateModuleEntry ? START_LOCATION.dirY : previous.dirY,
      areaCount: areaList.value.length
    },
    alreadyPresent,
    entryUpdated: updateModuleEntry,
    copiedSourceFields
  };
}

function buildMarker(summary) {
  return Buffer.from(JSON.stringify(summary, null, 2), "utf-8");
}

function buildNextModuleEntries(erf, nextAre, nextGit, nextGic, nextIfo) {
  const nextEntries = [];
  let insertedAreaResources = false;
  let replacedModuleIfo = false;

  for (const entry of erf.entries) {
    if (
      (entry.resref === AREA_RESREF &&
        [RESOURCE_TYPES.are, RESOURCE_TYPES.git, RESOURCE_TYPES.gic].includes(entry.type)) ||
      (entry.resref === "cdxmapflat01" && entry.type === RESOURCE_TYPES.txt)
    ) {
      continue;
    }

    if (entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo) {
      nextEntries.push({ resref: "module", type: RESOURCE_TYPES.ifo, bytes: nextIfo.bytes });
      replacedModuleIfo = true;
    } else {
      nextEntries.push(entry);
    }

    if (
      !insertedAreaResources &&
      entry.resref === BASE_AREA_RESREF &&
      entry.type === RESOURCE_TYPES.git
    ) {
      nextEntries.push({ resref: AREA_RESREF, type: RESOURCE_TYPES.are, bytes: nextAre });
      nextEntries.push({ resref: AREA_RESREF, type: RESOURCE_TYPES.gic, bytes: nextGic.bytes });
      nextEntries.push({ resref: AREA_RESREF, type: RESOURCE_TYPES.git, bytes: nextGit.bytes });
      insertedAreaResources = true;
    }
  }

  if (!replacedModuleIfo) {
    throw new Error("module.ifo was not replaced in-place.");
  }
  if (!insertedAreaResources) {
    nextEntries.push({ resref: AREA_RESREF, type: RESOURCE_TYPES.are, bytes: nextAre });
    nextEntries.push({ resref: AREA_RESREF, type: RESOURCE_TYPES.gic, bytes: nextGic.bytes });
    nextEntries.push({ resref: AREA_RESREF, type: RESOURCE_TYPES.git, bytes: nextGit.bytes });
  }

  return {
    entries: nextEntries,
    insertedAreaResources,
    replacedModuleIfo
  };
}

function enforceConceptTilemapLabTarget(modulePath) {
  const moduleName = basename(modulePath).toLowerCase();
  if (!moduleName.startsWith("codex_writer_concept_sic_tilemap")) {
    return;
  }
  if (allowFullModuleConceptTilemapTarget) {
    return;
  }
  if (!existsSync(modulePath)) {
    return;
  }
  const size = statSync(modulePath).size;
  if (size <= conceptTilemapLabMaxBytes) {
    return;
  }
  throw new Error(
    [
      "Refusing to generate a concept tilemap lab into a full-size module target.",
      `Module: ${modulePath}`,
      `Size: ${size} bytes`,
      `Limit: ${conceptTilemapLabMaxBytes} bytes`,
      "Copy from a known-good small lab baseline (for example tilemap58), not from the full the_last_city module.",
      "Set AURORA_LAST_CITY_ALLOW_FULL_MODULE_CONCEPT_TILEMAP_TARGET=1 only for an explicitly approved full-module diagnostic."
    ].join("\n")
  );
}

async function main() {
  const generatedAt = new Date().toISOString();
  const modulePath = await findTargetModulePath();
  enforceConceptTilemapLabTarget(modulePath);
  const candidateQuarantine = await findCriticalFailureForModule(modulePath);
  if (candidateQuarantine) {
    throw new Error(
      [
        "Refusing to generate into a quarantined Toolset candidate.",
        `Module: ${modulePath}`,
        `Reason: ${candidateQuarantine.reason}`,
        `Registry: ${candidateQuarantine.registryPath}`,
        "Build a fresh lab module or restore a known-good backup instead."
      ].join("\n")
    );
  }
  const moduleBytes = await readFile(modulePath);
  const erf = readErfEntries(moduleBytes, modulePath);
  const sourceModulePath = sourceModulePathOverride ?? modulePath;
  const sourceErf =
    sourceModulePath === modulePath
      ? erf
      : readErfEntries(await readFile(sourceModulePath), sourceModulePath);

  if (findEntry(erf, AREA_RESREF, RESOURCE_TYPES.are)) {
    console.log(`Replacing existing ${AREA_RESREF} resources.`);
  }

  const nativeBaseAre = await readNativeTemplateResource("are", RESOURCE_TYPES.are);
  const nativeBaseGit = await readNativeTemplateResource("git", RESOURCE_TYPES.git);
  const nativeBaseGic = await readNativeTemplateResource("gic", RESOURCE_TYPES.gic);
  const baseAre =
    nativeBaseAre ??
    findEntry(erf, BASE_AREA_RESREF, RESOURCE_TYPES.are) ??
    findEntry(sourceErf, BASE_AREA_RESREF, RESOURCE_TYPES.are);
  const baseGit =
    nativeBaseGit ??
    findEntry(erf, BASE_AREA_RESREF, RESOURCE_TYPES.git) ??
    findEntry(sourceErf, BASE_AREA_RESREF, RESOURCE_TYPES.git);
  const baseGic =
    nativeBaseGic ??
    findEntry(erf, BASE_AREA_RESREF, RESOURCE_TYPES.gic) ??
    findEntry(sourceErf, BASE_AREA_RESREF, RESOURCE_TYPES.gic);
  const moduleIfo = findEntry(erf, "module", RESOURCE_TYPES.ifo);
  const sourceModuleIfo =
    sourceModulePath === modulePath ? moduleIfo : findEntry(sourceErf, "module", RESOURCE_TYPES.ifo);
  if (!baseAre || !baseGit || !baseGic || !moduleIfo) {
    throw new Error("Missing base area resources or module.ifo.");
  }
  if (sourceModulePath !== modulePath && !sourceModuleIfo) {
    throw new Error(`Missing source module.ifo in ${sourceModulePath}.`);
  }

  const sourceGffs = {};
  const needsStorySourceGffs =
    !rawClone &&
    !["empty", "minimal", "shell", "empty-shell"].includes(apartmentVariant);
  if (needsStorySourceGffs) {
    const sourceAreaResrefs = [
      BASE_AREA_RESREF,
      "enon_house_1",
      "enon_house_6",
      "enon_house_3",
      "mar_house_1",
      "mtt_hire_rch_1",
      "enon_gang_1",
      "enon_gang_2",
      "enon_distillery",
      "enon_start_ship",
      "guild_merchants",
      "hx_library",
      "enon_bakery",
      "enon_shop_1",
      "mar_shipyard_war",
      "wnd_citymarket",
      "wnd_tmplt_flat_5"
    ];
    for (const resref of sourceAreaResrefs) {
      sourceGffs[resref] = readSourceAreaGff(sourceErf, resref, RESOURCE_TYPES.git, "git");
    }
  }

  const nextAre = rawClone ? baseAre.bytes : mutateAreaMetadata(baseAre.bytes);
  const nextGit = rawClone ? summarizeExistingGit(baseGit.bytes) : mutateAreaGit(baseGit.bytes, sourceGffs);
  const nextGic = rawClone ? summarizeExistingGic(baseGic.bytes) : mutateAreaGic(baseGic.bytes, nextGit.listCounts);
  const nextIfo = mutateModuleIfo(
    moduleIfo.bytes,
    sourceModulePath !== modulePath ? sourceModuleIfo.bytes : null
  );

  const summary = {
    version: "last-city-apartment-area/v1",
    generatedAt,
    modulePath,
    sourceModulePath,
    areaResref: AREA_RESREF,
    areaName: AREA_NAME,
    baseAreaResref: BASE_AREA_RESREF,
    nativeTemplate: nativeTemplateDir
      ? {
          directory: nativeTemplateDir,
          resref: nativeTemplateResref
        }
      : null,
    preserveTileLights,
    conceptWarmLighting,
    conceptMoodLighting,
    conceptDeepMoodLighting,
    lightingProfile: getAreaLightingProfile(),
    readableConceptPass,
    edgeArtifactMaskedFocusPass,
    structuralMassPass,
    conceptContrastVtPass,
    conceptAnchorAlignmentPass,
    fastPlanExistingRebalancePass,
    maskedVisualCorrectionPass,
    nHeroSideCabinetPositionPass,
    nwTileFirstLargeSilhouettePass,
    nwSouthwestFurnitureSilhouettePass,
    nwNonVtRugFloorPass,
    nwExistingRugAlignPass,
    nwCouchBenchMaterialPass,
    nwRoundTableVisualTransformPass,
    nwRoundTableTemplatePass,
    nwWornRugShrinkVisualTransformPass,
    nwWornRugRedCarpetTemplatePass,
    nwRightScreenVisualTransformPass,
    safeWallVisualTransformPass,
    nwExistingVtMaterialPivotPass,
    conceptSwDarkMassPass,
    safeLastCityHakProfileEnabled,
    sourceHakListOverrideCount: sourceHakListOverride?.length ?? 0,
    explicitSourceHakListOverrideCount: explicitSourceHakListOverride?.length ?? 0,
    removeConceptStoneSpine,
    shrinkConceptStoneSpine,
    conceptStoneSpineScale,
    conceptStoneSpineScaleY,
    concept:
      "A cramped port cartographer apartment: map table, working desk by the window, modest bed alcove, rope/crates from the docks, candles, plants, and old papers.",
    variant: apartmentVariant,
    rawClone,
    areaDimensionOverride:
      areaDimensionOverride.width || areaDimensionOverride.height
        ? {
            width: areaDimensionOverride.width,
            height: areaDimensionOverride.height
          }
        : null,
    tileLayoutOverride: tileLayoutOverrideIds
      ? {
          ids: tileLayoutOverrideIds,
          orientations: tileLayoutOverrideOrientations,
          note: tileLayoutOverrideNote
        }
      : null,
    copiedModuleResourceFields: nextIfo.copiedSourceFields,
    placeablePlacementTransform,
    moduleEntryUpdated: nextIfo.entryUpdated,
    startLocation: nextIfo.next,
    previousStartLocation: nextIfo.previous,
    git: {
      clearedBasePlaceableCount: nextGit.clearedBasePlaceableCount,
      clearedBaseDoorCount: nextGit.clearedBaseDoorCount,
      variant: nextGit.variant,
      retainedBasePlaceableCount: nextGit.retainedBasePlaceableCount,
      addedPlaceableCount: nextGit.addedPlaceableCount,
      finalPlaceableCount: nextGit.finalPlaceableCount,
      visualTransformPlaceableCount: nextGit.visualTransformPlaceableCount,
      readableConceptPass: nextGit.readableConceptPass,
      removedOrphanStructCount: nextGit.removedOrphanStructCount,
      listCounts: nextGit.listCounts
    },
    gic: {
      listCounts: nextGic.listCounts,
      adjusted: nextGic.adjusted
    },
    conceptArtPath:
      "C:\\Projects\\aurora-web\\docs\\assets\\last-city\\last-city-cartographer-apartment-concept-2026-07-02.png"
  };

  const nextModuleEntries = buildNextModuleEntries(erf, nextAre, nextGit, nextGic, nextIfo);
  const nextEntries = nextModuleEntries.entries;

  const stamp = generatedAt.replace(/[:.]/g, "-");
  const backupPath = dryRun ? null : `${modulePath}.pre-${AREA_RESREF}-${stamp}.bak`;
  const repacked = buildErfV10FromEntries(erf.header, erf.localizedStrings, nextEntries);
  await mkdir(outputRoot, { recursive: true });
  const outputModulePath = dryRun ? join(outputRoot, `${AREA_RESREF}-dry-run-${stamp}.mod`) : modulePath;
  if (!dryRun) {
    await copyFile(modulePath, backupPath);
  }
  await writeFile(outputModulePath, repacked);

  const finalBytes = await readFile(outputModulePath);
  const finalErf = readErfEntries(finalBytes, outputModulePath);
  const finalChecks = {
    are: Boolean(findEntry(finalErf, AREA_RESREF, RESOURCE_TYPES.are)),
    git: Boolean(findEntry(finalErf, AREA_RESREF, RESOURCE_TYPES.git)),
    gic: Boolean(findEntry(finalErf, AREA_RESREF, RESOURCE_TYPES.gic)),
    marker: Boolean(findEntry(finalErf, "cdxmapflat01", RESOURCE_TYPES.txt)),
    moduleSizeBytes: finalBytes.length,
    entryCount: finalErf.entries.length,
    moduleIfoEntryIndex: finalErf.entries.findIndex(
      (entry) => entry.resref === "module" && entry.type === RESOURCE_TYPES.ifo
    ),
    areaResourceEntryOrder: finalErf.entries
      .map((entry, index) => ({ ...entry, index }))
      .filter((entry) => entry.resref === AREA_RESREF)
      .map((entry) => ({ index: entry.index, type: entry.type })),
    insertedAreaResourcesNearBase: nextModuleEntries.insertedAreaResources
  };

  const finalSummary = {
    ...summary,
    dryRun,
    backupPath,
    outputModulePath,
    finalChecks
  };

  await writeFile(join(outputRoot, "summary.json"), JSON.stringify(finalSummary, null, 2), "utf-8");
  await writeFile(
    join(outputRoot, "README.md"),
    [
      "# Last City Apartment Area",
      "",
      `- Area: \`${AREA_RESREF}\``,
      `- Name: ${AREA_NAME}`,
      `- Module: \`${modulePath}\``,
      `- Dry run: ${dryRun}`,
      `- Output module: \`${outputModulePath}\``,
      `- Backup: ${backupPath ? `\`${backupPath}\`` : "none"}`,
      `- Base area: \`${BASE_AREA_RESREF}\``,
      `- Native template: ${nativeTemplateDir ? `\`${nativeTemplateResref}\` from \`${nativeTemplateDir}\`` : "none"}`,
      `- Cleared base placeables: ${nextGit.clearedBasePlaceableCount}`,
      `- Retained base placeables: ${nextGit.retainedBasePlaceableCount}`,
      `- Final placeables: ${nextGit.finalPlaceableCount}`,
      `- VisualTransform placeables: ${nextGit.visualTransformPlaceableCount}`,
      "- Concept art: `C:\\Projects\\aurora-web\\docs\\assets\\last-city\\last-city-cartographer-apartment-concept-2026-07-02.png`",
      "",
      "Concept: a cramped port cartographer apartment rebuilt from an empty placeable layer: central map table, north chart wall, study lounge, bed nook, hearth utility room, dock storage, candles, papers, plants, and weathered Last City clutter.",
      ""
    ].join("\n"),
    "utf-8"
  );

  console.log(JSON.stringify(finalSummary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
