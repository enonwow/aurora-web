import { z } from "zod";
import type {
  AreaApiBinaryExportResult,
  AreaApiDetail,
  AreaApiLightingEvidenceReport,
  AreaApiListItem,
  AreaApiListQuery,
  AreaApiListResult,
  AreaApiLoginResult,
  AreaApiObjectPlacement,
  AreaApiProcessOptions,
  AreaApiProcessResult,
  AreaApiNativeLocalizedStringStorage,
  AreaApiTextureDeliveryMode,
  AreaApiTextureDeliveryResult
} from "../contracts";
import type { AreaApiPort } from "../ports/areaApiPort";
import type {
  AuroraAreaVfxCollisionContract,
  AuroraWorldTimerContract
} from "../../scene/contracts";
import { readPlaceableLocalizedStrings } from "../../scene/domain/placeableLocalizedStrings";
import { readCreatureNameLocalizedStrings } from "../../scene/domain/creatureNameLocalizedStrings";
import { isCreatureEditorComment } from "../../scene/domain/creatureEditorComment";
import { isItemEditorComment } from "../../scene/domain/itemEditorComment";
import { isStoreEditorComment } from "../../scene/domain/storeEditorComment";
import { cloneAreaStoreCommerceValue } from "../../scene/domain/storeCommerce";
import { cloneAreaStoreScriptResRefsValue } from "../../scene/domain/storeScriptResRefs";
import {
  cloneStoreRestrictionsProvenance,
  MAX_AREA_STORE_RESTRICTION_ENTRIES,
  readStoreRestrictionsProvenance,
} from "../../scene/domain/storeRestrictions";
import {
  cloneStoreInventoryProvenance,
  MAX_AREA_STORE_INVENTORY_ENTRIES,
  readStoreInventoryProvenance,
} from "../../scene/domain/storeInventory";
import {
  cloneItemInstanceStateStorage,
  readItemInstanceStateStorage,
} from "../../scene/domain/itemInstanceState";
import { cloneNativeLocalizedStringStorage } from "../../scene/domain/nativeLocalizedStringStorage";
import { readEncounterLocalizedNameStorage } from
  "../../scene/domain/encounterLocalizedName";
import { readTriggerLocalizedNameStorage } from
  "../../scene/domain/triggerLocalizedName";
import { readWaypointLocalizedNameStorage } from
  "../../scene/domain/waypointLocalizedName";
import { readWaypointDescriptionStorage } from
  "../../scene/domain/waypointDescription";
import { readWaypointMapNoteStorage } from "../../scene/domain/waypointMapNote";
import { isEncounterEditorComment } from "../../scene/domain/encounterEditorComment";
import { isWaypointEditorComment } from "../../scene/domain/waypointEditorComment";
import { isTriggerEditorComment } from "../../scene/domain/triggerEditorComment";
import {
  MAX_ENCOUNTER_CREATURE_LIST_ENTRIES,
  readEncounterCreatureListProvenance,
} from "../../scene/domain/encounterCreatureSingleSpawn";
import {
  MAX_ENCOUNTER_SPAWN_POINT_ENTRIES,
  readEncounterSpawnPointListProvenance,
} from "../../scene/domain/encounterSpawnPointList";
import { readItemLocalizedStrings } from "../../scene/domain/itemLocalizedStrings";
import {
  MAX_ITEM_PROPERTY_LIST_ENTRIES,
  readItemPropertyListProvenance,
} from "../../scene/domain/itemPropertyList";
import {
  MAX_AREA_ITEM_INVENTORY_ENTRIES,
  readItemInventorySourceEntries,
} from "../../scene/domain/itemInventory";
import {
  cloneItemVisualTransformStorage,
  readItemVisualTransformStorage,
} from "../../scene/domain/itemVisualTransform";
import {
  cloneItemBaseAppearanceProvenance,
  cloneItemBaseItemCatalog,
  readItemBaseAppearanceProvenance,
  readItemBaseItemCatalog,
} from "../../scene/domain/itemBaseAppearance";
import {
  cloneEffectiveAreaAudioCatalogBundle,
  isEffectiveAreaAudioCatalogBundle,
  type EffectiveAreaAudioCatalogBundle,
} from "../domain/effectiveAreaAudioCatalog";
import {
  cloneAreaVisualEnvironment,
  isAreaVisualEnvironment,
  type AreaVisualEnvironment,
} from "../domain/areaVisualEnvironment";
import {
  cloneAreaVisualEnvironmentScalarControls,
  isAreaVisualEnvironmentScalarControls,
  type AreaVisualEnvironmentScalarControls,
} from "../domain/areaVisualEnvironmentScalarControls";
import {
  cloneEffectiveAreaLoadingScreenCatalog,
  isEffectiveAreaLoadingScreenCatalog,
  type EffectiveAreaLoadingScreenCatalog,
} from "../domain/effectiveAreaLoadingScreenCatalog";
import {
  cloneEffectiveAreaVisualEnvironmentCatalogBundle,
  isEffectiveAreaVisualEnvironmentCatalogBundle,
  type EffectiveAreaVisualEnvironmentCatalogBundle,
} from "../domain/effectiveAreaVisualEnvironmentCatalog";
import {
  cloneAreaVisualEnvironmentCatalogSelection,
  isAreaVisualEnvironmentCatalogSelection,
  type AreaVisualEnvironmentCatalogSelection,
} from "../domain/areaVisualEnvironmentCatalogSelection";
import { MAX_AREA_DOOR_LINKED_TO_CODE_UNITS } from "../../shared/domain/areaDoorTransitionStorage";
import { readAuroraVariableProvenance } from "../../shared/domain/auroraVariableTable";
import {
  MAX_AREA_SOUND_INTERVAL_VARIATION_MILLISECONDS,
  MAX_AREA_SOUND_PITCH_VARIATION_HUNDREDTHS,
  MAX_AREA_SOUND_VOLUME_VARIATION_BYTE,
} from "../domain/areaSoundIntervalVariationStorage";
import { MAX_AREA_SOUND_VOLUME_BYTE } from "../domain/areaSoundVolumeStorage";
import type { AreaSoundActiveStorage } from "../domain/areaSoundActiveStorage";
import type { AreaSoundPlayOrderStorage } from "../domain/areaSoundPlayOrderStorage";
import {
  MAX_AREA_SOUND_PLAY_STYLE_UINT32,
  readAreaSoundPlayStyleStorage,
  type AreaSoundPlayStyleStorage,
} from "../domain/areaSoundPlayStyleStorage";
import {
  MAX_AREA_SOUND_PLAYBACK_LIST_ENTRIES,
  readAreaSoundPlaybackStorage,
  type AreaSoundPlaybackStorage,
} from "../domain/areaSoundPlaybackStorage";
import {
  MAX_AREA_SOUND_PROFILE_LIST_ENTRIES,
  readAreaSoundProfileStorage,
  type AreaSoundProfileStorage,
} from "../domain/areaSoundProfileStorage";
import {
  MAX_AREA_SOUND_HOURS_MASK,
  MAX_AREA_SOUND_TIMES_BYTE,
} from "../domain/areaSoundScheduleStorage";

export class AreaApiRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null) {
    super(message);
    this.name = "AreaApiRequestError";
    this.status = status;
    this.code = code;
  }
}

const loginEnvelopeSchema = z.object({
  data: z.object({
    session: z.object({
      accessToken: z.string().min(1)
    })
  })
});

const areaObjectCountsSchema = z.object({
  placeables: z.number().int().nonnegative(),
  doors: z.number().int().nonnegative(),
  creatures: z.number().int().nonnegative(),
  encounters: z.number().int().nonnegative().default(0),
  items: z.number().int().nonnegative(),
  sounds: z.number().int().nonnegative(),
  stores: z.number().int().nonnegative().default(0),
  triggers: z.number().int().nonnegative().default(0),
  waypoints: z.number().int().nonnegative().default(0),
  total: z.number().int().nonnegative()
});

const areaTextureAtlasSchema = z.object({
  atlasId: z.string().min(1),
  cacheKey: z.string().min(1),
  strategy: z.literal("blob-cache"),
  objectKey: z.string().optional(),
  contentType: z.string().optional(),
  sizeBytes: z.number().int().nonnegative().optional(),
  etag: z.string().optional()
});

const areaTileNativeLightNodeSchema = z.object({
  status: z.literal("main-native-node-resolved"),
  name: z.string().min(1),
  position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  coordinateSpace: z.literal("model-local-aurora-z-up"),
  radius: z.number().finite().positive(),
  multiplier: z.number().finite(),
  lightPriority: z.number().finite().optional(),
  ambientOnly: z.boolean().optional(),
  dynamicType: z.number().finite().optional(),
  affectDynamic: z.boolean().optional(),
  shadow: z.boolean().optional(),
  sourceModelFileName: z.string().min(1),
  sourceModelObjectKey: z.string().min(1),
  sourceModelHash: z.string().min(1),
  proofStatus: z.literal("source-backed-tile-mdl-native-main-light")
});

const areaTileSourceLightNodeCommonSchema = z.object({
  slotIndex: z.union([z.literal(1), z.literal(2)]),
  sourceNodeCount: z.number().int().nonnegative(),
  sourceModelFileName: z.string().min(1),
  sourceModelObjectKey: z.string().min(1),
  sourceModelHash: z.string().min(1),
  proofStatus: z.literal("source-backed-tile-mdl-source-light-slot-count")
});

const areaTileSourceLightNodeSchema = z.discriminatedUnion("status", [
  areaTileSourceLightNodeCommonSchema.extend({
    status: z.literal("source-node-resolved"),
    name: z.string().min(1),
    position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
    coordinateSpace: z.literal("model-local-aurora-z-up")
  }),
  areaTileSourceLightNodeCommonSchema.extend({
    status: z.literal("source-node-absent-by-aurora-slot-count")
  })
]);

const areaTileLightColorSchema = z.object({
  rowId: z.number().int().nonnegative(),
  red: z.number().finite().optional(),
  green: z.number().finite().optional(),
  blue: z.number().finite().optional(),
  sourceKey: z.string().min(1).optional(),
  sourceAnimationName: z.string().min(1).optional(),
  sourceModelFileName: z.string().min(1).optional(),
  sourceModelHash: z.string().min(1).optional(),
  sourceMultiplier: z.number().finite().optional(),
  sourceMultiplierSource: z.string().min(1).optional(),
  sourceProofStatus: z.string().min(1).optional(),
  sourceNode: areaTileSourceLightNodeSchema.optional(),
  nativeNode: areaTileNativeLightNodeSchema.optional()
});

const areaTileInstanceSchema = z.object({
  tileInstanceId: z.string().min(1),
  areaId: z.string().min(1),
  tilesetResRef: z.string().min(1),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  tileIndex: z.number().int().nonnegative(),
  tileId: z.number().int().nonnegative().optional(),
  modelResRef: z.string().min(1).optional(),
  modelSource: z.enum(["are-tile-list", "set-tile-section"]).optional(),
  imageMap2D: z.string().min(1).optional(),
  orientation: z.number().int().min(0).max(3).optional(),
  tilesetOrientation: z.number().int().min(0).max(3).optional(),
  mainLight1: z.number().int().nonnegative().optional(),
  mainLight2: z.number().int().nonnegative().optional(),
  sourceLight1: z.number().int().nonnegative().optional(),
  sourceLight2: z.number().int().nonnegative().optional(),
  mainLight1Color: areaTileLightColorSchema.optional(),
  mainLight2Color: areaTileLightColorSchema.optional(),
  sourceLight1Color: areaTileLightColorSchema.optional(),
  sourceLight2Color: areaTileLightColorSchema.optional(),
  animLoop1: z.number().int().nonnegative().optional(),
  animLoop2: z.number().int().nonnegative().optional(),
  animLoop3: z.number().int().nonnegative().optional(),
  pathNode: z.string().min(1).optional(),
  visibilityNode: z.string().min(1).optional(),
  visibilityOrientation: z.number().int().min(0).max(3).optional(),
  doorVisibilityNode: z.string().min(1).optional(),
  doorVisibilityOrientation: z.number().int().min(0).max(3).optional(),
  edges: z.object({
    top: z.string().min(1).optional(),
    right: z.string().min(1).optional(),
    bottom: z.string().min(1).optional(),
    left: z.string().min(1).optional()
  }).optional(),
  cornerHeights: z.object({
    topLeft: z.string().min(1).optional(),
    topRight: z.string().min(1).optional(),
    bottomLeft: z.string().min(1).optional(),
    bottomRight: z.string().min(1).optional()
  }).optional(),
  height: z.number().finite().optional(),
  source: z.literal("are-tile-list"),
  fallbackReason: z.string().min(1).optional()
});

const areaTileLightingEvidenceSchema = z.object({
  areaId: z.string().min(1),
  areaName: z.string().min(1),
  tileInstanceId: z.string().min(1),
  row: z.number().int().nonnegative(),
  col: z.number().int().nonnegative(),
  tileIndex: z.number().int().nonnegative(),
  tileId: z.number().int().nonnegative().optional(),
  tilesetResRef: z.string().min(1),
  modelResRef: z.string().min(1).optional(),
  mainLight1: z.number().int().nonnegative().optional(),
  mainLight2: z.number().int().nonnegative().optional(),
  sourceLight1: z.number().int().nonnegative().optional(),
  sourceLight2: z.number().int().nonnegative().optional(),
  mainLight1Color: areaTileLightColorSchema.optional(),
  mainLight2Color: areaTileLightColorSchema.optional(),
  sourceLight1Color: areaTileLightColorSchema.optional(),
  sourceLight2Color: areaTileLightColorSchema.optional(),
  animLoop1: z.number().int().nonnegative().optional(),
  animLoop2: z.number().int().nonnegative().optional(),
  animLoop3: z.number().int().nonnegative().optional()
});

const areaGlobalLightingFieldNameSchema = z.enum([
  "LightingScheme",
  "ShadowOpacity",
  "DayNightCycle",
  "IsNight",
  "SkyBox",
  "FogClipDist",
  "ChanceRain",
  "ChanceSnow",
  "ChanceLightning",
  "WindPower",
  "SunAmbientColor",
  "SunDiffuseColor",
  "SunFogColor",
  "SunFogAmount",
  "SunShadows",
  "MoonAmbientColor",
  "MoonDiffuseColor",
  "MoonFogColor",
  "MoonFogAmount",
  "MoonShadows"
]);

const areaGlobalLightingFieldSchema = z.object({
  field: areaGlobalLightingFieldNameSchema,
  value: z.number().finite()
});

const areaGlobalLightingSchema = z.object({
  source: z.literal("are-root-fields"),
  fields: z.array(areaGlobalLightingFieldSchema)
});

const areaGlobalLightingEvidenceSchema = areaGlobalLightingSchema.extend({
  areaId: z.string().min(1),
  areaName: z.string().min(1)
});

const areaPlaceableLightingCandidateSchema = z.object({
  areaId: z.string().min(1),
  areaName: z.string().min(1),
  objectId: z.string().min(1),
  templateId: z.string().min(1),
  resRef: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  localizedName: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  appearanceType: z.number().finite().optional(),
  genericType: z.number().finite().optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  matchedTokens: z.array(z.string().min(1))
});

const areaPlaceableBasicIdentityTagSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({ present: z.literal(true), value: z.string() }).strict()
]);

const areaPlaceableBasicIdentityTableSchema = z.object({
  resourceName: z.literal("placeables.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(1_000_000),
  rowIndex: z.number().int().min(0).max(999_999)
}).strict();

const areaPlaceableBasicIdentityAppearanceSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("dword"),
    value: z.number().int().min(0).max(0xffff_ffff),
    table: areaPlaceableBasicIdentityTableSchema.optional()
  }).strict().superRefine((value, context) => {
    if (value.table && (value.table.rowIndex !== value.value || value.table.rowIndex >= value.table.rowCount)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "placeables.2da row must equal Appearance and exist in the selected table",
        path: ["table", "rowIndex"]
      });
    }
  }),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff)
  }).strict()
]);

const areaPlaceableBasicIdentitySchema = z.object({
  tag: areaPlaceableBasicIdentityTagSchema,
  appearance: areaPlaceableBasicIdentityAppearanceSchema
}).strict();

const areaPlaceableTrapTypeStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
  }).strict(),
]);

const areaPlaceableTrapTypeDescriptorSchema = z.object({
  resourceName: z.literal("traps.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(256),
}).strict();

const areaPlaceableTrapTypeRowSchema = z.object({
  rowIndex: z.number().int().min(0).max(255),
  label: z.string().min(1).max(256).refine((value) => !value.includes("\0")).optional(),
  trapNameStrRef: z.number().int().min(0).max(0xffff_ffff).optional(),
  setDc: z.number().int().min(0).max(0xff),
  detectDcMod: z.number().int().min(0).max(0xff),
  disarmDcMod: z.number().int().min(0).max(0xff),
  displayName: z.string().min(1).max(1024).refine((value) => !value.includes("\0")),
  displaySource: z.enum(["strref", "label", "row_index"]),
}).strict();

const areaPlaceableTrapTypeCatalogSchema = z.object({
  descriptor: areaPlaceableTrapTypeDescriptorSchema,
  rows: z.array(areaPlaceableTrapTypeRowSchema).min(1).max(256),
}).strict().superRefine((value, context) => {
  if (value.rows.length !== value.descriptor.rowCount ||
    value.rows.some((row, index) => row.rowIndex !== index)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "traps.2da rows must match the exact ordered physical row set",
      path: ["rows"],
    });
  }
});

const areaPlaceableBodyBagStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
  }).strict(),
]);

const areaCreatureBodyBagStorageSchema = areaPlaceableBodyBagStorageSchema;

const areaCreatureDecayTimeStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("dword"),
    valueMilliseconds: z.number().int().min(0).max(0xffff_ffff),
  }).strict(),
]);

const areaPlaceableBodyBagDescriptorSchema = z.object({
  resourceName: z.literal("bodybag.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(256),
}).strict();

const areaPlaceableBodyBagRowSchema = z.object({
  rowIndex: z.number().int().min(0).max(255),
  label: z.string().min(1).max(256).refine((value) => !value.includes("\0")).optional(),
  nameStrRef: z.number().int().min(0).max(0xffff_ffff),
  displayName: z.string().min(1).max(1024).refine((value) => !value.includes("\0")),
  displaySource: z.enum(["strref", "label", "row_index"]),
}).strict();

const areaPlaceableBodyBagCatalogSchema = z.object({
  descriptor: areaPlaceableBodyBagDescriptorSchema,
  rows: z.array(areaPlaceableBodyBagRowSchema).min(1).max(256),
}).strict().superRefine((value, context) => {
  if (value.rows.length !== value.descriptor.rowCount ||
    value.rows.some((row, index) => row.rowIndex !== index)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "bodybag.2da rows must match the exact ordered physical row set",
      path: ["rows"],
    });
  }
});

const areaPlaceablePortraitIdStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("word"),
    value: z.number().int().min(0).max(0xffff),
  }).strict(),
]);

