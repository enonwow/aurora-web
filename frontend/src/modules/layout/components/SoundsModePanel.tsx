import type {
  SoundApiCategory,
  SoundApiListItem,
  SoundApiSourceLayer,
  SoundApiAudioDeliveryContract
} from "../../sounds/contracts";

export type SoundsCategoryFilter = "all" | SoundApiCategory;
export type SoundsSourceFilter = "all" | SoundApiSourceLayer;

export interface SoundPlaybackDeliveryEvidence {
  mode: SoundApiAudioDeliveryContract["mode"];
  objectKey: string;
  contentType: string;
  sizeBytes: number;
  etag?: string;
  source: "hak" | "vanilla" | "module" | "other";
  preview?: {
    durationMs: number;
    durationSource: "browser-preview";
  };
}

export type SoundPlaybackPipelineState =
  | { kind: "idle"; soundId: null; message: string | null }
  | {
      kind: "processing" | "contracts" | "loading_audio" | "prepared" | "playing";
      soundId: string;
      message: string;
      delivery?: SoundPlaybackDeliveryEvidence;
    }
  | { kind: "error"; soundId: string | null; message: string };

const SOUNDS_CATEGORY_FILTER_OPTIONS: Array<{
  value: SoundsCategoryFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "ambient", label: "Ambient" },
  { value: "music", label: "Music" },
  { value: "effect", label: "Effects" }
];

const SOUNDS_SOURCE_FILTER_OPTIONS: Array<{
  value: SoundsSourceFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "vanilla", label: "Vanilla" },
  { value: "hak", label: "HAK" },
  { value: "module", label: "Module" },
  { value: "other", label: "Other" }
];

export function formatSoundDuration(durationMs: number): string {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "n/a";
  }
  return `${(durationMs / 1000).toFixed(1)}s`;
}

export function formatSoundBytes(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) {
    return "n/a";
  }
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  if (sizeBytes >= 1024) {
    return `${Math.round(sizeBytes / 1024)} KB`;
  }
  return `${sizeBytes} B`;
}

function getSoundPlaybackMessage(
  playbackState: SoundPlaybackPipelineState,
  soundId: string
): string | null {
  return playbackState.soundId === soundId ? playbackState.message : null;
}

export function getSoundPlaybackStatusLabel(
  playbackState: SoundPlaybackPipelineState,
  soundId: string
): string | null {
  if (playbackState.soundId !== soundId) {
    return null;
  }
  if (playbackState.kind === "processing") {
    return "Processing";
  }
  if (playbackState.kind === "contracts") {
    return "Resolving";
  }
  if (playbackState.kind === "loading_audio") {
    return "Loading";
  }
  if (playbackState.kind === "prepared") {
    return "Ready";
  }
  if (playbackState.kind === "playing") {
    return "Playing";
  }
  if (playbackState.kind === "error") {
    return "Error";
  }
  return null;
}

function canStopSoundPlayback(
  playbackState: SoundPlaybackPipelineState,
  soundId: string
): boolean {
  return (
    playbackState.soundId === soundId &&
    (playbackState.kind === "prepared" || playbackState.kind === "playing")
  );
}

interface SoundsModePanelProps {
  sounds: SoundApiListItem[];
  total: number;
  activeSoundId: string | null;
  searchQuery: string;
  categoryFilter: SoundsCategoryFilter;
  sourceFilter: SoundsSourceFilter;
  onSearchQueryChange: (value: string) => void;
  onCategoryFilterChange: (value: SoundsCategoryFilter) => void;
  onSourceFilterChange: (value: SoundsSourceFilter) => void;
  onResetFilters: () => void;
  onSoundSelect: (sound: SoundApiListItem) => void;
  onSoundPlay: (sound: SoundApiListItem) => void;
  onSoundStop: (sound: SoundApiListItem) => void;
  isLoading: boolean;
  loadErrorMessage: string | null;
  playbackState: SoundPlaybackPipelineState;
}

