import type {
  SceneObjectSoundPositioning,
  SceneSoundPositioningMode
} from "../scene/contracts";

export type SoundGuideOverlayKind = "anchor" | "range" | "rand-box" | "height";

export interface SoundGuideOverlayFlags {
  anchor: boolean;
  range: boolean;
  randBox: boolean;
  height: boolean;
}

export type SoundGuideNonSerializableKey =
  | "__soundGuideOverlayState"
  | "__soundGuideGeometryCache"
  | "__soundGuideDiagnostics";

export const SOUND_GUIDE_NON_SERIALIZABLE_KEYS: readonly SoundGuideNonSerializableKey[] = [
  "__soundGuideOverlayState",
  "__soundGuideGeometryCache",
  "__soundGuideDiagnostics"
];

const DEFAULT_SOUND_GUIDE_POSITIONING: Readonly<SceneObjectSoundPositioning> = {
  mode: "specific",
  elevation: 0,
  maxVolumeDistance: 1,
  cutoffDistance: 10,
  randomRangeWestEast: 0,
  randomRangeNorthSouth: 0
};

const MODE_TO_OVERLAYS: Readonly<Record<SceneSoundPositioningMode, readonly SoundGuideOverlayKind[]>> =
  {
    everywhere: Object.freeze([]),
    random: Object.freeze(["anchor", "range", "rand-box", "height"]),
    specific: Object.freeze(["anchor", "range", "height"])
  };

const EMPTY_OVERLAY_FLAGS: Readonly<SoundGuideOverlayFlags> = Object.freeze({
  anchor: false,
  range: false,
  randBox: false,
  height: false
});

function isMode(value: unknown): value is SceneSoundPositioningMode {
  return value === "everywhere" || value === "random" || value === "specific";
}

function asFiniteNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clampMin(value: number, min: number): number {
  return value < min ? min : value;
}

function resolveOverlayFlags(overlays: readonly SoundGuideOverlayKind[]): SoundGuideOverlayFlags {
  return {
    anchor: overlays.includes("anchor"),
    range: overlays.includes("range"),
    randBox: overlays.includes("rand-box"),
    height: overlays.includes("height")
  };
}

export function normalizeSoundGuidePositioning(
  raw: Partial<Record<keyof SceneObjectSoundPositioning, unknown>> | null | undefined,
  fallback?: Partial<SceneObjectSoundPositioning>
): SceneObjectSoundPositioning {
  const nextMode = isMode(raw?.mode)
    ? raw.mode
    : isMode(fallback?.mode)
      ? fallback.mode
      : DEFAULT_SOUND_GUIDE_POSITIONING.mode;
  const nextElevation = clampMin(
    asFiniteNumber(
      raw?.elevation,
      asFiniteNumber(fallback?.elevation, DEFAULT_SOUND_GUIDE_POSITIONING.elevation)
    ),
    0
  );
  const nextMaxVolumeDistance = clampMin(
    asFiniteNumber(
      raw?.maxVolumeDistance,
      asFiniteNumber(fallback?.maxVolumeDistance, DEFAULT_SOUND_GUIDE_POSITIONING.maxVolumeDistance)
    ),
    0
  );
  const nextCutoffDistanceBase = clampMin(
    asFiniteNumber(
      raw?.cutoffDistance,
      asFiniteNumber(fallback?.cutoffDistance, DEFAULT_SOUND_GUIDE_POSITIONING.cutoffDistance)
    ),
    0
  );
  const nextCutoffDistance = Math.max(nextCutoffDistanceBase, nextMaxVolumeDistance);
  const nextRandomRangeWestEast =
    nextMode === "random"
      ? clampMin(
          asFiniteNumber(
            raw?.randomRangeWestEast,
            asFiniteNumber(
              fallback?.randomRangeWestEast,
              DEFAULT_SOUND_GUIDE_POSITIONING.randomRangeWestEast
            )
          ),
          0
        )
      : 0;
  const nextRandomRangeNorthSouth =
    nextMode === "random"
      ? clampMin(
          asFiniteNumber(
            raw?.randomRangeNorthSouth,
            asFiniteNumber(
              fallback?.randomRangeNorthSouth,
              DEFAULT_SOUND_GUIDE_POSITIONING.randomRangeNorthSouth
            )
          ),
          0
        )
      : 0;

  return {
    mode: nextMode,
    elevation: nextElevation,
    maxVolumeDistance: nextMaxVolumeDistance,
    cutoffDistance: nextCutoffDistance,
    randomRangeWestEast: nextRandomRangeWestEast,
    randomRangeNorthSouth: nextRandomRangeNorthSouth
  };
}

export function resolveSoundGuideOverlays(
  mode: SceneSoundPositioningMode
): readonly SoundGuideOverlayKind[] {
  return MODE_TO_OVERLAYS[mode];
}

export function resolveSoundGuideOverlayFlags(
  mode: SceneSoundPositioningMode
): SoundGuideOverlayFlags {
  return resolveOverlayFlags(resolveSoundGuideOverlays(mode));
}

export function resolveSoundGuideOverlaysFromPositioning(
  positioning: Pick<SceneObjectSoundPositioning, "mode"> | null | undefined
): readonly SoundGuideOverlayKind[] {
  if (!positioning) {
    return MODE_TO_OVERLAYS.everywhere;
  }
  return resolveSoundGuideOverlays(positioning.mode);
}

export function resolveSoundGuideOverlayFlagsFromPositioning(
  positioning: Pick<SceneObjectSoundPositioning, "mode"> | null | undefined
): SoundGuideOverlayFlags {
  if (!positioning) {
    return { ...EMPTY_OVERLAY_FLAGS };
  }
  return resolveSoundGuideOverlayFlags(positioning.mode);
}

export function isSoundGuideNonSerializableKey(
  key: string
): key is SoundGuideNonSerializableKey {
  return (SOUND_GUIDE_NON_SERIALIZABLE_KEYS as readonly string[]).includes(key);
}

export function hasSoundGuideNonSerializableState(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  return SOUND_GUIDE_NON_SERIALIZABLE_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

export function stripSoundGuideNonSerializableState<T extends Record<string, unknown>>(
  value: T
): T {
  if (!hasSoundGuideNonSerializableState(value)) {
    return value;
  }
  const nextEntries = Object.entries(value).filter(
    ([key]) => !isSoundGuideNonSerializableKey(key)
  );
  return Object.fromEntries(nextEntries) as T;
}
