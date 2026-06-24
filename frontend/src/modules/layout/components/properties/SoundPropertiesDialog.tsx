import type { PointerEventHandler, Ref } from "react";
import {
  SharedDialogActionsFooter,
  SharedPropertyDialogChrome,
  SharedPropertyTabsNav
} from "./SharedPropertyDialogSections";
import {
  deriveMaxVolumeDistanceFromCutoff,
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
  removeSelectedSoundListEntry,
  moveSoundListEntryUp,
  moveSoundListEntryDown,
  applySoundPropertiesDraft,
  startSoundPropertiesDialogDrag,
  moveSoundPropertiesDialogDrag,
  endSoundPropertiesDialogDrag,
  cancelSoundPropertiesDialogDrag
}: SoundPropertiesDialogProps) {
  const soundPositioningMode = soundPropertiesDialog.draft.mode;
  const soundGating = {
    positioningDisabled: soundPositioningMode === "everywhere",
    randomRangeEnabled: soundPositioningMode === "random"
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
  const soundAdvancedWhenToPlay = soundPropertiesDialog.draft.whenToPlay;
  const isSoundSpecificHoursEnabled = soundAdvancedWhenToPlay === "hours";

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
                  <button type="button" onClick={() => addSoundListEntry()}>
                    Add Sounds...
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSelectedSoundListEntry()}
                    disabled={soundPropertiesDialog.draft.selectedSoundIndex < 0}
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSoundListEntryUp()}
                    disabled={soundPropertiesDialog.draft.selectedSoundIndex <= 0}
                  >
                    Move Up
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSoundListEntryDown()}
                    disabled={
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
                <label className="canvas-sound-properties-volume-slider">
                  <span>Volume</span>
                  <div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.1}
                      value={Math.min(10, Math.max(0, soundPropertiesDialog.draft.volume * 10))}
                      onChange={(event) =>
                        updateSoundPropertiesDraftField(
                          "volume",
                          Number(event.target.value) / 10
                        )
                      }
                    />
                    <span className="canvas-sound-properties-volume-scale">0 5 10</span>
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
              <fieldset className="canvas-sound-properties-group">
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
                        aria-label="Max Volume Distance"
                        value={formatSoundFixed(
                          deriveMaxVolumeDistanceFromCutoff(
                            soundPropertiesDialog.draft.cutoffDistance
                          ),
                          1
                        )}
                        disabled
                        readOnly
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

              <label className="canvas-sound-properties-mode canvas-sound-properties-active-toggle">
                <input
                  type="checkbox"
                  checked={soundPropertiesDialog.draft.active}
                  onChange={() => toggleSoundPropertiesActive()}
                />
                Active
              </label>

              <fieldset className="canvas-sound-properties-group">
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
                <fieldset className="canvas-sound-properties-group">
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

                <fieldset className="canvas-sound-properties-group">
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

              <fieldset className="canvas-sound-properties-group">
                <legend>Interval</legend>
                <label>
                  Interval between playing sounds (seconds)
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatSoundSeconds(soundPropertiesDialog.draft.intervalMs)}
                    onChange={(event) => {
                      const seconds = parseSoundNumericInput(event.target.value);
                      if (seconds === null || seconds < 0) {
                        return;
                      }
                      updateSoundPropertiesDraftField("intervalMs", seconds * 1000);
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
                      if (seconds === null || seconds < 0) {
                        return;
                      }
                      updateSoundPropertiesDraftField("intervalVariationMs", seconds * 1000);
                    }}
                  />
                </label>
              </fieldset>

              <fieldset className="canvas-sound-properties-group">
                <legend>Variation</legend>
                <label className="canvas-sound-properties-volume-slider">
                  <span>Volume Variation</span>
                  <div>
                    <input
                      type="range"
                      min={0}
                      max={10}
                      step={0.1}
                      value={Math.min(10, Math.max(0, soundPropertiesDialog.draft.volumeVariation * 10))}
                      onChange={(event) =>
                        updateSoundPropertiesDraftField(
                          "volumeVariation",
                          Number(event.target.value) / 10
                        )
                      }
                    />
                    <span className="canvas-sound-properties-volume-scale">0 5 10</span>
                  </div>
                </label>
                <label className="canvas-sound-properties-pitch-variation">
                  <span>Pitch Variation (octaves)</span>
                  <div>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={formatSoundFixed(soundPropertiesDialog.draft.pitchVariation, 2)}
                      onChange={(event) =>
                        updateSoundPropertiesDraftField("pitchVariation", event.target.value)
                      }
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
