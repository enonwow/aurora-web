import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { SoundPropertiesDialog } from "../../../../../../src/modules/layout/components/properties/SoundPropertiesDialog";
import { buildSoundPropertiesDraft } from "../../../../../../src/modules/layout/application/workspaceObjectPropertyDrafts";
import { createNewSceneObject } from "../../../../../../src/modules/scene/domain/sceneFactory";

describe("SoundPropertiesDialog", () => {
  it("shows backend sound template contract metadata in the basic tab", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      id: "sound_area_003",
      name: "dia_hakon_add_12",
      tag: "SOUND_DIA_HAKON_ADD_12",
      resRef: "dia_hakon_add_12",
      soundPositioning: {
        mode: "specific" as const,
        elevation: 0,
        maxVolumeDistance: 12,
        cutoffDistance: 24,
        randomRangeWestEast: 0,
        randomRangeNorthSouth: 0,
        preserve: {
          timeWindow: "always",
          hourMask: "0xFFFFFF",
          active: true,
          whenToPlay: "always" as const,
          dayNight: "both" as const,
          hoursStart: 0,
          hoursEnd: 23,
          playStyle: "repeat" as const,
          playOrder: "random" as const,
          intervalMs: 4000,
          intervalVariationMs: 500,
          volume: 80,
          volumeVariation: 10,
          pitchVariation: 0,
          priority: 5,
          flags: { backendBenchmark: true },
          extra: {
            backendSoundId: "sound_dia_hakon_add_12",
            category: "effect",
            format: "wav",
            spatialMode: "3d",
            playbackMode: "random",
            soundTemplateSource: "backend-catalog"
          }
        }
      }
    };

    render(
      <SoundPropertiesDialog
        soundPropertiesDialog={{
          objectId: soundObject.id,
          snapshotObject: soundObject,
          draft: buildSoundPropertiesDraft(soundObject),
          activeTab: "basic",
          windowX: 20,
          windowY: 20,
          anchorOffsetX: 0,
          anchorOffsetY: 0,
          collapsed: false
        }}
        toggleSoundPropertiesDialogCollapsed={vi.fn()}
        cancelSoundPropertiesDialog={vi.fn()}
        setSoundPropertiesActiveTab={vi.fn()}
        updateSoundPropertiesDraftField={vi.fn()}
        patchSoundPropertiesDraft={vi.fn()}
        toggleSoundPropertiesActive={vi.fn()}
        setSoundWhenToPlay={vi.fn()}
        toggleSoundHour={vi.fn()}
        selectSoundListEntry={vi.fn()}
        playSelectedSoundPreview={vi.fn()}
        stopSoundPreviewPlayback={vi.fn()}
        addSoundListEntry={vi.fn()}
        removeSelectedSoundListEntry={vi.fn()}
        moveSoundListEntryUp={vi.fn()}
        moveSoundListEntryDown={vi.fn()}
        applySoundPropertiesDraft={vi.fn()}
      />
    );

    const contract = screen.getByRole("region", { name: "Backend sound contract" });
    expect(within(contract).getByText("soundId")).toBeInTheDocument();
    expect(within(contract).getByText("sound_dia_hakon_add_12")).toBeInTheDocument();
    expect(within(contract).getByText("dia_hakon_add_12")).toBeInTheDocument();
    expect(within(contract).getByText("effect")).toBeInTheDocument();
    expect(within(contract).getByText("wav")).toBeInTheDocument();
    expect(within(contract).getByText("3d")).toBeInTheDocument();
    expect(within(contract).getByText("random")).toBeInTheDocument();
  });
});
