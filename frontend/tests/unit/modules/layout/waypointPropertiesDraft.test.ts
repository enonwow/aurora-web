import {
  areWaypointPropertiesDraftsEqual,
  buildWaypointPropertiesDraft,
  materializeWaypointPropertiesDraft,
} from "../../../../src/modules/layout/application/waypointPropertiesDraft";
import type { SceneObject } from "../../../../src/modules/scene/contracts";

const waypointTableSha256 = "a".repeat(64);
const appearanceCatalog = {
  tableSha256: waypointTableSha256,
  rowCount: 5,
  items: [
    {
      rowIndex: 1,
      modelResRef: "wpt_blue",
      strRef: 123,
      label: "blue",
      displayName: "Blue Waypoint",
      displaySource: "strref" as const,
    },
    {
      rowIndex: 4,
      modelResRef: "wpt_yellow",
      strRef: 126,
      label: "yellow",
      displayName: "Yellow Waypoint",
      displaySource: "strref" as const,
    },
  ],
};

function waypoint(present = true): SceneObject {
  return {
    id: "area:waypoint:0",
    kind: "waypoints",
    resRef: "nw_waypoint001",
    tag: "NW_WAYPOINT001",
    ...(present ? { waypointTemplateResRef: "nw_waypoint001" } : {}),
    waypointLocalizedName: "Patrol Point",
    waypointDescription: "Patrol route",
    waypointMapNote: {
      hasMapNote: false,
      mapNoteText: "Old marker",
      mapNoteEnabled: true,
    },
    waypointAppearance: 1,
    waypointVariables: [{ name: "counter", type: "int", value: 1 }],
    waypointEditorComment: " source note ",
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    source: {
      type: "aurora_git",
      areaId: "area",
      sourceObjectId: "waypoint:0",
      sourceKind: "waypoint",
      sourceIndex: 0,
      waypointTag: present
        ? { present: true, value: "NW_WAYPOINT001" }
        : { present: false },
      waypointTemplateResRef: present
        ? { present: true, nativeType: "resref", value: "nw_waypoint001" }
        : { present: false },
      waypointLocalizedNameStorage: present
        ? {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
          }
        : { present: false },
      waypointDescriptionStorage: present
        ? {
            present: true,
            strRef: 0xffff_ffff,
            entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
          }
        : { present: false },
      waypointMapNoteStorage: present
        ? {
            hasMapNoteByte: 0,
            mapNoteStorage: {
              present: true,
              strRef: 0xffff_ffff,
              entries: [{ languageId: 0, textBytesBase64: "T2xkIG1hcmtlcg==" }],
            },
            mapNoteEnabledByte: 1,
          }
        : {
            hasMapNoteByte: 0,
            mapNoteStorage: { present: false },
            mapNoteEnabledByte: 1,
          },
      ...(present
        ? {
            waypointAppearance: {
              present: true as const,
              nativeType: "byte" as const,
              value: 1,
              table: {
                resourceName: "waypoint.2da" as const,
                sourceObjectKey: "vanilla:waypoint.2da",
                sourceLayer: "vanilla" as const,
                sha256: waypointTableSha256,
                sizeBytes: 321,
                rowCount: 5,
                rowIndex: 1,
              },
            },
          }
        : {}),
      ...(present
        ? {
            waypointVariables: { expectedEntries: [
              { sourceIndex: 0, name: "counter", type: "int", value: 1 },
            ] },
          }
        : {}),
      ...(present ? { waypointEditorComment: " source note " } : {}),
    },
  };
}

