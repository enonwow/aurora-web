import { StaticAreaCreateMaterializationGateAdapter } from "../../src/modules/areas/adapters/outbound/certification/static-area-create-materialization-gate.adapter";
import {
  AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
  AUR_S05_05_CREATION_PROFILE_ID,
} from "../../src/modules/areas/domain/area-create-profile";

describe("StaticAreaCreateMaterializationGateAdapter", () => {
  it("keeps the exact structural profile validation-only until fresh native proof is bound", async () => {
    const gate = new StaticAreaCreateMaterializationGateAdapter();

    await expect(
      gate.resolve({
        profileId: AUR_S05_05_CREATION_PROFILE_ID,
        profileFingerprintSha256: AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
      }),
    ).resolves.toEqual({
      persistenceStatus: "structural-candidate-awaiting-native-certification",
      materializationAllowed: false,
      certificationId: null,
      blockingProofs: [
        "runtime-canvas",
        "toolset-save-build",
        "nwn-runtime-load",
      ],
    });
  });

  it("fails closed for a stale profile fingerprint", async () => {
    const gate = new StaticAreaCreateMaterializationGateAdapter();

    await expect(
      gate.resolve({
        profileId: AUR_S05_05_CREATION_PROFILE_ID,
        profileFingerprintSha256: "0".repeat(64),
      }),
    ).resolves.toMatchObject({ materializationAllowed: false });
  });
});
