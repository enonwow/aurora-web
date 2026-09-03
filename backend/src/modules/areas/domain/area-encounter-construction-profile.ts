import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";

export const AREA_ENCOUNTER_CONSTRUCTION_GEOMETRY = Object.freeze([
  Object.freeze({ x: -0.13086700439453125, y: -6.151325225830078, z: 0.0250005591660738 }),
  Object.freeze({ x: 6.059123992919922, y: -6.1513214111328125, z: 0.025000499561429024 }),
  Object.freeze({ x: 6.059125900268555, y: 0.038669586181640625, z: 0.025000059977173805 }),
  Object.freeze({ x: 0, y: 0, z: 0.02500000037252903 }),
] as const);

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
  geometry: AREA_ENCOUNTER_CONSTRUCTION_GEOMETRY,
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaEncounterConstructionProfile = typeof AREA_ENCOUNTER_CONSTRUCTION_PROFILE;

export const AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE = Object.freeze({
  id: "effective-catalog-ute-encounter-copy-v1",
  sourceKind: "encounter" as const,
  sceneKind: "encounters" as const,
  sourceExtension: "ute" as const,
  fileType: "UTE " as const,
  fileVersion: "V3.2" as const,
  rootStructTypeId: 0xffffffff,
  resourceType: 2040,
  maxSourceBytes: 1024 * 1024,
  maxSourceObjectKeyCodeUnits: 2048,
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaEncounterDynamicConstructionProfile =
  typeof AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE;
