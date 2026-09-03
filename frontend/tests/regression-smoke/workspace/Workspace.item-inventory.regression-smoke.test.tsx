import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import {
  loadLocalSceneDraft,
  saveLocalSceneDraft,
} from "../../../src/modules/scene/adapters/localDraftStore";
import { createSeedAreaScene } from "../../../src/modules/scene/domain/sceneFactory";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

const USER_ID = "u_builder_001";
const SOURCE_OBJECT_ID = "item:0:nw_it_mpotion001:inventory";
const SOURCE_INVENTORY = [
  { sourceIndex: 0, resRef: "nw_it_gold001", x: 1, y: 2 },
  { sourceIndex: 1, resRef: "nw_it_gem001", x: 3, y: 4 },
] as const;

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

function seedExactItemInventoryDraft() {
  const scene = createSeedAreaScene();
  const item = scene.objects.find((object) => object.tag === "ITEM_CHEST_01");
  if (!item) throw new Error("Expected seed Item fixture.");
  item.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "item",
    sourceObjectId: SOURCE_OBJECT_ID,
    sourceIndex: 0,
    itemInventoryItems: SOURCE_INVENTORY.map((entry) => ({ ...entry })),
  };
  item.itemProperties = {
    ...(item.itemProperties ?? {}),
    inventoryItems: SOURCE_INVENTORY.map((entry) => ({ ...entry })),
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

function seedExactAbsentItemInventoryDraft() {
  const scene = createSeedAreaScene();
  const item = scene.objects.find((object) => object.tag === "ITEM_CHEST_01");
  if (!item) throw new Error("Expected seed Item fixture.");
  item.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "item",
    sourceObjectId: SOURCE_OBJECT_ID,
    sourceIndex: 0,
    itemInventoryItems: [],
  };
  item.itemProperties = {
    ...(item.itemProperties ?? {}),
    inventoryItems: [],
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

function installExactItemCatalogFetch() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/catalog/items?") && !url.includes("/process")) {
      return new Response(JSON.stringify({
        data: {
          items: [{
            templateId: "itm_nw_cloth022",
            resref: "nw_cloth022",
            name: "Cloth Armor",
            category: "Armor",
            tags: [],
            previewImageUrl: "",
            metadata: {
              sourceObjectKey: "modules/current/items/nw_cloth022.uti",
              sourceSizeBytes: 4096,
              sourceSha256: "a".repeat(64),
              sourceExtension: "uti",
              sourceFileType: "UTI ",
              sourceFileVersion: "V3.2",
              sourceStructTypeId: 0xffffffff,
              templateResRef: "nw_cloth022",
              tag: "NW_CLOTH022",
            },
          }],
          total: 1,
          limit: 100,
          offset: 0,
        },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    throw new Error(`Unexpected regression fetch: ${url}`);
  }));
}

async function openItemInventory() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /item_chest_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  const dialog = await screen.findByRole("dialog", { name: /item properties/i });
  fireEvent.click(within(dialog).getByRole("button", { name: /^properties$/i }));
  return dialog;
}

describe("Regression smoke: retained ground-item ItemList", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactItemInventoryDraft();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("preserves immutable CAS source through coordinate, reorder, remove, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openItemInventory();
    expect(within(dialog).getByLabelText("Item inventory 1 resref")).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText("Item inventory 1 repo x"), {
      target: { value: "12" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move inventory item 1 down",
    }));
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Remove inventory item 1",
    }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Item inventory 1 resref"))
        .toHaveValue("nw_it_gold001");
      expect(within(dialog).getByLabelText("Item inventory 1 repo x")).toHaveValue(12);
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemInventory();
    expect(within(dialog).getByLabelText("Item inventory 1 resref"))
      .toHaveValue("nw_it_gold001");
    expect(within(dialog).getByLabelText("Item inventory 1 repo x")).toHaveValue(12);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const item = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(item?.source?.itemInventoryItems).toEqual(SOURCE_INVENTORY);
      expect(item?.itemProperties?.inventoryItems).toEqual([
        { sourceIndex: 0, resRef: "nw_it_gold001", x: 12, y: 2 },
      ]);
    });
  });

  it("adds an exact catalog UTI to an absent ItemList and preserves it through reopen and Save", async () => {
    window.localStorage.clear();
    seedExactAbsentItemInventoryDraft();
    installExactItemCatalogFetch();
    renderAtPath("/login");
    await signInAsBuilder();
    fireEvent.click(await screen.findByRole("tab", { name: "Add Objects" }));

    let dialog = await openItemInventory();
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Inventory UTI template"))
        .toHaveValue("itm_template_itm_nw_cloth022");
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Add catalog inventory item",
    }));
    expect(within(dialog).getByLabelText("Item inventory 1 resref"))
      .toHaveValue("nw_cloth022");
    fireEvent.change(within(dialog).getByLabelText("Item inventory 1 repo x"), {
      target: { value: "12" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => {
      expect(within(dialog).getByLabelText("Item inventory 1 repo x")).toHaveValue(12);
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemInventory();
    expect(within(dialog).getByLabelText("Item inventory 1 resref"))
      .toHaveValue("nw_cloth022");
    expect(within(dialog).getByLabelText("Item inventory 1 repo x")).toHaveValue(12);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const item = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(item?.source?.itemInventoryItems).toEqual([]);
      expect(item?.itemProperties?.inventoryItems).toEqual([{
        resRef: "nw_cloth022",
        itemTemplateId: "itm_nw_cloth022",
        itemResRef: "nw_cloth022",
        itemSourceProfileId: "effective-catalog-uti-item-copy-v1",
        itemSourceObjectKey: "modules/current/items/nw_cloth022.uti",
        itemSourceSizeBytes: 4096,
        itemSourceFingerprint: "a".repeat(64),
        itemTag: "NW_CLOTH022",
        x: 12,
        y: 0,
      }]);
    });
  });
});
