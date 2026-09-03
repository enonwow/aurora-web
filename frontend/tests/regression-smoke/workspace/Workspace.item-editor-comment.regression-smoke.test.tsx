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

function seedExactItemEditorCommentDraft() {
  const scene = createSeedAreaScene();
  const item = scene.objects.find((object) => object.tag === "ITEM_CHEST_01");
  if (!item) throw new Error("Expected seed Item fixture.");
  item.source = {
    type: "aurora_git",
    areaId: scene.sceneId,
    sourceKind: "item",
    sourceObjectId: "item:0:nw_it_mpotion001:source",
    sourceIndex: 0,
    itemEditorComment: "",
  };
  item.itemProperties = { ...(item.itemProperties ?? {}), comments: "" };
  saveLocalSceneDraft(USER_ID, scene, window.localStorage);
}

async function openItemCommentsTab() {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /item_chest_01/i });
  fireEvent.contextMenu(row, { clientX: 260, clientY: 200 });
  fireEvent.click(screen.getByRole("menuitem", { name: /^properties$/i }));
  const dialog = await screen.findByRole("dialog", { name: /item properties/i });
  fireEvent.click(within(dialog).getByRole("button", { name: /^comments$/i }));
  return dialog;
}

describe("Regression smoke: retained ground-item editor Comment", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedExactItemEditorCommentDraft();
  });

  it("preserves exact text and immutable empty provenance through Apply, Cancel, reopen, and Save", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    let dialog = await openItemCommentsTab();
    let comments = within(dialog).getByLabelText("Comments");
    expect(comments).toBeEnabled();
    expect(comments).toHaveAttribute("maxLength", "4096");
    const appliedValue = "  West wall\nground item e\u0301  ";
    fireEvent.change(comments, { target: { value: appliedValue } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    await waitFor(() => expect(comments).toHaveValue(appliedValue));
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemCommentsTab();
    comments = within(dialog).getByLabelText("Comments");
    expect(comments).toHaveValue(appliedValue);
    fireEvent.change(comments, { target: { value: "discarded" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));

    dialog = await openItemCommentsTab();
    expect(within(dialog).getByLabelText("Comments")).toHaveValue(appliedValue);
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));

    fireEvent.keyDown(window, { key: "s", ctrlKey: true });
    await waitFor(() => {
      const saved = loadLocalSceneDraft(USER_ID, window.localStorage);
      const item = saved?.objects.find((object) => object.tag === "ITEM_CHEST_01");
      expect(item?.itemProperties?.comments).toBe(appliedValue);
      expect(item?.source?.itemEditorComment).toBe("");
    });
  });
});
