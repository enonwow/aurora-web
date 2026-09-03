import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";

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
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaPlaceableConstructionProfile = typeof AREA_PLACEABLE_CONSTRUCTION_PROFILE;

export const AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE = Object.freeze({
  id: "effective-catalog-utp-placeable-copy-v1",
  sourceKind: "placeable" as const,
  sceneKind: "placeables" as const,
  fileType: "UTP " as const,
  fileVersion: "V3.2" as const,
  rootStructTypeId: 0xffffffff,
  resourceType: 2044,
  maxSourceBytes: 1024 * 1024,
  maxSourceObjectKeyCodeUnits: 2048,
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaPlaceableDynamicConstructionProfile =
  typeof AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE;
