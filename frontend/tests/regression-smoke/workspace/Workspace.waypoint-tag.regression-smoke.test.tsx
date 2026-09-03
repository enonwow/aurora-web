import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import {
  loadLocalSceneDraft,
  saveLocalSceneDraft,
} from "../../../src/modules/scene/adapters/localDraftStore";
import { createNewSceneObject, createSeedAreaScene } from "../../../src/modules/scene/domain/sceneFactory";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

const USER_ID = "u_builder_001";
const SOURCE_OBJECT_ID = "waypoint:0:nw_waypoint001:source";
const SOURCE_TEMPLATE_RESREF = "nw_waypoint001";
const SOURCE_TAG = "NW_WAYPOINT001";
const SOURCE_NAME = "Patrol Point";
const SOURCE_DESCRIPTION = "Patrol route";
const SOURCE_COMMENT = " source patrol note ";
const SOURCE_MAP_NOTE = "Old marker";

function renderAtPath(pathname: string) {
  window.history.replaceState({}, "", pathname);
  return render(<App />);
}

async function signInAsBuilder() {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: "builder.user" },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "builder123" },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("button", { name: /sign out/i })).toBeInTheDocument();
}

function seedExactWaypointTagDraft() {
  const scene = createSeedAreaScene();
  const waypoint = createNewSceneObject("waypoints", 1, 2, 1);
  waypoint.id = "waypoint-0";
  waypoint.resRef = "nw_waypoint001";
  waypoint.waypointTemplateResRef = SOURCE_TEMPLATE_RESREF;
  waypoint.tag = SOURCE_TAG;
  waypoint.name = SOURCE_NAME;
  waypoint.waypointLocalizedName = SOURCE_NAME;
  waypoint.waypointDescription = SOURCE_DESCRIPTION;
  waypoint.waypointMapNote = {
    hasMapNote: false,
    mapNoteText: SOURCE_MAP_NOTE,
    mapNoteEnabled: true,
  };
  waypoint.waypointVariables = [{ name: "counter", type: "int", value: 1 }];
  waypoint.waypointEditorComment = SOURCE_COMMENT;
  waypoint.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "waypoint",
    sourceObjectId: SOURCE_OBJECT_ID,
    sourceIndex: 0,
    waypointTemplateResRef: {
      present: true,
      nativeType: "resref",
      value: SOURCE_TEMPLATE_RESREF,
    },
    waypointTag: { present: true, value: SOURCE_TAG },
    waypointLocalizedNameStorage: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
    },
    waypointDescriptionStorage: {
      present: true,
      strRef: 0xffff_ffff,
      entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
    },
    waypointMapNoteStorage: {
      hasMapNoteByte: 0,
      mapNoteStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "T2xkIG1hcmtlcg==" }],
      },
      mapNoteEnabledByte: 1,
    },
    waypointVariables: { expectedEntries: [
      { sourceIndex: 0, name: "counter", type: "int", value: 1 },
    ] },
    waypointEditorComment: SOURCE_COMMENT,
  };
  scene.objects.push(waypoint);
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openWaypointProperties() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", {
    name: /nw_waypoint001|patrol_point_01/i,
  });
  const item = row.closest("li");
  if (!item) throw new Error("Expected retained Waypoint row.");
  fireEvent.click(
    within(item).getByRole("button", { name: /open object properties/i }),
  );
  return screen.findByRole("dialog", { name: /waypoint properties/i });
}