const areaPlaceablePortraitDescriptorSchema = z.object({
  resourceName: z.literal("portraits.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(65_536),
}).strict();

const areaPlaceablePortraitRowSchema = z.object({
  rowIndex: z.number().int().min(0).max(4095),
  baseResRef: z.string().regex(/^[a-z0-9_]{1,16}$/u),
}).strict();

const areaPlaceablePortraitCatalogSchema = z.object({
  descriptor: areaPlaceablePortraitDescriptorSchema,
  rows: z.array(areaPlaceablePortraitRowSchema).min(1).max(65_536),
}).strict().superRefine((value, context) => {
  if (value.rows.length > value.descriptor.rowCount || value.rows.some((row, index) =>
    row.rowIndex >= value.descriptor.rowCount ||
    (index > 0 && row.rowIndex <= value.rows[index - 1]!.rowIndex))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "portraits.2da rows must be a strictly ordered sparse physical row set",
      path: ["rows"],
    });
  }
});

const areaCreaturePortraitRowSchema = z.object({
  rowIndex: z.number().int().min(0).max(0xffff),
  baseResRef: z.string().regex(/^[a-z0-9_]{1,16}$/u),
  sex: z.number().int().min(0).max(0xff),
  race: z.number().int().min(0).max(0xff),
  plot: z.literal(0),
}).strict();

const areaCreaturePortraitCatalogSchema = z.object({
  descriptor: areaPlaceablePortraitDescriptorSchema,
  rows: z.array(areaCreaturePortraitRowSchema).min(1).max(65_536),
}).strict().superRefine((value, context) => {
  if (value.rows.length > value.descriptor.rowCount || value.rows.some((row, index) =>
    row.rowIndex >= value.descriptor.rowCount ||
    (index > 0 && row.rowIndex <= value.rows[index - 1]!.rowIndex))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Creature portraits.2da rows must be a strictly ordered sparse physical row set",
      path: ["rows"],
    });
  }
});

const areaPlaceableFactionStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("dword"),
    value: z.number().int().min(0).max(0xffffffff),
  }).strict(),
]);

const areaPlaceableFactionDescriptorSchema = z.object({
  resourceName: z.literal("repute.fac"),
  sourceObjectKey: z.string().min(1).max(2048),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
  factionCount: z.number().int().min(1).max(1024),
}).strict();

const areaPlaceableFactionRowSchema = z.object({
  factionId: z.number().int().min(0).max(1023),
  name: z.string().min(1).max(256).refine((value) => !value.includes("\0")),
  parentFactionId: z.number().int().min(0).max(0xffffffff),
  isGlobal: z.boolean(),
}).strict();

const areaPlaceableFactionCatalogSchema = z.object({
  descriptor: areaPlaceableFactionDescriptorSchema,
  rows: z.array(areaPlaceableFactionRowSchema).min(1).max(1024),
}).strict().superRefine((value, context) => {
  if (value.rows.length !== value.descriptor.factionCount || value.rows.some((row, index) =>
    row.factionId !== index ||
    (row.parentFactionId !== 0xffffffff && row.parentFactionId >= value.descriptor.factionCount)
  )) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid module faction catalog" });
  }
});

const areaEncounterDifficultyCatalogSchema = z.object({
  schemaVersion: z.literal("area-encounter-difficulty-catalog.v1"),
  descriptor: z.object({
    resourceName: z.literal("encdifficulty.2da"),
    sourceObjectKey: z.string().min(1).max(2048).refine((value) => !value.includes("\0")),
    sourceLayer: z.enum(["module", "hak", "vanilla"]),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
    rowCount: z.number().int().min(1).max(256),
  }).strict(),
  rows: z.array(z.object({
    rowIndex: z.number().int().min(0).max(255),
    strRef: z.number().int().min(0).max(0xffffffff),
    value: z.number().int().min(-20).max(20),
    displayName: z.string().min(1).max(1024).refine((value) => !value.includes("\0")),
    displaySource: z.enum(["strref", "row_index"]),
  }).strict()).min(1).max(256),
}).strict().superRefine((value, context) => {
  if (value.rows.length !== value.descriptor.rowCount ||
      value.rows.some((row, index) => row.rowIndex !== index)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid effective Encounter encdifficulty.2da catalog",
      path: ["rows"],
    });
  }
});

const areaPlaceableLocalizedStringEntrySchema = z.object({
  languageId: z.number().int().min(0).max(0xffff_ffff),
  textBytesBase64: z.string()
}).strict();

const areaPlaceableLocalizedStringStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    strRef: z.number().int().min(0).max(0xffff_ffff),
    entries: z.array(areaPlaceableLocalizedStringEntrySchema).max(64)
  }).strict()
]);

const areaPlaceableLocalizedStringsSchema = z.object({
  locName: areaPlaceableLocalizedStringStorageSchema,
  description: areaPlaceableLocalizedStringStorageSchema
}).strict().superRefine((value, context) => {
  if (!readPlaceableLocalizedStrings(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Placeable localized-string storage provenance is not canonical"
    });
  }
});

const areaItemLocalizedStringsSchema = z.object({
  localizedName: areaPlaceableLocalizedStringStorageSchema,
  description: areaPlaceableLocalizedStringStorageSchema,
  identifiedDescription: areaPlaceableLocalizedStringStorageSchema,
}).strict().superRefine((value, context) => {
  if (!readItemLocalizedStrings(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Item localized-string storage provenance is not canonical",
    });
  }
});

const areaEncounterLocalizedNameSchema = areaPlaceableLocalizedStringStorageSchema
  .superRefine((value, context) => {
    if (!readEncounterLocalizedNameStorage(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Encounter LocalizedName storage provenance is not canonical",
      });
    }
  });

const areaTriggerLocalizedNameSchema = areaPlaceableLocalizedStringStorageSchema
  .superRefine((value, context) => {
    if (!readTriggerLocalizedNameStorage(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Trigger LocalizedName storage provenance is not canonical",
      });
    }
  });

const areaWaypointLocalizedNameSchema = areaPlaceableLocalizedStringStorageSchema
  .superRefine((value, context) => {
    if (!readWaypointLocalizedNameStorage(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Waypoint LocalizedName storage provenance is not canonical",
      });
    }
  });

const areaWaypointDescriptionSchema = areaPlaceableLocalizedStringStorageSchema
  .superRefine((value, context) => {
    if (!readWaypointDescriptionStorage(value)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Waypoint Description storage provenance is not canonical",
      });
    }
  });

const areaWaypointMapNoteSchema = z.object({
  hasMapNoteByte: z.union([z.literal(0), z.literal(1)]),
  mapNoteStorage: areaPlaceableLocalizedStringStorageSchema,
  mapNoteEnabledByte: z.union([z.literal(0), z.literal(1)]),
}).strict().superRefine((value, context) => {
  if (!readWaypointMapNoteStorage(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Waypoint MapNote storage provenance is not canonical",
    });
  }
});

const areaWaypointAppearanceSchema = z.object({
  present: z.literal(true),
  nativeType: z.literal("byte"),
  value: z.number().int().min(0).max(0xff),
  table: z.object({
    resourceName: z.literal("waypoint.2da"),
    sourceObjectKey: z.string().min(1).max(2048),
    sourceLayer: z.enum(["module", "hak", "vanilla"]),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    sizeBytes: z.number().int().min(1).max(1024 * 1024),
    rowCount: z.number().int().min(1).max(256),
    rowIndex: z.number().int().min(0).max(0xff),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (value.value !== value.table.rowIndex || value.table.rowIndex >= value.table.rowCount) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Waypoint Appearance does not identify a physical waypoint.2da row",
    });
  }
});

const areaCreatureTagStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    value: z.string().max(32).refine((value) => !value.includes("\0")),
  }).strict(),
]);

const areaCreatureConversationStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    value: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  }).strict(),
]);

const areaCreatureInterruptableStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    value: z.union([z.literal(0), z.literal(1)]),
  }).strict(),
]);

const areaCreatureAdvancedFlagsStorageSchema = z.object({
  disarmable: areaCreatureInterruptableStorageSchema,
  plot: areaCreatureInterruptableStorageSchema,
  immortal: areaCreatureInterruptableStorageSchema,
  lootable: areaCreatureInterruptableStorageSchema,
  noPermanentDeath: areaCreatureInterruptableStorageSchema,
}).strict();

const areaCreatureAppearanceTableSchema = z.object({
  resourceName: z.literal("appearance.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(1_000_000),
  rowIndex: z.number().int().min(0).max(0xffff),
}).strict().superRefine((value, context) => {
  if (value.rowIndex >= value.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "rowIndex is outside appearance.2da" });
  }
});

const areaCreatureAppearanceStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("word"),
    value: z.number().int().min(0).max(0xffff),
    table: areaCreatureAppearanceTableSchema.optional(),
  }).strict().superRefine((value, context) => {
    if (value.table && value.table.rowIndex !== value.value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Appearance value and rowIndex differ" });
    }
  }),
]);

const areaCreatureGenderTableSchema = z.object({
  resourceName: z.literal("gender.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(1_000_000),
  rowIndex: z.number().int().min(0).max(0xff),
}).strict().superRefine((value, context) => {
  if (value.rowIndex >= value.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "rowIndex is outside gender.2da" });
  }
});

const areaCreatureGenderStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
    table: areaCreatureGenderTableSchema.optional(),
  }).strict().superRefine((value, context) => {
    if (value.table && value.table.rowIndex !== value.value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Gender value and rowIndex differ" });
    }
  }),
  ]);

const areaCreaturePerceptionRangeRowSchema = z.union([
  z.literal(8), z.literal(9), z.literal(10), z.literal(11),
]);
const areaCreaturePerceptionRangeTableSchema = z.object({
  resourceName: z.literal("ranges.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(12).max(1_000_000),
  rowIndex: areaCreaturePerceptionRangeRowSchema,
}).strict().superRefine((value, context) => {
  if (value.rowIndex >= value.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "rowIndex is outside ranges.2da" });
  }
});
const areaCreaturePerceptionRangeStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
    table: areaCreaturePerceptionRangeTableSchema.optional(),
  }).strict().superRefine((value, context) => {
    if (value.table && value.table.rowIndex !== value.value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "PerceptionRange value and rowIndex differ" });
    }
  }),
]);

const areaCreatureWalkRateTableSchema = z.object({
  resourceName: z.literal("creaturespeed.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(2).max(1_000_000),
  rowIndex: z.number().int().min(1).max(999_999),
  twoDaName: z.string().min(1).max(128).refine((value) =>
    value !== "****" && !value.includes("\0")),
}).strict().superRefine((value, context) => {
  if (value.rowIndex >= value.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "rowIndex is outside creaturespeed.2da" });
  }
});
const areaCreatureWalkRateStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("int"),
    value: z.number().int().min(-0x8000_0000).max(0x7fff_ffff),
    table: areaCreatureWalkRateTableSchema.optional(),
  }).strict().superRefine((value, context) => {
    if (value.table && value.table.rowIndex !== value.value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "WalkRate value and rowIndex differ" });
    }
  }),
]);

const areaCreatureSoundSetFileTableSchema = z.object({
  resourceName: z.literal("soundset.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(1_000_000),
  rowIndex: z.number().int().min(0).max(0xffff),
  resRef: z.string().regex(/^[a-z0-9_]{1,16}$/u),
}).strict().superRefine((value, context) => {
  if (value.rowIndex >= value.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "rowIndex is outside soundset.2da" });
  }
});
const areaCreatureSoundSetFileStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("word"),
    value: z.number().int().min(0).max(0xffff),
    table: areaCreatureSoundSetFileTableSchema.optional(),
  }).strict().superRefine((value, context) => {
    if (value.table && value.table.rowIndex !== value.value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "SoundSetFile value and rowIndex differ" });
    }
  }),
]);

const areaCreatureStartingPackageTableSchema = z.object({
  resourceName: z.literal("packages.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(256),
  rowIndex: z.number().int().min(0).max(0xff),
  classId: z.number().int().min(0).max(0x7fff_ffff),
}).strict().superRefine((value, context) => {
  if (value.rowIndex >= value.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "StartingPackage rowIndex is outside table" });
  }
});
const areaCreatureStartingPackageClassIdsSchema = z.array(
  z.number().int().min(0).max(0x7fff_ffff),
).min(1).max(8).superRefine((value, context) => {
  if (new Set(value).size !== value.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "ClassList IDs must be unique" });
  }
});
const areaCreatureStartingPackageStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
  }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
    classIds: areaCreatureStartingPackageClassIdsSchema,
  }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
    classIds: areaCreatureStartingPackageClassIdsSchema,
    table: areaCreatureStartingPackageTableSchema,
  }).strict().superRefine((value, context) => {
    if (value.table.rowIndex !== value.value || !value.classIds.includes(value.table.classId)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "StartingPackage binding differs from value or ClassList" });
    }
  }),
]);

const areaCreatureSkillListTableSchema = z.object({
  resourceName: z.literal("skills.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(4096),
}).strict();
const areaCreatureSkillListExactShape = {
  present: z.literal(true),
  nativeType: z.literal("list"),
  structTypeId: z.literal(0),
  rankNativeType: z.literal("byte"),
  ranks: z.array(z.number().int().min(0).max(0xff)).max(4096),
  opaqueSiblingFieldCounts: z.array(z.number().int().min(0).max(65_535)).max(4096),
} as const;
const refineCreatureSkillListArrays = (
  value: { ranks: number[]; opaqueSiblingFieldCounts: number[] },
  context: z.RefinementCtx,
) => {
  if (value.ranks.length !== value.opaqueSiblingFieldCounts.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "SkillList arrays must align" });
  }
};
const areaCreatureSkillListExactSchema = z.object(areaCreatureSkillListExactShape)
  .strict().superRefine(refineCreatureSkillListArrays);
const areaCreatureSkillListStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  areaCreatureSkillListExactSchema,
  z.object({ ...areaCreatureSkillListExactShape, table: areaCreatureSkillListTableSchema })
    .strict().superRefine(refineCreatureSkillListArrays),
]);

const areaCreatureFeatListTableSchema = z.object({
  resourceName: z.literal("feat.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(65_536),
}).strict();
const areaCreatureFeatListExactShape = {
  present: z.literal(true),
  nativeType: z.literal("list"),
  structTypeId: z.literal(1),
  featNativeType: z.literal("word"),
  featIds: z.array(z.number().int().min(0).max(65_535)).max(65_536),
  opaqueSiblingFieldCounts: z.array(z.number().int().min(0).max(65_535)).max(65_536),
} as const;
const refineCreatureFeatListArrays = (
  value: { featIds: number[]; opaqueSiblingFieldCounts: number[] },
  context: z.RefinementCtx,
) => {
  if (value.featIds.length !== value.opaqueSiblingFieldCounts.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "FeatList arrays must align" });
  }
};
const areaCreatureFeatListExactSchema = z.object(areaCreatureFeatListExactShape)
  .strict().superRefine(refineCreatureFeatListArrays);
const areaCreatureFeatListStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  areaCreatureFeatListExactSchema,
  z.object({ ...areaCreatureFeatListExactShape, table: areaCreatureFeatListTableSchema })
    .strict().superRefine(refineCreatureFeatListArrays),
]);

const areaCreatureSpecialAbilityListTableSchema = z.object({
  resourceName: z.literal("spells.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(65_536),
}).strict();
const areaCreatureSpecialAbilityListExactShape = {
  present: z.literal(true),
  nativeType: z.literal("list"),
  structTypeId: z.literal(4),
  entries: z.array(z.object({
    spellId: z.number().int().min(0).max(0xffff),
    spellFlags: z.number().int().min(0).max(0xff),
    casterLevel: z.number().int().min(0).max(0xff),
    opaqueSiblingFieldCount: z.number().int().min(0).max(0xffff),
  }).strict()).max(65_536),
} as const;
const areaCreatureSpecialAbilityListStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object(areaCreatureSpecialAbilityListExactShape).strict(),
  z.object({
    ...areaCreatureSpecialAbilityListExactShape,
    table: areaCreatureSpecialAbilityListTableSchema,
  }).strict(),
]);

const areaCreatureClassLevelStateSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("list"),
    structTypeId: z.literal(2),
    classNativeType: z.literal("int"),
    levelNativeType: z.literal("short"),
    entries: z.array(z.object({
      classId: z.number().int().min(0).max(0x7fff_ffff),
      level: z.number().int().min(1).max(60),
      opaqueSiblingFieldCount: z.number().int().min(0).max(65_535),
    }).strict()).min(1).max(8),
  }).strict().superRefine((value, context) => {
    if (new Set(value.entries.map((entry) => entry.classId)).size !== value.entries.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "ClassList IDs must be unique" });
    }
    if (value.entries.reduce((sum, entry) => sum + entry.level, 0) > 180) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Creature class-level total exceeds the Toolset interval",
      });
    }
  }),
]);

const areaCreatureClassesTableSchema = z.object({
  resourceName: z.literal("classes.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(65_536),
}).strict();
const areaCreatureClassIdentityEntrySchema = z.object({
  classId: z.number().int().min(0).max(0x7fff_ffff),
  level: z.number().int().min(1).max(60),
  opaqueSiblingFieldCount: z.number().int().min(0).max(65_535),
  canonicalSpellListFieldCount: z.number().int().min(0).max(28),
  spellEntryCount: z.number().int().min(0).max(65_535),
}).strict();
const areaCreatureClassIdentityShape = {
  present: z.literal(true),
  nativeType: z.literal("list"),
  structTypeId: z.literal(2),
  classNativeType: z.literal("int"),
  levelNativeType: z.literal("short"),
  classListGraphSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  entries: z.array(areaCreatureClassIdentityEntrySchema).min(1).max(8),
} as const;
const refineCreatureClassIdentity = (
  value: {
    entries: Array<{ classId: number; level: number }>;
    classesTable?: { rowCount: number };
  },
  context: z.RefinementCtx,
) => {
  if (new Set(value.entries.map((entry) => entry.classId)).size !== value.entries.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "ClassList IDs must be unique" });
  }
  if (value.entries.reduce((sum, entry) => sum + entry.level, 0) > 180) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Creature class-level total exceeds 180" });
  }
  if (value.classesTable && value.entries.some((entry) =>
    entry.classId >= value.classesTable!.rowCount)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "ClassList ID is outside classes.2da" });
  }
};
const areaCreatureClassIdentityStateSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object(areaCreatureClassIdentityShape).strict()
    .superRefine(refineCreatureClassIdentity),
  z.object({ ...areaCreatureClassIdentityShape, classesTable: areaCreatureClassesTableSchema })
    .strict().superRefine(refineCreatureClassIdentity),
]);

const areaCreaturePhenotypeTableSchema = z.object({
  resourceName: z.literal("phenotype.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(1_000_000),
  rowIndex: z.number().int().min(0).max(0xff).refine((value) => value !== 1),
}).strict().superRefine((value, context) => {
  if (value.rowIndex >= value.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "rowIndex is outside phenotype.2da" });
  }
});

const areaCreaturePhenotypeStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("int"),
    value: z.number().int().min(-0x8000_0000).max(0x7fff_ffff),
    table: areaCreaturePhenotypeTableSchema.optional(),
  }).strict().superRefine((value, context) => {
    if (value.table && value.table.rowIndex !== value.value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Phenotype value and rowIndex differ" });
    }
  }),
]);

const areaCreaturePortraitSelectorContextSchema = z.object({
  genderValue: z.number().int().min(0).max(0xff),
  raceValue: z.number().int().min(0).max(0xff),
}).strict();

const areaCreaturePortraitTableSchema = z.object({
  resourceName: z.literal("portraits.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(65_536),
  rowIndex: z.number().int().min(0).max(0xffff),
  baseResRef: z.string().regex(/^[a-z0-9_]{1,16}$/u),
}).strict().superRefine((value, context) => {
  if (value.rowIndex >= value.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "PortraitId is outside portraits.2da" });
  }
});

const areaCreaturePortraitStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("word"),
    value: z.number().int().min(0).max(0xffff),
    selectorContext: areaCreaturePortraitSelectorContextSchema.optional(),
    table: areaCreaturePortraitTableSchema.optional(),
  }).strict().superRefine((value, context) => {
    if (value.table && !value.selectorContext) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Bound portrait requires context" });
    }
    if (value.table && value.table.rowIndex !== value.value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "PortraitId and rowIndex differ" });
    }
  }),
]);

const areaCreatureChallengeRatingStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("float"),
    value: z.number().finite().min(0).max(1_000).refine(
      (value) => !Object.is(value, -0) && Math.fround(value) === value,
      "ChallengeRating must be an exact admitted binary32 value",
    ),
  }).strict(),
]);

const areaCreatureAbilityScoreStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
  }).strict(),
]);

const areaCreatureAbilityScoresStorageSchema = z.object({
  strength: areaCreatureAbilityScoreStorageSchema,
  dexterity: areaCreatureAbilityScoreStorageSchema,
  constitution: areaCreatureAbilityScoreStorageSchema,
  intelligence: areaCreatureAbilityScoreStorageSchema,
  wisdom: areaCreatureAbilityScoreStorageSchema,
  charisma: areaCreatureAbilityScoreStorageSchema,
}).strict();

const areaCreatureAppearanceColorsStorageSchema = z.object({
  skin: areaCreatureAbilityScoreStorageSchema,
  hair: areaCreatureAbilityScoreStorageSchema,
  tattoo1: areaCreatureAbilityScoreStorageSchema,
  tattoo2: areaCreatureAbilityScoreStorageSchema,
}).strict();

const areaCreatureBodyPartByteStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
  }).strict(),
]);

const areaCreatureBodyPartWordStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("word"),
    value: z.number().int().min(0).max(0xffff),
  }).strict(),
]);

const areaCreatureBodyPartStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    value: z.number().int().min(0).max(0xffff),
    legacyByte: areaCreatureBodyPartByteStorageSchema,
    wideWord: areaCreatureBodyPartWordStorageSchema,
  }).strict(),
]).superRefine((storage, context) => {
  if (!storage.present) return;
  if (!storage.legacyByte.present && !storage.wideWord.present) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "body part storage is absent" });
    return;
  }
  const effectiveValue = storage.wideWord.present
    ? storage.wideWord.value
    : storage.legacyByte.present
      ? storage.legacyByte.value
      : null;
  if (effectiveValue === null || storage.value !== effectiveValue) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "body part value mismatch" });
  }
  if (
    storage.legacyByte.present && storage.wideWord.present &&
    storage.legacyByte.value !== (storage.wideWord.value <= 0xff ? storage.wideWord.value : 0)
  ) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "body part compatibility mismatch" });
  }
});

const areaCreatureBodyPartsStorageSchema = z.object({
  rightFoot: areaCreatureBodyPartStorageSchema,
  leftFoot: areaCreatureBodyPartStorageSchema,
  rightShin: areaCreatureBodyPartStorageSchema,
  leftShin: areaCreatureBodyPartStorageSchema,
  leftThigh: areaCreatureBodyPartStorageSchema,
  rightThigh: areaCreatureBodyPartStorageSchema,
  pelvis: areaCreatureBodyPartStorageSchema,
  torso: areaCreatureBodyPartStorageSchema,
  belt: areaCreatureBodyPartStorageSchema,
  neck: areaCreatureBodyPartStorageSchema,
  rightForearm: areaCreatureBodyPartStorageSchema,
  leftForearm: areaCreatureBodyPartStorageSchema,
  rightBicep: areaCreatureBodyPartStorageSchema,
  leftBicep: areaCreatureBodyPartStorageSchema,
  rightShoulder: areaCreatureBodyPartStorageSchema,
  leftShoulder: areaCreatureBodyPartStorageSchema,
  rightHand: areaCreatureBodyPartStorageSchema,
  leftHand: areaCreatureBodyPartStorageSchema,
  head: areaCreatureBodyPartStorageSchema,
}).strict();

const areaCreatureAppendageTableSchema = z.object({
  resourceName: z.enum(["wingmodel.2da", "tailmodel.2da"]),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(1_000_000),
  rowIndex: z.number().int().min(0).max(0xffff_ffff),
}).strict().superRefine((table, context) => {
  if (table.rowIndex >= table.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "appendage row is outside table" });
  }
});

const areaCreatureAppendageDwordStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("dword"),
    value: z.number().int().min(0).max(0xffff_ffff),
    table: areaCreatureAppendageTableSchema.optional(),
  }).strict().superRefine((storage, context) => {
    if (storage.table && storage.table.rowIndex !== storage.value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "appendage table row mismatch" });
    }
  }),
]);

const areaCreatureAppendageByteStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
  }).strict(),
]);

function areaCreatureAppendageStorageSchema(
  resourceName: "wingmodel.2da" | "tailmodel.2da",
) {
  return z.union([
    z.object({ present: z.literal(false) }).strict(),
    z.object({
      present: z.literal(true),
      value: z.number().int().min(0).max(0xffff_ffff),
      modernDword: areaCreatureAppendageDwordStorageSchema,
      legacyByte: areaCreatureAppendageByteStorageSchema,
    }).strict(),
  ]).superRefine((storage, context) => {
    if (!storage.present) return;
    if (!storage.modernDword.present && !storage.legacyByte.present) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "appendage storage is absent" });
      return;
    }
    const effectiveValue = storage.modernDword.present
      ? storage.modernDword.value
      : storage.legacyByte.present
        ? storage.legacyByte.value
        : null;
    if (effectiveValue === null || storage.value !== effectiveValue) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "appendage value mismatch" });
    }
    if (
      storage.modernDword.present &&
      storage.modernDword.table &&
      storage.modernDword.table.resourceName !== resourceName
    ) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "appendage table kind mismatch" });
    }
  });
}

const areaCreatureAppendagesStorageSchema = z.object({
  wings: areaCreatureAppendageStorageSchema("wingmodel.2da"),
  tail: areaCreatureAppendageStorageSchema("tailmodel.2da"),
}).strict();

const areaCreatureHitPointShortSchema = z.object({
  nativeType: z.literal("short"),
  value: z.number().int().min(-0x8000).max(0x7fff),
}).strict();

const areaCreatureHitPointByteSchema = z.object({
  nativeType: z.literal("byte"),
  value: z.number().int().min(0).max(0xff),
}).strict();

const areaCreatureHitPointRacialTypesSchema = z.object({
  resourceName: z.literal("racialtypes.2da"),
  sourceObjectKey: z.string().min(1).max(2048),
  sourceLayer: z.enum(["module", "hak", "vanilla"]),
  sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  sizeBytes: z.number().int().min(1).max(64 * 1024 * 1024),
  rowCount: z.number().int().min(1).max(1_000_000),
  rowIndex: z.number().int().min(0).max(0xff),
  constitutionAdjust: z.number().int().min(-0x8000_0000).max(0x7fff_ffff),
}).strict().superRefine((value, context) => {
  if (value.rowIndex >= value.rowCount) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Race row is outside table" });
  }
});

const areaCreatureHitPointStateSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    hitPoints: areaCreatureHitPointShortSchema.refine(
      (field) => field.value >= 1 && field.value <= 10_000,
      "Base HP is outside the Toolset interval",
    ),
    currentHitPoints: areaCreatureHitPointShortSchema,
    maxHitPoints: areaCreatureHitPointShortSchema,
    constitution: areaCreatureHitPointByteSchema,
    race: areaCreatureHitPointByteSchema,
    classLevels: z.array(z.number().int().min(0).max(0xff)).max(8).refine(
      (levels) => levels.reduce((sum, level) => sum + level, 0) <= 180,
      "Creature class-level total exceeds the Toolset interval",
    ),
    featRow40Present: z.boolean(),
    racialTypes: areaCreatureHitPointRacialTypesSchema.optional(),
  }).strict().superRefine((value, context) => {
    if (value.racialTypes && value.racialTypes.rowIndex !== value.race.value) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Race and table row differ" });
    }
  }),
]);

const areaCreatureNaturalArmorClassStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: z.number().int().min(0).max(0xff),
  }).strict(),
]);

const areaCreatureSavingThrowBonusStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("short"),
    value: z.number().int().min(0).max(250),
  }).strict(),
]);

const areaCreatureSavingThrowBonusesStorageSchema = z.object({
  fortitude: areaCreatureSavingThrowBonusStorageSchema,
  reflex: areaCreatureSavingThrowBonusStorageSchema,
  will: areaCreatureSavingThrowBonusStorageSchema,
}).strict();

const areaCreatureAlignmentAxisValueSchema = z.union([
  z.literal(0),
  z.literal(50),
  z.literal(100),
]);

const areaCreatureAlignmentByteStorageSchema = z.union([
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("byte"),
    value: areaCreatureAlignmentAxisValueSchema,
  }).strict(),
]);

const areaCreatureAlignmentStorageSchema = z.object({
  goodEvil: areaCreatureAlignmentByteStorageSchema,
  lawfulChaotic: areaCreatureAlignmentByteStorageSchema,
}).strict();

const areaCreatureFactionStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("word"),
    value: z.number().int().min(0).max(0xffff),
  }).strict(),
]);

const areaCreatureTemplateResRefStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("resref"),
    value: z.string().regex(/^[a-z0-9_]{1,16}$/u),
  }).strict(),
]);

const areaCreatureSpecialIdentityStringStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("cexostring"),
    value: z.string().max(256).regex(/^[\x20-\x7e]*$/u),
  }).strict(),
]);

const areaCreatureSpecialIdentityStringsStorageSchema = z.object({
  subrace: areaCreatureSpecialIdentityStringStorageSchema,
  deity: areaCreatureSpecialIdentityStringStorageSchema,
}).strict();

const areaCreatureScriptResRefStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("resref"),
    value: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  }).strict(),
]);

const areaCreatureScriptResRefsStorageSchema = z.object({
  onHeartbeat: areaCreatureScriptResRefStorageSchema,
  onPerception: areaCreatureScriptResRefStorageSchema,
  onSpellCastAt: areaCreatureScriptResRefStorageSchema,
  onPhysicalAttacked: areaCreatureScriptResRefStorageSchema,
  onDamaged: areaCreatureScriptResRefStorageSchema,
  onDisturbed: areaCreatureScriptResRefStorageSchema,
  onCombatRoundEnd: areaCreatureScriptResRefStorageSchema,
  onConversation: areaCreatureScriptResRefStorageSchema,
  onSpawn: areaCreatureScriptResRefStorageSchema,
  onRested: areaCreatureScriptResRefStorageSchema,
  onDeath: areaCreatureScriptResRefStorageSchema,
  onUserDefined: areaCreatureScriptResRefStorageSchema,
  onBlocked: areaCreatureScriptResRefStorageSchema,
}).strict();

const areaCreatureNameLocalizedStringsSchema = z.object({
  firstName: areaPlaceableLocalizedStringStorageSchema,
  lastName: areaPlaceableLocalizedStringStorageSchema,
  description: areaPlaceableLocalizedStringStorageSchema.optional(),
}).strict().superRefine((value, context) => {
  if (!readCreatureNameLocalizedStrings(value)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Creature name localized-string storage provenance is not canonical",
    });
  }
});

const areaCatalogLightSourceEvidenceKindSchema = z.enum([
  "placeables.2da.LightColor",
  "utp.LightState",
  "catalog.light_source"
]);

const areaCatalogLightSourceEvidenceSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  tags: z.array(z.string()),
  evidence: z.array(areaCatalogLightSourceEvidenceKindSchema),
  source2daLightColorRaw: z.string().min(1).optional(),
  source2daLightColorRow: z.number().int().nonnegative().optional(),
  source2daLightColorLabel: z.string().min(1).optional(),
  source2daLightColorSourceKey: z.string().min(1).optional(),
  source2daLightRed: z.number().finite().optional(),
  source2daLightGreen: z.number().finite().optional(),
  source2daLightBlue: z.number().finite().optional(),
  source2daToolsetRed: z.number().finite().optional(),
  source2daToolsetGreen: z.number().finite().optional(),
  source2daToolsetBlue: z.number().finite().optional(),
  source2daLightOffsetX: z.number().finite().optional(),
  source2daLightOffsetY: z.number().finite().optional(),
  source2daLightOffsetZ: z.number().finite().optional(),
  source2daShadowSize: z.number().int().nonnegative().optional(),
  source2daStatic: z.boolean().optional(),
  lightState: z.number().int().nonnegative().optional(),
  modelResRef: z.string().min(1).optional(),
  lookupModelResRef: z.string().min(1).optional()
});

const areaProcessedMdlLightVector3Schema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite()
});

const areaProcessedMdlLightColorSchema = z.object({
  red: z.number().finite(),
  green: z.number().finite(),
  blue: z.number().finite()
});

const areaProcessedMdlLightNodeEvidenceSchema = z.object({
  source: z.enum(["aurora-mdl-binary", "aurora-mdl-ascii"]),
  sourceModelAssetId: z.string().min(1),
  sourceModelFileName: z.string().min(1),
  sourceModelObjectKey: z.string().min(1),
  nodeName: z.string().min(1),
  sourceNodeKind: z.string().min(1).optional(),
  parentNodeName: z.string().min(1).optional(),
  position: areaProcessedMdlLightVector3Schema.optional(),
  scale: z.number().finite().optional(),
  radius: z.number().finite().optional(),
  quadraticAtten: z.number().finite().optional(),
  quadraticAttenSource: z.string().min(1).optional(),
  quadraticAttenProofStatus: z.string().min(1).optional(),
  auroraLightFieldParserSource: z.string().min(1).optional(),
  auroraLightFieldParserProofStatus: z.string().min(1).optional(),
  shadowRadius: z.number().finite().optional(),
  verticalDisplacement: z.number().finite().optional(),
  multiplier: z.number().finite().optional(),
  color: areaProcessedMdlLightColorSchema.optional(),
  ambientOnly: z.boolean().optional(),
  dynamicType: z.number().finite().optional(),
  affectDynamic: z.boolean().optional(),
  shadow: z.boolean().optional(),
  lightPriority: z.number().finite().optional(),
  generateFlare: z.boolean().optional(),
  textureNames: z.array(z.string().min(1)).optional(),
  flareSizes: z.array(z.number().finite()).optional(),
  flarePositions: z.array(z.number().finite()).optional(),
  flareColorShifts: z.array(areaProcessedMdlLightColorSchema).optional(),
  flareRadius: z.number().finite().optional(),
  lensFlares: z.boolean().optional(),
  fadingLight: z.boolean().optional(),
  animationNames: z.array(z.string().min(1)).optional()
});

const areaProcessedMdlLightSourceEvidenceSchema = z.object({
  templateId: z.string().min(1),
  resref: z.string().min(1),
  name: z.string().min(1),
  modelResRef: z.string().min(1).optional(),
  lookupModelResRef: z.string().min(1).optional(),
  cacheKey: z.string().min(1).optional(),
  cacheHit: z.boolean().optional(),
  nodes: z.array(areaProcessedMdlLightNodeEvidenceSchema)
});

const areaRendererLightBudgetCandidateSchema = z.object({
  candidateId: z.string().min(1),
  source: z.enum([
    "processed-mdl-light-node",
    "tile-light-reference",
    "catalog-light-source-template",
    "placeable-name-candidate"
  ]),
  label: z.string().min(1),
  priority: z.number().finite(),
  rank: z.number().int().positive(),
  accepted: z.boolean(),
  dropReason: z.literal("aurora-active-light-slot-cap").optional(),
  areaId: z.string().min(1).optional(),
  areaName: z.string().min(1).optional(),
  tileInstanceId: z.string().min(1).optional(),
  tileChannel: z.enum(["mainLight1", "mainLight2", "sourceLight1", "sourceLight2"]).optional(),
  templateId: z.string().min(1).optional(),
  resref: z.string().min(1).optional(),
  nodeName: z.string().min(1).optional(),
  lightPriority: z.number().finite().optional(),
  retailMdlScoreSource: z.string().min(1).optional(),
  retailMdlScoreProofStatus: z.string().min(1).optional(),
  retailMdlPreviewScore: z.number().finite().optional(),
  retailMdlPreviewScorePriority: z.number().finite().optional(),
  retailMdlPreviewScorePreviewDistance: z.number().finite().optional(),
  retailMdlPreviewScoreRangeTerm: z.number().finite().optional(),
  retailMdlPreviewScoreFormula: z.string().min(1).optional(),
  retailMdlPreviewScoreSource: z.string().min(1).optional(),
  retailMdlPreviewScoreProofStatus: z.string().min(1).optional(),
  retailMdlPreviewScoreSortDirection: z.literal("ascending-score-field-0x84-preview").optional(),
  retailMdlPreviewScoreFallback: z.string().min(1).optional(),
  prioritySource: z.string().min(1).optional()
});

const areaRendererLightBudgetSchema = z.object({
  activeLightSlotCap: z.literal(128),
  candidateLights: z.number().int().nonnegative(),
  acceptedLights: z.number().int().nonnegative(),
  droppedLights: z.number().int().nonnegative(),
  sampledCandidateLights: z.number().int().nonnegative(),
  omittedCandidateLights: z.number().int().nonnegative(),
  priorityStrategy: z.literal(
    "source-backed-mdl-lightmanager-score-then-diagnostic-lane-fallback"
  ),
  priorityStrategyProofStatus: z.literal(
    "source-backed-mdl-lightmanager-score-diagnostic-cross-lane-fallback"
  ),
  retailMdlLightScoreSource: z.string().min(1),
  retailMdlLightSortSource: z.string().min(1),
  retailActiveLightSortScoreSource: z.string().min(1),
  retailActiveLightSortScoreFormula: z.string().min(1),
  retailActiveLightSortDirection: z.literal("ascending-score-field-0x84"),
  retailActiveLightSortScoreProofStatus: z.literal(
    "source-backed-retail-active-light-score-sort-known-cross-lane-insertion-blocked"
  ),
  retailActiveLightUploadSource: z.string().min(1),
  retailOrderingStatus: z.literal("blocked-no-recovered-retail-cross-lane-active-light-ordering"),
  candidates: z.array(areaRendererLightBudgetCandidateSchema)
});

const areaShadowDiagnosticEntrySchema = z.object({
  entryId: z.string().min(1),
  source: z.enum([
    "area-root-shadow-field",
    "processed-mdl-light-node",
    "catalog-placeable-shadow-size"
  ]),
  label: z.string().min(1),
  severity: z.enum(["info", "warning"]),
  note: z.string().min(1),
  areaId: z.string().min(1).optional(),
  areaName: z.string().min(1).optional(),
  field: z.enum(["ShadowOpacity", "SunShadows", "MoonShadows"]).optional(),
  value: z.number().finite().optional(),
  templateId: z.string().min(1).optional(),
  resref: z.string().min(1).optional(),
  nodeName: z.string().min(1).optional(),
  shadow: z.boolean().optional(),
  shadowSize: z.number().finite().optional(),
  rendererRank: z.number().int().positive().optional(),
  rendererAccepted: z.boolean().optional()
});

