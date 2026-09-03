import {
  AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION,
  canonicalizeAreaEventScriptSourceCommand,
  validateAndNormalizeAreaEventScriptSourceCommand,
} from "../../src/modules/areas/domain/area-event-script-source-command";

const REVISION = "a".repeat(64);

describe("Area event-script source command", () => {
  it("normalizes the include set and produces one order-independent command hash", () => {
    const left = validateAndNormalizeAreaEventScriptSourceCommand({
      schemaVersion: AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION,
      moduleId: "module:test",
      targetResRef: "area_enter",
      expectedModuleRevision: REVISION,
      sourceText: "void main() {\n}\n",
      includeResRefs: ["z_shared", "a_shared"],
    });
    const right = validateAndNormalizeAreaEventScriptSourceCommand({
      schemaVersion: AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION,
      moduleId: "module:test",
      targetResRef: "area_enter",
      expectedModuleRevision: REVISION,
      sourceText: "void main() {\n}\n",
      includeResRefs: ["a_shared", "z_shared"],
    });

    expect(left.valid).toBe(true);
    expect(right.valid).toBe(true);
    if (!left.valid || !right.valid) return;
    expect(left.value.includeResRefs).toEqual(["a_shared", "z_shared"]);
    expect(left.value.sourceBytes.equals(Buffer.from(left.value.sourceText, "utf8"))).toBe(true);
    expect(left.commandHash).toBe(right.commandHash);
    expect(canonicalizeAreaEventScriptSourceCommand(left.value)).not.toContain(
      "sourceBytes",
    );
    expect(Object.isFrozen(left.value)).toBe(true);
  });

  it.each([
    ["unknown key", { extra: true }],
    ["uppercase target", { targetResRef: "Area_Enter" }],
    ["reserved target", { targetResRef: "nwscript" }],
    ["invalid revision", { expectedModuleRevision: "ABC" }],
    ["self include", { includeResRefs: ["area_enter"] }],
    ["duplicate include", { includeResRefs: ["shared", "shared"] }],
    ["reserved include", { includeResRefs: ["nwscript"] }],
    ["unpaired surrogate", { sourceText: "void main(){ string s=\"\ud800\"; }" }],
    ["source byte budget", { sourceText: "x".repeat(256 * 1024 + 1) }],
    ["body byte budget", { extra: "x".repeat(512 * 1024) }],
    [
      "include count budget",
      { includeResRefs: Array.from({ length: 1_025 }, (_, index) => `i${index}`) },
    ],
  ])("rejects %s", (_label, patch) => {
    const result = validateAndNormalizeAreaEventScriptSourceCommand({
      schemaVersion: AREA_EVENT_SCRIPT_SOURCE_COMMAND_SCHEMA_VERSION,
      moduleId: "module:test",
      targetResRef: "area_enter",
      expectedModuleRevision: REVISION,
      sourceText: "void main() {}",
      includeResRefs: [],
      ...patch,
    });

    expect(result.valid).toBe(false);
    if (!result.valid) expect(result.issues.length).toBeGreaterThan(0);
  });
});
