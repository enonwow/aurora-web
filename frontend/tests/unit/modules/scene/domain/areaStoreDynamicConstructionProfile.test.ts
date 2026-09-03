import {
  AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE,
  readDynamicAreaStoreConstructionDefaults,
} from "../../../../../src/modules/scene/domain/areaStoreDynamicConstructionProfile";
import { cloneSceneObject } from "../../../../../src/modules/layout/application/workspaceSceneObjectClone";

describe("dynamic Area Store construction profile", () => {
  const store = () => ({
    templateId: "str_nw_storemagic001",
    resref: "nw_storemagic001",
    metadata: {
      sourceObjectKey:
        "modules/current/__aurora/sources/vanilla/templates/nw_storemagic001.utm",
      sourceSizeBytes: 4096,
      sourceSha256: "b".repeat(64),
      sourceExtension: "utm",
      sourceFileType: "UTM ",
      sourceFileVersion: "V3.2",
      sourceStructTypeId: 0xffffffff,
      templateResRef: "nw_storemagic001",
      tag: "Magic_Store_Tag",
    },
  });

  it("admits one exact effective UTM without inventing ResRef, Tag, or size", () => {
    expect(readDynamicAreaStoreConstructionDefaults(store())).toEqual({
      resRef: "nw_storemagic001",
      tag: "Magic_Store_Tag",
      source: {
        type: "aurora_blueprint",
        sourceKind: "store",
        sourceProfileId: AREA_STORE_DYNAMIC_CONSTRUCTION_PROFILE.id,
        templateId: "str_nw_storemagic001",
        templateResRef: "nw_storemagic001",
        sourceObjectKey:
          "modules/current/__aurora/sources/vanilla/templates/nw_storemagic001.utm",
        sourceSizeBytes: 4096,
        sourceEtag: "b".repeat(64),
        sourceFileType: "UTM ",
        sourceFileVersion: "V3.2",
        sourceStructTypeId: 0xffffffff,
      },
    });
  });

  it.each([
    ["missing metadata", (value: any) => { delete value.metadata; }],
    ["wrong extension", (value: any) => { value.metadata.sourceExtension = "uti"; }],
    ["missing repository key", (value: any) => { delete value.metadata.sourceObjectKey; }],
    ["host NUL in repository key", (value: any) => { value.metadata.sourceObjectKey += "\0secret"; }],
    ["oversized repository key", (value: any) => { value.metadata.sourceObjectKey = "x".repeat(2049); }],
    ["missing size", (value: any) => { delete value.metadata.sourceSizeBytes; }],
    ["zero size", (value: any) => { value.metadata.sourceSizeBytes = 0; }],
    ["oversized UTM", (value: any) => { value.metadata.sourceSizeBytes = 1024 * 1024 + 1; }],
    ["missing digest", (value: any) => { delete value.metadata.sourceSha256; }],
    ["uppercase digest", (value: any) => { value.metadata.sourceSha256 = "B".repeat(64); }],
    ["wrong GFF type", (value: any) => { value.metadata.sourceFileType = "UTI "; }],
    ["wrong GFF version", (value: any) => { value.metadata.sourceFileVersion = "V3.1"; }],
    ["wrong root", (value: any) => { value.metadata.sourceStructTypeId = 2051; }],
    ["mismatched metadata ResRef", (value: any) => { value.metadata.templateResRef = "store_other"; }],
    ["mismatched list ResRef", (value: any) => { value.resref = "store_other"; }],
    ["blank Tag", (value: any) => { value.metadata.tag = ""; }],
    ["invented Tag", (value: any) => { delete value.metadata.tag; }],
    ["unsafe catalog id", (value: any) => { value.templateId = "str/path"; }],
  ])("keeps %s preview-only", (_label, mutate) => {
    const value = store();
    mutate(value);
    expect(readDynamicAreaStoreConstructionDefaults(value)).toBeUndefined();
  });

  it("retains an independent provenance snapshot across clone, cancel, and undo paths", () => {
    const defaults = readDynamicAreaStoreConstructionDefaults(store())!;
    const source = {
      id: "sto_dynamic",
      kind: "stores" as const,
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
