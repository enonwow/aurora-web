import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import {
  loadLocalSceneDraft,
  saveLocalSceneDraft,
} from "../../../src/modules/scene/adapters/localDraftStore";
import { createSeedAreaScene } from "../../../src/modules/scene/domain/sceneFactory";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

const USER_ID = "u_builder_001";
const SOURCE_OBJECT_ID = "trigger:0:newgeneric:source";
const SOURCE_TAG = "GenericTrigger";
const SOURCE_TEMPLATE_RESREF = "newgeneric";
const SOURCE_LOCALIZED_NAME = "Gate Trigger";
const SOURCE_EDITOR_COMMENT = " source gate note ";
const SOURCE_TRIGGER_SCRIPTS = {
  onDisarm: "On_Disarm",
  onTrapTriggered: "trg_trap",
  onClick: "",
  onHeartbeat: "trg_heartbeat",
  onEnter: "trg_enter",
  onExit: "trg_exit",
  onUserDefined: "trg_user",
};
const SOURCE_TRIGGER_TRANSITION_STORAGE = {
  linkedTo: "east_gate",
  linkedToFlags: 2,
  loadScreenId: 7,
};

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

function seedExactTriggerTagDraft() {
  const scene = createSeedAreaScene();
  const geometry = polygon([[0, 0, 0], [4, 0, 0], [0, 2, 0]]);
  scene.objects.push({
    id: "trigger-0",
    kind: "triggers",
    resRef: SOURCE_TEMPLATE_RESREF,
    tag: SOURCE_TAG,
    triggerTemplateResRef: SOURCE_TEMPLATE_RESREF,
    triggerLocalizedName: SOURCE_LOCALIZED_NAME,
    triggerEditorComment: SOURCE_EDITOR_COMMENT,
    triggerScriptResRefs: { ...SOURCE_TRIGGER_SCRIPTS },
    triggerTransitionStorage: { ...SOURCE_TRIGGER_TRANSITION_STORAGE },
    x: 1,
    y: 2,
    z: 0,
    bearing: 0,
    visualTransform: {
      scale: 1,
      offsetX: 0,
      offsetY: 0,
      offsetZ: 0,
      pitch: 0,
      yaw: 0,
      roll: 0,
    },
    polygonGeometry: geometry,
    source: {
      type: "aurora_git",
      areaId: scene.sceneId,
      sourceKind: "trigger",
      sourceObjectId: SOURCE_OBJECT_ID,
      sourceIndex: 0,
      triggerTag: { present: true, value: SOURCE_TAG },
      triggerTemplateResRef: {
        present: true,
        nativeType: "resref",
        value: SOURCE_TEMPLATE_RESREF,
      },
      triggerLocalizedNameStorage: {
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
      },
      triggerEditorComment: SOURCE_EDITOR_COMMENT,
      triggerScriptResRefsStorage: { ...SOURCE_TRIGGER_SCRIPTS },
      triggerTransitionStorage: { ...SOURCE_TRIGGER_TRANSITION_STORAGE },
      polygonGeometry: geometry,
    },
  });
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openTriggerProperties() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", {
    name: /generictrigger|area_exit/i,
  });
  const item = row.closest("li");
  if (!item) throw new Error("Expected retained Trigger row.");
  fireEvent.click(
    within(item).getByRole("button", { name: /open object properties/i }),
  );
  return screen.findByRole("dialog", { name: /trigger properties/i });
}

