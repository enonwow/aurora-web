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
const SOURCE_OBJECT_ID = "item:0:nw_it_mpotion001:visual_transform";

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

function seedExactItemVisualTransformDraft() {
  const scene = createSeedAreaScene();
  const item = scene.objects.find((object) => object.tag === "ITEM_CHEST_01");
  if (!item) throw new Error("Expected seed Item fixture.");
  item.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "item",
    sourceObjectId: SOURCE_OBJECT_ID,
    sourceIndex: 0,
    itemVisualTransform: { present: false },
  };
  item.itemProperties = {
    ...(item.itemProperties ?? {}),
    visualTransform: { present: false },
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openItemAdjustLocation() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /item_chest_01/i });
  fireEvent.click(row);
  await waitFor(() => expect(row).toHaveAttribute("aria-selected", "true"));
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^adjust location$/i }));
  return screen.findByRole("dialog", { name: /adjust location/i });
}

function setSpinbutton(dialog: HTMLElement, name: RegExp, value: number) {
  fireEvent.change(within(dialog).getByRole("spinbutton", { name }), {
    target: { value: String(value) },
  });
}

describe("Regression smoke: retained ground-item static VisTransformList", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactItemVisualTransformDraft();
  });

  it("keeps immutable CAS source while Apply, reopen, and Save retain one coherent target", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openItemAdjustLocation();
    setSpinbutton(dialog, /^scale x$/i, 2);
    setSpinbutton(dialog, /^scale y$/i, 3);
    setSpinbutton(dialog, /^scale z$/i, 4);
    setSpinbutton(dialog, /^x rotation$/i, 45);
    setSpinbutton(dialog, /^y rotation$/i, -90);
    setSpinbutton(dialog, /^z rotation$/i, 180);
    setSpinbutton(dialog, /^x translation$/i, 2);
    setSpinbutton(dialog, /^y translation$/i, -3);
    setSpinbutton(dialog, /^z translation$/i, 4);
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));

    await waitFor(() => {
      expect(within(dialog).getByRole("spinbutton", { name: /^scale x$/i })).toHaveValue(2);
      expect(within(dialog).getByRole("spinbutton", { name: /^z rotation$/i })).toHaveValue(180);
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    dialog = await openItemAdjustLocation();
    expect(within(dialog).getByRole("spinbutton", { name: /^scale x$/i })).toHaveValue(2);
    expect(within(dialog).getByRole("spinbutton", { name: /^scale y$/i })).toHaveValue(3);
    expect(within(dialog).getByRole("spinbutton", { name: /^scale z$/i })).toHaveValue(4);
    expect(within(dialog).getByRole("spinbutton", { name: /^x rotation$/i })).toHaveValue(45);
    expect(within(dialog).getByRole("spinbutton", { name: /^y rotation$/i })).toHaveValue(-90);
    expect(within(dialog).getByRole("spinbutton", { name: /^z rotation$/i })).toHaveValue(180);
    expect(within(dialog).getByRole("spinbutton", { name: /^x translation$/i })).toHaveValue(2);
    expect(within(dialog).getByRole("spinbutton", { name: /^y translation$/i })).toHaveValue(-3);
    expect(within(dialog).getByRole("spinbutton", { name: /^z translation$/i })).toHaveValue(4);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const item = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(item?.source?.itemVisualTransform).toStrictEqual({ present: false });
      expect(item?.itemProperties?.visualTransform).toStrictEqual({
        present: true,
        value: {
          scaleX: 2,
          scaleY: 3,
          scaleZ: 4,
          rotateX: 45,
          rotateY: 180,
          rotateZ: -90,
          translateX: 2,
          translateY: -3,
          translateZ: 4,
        },
      });
      expect(item?.visualTransform).toMatchObject({
        scaleX: 2,
        scaleY: 3,
        scaleZ: 4,
        offsetX: 0.2,
        offsetY: -0.3,
        offsetZ: 0.4,
        pitch: Math.PI / 4,
        roll: Math.PI,
        yaw: -Math.PI / 2,
      });
    });
  }, 15000);
});
