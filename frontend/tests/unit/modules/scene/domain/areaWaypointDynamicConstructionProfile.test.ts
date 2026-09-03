import { describe, expect, it } from "vitest";
import {
  AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE,
  readDynamicAreaWaypointConstructionDefaults,
} from "../../../../../src/modules/scene/domain/areaWaypointDynamicConstructionProfile";

describe("dynamic Area Waypoint construction profile", () => {
  const item = {
    templateId: "wpt_wp_dynamic",
    resref: "wp_dynamic",
    metadata: {
      templateResRef: "wp_dynamic",
      tag: "WP_DYNAMIC",
      sourceObjectKey: "modules/current/blueprints/waypoints/wp_dynamic.utw",
      sourceSizeBytes: 2048,
      sourceSha256: "c".repeat(64),
      sourceExtension: "utw",
      sourceFileType: "UTW ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };

  it("materializes exact binary-free current-winner provenance", () => {
    expect(readDynamicAreaWaypointConstructionDefaults(item)).toEqual({
      resRef: "wp_dynamic",
      tag: "WP_DYNAMIC",
      source: {
        type: "aurora_blueprint",
        sourceKind: "waypoint",
        sourceProfileId: "effective-catalog-utw-waypoint-copy-v1",
        templateId: "wpt_wp_dynamic",
        templateResRef: "wp_dynamic",
        sourceObjectKey: "modules/current/blueprints/waypoints/wp_dynamic.utw",
        sourceSizeBytes: 2048,
        sourceEtag: "c".repeat(64),
        sourceFileType: "UTW ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    expect(Object.isFrozen(AREA_WAYPOINT_DYNAMIC_CONSTRUCTION_PROFILE)).toBe(true);
  });

  it.each([
    ["preview-only metadata", { ...item, metadata: undefined }],
    ["wrong extension", { ...item, metadata: { ...item.metadata, sourceExtension: "ute" } }],
    ["wrong digest", { ...item, metadata: { ...item.metadata, sourceSha256: "C".repeat(64) } }],
    ["identity drift", { ...item, metadata: { ...item.metadata, templateResRef: "wp_other" } }],
    ["NUL tag", { ...item, metadata: { ...item.metadata, tag: "bad\0tag" } }],
  ])("rejects %s", (_label, value) => {
    expect(readDynamicAreaWaypointConstructionDefaults(value)).toBeUndefined();
  });
});
