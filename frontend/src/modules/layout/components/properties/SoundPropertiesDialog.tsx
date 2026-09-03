import type { PointerEventHandler, Ref } from "react";
import {
  SharedDialogActionsFooter,
  SharedPropertyDialogChrome,
  SharedPropertyTabsNav
} from "./SharedPropertyDialogSections";
import {
  formatSoundFixed,
  formatSoundSeconds,
  parseSoundHourMask,
  parseSoundNumericInput,
  resolveSelectedSoundPreviewKey,
  resolveSoundPreviewAssetUrl,
  SOUND_HOUR_LABELS,
  SOUND_PROPERTIES_TAB_OPTIONS,
  type SoundDayNight,
  type SoundPropertiesDialogState,
  type SoundPropertiesDraft,
  type SoundPropertiesTab,
  type SoundWhenToPlay
} from "../../application/workspaceObjectPropertyDrafts";
import {
  MAX_AREA_SOUND_INTERVAL_VARIATION_MILLISECONDS,
  MAX_AREA_SOUND_VOLUME_VARIATION_BYTE,
  readAreaSoundIntervalVariationStorage,
} from "../../../areas/domain/areaSoundIntervalVariationStorage";
import {
  MAX_AREA_SOUND_VOLUME_BYTE,
  readAreaSoundVolumeStorage,
} from "../../../areas/domain/areaSoundVolumeStorage";
import { readAreaSoundScheduleStorage } from "../../../areas/domain/areaSoundScheduleStorage";
import { readAreaSoundActiveStorage } from "../../../areas/domain/areaSoundActiveStorage";
import { readAreaSoundPlayOrderStorage } from "../../../areas/domain/areaSoundPlayOrderStorage";
import { readAreaSoundPlayStyleStorage } from "../../../areas/domain/areaSoundPlayStyleStorage";
import {
  isAreaSoundResRef,
  MAX_AREA_SOUND_PLAYBACK_LIST_ENTRIES,
  readAreaSoundPlaybackStorage,
} from "../../../areas/domain/areaSoundPlaybackStorage";
import { readAreaSoundProfileStorage } from "../../../areas/domain/areaSoundProfileStorage";

interface SoundPropertiesDialogProps {
  soundPropertiesDialog: SoundPropertiesDialogState;
  soundPropertiesDialogRef?: Ref<HTMLElement>;
  toggleSoundPropertiesDialogCollapsed: () => void;
  cancelSoundPropertiesDialog: () => void;
  setSoundPropertiesActiveTab: (nextTab: SoundPropertiesTab) => void;
  updateSoundPropertiesDraftField: (field: keyof SoundPropertiesDraft, value: string | number) => void;
  patchSoundPropertiesDraft: (patch: Partial<SoundPropertiesDraft>) => void;
  toggleSoundPropertiesActive: () => void;
  setSoundWhenToPlay: (nextWhenToPlay: SoundWhenToPlay, nextDayNight?: SoundDayNight) => void;
  toggleSoundHour: (hourIndex: number) => void;
  selectSoundListEntry: (index: number) => void;
  playSelectedSoundPreview: () => void;
  stopSoundPreviewPlayback: () => void;
  addSoundListEntry: () => void;
  soundCatalogResRefs: readonly string[];
  removeSelectedSoundListEntry: () => void;
  moveSoundListEntryUp: () => void;
  moveSoundListEntryDown: () => void;
  applySoundPropertiesDraft: (closeAfterApply: boolean) => void;
  startSoundPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  moveSoundPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  endSoundPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
  cancelSoundPropertiesDialogDrag?: PointerEventHandler<HTMLElement>;
}

