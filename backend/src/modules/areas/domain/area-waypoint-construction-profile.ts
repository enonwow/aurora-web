import { MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE } from "./area-object-construction-profile";

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
  resourceType: 2058,
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaWaypointConstructionProfile = typeof AREA_WAYPOINT_CONSTRUCTION_PROFILE;

export const AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE = Object.freeze({
  id: "effective-catalog-utw-waypoint-copy-v1",
  sourceKind: "waypoint" as const,
  sceneKind: "waypoints" as const,
  sourceExtension: "utw" as const,
  fileType: "UTW " as const,
  fileVersion: "V3.2" as const,
  rootStructTypeId: 0xffffffff,
  resourceType: 2058,
  maxSourceBytes: 1024 * 1024,
  maxSourceObjectKeyCodeUnits: 2048,
  maxAdditionsPerUpdate: MAX_AREA_OBJECT_ADDITIONS_PER_UPDATE,
} as const);

export type AreaWaypointDynamicConstructionProfile =
  typeof AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE;
