import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";

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
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaSoundConstructionProfile = typeof AREA_SOUND_CONSTRUCTION_PROFILE;