describe("Regression smoke: retained Waypoint properties including MapNote", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactWaypointTagDraft();
  });

  it("preserves exact properties and immutable provenance through Cancel, Apply, reopen, OK, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openWaypointProperties();
    let tag = within(dialog).getByLabelText("Waypoint Tag");
    let name = within(dialog).getByLabelText("Waypoint Name");
    expect(tag).toBeEnabled();
    expect(tag).toHaveAttribute("maxLength", "32");
    expect(within(dialog).getByText(/ACTIVE_NOW/)).toBeInTheDocument();
    fireEvent.change(tag, { target: { value: "DISCARDED" } });
    fireEvent.change(name, { target: { value: "Discarded Name" } });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Description" }));
    fireEvent.change(within(dialog).getByLabelText("Waypoint Description"), {
      target: { value: "Discarded description" },
    });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Advanced" }));
    fireEvent.change(within(dialog).getByLabelText("Waypoint Blueprint ResRef"), {
      target: { value: "discarded_ref" },
    });
    fireEvent.click(within(dialog).getByLabelText("Waypoint Contains a Map Note"));
    fireEvent.change(within(dialog).getByLabelText("Waypoint Map Note Text"), {
      target: { value: "Discarded map note" },
    });
    fireEvent.click(within(dialog).getByLabelText("Waypoint Map Note Enabled"));
    fireEvent.click(within(dialog).getByRole("button", { name: "Variables... (1)" }));
    fireEvent.change(within(dialog).getByLabelText("Waypoint variable 1 value"), {
      target: { value: "99" },
    });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Comments" }));
    fireEvent.change(within(dialog).getByLabelText("Waypoint Comments"), {
      target: { value: "Discarded comment" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openWaypointProperties();
    tag = within(dialog).getByLabelText("Waypoint Tag");
    name = within(dialog).getByLabelText("Waypoint Name");
    expect(tag).toHaveValue(SOURCE_TAG);
    expect(name).toHaveValue(SOURCE_NAME);
    fireEvent.click(within(dialog).getByRole("tab", { name: "Description" }));
    expect(within(dialog).getByLabelText("Waypoint Description"))
      .toHaveValue(SOURCE_DESCRIPTION);
    fireEvent.click(within(dialog).getByRole("tab", { name: "Advanced" }));
    expect(within(dialog).getByLabelText("Waypoint Blueprint ResRef"))
      .toHaveValue(SOURCE_TEMPLATE_RESREF);
    expect(within(dialog).getByLabelText("Waypoint Contains a Map Note"))
      .not.toBeChecked();
    expect(within(dialog).getByLabelText("Waypoint Map Note Text"))
      .toHaveValue(SOURCE_MAP_NOTE);
    expect(within(dialog).getByLabelText("Waypoint Map Note Enabled"))
      .toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "Variables... (1)" }));
    expect(within(dialog).getByLabelText("Waypoint variable 1 value")).toHaveValue(1);
    fireEvent.click(within(dialog).getByRole("tab", { name: "Comments" }));
    expect(within(dialog).getByLabelText("Waypoint Comments"))
      .toHaveValue(SOURCE_COMMENT);
    fireEvent.click(within(dialog).getByRole("tab", { name: "Basic" }));
    tag = within(dialog).getByLabelText("Waypoint Tag");
    name = within(dialog).getByLabelText("Waypoint Name");
    const appliedValue = "  PATROL_POINT_01  ";
    const appliedName = " North Patrol Point ";
    const appliedDescription = "Northern patrol route";
    const appliedComment = " northern patrol note ";
    const appliedMapNote = " Northern gate ";
    const appliedTemplateResRef = "wp_patrol_alt";
    fireEvent.change(tag, { target: { value: appliedValue } });
    fireEvent.change(name, { target: { value: appliedName } });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Description" }));
    fireEvent.change(within(dialog).getByLabelText("Waypoint Description"), {
      target: { value: appliedDescription },
    });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Advanced" }));
    fireEvent.change(within(dialog).getByLabelText("Waypoint Blueprint ResRef"), {
      target: { value: appliedTemplateResRef },
    });
    fireEvent.click(within(dialog).getByLabelText("Waypoint Contains a Map Note"));
    fireEvent.change(within(dialog).getByLabelText("Waypoint Map Note Text"), {
      target: { value: appliedMapNote },
    });
    fireEvent.click(within(dialog).getByLabelText("Waypoint Map Note Enabled"));
    fireEvent.change(within(dialog).getByLabelText("Waypoint variable 1 value"), {
      target: { value: "2" },
    });
    fireEvent.click(within(dialog).getByRole("tab", { name: "Comments" }));
    fireEvent.change(within(dialog).getByLabelText("Waypoint Comments"), {
      target: { value: appliedComment },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(tag).toHaveValue(appliedValue));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    dialog = await openWaypointProperties();
    expect(within(dialog).getByLabelText("Waypoint Tag")).toHaveValue(appliedValue);
    expect(within(dialog).getByLabelText("Waypoint Name")).toHaveValue(appliedName);
    fireEvent.click(within(dialog).getByRole("tab", { name: "Description" }));
    expect(within(dialog).getByLabelText("Waypoint Description"))
      .toHaveValue(appliedDescription);
    fireEvent.click(within(dialog).getByRole("tab", { name: "Advanced" }));
    expect(within(dialog).getByLabelText("Waypoint Blueprint ResRef"))
      .toHaveValue(appliedTemplateResRef);
    expect(within(dialog).getByLabelText("Waypoint Contains a Map Note"))
      .toBeChecked();
    expect(within(dialog).getByLabelText("Waypoint Map Note Text"))
      .toHaveValue(appliedMapNote);
    expect(within(dialog).getByLabelText("Waypoint Map Note Enabled"))
      .not.toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: "Variables... (1)" }));
    expect(within(dialog).getByLabelText("Waypoint variable 1 value")).toHaveValue(2);
    fireEvent.click(within(dialog).getByRole("tab", { name: "Comments" }));
    expect(within(dialog).getByLabelText("Waypoint Comments"))
      .toHaveValue(appliedComment);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const waypoint = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(waypoint?.tag).toBe(appliedValue);
      expect(waypoint?.resRef).toBe(SOURCE_TEMPLATE_RESREF);
      expect(waypoint?.waypointTemplateResRef).toBe(appliedTemplateResRef);
      expect(waypoint?.waypointLocalizedName).toBe(appliedName);
      expect(waypoint?.waypointDescription).toBe(appliedDescription);
      expect(waypoint?.waypointMapNote).toEqual({
        hasMapNote: true,
        mapNoteText: appliedMapNote,
        mapNoteEnabled: false,
      });
      expect(waypoint?.waypointEditorComment).toBe(appliedComment);
      expect(waypoint?.waypointVariables).toEqual([
        { name: "counter", type: "int", value: 2 },
      ]);
      expect(waypoint?.name).toBe(appliedName);
      expect(waypoint?.source?.waypointTag).toEqual({
        present: true,
        value: SOURCE_TAG,
      });
      expect(waypoint?.source?.waypointTemplateResRef).toEqual({
        present: true,
        nativeType: "resref",
        value: SOURCE_TEMPLATE_RESREF,
      });
      expect(waypoint?.source?.waypointLocalizedNameStorage).toEqual({
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIFBvaW50" }],
      });
      expect(waypoint?.source?.waypointDescriptionStorage).toEqual({
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "UGF0cm9sIHJvdXRl" }],
      });
      expect(waypoint?.source?.waypointMapNoteStorage).toEqual({
        hasMapNoteByte: 0,
        mapNoteStorage: {
          present: true,
          strRef: 0xffff_ffff,
          entries: [{ languageId: 0, textBytesBase64: "T2xkIG1hcmtlcg==" }],
        },
        mapNoteEnabledByte: 1,
      });
      expect(waypoint?.source?.waypointEditorComment).toBe(SOURCE_COMMENT);
      expect(waypoint?.source?.waypointVariables).toEqual({ expectedEntries: [
        { sourceIndex: 0, name: "counter", type: "int", value: 1 },
      ] });
    });
  });
});
