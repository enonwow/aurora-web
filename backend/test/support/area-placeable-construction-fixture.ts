import { createHash } from "node:crypto";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";

export function placeableBlueprintFixture(): Buffer {
  return buildGffBuffer(placeableBlueprintFields(), "UTP ", 0xffffffff);
}

export function placeableAdditionFixture(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }> = {
    x: 2.744,
    y: 2.976,
    z: 0.125,
    bearing: Math.PI / 3,
  },
) {
  const blueprintBytes = placeableBlueprintFixture();
  return {
    kind: "placeable" as const,
    localObjectId: "pla_001",
    sourceProfileId: "nwn-base-key-utp-plc-watertrough-v1",
    templateResRef: "plc_watertrough",
    resRef: "plc_watertrough",
    tag: "WaterTrough",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

export function dynamicPlaceableAdditionFixture(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }> = {
    x: 2.744,
    y: 2.976,
    z: 0.125,
    bearing: Math.PI / 3,
  },
) {
  return {
    ...placeableAdditionFixture(transform),
    sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
    sourceObjectKey:
      "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp",
    tag: "Water Trough",
    resolvedPortraitId: 462,
  };
}

function placeableBlueprintFields(): SupportedGffField[] {
  return [
    { label: "Ref", type: "byte", value: 0 },
    { label: "OnUsed", type: "resref", value: "" },
    { label: "Portrait", type: "resref", value: "po_plc_n02_" },
    { label: "KeyName", type: "cexostring", value: "" },
    { label: "OnUserDefined", type: "resref", value: "" },
    { label: "HasInventory", type: "byte", value: 0 },
    { label: "OnDamaged", type: "resref", value: "" },
    { label: "TemplateResRef", type: "resref", value: "plc_watertrough" },
    { label: "Faction", type: "dword", value: 1 },
    { label: "Locked", type: "byte", value: 0 },
    { label: "CloseLockDC", type: "byte", value: 0 },
    { label: "Appearance", type: "dword", value: 104 },
    { label: "OnOpen", type: "resref", value: "" },
    { label: "Tag", type: "cexostring", value: "Water Trough" },
    { label: "HP", type: "short", value: 15 },
    { label: "Description", type: "cexolocstring", value: { strRef: 14751, entries: [] } },
    { label: "TrapDetectable", type: "byte", value: 1 },
    { label: "PaletteID", type: "byte", value: 9 },
    { label: "OnClosed", type: "resref", value: "" },
    { label: "Conversation", type: "resref", value: "" },
    { label: "DisarmDC", type: "byte", value: 15 },
    { label: "OnMeleeAttacked", type: "resref", value: "" },
    { label: "Hardness", type: "byte", value: 5 },
    { label: "LocName", type: "cexolocstring", value: { strRef: 5747, entries: [] } },
    { label: "KeyRequired", type: "byte", value: 0 },
    { label: "AnimationState", type: "byte", value: 0 },
    { label: "CurrentHP", type: "short", value: 15 },
    { label: "TrapOneShot", type: "byte", value: 1 },
    { label: "Interruptable", type: "byte", value: 1 },
    { label: "OnLock", type: "resref", value: "" },
    { label: "OnTrapTriggered", type: "resref", value: "" },
    { label: "Type", type: "byte", value: 0 },
    { label: "Useable", type: "byte", value: 0 },
    { label: "TrapType", type: "byte", value: 0 },
    { label: "OnDeath", type: "resref", value: "" },
    { label: "OnUnlock", type: "resref", value: "" },
    { label: "Comment", type: "cexostring", value: "Water Trough" },
    { label: "TrapDisarmable", type: "byte", value: 1 },
    { label: "Lockable", type: "byte", value: 0 },
    { label: "OnHeartbeat", type: "resref", value: "" },
    { label: "OpenLockDC", type: "byte", value: 18 },
    { label: "TrapDetectDC", type: "byte", value: 0 },
    { label: "OnSpellCastAt", type: "resref", value: "" },
    { label: "Fort", type: "byte", value: 16 },
    { label: "Will", type: "byte", value: 0 },
    { label: "OnInvDisturbed", type: "resref", value: "" },
    { label: "TrapFlag", type: "byte", value: 0 },
    { label: "AutoRemoveKey", type: "byte", value: 0 },
    { label: "Plot", type: "byte", value: 0 },
    { label: "OnDisarm", type: "resref", value: "" },
  ];
}
