import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DoorPropertiesDialog } from "../../../../../../src/modules/layout/components/properties/DoorPropertiesDialog";
import { buildDoorPropertiesDraft } from "../../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { createNewSceneObject } from "../../../../../../src/modules/scene/domain/sceneFactory";

describe("DoorPropertiesDialog exact transition storage", () => {
  it("activates only the three exact native storage controls for a provenance-bound Door", () => {
    const door = existingDoorWithStorage();
    const update = vi.fn();
    render(<DoorPropertiesDialog
      {...requiredProps(door, update)}
    />);

    expect(screen.getByLabelText("LinkedTo")).toHaveValue(" TARGET DEST ");
    expect(screen.getByLabelText("LinkedTo")).toBeEnabled();
    expect(screen.getByLabelText("LinkedToFlags")).toHaveValue(2);
    expect(screen.getByLabelText("LoadScreenID")).toHaveValue(7);
    expect(screen.getByLabelText("Destination Tag")).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Setup Area Transition" })).toBeNull();

    fireEvent.change(screen.getByLabelText("LinkedTo"), {
      target: { value: " EXACT WITH SPACES " },
    });
    expect(update).toHaveBeenCalledWith("linkedTo", " EXACT WITH SPACES ");
  });

  it("keeps exact native controls disabled when immutable GIT provenance is unavailable", () => {
    const door = createNewSceneObject("doors", 1, 2, 42);
    render(<DoorPropertiesDialog
      {...requiredProps(door, vi.fn())}
    />);

    expect(screen.getByLabelText("LinkedTo")).toBeDisabled();
    expect(screen.getByLabelText("LinkedToFlags")).toBeDisabled();
    expect(screen.getByLabelText("LoadScreenID")).toBeDisabled();
    expect(screen.getByText(/exact storage authoring is unavailable/i)).toBeInTheDocument();
  });
});

function existingDoorWithStorage() {
  const door = createNewSceneObject("doors", 1, 2, 42);
  door.source = {
    type: "aurora_git",
    sourceKind: "door",
    sourceIndex: 0,
    sourceObjectId: "obj_door_0",
    doorTransitionStorage: { linkedTo: " SOURCE DEST ", linkedToFlags: 1, loadScreenId: 0 },
  };
  door.doorTransition = {
    linkedTarget: "legacy",
    linkedModule: "legacy_module",
    linkedTag: "legacy_tag",
    linkedWaypoint: "legacy_waypoint",
    loadScreen: "legacy_screen",
    flags: { legacy: true },
    storage: { linkedTo: " TARGET DEST ", linkedToFlags: 2, loadScreenId: 7 },
  };
  return door;
}

function requiredProps(
  door: ReturnType<typeof createNewSceneObject>,
  updateDoorTransitionDraftField: ReturnType<typeof vi.fn>,
) {
  return {
    doorPropertiesDialog: {
      objectId: door.id,
      snapshotObject: door,
      draft: buildDoorPropertiesDraft(door),
      activeTab: "areaTransition" as const,
      windowX: 10,
      windowY: 10,
      anchorOffsetX: 0,
      anchorOffsetY: 0,
      collapsed: false,
    },
    toggleDoorPropertiesDialogCollapsed: vi.fn(),
    cancelDoorPropertiesDialog: vi.fn(),
    setDoorPropertiesActiveTab: vi.fn(),
    updateDoorPropertiesDraftField: vi.fn(),
    updateDoorLockDraftField: vi.fn(),
    updateDoorTrapDraftField: vi.fn(),
    updateDoorScriptSlotDraftField: vi.fn(),
    updateDoorAdvancedDraftField: vi.fn(),
    updateDoorTransitionDraftField,
    applyDoorPropertiesDraft: vi.fn(),
  };
}
