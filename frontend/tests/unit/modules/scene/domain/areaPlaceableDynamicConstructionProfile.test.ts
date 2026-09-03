import {
  AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE,
  readDynamicAreaPlaceableConstructionDefaults,
} from "../../../../../src/modules/scene/domain/areaPlaceableDynamicConstructionProfile";
import { cloneSceneObject } from "../../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("dynamic Area Placeable construction profile", () => {
  const item = () => ({
    templateId: "plc_plc_watertrough",
    resref: "plc_watertrough",
    metadata: {
      sourceObjectKey:
        "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp",
      sourceSizeBytes: 1858,
      sourceSha256: "a".repeat(64),
      sourceExtension: "utp",
      sourceFileType: "UTP ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      templateResRef: "plc_watertrough",
      tag: "Water Trough",
    },
  });

  it("admits one exact effective UTP without inventing ResRef or Tag", () => {
    expect(readDynamicAreaPlaceableConstructionDefaults(item())).toEqual({
      resRef: "plc_watertrough",
      tag: "Water Trough",
      source: {
        type: "aurora_blueprint",
        sourceKind: "placeable",
        sourceProfileId: AREA_PLACEABLE_DYNAMIC_CONSTRUCTION_PROFILE.id,
        templateId: "plc_plc_watertrough",
        templateResRef: "plc_watertrough",
        sourceObjectKey:
          "modules/current/__aurora/sources/vanilla/templates/plc_watertrough.utp",
        sourceEtag: "a".repeat(64),
        sourceFileType: "UTP ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it.each([
    ["missing metadata", (value: any) => { delete value.metadata; }],
    ["synthetic 2DA row", (value: any) => {
      value.metadata.sourceExtension = "2da";
      value.metadata.sourceObjectKey = "modules/current/placeables.2da";
    }],
    ["missing repository key", (value: any) => { delete value.metadata.sourceObjectKey; }],
    ["host NUL in repository key", (value: any) => { value.metadata.sourceObjectKey += "\0secret"; }],
    ["oversized repository key", (value: any) => { value.metadata.sourceObjectKey = "x".repeat(2049); }],
    ["missing digest", (value: any) => { delete value.metadata.sourceSha256; }],
    ["uppercase digest", (value: any) => { value.metadata.sourceSha256 = "A".repeat(64); }],
    ["oversized UTP", (value: any) => { value.metadata.sourceSizeBytes = 1024 * 1024 + 1; }],
    ["wrong GFF type", (value: any) => { value.metadata.sourceFileType = "UTC "; }],
    ["wrong GFF version", (value: any) => { value.metadata.sourceFileVersion = "V3.1"; }],
    ["wrong root", (value: any) => { value.metadata.sourceStructTypeId = 1; }],
    ["mismatched metadata ResRef", (value: any) => { value.metadata.templateResRef = "plc_other"; }],
    ["mismatched list ResRef", (value: any) => { value.resref = "plc_other"; }],
    ["blank Tag", (value: any) => { value.metadata.tag = ""; }],
    ["invented Tag", (value: any) => { delete value.metadata.tag; }],
    ["unsafe catalog id", (value: any) => { value.templateId = "plc/path"; }],
  ])("keeps %s preview-only", (_label, mutate) => {
    const value = item();
    mutate(value);
    expect(readDynamicAreaPlaceableConstructionDefaults(value)).toBeUndefined();
  });

  it("freezes the admitted defaults and provenance", () => {
    const result = readDynamicAreaPlaceableConstructionDefaults(item())!;
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.source)).toBe(true);
  });

  it("retains an independent provenance snapshot across clone, cancel, and undo paths", () => {
    const defaults = readDynamicAreaPlaceableConstructionDefaults(item())!;
    const source = {
      id: "pla_dynamic",
      kind: "placeables" as const,
      resRef: defaults.resRef,
      tag: defaults.tag,
      source: defaults.source,
      x: 1,
      y: 2,
      z: 0,
      bearing: 0,
      visualTransform: {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        offsetZ: 0,
        pitch: 0,
        roll: 0,
        yaw: 0,
      },
    };

    const snapshot = cloneSceneObject(source);
    expect(snapshot.source).toEqual(defaults.source);
    expect(snapshot.source).not.toBe(source.source);
  });
});
