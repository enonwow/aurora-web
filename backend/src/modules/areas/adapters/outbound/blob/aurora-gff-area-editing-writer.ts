import {
  buildGffBuffer,
  type SupportedGffField
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  isAreaCommentsValue,
  type ExistingAreaCommentsMutation,
} from "../../../domain/area-comments";
import {
  AREA_EVENT_SCRIPT_FIELDS,
  isAreaEventScriptResRef,
  readExistingAreaEventScriptMutations,
  type ExistingAreaEventScriptMutations,
} from "../../../domain/area-event-scripts";
import {
  areaNameStorageEntriesEqual,
  areaNameStorageEntryIdentifiersFormAdmittedTarget,
  readEditableAreaNameStorage,
  isEditableAreaTag,
  readExistingAreaBasicIdentityMutations,
  type EditableAreaNameStorage,
  type ExistingAreaBasicIdentityMutations,
} from "../../../domain/area-basic-identity";
import {
  decodeAreaTerrainTypeFlags,
  encodeAreaTerrainTypeFlags,
  isAreaCheckModifier,
  isAreaLoadingScreenId,
  readExistingAreaAdvancedFlagMutations,
  terrainTypeFlagsEqual,
  type ExistingAreaAdvancedFlagMutations,
} from "../../../domain/area-advanced-flags";
import {
  areaVisualEnvironmentsEqual,
  decodeAreaDayNightMode,
  encodeAreaDayNightMode,
  isAreaVisualEnvironment,
  type AreaVisualEnvironment,
  type ExistingAreaVisualEnvironmentMutation,
} from "../../../domain/area-visual-environment";
import {
  areaVisualEnvironmentScalarControlsEqual,
  isAreaVisualEnvironmentScalarControls,
  type AreaVisualEnvironmentScalarControls,
  type ExistingAreaVisualEnvironmentScalarControlsMutation,
} from "../../../domain/area-visual-environment-scalar-controls";
import {
  isResolvedAreaVisualEnvironmentCatalogSelectionMutation,
  type ResolvedAreaVisualEnvironmentCatalogSelectionMutation,
} from "../../../domain/area-visual-environment-catalog-selection-mutation";

export interface SerializableAreaEditingTile {
  row: number;
  col: number;
  sourceRow?: number;
  sourceCol?: number;
  tileId: number;
  orientation: number;
  height: number;
  mainLight1?: number;
  mainLight2?: number;
  sourceLight1?: number;
  sourceLight2?: number;
  animLoop1?: number;
  animLoop2?: number;
  animLoop3?: number;
}

export interface SerializableAreaEditingDraft {
  areaResRef: string;
  name: string;
  width: number;
  height: number;
  tilesetResRef: string;
  comments?: ExistingAreaCommentsMutation;
  eventScripts?: ExistingAreaEventScriptMutations;
  basicIdentity?: ExistingAreaBasicIdentityMutations;
  advancedFlags?: ExistingAreaAdvancedFlagMutations;
  visualEnvironment?: ExistingAreaVisualEnvironmentMutation;
  visualEnvironmentScalarControls?: ExistingAreaVisualEnvironmentScalarControlsMutation;
  visualEnvironmentCatalogSelection?: ResolvedAreaVisualEnvironmentCatalogSelectionMutation;
  tiles: readonly SerializableAreaEditingTile[];
}

export interface AreaEditingGffPreservation {
  fields: readonly SupportedGffField[];
  rootStructTypeId: number;
}

const ARE_FILE_TYPE = "ARE ";
const ROOT_STRUCT_TYPE_ID = 0xffffffff;
const TILE_STRUCT_TYPE_ID = 0;
const EDITABLE_TILE_FIELD_LABELS = new Set([
  "tile_id",
  "tile_orientation",
  "tile_height",
  "tile_mainlight1",
  "tile_mainlight2",
  "tile_srclight1",
  "tile_srclight2",
  "tile_animloop1",
  "tile_animloop2",
  "tile_animloop3"
]);

/**
 * Writer for a new or locally-authored Area topology. When original GFF fields
 * are supplied, root fields and per-cell Tile_List fields outside the editable
 * topology contract are retained; this writer never fabricates Tile_ResRef or
 * group data.
 */
