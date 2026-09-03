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

    renderSoundPropertiesDialog(soundObject, "basic");

    const contract = screen.getByRole("region", { name: "Backend sound contract" });
    expect(within(contract).getByText("soundId")).toBeInTheDocument();
    expect(within(contract).getByText("sound_dia_hakon_add_12")).toBeInTheDocument();
    expect(within(contract).getByText("dia_hakon_add_12")).toBeInTheDocument();
    expect(within(contract).getByText("effect")).toBeInTheDocument();
    expect(within(contract).getByText("wav")).toBeInTheDocument();
    expect(within(contract).getByText("3d")).toBeInTheDocument();
    expect(within(contract).getByText("random")).toBeInTheDocument();
  });

  it("enables the exact native interval/variation controls and renders the raw byte scale", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      id: "area_crypt01:obj_snd_animalcriesday",
      name: "AnimalCriesDay",
      tag: "AnimalCriesDay",
      resRef: "animalcriesday",
      soundIntervalVariation: {
        intervalMilliseconds: 25_000,
        intervalVariationMilliseconds: 5_000,
        pitchVariationHundredths: 20,
        volumeVariationByte: 64,
      },
      source: {
        type: "aurora_git" as const,
        areaId: "area_crypt01",
        sourceObjectId: "obj_snd_animalcriesday",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundIntervalVariationStorage: {
          intervalMilliseconds: 25_000,
          intervalVariationMilliseconds: 5_000,
          pitchVariationHundredths: 20,
          volumeVariationByte: 64,
        },
      },
    };

    renderSoundPropertiesDialog(soundObject, "advanced");

    expect(screen.getByRole("group", { name: "Interval" })).toBeEnabled();
    expect(screen.getByRole("group", { name: "Variation" })).toBeEnabled();
    expect(screen.getByLabelText("Interval between playing sounds (seconds)")).toHaveValue("25,00");
    const volumeVariation = within(screen.getByRole("group", { name: "Variation" }))
      .getAllByRole("slider")[0]!;
    expect(volumeVariation).toHaveAttribute("max", "127");
    expect(volumeVariation).toHaveValue("64");
    expect(screen.getByText("0 64 127")).toBeInTheDocument();
  });

  it("keeps interval/variation controls preserve-only without exact native provenance", () => {
    const soundObject = createNewSceneObject("sounds", 1, 2, 3);

    renderSoundPropertiesDialog(soundObject, "advanced");

    expect(screen.getByRole("group", { name: "Interval" })).toBeDisabled();
    expect(screen.getByRole("group", { name: "Variation" })).toBeDisabled();
    expect(screen.getByRole("group", { name: "Interval" })).toHaveAttribute(
      "title",
      "Preserve-only: exact native Sound interval storage is unavailable.",
    );
  });

  it("renders the exact native base-volume byte scale in the basic tab", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      soundVolume: { volumeByte: 64 },
      source: {
        type: "aurora_git" as const,
        areaId: "area_crypt01",
        sourceObjectId: "obj_snd_animalcriesday",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundVolumeStorage: { volumeByte: 64 },
      },
    };
    renderSoundPropertiesDialog(soundObject, "basic");
    const control = within(screen.getByText("Volume").closest("label")!).getByRole("slider");
    expect(control).toBeEnabled();
    expect(control).toHaveAttribute("max", "127");
    expect(control).toHaveAttribute("step", "1");
    expect(control).toHaveValue("64");
    expect(screen.getByText("0 64 127")).toBeInTheDocument();
  });

  it("keeps base volume preserve-only without exact native provenance", () => {
    renderSoundPropertiesDialog(createNewSceneObject("sounds", 1, 2, 3), "basic");
    const label = screen.getByText("Volume").closest("label")!;
    expect(within(label).getByRole("slider")).toBeDisabled();
    expect(label).toHaveAttribute(
      "title",
      "Preserve-only: exact native Sound base-volume storage is unavailable.",
    );
  });

  it("enables exact native Hours/Times controls and maps bits zero through twenty-three chronologically", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      soundSchedule: { hoursMask: 0x800001, timesByte: 0 },
      source: {
        type: "aurora_git" as const,
        areaId: "area_crypt01",
        sourceObjectId: "obj_snd_animalcriesday",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundScheduleStorage: { hoursMask: 0x800001, timesByte: 0 },
      },
    };
    renderSoundPropertiesDialog(soundObject, "advanced");

    const group = screen.getByRole("group", { name: "When to play" });
    expect(group).toBeEnabled();
    expect(group).toHaveAttribute(
      "title",
      "Exact native Sound Hours/Times storage is available.",
    );
    expect(within(group).getByLabelText("Specific Hours")).toBeChecked();
    const hours = within(group).getAllByRole("checkbox");
    expect(hours).toHaveLength(24);
    expect(hours[0]).toBeChecked();
    expect(hours[1]).not.toBeChecked();
    expect(hours[22]).not.toBeChecked();
    expect(hours[23]).toBeChecked();
    for (const hour of hours) expect(hour).toBeEnabled();
  });

  it("keeps Hours/Times controls preserve-only without exact native provenance", () => {
    renderSoundPropertiesDialog(createNewSceneObject("sounds", 1, 2, 3), "advanced");
    const group = screen.getByRole("group", { name: "When to play" });
    expect(group).toBeDisabled();
    expect(group).toHaveAttribute(
      "title",
      "Preserve-only: exact native Sound Hours/Times storage is unavailable.",
    );
  });

  it("enables the Active checkbox only for exact canonical native storage", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      soundActive: { activeByte: 1 as const },
      source: {
        type: "aurora_git" as const,
        areaId: "area_crypt01",
        sourceObjectId: "obj_snd_animalcriesday",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundActiveStorage: { activeByte: 1 as const },
      },
    };
    renderSoundPropertiesDialog(soundObject, "advanced");
    const checkbox = screen.getByLabelText("Active");
    expect(checkbox).toBeEnabled();
    expect(checkbox).toBeChecked();
    expect(checkbox.closest("label")).toHaveAttribute(
      "title",
      "Exact native Sound Active storage is available.",
    );
  });

  it("keeps Active preserve-only without exact native provenance", () => {
    renderSoundPropertiesDialog(createNewSceneObject("sounds", 1, 2, 3), "advanced");
    const checkbox = screen.getByLabelText("Active");
    expect(checkbox).toBeDisabled();
    expect(checkbox.closest("label")).toHaveAttribute(
      "title",
      "Preserve-only: exact native Sound Active storage is unavailable.",
    );
  });

  it("enables Play Order only for exact canonical native storage", () => {
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      soundPlayOrder: { randomByte: 1 as const },
      source: {
        type: "aurora_git" as const,
        areaId: "area_crypt01",
        sourceObjectId: "obj_snd_animalcriesday",
        sourceIndex: 0,
        sourceKind: "sound" as const,
        soundPlayOrderStorage: { randomByte: 1 as const },
      },
    };
    renderSoundPropertiesDialog(soundObject, "advanced");
    const group = screen.getByRole("group", { name: "Play Order" });
    expect(group).not.toBeDisabled();
    expect(group).toHaveAttribute(
      "title",
      "Exact native Sound Play Order storage is available.",
    );
    expect(screen.getByLabelText("Random")).toBeChecked();
    expect(screen.getByLabelText("Sequential")).not.toBeChecked();
    expect(screen.getByRole("group", { name: "Play Style" })).toBeDisabled();
  });

  it("keeps Play Order preserve-only without exact native provenance", () => {
    renderSoundPropertiesDialog(createNewSceneObject("sounds", 1, 2, 3), "advanced");
    const group = screen.getByRole("group", { name: "Play Order" });
    expect(group).toBeDisabled();
    expect(group).toHaveAttribute(
      "title",
      "Preserve-only: exact native Sound Play Order storage is unavailable.",
    );
  });

  it("enables Play Style only for a complete derivation-consistent native tuple", () => {
    const storage = {
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, soundsCount: 2, intervalDword: 25_000,
      intervalVariationDword: 5_000,
    };
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      soundPlayStyle: storage,
      source: {
        type: "aurora_git" as const, areaId: "area_crypt01",
        sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
        sourceKind: "sound" as const, soundPlayStyleStorage: storage,
      },
    };
    renderSoundPropertiesDialog(soundObject, "advanced");
    const group = screen.getByRole("group", { name: "Play Style" });
    expect(group).not.toBeDisabled();
    expect(group).toHaveAttribute(
      "title",
      "Exact native Sound Play Style and derived Priority storage is available.",
    );
    expect(screen.getByLabelText("Repeating")).toBeChecked();
  });

  it("enables exact playback list controls and playback-backed Play Style", () => {
    const storage = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, intervalDword: 25_000,
      intervalVariationDword: 5_000,
    };
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      soundPlayback: storage,
      source: {
        type: "aurora_git" as const, areaId: "area_crypt01",
        sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
        sourceKind: "sound" as const, soundPlaybackStorage: storage,
      },
    };
    const { unmount } = renderSoundPropertiesDialog(soundObject, "basic");
    expect(screen.getByLabelText("List of Sounds to Play")).toHaveValue("0");
    expect(screen.getByLabelText("Available Sound")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Add Sounds..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Move Down" })).not.toBeDisabled();
    unmount();
    renderSoundPropertiesDialog(soundObject, "advanced");
    expect(screen.getByRole("group", { name: "Play Style" })).not.toBeDisabled();
  });

  it("enables exact profile positioning and exposes editable native MinDistance", () => {
    const profile = {
      sounds: ["wind_a", "wind_b"],
      loopingByte: 0 as const, continuousByte: 1 as const, priorityByte: 20 as const,
      positionalByte: 1 as const, randomPositionByte: 1 as const,
      elevationFloat32: -1.25, maxDistanceFloat32: 14, minDistanceFloat32: 2,
      randomRangeXFloat32: 3, randomRangeYFloat32: 4,
      intervalDword: 25_000, intervalVariationDword: 5_000,
    };
    const soundObject = {
      ...createNewSceneObject("sounds", 1, 2, 3),
      soundPositioning: {
        mode: "random" as const, elevation: -1.25, cutoffDistance: 14,
        maxVolumeDistance: 2, randomRangeWestEast: 3, randomRangeNorthSouth: 4,
      },
      soundProfile: profile,
      source: {
        type: "aurora_git" as const, areaId: "area_crypt01",
        sourceObjectId: "obj_snd_animalcriesday", sourceIndex: 0,
        sourceKind: "sound" as const, soundProfileStorage: profile,
      },
    };
    renderSoundPropertiesDialog(soundObject, "positioning");
    expect(screen.getByLabelText("Plays from random position each play")).not.toBeDisabled();
    expect(screen.getByLabelText("Cutoff Distance")).not.toBeDisabled();
    expect(screen.getByLabelText("Max Volume Distance")).not.toBeDisabled();
    expect(screen.getByLabelText("Max Volume Distance")).toHaveValue("2,0");
    expect(screen.getByLabelText("Elevation")).not.toBeDisabled();
    expect(screen.getByLabelText("North-South")).not.toBeDisabled();
    expect(screen.getByLabelText("West-East")).not.toBeDisabled();
  });
});

function renderSoundPropertiesDialog(
  soundObject: Parameters<typeof buildSoundPropertiesDraft>[0],
  activeTab: "basic" | "positioning" | "advanced",
) {
  return render(
    <SoundPropertiesDialog
      soundPropertiesDialog={{
        objectId: soundObject.id,
        snapshotObject: soundObject,
        draft: buildSoundPropertiesDraft(soundObject),
        activeTab,
        windowX: 20,
        windowY: 20,
        anchorOffsetX: 0,
        anchorOffsetY: 0,
        collapsed: false,
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
      soundCatalogResRefs={["wind_c"]}
    />,
  );
}