describe("Regression smoke: retained Trigger identity", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactTriggerTagDraft();
  });

  it("preserves exact Trigger identity and event-script provenance through Apply, Cancel, reopen, OK, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openTriggerProperties();
    let tag = within(dialog).getByLabelText("Trigger Tag");
    let templateResRef = within(dialog).getByLabelText("Trigger Template ResRef");
    let localizedName = within(dialog).getByLabelText("Trigger Name");
    let editorComment = within(dialog).getByLabelText("Trigger Comments");
    let onClickScript = within(dialog).getByLabelText("Trigger On Click Script");
    let onEnterScript = within(dialog).getByLabelText("Trigger On Enter Script");
    let linkedTo = within(dialog).getByLabelText("Trigger Raw LinkedTo");
    let linkedToFlags = within(dialog).getByLabelText("Trigger Raw LinkedToFlags");
    let loadScreenId = within(dialog).getByLabelText("Trigger Raw LoadScreenID");
    expect(tag).toBeEnabled();
    expect(tag).toHaveAttribute("maxLength", "32");
    expect(templateResRef).toBeEnabled();
    expect(templateResRef).toHaveAttribute("maxLength", "16");
    expect(localizedName).toBeEnabled();
    expect(localizedName).toHaveAttribute("maxLength", "256");
    expect(editorComment).toBeEnabled();
    expect(editorComment).toHaveAttribute("maxLength", "4096");
    expect(onClickScript).toBeEnabled();
    expect(onClickScript).toHaveAttribute("maxLength", "16");
    expect(linkedTo).toBeEnabled();
    expect(linkedTo).toHaveAttribute("maxLength", "256");
    expect(linkedToFlags).toBeEnabled();
    expect(loadScreenId).toBeEnabled();
    expect(within(dialog).getAllByText("ACTIVE_NOW")).toHaveLength(14);
    const appliedValue = "  AREA_EXIT  ";
    const appliedTemplateResRef = "custom_trigger";
    const appliedLocalizedName = " Inner Gate Trigger ";
    const appliedEditorComment = "  updated gate note  ";
    const appliedOnClickScript = "trg_click";
    const appliedOnEnterScript = "new_enter";
    const appliedLinkedTo = "crypt_exit";
    const appliedLinkedToFlags = 4;
    const appliedLoadScreenId = 321;
    fireEvent.change(tag, { target: { value: appliedValue } });
    fireEvent.change(templateResRef, { target: { value: appliedTemplateResRef } });
    fireEvent.change(localizedName, { target: { value: appliedLocalizedName } });
    fireEvent.change(editorComment, { target: { value: appliedEditorComment } });
    fireEvent.change(onClickScript, { target: { value: appliedOnClickScript } });
    fireEvent.change(onEnterScript, { target: { value: appliedOnEnterScript } });
    fireEvent.change(linkedTo, { target: { value: appliedLinkedTo } });
    fireEvent.change(linkedToFlags, { target: { value: String(appliedLinkedToFlags) } });
    fireEvent.change(loadScreenId, { target: { value: String(appliedLoadScreenId) } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(tag).toHaveValue(appliedValue));
    expect(templateResRef).toHaveValue(appliedTemplateResRef);
    expect(localizedName).toHaveValue(appliedLocalizedName);
    expect(editorComment).toHaveValue(appliedEditorComment);
    expect(onClickScript).toHaveValue(appliedOnClickScript);
    expect(onEnterScript).toHaveValue(appliedOnEnterScript);
    expect(linkedTo).toHaveValue(appliedLinkedTo);
    expect(linkedToFlags).toHaveValue(appliedLinkedToFlags);
    expect(loadScreenId).toHaveValue(appliedLoadScreenId);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openTriggerProperties();
    tag = within(dialog).getByLabelText("Trigger Tag");
    templateResRef = within(dialog).getByLabelText("Trigger Template ResRef");
    localizedName = within(dialog).getByLabelText("Trigger Name");
    editorComment = within(dialog).getByLabelText("Trigger Comments");
    onClickScript = within(dialog).getByLabelText("Trigger On Click Script");
    onEnterScript = within(dialog).getByLabelText("Trigger On Enter Script");
    linkedTo = within(dialog).getByLabelText("Trigger Raw LinkedTo");
    linkedToFlags = within(dialog).getByLabelText("Trigger Raw LinkedToFlags");
    loadScreenId = within(dialog).getByLabelText("Trigger Raw LoadScreenID");
    expect(tag).toHaveValue(appliedValue);
    expect(templateResRef).toHaveValue(appliedTemplateResRef);
    expect(localizedName).toHaveValue(appliedLocalizedName);
    expect(editorComment).toHaveValue(appliedEditorComment);
    expect(onClickScript).toHaveValue(appliedOnClickScript);
    expect(onEnterScript).toHaveValue(appliedOnEnterScript);
    expect(linkedTo).toHaveValue(appliedLinkedTo);
    expect(linkedToFlags).toHaveValue(appliedLinkedToFlags);
    expect(loadScreenId).toHaveValue(appliedLoadScreenId);
    fireEvent.change(tag, { target: { value: "DISCARDED" } });
    fireEvent.change(templateResRef, { target: { value: "discarded" } });
    fireEvent.change(localizedName, { target: { value: "Discarded" } });
    fireEvent.change(editorComment, { target: { value: "discarded" } });
    fireEvent.change(onClickScript, { target: { value: "discarded" } });
    fireEvent.change(onEnterScript, { target: { value: "discarded" } });
    fireEvent.change(linkedTo, { target: { value: "discarded" } });
    fireEvent.change(linkedToFlags, { target: { value: "9" } });
    fireEvent.change(loadScreenId, { target: { value: "999" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openTriggerProperties();
    expect(within(dialog).getByLabelText("Trigger Tag")).toHaveValue(appliedValue);
    expect(within(dialog).getByLabelText("Trigger Template ResRef"))
      .toHaveValue(appliedTemplateResRef);
    expect(within(dialog).getByLabelText("Trigger Name"))
      .toHaveValue(appliedLocalizedName);
    expect(within(dialog).getByLabelText("Trigger Comments"))
      .toHaveValue(appliedEditorComment);
    expect(within(dialog).getByLabelText("Trigger On Click Script"))
      .toHaveValue(appliedOnClickScript);
    expect(within(dialog).getByLabelText("Trigger On Enter Script"))
      .toHaveValue(appliedOnEnterScript);
    expect(within(dialog).getByLabelText("Trigger Raw LinkedTo"))
      .toHaveValue(appliedLinkedTo);
    expect(within(dialog).getByLabelText("Trigger Raw LinkedToFlags"))
      .toHaveValue(appliedLinkedToFlags);
    expect(within(dialog).getByLabelText("Trigger Raw LoadScreenID"))
      .toHaveValue(appliedLoadScreenId);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const trigger = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(trigger?.tag).toBe(appliedValue);
      expect(trigger?.triggerTemplateResRef).toBe(appliedTemplateResRef);
      expect(trigger?.triggerLocalizedName).toBe(appliedLocalizedName);
      expect(trigger?.triggerEditorComment).toBe(appliedEditorComment);
      expect(trigger?.triggerScriptResRefs).toEqual({
        ...SOURCE_TRIGGER_SCRIPTS,
        onDisarm: "on_disarm",
        onClick: appliedOnClickScript,
        onEnter: appliedOnEnterScript,
      });
      expect(trigger?.triggerTransitionStorage).toEqual({
        linkedTo: appliedLinkedTo,
        linkedToFlags: appliedLinkedToFlags,
        loadScreenId: appliedLoadScreenId,
      });
      expect(trigger?.resRef).toBe(SOURCE_TEMPLATE_RESREF);
      expect(trigger?.source?.triggerTag).toEqual({
        present: true,
        value: SOURCE_TAG,
      });
      expect(trigger?.source?.triggerTemplateResRef).toEqual({
        present: true,
        nativeType: "resref",
        value: SOURCE_TEMPLATE_RESREF,
      });
      expect(trigger?.source?.triggerLocalizedNameStorage).toEqual({
        present: true,
        strRef: 0xffff_ffff,
        entries: [{ languageId: 0, textBytesBase64: "R2F0ZSBUcmlnZ2Vy" }],
      });
      expect(trigger?.source?.triggerEditorComment).toBe(SOURCE_EDITOR_COMMENT);
      expect(trigger?.source?.triggerScriptResRefsStorage)
        .toEqual(SOURCE_TRIGGER_SCRIPTS);
      expect(trigger?.source?.triggerTransitionStorage)
        .toEqual(SOURCE_TRIGGER_TRANSITION_STORAGE);
    });
  });
});

function polygon(points: ReadonlyArray<readonly [number, number, number]>) {
  return {
    coordinateSpace: "native_local" as const,
    points: points.map(([x, y, z]) => ({
      x: Math.fround(x),
      y: Math.fround(y),
      z: Math.fround(z),
    })),
  };
}
