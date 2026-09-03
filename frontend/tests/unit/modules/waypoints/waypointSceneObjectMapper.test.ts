import { describe, expect, it } from "vitest";
import { mapWaypointApiListItemToSceneObject } from
  "../../../../src/modules/waypoints/application/waypointSceneObjectMapper";

describe("waypointSceneObjectMapper", () => {
  it("maps exact effective UTW provenance into an Area-constructible Waypoint template", () => {
    const object = mapWaypointApiListItemToSceneObject({
      templateId: "wpt_wp_dynamic",
      resref: "wp_dynamic",
      name: "Dynamic Waypoint",
      category: "waypoint",
      tags: ["waypoint"],
      previewImageUrl: "",
      metadata: {
        templateResRef: "wp_dynamic",
        tag: "WP_DYNAMIC",
        localizedName: "Dynamic Waypoint",
        sourceObjectKey: "modules/current/blueprints/waypoints/wp_dynamic.utw",
        sourceSizeBytes: 2048,
        sourceSha256: "c".repeat(64),
        sourceExtension: "utw",
        sourceFileType: "UTW ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    }, 4);

    expect(object).toMatchObject({
      id: "wpt_template_wpt_wp_dynamic",
      kind: "waypoints",
      name: "Dynamic Waypoint",
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
  });
});
