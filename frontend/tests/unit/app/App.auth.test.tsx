import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import App, {
  AUTH_SESSION_STORAGE_KEY,
  WORKSPACE_MODE_STORAGE_KEY
} from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import type { IAuthFacade } from "../../../src/modules/auth/contracts";
import { LAYOUT_SETTINGS_STORAGE_KEY } from "../../../src/modules/layout/layoutSettings";
import {
  DEFAULT_WORKSPACE_OPTION_SETTINGS,
  WORKSPACE_OPTIONS_STORAGE_KEY
} from "../../../src/modules/layout/workspaceOptionSettings";
import { loadLocalSceneDraft } from "../../../src/modules/scene/adapters/localDraftStore";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

function renderAtPath(pathname: string) {
  window.history.replaceState({}, "", pathname);
  return render(<App />);
}

async function signInAs(username: string, password: string) {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: username }
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: password }
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("button", { name: /sign out/i })).toBeInTheDocument();
}

async function openQuickOptionsDialog() {
  const trigger = screen.getByRole("button", { name: /open quick options/i });
  fireEvent.click(trigger);
  try {
    return await screen.findByRole("dialog", { name: /quick options/i }, { timeout: 3000 });
  } catch {
    fireEvent.click(trigger);
    return screen.findByRole("dialog", { name: /quick options/i }, { timeout: 5000 });
  }
}

async function openToolbarGroup(groupName: RegExp) {
  const tab = screen.getByRole("button", { name: groupName });
  fireEvent.click(tab);
  if (tab.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(tab);
  }
  await waitFor(() => {
    expect(tab).toHaveAttribute("aria-expanded", "true");
  });
  return tab;
}

