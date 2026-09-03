import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import type { SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";

const EXACT_NW_DOOR_TTR_04_UTD_DEFLATE_BASE64 =
  "XVTbVtNAFN2CIF5ARURF1KqIN0RAXcvLg6s2C0GQ1FLAN9bYHmsW6SROBpU/8mP8AH/A76hOsttOPS/Ze+bMmZ1zkr1TD0q7TxZXngM4BiAA8ATAz6Hi+XsEaAF4PQr8AnD6BPLodDodMPcU+nGGdcaJhwBccecADAO4w7zj3pkRPl3OKICn5CdYy+WOEbs46Z317z79n45uOC2T1DLhrZ/1ap7z1s9765PMc3HBy5nyci56WqYBPCO/5L3rZeJh9qNKPEPs4qrXi1lP0zXv3uveu94A8IK4BOAl8U0Ar4hvAVgnvg3gHfEcgA1iN5NN4nkA74nvAtgivgcgJL5PzQ4/APCB7/4QQI36Fvh0PX/k6V/09D8GsEu8BGCPe8vsg6u58u8b/AigrlrwYzNpbKm29HggWcNEqY0SnfO6tNNYWalJVpPPQPnQJjVpJ99kQ44AVOIkk82kcRBU8vxKor+JyVS3wLq2YsxhatWn2N2yqhq92i6qcWJ9PRtyVJOvh5GRZlffAY/2OLfyCFPR3vWoJsYaFdl15tSNSgOx0qCAPi9O5DzKlGkX+wXuViv2V+N+0xwPtWx/oWzH60epePoH+lnWUTtvxrZVVoBymooySjeYslYdGAcqh8aItr3lNWWaWrKsu7+amIF+5UPxYi+KY5+HOp9Qs88D1Vat3kKoA1H2i5dfdKDP10QZ+0mUJXfd9uu/l1ikbK3KBxNqNxF/fzuVOK6ozJZtzvOOmajVEpPn7+jYqxjqnUxMIJ8jnWvcjPSBNOtJb/7kbiZZ/j2o5nbDiOh1Z7l4K1pM1OiNxL1/5AkO9aqK4nrSVVlVsVgrxeH8+223Rfdb7DzyjTJ6OUgS48zzz1SxMeaZ94T+vt9MErNvrdlf6tru+I+VYrU50OH+f+vqlpZLrjJog0O0s+P8dUdp32OUcopHz9COJ2ir52i3k7TXKdrpNO3zMu1yhvY4Szu8Tvsr0e5u0d7maGfztK97tKsHtKcF2tEi7WeJduNs5i8=";

export const DOOR_HOOK_FIXTURE = Object.freeze({
  profileId: "tin01-tile121-orientation0-door0-v1",
  tilesetResRef: "tin01",
  tilesetSha256: "e45bfba6f61442e7618b7477f0967943b6ff74a2c02593da6c031c641b3e6ac4",
  tileId: 121,
  tileOrientation: 0,
  tileHeight: 0,
  hookIndex: 0,
  hookType: 0,
  localX: 0,
  localY: 0.76,
  localZ: 0,
  orientationDegrees: 180,
} as const);

export function doorBlueprintFixture(): Buffer {
  return inflateRawSync(Buffer.from(EXACT_NW_DOOR_TTR_04_UTD_DEFLATE_BASE64, "base64"));
}

export function doorBlueprintFields(): SupportedGffField[] {
  const document = parseRawGffDocument(doorBlueprintFixture());
  if (!document) throw new Error("Invalid exact nw_door_ttr_04 UTD fixture.");
  return document.fields.map((field) => structuredClone(field));
}

export function doorAdditionFixture(
  row = 0,
  col = 0,
) {
  const blueprintBytes = doorBlueprintFixture();
  return {
    kind: "door" as const,
    localObjectId: "doo_001",
    sourceProfileId: "nwn-base-key-utd-nw-door-ttr-04-tin01-121-0-v1",
    templateResRef: "nw_door_ttr_04",
    resRef: "nw_door_ttr_04",
    tag: "Barn1Door",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    x: col + 0.5,
    y: row + 0.576,
    z: 0,
    bearing: Math.PI,
    doorHook: Object.freeze({ ...DOOR_HOOK_FIXTURE, row, col }),
  };
}

export function expectedDoorGitFields(row = 0, col = 0): SupportedGffField[] {
  const source = new Map(doorBlueprintFields().map((field) => [field.label, field]));
  const field = (label: string): SupportedGffField => structuredClone(source.get(label)!);
  return [
    ...[
      "Tag", "LocName", "Description", "TemplateResRef", "AutoRemoveKey",
      "CloseLockDC", "Conversation", "Interruptable", "Faction", "Plot",
      "KeyRequired", "Lockable", "Locked", "OpenLockDC", "PortraitId",
      "TrapDetectable", "TrapDetectDC", "TrapDisarmable", "DisarmDC",
      "TrapFlag", "TrapOneShot", "TrapType", "KeyName", "AnimationState",
      "Appearance", "HP", "CurrentHP", "Hardness", "Fort", "Ref", "Will",
      "OnClosed", "OnDamaged", "OnDeath", "OnDisarm", "OnHeartbeat",
      "OnLock", "OnMeleeAttacked", "OnOpen", "OnSpellCastAt",
      "OnTrapTriggered", "OnUnlock", "OnUserDefined", "OnClick", "LinkedTo",
      "LinkedToFlags", "LoadScreenID",
    ].map(field),
    { label: "GenericType_New", type: "dword", value: 0 },
    field("OnFailToOpen"),
    { label: "X", type: "float", value: Math.fround((col + 0.5) * 10) },
    { label: "Y", type: "float", value: Math.fround((row + 0.576) * 10) },
    { label: "Z", type: "float", value: 0 },
    { label: "Bearing", type: "float", value: -3.141592264175415 },
  ];
}
