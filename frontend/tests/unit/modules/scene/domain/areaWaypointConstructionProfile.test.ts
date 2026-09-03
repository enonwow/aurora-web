import { describe, expect, it } from "vitest";
import {
  AREA_CREATURE_CONSTRUCTION_PROFILE,
  AREA_DOOR_CONSTRUCTION_PROFILE,
  AREA_ENCOUNTER_CONSTRUCTION_PROFILE,
  AREA_PLACEABLE_CONSTRUCTION_PROFILE,
  AREA_SOUND_CONSTRUCTION_PROFILE,
  AREA_STORE_CONSTRUCTION_PROFILE,
  AREA_TRIGGER_CONSTRUCTION_PROFILE,
  AREA_WAYPOINT_CONSTRUCTION_PROFILE,
  getAreaDoorConstructionDefaults,
  getAreaObjectConstructionDefaults,
  getAreaWaypointConstructionDefaults,
} from "../../../../../src/modules/scene/domain/areaWaypointConstructionProfile";

describe("Area waypoint construction profile", () => {
  it("projects the complete immutable source identity for waypoint construction", () => {
    const result = getAreaWaypointConstructionDefaults("waypoints");

    expect(result).toEqual({
      resRef: "nw_waypoint001",
      tag: "NW_WAYPOINT001",
      source: {
        type: "aurora_blueprint",
        sourceKind: "waypoint",
        sourceProfileId: "nwn-base-key-utw-v1",
        templateId: "nw_waypoint001",
        sourceEtag: "13122a96b64f277c1c6aecb8984f1b5b9c133fb9fb514ce24a1bef564a53055a",
        sourceFileType: "UTW ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.source)).toBe(true);
    expect(AREA_WAYPOINT_CONSTRUCTION_PROFILE.rootStructTypeId).toBe(0xffffffff);
  });

  it("projects the complete immutable source identity for sound construction", () => {
    const result = getAreaObjectConstructionDefaults("sounds");

    expect(result).toEqual({
      resRef: "animalcriesday",
      tag: "AnimalCriesDay",
      source: {
        type: "aurora_blueprint",
        sourceKind: "sound",
        sourceProfileId: "nwn-base-key-uts-animalcriesday-v1",
        templateId: "animalcriesday",
        sourceEtag: "a0d185c2813db9cd2649e104715e94c01511f83b97f3319a0ee3c31b8c3357b4",
        sourceFileType: "UTS ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.source)).toBe(true);
    expect(AREA_SOUND_CONSTRUCTION_PROFILE.resourceType).toBe(2035);
  });

  it("projects the complete immutable source identity for placeable construction", () => {
    const result = getAreaObjectConstructionDefaults("placeables");

    expect(result).toEqual({
      resRef: "plc_watertrough",
      tag: "WaterTrough",
      source: {
        type: "aurora_blueprint",
        sourceKind: "placeable",
        sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
        templateId: "plc_watertrough",
        sourceEtag: "a1b00834837b3c516d823f63e00054b2331044bdbccca1d49f1bc121f854c531",
        sourceFileType: "UTP ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.source)).toBe(true);
    expect(AREA_PLACEABLE_CONSTRUCTION_PROFILE.resourceType).toBe(2044);
    expect(AREA_PLACEABLE_CONSTRUCTION_PROFILE.blueprintTag).toBe("Water Trough");
  });

  it("projects the complete immutable source identity for ground-item construction", () => {
    expect(getAreaObjectConstructionDefaults("items")).toEqual({
      resRef: "nw_cloth022",
      tag: "NW_CLOTH022",
      source: {
        type: "aurora_blueprint",
        sourceKind: "item",
        sourceProfileId: "nwn-base-key-uti-nw-cloth022-v1",
        templateId: "nw_cloth022",
        sourceEtag: "606788a4d7e44de76e4c3f38ce4b2b7bae06d64721140995efa011066b5279a6",
        sourceFileType: "UTI ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it("projects the complete immutable source identity for creature construction", () => {
    expect(getAreaObjectConstructionDefaults("creatures")).toEqual({
      resRef: "nw_chicken",
      tag: "NW_CHICKEN",
      source: {
        type: "aurora_blueprint",
        sourceKind: "creature",
        sourceProfileId: "nwn-base-key-utc-nw-chicken-v1",
        templateId: "nw_chicken",
        sourceEtag: "c1b0e194bb08b3e3d2946025c1e2f950b91e4cb844a32ba3b744c51a1d822a4a",
        sourceFileType: "UTC ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    expect(AREA_CREATURE_CONSTRUCTION_PROFILE.resourceType).toBe(2027);
  });

  it("projects the complete immutable source identity for store construction", () => {
    expect(getAreaObjectConstructionDefaults("stores")).toEqual({
      resRef: "x2_merc_dye",
      tag: "x2_merc_dye",
      source: {
        type: "aurora_blueprint",
        sourceKind: "store",
        sourceProfileId: "nwn-base-key-utm-x2-merc-dye-v1",
        templateId: "x2_merc_dye",
        sourceEtag: "99b3050edf8697dfd053dbb335c12273de79ae1a16eebb242c354e727ae166e2",
        sourceFileType: "UTM ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    expect(AREA_STORE_CONSTRUCTION_PROFILE.resourceType).toBe(2051);
  });

  it("projects the complete immutable source identity for trigger construction", () => {
    expect(getAreaObjectConstructionDefaults("triggers")).toEqual({
      resRef: "newgeneric",
      tag: "GenericTrigger",
      source: {
        type: "aurora_blueprint",
        sourceKind: "trigger",
        sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
        templateId: "newgeneric",
        sourceEtag: "e855ae85a9b8511aca84ada06b9779126ff615f9bd816df4dbf39e1a1544001c",
        sourceFileType: "UTT ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    expect(AREA_TRIGGER_CONSTRUCTION_PROFILE.resourceType).toBe(2032);
  });

  it("projects the complete immutable source identity for encounter construction", () => {
    expect(getAreaObjectConstructionDefaults("encounters")).toEqual({
      resRef: "x2_gnoll001",
      tag: "X2_GNOLL001",
      source: {
        type: "aurora_blueprint",
        sourceKind: "encounter",
        sourceProfileId: "nwn-base-key-ute-x2-gnoll001-v1",
        templateId: "x2_gnoll001",
        sourceEtag: "f3941f1eb580b55247f3ac226e8e0aa72841c3c81ba205c61319b8958a5daeed",
        sourceFileType: "UTE ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    expect(AREA_ENCOUNTER_CONSTRUCTION_PROFILE.resourceType).toBe(2040);
  });

  it("projects the exact immutable tin01 door-hook source identity", () => {
    const result = getAreaDoorConstructionDefaults(2, 3);

    expect(result).toEqual({
      resRef: "nw_door_ttr_04",
      tag: "Barn1Door",
      source: {
        type: "aurora_blueprint",
        sourceKind: "door",
        sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
        templateId: "nw_door_ttr_04",
        sourceEtag: "d7fc618b94e0b66c117d5e9d15dea3c0f34f5cc52810b50d146d7c73769406fa",
        sourceFileType: "UTD ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
        doorHook: {
          profileId: "tin01-tile121-orientation0-door0-v1",
          tilesetResRef: "tin01",
          tilesetSha256: "e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4",
          tileId: 121,
          tileOrientation: 0,
          tileHeight: 0,
          hookIndex: 0,
          hookType: 0,
          localX: 0,
          localY: 0.76,
          localZ: 0,
          orientationDegrees: 180,
          row: 2,
          col: 3,
        },
      },
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.source)).toBe(true);
    expect(Object.isFrozen(result?.source.doorHook)).toBe(true);
    expect(Object.isFrozen(AREA_DOOR_CONSTRUCTION_PROFILE)).toBe(true);
    expect(Object.isFrozen(AREA_DOOR_CONSTRUCTION_PROFILE.hook)).toBe(true);
    expect(getAreaDoorConstructionDefaults(0, 0)).toBeDefined();
    expect(getAreaDoorConstructionDefaults(-1, 3)).toBeUndefined();
    expect(getAreaDoorConstructionDefaults(2.5, 3)).toBeUndefined();
    expect(getAreaDoorConstructionDefaults(2, -1)).toBeUndefined();
    expect(getAreaDoorConstructionDefaults(2, 3.5)).toBeUndefined();
  });

  it.each([
    "placeables",
    "creatures",
    "doors",
    "encounters",
    "items",
    "sounds",
    "stores",
    "triggers",
    "waypoint",
    "",
  ])("does not attach the waypoint blueprint profile to %s", (kind) => {
    expect(getAreaWaypointConstructionDefaults(kind)).toBeUndefined();
  });

  it.each(["doors", ""])(
    "does not attach any construction profile to %s",
    (kind) => expect(getAreaObjectConstructionDefaults(kind)).toBeUndefined(),
  );
});