export function SoundsModePanel({
  sounds,
  total,
  activeSoundId,
  searchQuery,
  categoryFilter,
  sourceFilter,
  onSearchQueryChange,
  onCategoryFilterChange,
  onSourceFilterChange,
  onResetFilters,
  onSoundSelect,
  onSoundPlay,
  onSoundStop,
  isLoading,
  loadErrorMessage,
  playbackState
}: SoundsModePanelProps) {
  const shouldShowEmpty = !isLoading && !loadErrorMessage && sounds.length === 0;
  const hasActiveFilters =
    searchQuery.trim().length > 0 || categoryFilter !== "all" || sourceFilter !== "all";
  const resultLabel = hasActiveFilters ? `${sounds.length}/${total}` : String(sounds.length);

  return (
    <article
      className="sidebar-section workspace-mode-panel sounds-mode-panel scene-objects-section scene-object-add-panel"
      aria-label="sounds mode section"
    >
      <header className="scene-objects-header scene-object-add-panel-header">
        <h2>Sounds</h2>
        <span
          className="scene-objects-total"
          title={hasActiveFilters ? "Filtered sounds / loaded sounds" : "Loaded sounds"}
        >
          {resultLabel}
        </span>
      </header>

      <div className="scene-objects-search">
        <input
          type="search"
          aria-label="Filter sounds"
          value={searchQuery}
          onChange={(event) => onSearchQueryChange(event.target.value)}
          placeholder="Filter by id / resref"
        />
        {searchQuery ? (
          <button
            type="button"
            className="scene-objects-search-clear"
            aria-label="Clear sounds filter"
            title="Clear filter"
            onClick={() => onSearchQueryChange("")}
          >
            X
          </button>
        ) : null}
      </div>

      <div className="scene-objects-type-picker scene-objects-type-toggle-picker">
        <span>Category</span>
        <div className="scene-objects-type-toggle-group" role="group" aria-label="Sound category filter">
          {SOUNDS_CATEGORY_FILTER_OPTIONS.map((option) => {
            const isActive = option.value === categoryFilter;
            return (
              <button
                key={option.value}
                type="button"
                className={`scene-objects-type-toggle ${isActive ? "is-active" : ""}`}
                onClick={() => onCategoryFilterChange(option.value)}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="scene-objects-type-picker scene-objects-type-toggle-picker">
        <span>Source</span>
        <div className="scene-objects-type-toggle-group" role="group" aria-label="Sound source filter">
          {SOUNDS_SOURCE_FILTER_OPTIONS.map((option) => {
            const isActive = option.value === sourceFilter;
            return (
              <button
                key={option.value}
                type="button"
                className={`scene-objects-type-toggle ${isActive ? "is-active" : ""}`}
                onClick={() => onSourceFilterChange(option.value)}
                aria-pressed={isActive}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {hasActiveFilters ? (
        <button
          type="button"
          className="scene-objects-filter-reset"
          aria-label="Reset sounds filters"
          onClick={onResetFilters}
        >
          Reset filters
        </button>
      ) : null}

      {isLoading ? (
        <p className="scene-objects-empty" role="status">
          Loading sounds from backend...
        </p>
      ) : null}
      {loadErrorMessage ? (
        <p className="scene-objects-empty" role="alert">
          {loadErrorMessage}
        </p>
      ) : null}
      {playbackState.kind === "error" && playbackState.message ? (
        <p className="scene-objects-empty" role="alert">
          {playbackState.message}
        </p>
      ) : null}

      {shouldShowEmpty ? (
        <p className="scene-objects-empty">No sounds available.</p>
      ) : (
        <ul className="scene-object-list scene-object-add-list" aria-label="sounds mode list">
          {sounds.map((sound) => {
            const isSelected = sound.soundId === activeSoundId;
            const playbackMessage = getSoundPlaybackMessage(playbackState, sound.soundId);
            const playbackStatusLabel = getSoundPlaybackStatusLabel(playbackState, sound.soundId);
            const canStopPlayback = canStopSoundPlayback(playbackState, sound.soundId);
            const isPlaybackBusy =
              playbackState.soundId === sound.soundId &&
              (playbackState.kind === "processing" ||
                playbackState.kind === "contracts" ||
                playbackState.kind === "loading_audio" ||
                playbackState.kind === "playing");
            return (
              <li key={sound.soundId}>
                <div
                  className={`scene-object-row scene-object-add-row ${isSelected ? "is-selected" : ""}`}
                  aria-selected={isSelected}
                >
                  <button
                    type="button"
                    className="scene-object-row-meta scene-object-add-row-meta"
                    onClick={() => onSoundSelect(sound)}
                  >
                    <strong>{sound.resref}</strong>
                    <small title={`${sound.soundId} / ${sound.name}`}>
                      {sound.category} / {sound.format} / {sound.spatialMode}
                    </small>
                  </button>
                  <button
                    type="button"
                    className="scene-object-row-action"
                    onClick={() => onSoundPlay(sound)}
                    disabled={isPlaybackBusy}
                    aria-label={`Play ${sound.resref}`}
                  >
                    Play
                  </button>
                  {canStopPlayback ? (
                    <button
                      type="button"
                      className="scene-object-row-action"
                      onClick={() => onSoundStop(sound)}
                      aria-label={`Stop ${sound.resref}`}
                    >
                      Stop
                    </button>
                  ) : null}
                </div>
                {playbackMessage ? (
                  <p className="scene-objects-empty" role="status">
                    {playbackMessage}
                  </p>
                ) : null}
                {playbackStatusLabel ? (
                  <p className="scene-objects-empty" role="status">
                    state: <strong>{playbackStatusLabel}</strong>
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}
