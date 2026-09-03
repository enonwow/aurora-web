import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { AuroraVfxPayload } from "../../../../../src/modules/scene/contracts";
import { applyAuroraVfxObjectAttachmentPosition } from "../../../../../src/modules/vfx/application/auroraVfxObjectAttachment";

describe("applyAuroraVfxObjectAttachmentPosition", () => {
  it("places and orients an Imp_Impact_Node model with Aurora's full attachment transform", () => {
    const scene = new THREE.Scene();
    const target = new THREE.Group();
    target.position.set(3, 0, -2);
    target.rotation.y = Math.PI / 2;
    const impact = new THREE.Object3D();
    impact.name = "Impact";
    impact.position.set(0, 1.432, 0.1);
    impact.rotation.set(0.15, -0.3, 0.45);
    target.add(impact);
    scene.add(target);
    const effectParent = new THREE.Group();
    effectParent.position.set(-1, 0.25, 2);
    effectParent.rotation.set(-0.1, 0.25, 0.2);
    scene.add(effectParent);
    const effect = new THREE.Group();
    effect.rotation.set(0.2, 0.4, 0.6);
    effect.scale.set(1.25, 1.25, 1.25);
    effectParent.add(effect);
    scene.updateWorldMatrix(true, true);

    const result = applyAuroraVfxObjectAttachmentPosition({
      payload: createPayload({
        Imp_Impact_Node: "vim_negdeath"
      }, "1"),
      phase: "impact",
      targetKind: "creature",
      targetRoots: [target],
      effectGroup: effect
    });

    scene.updateWorldMatrix(true, true);
    const expectedPosition = impact.getWorldPosition(new THREE.Vector3());
    const expectedQuaternion = impact.getWorldQuaternion(new THREE.Quaternion());
    const actualPosition = effect.getWorldPosition(new THREE.Vector3());
    const actualQuaternion = effect.getWorldQuaternion(new THREE.Quaternion());
    expect(result).toMatchObject({
      status: "attached",
      sourceColumn: "Imp_Impact_Node",
      requestedNodeName: "impact",
      resolvedNodeName: "Impact",
      orientationPolicy: "aurora-full-attachment-world-transform"
    });
    expect(actualPosition.distanceTo(expectedPosition)).toBeLessThan(1e-6);
    expect(actualQuaternion.angleTo(expectedQuaternion)).toBeLessThan(1e-6);
    expect(
      new THREE.Quaternion().fromArray(result.worldQuaternion!).angleTo(
        expectedQuaternion
      )
    ).toBeLessThan(1e-6);
    expect(effect.scale.toArray()).toEqual([1.25, 1.25, 1.25]);

    impact.position.y += 0.2;
    impact.rotation.z += 0.3;
    scene.updateWorldMatrix(true, true);
    applyAuroraVfxObjectAttachmentPosition({
      payload: createPayload({ Imp_Impact_Node: "vim_negdeath" }, "1"),
      phase: "impact",
      targetKind: "creature",
      targetRoots: [target],
      effectGroup: effect
    });
    scene.updateWorldMatrix(true, true);
    expect(
      effect
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(impact.getWorldPosition(new THREE.Vector3()))
    ).toBeLessThan(1e-6);
    expect(
      effect
        .getWorldQuaternion(new THREE.Quaternion())
        .angleTo(impact.getWorldQuaternion(new THREE.Quaternion()))
    ).toBeLessThan(1e-6);
  });

  it("preserves effect orientation when Aurora's OrientWithGround source value is zero", () => {
    const scene = new THREE.Scene();
    const target = new THREE.Group();
    target.rotation.set(0.3, -0.5, 0.7);
    const head = new THREE.Object3D();
    head.name = "head";
    head.position.set(0, 1.8, 0);
    head.rotation.set(-0.4, 0.2, 0.1);
    target.add(head);
    const headConjure = new THREE.Object3D();
    headConjure.name = "headconjure";
    headConjure.position.set(0, 2.3, 0);
    target.add(headConjure);
    scene.add(target);
    const effect = new THREE.Group();
    effect.rotation.set(0.15, 0.35, -0.25);
    scene.add(effect);
    scene.updateWorldMatrix(true, true);
    const originalWorldQuaternion = effect.getWorldQuaternion(
      new THREE.Quaternion()
    );

    const result = applyAuroraVfxObjectAttachmentPosition({
      payload: createPayload(
        {
          Imp_HeadCon_Node: "vim_heal04"
        },
        "0"
      ),
      phase: "impact",
      targetKind: "creature",
      targetRoots: [target],
      effectGroup: effect
    });

    scene.updateWorldMatrix(true, true);
    expect(result.orientationPolicy).toBe("aurora-attach-no-orientation");
    expect(result.orientWithGroundRaw).toBe("0");
    expect(result.requestedNodeName).toBe("head");
    expect(result.resolvedNodeName).toBe("head");
    expect(
      effect
        .getWorldQuaternion(new THREE.Quaternion())
        .angleTo(originalWorldQuaternion)
    ).toBeLessThan(1e-6);
    expect(
      effect
        .getWorldQuaternion(new THREE.Quaternion())
        .angleTo(head.getWorldQuaternion(new THREE.Quaternion()))
    ).toBeGreaterThan(0.1);

    head.position.y += 0.25;
    head.rotation.x += 0.5;
    scene.updateWorldMatrix(true, true);
    applyAuroraVfxObjectAttachmentPosition({
      payload: createPayload({ Imp_HeadCon_Node: "vim_heal04" }, "0"),
      phase: "impact",
      targetKind: "creature",
      targetRoots: [target],
      effectGroup: effect
    });
    scene.updateWorldMatrix(true, true);
    expect(
      effect
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(head.getWorldPosition(new THREE.Vector3()))
    ).toBeLessThan(1e-6);
    expect(
      effect
        .getWorldQuaternion(new THREE.Quaternion())
        .angleTo(originalWorldQuaternion)
    ).toBeLessThan(1e-6);
  });

  it("attaches a creature Root size slot to the target Gob root", () => {
    const scene = new THREE.Scene();
    const target = new THREE.Group();
    target.name = "creature-root";
    target.position.set(2, 0.5, -4);
    scene.add(target);
    const effect = new THREE.Group();
    scene.add(effect);
    scene.updateWorldMatrix(true, true);

    const result = applyAuroraVfxObjectAttachmentPosition({
      payload: createPayload({ Imp_Root_M_Node: "vff_explfire" }),
      phase: "impact",
      targetKind: "creature",
      targetRoots: [target],
      effectGroup: effect
    });

    scene.updateWorldMatrix(true, true);
    expect(result).toMatchObject({
      status: "attached",
      sourceColumn: "Imp_Root_M_Node",
      requestedNodeName: "",
      resolvedNodeName: "creature-root",
      targetKind: "creature"
    });
    expect(
      effect
        .getWorldPosition(new THREE.Vector3())
        .distanceTo(target.getWorldPosition(new THREE.Vector3()))
    ).toBeLessThan(1e-6);
  });

  it("uses the exact placeable model prefix for a HeadCon special node", () => {
    const target = new THREE.Group();
    const headHit = new THREE.Object3D();
    headHit.name = "T04_head_hit";
    headHit.position.set(0, 1.25, 0);
    target.add(headHit);
    const effect = new THREE.Group();

    const result = applyAuroraVfxObjectAttachmentPosition({
      payload: createPayload({ Imp_HeadCon_Node: "vim_heal04" }),
      phase: "impact",
      targetKind: "placeable",
      targetSpecialNodePrefix: "T04",
      targetRoots: [target],
      effectGroup: effect
    });

    expect(result).toMatchObject({
      status: "attached",
      requestedNodeName: "T04_head_hit",
      resolvedNodeName: "T04_head_hit",
      targetKind: "placeable"
    });
  });

  it("fails closed when more than one attachment namespace is populated", () => {
    const result = applyAuroraVfxObjectAttachmentPosition({
      payload: createPayload({
        Imp_HeadCon_Node: "head_fx",
        Imp_Impact_Node: "impact_fx"
      }),
      phase: "impact",
      targetKind: "creature",
      targetRoots: [new THREE.Group()],
      effectGroup: new THREE.Group()
    });

    expect(result.status).toBe("attachment-slot-ambiguous");
  });

  it("reports a missing source-backed target anchor without moving the effect", () => {
    const effect = new THREE.Group();
    effect.position.set(1, 2, 3);
    const result = applyAuroraVfxObjectAttachmentPosition({
      payload: createPayload({
        Imp_Impact_Node: "vim_negdeath"
      }),
      phase: "impact",
      targetKind: "creature",
      targetRoots: [new THREE.Group()],
      effectGroup: effect
    });

    expect(result.status).toBe("anchor-missing");
    expect(effect.position.toArray()).toEqual([1, 2, 3]);
  });
});

function createPayload(
  modelNodeRefs: Record<string, string>,
  orientWithGroundRaw = "0"
): AuroraVfxPayload {
  return {
    version: "aurora-vfx-payload/v1",
    canonicalStatus: "canonical",
    backendCanonical: true,
    sourceKind: "effect_instance",
    previewMode: "none",
    diagnostics: {
      sourceRows: [],
      effectInstance: [],
      phaseSchedule: [],
      dependencyGraph: [],
      runtimeState: [],
      renderContract: [],
      payload: []
    },
    contracts: {
      sourceRows: [
        {
          rowId: 68,
          rawCells: {
            OrientWithGround: orientWithGroundRaw
          },
          visualFacts: {
            orientWithGroundRaw
          }
        }
      ],
      phaseSchedule: {
        sourceRowId: 68,
        effectInstance: {
          applicationMode: "object"
        },
        phases: [
          {
            phase: "impact",
            modelNodeRefs
          }
        ]
      }
    },
    provenance: {}
  };
}
