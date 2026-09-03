import { describe, expect, it } from "vitest";
import {
  canEditExistingWaypointTemplateResRef,
  materializeExistingWaypointTemplateResRef,
  reduceExistingWaypointTemplateResRef,
} from "../../../../../src/modules/layout/application/waypointTemplateResRefProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

const exactSource: SceneObjectSourceMetadata = {
  type: "aurora_git",
  sourceKind: "waypoint",
  sourceIndex: 0,
  waypointTemplateResRef: {
    present: true,
    nativeType: "resref",
    value: "nw_waypoint001",
  },
};

describe("existing Waypoint TemplateResRef provenance", () => {
  it("activates only exact present native Waypoint provenance", () => {
    expect(canEditExistingWaypointTemplateResRef(exactSource)).toBe(true);
    expect(canEditExistingWaypointTemplateResRef({
      ...exactSource,
      waypointTemplateResRef: { present: false },
    })).toBe(false);
    expect(canEditExistingWaypointTemplateResRef({
      ...exactSource,
      sourceKind: "creature",
    })).toBe(false);
    expect(canEditExistingWaypointTemplateResRef({
      ...exactSource,
      sourceIndex: undefined,
    })).toBe(false);
  });

  it("reduces and materializes only admitted canonical targets", () => {
    expect(reduceExistingWaypointTemplateResRef(
      exactSource,
      "nw_waypoint001",
      "custom_waypoint",
    )).toBe("custom_waypoint");
    expect(reduceExistingWaypointTemplateResRef(
      exactSource,
      "nw_waypoint001",
      "CUSTOM_WAYPOINT",
    )).toBe("nw_waypoint001");
    expect(materializeExistingWaypointTemplateResRef(
      { ...exactSource, waypointTemplateResRef: { present: false } },
      "nw_waypoint001",
      "custom_waypoint",
    )).toBe("nw_waypoint001");
  });
});
