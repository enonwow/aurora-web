import { createHash } from "node:crypto";
import type { AreaCreateTile } from "./area-create-command.types";

export const AUR_S05_05_CREATION_PROFILE_ID =
  "aur-s05-05-microset-tiny-2x2.v1" as const;
export const AUR_S05_05_INITIALIZER_VERSION =
  "aur-s05-05-observed-grid.v1" as const;

export interface AreaCreationProfileDefinition {
  readonly id: typeof AUR_S05_05_CREATION_PROFILE_ID;
  readonly evidenceScope: "aur-s05-05-structural-candidate";
  readonly tilesetResRef: "tms01";
  readonly width: 2;
  readonly height: 2;
  readonly initializerAlgorithmVersion: typeof AUR_S05_05_INITIALIZER_VERSION;
  readonly initializerSeed: 0;
  readonly tiles: readonly AreaCreateTile[];
  readonly groupInstances: readonly [];
}

const PROFILE_DEFINITION: AreaCreationProfileDefinition = deepFreeze({
  id: AUR_S05_05_CREATION_PROFILE_ID,
  evidenceScope: "aur-s05-05-structural-candidate",
  tilesetResRef: "tms01",
  width: 2,
  height: 2,
  initializerAlgorithmVersion: AUR_S05_05_INITIALIZER_VERSION,
  initializerSeed: 0,
  tiles: [2, 1, 3, 0].map((orientation, index) => ({
    row: Math.floor(index / 2),
    col: index % 2,
    tileId: 12,
    orientation: orientation as 0 | 1 | 2 | 3,
    height: 0,
    mainLight1: 0,
    mainLight2: 0,
    sourceLight1: 0,
    sourceLight2: 0,
    animLoop1: 1,
    animLoop2: 1,
    animLoop3: 1,
  })),
  groupInstances: [],
});

export const AUR_S05_05_CREATION_PROFILE_FINGERPRINT = createHash("sha256")
  .update(canonicalJson(PROFILE_DEFINITION), "utf8")
  .digest("hex");

export function getAurS0505CreationProfile(): AreaCreationProfileDefinition {
  return PROFILE_DEFINITION;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
    .join(",")}}`;
}

function deepFreeze<T>(value: T): T {
  if (Object(value) !== value) {
    return value;
  }
  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
