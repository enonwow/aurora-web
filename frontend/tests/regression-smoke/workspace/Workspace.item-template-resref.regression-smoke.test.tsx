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
const SOURCE_OBJECT_ID = "item:0:nw_it_mpotion001:source";
const SOURCE_RESREF = "nw_it_mpotion001";

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

function seedExactItemTemplateResRefDraft() {
  const scene = createSeedAreaScene();
  const item = scene.objects.find((object) => object.tag === "ITEM_CHEST_01");
  if (!item) throw new Error("Expected seed Item fixture.");
  item.resRef = SOURCE_RESREF;
  item.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "item",
    sourceObjectId: SOURCE_OBJECT_ID,
    sourceIndex: 0,
    itemTemplateResRef: {
      present: true,
      nativeType: "resref",
      value: SOURCE_RESREF,
    },
  };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openItemBasicTab() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /item_chest_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  return screen.findByRole("dialog", { name: /item properties/i });
}

describe("Regression smoke: retained ground-item TemplateResRef", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactItemTemplateResRefDraft();
  });

  it("rejects invalid input and preserves exact CAS provenance through Apply, Cancel, reopen, OK, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openItemBasicTab();
    let resRef = within(dialog).getByLabelText("ResRef");
    expect(resRef).toBeEnabled();
    expect(resRef).toHaveAttribute("maxLength", "16");
    expect(resRef).toHaveValue(SOURCE_RESREF);

    fireEvent.change(resRef, { target: { value: "CUSTOM-SWORD" } });
    expect(resRef).toHaveValue(SOURCE_RESREF);

    const appliedValue = "custom_sword";
    fireEvent.change(resRef, { target: { value: appliedValue } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(resRef).toHaveValue(appliedValue));
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemBasicTab();
    resRef = within(dialog).getByLabelText("ResRef");
    expect(resRef).toHaveValue(appliedValue);
    fireEvent.change(resRef, { target: { value: "discarded_sword" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemBasicTab();
    expect(within(dialog).getByLabelText("ResRef")).toHaveValue(appliedValue);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const item = saved?.objects.find(
        (object) => object.source?.sourceObjectId === SOURCE_OBJECT_ID,
      );
      expect(item?.resRef).toBe(appliedValue);
      expect(item?.source?.itemTemplateResRef).toEqual({
        present: true,
        nativeType: "resref",
        value: SOURCE_RESREF,
      });
    });
  });
});