describe("Waypoint properties draft", () => {
  it("activates Tag only for exact retained provenance", () => {
    expect(buildWaypointPropertiesDraft(waypoint()).tagControlState).toBe("ACTIVE_NOW");
    expect(buildWaypointPropertiesDraft(waypoint()).templateResRefControlState)
      .toBe("ACTIVE_NOW");
    expect(buildWaypointPropertiesDraft(waypoint()).localizedNameControlState)
      .toBe("ACTIVE_NOW");
    expect(buildWaypointPropertiesDraft(waypoint()).descriptionControlState)
      .toBe("ACTIVE_NOW");
    expect(buildWaypointPropertiesDraft(waypoint()).mapNoteControlState)
      .toBe("ACTIVE_NOW");
    expect(buildWaypointPropertiesDraft(waypoint()).appearanceControlState)
      .toBe("ACTIVE_NOW");
    expect(buildWaypointPropertiesDraft(waypoint()).variablesControlState)
      .toBe("ACTIVE_NOW");
    expect(buildWaypointPropertiesDraft(waypoint()).commentsControlState)
      .toBe("ACTIVE_NOW");
    expect(buildWaypointPropertiesDraft(waypoint(false)).tagControlState)
      .toBe("PRESERVE_ONLY");
    expect(buildWaypointPropertiesDraft(waypoint(false)).templateResRefControlState)
      .toBe("PRESERVE_ONLY");
  });

  it("materializes the target without changing immutable provenance", () => {
    const source = waypoint();
    const result = materializeWaypointPropertiesDraft(source, {
      tagControlState: "ACTIVE_NOW",
      tag: "  DEST  ",
      templateResRefControlState: "ACTIVE_NOW",
      templateResRef: "custom_waypoint",
      localizedNameControlState: "ACTIVE_NOW",
      localizedName: " North Patrol Point ",
      descriptionControlState: "ACTIVE_NOW",
      description: "Northern patrol route",
      mapNoteControlState: "ACTIVE_NOW",
      hasMapNote: true,
      mapNoteText: " New marker ",
      mapNoteEnabled: false,
      appearanceControlState: "ACTIVE_NOW",
      appearance: 4,
      variablesControlState: "ACTIVE_NOW",
      variables: [{ name: "label", type: "string", value: "north" }],
      commentsControlState: "ACTIVE_NOW",
      comments: " updated note ",
    }, appearanceCatalog);
    expect(result.tag).toBe("  DEST  ");
    expect(result.resRef).toBe("nw_waypoint001");
    expect(result.waypointTemplateResRef).toBe("custom_waypoint");
    expect(result.waypointLocalizedName).toBe(" North Patrol Point ");
    expect(result.waypointDescription).toBe("Northern patrol route");
    expect(result.waypointMapNote).toEqual({
      hasMapNote: true,
      mapNoteText: " New marker ",
      mapNoteEnabled: false,
    });
    expect(result.waypointEditorComment).toBe(" updated note ");
    expect(result.waypointAppearance).toBe(4);
    expect(result.waypointVariables).toEqual([
      { name: "label", type: "string", value: "north" },
    ]);
    expect(result.source?.waypointTag).toEqual({ present: true, value: "NW_WAYPOINT001" });
    expect(result.source?.waypointTemplateResRef)
      .toEqual(source.source?.waypointTemplateResRef);
    expect(result.source?.waypointTemplateResRef)
      .not.toBe(source.source?.waypointTemplateResRef);
    expect(result.source?.waypointLocalizedNameStorage)
      .toEqual(source.source?.waypointLocalizedNameStorage);
    expect(result.source?.waypointDescriptionStorage)
      .toEqual(source.source?.waypointDescriptionStorage);
    expect(result.source?.waypointMapNoteStorage)
      .toEqual(source.source?.waypointMapNoteStorage);
    expect(result.source?.waypointMapNoteStorage)
      .not.toBe(source.source?.waypointMapNoteStorage);
    expect(result.source?.waypointAppearance).toEqual(source.source?.waypointAppearance);
    expect(result.source?.waypointAppearance).not.toBe(source.source?.waypointAppearance);
    expect(result.source?.waypointVariables).toEqual(source.source?.waypointVariables);
    expect(result.source?.waypointVariables).not.toBe(source.source?.waypointVariables);
    expect(result.waypointMapNote).not.toBe(source.waypointMapNote);
    expect(result.source?.waypointEditorComment).toBe(" source note ");
    expect(result.source).not.toBe(source.source);
  });

  it("keeps preserve-only values unchanged and compares complete drafts", () => {
    const source = waypoint(false);
    const draft = buildWaypointPropertiesDraft(source);
    expect(materializeWaypointPropertiesDraft(source, { ...draft, tag: "DEST" }).tag)
      .toBe("NW_WAYPOINT001");
    expect(areWaypointPropertiesDraftsEqual(draft, { ...draft })).toBe(true);
    expect(areWaypointPropertiesDraftsEqual(draft, { ...draft, tag: "DEST" })).toBe(false);
    expect(areWaypointPropertiesDraftsEqual(
      draft,
      { ...draft, templateResRef: "custom_waypoint" },
    )).toBe(false);
    expect(areWaypointPropertiesDraftsEqual(
      draft,
      { ...draft, localizedName: "North" },
    )).toBe(false);
    expect(areWaypointPropertiesDraftsEqual(
      draft,
      { ...draft, description: "Northern patrol route" },
    )).toBe(false);
    expect(areWaypointPropertiesDraftsEqual(
      draft,
      { ...draft, hasMapNote: !draft.hasMapNote },
    )).toBe(false);
    expect(areWaypointPropertiesDraftsEqual(
      draft,
      { ...draft, appearance: 4 },
    )).toBe(false);
    expect(areWaypointPropertiesDraftsEqual(
      draft,
      { ...draft, variables: [{ name: "x", type: "int", value: 1 }] },
    )).toBe(false);
    expect(areWaypointPropertiesDraftsEqual(
      draft,
      { ...draft, comments: "updated" },
    )).toBe(false);
  });
});
