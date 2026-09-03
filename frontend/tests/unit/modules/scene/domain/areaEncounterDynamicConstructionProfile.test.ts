import { describe, expect, it } from "vitest";
import {
  AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE,
  readDynamicAreaEncounterConstructionDefaults,
} from "../../../../../src/modules/scene/domain/areaEncounterDynamicConstructionProfile";

describe("dynamic Area Encounter construction profile", () => {
  const item = {
    templateId: "enc_enc_dynamic",
    resref: "enc_dynamic",
    metadata: {
      templateResRef: "enc_dynamic",
      tag: "Dynamic_Encounter",
      sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
      sourceSizeBytes: 4096,
      sourceSha256: "a".repeat(64),
      sourceExtension: "ute",
      sourceFileType: "UTE ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
    },
  };

  it("materializes exact binary-free current-winner provenance", () => {
    expect(readDynamicAreaEncounterConstructionDefaults(item)).toEqual({
      resRef: "enc_dynamic",
      tag: "Dynamic_Encounter",
      source: {
        type: "aurora_blueprint",
        sourceKind: "encounter",
        sourceProfileId: "effective-catalog-ute-encounter-copy-v1",
        templateId: "enc_enc_dynamic",
        templateResRef: "enc_dynamic",
        sourceObjectKey: "modules/current/blueprints/encounters/enc_dynamic.ute",
        sourceSizeBytes: 4096,
        sourceEtag: "a".repeat(64),
        sourceFileType: "UTE ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
    expect(Object.isFrozen(AREA_ENCOUNTER_DYNAMIC_CONSTRUCTION_PROFILE)).toBe(true);
  });

  it.each([
    ["preview-only metadata", { ...item, metadata: undefined }],
    ["wrong extension", { ...item, metadata: { ...item.metadata, sourceExtension: "utc" } }],
    ["wrong digest", { ...item, metadata: { ...item.metadata, sourceSha256: "A".repeat(64) } }],
    ["identity drift", { ...item, metadata: { ...item.metadata, templateResRef: "enc_other" } }],
    ["NUL tag", { ...item, metadata: { ...item.metadata, tag: "bad\0tag" } }],
  ])("rejects %s", (_label, value) => {
    expect(readDynamicAreaEncounterConstructionDefaults(value)).toBeUndefined();
  });
});