const areaShadowDiagnosticSchema = z.object({
  entries: z.array(areaShadowDiagnosticEntrySchema),
  shadowRelevantEntries: z.number().int().nonnegative(),
  sampledEntries: z.number().int().nonnegative(),
  omittedEntries: z.number().int().nonnegative(),
  globalShadowFields: z.number().int().nonnegative(),
  areaShadowOpacityFields: z.number().int().nonnegative(),
  areaSunShadowFields: z.number().int().nonnegative(),
  areaMoonShadowFields: z.number().int().nonnegative(),
  mdlShadowLightNodes: z.number().int().nonnegative(),
  mdlExplicitNonShadowLightNodes: z.number().int().nonnegative(),
  catalogShadowSizeTemplates: z.number().int().nonnegative()
});

const areaLightingAuditCoverageSchema = z.object({
  key: z.enum([
    "area-tile-light-color",
    "area-tile-light-position",
    "area-tile-source-light-proxy",
    "area-tile-light-radius-falloff",
    "area-global-lighting-fields",
    "area-global-light-intensity",
    "area-fog-range",
    "area-shadow-opacity",
    "area-shadow-volume-implementation",
    "placeable-2da-light-color",
    "placeable-2da-light-offset-shadow",
    "placeable-lightstate-toggle",
    "placeable-radius-falloff",
    "mdl-light-node-radius-color-shadow",
    "item-property-light-runtime-scheduler",
    "progfx-type4-runtime-scheduler",
    "renderer-active-light-budget",
    "renderer-active-light-ordering"
  ]),
  label: z.string().min(1),
  status: z.enum(["source-backed", "preview-only", "blocked", "not-observed"]),
  evidence: z.string().min(1),
  proof: z.string().min(1),
  blocker: z.string().min(1).optional()
});

const areaLightingAuditGapSchema = areaLightingAuditCoverageSchema.extend({
  status: z.enum(["preview-only", "blocked", "not-observed"]),
  nextStep: z.string().min(1)
});

const areaLightingRetailOracleCaseSchema = z.object({
  caseId: z.string().min(1),
  purpose: z.string().min(1),
  requiredArtifacts: z.array(z.string().min(1)).min(1),
  acceptanceGate: z.string().min(1),
  currentStatus: z.enum(["missing-retail-oracle", "partial-local-proof"]),
  currentEvidence: z.array(z.string().min(1)),
  blocker: z.string().min(1)
});

const areaLightingRemainingRetailBlockerSchema = z.object({
  key: z.enum([
    "retail-shadow-volume-projection-parity",
    "retail-cross-lane-active-light-ordering",
    "progfx-type4-priority-proximity-vision-scheduler"
  ]),
  label: z.string().min(1),
  status: z.literal("blocked"),
  affectedCoverageKeys: z.array(areaLightingAuditCoverageSchema.shape.key),
  evidence: z.string().min(1),
  proof: z.string().min(1),
  requiredEvidence: z.string().min(1),
  oracleCases: z.array(areaLightingRetailOracleCaseSchema).min(1),
  nextStep: z.string().min(1)
});

const areaLightingEvidenceEnvelopeSchema = z.object({
  data: z.object({
    summary: z.object({
      areasScanned: z.number().int().nonnegative(),
      tileLightTiles: z.number().int().nonnegative(),
      tileLightReferences: z.number().int().nonnegative(),
      tileLightAreas: z.number().int().nonnegative(),
      areaGlobalLightingAreas: z.number().int().nonnegative(),
      areaGlobalLightingFields: z.number().int().nonnegative(),
      areaShadowOpacityAreas: z.number().int().nonnegative(),
      placeableNameCandidates: z.number().int().nonnegative(),
      placeableNameCandidateAreas: z.number().int().nonnegative(),
      catalogLightSourceTemplates: z.number().int().nonnegative(),
      catalogLightColorTemplates: z.number().int().nonnegative(),
      catalogLightStateTemplates: z.number().int().nonnegative(),
      processedMdlLightTemplatesScanned: z.number().int().nonnegative(),
      processedMdlLightSourceTemplates: z.number().int().nonnegative(),
      processedMdlLightNodes: z.number().int().nonnegative(),
      processedMdlLightScanLimit: z.number().int().nonnegative(),
      auroraActiveLightSlotCap: z.literal(128),
      rendererCandidateLights: z.number().int().nonnegative(),
      rendererAcceptedLights: z.number().int().nonnegative(),
      rendererDroppedLights: z.number().int().nonnegative(),
      shadowDiagnosticEntries: z.number().int().nonnegative(),
      shadowMdlLightNodes: z.number().int().nonnegative(),
      shadowCatalogShadowSizeTemplates: z.number().int().nonnegative(),
      auditCoverageEntries: z.number().int().nonnegative(),
      auditCoverageSourceBacked: z.number().int().nonnegative(),
      auditCoveragePreviewOnly: z.number().int().nonnegative(),
      auditCoverageBlocked: z.number().int().nonnegative(),
      auditCoverageNotObserved: z.number().int().nonnegative(),
      auditGaps: z.number().int().nonnegative().default(0),
      remainingRetailBlockers: z.number().int().nonnegative().default(0)
    }),
    tileLights: z.array(areaTileLightingEvidenceSchema),
    areaGlobalLighting: z.array(areaGlobalLightingEvidenceSchema),
    placeableNameCandidates: z.array(areaPlaceableLightingCandidateSchema),
    catalogLightSources: z.array(areaCatalogLightSourceEvidenceSchema),
    processedMdlLightSources: z.array(areaProcessedMdlLightSourceEvidenceSchema),
    rendererLightBudget: areaRendererLightBudgetSchema,
    shadowDiagnostic: areaShadowDiagnosticSchema,
    auditCoverage: z.array(areaLightingAuditCoverageSchema),
    auditGaps: z.array(areaLightingAuditGapSchema).default([]),
    remainingRetailBlockers: z.array(areaLightingRemainingRetailBlockerSchema).default([])
  })
});

const areaListItemSchema = z.object({
  areaId: z.string().min(1),
  name: z.string().min(1),
  biome: z.string().min(1),
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  tags: z.array(z.string()),
  benchmark: z.boolean(),
  previewImageUrl: z.string(),
  textureAtlasId: z.string().min(1),
  objectCounts: areaObjectCountsSchema,
  updatedAt: z.string().min(1)
});

const areaListEnvelopeSchema = z.object({
  data: z.object({
    items: z.array(areaListItemSchema),
    total: z.number().int().nonnegative(),
    limit: z.number().int().positive(),
    offset: z.number().int().nonnegative()
  })
});

const areaPreservePrimitiveSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null()
]);

const areaCreatureMetadataPrimitiveSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean()
]);

const areaStoreCommerceSchema = z.object({
  markUp: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  markDown: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  blackMarket: z.boolean(),
  blackMarketMarkDown: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  identifyPrice: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  maxBuyPrice: z.number().int().min(-2_147_483_648).max(2_147_483_647),
  storeGold: z.number().int().min(-2_147_483_648).max(2_147_483_647),
}).strict();

const areaStoreScriptResRefsSchema = z.object({
  onOpenStore: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onStoreClosed: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
}).strict();

const areaStoreRestrictionExpectedListSchema = z.object({
  present: z.boolean(),
  baseItemIds: z.array(z.number().int().min(0).max(0x7fff_ffff))
    .max(MAX_AREA_STORE_RESTRICTION_ENTRIES),
}).strict();

const areaStoreRestrictionsProvenanceSchema = z.object({
  expectedValue: z.object({
    willNotBuy: areaStoreRestrictionExpectedListSchema,
    willOnlyBuy: areaStoreRestrictionExpectedListSchema,
  }).strict(),
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  tableRowCount: z.number().int().min(1).max(4096),
}).strict().superRefine((value, context) => {
  if (readStoreRestrictionsProvenance(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed catalog-bound Store restriction provenance.",
    });
  }
});

const areaStoreInventoryExpectedEntrySchema = z.object({
  sourceIndex: z.number().int().nonnegative(),
  resRef: z.string().regex(/^[A-Za-z0-9_]{1,16}$/u),
  baseItemId: z.number().int().min(0).max(0x7fff_ffff),
  slotWidth: z.number().int().min(1).max(10),
  slotHeight: z.number().int().min(1).max(10),
  x: z.number().int().min(0).max(9),
  y: z.number().int().min(0).max(2_549),
  infinite: z.boolean(),
}).strict();

const areaStoreInventoryProvenanceSchema = z.object({
  expectedBuckets: z.array(z.object({
    bucketTypeId: z.union([
      z.literal(0), z.literal(4), z.literal(2), z.literal(3), z.literal(1),
    ]),
    entries: z.array(areaStoreInventoryExpectedEntrySchema)
      .max(MAX_AREA_STORE_INVENTORY_ENTRIES),
  }).strict()).length(5),
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  tableRowCount: z.number().int().min(1).max(4096),
}).strict().superRefine((value, context) => {
  if (readStoreInventoryProvenance(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed catalog-bound retained Store inventory provenance.",
    });
  }
});

const areaSoundPositioningPreserveSchema = z.object({
  timeWindow: z.string(),
  hourMask: z.string(),
  active: z.boolean().optional(),
  whenToPlay: z.enum(["always", "dayNight", "hours"]).optional(),
  dayNight: z.enum(["both", "day", "night"]).optional(),
  hoursStart: z.number().finite().optional(),
  hoursEnd: z.number().finite().optional(),
  playStyle: z.enum(["once", "repeat", "loop"]).optional(),
  playOrder: z.enum(["sequential", "random"]).optional(),
  intervalMs: z.number().finite().nonnegative(),
  intervalVariationMs: z.number().finite().nonnegative(),
  volume: z.number().finite().nonnegative(),
  volumeVariation: z.number().finite().nonnegative(),
  pitchVariation: z.number().finite().nonnegative(),
  priority: z.number().finite().nonnegative(),
  flags: z.record(z.boolean()),
  extra: z.record(areaPreservePrimitiveSchema)
});

const areaSoundPositioningSchema = z.object({
  mode: z.enum(["everywhere", "random", "specific"]),
  elevation: z.number().finite().nonnegative(),
  maxVolumeDistance: z.number().finite().nonnegative(),
  cutoffDistance: z.number().finite().nonnegative(),
  randomRangeWestEast: z.number().finite().nonnegative(),
  randomRangeNorthSouth: z.number().finite().nonnegative(),
  preserve: areaSoundPositioningPreserveSchema.optional()
});

const areaSoundIntervalVariationStorageSchema = z.object({
  intervalMilliseconds: z.number().int().min(0)
    .max(MAX_AREA_SOUND_INTERVAL_VARIATION_MILLISECONDS)
    .multipleOf(10),
  intervalVariationMilliseconds: z.number().int().min(0)
    .max(MAX_AREA_SOUND_INTERVAL_VARIATION_MILLISECONDS)
    .multipleOf(10),
  pitchVariationHundredths: z.number().int().min(0)
    .max(MAX_AREA_SOUND_PITCH_VARIATION_HUNDREDTHS),
  volumeVariationByte: z.number().int().min(0)
    .max(MAX_AREA_SOUND_VOLUME_VARIATION_BYTE),
}).strict();

const areaSoundVolumeStorageSchema = z.object({
  volumeByte: z.number().int().min(0).max(MAX_AREA_SOUND_VOLUME_BYTE),
}).strict();

const areaSoundActiveStorageSchema: z.ZodType<AreaSoundActiveStorage> = z.object({
  activeByte: z.union([z.literal(0), z.literal(1)]),
}).strict();

const areaEncounterPlayerOnlyStorageSchema = z.object({
  playerOnlyByte: z.union([z.literal(0), z.literal(1)]),
}).strict();

const areaEncounterResetStorageSchema = z.object({
  resetByte: z.union([z.literal(0), z.literal(1)]),
}).strict();

const areaEncounterResetTimeStorageSchema = z.object({
  resetTime: z.number().int().min(1).max(32_000),
}).strict();

const areaEncounterSpawnOptionStorageSchema = z.object({
  spawnOption: z.union([z.literal(0), z.literal(1)]),
}).strict();

const areaEncounterRespawnsStorageSchema = z.object({
  respawns: z.number().int().refine(
    (value) => value === -1 || (value >= 0 && value <= 32_000),
  ),
}).strict();

const areaEncounterCreatureCountStorageSchema = z.object({
  maxCreatures: z.number().int().min(1).max(8),
  recCreatures: z.number().int().min(1).max(8),
}).strict().refine(
  (value) => value.recCreatures <= value.maxCreatures,
  { message: "Encounter Minimum Creatures cannot exceed Maximum Creatures." },
);

const areaEncounterScriptResRefsStorageSchema = z.object({
  onEntered: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onExit: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onExhausted: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onHeartbeat: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onUserDefined: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
}).strict();

const areaTriggerScriptResRefsStorageSchema = z.object({
  onDisarm: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onTrapTriggered: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onClick: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onHeartbeat: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onEnter: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onExit: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
  onUserDefined: z.string().regex(/^[A-Za-z0-9_]{0,16}$/u),
}).strict();

const areaEncounterFactionStorageSchema = areaPlaceableFactionStorageSchema;

const areaEncounterDifficultyIntStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("int"),
    value: z.number().int().min(-0x8000_0000).max(0x7fff_ffff),
  }).strict(),
]);

const areaEncounterDifficultyStorageSchema = z.object({
  difficulty: areaEncounterDifficultyIntStorageSchema,
  difficultyIndex: areaEncounterDifficultyIntStorageSchema,
}).strict();

const areaSoundPlayOrderStorageSchema: z.ZodType<AreaSoundPlayOrderStorage> = z.object({
  randomByte: z.union([z.literal(0), z.literal(1)]),
}).strict();

const areaSoundPlayStyleStorageSchema: z.ZodType<AreaSoundPlayStyleStorage> = z.object({
  loopingByte: z.union([z.literal(0), z.literal(1)]),
  continuousByte: z.union([z.literal(0), z.literal(1)]),
  priorityByte: z.union([z.literal(2), z.literal(3), z.literal(19), z.literal(20)]),
  positionalByte: z.union([z.literal(0), z.literal(1)]),
  soundsCount: z.number().int().min(0).max(MAX_AREA_SOUND_PLAY_STYLE_UINT32),
  intervalDword: z.number().int().min(0).max(MAX_AREA_SOUND_PLAY_STYLE_UINT32),
  intervalVariationDword: z.number().int().min(0).max(MAX_AREA_SOUND_PLAY_STYLE_UINT32),
}).strict().refine((value) => readAreaSoundPlayStyleStorage(value) !== null);

const areaSoundPlaybackStorageSchema: z.ZodType<AreaSoundPlaybackStorage> = z.object({
  sounds: z.array(z.string().regex(/^[a-z0-9_]{1,16}$/u))
    .max(MAX_AREA_SOUND_PLAYBACK_LIST_ENTRIES),
  loopingByte: z.union([z.literal(0), z.literal(1)]),
  continuousByte: z.union([z.literal(0), z.literal(1)]),
  priorityByte: z.union([z.literal(2), z.literal(3), z.literal(19), z.literal(20)]),
  positionalByte: z.union([z.literal(0), z.literal(1)]),
  intervalDword: z.number().int().min(0).max(MAX_AREA_SOUND_PLAY_STYLE_UINT32),
  intervalVariationDword: z.number().int().min(0).max(MAX_AREA_SOUND_PLAY_STYLE_UINT32),
}).strict().refine((value) => readAreaSoundPlaybackStorage(value) !== null);

const areaSoundProfileStorageSchema: z.ZodType<AreaSoundProfileStorage> = z.object({
  sounds: z.array(z.string().regex(/^[a-z0-9_]{1,16}$/u))
    .max(MAX_AREA_SOUND_PROFILE_LIST_ENTRIES),
  loopingByte: z.union([z.literal(0), z.literal(1)]),
  continuousByte: z.union([z.literal(0), z.literal(1)]),
  priorityByte: z.union([z.literal(2), z.literal(3), z.literal(19), z.literal(20)]),
  positionalByte: z.union([z.literal(0), z.literal(1)]),
  randomPositionByte: z.union([z.literal(0), z.literal(1)]),
  elevationFloat32: z.number().finite(),
  maxDistanceFloat32: z.number().finite(),
  minDistanceFloat32: z.number().finite(),
  randomRangeXFloat32: z.number().finite(),
  randomRangeYFloat32: z.number().finite(),
  intervalDword: z.number().int().min(0).max(MAX_AREA_SOUND_PLAY_STYLE_UINT32),
  intervalVariationDword: z.number().int().min(0).max(MAX_AREA_SOUND_PLAY_STYLE_UINT32),
}).strict().refine((value) => readAreaSoundProfileStorage(value) !== null);

const areaSoundScheduleStorageSchema = z.object({
  hoursMask: z.number().int().min(0).max(MAX_AREA_SOUND_HOURS_MASK),
  timesByte: z.number().int().min(0).max(MAX_AREA_SOUND_TIMES_BYTE),
}).strict();

const areaDoorTransitionStorageSchema = z.object({
  linkedTo: z.string()
    .max(MAX_AREA_DOOR_LINKED_TO_CODE_UNITS)
    .refine((value) => !value.includes("\0")),
  linkedToFlags: z.number().int().min(0).max(0xff),
  loadScreenId: z.number().int().min(0).max(0xffff),
}).strict();

const areaTriggerCorePropertiesSchema = z.object({
  autoRemoveKey: z.union([z.literal(0), z.literal(1)]),
  factionId: z.number().int().min(0).max(0xffff_ffff),
  cursorId: z.number().int().min(0).max(0xff),
  highlightHeight: z.number().finite()
    .refine((value) => Math.fround(value) === value),
  keyName: z.string().max(256).refine((value) => !value.includes("\0")),
  portraitId: z.number().int().min(0).max(0xffff),
  triggerType: z.number().int().min(-0x8000_0000).max(0x7fff_ffff),
}).strict();

const areaTriggerTrapPropertiesSchema = z.object({
  trapDetectable: z.number().int().min(0).max(0xff),
  trapDetectDc: z.number().int().min(0).max(0xff),
  trapDisarmable: z.number().int().min(0).max(0xff),
  disarmDc: z.number().int().min(0).max(0xff),
  trapFlag: z.number().int().min(0).max(0xff),
  trapOneShot: z.number().int().min(0).max(0xff),
  trapType: z.number().int().min(0).max(0xff),
}).strict();

const areaDoorTransitionSchema = z.object({
  linkedTarget: z.string(),
  linkedModule: z.string(),
  linkedTag: z.string(),
  linkedWaypoint: z.string(),
  loadScreen: z.string(),
  flags: z.record(z.boolean()),
  storage: areaDoorTransitionStorageSchema.optional(),
  extra: z.record(areaPreservePrimitiveSchema).optional()
});

const areaObjectVisualTransformSchema = z.object({
  scale: z.number().finite(),
  scaleX: z.number().finite().optional(),
  scaleY: z.number().finite().optional(),
  scaleZ: z.number().finite().optional(),
  offsetX: z.number().finite(),
  offsetY: z.number().finite(),
  offsetZ: z.number().finite(),
  pitch: z.number().finite(),
  yaw: z.number().finite(),
  roll: z.number().finite()
});

