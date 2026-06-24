import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "../../../src/App";
import { clearAuthBenchmarks } from "../../../src/modules/auth/authBenchmarks";
import { clearTelemetry } from "../../../src/modules/telemetry/telemetryStore";

const mockViewport = vi.hoisted(() => ({
  propsSpy: vi.fn()
}));

vi.mock("../../../src/modules/sounds/adapters/httpSoundApiPort", () => ({
  createHttpSoundApiPort: () => ({
    listSounds: vi.fn(async () => ({
      items: [
        {
          soundId: "sound_dia_hakon_add_12",
          resref: "dia_hakon_add_12",
          name: "Dia Hakon Add 12",
          category: "dialogue",
          format: "wav",
          tags: ["npc_sounds"],
          benchmark: false,
          previewWaveformUrl: "/api/v1/catalog/sounds/sound_dia_hakon_add_12/preview",
          spatialMode: "3d",
          playbackMode: "single",
          auroraUsage: {
            bindingKey: "SoundList",
            sourceField: "Sounds"
          },
          metrics: {
            durationMs: 1100,
            cues: 1,
            emitters: 1
          },
          updatedAt: "2026-06-16T10:00:00.000Z"
        }
      ],
      total: 1,
      limit: 100,
      offset: 0
    })),
    processSound: vi.fn(),
    getSoundAudioContracts: vi.fn(),
    getSoundAudioBlob: vi.fn()
  })
}));

vi.mock("../../../src/modules/layout/components/WorkspaceCanvasViewport", () => ({
  WorkspaceCanvasViewport: (props: {
    externalSceneSeed?: { objects?: Array<{ kind?: string }> } | null;
    toolbarState?: { canvasDebug?: { lockedKinds?: { sounds?: boolean } } };
  }) => {
    mockViewport.propsSpy(props);
    const soundMarkerCount =
      props.externalSceneSeed?.objects?.filter((object) => object.kind === "sounds").length ?? 0;
    const soundEditorGuideCount =
      soundMarkerCount > 0 && props.toolbarState?.canvasDebug?.lockedKinds?.sounds !== true
        ? soundMarkerCount
        : 0;
    return (
      <div
        data-testid="workspace-canvas-viewport-probe"
        data-sound-marker-count={soundMarkerCount}
        data-sound-editor-guide-count={soundEditorGuideCount}
      />
    );
  }
}));

function renderAtPath(pathname: string) {
  window.history.replaceState({}, "", pathname);
  return render(<App />);
}

async function signInAsBuilder() {
  fireEvent.change(screen.getByLabelText(/username/i), {
    target: { value: "builder.user" }
  });
  fireEvent.change(screen.getByLabelText(/password/i), {
    target: { value: "builder123" }
  });
  fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
  expect(await screen.findByRole("button", { name: /sign out/i })).toBeInTheDocument();
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
}

function getLatestViewportProps() {
  const lastCall = mockViewport.propsSpy.mock.calls[mockViewport.propsSpy.mock.calls.length - 1];
  return lastCall?.[0] as
    | {
        toolbarState?: {
          canvasDebug?: {
            lockedKinds?: {
              sounds?: boolean;
            };
          };
        };
      }
    | undefined;
}

describe("App sound layer lock wiring", () => {
  beforeEach(() => {
    clearTelemetry();
    clearAuthBenchmarks();
    window.localStorage.clear();
    mockViewport.propsSpy.mockClear();
  });

  it("wires the Lock Sounds toolbar action into viewport canvas debug state", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    expect(screen.getByTestId("workspace-canvas-viewport-probe")).toBeInTheDocument();
    expect(getLatestViewportProps()?.toolbarState?.canvasDebug?.lockedKinds?.sounds).toBe(false);

    await openToolbarGroup(/^canvas$/i);
    const lockSoundsButton = screen.getByRole("button", { name: /^lock snd$/i });
    expect(lockSoundsButton.className).not.toContain("is-active");

    fireEvent.click(lockSoundsButton);

    await waitFor(() => {
      expect(getLatestViewportProps()?.toolbarState?.canvasDebug?.lockedKinds?.sounds).toBe(true);
    });
    expect(lockSoundsButton.className).toContain("is-active");

    fireEvent.click(lockSoundsButton);

    await waitFor(() => {
      expect(getLatestViewportProps()?.toolbarState?.canvasDebug?.lockedKinds?.sounds).toBe(false);
    });
    expect(lockSoundsButton.className).not.toContain("is-active");
  });

  it("keeps backend sound marker diagnostics while Lock SND suppresses editor guides", async () => {
    renderAtPath("/login");
    await signInAsBuilder();

    fireEvent.click(screen.getByRole("button", { name: /sounds mode/i }));
    const placeButton = await screen.findByRole("button", {
      name: /place dia_hakon_add_12 on canvas/i
    });
    fireEvent.click(placeButton);

    const viewportProbe = screen.getByTestId("workspace-canvas-viewport-probe");
    await waitFor(() => {
      expect(viewportProbe).toHaveAttribute("data-sound-marker-count", "1");
      expect(Number(viewportProbe.getAttribute("data-sound-editor-guide-count"))).toBeGreaterThan(0);
    });

    await openToolbarGroup(/^canvas$/i);
    fireEvent.click(screen.getByRole("button", { name: /^lock snd$/i }));

    await waitFor(() => {
      expect(viewportProbe).toHaveAttribute("data-sound-marker-count", "1");
      expect(viewportProbe).toHaveAttribute("data-sound-editor-guide-count", "0");
    });
  });
});
