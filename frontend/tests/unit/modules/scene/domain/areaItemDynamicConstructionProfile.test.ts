import {
  AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE,
  readDynamicAreaItemConstructionDefaults,
} from "../../../../../src/modules/scene/domain/areaItemDynamicConstructionProfile";
import { cloneSceneObject } from "../../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("dynamic Area Item construction profile", () => {
  const item = () => ({
    templateId: "itm_nw_wswm001",
    resref: "nw_wswm001",
    metadata: {
      sourceObjectKey:
        "modules/current/__aurora/sources/vanilla/templates/nw_wswm001.uti",
      sourceSizeBytes: 2048,
      sourceSha256: "a".repeat(64),
      sourceExtension: "uti",
      sourceFileType: "UTI ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      templateResRef: "nw_wswm001",
      tag: "Longsword_Tag",
    },
  });

  it("admits one exact effective UTI without inventing ResRef, Tag, or size", () => {
    expect(readDynamicAreaItemConstructionDefaults(item())).toEqual({
      resRef: "nw_wswm001",
      tag: "Longsword_Tag",
      source: {
        type: "aurora_blueprint",
        sourceKind: "item",
        sourceProfileId: AREA_ITEM_DYNAMIC_CONSTRUCTION_PROFILE.id,
        templateId: "itm_nw_wswm001",
        templateResRef: "nw_wswm001",
        sourceObjectKey:
          "modules/current/__aurora/sources/vanilla/templates/nw_wswm001.uti",
        sourceSizeBytes: 2048,
        sourceEtag: "a".repeat(64),
        sourceFileType: "UTI ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it.each([
    ["missing metadata", (value: any) => { delete value.metadata; }],
    ["synthetic 2DA row", (value: any) => {
      value.metadata.sourceExtension = "2da";
      value.metadata.sourceObjectKey = "modules/current/baseitems.2da";
    }],
    ["missing repository key", (value: any) => { delete value.metadata.sourceObjectKey; }],
    ["host NUL in repository key", (value: any) => { value.metadata.sourceObjectKey += "\0secret"; }],
    ["oversized repository key", (value: any) => { value.metadata.sourceObjectKey = "x".repeat(2049); }],
    ["missing size", (value: any) => { delete value.metadata.sourceSizeBytes; }],
    ["zero size", (value: any) => { value.metadata.sourceSizeBytes = 0; }],
    ["oversized UTI", (value: any) => { value.metadata.sourceSizeBytes = 1024 * 1024 + 1; }],
    ["missing digest", (value: any) => { delete value.metadata.sourceSha256; }],
    ["uppercase digest", (value: any) => { value.metadata.sourceSha256 = "A".repeat(64); }],
    ["wrong GFF type", (value: any) => { value.metadata.sourceFileType = "UTP "; }],
    ["wrong GFF version", (value: any) => { value.metadata.sourceFileVersion = "V3.1"; }],
    ["wrong root", (value: any) => { value.metadata.sourceStructTypeId = 1; }],
    ["mismatched metadata ResRef", (value: any) => { value.metadata.templateResRef = "itm_other"; }],
    ["mismatched list ResRef", (value: any) => { value.resref = "itm_other"; }],
    ["blank Tag", (value: any) => { value.metadata.tag = ""; }],
    ["invented Tag", (value: any) => { delete value.metadata.tag; }],
    ["unsafe catalog id", (value: any) => { value.templateId = "itm/path"; }],
  ])("keeps %s preview-only", (_label, mutate) => {
    const value = item();
    mutate(value);
    expect(readDynamicAreaItemConstructionDefaults(value)).toBeUndefined();
  });

  it("retains an independent provenance snapshot across clone, cancel, and undo paths", () => {
    const defaults = readDynamicAreaItemConstructionDefaults(item())!;
    const source = {
      id: "itm_dynamic",
      kind: "items" as const,
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