const areaPlaceableVariableSourceEntrySchema = z.discriminatedUnion("type", [
  z.object({
    sourceIndex: z.number().int().nonnegative(),
    name: z.string(),
    type: z.literal("int"),
    value: z.number().int(),
  }).strict(),
  z.object({
    sourceIndex: z.number().int().nonnegative(),
    name: z.string(),
    type: z.literal("float"),
    value: z.number().finite(),
  }).strict(),
  z.object({
    sourceIndex: z.number().int().nonnegative(),
    name: z.string(),
    type: z.literal("string"),
    value: z.string(),
  }).strict(),
]);

const areaPlaceableVariableProvenanceSchema = z.object({
  expectedEntries: z.array(areaPlaceableVariableSourceEntrySchema),
}).strict().superRefine((value, context) => {
  if (readAuroraVariableProvenance(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed Aurora VarTable provenance.",
    });
  }
});

const areaEncounterCreatureListSourceEntrySchema = z.object({
  sourceIndex: z.number().int().nonnegative(),
  appearance: z.number().int().min(-0x80000000).max(0x7fffffff),
  challengeRating: z.number().finite().refine(
    (value) => Object.is(Math.fround(value), value),
    "Encounter CreatureList CR must be represented exactly as FLOAT32.",
  ),
  resRef: z.string().regex(/^[A-Za-z0-9_]{1,16}$/u),
  singleSpawnByte: z.union([z.literal(0), z.literal(1)]),
}).strict();

const areaEncounterCreatureListProvenanceSchema = z.object({
  expectedEntries: z.array(areaEncounterCreatureListSourceEntrySchema)
    .max(MAX_ENCOUNTER_CREATURE_LIST_ENTRIES),
}).strict().superRefine((value, context) => {
  if (readEncounterCreatureListProvenance(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed exact Encounter CreatureList provenance.",
    });
  }
});

const exactFloat32Schema = z.number().finite().refine(
  (value) => Object.is(Math.fround(value), value),
  "Encounter SpawnPointList values must be represented exactly as FLOAT32.",
);

const areaEncounterSpawnPointSourceEntrySchema = z.object({
  sourceIndex: z.number().int().nonnegative(),
  nativeX: exactFloat32Schema,
  nativeY: exactFloat32Schema,
  nativeZ: exactFloat32Schema,
  orientation: exactFloat32Schema,
}).strict();

const areaEncounterSpawnPointListProvenanceSchema = z.object({
  expectedEntries: z.array(areaEncounterSpawnPointSourceEntrySchema)
    .max(MAX_ENCOUNTER_SPAWN_POINT_ENTRIES),
}).strict().superRefine((value, context) => {
  if (readEncounterSpawnPointListProvenance(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed exact Encounter SpawnPointList provenance.",
    });
  }
});

const areaStoreMetadataSchema = z.object({
  editorComment: z.string().optional(),
  commerce: areaStoreCommerceSchema.optional(),
  scriptResRefs: areaStoreScriptResRefsSchema.optional(),
  variables: areaPlaceableVariableProvenanceSchema.optional(),
  restrictions: areaStoreRestrictionsProvenanceSchema.optional(),
  inventory: areaStoreInventoryProvenanceSchema.optional(),
}).strict();

const areaItemPropertyListSourceEntrySchema = z.object({
  sourceIndex: z.number().int().nonnegative(),
  propertyName: z.number().int().min(0).max(0xffff),
  subtype: z.number().int().min(0).max(0xffff),
  costTable: z.number().int().min(0).max(0xff),
  costValue: z.number().int().min(0).max(0xffff),
  param1: z.number().int().min(0).max(0xff),
  param1Value: z.number().int().min(0).max(0xff),
  chanceAppear: z.number().int().min(0).max(0xff),
}).strict();

const areaItemPropertyListProvenanceSchema = z.object({
  present: z.boolean(),
  expectedEntries: z.array(areaItemPropertyListSourceEntrySchema)
    .max(MAX_ITEM_PROPERTY_LIST_ENTRIES),
}).strict().superRefine((value, context) => {
  if (readItemPropertyListProvenance(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed ground-item PropertiesList provenance.",
    });
  }
});

const areaItemInventorySourceEntrySchema = z.object({
  sourceIndex: z.number().int().nonnegative(),
  resRef: z.string().regex(/^[A-Za-z0-9_]{1,16}$/u),
  x: z.number().int().min(0).max(0xffff),
  y: z.number().int().min(0).max(0xffff),
}).strict();

const areaItemInventorySourceEntriesSchema = z.array(areaItemInventorySourceEntrySchema)
  .max(MAX_AREA_ITEM_INVENTORY_ENTRIES)
  .superRefine((value, context) => {
    if (readItemInventorySourceEntries(value) === null) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Malformed retained ground-item inventory provenance.",
      });
    }
  });

const areaItemVisualTransformValueSchema = z.object({
  scaleX: z.number().finite(),
  scaleY: z.number().finite(),
  scaleZ: z.number().finite(),
  rotateX: z.number().finite(),
  rotateY: z.number().finite(),
  rotateZ: z.number().finite(),
  translateX: z.number().finite(),
  translateY: z.number().finite(),
  translateZ: z.number().finite(),
}).strict();

const areaItemVisualTransformStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    value: areaItemVisualTransformValueSchema,
  }).strict(),
]).superRefine((value, context) => {
  if (readItemVisualTransformStorage(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed retained ground-item static visual-transform provenance.",
    });
  }
});

const areaItemArmorPartsSchema = z.object({
  rFoot: z.number().int().min(0).max(0xffff),
  lFoot: z.number().int().min(0).max(0xffff),
  rShin: z.number().int().min(0).max(0xffff),
  lShin: z.number().int().min(0).max(0xffff),
  lThigh: z.number().int().min(0).max(0xffff),
  rThigh: z.number().int().min(0).max(0xffff),
  pelvis: z.number().int().min(0).max(0xffff),
  torso: z.number().int().min(0).max(0xffff),
  belt: z.number().int().min(0).max(0xffff),
  neck: z.number().int().min(0).max(0xffff),
  rFArm: z.number().int().min(0).max(0xffff),
  lFArm: z.number().int().min(0).max(0xffff),
  rBicep: z.number().int().min(0).max(0xffff),
  lBicep: z.number().int().min(0).max(0xffff),
  rShoul: z.number().int().min(0).max(0xffff),
  lShoul: z.number().int().min(0).max(0xffff),
  rHand: z.number().int().min(0).max(0xffff),
  lHand: z.number().int().min(0).max(0xffff),
  robe: z.number().int().min(0).max(0xffff),
}).strict();

const areaItemMaterialColorsSchema = z.object({
  leather1: z.number().int().min(0).max(0xff),
  leather2: z.number().int().min(0).max(0xff),
  cloth1: z.number().int().min(0).max(0xff),
  cloth2: z.number().int().min(0).max(0xff),
  metal1: z.number().int().min(0).max(0xff),
  metal2: z.number().int().min(0).max(0xff),
}).strict();

const areaItemBaseAppearanceValueSchema = z.discriminatedUnion("modelType", [
  z.object({
    baseItem: z.number().int().min(0).max(0x7fff_ffff),
    modelType: z.literal(0),
    appearance: z.object({
      modelPart1: z.number().int().min(0).max(0xffff),
    }).strict(),
  }).strict(),
  z.object({
    baseItem: z.number().int().min(0).max(0x7fff_ffff),
    modelType: z.literal(1),
    appearance: z.object({
      modelPart1: z.number().int().min(0).max(0xffff),
      materialColors: areaItemMaterialColorsSchema,
    }).strict(),
  }).strict(),
  z.object({
    baseItem: z.number().int().min(0).max(0x7fff_ffff),
    modelType: z.literal(2),
    appearance: z.object({
      modelPart1: z.number().int().min(0).max(0xffff),
      modelPart2: z.number().int().min(0).max(0xffff),
      modelPart3: z.number().int().min(0).max(0xffff),
    }).strict(),
  }).strict(),
  z.object({
    baseItem: z.number().int().min(0).max(0x7fff_ffff),
    modelType: z.literal(3),
    appearance: z.object({
      armorParts: areaItemArmorPartsSchema,
      materialColors: areaItemMaterialColorsSchema,
    }).strict(),
  }).strict(),
]);

const areaItemBaseAppearanceProvenanceSchema = z.object({
  expectedValue: areaItemBaseAppearanceValueSchema,
  tableSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  tableRowCount: z.number().int().min(1).max(4096),
}).strict().superRefine((value, context) => {
  if (readItemBaseAppearanceProvenance(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed ground-item BaseItem/appearance provenance.",
    });
  }
});

const areaItemBaseItemCatalogSchema = z.object({
  descriptor: z.object({
    resourceName: z.literal("baseitems.2da"),
    sourceObjectKey: z.string().min(1).max(2048).refine((value) => !value.includes("\0")),
    sourceLayer: z.enum(["module", "hak", "vanilla"]),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    sizeBytes: z.number().int().min(1).max(16 * 1024 * 1024),
    rowCount: z.number().int().min(1).max(4096),
  }).strict(),
  rows: z.array(z.object({
    rowIndex: z.number().int().min(0).max(4095),
    nameStrRef: z.number().int().min(0).max(0xffff_ffff).optional(),
    label: z.string().min(1).max(256).refine((value) => !value.includes("\0")).optional(),
    modelType: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
    itemClass: z.string().min(1).max(64).refine((value) => !value.includes("\0")).optional(),
    displayName: z.string().min(1).max(1024).refine((value) => !value.includes("\0")),
    invSlotWidth: z.number().int().min(1).max(10).optional(),
    invSlotHeight: z.number().int().min(1).max(10).optional(),
  }).strict()).min(1).max(4096),
}).strict().superRefine((value, context) => {
  if (readItemBaseItemCatalog(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed effective baseitems.2da catalog.",
    });
  }
});

const areaItemInstanceStateSchema = z.object({
  presentFields: z.array(z.enum([
    "charges",
    "cost",
    "stolen",
    "stackSize",
    "plot",
    "addCost",
    "identified",
    "cursed",
  ])).max(8),
  values: z.object({
    charges: z.number().int().min(0).max(0xff),
    cost: z.number().int().min(0).max(0xffff_ffff),
    stolen: z.boolean(),
    stackSize: z.number().int().min(0).max(0xffff),
    plot: z.boolean(),
    addCost: z.number().int().min(0).max(0xffff_ffff),
    identified: z.boolean(),
    cursed: z.boolean(),
  }).strict(),
}).strict().superRefine((value, context) => {
  if (readItemInstanceStateStorage(value) === null) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Malformed ground-item instance-state provenance.",
    });
  }
});

const areaObjectTagStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    value: z.string().max(32).refine((value) => !value.includes("\0")),
  }).strict(),
]);

const areaItemTemplateResRefStorageSchema = z.discriminatedUnion("present", [
  z.object({ present: z.literal(false) }).strict(),
  z.object({
    present: z.literal(true),
    nativeType: z.literal("resref"),
    value: z.string().regex(/^[a-z0-9_]{1,16}$/u),
  }).strict(),
]);

const areaWaypointTemplateResRefStorageSchema = areaItemTemplateResRefStorageSchema;
const areaEncounterTemplateResRefStorageSchema = areaItemTemplateResRefStorageSchema;
const areaTriggerTemplateResRefStorageSchema = areaItemTemplateResRefStorageSchema;