export function serializeAreaEditingDraftToAreGff(
  draft: SerializableAreaEditingDraft,
  preservation?: AreaEditingGffPreservation
): Buffer {
  validateDenseTileGrid(draft);
  if (preservation) {
    const provenanceError = validateAreaEditingSourceProvenance(draft, preservation);
    if (provenanceError) {
      throw new Error(provenanceError);
    }
  }
  const commentsField = validateAreaCommentsMutation(draft.comments, preservation);
  const eventScriptReplacements = validateAreaEventScriptMutations(
    draft.eventScripts,
    preservation,
  );
  const basicIdentityReplacements = validateAreaBasicIdentityMutations(
    draft.basicIdentity,
    preservation,
    draft.name,
  );
  const advancedFlagReplacements = validateAreaAdvancedFlagMutations(
    draft.advancedFlags,
    preservation,
  );
  const visualEnvironmentReplacements = validateAreaVisualEnvironmentMutation(
    draft.visualEnvironment,
    preservation,
  );
  const visualEnvironmentScalarControlReplacements =
    validateAreaVisualEnvironmentScalarControlsMutation(
      draft.visualEnvironmentScalarControls,
      preservation,
    );
  const visualEnvironmentCatalogSelectionReplacements =
    validateAreaVisualEnvironmentCatalogSelectionMutation(
      draft.visualEnvironmentCatalogSelection,
      preservation,
      draft.visualEnvironment,
      draft.visualEnvironmentScalarControls,
    );
  const preservedTiles = preservation
    ? readPreservedTilesByCoordinate(preservation.fields, draft.width)
    : new Map<string, { typeId: number; fields: SupportedGffField[] }>();
  const topologyFields: SupportedGffField[] = [
    { label: "Width", type: "int", value: draft.width },
    { label: "Height", type: "int", value: draft.height },
    { label: "Tileset", type: "resref", value: draft.tilesetResRef },
    {
      label: "Tile_List",
      type: "list",
      value: draft.tiles
        .slice()
        .sort((left, right) => left.row - right.row || left.col - right.col)
        .map((tile) => {
          const preservedTile = tile.sourceRow !== undefined && tile.sourceCol !== undefined
            ? preservedTiles.get(tileCoordinate(tile.sourceRow, tile.sourceCol))
            : undefined;
          return {
            typeId: preservedTile?.typeId ?? TILE_STRUCT_TYPE_ID,
            fields: buildTileFields(tile, preservedTile?.fields)
          };
        })
    }
  ];
  const topologyReplacementLabels = new Set(
    topologyFields.map((field) => field.label.toLowerCase()),
  );
  const fields: SupportedGffField[] = preservation
    ? [
        ...preservation.fields
          .filter((field) => !topologyReplacementLabels.has(field.label.toLowerCase()))
          .map((field) => {
            if (field === commentsField) {
              return { ...field, value: draft.comments?.value ?? field.value } as SupportedGffField;
            }
            const eventScriptValue = eventScriptReplacements.get(field);
            if (eventScriptValue !== undefined) {
              return { ...field, value: eventScriptValue } as SupportedGffField;
            }
            return visualEnvironmentCatalogSelectionReplacements.get(field)
              ?? basicIdentityReplacements.get(field)
              ?? advancedFlagReplacements.get(field)
              ?? visualEnvironmentReplacements.get(field)
              ?? visualEnvironmentScalarControlReplacements.get(field)
              ?? field;
          }),
        ...topologyFields,
      ]
    : [
        {
          label: "Name",
          type: "cexolocstring",
          value: { text: draft.name }
        },
        { label: "Tag", type: "cexostring", value: draft.areaResRef },
        ...topologyFields
      ];
  return buildGffBuffer(
    fields,
    ARE_FILE_TYPE,
    preservation?.rootStructTypeId ?? ROOT_STRUCT_TYPE_ID
  );
}

