import { describe, expect, it } from "vitest";

import {
  canEditExistingWaypointDescription,
  materializeExistingWaypointDescription,
  readExistingWaypointDescription,
  reduceExistingWaypointDescription,
} from "../../../../../src/modules/layout/application/waypointDescriptionProvenance";
import type { SceneObjectSourceMetadata } from
  "../../../../../src/modules/scene/contracts";

function exactSource(): SceneObjectSourceMetadata {
  return {
    type: "aurora_git",
    sourceKind: "waypoint",
    sourceIndex: 0,
    waypointDescriptionStorage: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
    },
  };
}

describe("existing Waypoint Description provenance", () => {
  it("admits only exact retained inline ASCII storage", () => {
    expect(readExistingWaypointDescription(exactSource())).toBe("Patrol route");
    expect(canEditExistingWaypointDescription(exactSource())).toBe(true);
    expect(canEditExistingWaypointDescription({
      ...exactSource(),
      waypointDescriptionStorage: {
        present: true,
        strRef: 14817,
        entries: [],
      },
    })).toBe(false);
  });

  it("reduces and materializes verbatim ASCII without changing unsupported state", () => {
    expect(reduceExistingWaypointDescription(
      exactSource(),
      "Patrol route",
      " Northern patrol route ",
    )).toBe(" Northern patrol route ");
    expect(reduceExistingWaypointDescription(
      exactSource(),
      "Patrol route",
      "Północ",
    )).toBe("Patrol route");
    expect(materializeExistingWaypointDescription(
      exactSource(),
      "Patrol route",
      "Northern patrol route",
    )).toBe("Northern patrol route");
    expect(materializeExistingWaypointDescription(
      { ...exactSource(), sourceKind: "trigger" },
      "Patrol route",
      "Northern patrol route",
    )).toBe("Patrol route");
  });
});
