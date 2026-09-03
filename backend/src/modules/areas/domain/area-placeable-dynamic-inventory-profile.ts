export interface AreaPlaceableDynamicInventoryEntryProfile {
  readonly sourceIndex: number;
  readonly inventoryRes: string;
  readonly x: number;
  readonly y: number;
}

export interface AreaPlaceableDynamicInventoryProfile {
  readonly templateResRef: "plc_fenbush" | "plc_pilestones" | "x0_treepine2";
  readonly entries: readonly Readonly<AreaPlaceableDynamicInventoryEntryProfile>[];
}

const entry = (
  sourceIndex: number,
  inventoryRes: "nw_it_msmlmisc11" | "nw_it_msmlmisc12",
  x: number,
  y: number,
): Readonly<AreaPlaceableDynamicInventoryEntryProfile> => Object.freeze({
  sourceIndex,
  inventoryRes,
  x,
  y,
});

export const AREA_PLACEABLE_DYNAMIC_INVENTORY_PROFILES = Object.freeze([
  Object.freeze({
    templateResRef: "plc_fenbush" as const,
    entries: Object.freeze([entry(0, "nw_it_msmlmisc12", 0, 0)]),
  }),
  Object.freeze({
    templateResRef: "plc_pilestones" as const,
    entries: Object.freeze([entry(0, "nw_it_msmlmisc11", 0, 0)]),
  }),
  Object.freeze({
    templateResRef: "x0_treepine2" as const,
    entries: Object.freeze([
      entry(0, "nw_it_msmlmisc12", 0, 0),
      entry(1, "nw_it_msmlmisc11", 1, 0),
    ]),
  }),
] as const satisfies readonly AreaPlaceableDynamicInventoryProfile[]);

export const AREA_PLACEABLE_DYNAMIC_INVENTORY_ITEM_RESOURCE_TYPE = 2025;
export const MAX_AREA_PLACEABLE_DYNAMIC_INVENTORY_ENTRIES = 2;

export function resolveAreaPlaceableDynamicInventoryProfile(
  templateResRef: string,
  entries: readonly Readonly<AreaPlaceableDynamicInventoryEntryProfile>[],
): AreaPlaceableDynamicInventoryProfile | undefined {
  const profile = AREA_PLACEABLE_DYNAMIC_INVENTORY_PROFILES.find(
    (candidate) => candidate.templateResRef === templateResRef,
  );
  if (!profile || entries.length !== profile.entries.length) return undefined;
  for (let index = 0; index < profile.entries.length; index += 1) {
    const expected = profile.entries[index]!;
    const actual = entries[index];
    if (!actual || actual.sourceIndex !== expected.sourceIndex ||
      actual.inventoryRes !== expected.inventoryRes ||
      actual.x !== expected.x || actual.y !== expected.y) {
      return undefined;
    }
  }
  return profile;
}
