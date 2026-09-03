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

function seedExactPlaceableDurabilitySaveDraft() {
  const scene = createSeedAreaScene();
  const placeable = scene.objects.find((object) => object.tag === "PLC_BARREL_01");
  if (!placeable?.placeableProperties) {
    throw new Error("Expected seed Placeable fixture.");
  }
  placeable.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "placeable",
    sourceObjectId: "placeable:0:plc_barrel_01:source",
    sourceIndex: 0,
    placeableDurabilitySaveBytes: {
      hardness: 5,
      fortitudeSave: 16,
      reflexSave: 0,
      willSave: 0,
    },
  };
  Object.assign(placeable.placeableProperties, {
    hardness: 5,
    fortitudeSave: 16,
    reflexSave: 0,
    willSave: 0,
  });
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openPlaceableBasicTab() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /placeable properties/i });
}

function fields(dialog: HTMLElement) {
  return {
    hardness: within(dialog).getByLabelText("Hardness"),
    fortitudeSave: within(dialog).getByLabelText("Fortitude Save"),
    reflexSave: within(dialog).getByLabelText("Reflex Save"),
    willSave: within(dialog).getByLabelText("Will Save"),
  };
}

describe("Regression smoke: retained Placeable durability/save Bytes", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceableDurabilitySaveDraft();
  });

  it("keeps all four native Bytes through Apply, Cancel, OK, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableBasicTab();
    let inputs = fields(dialog);
    expect(inputs.hardness).toHaveValue(5);
    expect(inputs.fortitudeSave).toHaveValue(16);
    expect(inputs.reflexSave).toHaveValue(0);
    expect(inputs.willSave).toHaveValue(0);
    for (const input of Object.values(inputs)) expect(input).toBeEnabled();

    fireEvent.change(inputs.hardness, { target: { value: "8" } });
    fireEvent.change(inputs.fortitudeSave, { target: { value: "20" } });
    fireEvent.change(inputs.reflexSave, { target: { value: "12" } });
    fireEvent.change(inputs.willSave, { target: { value: "10" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(inputs.willSave).toHaveValue(10));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableBasicTab();
    inputs = fields(dialog);
    expect(inputs.hardness).toHaveValue(8);
    expect(inputs.fortitudeSave).toHaveValue(20);
    expect(inputs.reflexSave).toHaveValue(12);
    expect(inputs.willSave).toHaveValue(10);
    fireEvent.change(inputs.hardness, { target: { value: "5" } });
    fireEvent.change(inputs.fortitudeSave, { target: { value: "16" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableBasicTab();
    inputs = fields(dialog);
    expect(inputs.hardness).toHaveValue(8);
    expect(inputs.fortitudeSave).toHaveValue(20);
    fireEvent.change(inputs.hardness, { target: { value: "9" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableBasicTab();
    inputs = fields(dialog);
    expect(inputs.hardness).toHaveValue(9);
    expect(inputs.fortitudeSave).toHaveValue(20);
    expect(inputs.reflexSave).toHaveValue(12);
    expect(inputs.willSave).toHaveValue(10);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.placeableProperties).toMatchObject({
        hardness: 9,
        fortitudeSave: 20,
        reflexSave: 12,
        willSave: 10,
      });
      expect(placeable?.source?.placeableDurabilitySaveBytes).toEqual({
        hardness: 5,
        fortitudeSave: 16,
        reflexSave: 0,
        willSave: 0,
      });
    });
  });
});
