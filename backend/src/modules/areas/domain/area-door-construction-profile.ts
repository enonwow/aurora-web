import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";

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
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
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

export type AreaDoorConstructionProfile = typeof AREA_DOOR_CONSTRUCTION_PROFILE;
