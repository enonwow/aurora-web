export const AREA_CREATURE_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-utc-nw-chicken-v1",
  sourceKind: "creature" as const,
  sceneKind: "creatures" as const,
  templateResRef: "nw_chicken",
  templateTag: "NW_CHICKEN",
  sourceSha256: "c1b0e194bb08b3e3d2946025c1e2f950b91e4cb844a32ba3b744c51a1d822a4a",
  fileType: "UTC ",
  fileVersion: "V3.2",
  rootStructTypeId: 0xffffffff,
  resourceType: 2027,
} as const);

export const AREA_WAYPOINT_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-utw-v1",
  sourceKind: "waypoint" as const,
  sceneKind: "waypoints" as const,
  templateResRef: "nw_waypoint001",
  templateTag: "NW_WAYPOINT001",
  sourceSha256: "13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a",
  fileType: "UTW ",
  fileVersion: "V3.2",
  rootStructTypeId: 0xffffffff,
} as const);

export const AREA_SOUND_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-uts-animalcriesday-v1",
  sourceKind: "sound" as const,
  sceneKind: "sounds" as const,
  templateResRef: "animalcriesday",
  templateTag: "AnimalCriesDay",
  sourceSha256: "a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4",
  fileType: "UTS ",
  fileVersion: "V3.2",
  rootStructTypeId: 0xffffffff,
  resourceType: 2035,
} as const);

export const AREA_PLACEABLE_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-utp-plc-watertrough-v1",
  sourceKind: "placeable" as const,
  sceneKind: "placeables" as const,
  templateResRef: "plc_watertrough",
  blueprintTag: "Water Trough",
  templateTag: "WaterTrough",
  sourceSha256: "a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531",
  fileType: "UTP ",
  fileVersion: "V3.2",
  rootStructTypeId: 0xffffffff,
  resourceType: 2044,
} as const);

export const AREA_ITEM_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-uti-nw-cloth022-v1",
  sourceKind: "item" as const,
  sceneKind: "items" as const,
  templateResRef: "nw_cloth022",
  templateTag: "NW_CLOTH022",
  sourceSha256: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
  fileType: "UTI ",
  fileVersion: "V3.2",
  rootStructTypeId: 0xffffffff,
  resourceType: 2025,
} as const);

export const AREA_STORE_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-utm-x2-merc-dye-v1",
  sourceKind: "store" as const,
  sceneKind: "stores" as const,
  templateResRef: "x2_merc_dye",
  templateTag: "x2_merc_dye",
  sourceSha256: "99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2",
  fileType: "UTM ",
  fileVersion: "V3.2",
  rootStructTypeId: 0xffffffff,
  resourceType: 2051,
} as const);

export const AREA_TRIGGER_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-utt-newgeneric-v1",
  sourceKind: "trigger" as const,
  sceneKind: "triggers" as const,
  templateResRef: "newgeneric",
  templateTag: "GenericTrigger",
  sourceSha256: "e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c",
  fileType: "UTT ",
  fileVersion: "V3.2",
  rootStructTypeId: 0xffffffff,
  resourceType: 2032,
} as const);

export const AREA_ENCOUNTER_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-ute-x2-gnoll001-v1",
  sourceKind: "encounter" as const,
  sceneKind: "encounters" as const,
  templateResRef: "x2_gnoll001",
  templateTag: "X2_GNOLL001",
  sourceSha256: "f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed",
  fileType: "UTE ",
  fileVersion: "V3.2",
  rootStructTypeId: 0xffffffff,
  resourceType: 2040,
} as const);

export const AREA_DOOR_CONSTRUCTION_PROFILE = Object.freeze({
  id: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
  sourceKind: "door" as const,
  sceneKind: "doors" as const,
  templateResRef: "nw_door_ttr_04",
  templateTag: "Barn1Door",
  sourceSha256: "d7fc618b94e0b66c117d5e9d15dea3c0f34f5cc52810b50d146d7c73769406fa",
  fileType: "UTD " as const,
  fileVersion: "V3.2" as const,
  rootStructTypeId: 0xffffffff,
  resourceType: 2042,
  hook: Object.freeze({
    profileId: "tin01-tile121-orientation0-door0-v1",
    tilesetResRef: "tin01",
    tilesetSha256: "e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4",
    resourceType: 2013,
    tileId: 121,
    tileOrientation: 0,
    tileHeight: 0,
    hookIndex: 0,
    hookType: 0,
    localX: 0,
    localY: 0.76,
    localZ: 0,
    orientationDegrees: 180,
    nativeBearing: -3.141592264175415,
    sceneBearing: Math.PI,
  }),
} as const);

