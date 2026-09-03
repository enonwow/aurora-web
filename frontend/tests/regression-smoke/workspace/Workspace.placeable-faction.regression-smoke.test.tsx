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
const CATALOG_SHA256 = "f".repeat(64);

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

function seedExactPlaceableFactionDraft() {
  const scene = createSeedAreaScene();
  const placeable = scene.objects.find((object) => object.tag === "PLC_BARREL_01");
  if (!placeable?.placeableProperties) {
    throw new Error("Expected seed Placeable fixture.");
  }
  scene.placeableFactionCatalog = {
    descriptor: {
      resourceName: "repute.fac",
      sourceObjectKey: "modules/current/repute.fac",
      sha256: CATALOG_SHA256,
      sizeBytes: 1889,
      factionCount: 3,
    },
    rows: [
      { factionId: 0, name: "PC", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 1, name: "Hostile", parentFactionId: 0xffff_ffff, isGlobal: true },
      { factionId: 2, name: "Commoner", parentFactionId: 0xffff_ffff, isGlobal: true },
    ],
  };
  placeable.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "placeable",
    sourceObjectId: "placeable:0:plc_barrel_01:source",
    sourceIndex: 0,
    placeableFaction: {
      expectedValue: 1,
      catalogSha256: CATALOG_SHA256,
      catalogFactionCount: 3,
    },
  };
  placeable.placeableProperties.advancedSettings = {
    ...(placeable.placeableProperties.advancedSettings ?? {}),
    factionId: 1,
    belongsToFaction: "Hostile",
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

describe("Regression smoke: retained Placeable Faction", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceableFactionDraft();
  });

  it("keeps exact physical faction identity through Apply, Cancel, OK, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableAdvancedTab();
    let faction = within(dialog).getByLabelText("Belongs To Faction");
    expect(faction).toBeEnabled();
    expect(faction).toHaveValue("1");
    expect(Array.from(faction.querySelectorAll("option"), (option) => option.textContent))
      .toEqual(["0: PC", "1: Hostile", "2: Commoner"]);

    fireEvent.change(faction, { target: { value: "2" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(faction).toHaveValue("2"));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    faction = within(dialog).getByLabelText("Belongs To Faction");
    expect(faction).toHaveValue("2");
    fireEvent.change(faction, { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    faction = within(dialog).getByLabelText("Belongs To Faction");
    expect(faction).toHaveValue("2");
    fireEvent.change(faction, { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableAdvancedTab();
    expect(within(dialog).getByLabelText("Belongs To Faction")).toHaveValue("0");
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.placeableProperties?.advancedSettings).toMatchObject({
        factionId: 0,
        belongsToFaction: "PC",
      });
      expect(placeable?.source?.placeableFaction).toEqual({
        expectedValue: 1,
        catalogSha256: CATALOG_SHA256,
        catalogFactionCount: 3,
      });
      expect(saved?.placeableFactionCatalog?.descriptor.sha256).toBe(CATALOG_SHA256);
    });
  });
});
