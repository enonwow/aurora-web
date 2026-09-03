import { describe, expect, it, vi } from "vitest";
import { prepareAreaCreateCommand } from "../../../../src/modules/areas/application/areaCreateCommandBuilder";
import type { AreaCreateProfileCatalog } from "../../../../src/modules/areas/areaCreateContracts";
import type { AuroraAreaEditingState } from "../../../../src/modules/scene/domain/auroraAreaEditing";

const sha = "d".repeat(64);
const profileCatalog: AreaCreateProfileCatalog = {
  moduleId: "workspace-module",
  moduleRevision: "a".repeat(64),
  profiles: [
    {
      id: "aur-s05-05-microset-tiny-2x2.v1",
      evidenceScope: "aur-s05-05-structural-candidate",
      tilesetResRef: "tms01",
      width: 2,
      height: 2,
      initializerAlgorithmVersion: "aur-s05-05-observed-grid.v1",
      initializerSeed: 0,
      tiles: [2, 1, 3, 0].map((orientation, index) => ({
        row: Math.floor(index / 2),
        col: index % 2,
        tileId: 12,
        orientation: orientation as 0 | 1 | 2 | 3,
        height: 0,
        mainLight1: 0,
        mainLight2: 0,
        sourceLight1: 0,
        sourceLight2: 0,
        animLoop1: 1,
        animLoop2: 1,
        animLoop3: 1,
      })),
      groupInstances: [],
      fingerprintSha256: "b".repeat(64),
      setFingerprintSha256: "c".repeat(64),
      persistenceStatus: "structural-candidate-awaiting-native-certification",
      materializationAllowed: false,
      certificationId: null,
      blockingProofs: ["runtime-canvas", "toolset-save-build", "nwn-runtime-load"],
    },
  ],
};

function state(): AuroraAreaEditingState {
  return {
    schemaVersion: 1,
    areaResRef: "area_new",
    tilesetResRef: "tms01",
    tilesetFingerprint: "c".repeat(64),
    randomSeed: 0,
    width: 2,
    height: 2,
    tiles: profileCatalog.profiles[0]!.tiles.map((tile) => ({
      id: `tile_${tile.row}_${tile.col}`,
      ...tile,
    })),
    topology: {
      tokenWidth: 0,
      tokenHeight: 0,
      tokens: [],
      cornerWidth: 0,
      cornerHeight: 0,
      heights: [],
    },
    groupInstances: [],
  };
}

describe("prepareAreaCreateCommand", () => {
  it("binds one exact local draft to the captured module/profile/SET revision", async () => {
    const hashDraft = vi.fn(async () => sha);

    const result = await prepareAreaCreateCommand({
      catalog: profileCatalog,
      state: state(),
      areaName: "Created Area",
      areaTag: "Created_Tag",
      draftId: "local-area_new",
      draftRevision: 7,
      clientCommandId: "command-1",
      hashDraft,
    });

    expect(result).toEqual({
      ok: true,
      profile: profileCatalog.profiles[0],
      command: expect.objectContaining({
        schemaVersion: "area-create-command.v1",
        moduleId: "workspace-module",
        expectedModuleRevision: "a".repeat(64),
        creationProfile: {
          id: "aur-s05-05-microset-tiny-2x2.v1",
          fingerprintSha256: "b".repeat(64),
        },
        area: { name: "Created Area", resRef: "area_new", tag: "Created_Tag" },
        tileset: { resRef: "tms01", setFingerprintSha256: "c".repeat(64) },
        draft: { id: "local-area_new", revision: 7, normalizedSha256: sha },
        clientCommandId: "command-1",
      }),
    });
    expect(hashDraft).toHaveBeenCalledWith(expect.stringContaining('"areaResRef":"area_new"'));
  });

  it("fails closed when the edited grid differs from the admitted profile", async () => {
    const changed = state();
    changed.tiles[0] = { ...changed.tiles[0]!, orientation: 0 };

    await expect(
      prepareAreaCreateCommand({
        catalog: profileCatalog,
        state: changed,
        areaName: "Created Area",
        areaTag: "Created_Tag",
        draftId: "local-area_new",
        draftRevision: 1,
        clientCommandId: "command-1",
        hashDraft: async () => sha,
      }),
    ).resolves.toEqual({
      ok: false,
      code: "AREA_CREATE_DRAFT_PROFILE_MISMATCH",
      message: "The local Area topology does not match an admitted immutable creation profile.",
    });
  });

  it.each([
    ["", "Created_Tag"],
    ["Created Area", "   "],
  ])("rejects invalid explicit module identity fields", async (areaName, areaTag) => {
    const result = await prepareAreaCreateCommand({
      catalog: profileCatalog,
      state: state(),
      areaName,
      areaTag,
      draftId: "local-area_new",
      draftRevision: 1,
      clientCommandId: "command-1",
      hashDraft: async () => sha,
    });

    expect(result).toMatchObject({ ok: false, code: "AREA_CREATE_IDENTITY_INVALID" });
  });
});
