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

const sourceInstanceState = {
  presentFields: [
    "charges",
    "cost",
    "stolen",
    "stackSize",
    "plot",
    "addCost",
    "identified",
    "cursed",
  ],
  values: {
    charges: 7,
    cost: 100,
    stolen: false,
    stackSize: 2,
    plot: false,
    addCost: 5,
    identified: true,
    cursed: false,
  },
} as const;

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

function seedExactItemInstanceStateDraft() {
  const scene = createSeedAreaScene();
  const item = scene.objects.find((object) => object.tag === "ITEM_CHEST_01");
  if (!item) throw new Error("Expected seed Item fixture.");
  item.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "item",
    sourceObjectId: "item:0:nw_it_mpotion001:source",
    sourceIndex: 0,
    itemInstanceState: {
      presentFields: [...sourceInstanceState.presentFields],
      values: { ...sourceInstanceState.values },
    },
  };
  item.itemProperties = {
    ...(item.itemProperties ?? {}),
    ...sourceInstanceState.values,
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

describe("Regression smoke: retained ground-item instance state", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactItemInstanceStateDraft();
  });

  it("keeps the exact source immutable through Apply, Cancel, reopen, OK, and local Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openItemProperties();
    expect(within(dialog).getByLabelText("Cost")).toBeEnabled();
    expect(within(dialog).queryByLabelText("Cost Table")).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText("Cost"), { target: { value: "222" } });
    fireEvent.change(within(dialog).getByLabelText("Add Cost"), { target: { value: "333" } });
    fireEvent.change(within(dialog).getByLabelText("Charges"), { target: { value: "9" } });
    fireEvent.change(within(dialog).getByLabelText("Stack Size"), { target: { value: "4" } });
    fireEvent.click(within(dialog).getByLabelText("Identified"));
    fireEvent.click(within(dialog).getByLabelText("Stolen"));
    fireEvent.click(within(dialog).getByLabelText("Plot"));
    fireEvent.click(within(dialog).getByLabelText("Cursed"));
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(within(dialog).getByLabelText("Cost")).toHaveValue(222));
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemProperties();
    expect(within(dialog).getByLabelText("Cost")).toHaveValue(222);
    expect(within(dialog).getByLabelText("Add Cost")).toHaveValue(333);
    expect(within(dialog).getByLabelText("Charges")).toHaveValue(9);
    expect(within(dialog).getByLabelText("Stack Size")).toHaveValue(4);
    expect(within(dialog).getByLabelText("Identified")).not.toBeChecked();
    expect(within(dialog).getByLabelText("Stolen")).toBeChecked();
    expect(within(dialog).getByLabelText("Plot")).toBeChecked();
    expect(within(dialog).getByLabelText("Cursed")).toBeChecked();

    fireEvent.change(within(dialog).getByLabelText("Cost"), { target: { value: "999" } });
    fireEvent.click(within(dialog).getByLabelText("Stolen"));
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemProperties();
    expect(within(dialog).getByLabelText("Cost")).toHaveValue(222);
    expect(within(dialog).getByLabelText("Stolen")).toBeChecked();
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const item = saved?.objects.find((object) => object.tag === "ITEM_CHEST_01");
      expect(item?.itemProperties).toMatchObject({
        charges: 9,
        cost: 222,
        stolen: true,
        stackSize: 4,
        plot: true,
        addCost: 333,
        identified: false,
        cursed: true,
      });
      expect(item?.source?.itemInstanceState).toEqual(sourceInstanceState);
    });
  });
});