export interface AreaWaypointConstructionDefaults {
  readonly resRef: string;
  readonly tag: string;
  readonly source: Readonly<{
    type: "aurora_blueprint";
    sourceKind: "creature" | "encounter" | "item" | "placeable" | "sound" | "store" | "trigger" | "waypoint";
    sourceProfileId: string;
    templateId: string;
    sourceEtag: string;
    sourceFileType: string;
    sourceFileVersion: string;
    sourceStructTypeId: number;
  }>;
}

export type AreaObjectConstructionDefaults = AreaWaypointConstructionDefaults;

export interface AreaDoorConstructionDefaults {
  readonly resRef: string;
  readonly tag: string;
  readonly source: Readonly<{
    type: "aurora_blueprint";
    sourceKind: "door";
    sourceProfileId: string;
    templateId: string;
    sourceEtag: string;
    sourceFileType: "UTD ";
    sourceFileVersion: "V3.2";
    sourceStructTypeId: number;
    doorHook: Readonly<{
      profileId: string;
      tilesetResRef: string;
      tilesetSha256: string;
      tileId: number;
      tileOrientation: number;
      tileHeight: number;
      hookIndex: number;
      hookType: number;
      localX: number;
      localY: number;
      localZ: number;
      orientationDegrees: number;
      row: number;
      col: number;
    }>;
  }>;
}

export function getAreaObjectConstructionDefaults(
  kind: string,
): AreaObjectConstructionDefaults | undefined {
  const profile = kind === AREA_CREATURE_CONSTRUCTION_PROFILE.sceneKind
    ? AREA_CREATURE_CONSTRUCTION_PROFILE
    : kind === AREA_ENCOUNTER_CONSTRUCTION_PROFILE.sceneKind
      ? AREA_ENCOUNTER_CONSTRUCTION_PROFILE
    : kind === AREA_ITEM_CONSTRUCTION_PROFILE.sceneKind
      ? AREA_ITEM_CONSTRUCTION_PROFILE
      : kind === AREA_PLACEABLE_CONSTRUCTION_PROFILE.sceneKind
      ? AREA_PLACEABLE_CONSTRUCTION_PROFILE
      : kind === AREA_STORE_CONSTRUCTION_PROFILE.sceneKind
        ? AREA_STORE_CONSTRUCTION_PROFILE
      : kind === AREA_TRIGGER_CONSTRUCTION_PROFILE.sceneKind
        ? AREA_TRIGGER_CONSTRUCTION_PROFILE
      : kind === AREA_WAYPOINT_CONSTRUCTION_PROFILE.sceneKind
        ? AREA_WAYPOINT_CONSTRUCTION_PROFILE
        : kind === AREA_SOUND_CONSTRUCTION_PROFILE.sceneKind
          ? AREA_SOUND_CONSTRUCTION_PROFILE
          : undefined;
  if (!profile) return undefined;
  return Object.freeze({
    resRef: profile.templateResRef,
    tag: profile.templateTag,
    source: Object.freeze({
      type: "aurora_blueprint" as const,
      sourceKind: profile.sourceKind,
      sourceProfileId: profile.id,
      templateId: profile.templateResRef,
      sourceEtag: profile.sourceSha256,
      sourceFileType: profile.fileType,
      sourceFileVersion: profile.fileVersion,
      sourceStructTypeId: profile.rootStructTypeId,
    }),
  });
}

export function getAreaWaypointConstructionDefaults(
  kind: string,
): AreaWaypointConstructionDefaults | undefined {
  return kind === AREA_WAYPOINT_CONSTRUCTION_PROFILE.sceneKind
    ? getAreaObjectConstructionDefaults(kind)
    : undefined;
}

export function getAreaDoorConstructionDefaults(
  row: number,
  col: number,
): AreaDoorConstructionDefaults | undefined {
  if (!Number.isSafeInteger(row) || row < 0 || !Number.isSafeInteger(col) || col < 0) {
    return undefined;
  }
  const profile = AREA_DOOR_CONSTRUCTION_PROFILE;
  const hook = profile.hook;
  return Object.freeze({
    resRef: profile.templateResRef,
    tag: profile.templateTag,
    source: Object.freeze({
      type: "aurora_blueprint" as const,
      sourceKind: profile.sourceKind,
      sourceProfileId: profile.id,
      templateId: profile.templateResRef,
      sourceEtag: profile.sourceSha256,
      sourceFileType: profile.fileType,
      sourceFileVersion: profile.fileVersion,
      sourceStructTypeId: profile.rootStructTypeId,
      doorHook: Object.freeze({
        profileId: hook.profileId,
        tilesetResRef: hook.tilesetResRef,
        tilesetSha256: hook.tilesetSha256,
        tileId: hook.tileId,
        tileOrientation: hook.tileOrientation,
        tileHeight: hook.tileHeight,
        hookIndex: hook.hookIndex,
        hookType: hook.hookType,
        localX: hook.localX,
        localY: hook.localY,
        localZ: hook.localZ,
        orientationDegrees: hook.orientationDegrees,
        row,
        col,
      }),
    }),
  });
}
