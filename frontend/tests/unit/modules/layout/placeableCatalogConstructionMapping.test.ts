import { mapPlaceableListItemToSceneObject } from "../../../../src/modules/layout/components/WorkspaceLayout";

describe("Placeable catalog construction mapping", () => {
  it("retains exact effective UTP provenance and source identity", () => {
    const object = mapPlaceableListItemToSceneObject({
      templateId: "plc_plc_watertrough",
      resref: "plc_watertrough",
      name: "Water Trough",
      category: "Placeables",
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
    }, 0);

    expect(object).toMatchObject({
      id: "plc_plc_watertrough",
      kind: "placeables",
      resRef: "plc_watertrough",
      tag: "Water Trough",
      source: {
        type: "aurora_blueprint",
        sourceKind: "placeable",
        sourceProfileId: "effective-catalog-utp-placeable-copy-v1",
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

  it("keeps a synthetic placeables.2da preview visible but non-persistable", () => {
    const object = mapPlaceableListItemToSceneObject({
      templateId: "plc_plc_preview",
      resref: "plc_preview",
      name: "Preview",
      category: "Placeables",
      metadata: {
        sourceExtension: "2da",
        sourceObjectKey: "modules/current/__aurora/sources/vanilla/placeables.2da",
      },
    }, 0);

    expect(object.resRef).toBe("plc_preview");
    expect(object.tag).toBe("PREVIEW");
    expect(object).not.toHaveProperty("source");
  });

  it("does not infer VFX from names for a catalog item classified as generic", () => {
    const object = mapPlaceableListItemToSceneObject({
      templateId: "plc_fx_statue",
      resref: "fx_statue",
      name: "Emitter Statue",
      category: "Placeables",
      placeableSubtype: "generic",
    }, 0);

    expect(object).not.toHaveProperty("vfxPayload");
  });

  it("preserves VFX only when the effective catalog classifies the item as VFX", () => {
    const object = mapPlaceableListItemToSceneObject({
      templateId: "plc_fx_sparks",
      resref: "fx_sparks",
      name: "Sparks",
      category: "Placeables",
      placeableSubtype: "vfx",
    }, 0);

    expect(object.vfxPayload).toMatchObject({
      sourceResRef: "fx_sparks",
      flags: { isPlaceableVfx: true },
    });
  });
});