const areaObjectSchema = z.object({
  objectId: z.string().min(1),
  sourceIndex: z.number().int().nonnegative().optional(),
  kind: z.enum([
    "placeable",
    "door",
    "creature",
    "encounter",
    "item",
    "sound",
    "store",
    "trigger",
    "waypoint"
  ]),
  templateId: z.string().min(1),
  resRef: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  localizedName: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  appearanceType: z.number().finite().optional(),
  genericType: z.number().finite().optional(),
  placeableBasicIdentity: areaPlaceableBasicIdentitySchema.optional(),
  placeableTrapType: areaPlaceableTrapTypeStorageSchema.optional(),
  placeableBodyBag: areaPlaceableBodyBagStorageSchema.optional(),
  placeablePortraitId: areaPlaceablePortraitIdStorageSchema.optional(),
  placeableFaction: areaPlaceableFactionStorageSchema.optional(),
  placeableVariables: areaPlaceableVariableProvenanceSchema.optional(),
  placeableTemplateResRef: z.string().regex(/^[a-z0-9_]{1,16}$/u).optional(),
  placeableLocalizedStrings: areaPlaceableLocalizedStringsSchema.optional(),
  creatureTag: areaCreatureTagStorageSchema.optional(),
  creatureConversation: areaCreatureConversationStorageSchema.optional(),
  creatureInterruptable: areaCreatureInterruptableStorageSchema.optional(),
  creatureAdvancedFlags: areaCreatureAdvancedFlagsStorageSchema.optional(),
  creatureBodyBag: areaCreatureBodyBagStorageSchema.optional(),
  creatureDecayTime: areaCreatureDecayTimeStorageSchema.optional(),
    creatureAppearance: areaCreatureAppearanceStorageSchema.optional(),
    creatureGender: areaCreatureGenderStorageSchema.optional(),
    creaturePerceptionRange: areaCreaturePerceptionRangeStorageSchema.optional(),
    creatureWalkRate: areaCreatureWalkRateStorageSchema.optional(),
    creatureSoundSetFile: areaCreatureSoundSetFileStorageSchema.optional(),
    creatureStartingPackage: areaCreatureStartingPackageStorageSchema.optional(),
    creatureSkillList: areaCreatureSkillListStorageSchema.optional(),
  creatureFeatList: areaCreatureFeatListStorageSchema.optional(),
  creatureSpecialAbilityList: areaCreatureSpecialAbilityListStorageSchema.optional(),
  creatureVariables: areaPlaceableVariableProvenanceSchema.optional(),
    creatureClassLevelState: areaCreatureClassLevelStateSchema.optional(),
    creatureClassIdentityState: areaCreatureClassIdentityStateSchema.optional(),
    creaturePhenotype: areaCreaturePhenotypeStorageSchema.optional(),
  creaturePortrait: areaCreaturePortraitStorageSchema.optional(),
  creatureChallengeRating: areaCreatureChallengeRatingStorageSchema.optional(),
  creatureAbilityScores: areaCreatureAbilityScoresStorageSchema.optional(),
  creatureAppearanceColors: areaCreatureAppearanceColorsStorageSchema.optional(),
  creatureBodyParts: areaCreatureBodyPartsStorageSchema.optional(),
  creatureAppendages: areaCreatureAppendagesStorageSchema.optional(),
  creatureHitPointState: areaCreatureHitPointStateSchema.optional(),
  creatureNaturalArmorClass: areaCreatureNaturalArmorClassStorageSchema.optional(),
  creatureSavingThrowBonuses: areaCreatureSavingThrowBonusesStorageSchema.optional(),
  creatureAlignment: areaCreatureAlignmentStorageSchema.optional(),
  creatureFaction: areaCreatureFactionStorageSchema.optional(),
  creatureTemplateResRef: areaCreatureTemplateResRefStorageSchema.optional(),
  creatureSpecialIdentityStrings: areaCreatureSpecialIdentityStringsStorageSchema.optional(),
  creatureScriptResRefs: areaCreatureScriptResRefsStorageSchema.optional(),
  creatureLocalizedStrings: areaCreatureNameLocalizedStringsSchema.optional(),
  creatureMetadata: z.record(areaCreatureMetadataPrimitiveSchema).optional(),
  placeableMetadata: z.record(areaCreatureMetadataPrimitiveSchema).optional(),
  itemMetadata: z.record(areaCreatureMetadataPrimitiveSchema).optional(),
  encounterMetadata: z.record(areaCreatureMetadataPrimitiveSchema).optional(),
  waypointMetadata: z.record(areaCreatureMetadataPrimitiveSchema).optional(),
  triggerMetadata: z.record(areaCreatureMetadataPrimitiveSchema).optional(),
  storeMetadata: areaStoreMetadataSchema.optional(),
  itemTag: areaObjectTagStorageSchema.optional(),
  triggerTag: areaObjectTagStorageSchema.optional(),
  triggerTemplateResRef: areaTriggerTemplateResRefStorageSchema.optional(),
  triggerLocalizedName: areaTriggerLocalizedNameSchema.optional(),
  triggerScriptResRefs: areaTriggerScriptResRefsStorageSchema.optional(),
  triggerTransitionStorage: areaDoorTransitionStorageSchema.optional(),
  triggerCoreProperties: areaTriggerCorePropertiesSchema.optional(),
  triggerTrapProperties: areaTriggerTrapPropertiesSchema.optional(),
  triggerVariables: areaPlaceableVariableProvenanceSchema.optional(),
  encounterTag: areaObjectTagStorageSchema.optional(),
  encounterTemplateResRef: areaEncounterTemplateResRefStorageSchema.optional(),
  waypointTag: areaObjectTagStorageSchema.optional(),
  waypointTemplateResRef: areaWaypointTemplateResRefStorageSchema.optional(),
  waypointLocalizedName: areaWaypointLocalizedNameSchema.optional(),
  waypointDescription: areaWaypointDescriptionSchema.optional(),
  waypointMapNote: areaWaypointMapNoteSchema.optional(),
  waypointAppearance: areaWaypointAppearanceSchema.optional(),
  waypointVariables: areaPlaceableVariableProvenanceSchema.optional(),
  encounterActive: areaSoundActiveStorageSchema.optional(),
  encounterPlayerOnly: areaEncounterPlayerOnlyStorageSchema.optional(),
  encounterReset: areaEncounterResetStorageSchema.optional(),
  encounterResetTime: areaEncounterResetTimeStorageSchema.optional(),
  encounterSpawnOption: areaEncounterSpawnOptionStorageSchema.optional(),
  encounterRespawns: areaEncounterRespawnsStorageSchema.optional(),
  encounterCreatureCounts: areaEncounterCreatureCountStorageSchema.optional(),
  encounterScriptResRefs: areaEncounterScriptResRefsStorageSchema.optional(),
  encounterFaction: areaEncounterFactionStorageSchema.optional(),
  encounterDifficulty: areaEncounterDifficultyStorageSchema.optional(),
  encounterLocalizedName: areaEncounterLocalizedNameSchema.optional(),
  encounterVariables: areaPlaceableVariableProvenanceSchema.optional(),
  encounterCreatureList: areaEncounterCreatureListProvenanceSchema.optional(),
  encounterSpawnPoints: areaEncounterSpawnPointListProvenanceSchema.optional(),
  itemTemplateResRef: areaItemTemplateResRefStorageSchema.optional(),
  itemInstanceState: areaItemInstanceStateSchema.optional(),
  itemLocalizedStrings: areaItemLocalizedStringsSchema.optional(),
  itemVariables: areaPlaceableVariableProvenanceSchema.optional(),
  itemPropertyList: areaItemPropertyListProvenanceSchema.optional(),
  itemInventoryItems: areaItemInventorySourceEntriesSchema.optional(),
  itemVisualTransform: areaItemVisualTransformStorageSchema.optional(),
  itemBaseAppearance: areaItemBaseAppearanceProvenanceSchema.optional(),
  isStatic: z.boolean().optional(),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  bearing: z.number().finite(),
  visualTransform: areaObjectVisualTransformSchema.optional(),
  soundPositioning: areaSoundPositioningSchema.optional(),
  soundIntervalVariation: areaSoundIntervalVariationStorageSchema.optional(),
  soundVolume: areaSoundVolumeStorageSchema.optional(),
  soundActive: areaSoundActiveStorageSchema.optional(),
  soundPlayOrder: areaSoundPlayOrderStorageSchema.optional(),
  soundPlayStyle: areaSoundPlayStyleStorageSchema.optional(),
  soundPlayback: areaSoundPlaybackStorageSchema.optional(),
  soundProfile: areaSoundProfileStorageSchema.optional(),
  soundSchedule: areaSoundScheduleStorageSchema.optional(),
  doorTransition: areaDoorTransitionSchema.optional()
}).superRefine((value, context) => {
  const editorComment = value.creatureMetadata?.editorComment;
  if (editorComment !== undefined &&
      (value.kind !== "creature" || !isCreatureEditorComment(editorComment))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["creatureMetadata", "editorComment"],
      message: "Malformed Creature editor-comment provenance.",
    });
  }
  const itemEditorComment = value.itemMetadata?.editorComment;
  if (itemEditorComment !== undefined &&
      (value.kind !== "item" || !isItemEditorComment(itemEditorComment))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemMetadata", "editorComment"],
      message: "Malformed Item editor-comment provenance.",
    });
  }
  const storeEditorComment = value.storeMetadata?.editorComment;
  if (storeEditorComment !== undefined &&
      (value.kind !== "store" || !isStoreEditorComment(storeEditorComment))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeMetadata", "editorComment"],
      message: "Malformed Store editor-comment provenance.",
    });
  }
  const encounterEditorComment = value.encounterMetadata?.editorComment;
  if (encounterEditorComment !== undefined &&
      (value.kind !== "encounter" || !isEncounterEditorComment(encounterEditorComment))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterMetadata", "editorComment"],
      message: "Malformed Encounter editor-comment provenance.",
    });
  }
  const waypointEditorComment = value.waypointMetadata?.editorComment;
  if (waypointEditorComment !== undefined &&
      (value.kind !== "waypoint" || !isWaypointEditorComment(waypointEditorComment))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["waypointMetadata", "editorComment"],
      message: "Malformed Waypoint editor-comment provenance.",
    });
  }
  const triggerEditorComment = value.triggerMetadata?.editorComment;
  if (triggerEditorComment !== undefined &&
      (value.kind !== "trigger" || !isTriggerEditorComment(triggerEditorComment))) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerMetadata", "editorComment"],
      message: "Malformed Trigger editor-comment provenance.",
    });
  }
  if (value.storeMetadata?.commerce !== undefined && value.kind !== "store") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeMetadata", "commerce"],
      message: "Store commerce provenance belongs only to Store placements.",
    });
  }
  if (value.storeMetadata?.scriptResRefs !== undefined && value.kind !== "store") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeMetadata", "scriptResRefs"],
      message: "Store script-ResRef provenance belongs only to Store placements.",
    });
  }
  if (value.storeMetadata?.variables !== undefined && value.kind !== "store") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeMetadata", "variables"],
      message: "Store VarTable provenance belongs only to Store placements.",
    });
  }
  if (value.storeMetadata?.restrictions !== undefined && value.kind !== "store") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeMetadata", "restrictions"],
      message: "Store restriction provenance belongs only to Store placements.",
    });
  }
  if (value.storeMetadata?.inventory !== undefined && value.kind !== "store") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["storeMetadata", "inventory"],
      message: "Store inventory provenance belongs only to Store placements.",
    });
  }
  if (value.itemInstanceState !== undefined && value.kind !== "item") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemInstanceState"],
      message: "Ground-item instance-state provenance belongs only to Item placements.",
    });
  }
  if (value.itemTag !== undefined && value.kind !== "item") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemTag"],
      message: "Ground-item Tag provenance belongs only to Item placements.",
    });
  }
  if (value.triggerTag !== undefined && value.kind !== "trigger") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerTag"],
      message: "Trigger Tag provenance belongs only to Trigger placements.",
    });
  }
  if (value.encounterTag !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterTag"],
      message: "Encounter Tag provenance belongs only to Encounter placements.",
    });
  }
  if (value.waypointTag !== undefined && value.kind !== "waypoint") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["waypointTag"],
      message: "Waypoint Tag provenance is only valid for Waypoint placements.",
    });
  }
  if (value.waypointTemplateResRef !== undefined && value.kind !== "waypoint") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["waypointTemplateResRef"],
      message: "Waypoint TemplateResRef provenance is only valid for Waypoint placements.",
    });
  }
  if (value.encounterTemplateResRef !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterTemplateResRef"],
      message: "Encounter TemplateResRef provenance is only valid for Encounter placements.",
    });
  }
  if (value.triggerTemplateResRef !== undefined && value.kind !== "trigger") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerTemplateResRef"],
      message: "Trigger TemplateResRef provenance is only valid for Trigger placements.",
    });
  }
  if (value.triggerLocalizedName !== undefined && value.kind !== "trigger") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerLocalizedName"],
      message: "Trigger LocalizedName storage is valid only for Trigger objects.",
    });
  }
  if (value.triggerScriptResRefs !== undefined && value.kind !== "trigger") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerScriptResRefs"],
      message: "Trigger script storage is valid only for Trigger objects.",
    });
  }
  if (value.triggerTransitionStorage !== undefined && value.kind !== "trigger") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerTransitionStorage"],
      message: "Trigger transition storage is valid only for Trigger objects.",
    });
  }
  if (value.triggerCoreProperties !== undefined && value.kind !== "trigger") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerCoreProperties"],
      message: "Trigger core properties are valid only for Trigger objects.",
    });
  }
  if (value.triggerTrapProperties !== undefined && value.kind !== "trigger") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerTrapProperties"],
      message: "Trigger trap properties are valid only for Trigger objects.",
    });
  }
  if (value.triggerVariables !== undefined && value.kind !== "trigger") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["triggerVariables"],
      message: "Trigger VarTable provenance is valid only for Trigger objects.",
    });
  }
  if (value.waypointLocalizedName !== undefined && value.kind !== "waypoint") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["waypointLocalizedName"],
      message: "Waypoint LocalizedName provenance is only valid for Waypoint placements.",
    });
  }
  if (value.waypointDescription !== undefined && value.kind !== "waypoint") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["waypointDescription"],
      message: "Waypoint Description provenance is only valid for Waypoint placements.",
    });
  }
  if (value.waypointMapNote !== undefined && value.kind !== "waypoint") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["waypointMapNote"],
      message: "Waypoint MapNote provenance is only valid for Waypoint placements.",
    });
  }
  if (value.waypointAppearance !== undefined && value.kind !== "waypoint") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["waypointAppearance"],
      message: "Waypoint Appearance provenance is only valid for Waypoint placements.",
    });
  }
  if (value.waypointVariables !== undefined && value.kind !== "waypoint") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["waypointVariables"],
      message: "Waypoint VarTable provenance is only valid for Waypoint placements.",
    });
  }
  if (value.encounterActive !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterActive"],
      message: "Encounter Active provenance belongs only to Encounter placements.",
    });
  }
  if (value.encounterPlayerOnly !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterPlayerOnly"],
      message: "Encounter PlayerOnly provenance belongs only to Encounter placements.",
    });
  }
  if (value.encounterReset !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterReset"],
      message: "Encounter Reset provenance belongs only to Encounter placements.",
    });
  }
  if (value.encounterResetTime !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterResetTime"],
      message: "Encounter ResetTime provenance belongs only to Encounter placements.",
    });
  }
  if (value.encounterSpawnOption !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterSpawnOption"],
      message: "Encounter SpawnOption provenance belongs only to Encounter placements.",
    });
  }
  if (value.encounterRespawns !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterRespawns"],
      message: "Encounter Respawns storage is valid only for Encounter objects.",
    });
  }
  if (value.encounterCreatureCounts !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterCreatureCounts"],
      message: "Encounter creature-count storage is valid only for Encounter objects.",
    });
  }
  if (value.encounterScriptResRefs !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterScriptResRefs"],
      message: "Encounter script storage is valid only for Encounter objects.",
    });
  }
  if (value.encounterFaction !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterFaction"],
      message: "Encounter Faction storage is valid only for Encounter objects.",
    });
  }
  if (value.encounterDifficulty !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterDifficulty"],
      message: "Encounter Difficulty storage is valid only for Encounter objects.",
    });
  }
  if (value.encounterLocalizedName !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterLocalizedName"],
      message: "Encounter LocalizedName storage is valid only for Encounter objects.",
    });
  }
  if (value.encounterVariables !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterVariables"],
      message: "Encounter VarTable provenance belongs only to Encounter placements.",
    });
  }
  if (value.encounterCreatureList !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterCreatureList"],
      message: "Encounter CreatureList provenance belongs only to Encounter placements.",
    });
  }
  if (value.encounterSpawnPoints !== undefined && value.kind !== "encounter") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["encounterSpawnPoints"],
      message: "Encounter SpawnPointList provenance belongs only to Encounter placements.",
    });
  }
  if (value.itemTemplateResRef !== undefined && value.kind !== "item") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemTemplateResRef"],
      message: "Ground-item TemplateResRef provenance belongs only to Item placements.",
    });
  }
  if (value.itemLocalizedStrings !== undefined && value.kind !== "item") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemLocalizedStrings"],
      message: "Ground-item localized-string provenance belongs only to Item placements.",
    });
  }
  if (value.itemVariables !== undefined && value.kind !== "item") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemVariables"],
      message: "Ground-item VarTable provenance belongs only to Item placements.",
    });
  }
  if (value.itemPropertyList !== undefined && value.kind !== "item") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemPropertyList"],
      message: "Ground-item PropertiesList provenance belongs only to Item placements.",
    });
  }
  if (value.itemInventoryItems !== undefined && value.kind !== "item") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemInventoryItems"],
      message: "Retained ground-item inventory provenance belongs only to Item placements.",
    });
  }
  if (value.itemVisualTransform !== undefined && value.kind !== "item") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemVisualTransform"],
      message: "Retained ground-item visual-transform provenance belongs only to Item placements.",
    });
  }
  if (value.itemBaseAppearance !== undefined && value.kind !== "item") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["itemBaseAppearance"],
      message: "Ground-item BaseItem/appearance provenance belongs only to Item placements.",
    });
  }
});

const auroraAreaVfxCollisionSchema = z
  .object({
    version: z.literal("aurora-area-vfx-collision/v1"),
    coordinateSpace: z.literal("aurora-area-z-up"),
    unitsPerTile: z.literal(10),
    status: z.enum(["ready", "partial", "unavailable"]),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/iu),
    resources: z.array(
      z.object({
        resourceId: z.string().min(1),
        modelResRef: z.string().min(1),
        sourceObjectKey: z.string().min(1),
        sourceLayer: z.enum(["module", "hak", "vanilla"]),
        sourceHash: z.string().regex(/^[a-f0-9]{64}$/iu),
        walkmesh: z.record(z.unknown())
      })
    ),
    instances: z.array(
      z.object({
        instanceId: z.string().min(1),
        resourceId: z.string().min(1),
        translation: z.object({
          x: z.number().finite(),
          y: z.number().finite(),
          z: z.number().finite()
        }),
        orientationQuarterTurns: z.number().int().min(0).max(3)
      })
    ),
    diagnostics: z.array(
      z.object({
        code: z.string().min(1),
        severity: z.enum(["info", "warn", "error"]),
        message: z.string().min(1),
        modelResRef: z.string().min(1).optional(),
        tileInstanceId: z.string().min(1).optional()
      })
    )
  })
  .transform((value) => value as AuroraAreaVfxCollisionContract);

const auroraWorldTimerSchema = z
  .object({
    version: z.literal("aurora-worldtimer/v1"),
    status: z.literal("ready"),
    source: z.literal("module-ifo"),
    sourceObjectKey: z.string().min(1),
    sourceHash: z.string().regex(/^[a-f0-9]{64}$/iu),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/iu),
    minutesPerHour: z.number().int().min(1).max(255),
    startHour: z.number().int().min(0).max(23),
    startTimeOfDayMs: z.number().int().nonnegative(),
    dayLengthMs: z.number().int().positive(),
    tickUnit: z.literal("milliseconds"),
    advanceMode: z.literal("scene-animation-delta")
  })
  .transform((value) => value as AuroraWorldTimerContract);

const areaEventScriptResRefSchema = z.string().regex(/^(?:|[a-z0-9_]{1,16})$/u);
const areaEventScriptsSchema = z.object({
  onEnter: areaEventScriptResRefSchema.optional(),
  onExit: areaEventScriptResRefSchema.optional(),
  onHeartbeat: areaEventScriptResRefSchema.optional(),
  onUserDefined: areaEventScriptResRefSchema.optional(),
}).strict().refine((value) => Object.keys(value).length > 0);
const editableAreaNameSchema = z.string().min(1).max(256).regex(/^[\x20-\x7e]+$/u)
  .refine((value) => value.trim().length > 0);
const editableAreaTagSchema = z.string().max(64).regex(/^[\x20-\x7e]*$/u);
const areaNameStorageProfileSchema = z.enum([
  "simple_inline_ascii",
  "multi_entry_inline_ascii",
]);
const areaNameStorageEntrySchema = z.object({
  languageId: z.number().int().min(0).max(0xffff_ffff),
  text: z.string().max(16_384).regex(/^[\x20-\x7e]*$/u),
}).strict();
const areaBasicIdentitySchema = z.object({
  name: editableAreaNameSchema.optional(),
  nameProfile: areaNameStorageProfileSchema.optional(),
  nameEntries: z.array(areaNameStorageEntrySchema).min(1).max(64).optional(),
  tag: editableAreaTagSchema.optional(),
}).strict().superRefine((value, context) => {
  if (Object.keys(value).length === 0) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Area basic identity is empty." });
    return;
  }
  if (value.nameProfile !== undefined && value.name === undefined) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["nameProfile"], message: "Name profile requires Name." });
  }
  if (value.nameEntries) {
    const identifiers = new Set(value.nameEntries.map((entry) => entry.languageId));
    const defaultEntry = value.nameEntries.find((entry) => entry.languageId === 0);
    const aggregate = value.nameEntries.reduce((sum, entry) => sum + entry.text.length, 0);
    const profile = value.nameEntries.length === 1
      ? "simple_inline_ascii"
      : "multi_entry_inline_ascii";
    if (
      identifiers.size !== value.nameEntries.length
      || !defaultEntry
      || defaultEntry.text !== value.name
      || value.nameProfile !== profile
      || aggregate > 65_536
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nameEntries"],
        message: "Area Name entries must be one complete ordered source profile.",
      });
    }
  }
});
const areaTerrainTypeFlagsSchema = z.object({
  interior: z.boolean(),
  natural: z.boolean(),
  subterranean: z.boolean(),
}).strict();
const areaAdvancedFlagsSchema = z.object({
  terrainType: areaTerrainTypeFlagsSchema.optional(),
  playerVsPlayer: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
  noRest: z.boolean().optional(),
  listenCheckModifier: z.number().int().min(-99).max(99).optional(),
  spotCheckModifier: z.number().int().min(-99).max(99).optional(),
  loadingScreenId: z.number().int().min(0).max(0xffff).optional(),
}).strict().refine((value) => Object.keys(value).length > 0);
const areaAudioEnvironmentSchema = z.object({
  ambientSoundDayId: z.number().int().min(0).max(0x7fff_ffff),
  ambientSoundNightId: z.number().int().min(0).max(0x7fff_ffff),
  ambientSoundDayVolume: z.number().int().min(0).max(127),
  ambientSoundNightVolume: z.number().int().min(0).max(127),
  environmentAudioId: z.number().int().min(0).max(0x7fff_ffff),
  musicBattleId: z.number().int().min(0).max(0x7fff_ffff),
  musicDayId: z.number().int().min(0).max(0x7fff_ffff),
  musicNightId: z.number().int().min(0).max(0x7fff_ffff),
  musicDelayMilliseconds: z.number().int().min(-99_000).max(99_000)
    .refine((value) => value % 1000 === 0),
}).strict();
const areaVisualEnvironmentSchema = z.custom<AreaVisualEnvironment>(
  isAreaVisualEnvironment,
  "Area visual environment must be one exact complete source-closed tuple.",
);
const areaVisualEnvironmentScalarControlsSchema = z.custom<AreaVisualEnvironmentScalarControls>(
  isAreaVisualEnvironmentScalarControls,
  "Area visual-environment scalar controls must be one exact source-closed pair.",
);
const areaVisualEnvironmentCatalogSelectionSchema = z.custom<AreaVisualEnvironmentCatalogSelection>(
  isAreaVisualEnvironmentCatalogSelection,
  "Area visual-environment catalog selection must be one exact retained Byte pair.",
);
const areaAudioEnvironmentCatalogsSchema = z.custom<EffectiveAreaAudioCatalogBundle>(
  isEffectiveAreaAudioCatalogBundle,
  "Effective Area audio catalogs must be one exact bounded all-or-nothing bundle.",
);
const areaVisualEnvironmentCatalogsSchema = z.custom<EffectiveAreaVisualEnvironmentCatalogBundle>(
  isEffectiveAreaVisualEnvironmentCatalogBundle,
  "Effective Area visual-environment catalogs must be one exact bounded all-or-nothing bundle.",
);
const areaLoadingScreenCatalogSchema = z.custom<EffectiveAreaLoadingScreenCatalog>(
  isEffectiveAreaLoadingScreenCatalog,
  "Effective Area loading-screen catalog must be one exact bounded physical-row catalog.",
);
const areaModuleStartLocationSchema = z.object({
  areaResRef: z.string().regex(/^[a-z0-9_]{1,16}$/u),
  x: z.number().finite(),
  y: z.number().finite(),
  z: z.number().finite(),
  directionX: z.number().finite(),
  directionY: z.number().finite(),
}).strict().refine((value) => [
  value.x, value.y, value.z, value.directionX, value.directionY,
].every((entry) => Number.isFinite(Math.fround(entry)) && Math.fround(entry) === entry));
const moduleStartLocationTargetsSchema = z.array(
  z.string().regex(/^[a-z0-9_]{1,16}$/u),
).min(1).max(4096).superRefine((value, context) => {
  const sorted = [...value].sort((left, right) => left.localeCompare(right));
  if (new Set(value).size !== value.length
      || value.some((entry, index) => entry !== sorted[index])) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Module start-location targets must be sorted and duplicate-free.",
    });
  }
});
const areaSourceResourcesSchema = z.object({
  areSha256: z.string().regex(/^[a-f0-9]{64}$/u),
  gitSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
  gicSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
  ifoSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
}).strict();

