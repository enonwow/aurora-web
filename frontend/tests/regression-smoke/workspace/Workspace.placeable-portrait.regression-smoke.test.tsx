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
const TABLE_SHA256 = "a".repeat(64);

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

function seedExactPlaceablePortraitDraft() {
  const scene = createSeedAreaScene();
  const placeable = scene.objects.find((object) => object.tag === "PLC_BARREL_01");
  if (!placeable?.placeableProperties) {
    throw new Error("Expected seed Placeable fixture.");
  }
  scene.placeablePortraitCatalog = {
    descriptor: {
      resourceName: "portraits.2da",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/portraits.2da",
      sourceLayer: "vanilla",
      sha256: TABLE_SHA256,
      sizeBytes: 944_115,
      rowCount: 16_001,
    },
    rows: [
      { rowIndex: 462, baseResRef: "plc_n02_" },
      { rowIndex: 15_157, baseResRef: "plc_dagflag" },
    ],
  };
  placeable.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "placeable",
    sourceObjectId: "placeable:0:plc_barrel_01:source",
    sourceIndex: 0,
    placeablePortrait: {
      expectedValue: 462,
      tableSha256: TABLE_SHA256,
      tableRowCount: 16_001,
    },
  };
  placeable.placeableProperties.advancedSettings = {
    ...(placeable.placeableProperties.advancedSettings ?? {}),
    portraitId: 462,
    portraitResRef: "plc_n02_",
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

describe("Regression smoke: retained Placeable PortraitId", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceablePortraitDraft();
  });

  it("keeps exact sparse portrait identity through Apply, Cancel, OK, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableAdvancedTab();
    let portrait = within(dialog).getByLabelText("Portrait");
    expect(portrait).toBeEnabled();
    expect(portrait).toHaveValue("462");
    expect(Array.from(portrait.querySelectorAll("option"), (option) => option.textContent))
      .toEqual(["462: plc_n02_", "15157: plc_dagflag"]);

    fireEvent.change(portrait, { target: { value: "15157" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(portrait).toHaveValue("15157"));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    portrait = within(dialog).getByLabelText("Portrait");
    expect(portrait).toHaveValue("15157");
    fireEvent.change(portrait, { target: { value: "462" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    portrait = within(dialog).getByLabelText("Portrait");
    expect(portrait).toHaveValue("15157");
    fireEvent.change(portrait, { target: { value: "462" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    expect(within(dialog).getByLabelText("Portrait")).toHaveValue("462");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.placeableProperties?.advancedSettings).toMatchObject({
        portraitId: 462,
        portraitResRef: "plc_n02_",
      });
      expect(placeable?.source?.placeablePortrait).toEqual({
        expectedValue: 462,
        tableSha256: TABLE_SHA256,
        tableRowCount: 16_001,
      });
      expect(saved?.placeablePortraitCatalog?.descriptor.sha256).toBe(TABLE_SHA256);
    });
  });
});
