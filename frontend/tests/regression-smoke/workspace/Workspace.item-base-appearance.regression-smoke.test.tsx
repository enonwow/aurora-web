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
const SOURCE_OBJECT_ID = "item:0:nw_it_mpotion001:base_appearance";

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

function seedExactItemBaseAppearanceDraft() {
  const scene = createSeedAreaScene();
  const item = scene.objects.find((object) => object.tag === "ITEM_CHEST_01");
  if (!item) throw new Error("Expected seed Item fixture.");
  scene.itemBaseItemCatalog = {
    descriptor: {
      resourceName: "baseitems.2da",
      sourceObjectKey: "modules/current/baseitems.2da",
      sourceLayer: "module",
      sha256: "b".repeat(64),
      sizeBytes: 4096,
      rowCount: 2,
    },
    rows: [
      { rowIndex: 0, modelType: 0, displayName: "Simple" },
      { rowIndex: 1, modelType: 2, itemClass: "WSwLs", displayName: "Weapon" },
    ],
  };
  item.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "item",
    sourceObjectId: SOURCE_OBJECT_ID,
    sourceIndex: 0,
    itemBaseAppearance: {
      expectedValue: {
        baseItem: 0,
        modelType: 0,
        appearance: { modelPart1: 66 },
      },
      tableSha256: "b".repeat(64),
      tableRowCount: 2,
    },
  };
  item.itemProperties = {
    ...(item.itemProperties ?? {}),
    baseItem: 0,
    modelPart1: 66,
    modelPart2: undefined,
    modelPart3: undefined,
    modelParts: [66],
    armorParts: undefined,
    materialColors: undefined,
    baseAppearance: {
      baseItem: 0,
      modelType: 0,
      appearance: { modelPart1: 66 },
    },
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openItemProperties() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /item_chest_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /item properties/i });
}

describe("Regression smoke: retained ground-item BaseItem/appearance", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactItemBaseAppearanceDraft();
  });

  it("requires a complete cross-ModelType vector and preserves immutable CAS provenance", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    const dialog = await openItemProperties();
    const baseItem = within(dialog).getByLabelText("Base Item");
    expect(baseItem).toBeEnabled();
    expect(baseItem.tagName).toBe("SELECT");

    fireEvent.change(baseItem, { target: { value: "1" } });
    expect(within(dialog).getByText("INCOMPLETE_BASE_APPEARANCE_TARGET"))
      .toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^apply$/i })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Visual" }));
    fireEvent.change(within(dialog).getByLabelText("Part 1"), { target: { value: "7" } });
    fireEvent.change(within(dialog).getByLabelText("Part 2"), { target: { value: "8" } });
    fireEvent.change(within(dialog).getByLabelText("Part 3"), { target: { value: "9" } });
    expect(within(dialog).queryByText("INCOMPLETE_BASE_APPEARANCE_TARGET"))
      .not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: /^apply$/i })).toBeEnabled();
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(within(dialog).getByLabelText("Part 3")).toHaveValue(9));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const savedItem = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(savedItem?.source?.itemBaseAppearance).toEqual({
        expectedValue: {
          baseItem: 0,
          modelType: 0,
          appearance: { modelPart1: 66 },
        },
        tableSha256: "b".repeat(64),
        tableRowCount: 2,
      });
      expect(savedItem?.itemProperties).toMatchObject({
        baseItem: 1,
        modelPart1: 7,
        modelPart2: 8,
        modelPart3: 9,
        modelParts: [7, 8, 9],
        baseAppearance: {
          baseItem: 1,
          modelType: 2,
          appearance: { modelPart1: 7, modelPart2: 8, modelPart3: 9 },
        },
      });
    });
  });
});