describe("App auth test flow", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
  });

  it("shows login view by default with no workspace controls", () => {
    renderAtPath("/");
    expect(
      screen.getByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show debug panel/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save \(local draft\)/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /select object/i })).not.toBeInTheDocument();
  });

  it("redirects to workspace after sign in", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");
    expect(window.location.pathname).toBe("/app");
    expect(screen.getByLabelText(/workspace render canvas/i)).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /^areas$/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
  });

  it("restores authenticated workspace and saved placeables mode after remount", async () => {
    const view = renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /placeables mode/i }));
    expect(screen.getByRole("heading", { name: /^placeables$/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).not.toBeNull();
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe("placeables_mode");
    });

    view.unmount();
    renderAtPath("/app");

    expect(await screen.findByRole("button", { name: /sign out/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /sign in to aurora web/i })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^placeables$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^placeables mode$/i })).toBeInTheDocument();
  });

  it("preserves URL-selected placeables mode through sign in for demo VFX routes", async () => {
    renderAtPath("/login?mode=placeables_mode&placeable=plc_zlc_o45&subtype=vfx");
    await signInAs("builder.user", "builder123");

    expect(window.location.pathname).toBe("/app");
    expect(window.location.search).toBe(
      "?mode=placeables_mode&placeable=plc_zlc_o45&subtype=vfx"
    );
    expect(screen.getByRole("heading", { name: /^placeables$/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^placeables mode$/i })).toBeInTheDocument();
  });

  it("drops legacy demo query through sign in instead of opening old demo", async () => {
    renderAtPath("/login?demo=plc_zlc_o45_magic_mouth");
    await signInAs("builder.user", "builder123");

    expect(window.location.pathname).toBe("/app");
    expect(window.location.search).toBe("");
    expect(screen.getByRole("heading", { name: /^areas$/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /^placeables mode$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /magic mouth demo/i })).not.toBeInTheDocument();
  });

  it("removes legacy demo query from restored authenticated app route", async () => {
    const view = renderAtPath("/login");
    await signInAs("builder.user", "builder123");
    view.unmount();

    renderAtPath("/app?demo=plc_zlc_o45_magic_mouth");

    expect(await screen.findByRole("button", { name: /sign out/i })).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/app");
      expect(window.location.search).toBe("");
    });
    expect(screen.getByRole("heading", { name: /^areas$/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /magic mouth demo/i })).not.toBeInTheDocument();
  });

  it("enforces Aurora toolbar matrix for builder role", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    expect(screen.getByRole("button", { name: /^undo$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^redo$/i })).toBeInTheDocument();

    await openToolbarGroup(/^module$/i);
    expect(screen.getByRole("button", { name: /save \(local draft\)/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create new module/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /open existing module/i })
    ).not.toBeInTheDocument();

    await openToolbarGroup(/^selection$/i);
    expect(screen.getByRole("button", { name: /select terrain/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /select object/i })).toBeInTheDocument();

    await openToolbarGroup(/^visibility$/i);
    const showNoneButton = screen.getByRole("button", { name: /show none/i });
    expect(showNoneButton).toBeEnabled();
    fireEvent.click(showNoneButton);

    const showCreaturesButton = screen.getByRole("button", { name: /show creatures/i });
    expect(showCreaturesButton.className).not.toContain("is-active");
    expect(screen.getByRole("button", { name: /show doors/i }).className).not.toContain(
      "is-active"
    );
    expect(screen.getByRole("button", { name: /show items/i }).className).not.toContain(
      "is-active"
    );
    expect(screen.getByRole("button", { name: /show placeables/i }).className).not.toContain(
      "is-active"
    );
    expect(screen.getByRole("button", { name: /show sounds/i }).className).not.toContain(
      "is-active"
    );

    expect(screen.getByRole("button", { name: /show none/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /^canvas$/i })).toBeInTheDocument();
    await openToolbarGroup(/^canvas$/i);
    expect(screen.getByLabelText(/canvas runtime/i)).toBeInTheDocument();
    expect(screen.getByRole("note", { name: /controls hint/i })).toBeInTheDocument();
    const wireframeButton = screen.getByRole("button", { name: /wireframe/i });
    expect(wireframeButton.className).not.toContain("is-active");
    fireEvent.click(wireframeButton);
    expect(wireframeButton.className).toContain("is-active");
    fireEvent.click(wireframeButton);
    expect(wireframeButton.className).not.toContain("is-active");
    fireEvent.click(screen.getByRole("button", { name: /controls hint/i }));
    expect(screen.queryByRole("note", { name: /controls hint/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /runtime popup/i }));
    expect(screen.queryByLabelText(/canvas runtime/i)).not.toBeInTheDocument();
  });

  it("opens and closes keyboard shortcuts modal", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /shortcuts/i }));
    expect(
      await screen.findByRole("dialog", { name: /keyboard shortcuts/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/ctrl\/cmd \+ z/i)).toBeInTheDocument();
    expect(screen.getByText(/ctrl\/cmd \+ x/i)).toBeInTheDocument();
    expect(screen.getByText(/ctrl \+ rmb/i)).toBeInTheDocument();
    expect(screen.getByText(/rmb on object/i)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.queryByRole("dialog", { name: /keyboard shortcuts/i })
    ).not.toBeInTheDocument();
  });

  it("opens quick options popup from top-right options button", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    expect(await openQuickOptionsDialog()).toBeInTheDocument();
    expect(screen.getByRole("group", { name: /layout/i })).toBeInTheDocument();
    const styleSelect = await screen.findByLabelText(/app style/i);
    expect(styleSelect).toHaveValue("aurora-toolset-classic");
    expect(within(styleSelect).getAllByRole("option")).toHaveLength(5);
    expect(screen.queryByLabelText(/control scheme/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/grid step/i)).toHaveValue(1);
    expect(screen.getByLabelText(/angle step/i)).toHaveValue(15);
    expect(screen.getByLabelText(/height step/i)).toHaveValue(0.5);
    expect(screen.getByLabelText(/selection box mode/i)).toHaveValue("replace");
    expect(screen.getByLabelText(/show per-object gizmo hints/i)).toBeChecked();
    expect(screen.getByLabelText(/enable runtime sound preview/i)).not.toBeChecked();
    expect(screen.getByLabelText(/show now-playing marker for active sounds/i)).toBeChecked();
    expect(screen.getByLabelText(/camera rotate speed/i)).toHaveValue(1);
    expect(screen.getByLabelText(/camera zoom speed/i)).toHaveValue(1);
    expect(screen.getByLabelText(/camera pan speed/i)).toHaveValue(1);
    expect(screen.getByLabelText(/camera damping/i)).toHaveValue(0.08);
    expect(screen.getByText(/expanded/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
    expect(
      screen.queryByRole("dialog", { name: /quick options/i })
    ).not.toBeInTheDocument();
  });

  it("persists selected layout style in localStorage", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();
    const styleSelect = await screen.findByLabelText(/app style/i);

    fireEvent.change(styleSelect, { target: { value: "forest-night" } });
    expect(styleSelect).toHaveValue("forest-night");
    const storedRaw = window.localStorage.getItem(LAYOUT_SETTINGS_STORAGE_KEY);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw ?? "{}");
    expect(stored.theme).toBe("forest-night");
    expect(document.documentElement.getAttribute("data-layout-theme")).toBe("forest-night");
  }, 15000);

  it("loads saved layout style from localStorage on first render", async () => {
    window.localStorage.setItem(
      LAYOUT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: "obsidian-slate"
      })
    );
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    fireEvent.click(screen.getByRole("button", { name: /open quick options/i }));
    expect(await screen.findByLabelText(/app style/i)).toHaveValue("obsidian-slate");
    expect(document.documentElement.getAttribute("data-layout-theme")).toBe("obsidian-slate");
  });

  it("does not expose control scheme selector in quick options", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();
    expect(screen.queryByLabelText(/control scheme/i)).not.toBeInTheDocument();
  });

  it("persists workspace options in localStorage", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();

    fireEvent.change(screen.getByLabelText(/grid step/i), {
      target: { value: "2" }
    });
    fireEvent.change(screen.getByLabelText(/angle step/i), {
      target: { value: "30" }
    });
    fireEvent.change(screen.getByLabelText(/height step/i), {
      target: { value: "1" }
    });
    fireEvent.change(screen.getByLabelText(/selection box mode/i), {
      target: { value: "intersect" }
    });
    fireEvent.click(screen.getByLabelText(/show per-object gizmo hints/i));
    fireEvent.click(screen.getByLabelText(/display tile grid overlay/i));
    fireEvent.click(screen.getByLabelText(/enable runtime sound preview/i));
    fireEvent.click(screen.getByLabelText(/show now-playing marker for active sounds/i));
    fireEvent.change(screen.getByLabelText(/camera rotate speed/i), {
      target: { value: "1.5" }
    });
    fireEvent.change(screen.getByLabelText(/camera zoom speed/i), {
      target: { value: "1.4" }
    });
    fireEvent.change(screen.getByLabelText(/camera pan speed/i), {
      target: { value: "1.3" }
    });
    fireEvent.change(screen.getByLabelText(/camera damping/i), {
      target: { value: "0.12" }
    });

    const stored = window.localStorage.getItem(WORKSPACE_OPTIONS_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored ?? "{}");

    expect(parsed.snapGridStep).toBe(2);
    expect(parsed.snapAngleStepDeg).toBe(30);
    expect(parsed.snapHeightStep).toBe(1);
    expect(parsed.selectionBoxMode).toBe("intersect");
    expect(parsed.showPerObjectGizmoHints).toBe(false);
    expect(parsed.showTileGridOverlay).toBe(true);
    expect(parsed.enableRuntimeSoundPreview).toBe(true);
    expect(parsed.showRuntimeSoundNowPlaying).toBe(false);
    expect(parsed.cameraRotateSpeed).toBe(1.5);
    expect(parsed.cameraZoomSpeed).toBe(1.4);
    expect(parsed.cameraPanSpeed).toBe(1.3);
    expect(parsed.cameraDampingFactor).toBe(0.12);
  });

  it("pins and unpins runtime popup on repeated click", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    const runtimeAnchor = screen.getByLabelText(/canvas runtime/i);
    const runtimeButton = screen.getByRole("button", { name: /runtime diagnostics/i });
    expect(runtimeButton).toHaveAttribute("aria-pressed", "false");
    expect(runtimeAnchor.className).not.toContain("is-pinned");

    fireEvent.click(runtimeButton);
    expect(runtimeButton).toHaveAttribute("aria-pressed", "true");
    expect(runtimeAnchor.className).toContain("is-pinned");

    fireEvent.click(runtimeButton);
    expect(runtimeButton).toHaveAttribute("aria-pressed", "false");
    expect(runtimeAnchor.className).not.toContain("is-pinned");
  });

  it(
    "reloads layout and canvas options from localStorage on login success",
    async () => {
    renderAtPath("/login");

    window.localStorage.setItem(
      LAYOUT_SETTINGS_STORAGE_KEY,
      JSON.stringify({
        theme: "forest-night"
      })
    );
    window.localStorage.setItem(
      WORKSPACE_OPTIONS_STORAGE_KEY,
      JSON.stringify({
        ...DEFAULT_WORKSPACE_OPTION_SETTINGS,
        snapGridStep: 2.5,
        showPerObjectGizmoHints: false
      })
    );

    await signInAs("builder.user", "builder123");

    await openQuickOptionsDialog();
    expect(await screen.findByLabelText(/app style/i)).toHaveValue("forest-night");
    expect(screen.queryByLabelText(/control scheme/i)).not.toBeInTheDocument();
    expect(await screen.findByLabelText(/grid step/i)).toHaveValue(2.5);
    expect(screen.getByLabelText(/show per-object gizmo hints/i)).not.toBeChecked();
    },
    10000
  );

  it("shows only role-appropriate toolbar groups for viewer", async () => {
    renderAtPath("/login");
    await signInAs("viewer.user", "viewer123");

    fireEvent.click(screen.getByRole("button", { name: /^camera$/i }));
    expect(screen.getAllByRole("button", { name: /fit area/i })).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: /^visibility$/i }));
    expect(screen.getByRole("button", { name: /show all/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save \(local draft\)/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /create new module/i })
    ).not.toBeInTheDocument();
  });

  it("shows DM runtime commands only for dm role", async () => {
    renderAtPath("/login");
    await signInAs("dm.user", "dm123");

    await openToolbarGroup(/^dm commands$/i);
    expect(
      await screen.findByRole("button", { name: /spawn creature/i })
    ).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: /spawn vfx/i })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save \(local draft\)/i })
    ).not.toBeInTheDocument();
  });

  it("shows auth error for invalid credentials", async () => {
    renderAtPath("/login");

    fireEvent.change(screen.getByLabelText(/username/i), {
      target: { value: "builder.user" }
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: "wrong-password" }
    });
    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(
      await screen.findByText(/login failed/i)
    ).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
  });

  it("captures debug telemetry events and benchmark summary", async () => {
    renderAtPath("/login");

    await signInAs("admin.user", "admin123");
    fireEvent.click(screen.getByRole("button", { name: /show debug panel/i }));

    expect(await screen.findByText(/ui\.auth\.login_success/i)).toBeInTheDocument();
    expect(screen.getByText(/auth\.authenticate\.accepted/i)).toBeInTheDocument();
    expect(screen.getAllByText(/auth\.authorize\.completed/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/auth benchmark avg:/i)).toBeInTheDocument();
    expect(screen.getByText(/authorize benchmark avg:/i)).toBeInTheDocument();
  });

  it("saves local scene draft from module actions", async () => {
    renderAtPath("/login");
    await signInAs("builder.user", "builder123");

    await openToolbarGroup(/^module$/i);
    fireEvent.click(
      await screen.findByRole("button", { name: /save \(local draft\)/i })
    );

    const draft = loadLocalSceneDraft("u_builder_001", window.localStorage);
    expect(draft).not.toBeNull();
    expect(draft?.source).toBe("local_draft");
    expect(draft?.tiles.length).toBeGreaterThan(0);
  });

  it("hides workspace controls after sign out", async () => {
    renderAtPath("/login");

    await signInAs("dm.user", "dm123");

    fireEvent.click(screen.getByRole("button", { name: /show debug panel/i }));
    expect(screen.getByRole("dialog", { name: /debug panel/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /sign out/i }));
    expect(
      await screen.findByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /show debug panel/i })
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: /debug panel/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /spawn creature/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /show all/i })).not.toBeInTheDocument();
  });

  it("guards direct /app access for anonymous user and rewrites route to /login", async () => {
    renderAtPath("/app");

    expect(
      screen.getByRole("heading", { name: /sign in to aurora web/i })
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(window.location.pathname).toBe("/login");
    });
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /save \(local draft\)/i })
    ).not.toBeInTheDocument();
  });

  it("clears restored workspace session when backend rejects the persisted token", async () => {
    const staleSession = {
      accessToken: "stale_token_001",
      issuedAt: "2026-05-27T10:00:00.000Z",
      expiresAt: "2099-05-27T20:00:00.000Z",
      user: {
        id: "u_builder_001",
        username: "builder.user",
        displayName: "Builder User",
        role: "builder" as const
      }
    };
    window.localStorage.setItem(
      AUTH_SESSION_STORAGE_KEY,
      JSON.stringify({
        session: staleSession,
        authorization: {
          role: "builder",
          permissions: ["scene.read", "scene.edit"]
        }
      })
    );
    const authFacade: IAuthFacade = {
      authenticate: vi.fn(),
      authorize: vi.fn(async () => {
        throw new Error("Missing or invalid bearer token.");
      }),
      signOut: vi.fn()
    };

    window.history.replaceState({}, "", "/app");
    render(<App authFacade={authFacade} />);

    expect(await screen.findByText(/session expired/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();
    expect(window.location.pathname).toBe("/login");
    expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
  });

  it("clears an open workspace session when its expiry time passes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-27T10:00:00.000Z"));

    try {
      const activeSession = {
        accessToken: "active_token_expiring_soon",
        issuedAt: "2026-05-27T09:59:00.000Z",
        expiresAt: "2026-05-27T10:00:05.000Z",
        user: {
          id: "u_builder_001",
          username: "builder.user",
          displayName: "Builder User",
          role: "builder" as const
        }
      };
      window.localStorage.setItem(
        AUTH_SESSION_STORAGE_KEY,
        JSON.stringify({
          session: activeSession,
          authorization: {
            role: "builder",
            permissions: ["scene.read", "scene.edit"]
          }
        })
      );
      window.localStorage.setItem(WORKSPACE_MODE_STORAGE_KEY, "placeables_mode");
      const authFacade: IAuthFacade = {
        authenticate: vi.fn(),
        authorize: vi.fn(async () => ({
          role: "builder",
          permissions: ["scene.read", "scene.edit"]
        })),
        signOut: vi.fn()
      };

      window.history.replaceState({}, "", "/app");
      render(<App authFacade={authFacade} />);

      expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /^placeables$/i })).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(4_000);
      });

      expect(screen.getByText(/session expired/i)).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: /sign in to aurora web/i })).toBeInTheDocument();
      expect(window.location.pathname).toBe("/login");
      expect(window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY)).toBeNull();
      expect(window.localStorage.getItem(WORKSPACE_MODE_STORAGE_KEY)).toBe("areas_mode");
      expect(screen.queryByRole("button", { name: /sign out/i })).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });
});
