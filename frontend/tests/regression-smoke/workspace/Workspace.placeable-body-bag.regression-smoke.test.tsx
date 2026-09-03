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
const TABLE_SHA256 = "d".repeat(64);

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

function seedExactPlaceableBodyBagDraft() {
  const scene = createSeedAreaScene();
  const placeable = scene.objects.find((object) => object.tag === "PLC_BARREL_01");
  if (!placeable?.placeableProperties) {
    throw new Error("Expected seed Placeable fixture.");
  }
  scene.placeableBodyBagCatalog = {
    descriptor: {
      resourceName: "bodybag.2da",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/bodybag.2da",
      sourceLayer: "vanilla",
      sha256: TABLE_SHA256,
      sizeBytes: 502,
      rowCount: 2,
    },
    rows: [
      {
        rowIndex: 0,
        label: "default",
        nameStrRef: 6671,
        displayName: "Default",
        displaySource: "strref",
      },
      {
        rowIndex: 1,
        label: "Potion",
        nameStrRef: 66_483,
        displayName: "Potion",
        displaySource: "strref",
      },
    ],
  };
  placeable.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "placeable",
    sourceObjectId: "placeable:0:plc_barrel_01:source",
    sourceIndex: 0,
    placeableBodyBag: {
      expectedValue: 0,
      tableSha256: TABLE_SHA256,
      tableRowCount: 2,
    },
  };
  placeable.placeableProperties.advancedSettings = {
    ...(placeable.placeableProperties.advancedSettings ?? {}),
    treasureModelRow: 0,
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openPlaceableAdvancedTab() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  const dialog = await screen.findByRole("dialog", { name: /placeable properties/i });
  fireEvent.click(within(dialog).getByRole("button", { name: /^advanced$/i }));
  return dialog;
}

describe("Regression smoke: retained Placeable BodyBag", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceableBodyBagDraft();
  });

  it("keeps exact physical Treasure Model identity through Apply, Cancel, OK, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableAdvancedTab();
    let treasureModel = within(dialog).getByLabelText("Treasure Model");
    expect(treasureModel).toBeEnabled();
    expect(treasureModel).toHaveValue("0");
    expect(Array.from(treasureModel.querySelectorAll("option"), (option) => option.textContent))
      .toEqual(["0: Default", "1: Potion"]);

    fireEvent.change(treasureModel, { target: { value: "1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(treasureModel).toHaveValue("1"));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    treasureModel = within(dialog).getByLabelText("Treasure Model");
    expect(treasureModel).toHaveValue("1");
    fireEvent.change(treasureModel, { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    treasureModel = within(dialog).getByLabelText("Treasure Model");
    expect(treasureModel).toHaveValue("1");
    fireEvent.change(treasureModel, { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    expect(within(dialog).getByLabelText("Treasure Model")).toHaveValue("0");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.placeableProperties?.advancedSettings?.treasureModelRow).toBe(0);
      expect(placeable?.source?.placeableBodyBag).toEqual({
        expectedValue: 0,
        tableSha256: TABLE_SHA256,
        tableRowCount: 2,
      });
      expect(saved?.placeableBodyBagCatalog?.descriptor.sha256).toBe(TABLE_SHA256);
    });
  });
});
