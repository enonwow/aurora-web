export interface ItemEquipSlotDefinition {
  bit: number;
  key: string;
  label: string;
}

export interface ItemEquipmentSlotOption extends ItemEquipSlotDefinition {
  index: number;
  value: number;
  hexValue: string;
  selectLabel: string;
}

export interface ItemEquipSlotMask {
  raw: string;
  value: number;
  slots: ItemEquipSlotDefinition[];
  unknownMask: number;
}

export const AURORA_ITEM_EQUIP_SLOT_DEFINITIONS: readonly ItemEquipSlotDefinition[] = [
  { bit: 0x00001, key: "head", label: "Head" },
  { bit: 0x00002, key: "chest", label: "Chest" },
  { bit: 0x00004, key: "boots", label: "Boots" },
  { bit: 0x00008, key: "arms", label: "Arms" },
  { bit: 0x00010, key: "rightHand", label: "Right Hand" },
  { bit: 0x00020, key: "leftHand", label: "Left Hand" },
  { bit: 0x00040, key: "cloak", label: "Cloak" },
  { bit: 0x00080, key: "leftRing", label: "Left Ring" },
  { bit: 0x00100, key: "rightRing", label: "Right Ring" },
  { bit: 0x00200, key: "neck", label: "Neck" },
  { bit: 0x00400, key: "belt", label: "Belt" },
  { bit: 0x00800, key: "arrows", label: "Arrows" },
  { bit: 0x01000, key: "bullets", label: "Bullets" },
  { bit: 0x02000, key: "bolts", label: "Bolts" },
  { bit: 0x04000, key: "creatureRight", label: "Creature Right Weapon" },
  { bit: 0x08000, key: "creatureLeft", label: "Creature Left Weapon" },
  { bit: 0x10000, key: "creatureBite", label: "Creature Bite" },
  { bit: 0x20000, key: "creatureSkin", label: "Creature Skin" }
];

const KNOWN_EQUIP_SLOT_MASK = AURORA_ITEM_EQUIP_SLOT_DEFINITIONS.reduce(
  (mask, slot) => mask | slot.bit,
  0
);

function formatSlotHex(value: number): string {
  return `0x${value.toString(16).toUpperCase()}`;
}

export const AURORA_ITEM_EQUIPMENT_SLOT_OPTIONS: readonly ItemEquipmentSlotOption[] =
  AURORA_ITEM_EQUIP_SLOT_DEFINITIONS.map((slot, index) => ({
    ...slot,
    index,
    value: slot.bit,
    hexValue: formatSlotHex(slot.bit),
    selectLabel: `${slot.label} (${formatSlotHex(slot.bit)})`
  }));

export function parseItemEquipSlotMask(value: string | undefined): ItemEquipSlotMask | null {
  const raw = value?.trim();
  if (!raw || raw === "****") {
    return null;
  }
  const numeric = raw.toLowerCase().startsWith("0x")
    ? Number.parseInt(raw.slice(2), 16)
    : Number.parseInt(raw, 10);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return null;
  }
  const slots = AURORA_ITEM_EQUIP_SLOT_DEFINITIONS.filter((slot) =>
    Boolean(numeric & slot.bit)
  );
  return {
    raw,
    value: numeric,
    slots,
    unknownMask: numeric & ~KNOWN_EQUIP_SLOT_MASK
  };
}

export function formatItemEquipSlotMask(value: string | undefined): string | undefined {
  const parsed = parseItemEquipSlotMask(value);
  if (!parsed) {
    return undefined;
  }
  const labels = parsed.slots.map((slot) => slot.label);
  if (parsed.unknownMask > 0) {
    labels.push(`Unknown 0x${parsed.unknownMask.toString(16).toUpperCase()}`);
  }
  return labels.length > 0 ? `${parsed.raw}: ${labels.join(", ")}` : parsed.raw;
}

export function formatItemEquipmentSlotMask(value: number | undefined): string | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return formatItemEquipSlotMask(formatSlotHex(Math.trunc(value)));
}
