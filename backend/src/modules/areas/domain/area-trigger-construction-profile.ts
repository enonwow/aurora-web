import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";

export const AREA_TRIGGER_CONSTRUCTION_GEOMETRY = Object.freeze([
  Object.freeze({ x: -0.2990303039550781, y: -4.833713531494141, z: 0.02500000037252903 }),
  Object.freeze({ x: 4.8592987060546875, y: -4.833709716796875, z: 0.025000499561429024 }),
  Object.freeze({ x: 4.8592987060546875, y: 0.324615478515625, z: 0.025000499561429024 }),
  Object.freeze({ x: 0, y: 0, z: 3.125 }),
] as const);

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
  geometry: AREA_TRIGGER_CONSTRUCTION_GEOMETRY,
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaTriggerConstructionProfile = typeof AREA_TRIGGER_CONSTRUCTION_PROFILE;