function validateAreaVisualEnvironmentCatalogSelectionMutation(
  mutation: ResolvedAreaVisualEnvironmentCatalogSelectionMutation | undefined,
  preservation: AreaEditingGffPreservation | undefined,
  visualEnvironmentMutation: ExistingAreaVisualEnvironmentMutation | undefined,
  scalarControlsMutation: ExistingAreaVisualEnvironmentScalarControlsMutation | undefined,
): ReadonlyMap<SupportedGffField, SupportedGffField> {
  if (!mutation) return new Map();
  if (!preservation) {
    throw new Error(
      "Area visual-environment catalog selection mutation requires retained ARE preservation.",
    );
  }
  if (!isResolvedAreaVisualEnvironmentCatalogSelectionMutation(mutation)) {
    throw new Error(
      "Area visual-environment catalog selection mutation must be resolved against exact effective catalogs.",
    );
  }
  if (mutation.lightingSchemeChanged
      && (visualEnvironmentMutation || scalarControlsMutation)) {
    throw new Error(
      "Lighting Scheme selection cannot compete with separate visual-environment mutations.",
    );
  }
  const sourceSelection = readAdmittedSourceAreaVisualEnvironmentCatalogSelection(
    preservation,
  );
  const sourceVisual = readAdmittedSourceAreaVisualEnvironment(preservation);
  const sourceScalars = readAdmittedSourceAreaVisualEnvironmentScalarControls(
    preservation,
  );
  if (!sourceSelection || !sourceVisual || !sourceScalars) {
    throw new Error("Source ARE visual-environment catalog selection profile is not admitted.");
  }
  if (
    sourceSelection.value.lightingSchemeRowIndex
      !== mutation.expectedValue.lightingSchemeRowIndex
    || sourceSelection.value.skyBoxRowIndex !== mutation.expectedValue.skyBoxRowIndex
    || !areaVisualEnvironmentsEqual(
      sourceVisual.value,
      mutation.expectedValue.visualEnvironment,
    )
    || !areaVisualEnvironmentScalarControlsEqual(
      sourceScalars.value,
      mutation.expectedValue.visualEnvironmentScalarControls,
    )
  ) {
    throw new Error(
      "visualEnvironmentCatalogSelection expectedValue does not match the retained ARE.",
    );
  }

  const replacements = new Map<SupportedGffField, SupportedGffField>();
  const selectionTargets = new Map<string, number>([
    ["LightingScheme", mutation.value.lightingSchemeRowIndex],
    ["SkyBox", mutation.value.skyBoxRowIndex],
  ]);
  for (const field of sourceSelection.fields) {
    if (mutation.lightingSchemeChanged || field.label === "SkyBox") {
      replacements.set(field, {
        ...field,
        value: selectionTargets.get(field.label)!,
      } as SupportedGffField);
    }
  }
  if (!mutation.lightingSchemeChanged) return replacements;

  const encodedMode = encodeAreaDayNightMode(mutation.value.visualEnvironment.dayNightMode);
  const visualTargets = new Map<string, number>([
    ["DayNightCycle", encodedMode.dayNightCycle],
    ["IsNight", encodedMode.isNight],
    ["ShadowOpacity", mutation.value.visualEnvironment.shadowOpacity],
    ["ChanceRain", mutation.value.visualEnvironment.chanceRain],
    ["ChanceSnow", mutation.value.visualEnvironment.chanceSnow],
    ["ChanceLightning", mutation.value.visualEnvironment.chanceLightning],
    ["SunAmbientColor", mutation.value.visualEnvironment.sun.ambientColor],
    ["SunDiffuseColor", mutation.value.visualEnvironment.sun.diffuseColor],
    ["SunFogColor", mutation.value.visualEnvironment.sun.fogColor],
    ["SunFogAmount", mutation.value.visualEnvironment.sun.fogAmount],
    ["SunShadows", mutation.value.visualEnvironment.sun.shadows ? 1 : 0],
    ["MoonAmbientColor", mutation.value.visualEnvironment.moon.ambientColor],
    ["MoonDiffuseColor", mutation.value.visualEnvironment.moon.diffuseColor],
    ["MoonFogColor", mutation.value.visualEnvironment.moon.fogColor],
    ["MoonFogAmount", mutation.value.visualEnvironment.moon.fogAmount],
    ["MoonShadows", mutation.value.visualEnvironment.moon.shadows ? 1 : 0],
  ]);
  for (const field of sourceVisual.fields) {
    replacements.set(field, {
      ...field,
      value: visualTargets.get(field.label)!,
    } as SupportedGffField);
  }
  const scalarTargets = new Map<string, number>([
    ["FogClipDist", mutation.value.visualEnvironmentScalarControls.fogClipDistance],
    ["WindPower", mutation.value.visualEnvironmentScalarControls.windPower],
  ]);
  for (const field of sourceScalars.fields) {
    replacements.set(field, {
      ...field,
      value: scalarTargets.get(field.label)!,
    } as SupportedGffField);
  }
  return replacements;
}

function readAdmittedSourceAreaVisualEnvironmentCatalogSelection(
  preservation: AreaEditingGffPreservation,
): {
  value: { lightingSchemeRowIndex: number; skyBoxRowIndex: number };
  fields: readonly SupportedGffField[];
} | undefined {
  const fields: SupportedGffField[] = [];
  const values = new Map<string, number>();
  for (const label of ["LightingScheme", "SkyBox"] as const) {
    const matches = preservation.fields.filter(
      (field) => field.label.toLowerCase() === label.toLowerCase(),
    );
    const field = matches.length === 1
      && matches[0]?.label === label
      && matches[0].type === "byte"
      && typeof matches[0].value === "number"
      && Number.isInteger(matches[0].value)
      && matches[0].value >= 0
      && matches[0].value <= 0xff
      ? matches[0]
      : undefined;
    if (!field) return undefined;
    fields.push(field);
    values.set(label, field.value as number);
  }
  return {
    value: {
      lightingSchemeRowIndex: values.get("LightingScheme")!,
      skyBoxRowIndex: values.get("SkyBox")!,
    },
    fields,
  };
}

function validateAreaVisualEnvironmentScalarControlsMutation(
  mutation: ExistingAreaVisualEnvironmentScalarControlsMutation | undefined,
  preservation: AreaEditingGffPreservation | undefined,
): ReadonlyMap<SupportedGffField, SupportedGffField> {
  if (!mutation) return new Map();
  if (!preservation) {
    throw new Error(
      "Area visual-environment scalar-controls mutation requires retained ARE preservation.",
    );
  }
  if (
    !isAreaVisualEnvironmentScalarControls(mutation.expectedValue)
    || !isAreaVisualEnvironmentScalarControls(mutation.value)
    || areaVisualEnvironmentScalarControlsEqual(mutation.expectedValue, mutation.value)
  ) {
    throw new Error(
      "Area visual-environment scalar-controls mutation must contain one changed admitted complete CAS pair.",
    );
  }
  const source = readAdmittedSourceAreaVisualEnvironmentScalarControls(preservation);
  if (!source || !areaVisualEnvironmentScalarControlsEqual(source.value, mutation.expectedValue)) {
    if (!source) {
      throw new Error("Source ARE visual-environment scalar-controls profile is not admitted.");
    }
    throw new Error(
      "visualEnvironmentScalarControls expectedValue does not match the retained ARE.",
    );
  }
  const targetByLabel = new Map<string, number>([
    ["FogClipDist", mutation.value.fogClipDistance],
    ["WindPower", mutation.value.windPower],
  ]);
  return new Map(source.fields.map((field) => [
    field,
    { ...field, value: targetByLabel.get(field.label)! } as SupportedGffField,
  ]));
}

