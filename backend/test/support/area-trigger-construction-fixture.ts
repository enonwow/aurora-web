import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import type { SupportedGffField } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";

const EXACT_NEWGENERIC_UTT_DEFLATE_BASE64 =
  "bVPLbtNAFD0hDaUPSikllMICsWDJokiI5wLFlKBWpEpd9lPn1hnVHpvxBAh/gcQ/8JlBEx87s+AufN/3npk5vojjJ19fPD96BaADIALwGMCfTq3jLvAewO8uUPqaNSxlsVgswNotrGSLczr0bwS5LuO+Zo25TQA95m4BuBnUrwczfe4+7Q0Afdq+/wG195+yZzuYdZt7fWwHwDPG7wS7dgP7LrWfuQfgiPY9AC+Z26fuEVcj/QCzx/WGZz0Izv4QwFvahwDesecR9XlidelG5qNxYgGcFdZZpV2zI7aqjMRJ4qJB44+MnE+LumRkIl0pm7f1KkUoQ51OM51O3VD8d9kfz0tp8iOzjFidpmJlQjxDUdZdinKIJS8z5WQs1ViugBOZf1F5244zlYlz8jkK8S4RqctMgNMiUZn+JRN2DWa2KuwKn68/zlagP8xcMZa8+C4nMvf1RZ6Laa8Dp9pcyyQuVvutm4/l20x79EB4Ni81lvru6vMOMp1ct/ljlThdmNZv3+Nn/Qa1f1GJjeRKG2n2e8xV3eJp9kmMWJ3wHoFNIz/SOgYy+u9r/E86/Dm6JE+PZF5n20ZA+G0SfIeE3iWB90jYfRK0T0IekICHJNw/";

export const TRIGGER_CONSTRUCTION_GEOMETRY = Object.freeze([
  Object.freeze({ x: -0.2990303039550781, y: -4.833713531494141, z: 0.02500000037252903 }),
  Object.freeze({ x: 4.8592987060546875, y: -4.833709716796875, z: 0.025000499561429024 }),
  Object.freeze({ x: 4.8592987060546875, y: 0.324615478515625, z: 0.025000499561429024 }),
  Object.freeze({ x: 0, y: 0, z: 3.125 }),
] as const);

export function triggerBlueprintFixture(): Buffer {
  return inflateRawSync(Buffer.from(EXACT_NEWGENERIC_UTT_DEFLATE_BASE64, "base64"));
}

export function triggerBlueprintFields(): SupportedGffField[] {
  const document = parseRawGffDocument(triggerBlueprintFixture());
  if (!document) throw new Error("Invalid exact newgeneric UTT fixture.");
  return document.fields.map((field) => structuredClone(field));
}

export function triggerAdditionFixture(
  transform: Readonly<{ x: number; y: number; z: number; bearing: number }> = {
    x: 3.547599411010742,
    y: 4.491108703613281,
    z: 0,
    bearing: 0,
  },
) {
  const blueprintBytes = triggerBlueprintFixture();
  return {
    kind: "trigger" as const,
    localObjectId: "tri_001",
    sourceProfileId: "nwn-base-key-utt-newgeneric-v1",
    templateResRef: "newgeneric",
    resRef: "newgeneric",
    tag: "GenericTrigger",
    sourceSha256: createHash("sha256").update(blueprintBytes).digest("hex"),
    blueprintBytes,
    ...transform,
  };
}

export function expectedTriggerGitFields(
  transform: Readonly<{ x: number; y: number; z: number }>,
): SupportedGffField[] {
  const source = new Map(triggerBlueprintFields().map((field) => [field.label, field]));
  const field = (label: string): SupportedGffField => structuredClone(source.get(label)!);
  return [
    field("Tag"),
    field("TemplateResRef"),
    field("LocalizedName"),
    field("AutoRemoveKey"),
    field("Faction"),
    field("Cursor"),
    field("HighlightHeight"),
    field("KeyName"),
    field("LinkedTo"),
    field("LinkedToFlags"),
    { label: "LoadScreenID", type: "word", value: 0 },
    { label: "PortraitId", type: "word", value: 0 },
    field("Type"),
    { label: "TrapDetectable", type: "byte", value: 1 },
    field("TrapDetectDC"),
    field("TrapDisarmable"),
    field("DisarmDC"),
    field("TrapFlag"),
    field("TrapOneShot"),
    field("TrapType"),
    field("OnDisarm"),
    field("OnTrapTriggered"),
    field("OnClick"),
    field("ScriptHeartbeat"),
    field("ScriptOnEnter"),
    field("ScriptOnExit"),
    field("ScriptUserDefine"),
    { label: "XPosition", type: "float", value: Math.fround(transform.x * 10) },
    { label: "YPosition", type: "float", value: Math.fround(transform.y * 10) },
    { label: "ZPosition", type: "float", value: Math.fround(transform.z * 10) },
    { label: "XOrientation", type: "float", value: 0 },
    { label: "YOrientation", type: "float", value: 0 },
    { label: "ZOrientation", type: "float", value: 0 },
    {
      label: "Geometry",
      type: "list",
      value: TRIGGER_CONSTRUCTION_GEOMETRY.map((point) => ({
        typeId: 3,
        fields: [
          { label: "PointX", type: "float" as const, value: point.x },
          { label: "PointY", type: "float" as const, value: point.y },
          { label: "PointZ", type: "float" as const, value: point.z },
        ],
      })),
    },
  ];
}