export function SoundPropertiesDialog({
  soundPropertiesDialog,
  soundPropertiesDialogRef,
  toggleSoundPropertiesDialogCollapsed,
  cancelSoundPropertiesDialog,
  setSoundPropertiesActiveTab,
  updateSoundPropertiesDraftField,
  patchSoundPropertiesDraft,
  toggleSoundPropertiesActive,
  setSoundWhenToPlay,
  toggleSoundHour,
  selectSoundListEntry,
  playSelectedSoundPreview,
  stopSoundPreviewPlayback,
  addSoundListEntry,
  soundCatalogResRefs,
  removeSelectedSoundListEntry,
  moveSoundListEntryUp,
  moveSoundListEntryDown,
  applySoundPropertiesDraft,
  startSoundPropertiesDialogDrag,
  moveSoundPropertiesDialogDrag,
  endSoundPropertiesDialogDrag,
  cancelSoundPropertiesDialogDrag
}: SoundPropertiesDialogProps) {
  const soundProfileEditable =
    readAreaSoundProfileStorage(
      soundPropertiesDialog.snapshotObject.source?.soundProfileStorage,
    ) !== null
    && readAreaSoundProfileStorage(
      soundPropertiesDialog.snapshotObject.soundProfile,
    ) !== null;
  const soundPositioningMode = soundPropertiesDialog.draft.mode;
  const soundGating = {
    positioningDisabled: !soundProfileEditable || soundPositioningMode === "everywhere",
    randomRangeEnabled: soundProfileEditable && soundPositioningMode === "random"
  };
  const soundRandomRangeDisplay = {
    westEast:
      soundGating.randomRangeEnabled || soundPropertiesDialog.draft.randomRangeWestEast > 0
        ? soundPropertiesDialog.draft.randomRangeWestEast
        : 0,
    northSouth:
      soundGating.randomRangeEnabled || soundPropertiesDialog.draft.randomRangeNorthSouth > 0
        ? soundPropertiesDialog.draft.randomRangeNorthSouth
        : 0
  };
  const canPreviewSelectedSound =
    resolveSoundPreviewAssetUrl(resolveSelectedSoundPreviewKey(soundPropertiesDialog.draft)) !== null;
  const soundHourMaskFlags = parseSoundHourMask(
    soundPropertiesDialog.draft.hourMask,
    soundPropertiesDialog.draft.hoursStart,
    soundPropertiesDialog.draft.hoursEnd
  );
  const soundIntervalVariationEditable =
    readAreaSoundIntervalVariationStorage(
      soundPropertiesDialog.snapshotObject.source?.soundIntervalVariationStorage,
    ) !== null
    && readAreaSoundIntervalVariationStorage(
      soundPropertiesDialog.snapshotObject.soundIntervalVariation,
    ) !== null;
  const soundVolumeEditable =
    readAreaSoundVolumeStorage(
      soundPropertiesDialog.snapshotObject.source?.soundVolumeStorage,
    ) !== null
    && readAreaSoundVolumeStorage(soundPropertiesDialog.snapshotObject.soundVolume) !== null;
  const soundScheduleEditable =
    readAreaSoundScheduleStorage(
      soundPropertiesDialog.snapshotObject.source?.soundScheduleStorage,
    ) !== null
    && readAreaSoundScheduleStorage(
      soundPropertiesDialog.snapshotObject.soundSchedule,
    ) !== null;
  const soundActiveEditable =
    readAreaSoundActiveStorage(
      soundPropertiesDialog.snapshotObject.source?.soundActiveStorage,
    ) !== null
    && readAreaSoundActiveStorage(soundPropertiesDialog.snapshotObject.soundActive) !== null;
  const soundPlayOrderEditable =
    readAreaSoundPlayOrderStorage(
      soundPropertiesDialog.snapshotObject.source?.soundPlayOrderStorage,
    ) !== null
    && readAreaSoundPlayOrderStorage(
      soundPropertiesDialog.snapshotObject.soundPlayOrder,
    ) !== null;
  const soundPlaybackEditable = soundProfileEditable || (
    readAreaSoundPlaybackStorage(
      soundPropertiesDialog.snapshotObject.source?.soundPlaybackStorage,
    ) !== null
    && readAreaSoundPlaybackStorage(
      soundPropertiesDialog.snapshotObject.soundPlayback,
    ) !== null
  );
  const soundPlayStyleEditable = soundProfileEditable || soundPlaybackEditable || (
    readAreaSoundPlayStyleStorage(
      soundPropertiesDialog.snapshotObject.source?.soundPlayStyleStorage,
    ) !== null
    && readAreaSoundPlayStyleStorage(
      soundPropertiesDialog.snapshotObject.soundPlayStyle,
    ) !== null
  );
  const admittedSoundCatalogResRefs = Array.from(new Set(
    soundCatalogResRefs.filter(isAreaSoundResRef),
  )).sort((left, right) => left.localeCompare(right));
  const canAddSoundListEntry = soundPlaybackEditable
    && isAreaSoundResRef(soundPropertiesDialog.draft.catalogSoundResRef)
    && admittedSoundCatalogResRefs.includes(soundPropertiesDialog.draft.catalogSoundResRef)
    && soundPropertiesDialog.draft.soundList.length < MAX_AREA_SOUND_PLAYBACK_LIST_ENTRIES;
  const soundAdvancedWhenToPlay = soundPropertiesDialog.draft.whenToPlay;
  const isSoundSpecificHoursEnabled =
    soundScheduleEditable && soundAdvancedWhenToPlay === "hours";

  return (
    <SharedPropertyDialogChrome
      articleRef={soundPropertiesDialogRef}
      articleClassName="canvas-sound-properties-dialog"
      ariaLabel="Sound properties"
      windowX={soundPropertiesDialog.windowX}
      windowY={soundPropertiesDialog.windowY}
      headerClassName="canvas-sound-properties-header"
      headerCopyClassName="canvas-sound-properties-header-copy"
      headerActionsClassName="canvas-sound-properties-header-actions"
      title="Sound Properties"
      subtitle={soundPropertiesDialog.draft.tag || soundPropertiesDialog.objectId}
      collapsed={soundPropertiesDialog.collapsed}
      collapseLabel="Collapse sound properties dialog"
      expandLabel="Expand sound properties dialog"
      closeLabel="Close sound properties dialog"
      onToggleCollapsed={toggleSoundPropertiesDialogCollapsed}
      onClose={cancelSoundPropertiesDialog}
      onArticleMouseDown={(event) => event.stopPropagation()}
      onArticleContextMenu={(event) => event.preventDefault()}
      onHeaderPointerDown={startSoundPropertiesDialogDrag}
      onHeaderPointerMove={moveSoundPropertiesDialogDrag}
      onHeaderPointerUp={endSoundPropertiesDialogDrag}
      onHeaderPointerCancel={cancelSoundPropertiesDialogDrag}
    >
      <>
          <SharedPropertyTabsNav
            className="canvas-sound-properties-tabs"
            ariaLabel="sound properties tabs"
            tabs={SOUND_PROPERTIES_TAB_OPTIONS}
            activeTab={soundPropertiesDialog.activeTab}
            onSelectTab={setSoundPropertiesActiveTab}
          />

          {soundPropertiesDialog.activeTab === "basic" ? (
            <section className="canvas-sound-properties-shell canvas-sound-properties-basic-shell">
              <div className="canvas-sound-properties-basic-top">
                <label className="canvas-sound-properties-inline-input">
                  <span>Name</span>
                  <span className="canvas-sound-properties-inline-input-row">
                    <input
                      type="text"
                      value={soundPropertiesDialog.draft.name}
                      onChange={(event) =>
                        updateSoundPropertiesDraftField("name", event.target.value)
                      }
                    />
                    <button type="button" className="canvas-sound-properties-inline-button">
                      ...
                    </button>
                  </span>
                </label>
                <label className="canvas-sound-properties-inline-input">
                  <span>Tag</span>
                  <input
                    type="text"
                    value={soundPropertiesDialog.draft.tag}
                    onChange={(event) =>
                      updateSoundPropertiesDraftField("tag", event.target.value)
                    }
                  />
                </label>
                <label className="canvas-sound-properties-inline-input">
                  <span>Comments</span>
                  <textarea
                    value={soundPropertiesDialog.draft.comments}
                    onChange={(event) =>
                      updateSoundPropertiesDraftField("comments", event.target.value)
                    }
                  />
                </label>
              </div>
              <div className="canvas-sound-properties-basic-middle">
                <label className="canvas-sound-properties-sound-list">
                  <span>List of Sounds to Play</span>
                  <select
                    size={8}
                    value={
                      soundPropertiesDialog.draft.selectedSoundIndex >= 0
                        ? String(soundPropertiesDialog.draft.selectedSoundIndex)
                        : ""
                    }
                    onChange={(event) => selectSoundListEntry(Number(event.target.value))}
                  >
                    {soundPropertiesDialog.draft.soundList.map((entry, index) => (
                      <option key={`${entry}_${index}`} value={String(index)}>
                        {entry}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="canvas-sound-properties-sound-actions">
                  <label>
                    <span>Available Sound</span>
                    <select
                      value={soundPropertiesDialog.draft.catalogSoundResRef}
                      disabled={!soundPlaybackEditable}
                      onChange={(event) =>
                        updateSoundPropertiesDraftField("catalogSoundResRef", event.target.value)
                      }
                    >
                      <option value="">Select...</option>
                      {admittedSoundCatalogResRefs.map((resRef) => (
                        <option key={resRef} value={resRef}>{resRef}</option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => playSelectedSoundPreview()}
                    disabled={!canPreviewSelectedSound}
                  >
                    Play
                  </button>
                  <button type="button" onClick={() => stopSoundPreviewPlayback()}>
                    Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => addSoundListEntry()}
                    disabled={!canAddSoundListEntry}
                  >
                    Add Sounds...
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSelectedSoundListEntry()}
                    disabled={
                      !soundPlaybackEditable
                      || soundPropertiesDialog.draft.selectedSoundIndex < 0
                    }
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSoundListEntryUp()}
                    disabled={
                      !soundPlaybackEditable
                      || soundPropertiesDialog.draft.selectedSoundIndex <= 0
                    }
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSoundListEntryDown()}
                    disabled={
                      !soundPlaybackEditable ||
                      soundPropertiesDialog.draft.selectedSoundIndex < 0 ||
                      soundPropertiesDialog.draft.selectedSoundIndex >=
                        soundPropertiesDialog.draft.soundList.length - 1
                    }
                  >
                    Move Down
                  </button>
                </div>
              </div>
              <div className="canvas-sound-properties-basic-bottom">
                <label
                  className="canvas-sound-properties-volume-slider"
                  title={soundVolumeEditable
                    ? "Exact native Sound base-volume storage is available."
                    : "Preserve-only: exact native Sound base-volume storage is unavailable."}
                >
                  <span>Volume</span>
                  <div>
                    <input
                      type="range"
                      min={0}
                      max={MAX_AREA_SOUND_VOLUME_BYTE}
                      step={1}
                      disabled={!soundVolumeEditable}
                      value={Math.min(
                        MAX_AREA_SOUND_VOLUME_BYTE,
                        Math.max(0, Math.round(soundPropertiesDialog.draft.volume * 127)),
                      )}
                      onChange={(event) =>
                        updateSoundPropertiesDraftField(
                          "volume",
                          Number(event.target.value) / 127
                        )
                      }
                    />
                    <span className="canvas-sound-properties-volume-scale">0 64 127</span>
                  </div>
                </label>
                <section
                  className="canvas-sound-properties-backend-contract"
                  aria-label="Backend sound contract"
                >
                  <h3>Backend Sound Contract</h3>
                  <dl>
                    <div>
                      <dt>soundId</dt>
                      <dd>{soundPropertiesDialog.draft.backendSoundId || "none"}</dd>
                    </div>
                    <div>
                      <dt>resref</dt>
                      <dd>{soundPropertiesDialog.draft.resRef || "none"}</dd>
                    </div>
                    <div>
                      <dt>category</dt>
                      <dd>{soundPropertiesDialog.draft.backendCategory || "none"}</dd>
                    </div>
                    <div>
                      <dt>format</dt>
                      <dd>{soundPropertiesDialog.draft.backendFormat || "none"}</dd>
                    </div>
                    <div>
                      <dt>spatialMode</dt>
                      <dd>{soundPropertiesDialog.draft.backendSpatialMode || "none"}</dd>
                    </div>
                    <div>
                      <dt>playbackMode</dt>
                      <dd>{soundPropertiesDialog.draft.backendPlaybackMode || "none"}</dd>
                    </div>
                  </dl>
                </section>
              </div>
            </section>
          ) : null}

          {soundPropertiesDialog.activeTab === "positioning" ? (
            <section className="canvas-sound-properties-shell canvas-sound-properties-shell-positioning">
              <fieldset
                className="canvas-sound-properties-group"
                disabled={!soundProfileEditable}
                title={soundProfileEditable
                  ? "Exact native Sound spatial profile storage is available."
                  : "Preserve-only: exact native Sound spatial profile storage is unavailable."}
              >
                <legend>Mode</legend>
                <label className="canvas-sound-properties-mode">
                  <input
                    type="radio"
                    name="sound-positioning-mode"
                    checked={soundPropertiesDialog.draft.mode === "everywhere"}
                    onChange={() => updateSoundPropertiesDraftField("mode", "everywhere")}
                  />
                  Plays everywhere in area
                </label>
                <label className="canvas-sound-properties-mode">
                  <input
                    type="radio"
                    name="sound-positioning-mode"
                    checked={soundPropertiesDialog.draft.mode === "random"}
                    onChange={() => updateSoundPropertiesDraftField("mode", "random")}
                  />
                  Plays from random position each play
                </label>
                <label className="canvas-sound-properties-mode">
                  <input
                    type="radio"
                    name="sound-positioning-mode"
                    checked={soundPropertiesDialog.draft.mode === "specific"}
                    onChange={() => updateSoundPropertiesDraftField("mode", "specific")}
                  />
                  Plays from specific position
                </label>
              </fieldset>
              <fieldset className="canvas-sound-properties-group">
                <legend>Volume Distances</legend>
                <div className="canvas-sound-properties-positioning-aurora-row">
                  <div className="canvas-sound-properties-volume-visual" aria-hidden="true">
                    <span className="outer-ring" />
                    <span className="inner-ring" />
                    <span className="center-dot" />
                    <span className="center-guide" />
                    <span className="max-distance-arrow" />
                    <span className="cutoff-distance-arrow" />
                  </div>
                  <div className="canvas-sound-properties-volume-inputs">
                    <label>
                      Cutoff distance (m)
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Cutoff Distance"
                        value={formatSoundFixed(soundPropertiesDialog.draft.cutoffDistance, 1)}
                        disabled={soundGating.positioningDisabled}
                        onChange={(event) =>
                          updateSoundPropertiesDraftField("cutoffDistance", event.target.value)
                        }
                      />
                    </label>
                    <label>
                      Max Volume Distance (m)
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label="Max Volume Distance"
                        value={formatSoundFixed(soundPropertiesDialog.draft.maxVolumeDistance, 1)}
                        disabled={soundGating.positioningDisabled}
                        onChange={(event) =>
                          updateSoundPropertiesDraftField(
                            "maxVolumeDistance",
                            event.target.value,
                          )
                        }
                      />
                    </label>
                  </div>
                </div>
              </fieldset>
              <div className="canvas-sound-properties-positioning-grid">
                <fieldset className="canvas-sound-properties-group">
                  <legend>Height (m)</legend>
                  <div className="canvas-sound-properties-positioning-aurora-row canvas-sound-properties-positioning-aurora-row-height">
                    <div className="canvas-sound-properties-height-visual" aria-hidden="true">
                      <span className="height-circle" />
                      <span className="height-inner-circle" />
                      <span className="height-arrow" />
                      <span className="height-plane" />
                    </div>
                    <div className="canvas-sound-properties-height-input">
                      <label>
                        Height (m)
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="Elevation"
                          value={formatSoundFixed(soundPropertiesDialog.draft.elevation, 1)}
                          disabled={soundGating.positioningDisabled}
                          onChange={(event) =>
                            updateSoundPropertiesDraftField("elevation", event.target.value)
                          }
                        />
                      </label>
                    </div>
                  </div>
                </fieldset>
                <fieldset className="canvas-sound-properties-group">
                  <legend>Random Range</legend>
                  <div className="canvas-sound-properties-positioning-aurora-row canvas-sound-properties-positioning-aurora-row-random">
                    <div className="canvas-sound-properties-random-visual" aria-hidden="true">
                      {soundPropertiesDialog.draft.mode === "random" ? (
                        <span className="random-dice">{"\u2684"}</span>
                      ) : null}
                      <span className="ns-arrow" />
                      <span className="we-arrow" />
                      <span className="ns-label">N-S</span>
                      <span className="we-label">W-E</span>
                    </div>
                    <div className="canvas-sound-properties-random-inputs">
                      <label>
                        North-South Random Range (m)
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="North-South"
                          value={formatSoundFixed(soundRandomRangeDisplay.northSouth, 1)}
                          disabled={!soundGating.randomRangeEnabled}
                          onChange={(event) =>
                            updateSoundPropertiesDraftField(
                              "randomRangeNorthSouth",
                              event.target.value
                            )
                          }
                        />
                      </label>
                      <label>
                        West-East Random Range (m)
                        <input
                          type="text"
                          inputMode="decimal"
                          aria-label="West-East"
                          value={formatSoundFixed(soundRandomRangeDisplay.westEast, 1)}
                          disabled={!soundGating.randomRangeEnabled}
                          onChange={(event) =>
                            updateSoundPropertiesDraftField(
                              "randomRangeWestEast",
                              event.target.value
                            )
                          }
                        />
                      </label>
                    </div>
                  </div>
                </fieldset>
              </div>
              <p className="canvas-sound-properties-note">
                Aurora-first gating: <strong>everywhere</strong> disables positioning,{" "}
                <strong>random</strong> enables random range, and <strong>specific</strong> keeps
                fixed anchor behavior.
              </p>
            </section>
          ) : null}

          {soundPropertiesDialog.activeTab === "advanced" ? (
            <section className="canvas-sound-properties-shell canvas-sound-properties-advanced-shell">
              <div className="canvas-sound-properties-advanced-resref-row">
                <label className="canvas-sound-properties-inline-input">
                  <span>Blueprint ResRef</span>
                  <input type="text" value={soundPropertiesDialog.draft.resRef} readOnly />
                </label>
                <button type="button" className="canvas-sound-properties-inline-button">
                  Variables
                </button>
              </div>

              <label
                className="canvas-sound-properties-mode canvas-sound-properties-active-toggle"
                title={soundActiveEditable
                  ? "Exact native Sound Active storage is available."
                  : "Preserve-only: exact native Sound Active storage is unavailable."}
              >
                <input
                  type="checkbox"
                  checked={soundPropertiesDialog.draft.active}
                  disabled={!soundActiveEditable}
                  onChange={() => toggleSoundPropertiesActive()}
                />
                Active
              </label>

              <fieldset
                className="canvas-sound-properties-group"
                disabled={!soundScheduleEditable}
                title={soundScheduleEditable
                  ? "Exact native Sound Hours/Times storage is available."
                  : "Preserve-only: exact native Sound Hours/Times storage is unavailable."}
              >
                <legend>When to play</legend>
                <label className="canvas-sound-properties-mode">
                  <input
                    type="radio"
                    name="sound-advanced-when-to-play"
                    checked={
                      soundAdvancedWhenToPlay === "dayNight" &&
                      soundPropertiesDialog.draft.dayNight === "day"
                    }
                    onChange={() => setSoundWhenToPlay("dayNight", "day")}
                  />
                  Play during the day
                </label>
                <label className="canvas-sound-properties-mode">
                  <input
                    type="radio"
                    name="sound-advanced-when-to-play"
                    checked={
                      soundAdvancedWhenToPlay === "dayNight" &&
                      soundPropertiesDialog.draft.dayNight === "night"
                    }
                    onChange={() => setSoundWhenToPlay("dayNight", "night")}
                  />
                  Play at night
                </label>
                <label className="canvas-sound-properties-mode">
                  <input
                    type="radio"
                    name="sound-advanced-when-to-play"
                    checked={soundAdvancedWhenToPlay === "always"}
                    onChange={() => setSoundWhenToPlay("always", "both")}
                  />
                  Play at all times
                </label>
                <label className="canvas-sound-properties-mode">
                  <input
                    type="radio"
                    name="sound-advanced-when-to-play"
                    checked={soundAdvancedWhenToPlay === "hours"}
                    onChange={() => setSoundWhenToPlay("hours")}
                  />
                  Specific Hours
                </label>
                <div
                  className={`canvas-sound-properties-hour-grid ${
                    isSoundSpecificHoursEnabled ? "" : "is-disabled"
                  }`}
                >
                  <span className="canvas-sound-properties-hour-grid-label" />
                  {SOUND_HOUR_LABELS.map((label) => (
                    <span key={`hour_head_${label}`} className="canvas-sound-properties-hour-grid-label">
                      {label}
                    </span>
                  ))}
                  <span className="canvas-sound-properties-hour-grid-label">AM</span>
                  {SOUND_HOUR_LABELS.map((_, hourIndex) => (
                    <input
                      key={`hour_am_${hourIndex}`}
                      type="checkbox"
                      checked={soundHourMaskFlags[hourIndex]}
                      disabled={!isSoundSpecificHoursEnabled}
                      onChange={() => toggleSoundHour(hourIndex)}
                    />
                  ))}
                  <span className="canvas-sound-properties-hour-grid-label">PM</span>
                  {SOUND_HOUR_LABELS.map((_, hourIndex) => (
                    <input
                      key={`hour_pm_${hourIndex}`}
                      type="checkbox"
                      checked={soundHourMaskFlags[hourIndex + 12]}
                      disabled={!isSoundSpecificHoursEnabled}
                      onChange={() => toggleSoundHour(hourIndex + 12)}
                    />
                  ))}
                </div>
              </fieldset>

              <div className="canvas-sound-properties-advanced-grid">
                <fieldset
                  className="canvas-sound-properties-group"
                  disabled={!soundPlayStyleEditable}
                  title={soundPlayStyleEditable
                    ? "Exact native Sound Play Style and derived Priority storage is available."
                    : "Preserve-only: exact native Sound Play Style and derived Priority storage is unavailable."}
                >
                  <legend>Play Style</legend>
                  <label className="canvas-sound-properties-mode">
                    <input
                      type="radio"
                      name="sound-advanced-play-style"
                      checked={soundPropertiesDialog.draft.playStyle === "once"}
                      onChange={() => patchSoundPropertiesDraft({ playStyle: "once" })}
                    />
                    Once
                  </label>
                  <label className="canvas-sound-properties-mode">
                    <input
                      type="radio"
                      name="sound-advanced-play-style"
                      checked={soundPropertiesDialog.draft.playStyle === "repeat"}
                      onChange={() => patchSoundPropertiesDraft({ playStyle: "repeat" })}
                    />
                    Repeating
                  </label>
                  <label className="canvas-sound-properties-mode">
                    <input
                      type="radio"
                      name="sound-advanced-play-style"
                      checked={soundPropertiesDialog.draft.playStyle === "loop"}
                      onChange={() => patchSoundPropertiesDraft({ playStyle: "loop" })}
                    />
                    Seamlessly looping
                  </label>
                </fieldset>

                <fieldset
                  className="canvas-sound-properties-group"
                  disabled={!soundPlayOrderEditable}
                  title={soundPlayOrderEditable
                    ? "Exact native Sound Play Order storage is available."
                    : "Preserve-only: exact native Sound Play Order storage is unavailable."}
                >
                  <legend>Play Order</legend>
                  <label className="canvas-sound-properties-mode">
                    <input
                      type="radio"
                      name="sound-advanced-play-order"
                      checked={soundPropertiesDialog.draft.playOrder === "sequential"}
                      onChange={() => patchSoundPropertiesDraft({ playOrder: "sequential" })}
                    />
                    Sequential
                  </label>
                  <label className="canvas-sound-properties-mode">
                    <input
                      type="radio"
                      name="sound-advanced-play-order"
                      checked={soundPropertiesDialog.draft.playOrder === "random"}
                      onChange={() => patchSoundPropertiesDraft({ playOrder: "random" })}
                    />
                    Random
                  </label>
                </fieldset>
              </div>

              <fieldset
                className="canvas-sound-properties-group"
                disabled={!soundIntervalVariationEditable}
                title={soundIntervalVariationEditable
                  ? "Exact native Sound interval storage is available."
                  : "Preserve-only: exact native Sound interval storage is unavailable."}
              >
                <legend>Interval</legend>
                <label>
                  Interval between playing sounds (seconds)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatSoundSeconds(soundPropertiesDialog.draft.intervalMs)}
                    onChange={(event) => {
                      const seconds = parseSoundNumericInput(event.target.value);
                      const milliseconds = seconds === null ? Number.NaN : Math.round(seconds * 1000);
                      if (
                        seconds === null
                        || seconds < 0
                        || milliseconds > MAX_AREA_SOUND_INTERVAL_VARIATION_MILLISECONDS
                        || milliseconds % 10 !== 0
                        || Math.abs(milliseconds - seconds * 1000) > Number.EPSILON * 1000
                      ) {
                        return;
                      }
                      updateSoundPropertiesDraftField("intervalMs", milliseconds);
                    }}
                  />
                </label>
                <label>
                  Interval Variation (seconds)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatSoundSeconds(soundPropertiesDialog.draft.intervalVariationMs)}
                    onChange={(event) => {
                      const seconds = parseSoundNumericInput(event.target.value);
                      const milliseconds = seconds === null ? Number.NaN : Math.round(seconds * 1000);
                      if (
                        seconds === null
                        || seconds < 0
                        || milliseconds > MAX_AREA_SOUND_INTERVAL_VARIATION_MILLISECONDS
                        || milliseconds % 10 !== 0
                        || Math.abs(milliseconds - seconds * 1000) > Number.EPSILON * 1000
                      ) {
                        return;
                      }
                      updateSoundPropertiesDraftField("intervalVariationMs", milliseconds);
                    }}
                  />
                </label>
              </fieldset>

              <fieldset
                className="canvas-sound-properties-group"
                disabled={!soundIntervalVariationEditable}
                title={soundIntervalVariationEditable
                  ? "Exact native Sound variation storage is available."
                  : "Preserve-only: exact native Sound variation storage is unavailable."}
              >
                <legend>Variation</legend>
                <label className="canvas-sound-properties-volume-slider">
                  <span>Volume Variation</span>
                  <div>
                    <input
                      type="range"
                      min={0}
                      max={MAX_AREA_SOUND_VOLUME_VARIATION_BYTE}
                      step={1}
                      value={Math.min(
                        MAX_AREA_SOUND_VOLUME_VARIATION_BYTE,
                        Math.max(
                          0,
                          Math.round(soundPropertiesDialog.draft.volumeVariation * 127),
                        ),
                      )}
                      onChange={(event) =>
                        updateSoundPropertiesDraftField(
                          "volumeVariation",
                          Number(event.target.value) / 127
                        )
                      }
                    />
                    <span className="canvas-sound-properties-volume-scale">0 64 127</span>
                  </div>
                </label>
                <label className="canvas-sound-properties-pitch-variation">
                  <span>Pitch Variation (octaves)</span>
                  <div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatSoundFixed(soundPropertiesDialog.draft.pitchVariation, 2)}
                      onChange={(event) => {
                        const value = parseSoundNumericInput(event.target.value);
                        if (
                          value === null
                          || value < 0
                          || value > 1
                          || value !== Math.round(value * 100) / 100
                        ) return;
                        updateSoundPropertiesDraftField("pitchVariation", value);
                      }}
                    />
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={soundPropertiesDialog.draft.pitchVariation}
                      onChange={(event) =>
                        updateSoundPropertiesDraftField("pitchVariation", event.target.value)
                      }
                    />
                  </div>
                </label>
              </fieldset>
            </section>
          ) : null}

          <SharedDialogActionsFooter
            className="canvas-sound-properties-actions"
            onApply={() => applySoundPropertiesDraft(false)}
            onOk={() => applySoundPropertiesDraft(true)}
            onCancel={() => cancelSoundPropertiesDialog()}
          />
      </>
    </SharedPropertyDialogChrome>
  );
}