const AREA_VISUAL_ENVIRONMENT_SCALAR_CONTROL_FIELD_TYPES = Object.freeze([
  ["FogClipDist", "float"],
  ["WindPower", "int"],
] as const);

function readAdmittedSourceAreaVisualEnvironmentScalarControls(
  preservation: AreaEditingGffPreservation,
): {
  value: AreaVisualEnvironmentScalarControls;
  fields: readonly SupportedGffField[];
} | undefined {
  const fields: SupportedGffField[] = [];
  const valueByLabel = new Map<string, number>();
  for (const [label, type] of AREA_VISUAL_ENVIRONMENT_SCALAR_CONTROL_FIELD_TYPES) {
    const matches = preservation.fields.filter(
      (field) => field.label.toLowerCase() === label.toLowerCase(),
    );
    const field = matches.length === 1
      && matches[0]?.label === label
      && matches[0].type === type
      && typeof matches[0].value === "number"
      ? matches[0]
      : undefined;
    if (!field) return undefined;
    fields.push(field);
    valueByLabel.set(label, field.value as number);
  }
  const value = {
    fogClipDistance: valueByLabel.get("FogClipDist"),
    windPower: valueByLabel.get("WindPower"),
  };
  if (!isAreaVisualEnvironmentScalarControls(value)) return undefined;
  return { value, fields };
}

function validateAreaVisualEnvironmentMutation(
  mutation: ExistingAreaVisualEnvironmentMutation | undefined,
  preservation: AreaEditingGffPreservation | undefined,
): ReadonlyMap<SupportedGffField, SupportedGffField> {
  if (!mutation) return new Map();
  if (!preservation) {
    throw new Error("Area visual-environment mutation requires retained ARE preservation.");
  }
  if (
    !isAreaVisualEnvironment(mutation.expectedValue)
    || !isAreaVisualEnvironment(mutation.value)
    || areaVisualEnvironmentsEqual(mutation.expectedValue, mutation.value)
  ) {
    throw new Error(
      "Area visual-environment mutation must contain one changed admitted complete CAS pair.",
    );
  }

  const source = readAdmittedSourceAreaVisualEnvironment(preservation);
  if (!source || !areaVisualEnvironmentsEqual(source.value, mutation.expectedValue)) {
    if (!source) {
      throw new Error("Source ARE visual-environment profile is not admitted.");
    }
    throw new Error(
      "visualEnvironment expectedValue does not match the retained ARE.",
    );
  }

  const encodedMode = encodeAreaDayNightMode(mutation.value.dayNightMode);
  const targetByLabel = new Map<string, number>([
    ["DayNightCycle", encodedMode.dayNightCycle],
    ["IsNight", encodedMode.isNight],
    ["ShadowOpacity", mutation.value.shadowOpacity],
    ["ChanceRain", mutation.value.chanceRain],
    ["ChanceSnow", mutation.value.chanceSnow],
    ["ChanceLightning", mutation.value.chanceLightning],
    ["SunAmbientColor", mutation.value.sun.ambientColor],
    ["SunDiffuseColor", mutation.value.sun.diffuseColor],
    ["SunFogColor", mutation.value.sun.fogColor],
    ["SunFogAmount", mutation.value.sun.fogAmount],
    ["SunShadows", mutation.value.sun.shadows ? 1 : 0],
    ["MoonAmbientColor", mutation.value.moon.ambientColor],
    ["MoonDiffuseColor", mutation.value.moon.diffuseColor],
    ["MoonFogColor", mutation.value.moon.fogColor],
    ["MoonFogAmount", mutation.value.moon.fogAmount],
    ["MoonShadows", mutation.value.moon.shadows ? 1 : 0],
  ]);
  const replacements = new Map<SupportedGffField, SupportedGffField>();
  for (const field of source.fields) {
    const target = targetByLabel.get(field.label);
    if (target === undefined) {
      throw new Error(`Missing target visual-environment value for ${field.label}.`);
    }
    replacements.set(field, { ...field, value: target } as SupportedGffField);
  }
  return replacements;
}

const AREA_VISUAL_ENVIRONMENT_FIELD_TYPES = Object.freeze([
  ["DayNightCycle", "byte"],
  ["IsNight", "byte"],
  ["ShadowOpacity", "byte"],
  ["ChanceRain", "int"],
  ["ChanceSnow", "int"],
  ["ChanceLightning", "int"],
  ["SunAmbientColor", "dword"],
  ["SunDiffuseColor", "dword"],
  ["SunFogColor", "dword"],
  ["SunFogAmount", "byte"],
  ["SunShadows", "byte"],
  ["MoonAmbientColor", "dword"],
  ["MoonDiffuseColor", "dword"],
  ["MoonFogColor", "dword"],
  ["MoonFogAmount", "byte"],
  ["MoonShadows", "byte"],
] as const);

