import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import { parseAreaObjectsFromGitGff } from
  "../../src/modules/areas/adapters/outbound/blob/aurora-gff-area-parser";

const ROOT_TYPE = 0xffff_ffff;
const SCRIPT_FIELDS = Object.freeze([
  { label: "OnDisarm", type: "resref" as const, value: "trg_disarm" },
  { label: "OnTrapTriggered", type: "resref" as const, value: "trg_trapped" },
  { label: "OnClick", type: "resref" as const, value: "" },
  { label: "ScriptHeartbeat", type: "resref" as const, value: "trg_heartbeat" },
  { label: "ScriptOnEnter", type: "resref" as const, value: "trg_enter" },
  { label: "ScriptOnExit", type: "resref" as const, value: "trg_exit" },
  { label: "ScriptUserDefine", type: "resref" as const, value: "trg_user" },
]);

describe("Area GIT Trigger event-script parsing", () => {
  it("reads the complete exact native seven-field ResRef tuple", () => {
    expect(parseAreaObjectsFromGitGff(git([...SCRIPT_FIELDS]))
      ?.triggers[0]?.triggerScriptResRefs).toEqual({
      onDisarm: "trg_disarm",
      onTrapTriggered: "trg_trapped",
      onClick: "",
      onHeartbeat: "trg_heartbeat",
      onEnter: "trg_enter",
      onExit: "trg_exit",
      onUserDefined: "trg_user",
    });
  });

  it("binds the dependency fingerprint to the retained tuple", () => {
    const fingerprint = (onEnter: string) => parseAreaObjectsFromGitGff(git(
      SCRIPT_FIELDS.map((field) => field.label === "ScriptOnEnter"
        ? { ...field, value: onEnter }
        : field),
    ))?.dependencyFingerprint;
    expect(fingerprint("trg_enter")).not.toBe(fingerprint("trg_inside"));
  });

  it.each([
    ["absent", []],
    ["partial", SCRIPT_FIELDS.slice(0, 6)],
    ["duplicate", [...SCRIPT_FIELDS, SCRIPT_FIELDS[0]]],
    ["wrong case", SCRIPT_FIELDS.map((field, index) =>
      index === 0 ? { ...field, label: "onDisarm" } : field)],
    ["wrong type", SCRIPT_FIELDS.map((field, index) =>
      index === 0 ? { label: field.label, type: "cexostring" as const, value: field.value } : field)],
  ] as const)("keeps %s Trigger script storage preserve-only", (_label, fields) => {
    expect(parseAreaObjectsFromGitGff(git(fields as SupportedGffField[]))
      ?.triggers[0]?.triggerScriptResRefs).toBeUndefined();
  });
});

function git(triggerFields: SupportedGffField[]): Buffer {
  return buildGffBuffer([{
    label: "TriggerList",
    type: "list",
    value: [{
      typeId: 1,
      fields: [
        ...triggerFields,
        { label: "TemplateResRef", type: "resref", value: "newgeneric" },
        { label: "Tag", type: "cexostring", value: "GenericTrigger" },
        { label: "XPosition", type: "float", value: 10 },
        { label: "YPosition", type: "float", value: 20 },
        { label: "ZPosition", type: "float", value: 0 },
        { label: "Geometry", type: "list", value: [] },
      ],
    }],
  }], "GIT ", ROOT_TYPE);
}
