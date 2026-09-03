import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { buildDoorPropertiesDraft } from "../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { DoorPropertiesDialog } from "../../src/modules/layout/components/properties/DoorPropertiesDialog";
import { createNewSceneObject } from "../../src/modules/scene/domain/sceneFactory";

describe("Area Door transition storage regression smoke", () => {
  it("keeps exact native authoring active while legacy aliases remain read-only", () => {
    const door = createNewSceneObject("doors", 1, 2, 7);
    door.source = {
      type: "aurora_git",
      sourceKind: "door",
      sourceIndex: 0,
      sourceObjectId: "obj_door_0",
      doorTransitionStorage: { linkedTo: "SOURCE", linkedToFlags: 1, loadScreenId: 0 },
    };
    door.doorTransition = {
      linkedTarget: "legacy-target",
      linkedModule: "legacy-module",
      linkedTag: "legacy-tag",
      linkedWaypoint: "legacy-waypoint",
      loadScreen: "legacy-screen",
      flags: {},
      storage: { linkedTo: "TARGET", linkedToFlags: 2, loadScreenId: 7 },
    };
    const update = vi.fn();

    render(<DoorPropertiesDialog
      doorPropertiesDialog={{
        objectId: door.id,
        snapshotObject: door,
        draft: buildDoorPropertiesDraft(door),
        activeTab: "areaTransition",
        windowX: 10,
        windowY: 10,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false,
      }}
      toggleDoorPropertiesDialogCollapsed={vi.fn()}
      cancelDoorPropertiesDialog={vi.fn()}
      setDoorPropertiesActiveTab={vi.fn()}
      updateDoorPropertiesDraftField={vi.fn()}
      updateDoorLockDraftField={vi.fn()}
      updateDoorTrapDraftField={vi.fn()}
      updateDoorScriptSlotDraftField={vi.fn()}
      updateDoorAdvancedDraftField={vi.fn()}
      updateDoorTransitionDraftField={update}
      applyDoorPropertiesDraft={vi.fn()}
    />);

    expect(screen.getByLabelText("LinkedTo")).toBeEnabled();
    expect(screen.getByLabelText("Destination Tag")).toHaveAttribute("readonly");
    fireEvent.change(screen.getByLabelText("LoadScreenID"), { target: { value: "42" } });
    expect(update).toHaveBeenCalledWith("loadScreenId", 42);
  });
});