function readAdmittedSourceAreaVisualEnvironment(
  preservation: AreaEditingGffPreservation,
): { value: AreaVisualEnvironment; fields: readonly SupportedGffField[] } | undefined {
  const fields: SupportedGffField[] = [];
  const valueByLabel = new Map<string, number>();
  for (const [label, type] of AREA_VISUAL_ENVIRONMENT_FIELD_TYPES) {
    const matches = preservation.fields.filter(
      (field) => field.label.toLowerCase() === label.toLowerCase(),
    );
    const field = matches.length === 1
      && matches[0]?.label === label
      && matches[0].type === type
      && typeof matches[0].value === "number"
      ? matches[0]
      : undefined;
    if (!field) return undefined;
    fields.push(field);
    valueByLabel.set(label, field.value as number);
  }

  const dayNightMode = decodeAreaDayNightMode(
    valueByLabel.get("DayNightCycle"),
    valueByLabel.get("IsNight"),
  );
  if (!dayNightMode) return undefined;
  const source = {
    dayNightMode,
    shadowOpacity: valueByLabel.get("ShadowOpacity"),
    chanceRain: valueByLabel.get("ChanceRain"),
    chanceSnow: valueByLabel.get("ChanceSnow"),
    chanceLightning: valueByLabel.get("ChanceLightning"),
    sun: {
      ambientColor: valueByLabel.get("SunAmbientColor"),
      diffuseColor: valueByLabel.get("SunDiffuseColor"),
      fogColor: valueByLabel.get("SunFogColor"),
      fogAmount: valueByLabel.get("SunFogAmount"),
      shadows: valueByLabel.get("SunShadows") === 1
        ? true
        : valueByLabel.get("SunShadows") === 0 ? false : undefined,
    },
    moon: {
      ambientColor: valueByLabel.get("MoonAmbientColor"),
      diffuseColor: valueByLabel.get("MoonDiffuseColor"),
      fogColor: valueByLabel.get("MoonFogColor"),
      fogAmount: valueByLabel.get("MoonFogAmount"),
      shadows: valueByLabel.get("MoonShadows") === 1
        ? true
        : valueByLabel.get("MoonShadows") === 0 ? false : undefined,
    },
  };
  if (!isAreaVisualEnvironment(source)) return undefined;
  return { value: source, fields };
}

function validateAreaAdvancedFlagMutations(
  mutation: ExistingAreaAdvancedFlagMutations | undefined,
  preservation: AreaEditingGffPreservation | undefined,
): ReadonlyMap<SupportedGffField, SupportedGffField> {
  if (!mutation) return new Map();
  if (!preservation) {
    throw new Error("Area advanced-flag mutation requires retained ARE preservation.");
  }
  const parsed = readExistingAreaAdvancedFlagMutations(mutation);
  if (!parsed) {
    throw new Error("Area advanced-flag mutation must contain changed admitted CAS pairs.");
  }
  const replacements = new Map<SupportedGffField, SupportedGffField>();

  if (parsed.terrainType) {
    const field = requireExactRootField(preservation, "Flags", "dword");
    if (field.type !== "dword") throw new Error("Source ARE Flags type mismatch.");
    const source = decodeAreaTerrainTypeFlags(field.value);
    if (!source) {
      throw new Error("Source ARE Flags is outside the admitted 0..7 profile.");
    }
    if (!terrainTypeFlagsEqual(source, parsed.terrainType.expectedValue)) {
      throw new Error("Flags expectedValue does not match the retained ARE.");
    }
    replacements.set(field, {
      label: "Flags",
      type: "dword",
      value: encodeAreaTerrainTypeFlags(parsed.terrainType.value),
    });
  }

  if (parsed.playerVsPlayer) {
    const field = requireExactRootField(preservation, "PlayerVsPlayer", "byte");
    if (field.type !== "byte" || !Number.isInteger(field.value) || field.value < 0 || field.value > 3) {
      throw new Error("Source ARE PlayerVsPlayer is outside the admitted 0..3 profile.");
    }
    if (field.value !== parsed.playerVsPlayer.expectedValue) {
      throw new Error("PlayerVsPlayer expectedValue does not match the retained ARE.");
    }
    replacements.set(field, {
      label: "PlayerVsPlayer",
      type: "byte",
      value: parsed.playerVsPlayer.value,
    });
  }

  if (parsed.noRest) {
    const field = requireExactRootField(preservation, "NoRest", "byte");
    if (field.type !== "byte" || (field.value !== 0 && field.value !== 1)) {
      throw new Error("Source ARE NoRest is outside the admitted 0..1 profile.");
    }
    const source = field.value === 1;
    if (source !== parsed.noRest.expectedValue) {
      throw new Error("NoRest expectedValue does not match the retained ARE.");
    }
    replacements.set(field, {
      label: "NoRest",
      type: "byte",
      value: parsed.noRest.value ? 1 : 0,
    });
  }

  for (const [mutationKey, fieldLabel] of [
    ["listenCheckModifier", "ModListenCheck"],
    ["spotCheckModifier", "ModSpotCheck"],
  ] as const) {
    const pair = parsed[mutationKey];
    if (!pair) continue;
    const field = requireExactRootField(preservation, fieldLabel, "int");
    if (field.type !== "int" || !isAreaCheckModifier(field.value)) {
      throw new Error(`Source ARE ${fieldLabel} is outside the admitted -99..99 profile.`);
    }
    if (field.value !== pair.expectedValue) {
      throw new Error(`${fieldLabel} expectedValue does not match the retained ARE.`);
    }
    replacements.set(field, {
      label: fieldLabel,
      type: "int",
      value: pair.value,
    });
  }

  if (parsed.loadingScreenId) {
    const field = requireExactRootField(preservation, "LoadScreenID", "word");
    if (field.type !== "word" || !isAreaLoadingScreenId(field.value)) {
      throw new Error("Source ARE LoadScreenID is outside the admitted 0..65535 profile.");
    }
    if (field.value !== parsed.loadingScreenId.expectedValue) {
      throw new Error("LoadScreenID expectedValue does not match the retained ARE.");
    }
    replacements.set(field, {
      label: "LoadScreenID",
      type: "word",
      value: parsed.loadingScreenId.value,
    });
  }

  return replacements;
}

