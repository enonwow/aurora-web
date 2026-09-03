import { describe, expect, it } from "vitest";
import {
  createAreaEventScriptSourceCommand,
  readAreaEventScriptPublicationReceipt,
  readAreaEventScriptSourceSnapshot,
  readAreaEventScriptValidationResult,
} from "../../../../src/modules/areas/domain/areaEventScriptPublication";
import {
  SCRIPT_MODULE_ID,
  SCRIPT_REVISION,
  SCRIPT_SOURCE,
  areaEventScriptPublicationReceiptFixture,
  areaEventScriptSourceSnapshotFixture,
  areaEventScriptValidationFixture,
} from "./areaEventScriptPublicationFixture";

describe("Area event-script publication contracts", () => {
  it("creates one canonical deeply frozen source command", () => {
    const result = createAreaEventScriptSourceCommand({
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
      sourceText: SCRIPT_SOURCE,
      includeResRefs: ["z_shared", "a_shared"],
    });

    expect(result).toEqual({
      schemaVersion: "area-event-script-source-command.v1",
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
      sourceText: SCRIPT_SOURCE,
      includeResRefs: ["a_shared", "z_shared"],
    });
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.includeResRefs)).toBe(true);
  });

  it.each([
    ["reserved target", { targetResRef: "nwscript" }],
    ["noncanonical target", { targetResRef: "AreaEnter" }],
    ["duplicate include", { includeResRefs: ["shared", "shared"] }],
    ["self include", { includeResRefs: ["area_enter"] }],
    ["unpaired Unicode", { sourceText: "\ud800" }],
    ["oversized source", { sourceText: "a".repeat(256 * 1024 + 1) }],
  ])("rejects %s before HTTP", (_label, override) => {
    expect(createAreaEventScriptSourceCommand({
      moduleId: SCRIPT_MODULE_ID,
      targetResRef: "area_enter",
      expectedModuleRevision: SCRIPT_REVISION,
      sourceText: SCRIPT_SOURCE,
      includeResRefs: [],
      ...override,
    })).toBeNull();
  });

  it("accepts strict source, validation, and publication responses", () => {
    const source = readAreaEventScriptSourceSnapshot(areaEventScriptSourceSnapshotFixture());
    const validation = readAreaEventScriptValidationResult(areaEventScriptValidationFixture());
    const receipt = readAreaEventScriptPublicationReceipt(
      areaEventScriptPublicationReceiptFixture(),
    );

    expect(source).toEqual(areaEventScriptSourceSnapshotFixture());
    expect(validation).toEqual(areaEventScriptValidationFixture());
    expect(receipt).toEqual(areaEventScriptPublicationReceiptFixture());
    expect(Object.isFrozen(source)).toBe(true);
    expect(Object.isFrozen(validation?.provider)).toBe(true);
    expect(Object.isFrozen(receipt?.resources)).toBe(true);
  });

  it.each([
    ["source size mismatch", areaEventScriptSourceSnapshotFixture(), (value: any) => { value.sourceSize += 1; }],
    ["source storage leak", areaEventScriptSourceSnapshotFixture(), (value: any) => { value.contentKey = "__aurora/cas"; }],
    ["compiled result without artifacts", areaEventScriptValidationFixture(), (value: any) => { delete value.artifacts; }],
    ["rejected result with artifacts", areaEventScriptValidationFixture("rejected"), (value: any) => { value.artifacts = { ncs: {}, ndb: {} }; }],
    ["publication wrong resource type", areaEventScriptPublicationReceiptFixture(), (value: any) => { value.resources[2].resourceType = 2010; }],
    ["publication nonverified readback", areaEventScriptPublicationReceiptFixture(), (value: any) => { value.readbackStatus = "pending"; }],
    ["publication byte leak", areaEventScriptPublicationReceiptFixture(), (value: any) => { value.resources[0].bytes = [1, 2, 3]; }],
  ])("rejects %s", (_label, fixture, mutate) => {
    const value = structuredClone(fixture);
    mutate(value);
    const reader = value.schemaVersion === "area-event-script-source-snapshot.v1"
      ? readAreaEventScriptSourceSnapshot
      : value.schemaVersion === "area-event-script-validation-result.v1"
        ? readAreaEventScriptValidationResult
        : readAreaEventScriptPublicationReceipt;
    expect(reader(value)).toBeNull();
  });
});
