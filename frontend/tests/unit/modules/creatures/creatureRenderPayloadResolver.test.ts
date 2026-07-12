import { describe, expect, it, vi } from "vitest";
import { fetchCreatureViewportRenderPayload } from "../../../../src/modules/creatures/application/creatureRenderPayloadResolver";
import type { CreatureApiPort } from "../../../../src/modules/creatures/ports/creatureApiPort";

function createCreatureApiPort(): CreatureApiPort {
  return {
    listCreatures: vi.fn(),
    processCreature: vi.fn(async () => ({
      cache: {
        key: "cre_guard_captain:v1",
        hit: false,
        storedAt: "2026-01-01T00:00:00.000Z",
        hits: 0
      },
      creature: {
        templateId: "cre_guard_captain",
        kind: "creature",
        resref: "cre_guard",
        name: "Guard Captain",
        category: "npc",
        benchmarkCandidate: false,
        render: {
          backendType: "creature",
          frontendType: "creature",
          rendererPreset: "creature-standard"
        },
        creatureRenderPackage: {
          status: "missing_derived",
          diagnostics: [
            {
              code: "CREATURE_RENDER_DERIVED_MODEL_MISSING",
              severity: "warn",
              message: "No derived creature model is available yet."
            }
          ],
          rendererPreset: "creature-standard",
          appearanceProfile: {
            appearanceType: 6,
            appearanceLabel: "Human",
            modelType: "P",
            raceModel: "P_HHM"
          },
          sourceModelCandidates: [
            {
              resref: "P_HHM",
              role: "appearance-race-model",
              source: "appearance.2da.RACE",
              confidence: "assembly-prefix"
            }
          ],
          skeletonModelCandidates: [
            {
              resref: "pfh2",
              role: "base-skeleton",
              source: "part-model-prefix",
              modelPrefix: "pfh2_",
              confidence: "prefix-derived"
            }
          ],
          partModelCandidates: [],
          bodyParts: {
            head: 1
          },
          colors: {
            skin: 2
          }
        },
        processedAt: "2026-01-01T00:00:00.000Z"
      }
    })),
    getProcessedCreature: vi.fn()
  };
}

describe("creatureRenderPayloadResolver", () => {
  it("fetches a processed creature and exposes the viewport render payload", async () => {
    const creatureApiPort = createCreatureApiPort();

    const payload = await fetchCreatureViewportRenderPayload(
      creatureApiPort,
      "token",
      { templateId: "cre_guard_captain", resref: "cre_guard" }
    );

    expect(creatureApiPort.processCreature).toHaveBeenCalledWith("token", {
      templateId: "cre_guard_captain",
      resref: "cre_guard",
      includeBenchmarkMetadata: false
    });
    expect(payload).toMatchObject({
      templateId: "cre_guard_captain",
      cacheKey: "cre_guard_captain:v1",
      cacheHit: false,
      hits: 0,
      creature: {
        resref: "cre_guard"
      },
      renderPackage: {
        status: "missing_derived",
        sourceModelCandidates: [
          expect.objectContaining({
            resref: "P_HHM",
            confidence: "assembly-prefix"
          })
        ],
        skeletonModelCandidates: [
          expect.objectContaining({
            resref: "pfh2",
            confidence: "prefix-derived"
          })
        ],
        diagnostics: [
          expect.objectContaining({
            code: "CREATURE_RENDER_DERIVED_MODEL_MISSING"
          })
        ]
      }
    });
  });

  it("publishes an interim process payload callback with the normalized lookup", async () => {
    const creatureApiPort = createCreatureApiPort();
    const onProcessPayload = vi.fn();

    await fetchCreatureViewportRenderPayload(creatureApiPort, "token", "cre_guard_captain", {
      onProcessPayload
    });

    expect(onProcessPayload).toHaveBeenCalledWith(
      expect.objectContaining({
        cacheKey: "cre_guard_captain:v1",
        renderPackage: expect.objectContaining({
          status: "missing_derived"
        })
      }),
      {
        lookup: {
          templateId: "cre_guard_captain"
        }
      }
    );
  });

  it("can bypass backend cache for active viewport previews", async () => {
    const creatureApiPort = createCreatureApiPort();

    await fetchCreatureViewportRenderPayload(creatureApiPort, "token", "cre_guard_captain", {
      bypassCache: true
    });

    expect(creatureApiPort.processCreature).toHaveBeenCalledWith("token", {
      templateId: "cre_guard_captain",
      bypassCache: true,
      includeBenchmarkMetadata: false
    });
  });
});