function validateAreaBasicIdentityMutations(
  mutation: ExistingAreaBasicIdentityMutations | undefined,
  preservation: AreaEditingGffPreservation | undefined,
  draftName: string,
): ReadonlyMap<SupportedGffField, SupportedGffField> {
  if (!preservation) {
    if (!mutation) return new Map();
    throw new Error("Area basic-identity mutation requires retained ARE preservation.");
  }
  const admittedSourceName = readAdmittedSourceAreaName(preservation);
  if (!mutation) {
    if (admittedSourceName !== undefined && admittedSourceName.name !== draftName) {
      throw new Error("Changed Area Name requires an exact basic-identity CAS mutation.");
    }
    return new Map();
  }
  const parsed = readExistingAreaBasicIdentityMutations(mutation);
  if (!parsed) {
    throw new Error("Area basic-identity mutation must contain changed admitted CAS pairs.");
  }
  const replacements = new Map<SupportedGffField, SupportedGffField>();
  if (parsed.name) {
    const field = requireExactRootField(preservation, "Name", "cexolocstring");
    if (field.type !== "cexolocstring") throw new Error("Source ARE Name type mismatch.");
    const source = readSupportedAreaNameStorage(field.value);
    if (!source) {
      throw new Error(
        "Source ARE Name is not admitted simple-inline or multi-entry inline ASCII storage.",
      );
    }
    if (source.name !== parsed.name.expectedValue) {
      throw new Error("Name expectedValue does not match the retained ARE.");
    }
    if (parsed.name.expectedProfile === undefined && source.profile !== "simple_inline_ascii") {
      throw new Error("Name expectedProfile is required for multi-entry inline storage.");
    }
    if (
      parsed.name.expectedProfile !== undefined
      && parsed.name.expectedProfile !== source.profile
    ) {
      throw new Error("Name expectedProfile does not match the retained ARE.");
    }
    if (parsed.name.value !== draftName) {
      throw new Error("Area Name mutation value must match the exported draft name.");
    }
    const targetEntries = parsed.name.valueEntries;
    if (parsed.name.expectedEntries && targetEntries) {
      if (!areaNameStorageEntriesEqual(source.entries, parsed.name.expectedEntries)) {
        throw new Error("Name expectedEntries do not match the retained ARE.");
      }
      if (!areaNameStorageEntryIdentifiersFormAdmittedTarget(source.entries, targetEntries)) {
        throw new Error(
          "Name valueEntries must retain identifier 0 and contain only unique source or verified catalog identifiers with nonempty text for additions.",
        );
      }
    }
    replacements.set(field, {
      label: "Name",
      type: "cexolocstring",
      value: {
        strRef: 0xffff_ffff,
        entries: (targetEntries ?? source.entries).map((entry) => ({
          languageId: entry.languageId,
          text: targetEntries
            ? entry.text
            : entry.languageId === 0 ? parsed.name!.value : entry.text,
        })),
      },
    });
  }
  if (!parsed.name && admittedSourceName !== undefined && admittedSourceName.name !== draftName) {
    throw new Error("Changed Area Name requires an exact basic-identity CAS mutation.");
  }
  if (parsed.tag) {
    const field = requireExactRootField(preservation, "Tag", "cexostring");
    if (field.type !== "cexostring" || !isEditableAreaTag(field.value)) {
      throw new Error("Source ARE Tag is outside the admitted value budget.");
    }
    if (field.value !== parsed.tag.expectedValue) {
      throw new Error("Tag expectedValue does not match the retained ARE.");
    }
    replacements.set(field, { label: "Tag", type: "cexostring", value: parsed.tag.value });
  }
  return replacements;
}

function readAdmittedSourceAreaName(
  preservation: AreaEditingGffPreservation,
): EditableAreaNameStorage | undefined {
  const matches = preservation.fields.filter(
    (field) => field.label.toLowerCase() === "name",
  );
  if (
    matches.length !== 1
    || matches[0]?.label !== "Name"
    || matches[0].type !== "cexolocstring"
  ) {
    return undefined;
  }
  return readSupportedAreaNameStorage(matches[0].value);
}