const areaDetailEnvelopeSchema = z.object({
  data: z.object({
    areaId: z.string().min(1),
    name: z.string().min(1),
    biome: z.string().min(1),
    width: z.number().finite().positive(),
    height: z.number().finite().positive(),
    tags: z.array(z.string()),
    comments: z.string().max(4096).refine(
      (value) => !value.includes("\0"),
      "Area Comments must not contain U+0000.",
    ).optional(),
    eventScripts: areaEventScriptsSchema.optional(),
    basicIdentity: areaBasicIdentitySchema.optional(),
    advancedFlags: areaAdvancedFlagsSchema.optional(),
    visualEnvironment: areaVisualEnvironmentSchema.optional(),
    visualEnvironmentScalarControls: areaVisualEnvironmentScalarControlsSchema.optional(),
    visualEnvironmentCatalogSelection: areaVisualEnvironmentCatalogSelectionSchema.optional(),
    variables: areaPlaceableVariableProvenanceSchema.optional(),
    audioEnvironment: areaAudioEnvironmentSchema.optional(),
    audioEnvironmentCatalogs: areaAudioEnvironmentCatalogsSchema.optional(),
    visualEnvironmentCatalogs: areaVisualEnvironmentCatalogsSchema.optional(),
    loadingScreenCatalog: areaLoadingScreenCatalogSchema.optional(),
    moduleStartLocation: areaModuleStartLocationSchema.optional(),
    moduleStartLocationTargets: moduleStartLocationTargetsSchema.optional(),
    benchmark: z.boolean(),
    previewImageUrl: z.string(),
    textureAtlas: areaTextureAtlasSchema,
    tileSet: z.string().min(1).optional(),
    tiles: z.array(areaTileInstanceSchema).default([]),
    auroraVfxCollision: auroraAreaVfxCollisionSchema.optional(),
    auroraWorldTimer: auroraWorldTimerSchema.optional(),
    lighting: areaGlobalLightingSchema.optional(),
    placeableTrapTypeCatalog: areaPlaceableTrapTypeCatalogSchema.optional(),
    placeableBodyBagCatalog: areaPlaceableBodyBagCatalogSchema.optional(),
    placeablePortraitCatalog: areaPlaceablePortraitCatalogSchema.optional(),
    creaturePortraitCatalog: areaCreaturePortraitCatalogSchema.optional(),
    itemBaseItemCatalog: areaItemBaseItemCatalogSchema.optional(),
    placeableFactionCatalog: areaPlaceableFactionCatalogSchema.optional(),
    encounterDifficultyCatalog: areaEncounterDifficultyCatalogSchema.optional(),
    composition: areaObjectCountsSchema,
    updatedAt: z.string().min(1),
    objects: z.array(areaObjectSchema),
    sourceResources: areaSourceResourcesSchema.optional(),
  })
});

const areaProcessedAreaSchema = areaDetailEnvelopeSchema.shape.data.extend({
  processedAt: z.string().min(1)
});

const areaProcessEnvelopeSchema = z.object({
  data: z.object({
    cache: z.object({
      key: z.string().min(1),
      hit: z.boolean(),
      storedAt: z.string().min(1),
      hits: z.number().int().nonnegative()
    }),
    area: areaProcessedAreaSchema
  })
});

const areaTextureDeliveryContractSchema = z.object({
  mode: z.enum(["proxy", "direct"]),
  atlasId: z.string().min(1),
  objectKey: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  etag: z.string().optional(),
  proxyPath: z.string().min(1),
  proxyUrl: z.string().min(1),
  directUrl: z.string().optional(),
  s3Url: z.string().optional()
});

const areaTextureDeliveryEnvelopeSchema = z.object({
  data: z.object({
    cacheKey: z.string().min(1),
    textureAtlas: areaTextureDeliveryContractSchema
  })
});

type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function resolveBaseUrl(): string {
  const candidate = import.meta.env.VITE_BACKEND_API_BASE_URL as string | undefined;
  if (!candidate || candidate.trim().length === 0) {
    return import.meta.env.DEV ? "/_aurora/v1" : "/api/v1";
  }
  return candidate.replace(/\/+$/u, "");
}

function toQueryString(query?: AreaApiListQuery): string {
  if (!query) {
    return "";
  }
  const search = new URLSearchParams();
  if (query.query) {
    search.set("query", query.query);
  }
  if (query.biome) {
    search.set("biome", query.biome);
  }
  if (query.tag) {
    search.set("tag", query.tag);
  }
  if (typeof query.benchmark === "boolean") {
    search.set("benchmark", String(query.benchmark));
  }
  if (typeof query.limit === "number") {
    search.set("limit", String(query.limit));
  }
  if (typeof query.offset === "number") {
    search.set("offset", String(query.offset));
  }
  const value = search.toString();
  return value.length > 0 ? `?${value}` : "";
}

async function parseResponseOrThrow(response: Response): Promise<unknown> {
  const payload = await response.json().catch(() => null);
  if (response.ok) {
    return payload;
  }

  const code =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "code" in payload.error &&
    typeof payload.error.code === "string"
      ? payload.error.code
      : null;

  const message =
    typeof payload === "object" &&
    payload !== null &&
    "error" in payload &&
    typeof payload.error === "object" &&
    payload.error !== null &&
    "message" in payload.error &&
    typeof payload.error.message === "string"
      ? payload.error.message
      : `Backend request failed with status ${response.status}.`;

  throw new AreaApiRequestError(message, response.status, code);
}

async function parseBinaryResponseOrThrow(response: Response): Promise<AreaApiBinaryExportResult> {
  if (!response.ok) {
    await parseResponseOrThrow(response);
  }
  const bytes = await response.arrayBuffer();
  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const contentLength = Number(response.headers.get("content-length"));
  const itemCount = Number(response.headers.get("x-aurora-area-item-count"));
  const objectCount = Number(response.headers.get("x-aurora-area-object-count"));
  const tileCount = Number(response.headers.get("x-aurora-area-tile-count"));
  return {
    bytes,
    contentType,
    sizeBytes: Number.isFinite(contentLength) ? contentLength : bytes.byteLength,
    fileName: readContentDispositionFileName(response.headers.get("content-disposition")),
    itemCount: Number.isFinite(itemCount) ? itemCount : undefined,
    objectCount: Number.isFinite(objectCount) ? objectCount : undefined,
    tileCount: Number.isFinite(tileCount) ? tileCount : undefined
  };
}

function readContentDispositionFileName(value: string | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const match = /filename="([^"]+)"/u.exec(value) ?? /filename=([^;]+)/u.exec(value);
  return match?.[1]?.trim();
}

function mapListItem(input: z.infer<typeof areaListItemSchema>): AreaApiListItem {
  return {
    areaId: input.areaId,
    name: input.name,
    biome: input.biome,
    width: input.width,
    height: input.height,
    tags: input.tags,
    benchmark: input.benchmark,
    previewImageUrl: input.previewImageUrl,
    textureAtlasId: input.textureAtlasId,
    objectCounts: input.objectCounts,
    updatedAt: input.updatedAt
  };
}

function mapAreaObject(
  input: z.infer<typeof areaObjectSchema>
): AreaApiObjectPlacement {
  return {
    objectId: input.objectId,
    ...(input.sourceIndex !== undefined ? { sourceIndex: input.sourceIndex } : {}),
    kind: input.kind,
    templateId: input.templateId,
    resRef: input.resRef,
    tag: input.tag,
    localizedName: input.localizedName,
    description: input.description,
    appearanceType: input.appearanceType,
    genericType: input.genericType,
    ...(input.placeableBasicIdentity
      ? {
          placeableBasicIdentity: {
            tag: { ...input.placeableBasicIdentity.tag },
            appearance: input.placeableBasicIdentity.appearance.present &&
              input.placeableBasicIdentity.appearance.nativeType === "dword" &&
              input.placeableBasicIdentity.appearance.table
              ? {
                  ...input.placeableBasicIdentity.appearance,
                  table: { ...input.placeableBasicIdentity.appearance.table }
                }
              : { ...input.placeableBasicIdentity.appearance }
          }
        }
      : {}),
    ...(input.placeableTrapType
      ? { placeableTrapType: { ...input.placeableTrapType } }
      : {}),
    ...(input.placeableBodyBag
      ? { placeableBodyBag: { ...input.placeableBodyBag } }
      : {}),
    ...(input.placeablePortraitId
      ? { placeablePortraitId: { ...input.placeablePortraitId } }
      : {}),
    ...(input.placeableFaction
      ? { placeableFaction: { ...input.placeableFaction } }
      : {}),
    ...(input.placeableVariables
      ? {
          placeableVariables: {
            expectedEntries: input.placeableVariables.expectedEntries.map((entry) => ({ ...entry })),
          },
        }
      : {}),
    ...(input.placeableTemplateResRef
      ? { placeableTemplateResRef: input.placeableTemplateResRef }
      : {}),
    ...(input.placeableLocalizedStrings
      ? {
          placeableLocalizedStrings: {
            locName: input.placeableLocalizedStrings.locName.present
              ? {
                  ...input.placeableLocalizedStrings.locName,
                  entries: input.placeableLocalizedStrings.locName.entries.map((entry) => ({
                    ...entry
                  }))
                }
              : { present: false },
            description: input.placeableLocalizedStrings.description.present
              ? {
                  ...input.placeableLocalizedStrings.description,
                  entries: input.placeableLocalizedStrings.description.entries.map((entry) => ({
                    ...entry
                  }))
                }
              : { present: false }
          }
        }
      : {}),
    ...(input.creatureTag
      ? { creatureTag: { ...input.creatureTag } }
      : {}),
    ...(input.creatureConversation
      ? { creatureConversation: { ...input.creatureConversation } }
      : {}),
    ...(input.creatureInterruptable
      ? { creatureInterruptable: { ...input.creatureInterruptable } }
      : {}),
    ...(input.creatureAdvancedFlags
      ? {
          creatureAdvancedFlags: {
            disarmable: { ...input.creatureAdvancedFlags.disarmable },
            plot: { ...input.creatureAdvancedFlags.plot },
            immortal: { ...input.creatureAdvancedFlags.immortal },
            lootable: { ...input.creatureAdvancedFlags.lootable },
            noPermanentDeath: { ...input.creatureAdvancedFlags.noPermanentDeath },
          },
        }
      : {}),
    ...(input.creatureBodyBag
      ? { creatureBodyBag: { ...input.creatureBodyBag } }
      : {}),
    ...(input.creatureDecayTime
      ? { creatureDecayTime: { ...input.creatureDecayTime } }
      : {}),
    ...(input.creatureAppearance
      ? {
          creatureAppearance: input.creatureAppearance.present && input.creatureAppearance.table
            ? { ...input.creatureAppearance, table: { ...input.creatureAppearance.table } }
            : { ...input.creatureAppearance },
        }
      : {}),
    ...(input.creatureGender
      ? {
          creatureGender: input.creatureGender.present && input.creatureGender.table
            ? { ...input.creatureGender, table: { ...input.creatureGender.table } }
            : { ...input.creatureGender },
        }
        : {}),
    ...(input.creaturePerceptionRange
      ? {
          creaturePerceptionRange: input.creaturePerceptionRange.present &&
            input.creaturePerceptionRange.table
            ? {
                ...input.creaturePerceptionRange,
                table: { ...input.creaturePerceptionRange.table },
              }
            : { ...input.creaturePerceptionRange },
        }
      : {}),
    ...(input.creatureWalkRate
      ? {
          creatureWalkRate: input.creatureWalkRate.present && input.creatureWalkRate.table
            ? { ...input.creatureWalkRate, table: { ...input.creatureWalkRate.table } }
            : { ...input.creatureWalkRate },
        }
      : {}),
    ...(input.creatureSoundSetFile
      ? {
          creatureSoundSetFile: input.creatureSoundSetFile.present &&
            input.creatureSoundSetFile.table
            ? {
                ...input.creatureSoundSetFile,
                table: { ...input.creatureSoundSetFile.table },
              }
            : { ...input.creatureSoundSetFile },
        }
      : {}),
    ...(input.creatureStartingPackage
      ? {
          creatureStartingPackage: input.creatureStartingPackage.present
            ? {
                ...input.creatureStartingPackage,
                ...("classIds" in input.creatureStartingPackage
                  ? { classIds: [...input.creatureStartingPackage.classIds] }
                  : {}),
                ...("table" in input.creatureStartingPackage
                  ? { table: { ...input.creatureStartingPackage.table } }
                  : {}),
              }
            : { ...input.creatureStartingPackage },
        }
      : {}),
    ...(input.creatureSkillList
      ? {
          creatureSkillList: input.creatureSkillList.present
            ? {
                ...input.creatureSkillList,
                ranks: [...input.creatureSkillList.ranks],
                opaqueSiblingFieldCounts: [
                  ...input.creatureSkillList.opaqueSiblingFieldCounts,
                ],
                ...("table" in input.creatureSkillList
                  ? { table: { ...input.creatureSkillList.table } }
                  : {}),
              }
            : { ...input.creatureSkillList },
        }
      : {}),
    ...(input.creatureFeatList
      ? {
          creatureFeatList: input.creatureFeatList.present
            ? {
                ...input.creatureFeatList,
                featIds: [...input.creatureFeatList.featIds],
                opaqueSiblingFieldCounts: [
                  ...input.creatureFeatList.opaqueSiblingFieldCounts,
                ],
                ...("table" in input.creatureFeatList
                  ? { table: { ...input.creatureFeatList.table } }
                  : {}),
              }
            : { ...input.creatureFeatList },
        }
      : {}),
    ...(input.creatureSpecialAbilityList
      ? {
          creatureSpecialAbilityList: input.creatureSpecialAbilityList.present
            ? {
                ...input.creatureSpecialAbilityList,
                entries: input.creatureSpecialAbilityList.entries.map((entry) => ({ ...entry })),
                ...("table" in input.creatureSpecialAbilityList
                  ? { table: { ...input.creatureSpecialAbilityList.table } }
                  : {}),
              }
            : { ...input.creatureSpecialAbilityList },
        }
      : {}),
    ...(input.creatureVariables
      ? {
          creatureVariables: {
            expectedEntries: input.creatureVariables.expectedEntries.map((entry) => ({ ...entry })),
          },
        }
      : {}),
    ...(input.creatureClassLevelState
      ? {
          creatureClassLevelState: input.creatureClassLevelState.present
            ? {
                ...input.creatureClassLevelState,
                entries: input.creatureClassLevelState.entries.map((entry) => ({ ...entry })),
              }
            : { present: false },
        }
      : {}),
    ...(input.creatureClassIdentityState
      ? {
          creatureClassIdentityState: input.creatureClassIdentityState.present
            ? {
                ...input.creatureClassIdentityState,
                entries: input.creatureClassIdentityState.entries.map((entry) => ({ ...entry })),
                ...("classesTable" in input.creatureClassIdentityState
                  ? { classesTable: { ...input.creatureClassIdentityState.classesTable } }
                  : {}),
              }
            : { present: false },
        }
      : {}),
    ...(input.creaturePhenotype
      ? {
          creaturePhenotype: input.creaturePhenotype.present && input.creaturePhenotype.table
            ? { ...input.creaturePhenotype, table: { ...input.creaturePhenotype.table } }
            : { ...input.creaturePhenotype },
        }
      : {}),
    ...(input.creaturePortrait
      ? {
          creaturePortrait: input.creaturePortrait.present
            ? {
                ...input.creaturePortrait,
                ...(input.creaturePortrait.selectorContext
                  ? { selectorContext: { ...input.creaturePortrait.selectorContext } }
                  : {}),
                ...(input.creaturePortrait.table
                  ? { table: { ...input.creaturePortrait.table } }
                  : {}),
              }
            : { ...input.creaturePortrait },
        }
      : {}),
    ...(input.creatureChallengeRating
      ? { creatureChallengeRating: { ...input.creatureChallengeRating } }
      : {}),
    ...(input.creatureAbilityScores
      ? {
          creatureAbilityScores: {
            strength: { ...input.creatureAbilityScores.strength },
            dexterity: { ...input.creatureAbilityScores.dexterity },
            constitution: { ...input.creatureAbilityScores.constitution },
            intelligence: { ...input.creatureAbilityScores.intelligence },
            wisdom: { ...input.creatureAbilityScores.wisdom },
            charisma: { ...input.creatureAbilityScores.charisma },
          },
        }
      : {}),
    ...(input.creatureAppearanceColors
      ? {
          creatureAppearanceColors: {
            skin: { ...input.creatureAppearanceColors.skin },
            hair: { ...input.creatureAppearanceColors.hair },
            tattoo1: { ...input.creatureAppearanceColors.tattoo1 },
            tattoo2: { ...input.creatureAppearanceColors.tattoo2 },
          },
        }
      : {}),
    ...(input.creatureBodyParts
      ? {
          creatureBodyParts: Object.fromEntries(
            Object.entries(input.creatureBodyParts).map(([key, storage]) => [
              key,
              storage.present
                ? {
                    ...storage,
                    legacyByte: { ...storage.legacyByte },
                    wideWord: { ...storage.wideWord },
                  }
                : { ...storage },
            ]),
          ) as unknown as NonNullable<AreaApiObjectPlacement["creatureBodyParts"]>,
        }
      : {}),
    ...(input.creatureAppendages
      ? {
          creatureAppendages: Object.fromEntries(
            Object.entries(input.creatureAppendages).map(([key, storage]) => [
              key,
              storage.present
                ? {
                    ...storage,
                    modernDword: storage.modernDword.present && storage.modernDword.table
                      ? {
                          ...storage.modernDword,
                          table: { ...storage.modernDword.table },
                        }
                      : { ...storage.modernDword },
                    legacyByte: { ...storage.legacyByte },
                  }
                : { ...storage },
            ]),
          ) as unknown as NonNullable<AreaApiObjectPlacement["creatureAppendages"]>,
        }
      : {}),
    ...(input.creatureHitPointState
      ? {
          creatureHitPointState: input.creatureHitPointState.present
            ? {
                ...input.creatureHitPointState,
                hitPoints: { ...input.creatureHitPointState.hitPoints },
                currentHitPoints: { ...input.creatureHitPointState.currentHitPoints },
                maxHitPoints: { ...input.creatureHitPointState.maxHitPoints },
                constitution: { ...input.creatureHitPointState.constitution },
                race: { ...input.creatureHitPointState.race },
                classLevels: [...input.creatureHitPointState.classLevels],
                ...(input.creatureHitPointState.racialTypes
                  ? { racialTypes: { ...input.creatureHitPointState.racialTypes } }
                  : {}),
              }
            : { present: false },
        }
      : {}),
    ...(input.creatureNaturalArmorClass
      ? { creatureNaturalArmorClass: { ...input.creatureNaturalArmorClass } }
      : {}),
    ...(input.creatureSavingThrowBonuses
      ? {
          creatureSavingThrowBonuses: {
            fortitude: { ...input.creatureSavingThrowBonuses.fortitude },
            reflex: { ...input.creatureSavingThrowBonuses.reflex },
            will: { ...input.creatureSavingThrowBonuses.will },
          },
        }
      : {}),
    ...(input.creatureAlignment
      ? {
          creatureAlignment: {
            goodEvil: { ...input.creatureAlignment.goodEvil },
            lawfulChaotic: { ...input.creatureAlignment.lawfulChaotic },
          },
        }
      : {}),
    ...(input.creatureFaction
      ? { creatureFaction: { ...input.creatureFaction } }
      : {}),
    ...(input.creatureTemplateResRef
      ? { creatureTemplateResRef: { ...input.creatureTemplateResRef } }
      : {}),
    ...(input.creatureSpecialIdentityStrings
      ? {
          creatureSpecialIdentityStrings: {
            subrace: { ...input.creatureSpecialIdentityStrings.subrace },
            deity: { ...input.creatureSpecialIdentityStrings.deity },
          },
        }
      : {}),
    ...(input.creatureScriptResRefs
      ? {
          creatureScriptResRefs: {
            onHeartbeat: { ...input.creatureScriptResRefs.onHeartbeat },
            onPerception: { ...input.creatureScriptResRefs.onPerception },
            onSpellCastAt: { ...input.creatureScriptResRefs.onSpellCastAt },
            onPhysicalAttacked: { ...input.creatureScriptResRefs.onPhysicalAttacked },
            onDamaged: { ...input.creatureScriptResRefs.onDamaged },
            onDisturbed: { ...input.creatureScriptResRefs.onDisturbed },
            onCombatRoundEnd: { ...input.creatureScriptResRefs.onCombatRoundEnd },
            onConversation: { ...input.creatureScriptResRefs.onConversation },
            onSpawn: { ...input.creatureScriptResRefs.onSpawn },
            onRested: { ...input.creatureScriptResRefs.onRested },
            onDeath: { ...input.creatureScriptResRefs.onDeath },
            onUserDefined: { ...input.creatureScriptResRefs.onUserDefined },
            onBlocked: { ...input.creatureScriptResRefs.onBlocked },
          },
        }
      : {}),
    ...(input.creatureLocalizedStrings
      ? {
          creatureLocalizedStrings: {
            firstName: cloneNativeLocalizedStringStorage(
              input.creatureLocalizedStrings.firstName,
            ) as AreaApiNativeLocalizedStringStorage,
            lastName: cloneNativeLocalizedStringStorage(
              input.creatureLocalizedStrings.lastName,
            ) as AreaApiNativeLocalizedStringStorage,
            ...(input.creatureLocalizedStrings.description
              ? {
                  description: cloneNativeLocalizedStringStorage(
                    input.creatureLocalizedStrings.description,
                  ) as AreaApiNativeLocalizedStringStorage,
                }
              : {}),
          },
        }
      : {}),
    creatureMetadata: input.creatureMetadata ? { ...input.creatureMetadata } : undefined,
    placeableMetadata: input.placeableMetadata ? { ...input.placeableMetadata } : undefined,
    itemMetadata: input.itemMetadata ? { ...input.itemMetadata } : undefined,
    storeMetadata: input.storeMetadata
      ? {
          ...input.storeMetadata,
          ...(input.storeMetadata.commerce
            ? { commerce: cloneAreaStoreCommerceValue(input.storeMetadata.commerce) }
            : {}),
          ...(input.storeMetadata.scriptResRefs
            ? {
                scriptResRefs: cloneAreaStoreScriptResRefsValue(
                  input.storeMetadata.scriptResRefs,
                ),
              }
            : {}),
          ...(input.storeMetadata.variables
            ? {
                variables: {
                  expectedEntries: input.storeMetadata.variables.expectedEntries.map(
                    (entry) => ({ ...entry }),
                  ),
                },
              }
            : {}),
          ...(input.storeMetadata.restrictions
            ? {
                restrictions: cloneStoreRestrictionsProvenance(
                  input.storeMetadata.restrictions,
                ),
              }
            : {}),
          ...(input.storeMetadata.inventory
            ? {
                inventory: cloneStoreInventoryProvenance(
                  input.storeMetadata.inventory,
                ),
              }
            : {}),
        }
      : undefined,
    itemTag: input.itemTag ? { ...input.itemTag } : undefined,
    triggerTag: input.triggerTag ? { ...input.triggerTag } : undefined,
    triggerTemplateResRef: input.triggerTemplateResRef
      ? { ...input.triggerTemplateResRef }
      : undefined,
    triggerLocalizedName: input.triggerLocalizedName
      ? cloneNativeLocalizedStringStorage(input.triggerLocalizedName)
      : undefined,
    triggerScriptResRefs: input.triggerScriptResRefs
      ? { ...input.triggerScriptResRefs }
      : undefined,
    triggerTransitionStorage: input.triggerTransitionStorage
      ? { ...input.triggerTransitionStorage }
      : undefined,
    triggerCoreProperties: input.triggerCoreProperties
      ? { ...input.triggerCoreProperties }
      : undefined,
    triggerTrapProperties: input.triggerTrapProperties
      ? { ...input.triggerTrapProperties }
      : undefined,
    triggerVariables: input.triggerVariables
      ? {
          expectedEntries: input.triggerVariables.expectedEntries.map((entry) => ({ ...entry })),
        }
      : undefined,
    encounterTag: input.encounterTag ? { ...input.encounterTag } : undefined,
    encounterTemplateResRef: input.encounterTemplateResRef
      ? { ...input.encounterTemplateResRef }
      : undefined,
    waypointTag: input.waypointTag ? { ...input.waypointTag } : undefined,
    waypointTemplateResRef: input.waypointTemplateResRef
      ? { ...input.waypointTemplateResRef }
      : undefined,
    waypointLocalizedName: input.waypointLocalizedName
      ? cloneNativeLocalizedStringStorage(input.waypointLocalizedName)
      : undefined,
    waypointDescription: input.waypointDescription
      ? cloneNativeLocalizedStringStorage(input.waypointDescription)
      : undefined,
    waypointMapNote: input.waypointMapNote
      ? {
          hasMapNoteByte: input.waypointMapNote.hasMapNoteByte,
          mapNoteStorage: cloneNativeLocalizedStringStorage(
            input.waypointMapNote.mapNoteStorage,
          ),
          mapNoteEnabledByte: input.waypointMapNote.mapNoteEnabledByte,
        }
      : undefined,
    waypointAppearance: input.waypointAppearance
      ? {
          ...input.waypointAppearance,
          table: { ...input.waypointAppearance.table },
        }
      : undefined,
    waypointVariables: input.waypointVariables
      ? {
          expectedEntries: input.waypointVariables.expectedEntries.map((entry) => ({ ...entry })),
        }
      : undefined,
    encounterActive: input.encounterActive ? { ...input.encounterActive } : undefined,
    encounterPlayerOnly: input.encounterPlayerOnly
      ? { ...input.encounterPlayerOnly }
      : undefined,
    encounterReset: input.encounterReset ? { ...input.encounterReset } : undefined,
    encounterResetTime: input.encounterResetTime
      ? { ...input.encounterResetTime }
      : undefined,
    encounterSpawnOption: input.encounterSpawnOption
      ? { ...input.encounterSpawnOption }
      : undefined,
    encounterRespawns: input.encounterRespawns
      ? { ...input.encounterRespawns }
      : undefined,
    encounterCreatureCounts: input.encounterCreatureCounts
      ? { ...input.encounterCreatureCounts }
      : undefined,
    encounterScriptResRefs: input.encounterScriptResRefs
      ? { ...input.encounterScriptResRefs }
      : undefined,
    encounterFaction: input.encounterFaction
      ? { ...input.encounterFaction }
      : undefined,
    encounterDifficulty: input.encounterDifficulty
      ? {
          difficulty: { ...input.encounterDifficulty.difficulty },
          difficultyIndex: { ...input.encounterDifficulty.difficultyIndex },
        }
      : undefined,
    encounterLocalizedName: input.encounterLocalizedName
      ? cloneNativeLocalizedStringStorage(input.encounterLocalizedName)
      : undefined,
    encounterVariables: input.encounterVariables
      ? {
          expectedEntries: input.encounterVariables.expectedEntries.map((entry) => ({ ...entry })),
        }
      : undefined,
    encounterCreatureList: input.encounterCreatureList
      ? {
          expectedEntries: input.encounterCreatureList.expectedEntries.map(
            (entry) => ({ ...entry }),
          ),
        }
      : undefined,
    encounterSpawnPoints: input.encounterSpawnPoints
      ? {
          expectedEntries: input.encounterSpawnPoints.expectedEntries.map(
            (entry) => ({ ...entry }),
          ),
        }
      : undefined,
    encounterMetadata: input.encounterMetadata
      ? { ...input.encounterMetadata }
      : undefined,
    waypointMetadata: input.waypointMetadata
      ? { ...input.waypointMetadata }
      : undefined,
    triggerMetadata: input.triggerMetadata
      ? { ...input.triggerMetadata }
      : undefined,
    itemTemplateResRef: input.itemTemplateResRef
      ? { ...input.itemTemplateResRef }
      : undefined,
    itemInstanceState: input.itemInstanceState
      ? cloneItemInstanceStateStorage(input.itemInstanceState)
      : undefined,
    itemLocalizedStrings: input.itemLocalizedStrings
      ? {
          localizedName: cloneNativeLocalizedStringStorage(
            input.itemLocalizedStrings.localizedName,
          ) as AreaApiNativeLocalizedStringStorage,
          description: cloneNativeLocalizedStringStorage(
            input.itemLocalizedStrings.description,
          ) as AreaApiNativeLocalizedStringStorage,
          identifiedDescription: cloneNativeLocalizedStringStorage(
            input.itemLocalizedStrings.identifiedDescription,
          ) as AreaApiNativeLocalizedStringStorage,
        }
      : undefined,
    itemVariables: input.itemVariables
      ? {
          expectedEntries: input.itemVariables.expectedEntries.map((entry) => ({ ...entry })),
        }
      : undefined,
    itemPropertyList: input.itemPropertyList
      ? {
          present: input.itemPropertyList.present,
          expectedEntries: input.itemPropertyList.expectedEntries.map((entry) => ({ ...entry })),
        }
      : undefined,
    itemInventoryItems: input.itemInventoryItems
      ? input.itemInventoryItems.map((entry) => ({ ...entry }))
      : undefined,
    itemVisualTransform: input.itemVisualTransform
      ? cloneItemVisualTransformStorage(input.itemVisualTransform)
      : undefined,
    itemBaseAppearance: input.itemBaseAppearance
      ? cloneItemBaseAppearanceProvenance(input.itemBaseAppearance)
      : undefined,
    ...(input.isStatic !== undefined ? { isStatic: input.isStatic } : {}),
    x: input.x,
    y: input.y,
    z: input.z,
    bearing: input.bearing,
    visualTransform: input.visualTransform ? { ...input.visualTransform } : undefined,
    soundPositioning: input.soundPositioning,
    soundIntervalVariation: input.soundIntervalVariation
      ? { ...input.soundIntervalVariation }
      : undefined,
    soundVolume: input.soundVolume ? { ...input.soundVolume } : undefined,
    soundActive: input.soundActive ? { ...input.soundActive } : undefined,
    soundPlayOrder: input.soundPlayOrder ? { ...input.soundPlayOrder } : undefined,
    soundPlayStyle: input.soundPlayStyle ? { ...input.soundPlayStyle } : undefined,
    soundPlayback: input.soundPlayback
      ? { ...input.soundPlayback, sounds: [...input.soundPlayback.sounds] }
      : undefined,
    soundProfile: input.soundProfile
      ? { ...input.soundProfile, sounds: [...input.soundProfile.sounds] }
      : undefined,
    soundSchedule: input.soundSchedule ? { ...input.soundSchedule } : undefined,
    doorTransition: input.doorTransition
      ? {
          ...input.doorTransition,
          flags: { ...input.doorTransition.flags },
          ...(input.doorTransition.storage
            ? { storage: { ...input.doorTransition.storage } }
            : {}),
          ...(input.doorTransition.extra ? { extra: { ...input.doorTransition.extra } } : {})
        }
      : undefined
  };
}

