import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";

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
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaCreatureConstructionProfile = typeof AREA_CREATURE_CONSTRUCTION_PROFILE;