function readSupportedAreaNameStorage(
  value: Extract<SupportedGffField, { type: "cexolocstring" }>["value"],
): EditableAreaNameStorage | undefined {
  if (!Array.isArray(value.entries)) return undefined;
  return readEditableAreaNameStorage({
    present: true,
    strRef: value.strRef,
    entries: value.entries.map((entry) => ({
      languageId: entry.languageId,
      textBytesBase64: Buffer.from(entry.text, "utf8").toString("base64"),
    })),
  });
}

function requireExactRootField<T extends SupportedGffField["type"]>(
  preservation: AreaEditingGffPreservation,
  label: string,
  type: T,
): SupportedGffField {
  const matches = preservation.fields.filter(
    (field) => field.label.toLowerCase() === label.toLowerCase(),
  );
  if (matches.length !== 1 || matches[0]?.label !== label || matches[0].type !== type) {
    throw new Error(`Source ARE must contain exactly one ${label} : ${type} field.`);
  }
  return matches[0];
}

function validateAreaEventScriptMutations(
  mutation: ExistingAreaEventScriptMutations | undefined,
  preservation: AreaEditingGffPreservation | undefined,
): ReadonlyMap<SupportedGffField, string> {
  if (!mutation) return new Map();
  if (!preservation) {
    throw new Error("Area event-script mutation requires retained ARE preservation.");
  }
  const parsed = readExistingAreaEventScriptMutations(mutation);
  if (!parsed) {
    throw new Error("Area event-script mutation must contain changed canonical CAS pairs.");
  }
  const replacements = new Map<SupportedGffField, string>();
  for (const { slot, field: label } of AREA_EVENT_SCRIPT_FIELDS) {
    const requested = parsed[slot];
    if (!requested) continue;
    const matches = preservation.fields.filter(
      (field) => field.label.toLowerCase() === label.toLowerCase(),
    );
    if (
      matches.length !== 1
      || matches[0]?.label !== label
      || matches[0].type !== "resref"
    ) {
      throw new Error(`Source ARE must contain exactly one ${label} : ResRef field.`);
    }
    const source = matches[0];
    if (!isAreaEventScriptResRef(source.value)) {
      throw new Error(`Source ARE ${label} is not a canonical Area event-script ResRef.`);
    }
    if (source.value !== requested.expectedResRef) {
      throw new Error(`${label} expectedResRef does not match the retained ARE.`);
    }
    replacements.set(source, requested.resRef);
  }
  return replacements;
}

function validateAreaCommentsMutation(
  mutation: ExistingAreaCommentsMutation | undefined,
  preservation: AreaEditingGffPreservation | undefined,
): SupportedGffField | undefined {
  if (!mutation) return undefined;
  if (!preservation) {
    throw new Error("Area Comments mutation requires retained ARE preservation.");
  }
  if (!isAreaCommentsValue(mutation.expectedValue) || !isAreaCommentsValue(mutation.value)) {
    throw new Error("Area Comments values must contain at most 4096 code units without U+0000.");
  }
  if (mutation.expectedValue === mutation.value) {
    throw new Error("Area Comments mutation must change the retained value.");
  }
  const matches = preservation.fields.filter(
    (field) => field.label.toLowerCase() === "comments",
  );
  if (
    matches.length !== 1
    || matches[0]?.label !== "Comments"
    || matches[0]?.type !== "cexostring"
  ) {
    throw new Error("Source ARE must contain exactly one Comments : CExoString field.");
  }
  const field = matches[0];
  if (!isAreaCommentsValue(field.value)) {
    throw new Error("Source ARE Comments is outside the admitted value budget.");
  }
  if (field.value !== mutation.expectedValue) {
    throw new Error("Area Comments expectedValue does not match the retained ARE.");
  }
  return field;
}

function validateDenseTileGrid(draft: SerializableAreaEditingDraft): void {
  const expectedCount = draft.width * draft.height;
  const cells = new Set<string>();
  const validDimensions =
    Number.isInteger(draft.width) &&
    Number.isInteger(draft.height) &&
    draft.width > 0 &&
    draft.height > 0;
  if (!validDimensions || draft.tiles.length !== expectedCount) {
    throw new Error("Tile_List must contain exactly Width*Height unique in-bounds cells.");
  }
  for (const tile of draft.tiles) {
    if (
      !Number.isInteger(tile.row) ||
      !Number.isInteger(tile.col) ||
      tile.row < 0 ||
      tile.col < 0 ||
      tile.row >= draft.height ||
      tile.col >= draft.width
    ) {
      throw new Error("Tile_List must contain exactly Width*Height unique in-bounds cells.");
    }
    const cell = tileCoordinate(tile.row, tile.col);
    if (cells.has(cell)) {
      throw new Error("Tile_List must contain exactly Width*Height unique in-bounds cells.");
    }
    cells.add(cell);
  }
}

/**
 * Fails closed when an editable cell claims provenance that cannot identify an
 * actual struct in the source ARE Tile_List. Falling back to a canonical tile
 * struct in that case would silently discard unknown per-tile GFF fields.
 * Cells without provenance remain valid: they are genuinely new cells created
 * by an Area resize.
 */
