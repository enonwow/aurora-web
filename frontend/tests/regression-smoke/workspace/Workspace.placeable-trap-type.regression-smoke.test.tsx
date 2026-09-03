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
const TABLE_SHA256 = "c".repeat(64);

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

function seedExactPlaceableTrapTypeDraft() {
  const scene = createSeedAreaScene();
  const placeable = scene.objects.find((object) => object.tag === "PLC_BARREL_01");
  if (!placeable?.placeableProperties) {
    throw new Error("Expected seed Placeable fixture.");
  }
  scene.placeableTrapTypeCatalog = {
    descriptor: {
      resourceName: "traps.2da",
      sourceObjectKey: "modules/current/__aurora/sources/vanilla/traps.2da",
      sourceLayer: "vanilla",
      sha256: TABLE_SHA256,
      sizeBytes: 2048,
      rowCount: 2,
    },
    rows: [
      {
        rowIndex: 0,
        label: "MinorSpike",
        trapNameStrRef: 100,
        setDc: 10,
        detectDcMod: 1,
        disarmDcMod: 2,
        displayName: "Spike Trap, Minor",
        displaySource: "strref",
      },
      {
        rowIndex: 1,
        label: "DeadlySpike",
        trapNameStrRef: 101,
        setDc: 20,
        detectDcMod: 3,
        disarmDcMod: 4,
        displayName: "Spike Trap, Deadly",
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
    placeableTrapType: {
      expectedValue: 0,
      tableSha256: TABLE_SHA256,
      tableRowCount: 2,
    },
  };
  placeable.placeableProperties.trapSettings = {
    ...(placeable.placeableProperties.trapSettings ?? {}),
    trapTypeRow: 0,
    setDc: 10,
    detectDcModWhenSetByRogue: 1,
    disarmDcModWhenSetByRogue: 2,
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openPlaceableTrapTab() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /plc_barrel_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  const dialog = await screen.findByRole("dialog", { name: /placeable properties/i });
  fireEvent.click(within(dialog).getByRole("button", { name: /^trap$/i }));
  return dialog;
}

describe("Regression smoke: retained Placeable TrapType", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactPlaceableTrapTypeDraft();
  });

  it("keeps the exact physical row and derived columns through Apply, Cancel, OK, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openPlaceableTrapTab();
    let trapType = within(dialog).getByLabelText("Trap Type");
    expect(trapType).toBeEnabled();
    expect(trapType).toHaveValue("0");
    expect(Array.from(trapType.querySelectorAll("option"), (option) => option.textContent))
      .toEqual(["0: Spike Trap, Minor", "1: Spike Trap, Deadly"]);
    expect(within(dialog).getByLabelText("Set DC")).toHaveValue(10);
    expect(within(dialog).getByLabelText("Detect DC Mod. when set by Rogue")).toHaveValue(1);
    expect(within(dialog).getByLabelText("Disarm DC Mod. when set by Rogue")).toHaveValue(2);

    fireEvent.change(trapType, { target: { value: "1" } });
    expect(within(dialog).getByLabelText("Set DC")).toHaveValue(20);
    expect(within(dialog).getByLabelText("Detect DC Mod. when set by Rogue")).toHaveValue(3);
    expect(within(dialog).getByLabelText("Disarm DC Mod. when set by Rogue")).toHaveValue(4);
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(trapType).toHaveValue("1"));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableTrapTab();
    trapType = within(dialog).getByLabelText("Trap Type");
    expect(trapType).toHaveValue("1");
    fireEvent.change(trapType, { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableTrapTab();
    trapType = within(dialog).getByLabelText("Trap Type");
    expect(trapType).toHaveValue("1");
    fireEvent.change(trapType, { target: { value: "0" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /placeable properties/i }))
        .not.toBeInTheDocument();
    });

    dialog = await openPlaceableTrapTab();
    expect(within(dialog).getByLabelText("Trap Type")).toHaveValue("0");
    expect(within(dialog).getByLabelText("Set DC")).toHaveValue(10);
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const placeable = saved?.objects.find((object) => object.tag === "PLC_BARREL_01");
      expect(placeable?.placeableProperties?.trapSettings).toMatchObject({
        trapTypeRow: 0,
        setDc: 10,
        detectDcModWhenSetByRogue: 1,
        disarmDcModWhenSetByRogue: 2,
      });
      expect(placeable?.source?.placeableTrapType).toEqual({
        expectedValue: 0,
        tableSha256: TABLE_SHA256,
        tableRowCount: 2,
      });
      expect(saved?.placeableTrapTypeCatalog?.descriptor.sha256).toBe(TABLE_SHA256);
    });
  });
});