function mapAreaDetail(input: z.infer<typeof areaDetailEnvelopeSchema>["data"]): AreaApiDetail {
  return {
    areaId: input.areaId,
    name: input.name,
    biome: input.biome,
    width: input.width,
    height: input.height,
    tags: input.tags,
    ...(input.comments !== undefined ? { comments: input.comments } : {}),
    ...(input.eventScripts !== undefined
      ? { eventScripts: { ...input.eventScripts } }
      : {}),
    ...(input.basicIdentity !== undefined
      ? {
          basicIdentity: {
            ...input.basicIdentity,
            ...(input.basicIdentity.nameEntries
              ? { nameEntries: input.basicIdentity.nameEntries.map((entry) => ({ ...entry })) }
              : {}),
          },
        }
      : {}),
    ...(input.advancedFlags !== undefined
      ? {
          advancedFlags: {
            ...input.advancedFlags,
            ...(input.advancedFlags.terrainType
              ? { terrainType: { ...input.advancedFlags.terrainType } }
              : {}),
          },
        }
      : {}),
    ...(input.visualEnvironment
      ? { visualEnvironment: cloneAreaVisualEnvironment(input.visualEnvironment) }
      : {}),
    ...(input.visualEnvironmentScalarControls
      ? {
          visualEnvironmentScalarControls: cloneAreaVisualEnvironmentScalarControls(
            input.visualEnvironmentScalarControls,
          ),
        }
      : {}),
    ...(input.visualEnvironmentCatalogSelection
      ? {
          visualEnvironmentCatalogSelection: cloneAreaVisualEnvironmentCatalogSelection(
            input.visualEnvironmentCatalogSelection,
          ),
        }
      : {}),
    ...(input.moduleStartLocation
      ? { moduleStartLocation: { ...input.moduleStartLocation } }
      : {}),
    ...(input.moduleStartLocationTargets
      ? { moduleStartLocationTargets: [...input.moduleStartLocationTargets] }
      : {}),
    ...(input.audioEnvironment
      ? { audioEnvironment: { ...input.audioEnvironment } }
      : {}),
    ...(input.variables
      ? {
          variables: {
            expectedEntries: input.variables.expectedEntries.map((entry) => ({ ...entry })),
          },
        }
      : {}),
    ...(input.audioEnvironmentCatalogs
      ? {
          audioEnvironmentCatalogs: cloneEffectiveAreaAudioCatalogBundle(
            input.audioEnvironmentCatalogs,
          ),
        }
      : {}),
    ...(input.visualEnvironmentCatalogs
      ? {
          visualEnvironmentCatalogs: cloneEffectiveAreaVisualEnvironmentCatalogBundle(
            input.visualEnvironmentCatalogs,
          ),
        }
      : {}),
    ...(input.loadingScreenCatalog
      ? {
          loadingScreenCatalog: cloneEffectiveAreaLoadingScreenCatalog(
            input.loadingScreenCatalog,
          ),
        }
      : {}),
    benchmark: input.benchmark,
    previewImageUrl: input.previewImageUrl,
    textureAtlas: input.textureAtlas,
    tileSet: input.tileSet,
    tiles: input.tiles,
    auroraVfxCollision: input.auroraVfxCollision,
    auroraWorldTimer: input.auroraWorldTimer,
    lighting: input.lighting,
    ...(input.placeableTrapTypeCatalog
      ? {
          placeableTrapTypeCatalog: {
            descriptor: { ...input.placeableTrapTypeCatalog.descriptor },
            rows: input.placeableTrapTypeCatalog.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(input.placeableBodyBagCatalog
      ? {
          placeableBodyBagCatalog: {
            descriptor: { ...input.placeableBodyBagCatalog.descriptor },
            rows: input.placeableBodyBagCatalog.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(input.placeablePortraitCatalog
      ? {
          placeablePortraitCatalog: {
            descriptor: { ...input.placeablePortraitCatalog.descriptor },
            rows: input.placeablePortraitCatalog.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(input.creaturePortraitCatalog
      ? {
          creaturePortraitCatalog: {
            descriptor: { ...input.creaturePortraitCatalog.descriptor },
            rows: input.creaturePortraitCatalog.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(input.itemBaseItemCatalog
      ? { itemBaseItemCatalog: cloneItemBaseItemCatalog(input.itemBaseItemCatalog) }
      : {}),
    ...(input.placeableFactionCatalog
      ? {
          placeableFactionCatalog: {
            descriptor: { ...input.placeableFactionCatalog.descriptor },
            rows: input.placeableFactionCatalog.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    ...(input.encounterDifficultyCatalog
      ? {
          encounterDifficultyCatalog: {
            schemaVersion: input.encounterDifficultyCatalog.schemaVersion,
            descriptor: { ...input.encounterDifficultyCatalog.descriptor },
            rows: input.encounterDifficultyCatalog.rows.map((row) => ({ ...row })),
          },
        }
      : {}),
    composition: input.composition,
    updatedAt: input.updatedAt,
    objects: input.objects.map(mapAreaObject),
    ...(input.sourceResources ? { sourceResources: { ...input.sourceResources } } : {}),
  };
}

export class HttpAreaApiPort implements AreaApiPort {
  private readonly baseUrl: string;
  private readonly fetchFn: FetchLike;

  constructor(fetchFn: FetchLike = fetch.bind(globalThis), baseUrl = resolveBaseUrl()) {
    this.fetchFn = fetchFn;
    this.baseUrl = baseUrl.replace(/\/+$/u, "");
  }

  async login(username: string, password: string): Promise<AreaApiLoginResult> {
    const response = await this.fetchFn(`${this.baseUrl}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ username, password })
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = loginEnvelopeSchema.parse(payload);
    return {
      accessToken: parsed.data.session.accessToken
    };
  }

  async listAreas(accessToken: string, query?: AreaApiListQuery): Promise<AreaApiListResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas${toQueryString(query)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = areaListEnvelopeSchema.parse(payload);
    return {
      items: parsed.data.items.map(mapListItem),
      total: parsed.data.total,
      limit: parsed.data.limit,
      offset: parsed.data.offset
    };
  }

  async getAreaLightingEvidence(accessToken: string): Promise<AreaApiLightingEvidenceReport> {
    const response = await this.fetchFn(`${this.baseUrl}/areas/lighting/evidence`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = areaLightingEvidenceEnvelopeSchema.parse(payload);
    return parsed.data;
  }

  async getAreaById(accessToken: string, areaId: string): Promise<AreaApiDetail> {
    const response = await this.fetchFn(`${this.baseUrl}/areas/${encodeURIComponent(areaId)}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });
    const payload = await parseResponseOrThrow(response);
    const parsed = areaDetailEnvelopeSchema.parse(payload);
    return mapAreaDetail(parsed.data);
  }

  async processArea(
    accessToken: string,
    areaId: string,
    options?: AreaApiProcessOptions
  ): Promise<AreaApiProcessResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/${encodeURIComponent(areaId)}/process`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ bypassCache: options?.bypassCache ?? false })
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = areaProcessEnvelopeSchema.parse(payload);
    return {
      cache: parsed.data.cache,
      area: {
        ...mapAreaDetail(parsed.data.area),
        processedAt: parsed.data.area.processedAt
      }
    };
  }

  async getAreaTextureAtlasContracts(
    accessToken: string,
    cacheKey: string,
    mode: AreaApiTextureDeliveryMode = "proxy"
  ): Promise<AreaApiTextureDeliveryResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/cache/${encodeURIComponent(cacheKey)}/textures/contracts?mode=${encodeURIComponent(mode)}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    const payload = await parseResponseOrThrow(response);
    const parsed = areaTextureDeliveryEnvelopeSchema.parse(payload);
    return {
      cacheKey: parsed.data.cacheKey,
      textureAtlas: parsed.data.textureAtlas
    };
  }

  async exportAreaItemsGit(
    accessToken: string,
    areaId: string
  ): Promise<AreaApiBinaryExportResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/${encodeURIComponent(areaId)}/export/items.git`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return parseBinaryResponseOrThrow(response);
  }

  async exportAreaGit(accessToken: string, areaId: string): Promise<AreaApiBinaryExportResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/${encodeURIComponent(areaId)}/export/area.git`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return parseBinaryResponseOrThrow(response);
  }

  async exportAreaAre(accessToken: string, areaId: string): Promise<AreaApiBinaryExportResult> {
    const response = await this.fetchFn(
      `${this.baseUrl}/areas/${encodeURIComponent(areaId)}/export/area.are`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    return parseBinaryResponseOrThrow(response);
  }
}

export function createHttpAreaApiPort(
  fetchFn: FetchLike = fetch.bind(globalThis),
  baseUrl = resolveBaseUrl()
): AreaApiPort {
  return new HttpAreaApiPort(fetchFn, baseUrl);
}