export function validateAreaEditingSourceProvenance(
  draft: Pick<SerializableAreaEditingDraft, "tiles">,
  preservation: AreaEditingGffPreservation
): string | null {
  const claimedSourceTiles = draft.tiles.filter(
    (tile) => tile.sourceRow !== undefined || tile.sourceCol !== undefined
  );
  if (claimedSourceTiles.length === 0) {
    return null;
  }
  const sourceWidth = readNumericField(preservation.fields, "Width");
  const sourceHeight = readNumericField(preservation.fields, "Height");
  const tileList = preservation.fields.find(
    (field) => field.label.toLowerCase() === "tile_list" && field.type === "list"
  );
  if (
    !Number.isInteger(sourceWidth) ||
    !Number.isInteger(sourceHeight) ||
    (sourceWidth ?? 0) <= 0 ||
    (sourceHeight ?? 0) <= 0 ||
    !tileList ||
    tileList.type !== "list" ||
    tileList.value.length !== (sourceWidth as number) * (sourceHeight as number)
  ) {
    return "Source ARE does not contain a complete Width*Height Tile_List for lossless editing.";
  }

  for (const tile of claimedSourceTiles) {
    if ((tile.sourceRow === undefined) !== (tile.sourceCol === undefined)) {
      return `Tile (${tile.row},${tile.col}) has incomplete source Tile_List provenance.`;
    }
    if (tile.sourceRow === undefined || tile.sourceCol === undefined) {
      continue;
    }
    if (
      !Number.isInteger(tile.sourceRow) ||
      !Number.isInteger(tile.sourceCol) ||
      tile.sourceRow < 0 ||
      tile.sourceCol < 0 ||
      tile.sourceRow >= (sourceHeight as number) ||
      tile.sourceCol >= (sourceWidth as number)
    ) {
      return `Tile (${tile.row},${tile.col}) references missing source tile (${tile.sourceRow},${tile.sourceCol}).`;
    }
  }
  return null;
}

function buildTileFields(
  tile: SerializableAreaEditingTile,
  preservedFields: readonly SupportedGffField[] = []
): SupportedGffField[] {
  const editableFields: SupportedGffField[] = [
    { label: "Tile_ID", type: "int", value: tile.tileId },
    { label: "Tile_Orientation", type: "int", value: tile.orientation },
    { label: "Tile_Height", type: "int", value: tile.height }
  ];
  appendByte(editableFields, preservedFields, "Tile_MainLight1", tile.mainLight1, 0);
  appendByte(editableFields, preservedFields, "Tile_MainLight2", tile.mainLight2, 0);
  appendByte(editableFields, preservedFields, "Tile_SrcLight1", tile.sourceLight1, 0);
  appendByte(editableFields, preservedFields, "Tile_SrcLight2", tile.sourceLight2, 0);
  appendByte(editableFields, preservedFields, "Tile_AnimLoop1", tile.animLoop1, 1);
  appendByte(editableFields, preservedFields, "Tile_AnimLoop2", tile.animLoop2, 1);
  appendByte(editableFields, preservedFields, "Tile_AnimLoop3", tile.animLoop3, 1);
  return [
    ...preservedFields.filter(
      (field) => !EDITABLE_TILE_FIELD_LABELS.has(field.label.toLowerCase())
    ),
    ...editableFields
  ];
}

function appendByte(
  fields: SupportedGffField[],
  preservedFields: readonly SupportedGffField[],
  label: string,
  value: number | undefined,
  nativeNewTileDefault: number
): void {
  // Existing Area edits retain an omitted UI value from the exact source
  // struct. Genuinely new tiles use the admitted native profile: lights are 0
  // and all three animation loops are enabled (1).
  const preserved = preservedFields.find(
    (field) => field.label.toLowerCase() === label.toLowerCase() && field.type === "byte"
  );
  fields.push({
    label,
    type: "byte",
    value: value ?? (preserved?.type === "byte" ? preserved.value : nativeNewTileDefault)
  });
}

function readPreservedTilesByCoordinate(
  fields: readonly SupportedGffField[],
  fallbackWidth: number
): Map<string, { typeId: number; fields: SupportedGffField[] }> {
  const sourceWidth = readNumericField(fields, "Width") ?? fallbackWidth;
  const tileList = fields.find(
    (field) => field.label.toLowerCase() === "tile_list" && field.type === "list"
  );
  const result = new Map<string, { typeId: number; fields: SupportedGffField[] }>();
  if (!tileList || tileList.type !== "list" || !Number.isInteger(sourceWidth) || sourceWidth <= 0) {
    return result;
  }
  tileList.value.forEach((tile, index) => {
    result.set(tileCoordinate(Math.floor(index / sourceWidth), index % sourceWidth), tile);
  });
  return result;
}

function readNumericField(fields: readonly SupportedGffField[], label: string): number | undefined {
  const field = fields.find((candidate) => candidate.label.toLowerCase() === label.toLowerCase());
  return field && "value" in field && typeof field.value === "number" ? field.value : undefined;
}

function tileCoordinate(row: number, col: number): string {
  return `${row}:${col}`;
}
