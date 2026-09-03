export type AreaObjectSourceKind =
  | "placeable"
  | "door"
  | "creature"
  | "encounter"
  | "item"
  | "sound"
  | "store"
  | "trigger"
  | "waypoint";

export interface AreaObjectSourcePlacementIdentity {
  readonly templateResRef?: string;
  readonly tag?: string;
}

export interface AreaObjectSourceCollections<
  TPlacement extends AreaObjectSourcePlacementIdentity = AreaObjectSourcePlacementIdentity,
> {
  readonly placeables: readonly TPlacement[];
  readonly doors: readonly TPlacement[];
  readonly creatures: readonly TPlacement[];
  readonly encounters: readonly TPlacement[];
  readonly items: readonly TPlacement[];
  readonly sounds: readonly TPlacement[];
  readonly stores: readonly TPlacement[];
  readonly triggers: readonly TPlacement[];
  readonly waypoints: readonly TPlacement[];
}

export interface IndexedAreaObjectSource<
  TPlacement extends AreaObjectSourcePlacementIdentity = AreaObjectSourcePlacementIdentity,
> {
  readonly kind: AreaObjectSourceKind;
  readonly sourceIndex: number;
  readonly sourceObjectId: string;
  readonly placement: TPlacement;
}

const FAMILY_PROFILES = Object.freeze([
  Object.freeze({ kind: "placeable" as const, key: "placeables" as const, prefix: "plc" }),
  Object.freeze({ kind: "door" as const, key: "doors" as const, prefix: "dr" }),
  Object.freeze({ kind: "creature" as const, key: "creatures" as const, prefix: "cre" }),
  Object.freeze({ kind: "encounter" as const, key: "encounters" as const, prefix: "enc" }),
  Object.freeze({ kind: "item" as const, key: "items" as const, prefix: "itm" }),
  Object.freeze({ kind: "sound" as const, key: "sounds" as const, prefix: "snd" }),
  Object.freeze({ kind: "store" as const, key: "stores" as const, prefix: "sto" }),
  Object.freeze({ kind: "trigger" as const, key: "triggers" as const, prefix: "trg" }),
  Object.freeze({ kind: "waypoint" as const, key: "waypoints" as const, prefix: "wpt" }),
]);

export function enumerateAreaObjectSources<
  TPlacement extends AreaObjectSourcePlacementIdentity,
>(collections: AreaObjectSourceCollections<TPlacement>): readonly IndexedAreaObjectSource<TPlacement>[] {
  const usedIds = new Set<string>();
  const nextSuffixByBase = new Map<string, number>();
  const indexed: IndexedAreaObjectSource<TPlacement>[] = [];
  for (const profile of FAMILY_PROFILES) {
    collections[profile.key].forEach((placement, sourceIndex) => {
      const templateResRef = normalizeAreaObjectSourceToken(placement.templateResRef ?? "");
      const tag = normalizeAreaObjectSourceToken(placement.tag ?? "");
      const baseToken = tag || templateResRef || `entry_${sourceIndex + 1}`;
      const base = `obj_${profile.prefix}_${baseToken}`;
      indexed.push(Object.freeze({
        kind: profile.kind,
        sourceIndex,
        sourceObjectId: allocateUniqueId(usedIds, nextSuffixByBase, base),
        placement,
      }));
    });
  }
  return Object.freeze(indexed);
}

export function normalizeAreaObjectSourceToken(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9_-]+/gu, "_").slice(0, 64);
}

function allocateUniqueId(
  usedIds: Set<string>,
  nextSuffixByBase: Map<string, number>,
  base: string,
): string {
  if (!usedIds.has(base)) {
    usedIds.add(base);
    nextSuffixByBase.set(base, 2);
    return base;
  }
  for (let suffix = nextSuffixByBase.get(base) ?? 2; ; suffix += 1) {
    const suffixText = `_${suffix}`;
    const candidate = `${base}${suffixText}`;
    if (!usedIds.has(candidate)) {
      usedIds.add(candidate);
      nextSuffixByBase.set(base, suffix + 1);
      return candidate;
    }
  }
}
