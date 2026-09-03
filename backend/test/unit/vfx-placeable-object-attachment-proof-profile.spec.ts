import { parseRawGffDocument } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { buildGffBuffer } from "../../src/modules/catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE,
  buildVfxPlaceableObjectAttachmentProofManifest,
  buildVfxPlaceableObjectAttachmentProofUtp
} from "../../scripts/support/vfx-placeable-object-attachment-proof-profile";

describe("VFX placeable object-attachment proof profile", () => {
  it("builds the exact dynamic plc_lancrak1 placeable blueprint", () => {
    const document = parseRawGffDocument(
      buildVfxPlaceableObjectAttachmentProofUtp(sourcePlaceableUtp())
    );
    const fields = new Map(
      document?.fields.map((field) => [field.label, field]) ?? []
    );

    expect(document?.fileType).toBe("UTP ");
    expect(fields.get("TemplateResRef")).toMatchObject({
      type: "resref",
      value: "vfxplcproof"
    });
    expect(fields.get("Tag")).toMatchObject({
      type: "cexostring",
      value: "vfx_placeable_target"
    });
    expect(fields.get("Appearance")).toMatchObject({
      type: "dword",
      value: 779
    });
    expect(fields.get("Static")).toMatchObject({ type: "byte", value: 0 });
    expect(fields.get("HP")).toMatchObject({ type: "short", value: 15 });
    expect(fields.get("OnOpen")).toMatchObject({ type: "resref", value: "" });
  });

  it("re-centers the exact row50 Area on the placeable and selects its source impact dummy", () => {
    const manifest = buildVfxPlaceableObjectAttachmentProofManifest(
      {
        fixtureId: "vfx-broad-row50",
        comparisonContext: {
          cameraMatchEstablished: false,
          sceneMatchEstablished: false,
          ownerTargetMatchEstablished: false,
          comparisonStatus: "old"
        },
        proofScene: {
          effectOrigin: { x: 9.5, y: 6.8, z: 0 },
          models: [
            {
              role: "area_tile",
              instanceId: "tile-0",
              translation: [-4.5, -1.8, 0]
            },
            {
              role: "area_tile",
              instanceId: "tile-1",
              translation: [5.5, -1.8, 0]
            }
          ],
          actors: [
            {
              role: "target_creature",
              instanceId: "enon_test_effect:creature-0",
              normalizedPosition: [0, 0, 0]
            }
          ],
          omittedOracleObjects: [
            {
              role: "source_creature",
              reason: "old omission"
            }
          ],
          sourceEvidence: ["row50-source"]
        }
      },
      {
        role: "source_creature",
        instanceId: "enon_test_effect:player-entry",
        processResRef: "proof_avri461",
        sourceBicSha256:
          "5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0",
        normalizedPosition: [0, 0, 0],
        bearingRadians: 0,
        sourceForwardAuroraXY: [0, 1],
        sourceForwardSource: "row216 source"
      }
    );

    expect(manifest.fixtureId).toBe(
      VFX_PLACEABLE_OBJECT_ATTACHMENT_PROOF_PROFILE.fixtureId
    );
    expect(manifest.proofScene.effectOrigin).toEqual({ x: 12.5, y: 6.8, z: 0 });
    expect(manifest.proofScene.models).toEqual([
      expect.objectContaining({ instanceId: "tile-0", translation: [-7.5, -1.8, 0] }),
      expect.objectContaining({ instanceId: "tile-1", translation: [2.5, -1.8, 0] }),
      expect.objectContaining({
        role: "target_placeable",
        instanceId: "enon_test_effect:vfx-placeable-target",
        sourceResref: "plc_lancrak1",
        resourceKey: "scene/placeables/plc_lancrak1.glb",
        translation: [0, 0, 0]
      })
    ]);
    expect(manifest.proofScene.actors).toEqual([
      expect.objectContaining({
        role: "context_creature",
        normalizedPosition: [-3, 0, 0]
      }),
      expect.objectContaining({
        role: "source_creature",
        instanceId: "enon_test_effect:player-entry",
        normalizedPosition: [0, -3, 0],
        bearingRadians: 0,
        sourceForwardAuroraXY: [0, 1],
        sourceBicSha256:
          "5edc2ce0232dad09db9649401db55ccb9956ecfe98ff172e152a11ac5c1d7cc0"
      })
    ]);
    expect(manifest.proofScene.omittedOracleObjects).toEqual([]);
    expect(manifest.comparisonContext).toMatchObject({
      cameraMatchEstablished: false,
      sceneMatchEstablished: false,
      ownerTargetMatchEstablished: true,
      comparisonStatus:
        "source-backed-placeable-target-and-source-actor-open-exact-camera-scene-material-and-visual-parity"
    });
    expect(manifest.proofScene.objectAttachmentTarget).toEqual({
      version: "aurora-vfx-object-attachment-target/v1",
      phase: "impact",
      targetKind: "placeable",
      sourceKind: "proof-scene-model-instance",
      sourceId: "enon_test_effect:vfx-placeable-target",
      targetSpecialNodePrefix: "lancrak1"
    });
    expect(manifest.proofScene.sourceEvidence).toContain("row50-source");
    expect(manifest.proofScene.sourceEvidence).toContain(
      "backend/docs/aurora-reverse/vfx-placeable-object-attachment-proof-audit-2026-08-13.md"
    );
  });
});

function sourcePlaceableUtp(): Buffer {
  return buildGffBuffer(
    [
      { label: "TemplateResRef", type: "resref", value: "plc_chest1" },
      { label: "Tag", type: "cexostring", value: "Chest - 1" },
      { label: "Appearance", type: "dword", value: 7 },
      { label: "Comment", type: "cexostring", value: "Retail chest" },
      { label: "Plot", type: "byte", value: 0 },
      { label: "Useable", type: "byte", value: 1 },
      { label: "HasInventory", type: "byte", value: 1 },
      { label: "HP", type: "short", value: 15 },
      { label: "OnOpen", type: "resref", value: "nw_o2_classlow" }
    ],
    "UTP ",
    0xffffffff
  );
}
