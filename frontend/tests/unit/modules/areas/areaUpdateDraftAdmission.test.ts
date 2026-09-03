import { describe, expect, it } from "vitest";

import { resolveCurrentAreaUpdateDraftIdentity } from "../../../../src/modules/areas/application/areaUpdateDraftAdmission";
import type { AreaDraftSession } from "../../../../src/modules/areas/ports/areaLifecyclePort";
import type { AreaScene } from "../../../../src/modules/scene/contracts";

const scene = {
  sceneId: "area_crypt01",
  updatedAtUnixMs: 1234,
  auroraAreaEditing: {
    state: { sourceAreaFingerprint: "a".repeat(64) }
  }
} as AreaScene;

const session = {
  draftId: "draft-01",
  revision: 7,
  normalizedSha256: "b".repeat(64),
  persistedSceneUpdatedAtUnixMs: 1234,
  productionSource: {
    schemaVersion: "production-area-draft-payload.v1",
    sourceArea: {} as never,
    provenance: {
      areaId: "area_crypt01",
      sourceUpdatedAt: "2026-08-18T20:00:00.000Z",
      processingCacheKey: "cache-01",
      sourceAreSha256: "a".repeat(64)
    }
  }
} satisfies AreaDraftSession;

describe("resolveCurrentAreaUpdateDraftIdentity", () => {
  it("returns only the immutable identity saved from the exact current production scene", () => {
    expect(resolveCurrentAreaUpdateDraftIdentity(scene, session)).toEqual({
      id: "draft-01",
      revision: 7,
      normalizedSha256: "b".repeat(64)
    });
  });

  it.each([
    ["missing session", undefined],
    ["wrong production Area", { ...session, productionSource: { ...session.productionSource, provenance: { ...session.productionSource.provenance, areaId: "area_other" } } }],
    ["wrong source fingerprint", { ...session, productionSource: { ...session.productionSource, provenance: { ...session.productionSource.provenance, sourceAreSha256: "c".repeat(64) } } }],
    ["stale scene timestamp", { ...session, persistedSceneUpdatedAtUnixMs: 1233 }],
    ["missing hash", { ...session, normalizedSha256: undefined }],
    ["uppercase hash", { ...session, normalizedSha256: "B".repeat(64) }],
    ["zero revision", { ...session, revision: 0 }]
  ] as const)("fails closed for %s", (_label, candidate) => {
    expect(resolveCurrentAreaUpdateDraftIdentity(scene, candidate)).toBeNull();
  });
});
