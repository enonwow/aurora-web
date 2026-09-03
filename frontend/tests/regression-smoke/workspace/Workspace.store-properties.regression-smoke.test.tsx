import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";
import { seedBuilderWorkspaceWithExactStoreComment } from "./seedRegressionWorkspace";

async function signInAsBuilder() {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: "builder.user" },
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "builder123" },
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  await screen.findByRole("button", { name: /sign out/i });
}

async function openStoreProperties(): Promise<HTMLElement> {
  const rightSidebar = screen.getByLabelText(/right sidebar/i);
  const row = within(rightSidebar).getByRole("button", { name: /store_dye_01/i });
  const item = row.closest("li");
  expect(item).not.toBeNull();
  const properties = within(item as HTMLElement).getByRole("button", {
    name: /open object properties/i,
  });
  expect(properties).toBeEnabled();
  fireEvent.click(properties);
  return screen.findByRole("dialog", { name: /store properties/i });
}

describe("Regression smoke: retained Store properties and inventory", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    seedBuilderWorkspaceWithExactStoreComment();
    window.history.replaceState({}, "", "/login");
  });

  it("opens from the standard Properties action and honors Apply/Cancel/OK snapshots", async () => {
    render(<App />);
    await signInAsBuilder();

    let dialog = await openStoreProperties();
    const comments = within(dialog).getByLabelText("Store Comments");
    expect(comments).toHaveValue("  source store note  ");
    expect(within(dialog).getByLabelText("Mark Up")).toHaveValue(100);
    expect(within(dialog).getByLabelText("Black Market")).not.toBeChecked();
    expect(within(dialog).getByLabelText("On Open Store Script")).toHaveValue("store_open");
    expect(within(dialog).getByLabelText("On Store Closed Script")).toHaveValue("store_closed");
    expect(within(dialog).getByLabelText("Store variable 1 name")).toHaveValue("Counter");
    expect(within(dialog).getByLabelText("Store variable 1 value")).toHaveValue(1);
    expect(within(dialog).getByLabelText("Will Not Buy entry 1 Base Item")).toHaveValue("2");
    expect(within(dialog).getByLabelText("Will Not Buy entry 2 Base Item")).toHaveValue("1");
    expect(within(dialog).getByLabelText("Will Not Buy entry 3 Base Item")).toHaveValue("2");
    expect(within(dialog).getAllByText("ACTIVE_NOW")).toHaveLength(7);
    expect(within(dialog).getByText("itm_a")).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Repository 1 item 1 Infinite")).toBeChecked();

    fireEvent.change(comments, { target: { value: "  apply then cancel  " } });
    fireEvent.change(within(dialog).getByLabelText("Mark Up"), { target: { value: "111" } });
    fireEvent.click(within(dialog).getByLabelText("Black Market"));
    fireEvent.change(within(dialog).getByLabelText("On Open Store Script"), {
      target: { value: "cancel_open" },
    });
    fireEvent.change(within(dialog).getByLabelText("Store variable 1 value"), {
      target: { value: "7" },
    });
    fireEvent.change(within(dialog).getByLabelText("Will Not Buy entry 1 Base Item"), {
      target: { value: "3" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Add Will Only Buy restriction",
    }));
    fireEvent.click(within(dialog).getByLabelText("Repository 1 item 1 Infinite"));
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Move repository 1 item 1 down",
    }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^apply$/i }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /store properties/i })).not.toBeInTheDocument();
    });

    dialog = await openStoreProperties();
    expect(within(dialog).getByLabelText("Store Comments"))
      .toHaveValue("  source store note  ");
    expect(within(dialog).getByLabelText("Mark Up")).toHaveValue(100);
    expect(within(dialog).getByLabelText("Black Market")).not.toBeChecked();
    expect(within(dialog).getByLabelText("On Open Store Script")).toHaveValue("store_open");
    expect(within(dialog).getByLabelText("Store variable 1 value")).toHaveValue(1);
    expect(within(dialog).getByLabelText("Will Not Buy entry 1 Base Item")).toHaveValue("2");
    expect(within(dialog).queryByLabelText("Will Only Buy entry 1 Base Item"))
      .not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Repository 1 item 1 Infinite")).toBeChecked();
    expect(within(dialog).getByText("itm_a").closest("tr"))
      .toContainElement(within(dialog).getByLabelText("Repository 1 item 1 Infinite"));
    fireEvent.change(within(dialog).getByLabelText("Store Comments"), {
      target: { value: "  committed store note\n  " },
    });
    fireEvent.change(within(dialog).getByLabelText("Mark Up"), {
      target: { value: "125" },
    });
    fireEvent.click(within(dialog).getByLabelText("Black Market"));
    fireEvent.change(within(dialog).getByLabelText("On Open Store Script"), {
      target: { value: "nw_store_open" },
    });
    fireEvent.change(within(dialog).getByLabelText("On Store Closed Script"), {
      target: { value: "nw_store_close" },
    });
    fireEvent.change(within(dialog).getByLabelText("Store variable 1 value"), {
      target: { value: "2" },
    });
    fireEvent.change(within(dialog).getByLabelText("Will Not Buy entry 1 Base Item"), {
      target: { value: "3" },
    });
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Add Will Only Buy restriction",
    }));
    fireEvent.click(within(dialog).getByLabelText("Repository 1 item 1 Infinite"));
    fireEvent.click(within(dialog).getByRole("button", {
      name: "Remove repository 1 item 2",
    }));
    fireEvent.click(within(dialog).getByRole("button", { name: /^ok$/i }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: /store properties/i })).not.toBeInTheDocument();
    });

    dialog = await openStoreProperties();
    expect(within(dialog).getByLabelText("Store Comments"))
      .toHaveValue("  committed store note\n  ");
    expect(within(dialog).getByLabelText("Mark Up")).toHaveValue(125);
    expect(within(dialog).getByLabelText("Black Market")).toBeChecked();
    expect(within(dialog).getByLabelText("On Open Store Script")).toHaveValue("nw_store_open");
    expect(within(dialog).getByLabelText("On Store Closed Script")).toHaveValue("nw_store_close");
    expect(within(dialog).getByLabelText("Store variable 1 name")).toHaveValue("Counter");
    expect(within(dialog).getByLabelText("Store variable 1 value")).toHaveValue(2);
    expect(within(dialog).getByLabelText("Will Not Buy entry 1 Base Item")).toHaveValue("3");
    expect(within(dialog).getByLabelText("Will Not Buy entry 2 Base Item")).toHaveValue("1");
    expect(within(dialog).getByLabelText("Will Not Buy entry 3 Base Item")).toHaveValue("2");
    expect(within(dialog).getByLabelText("Will Only Buy entry 1 Base Item")).toHaveValue("0");
    expect(within(dialog).getByText("itm_a")).toBeInTheDocument();
    expect(within(dialog).queryByText("itm_b")).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText("Repository 1 item 1 Infinite")).not.toBeChecked();
  });
});
