import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";

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
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaItemConstructionProfile = typeof AREA_ITEM_CONSTRUCTION_PROFILE;

export const AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE = Object.freeze({
  id: "effective-catalog-uti-item-copy-v1",
  sourceKind: "item" as const,
  sceneKind: "items" as const,
  sourceExtension: "uti" as const,
  fileType: "UTI " as const,
  fileVersion: "V3.2" as const,
  rootStructTypeId: 0xffffffff,
  resourceType: 2025,
  maxSourceBytes: 1024 * 1024,
  maxNestedDepth: 8,
  maxNestedReferenceOccurrences: 1024,
  maxUniqueDependencies: 256,
  maxDependencyBytes: 16 * 1024 * 1024,
  maxSourceObjectKeyCodeUnits: 2048,
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaItemDynamicConstructionProfile =
  typeof AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE;
