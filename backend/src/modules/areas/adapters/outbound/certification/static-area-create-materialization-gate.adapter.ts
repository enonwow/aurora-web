import { Injectable } from "@nestjs/common";
import {
  AREA_CREATE_BLOCKING_PROOFS,
  type AreaCreateMaterializationGatePort,
  type AreaCreateMaterializationPolicy,
} from "../../../application/ports/area-create-materialization-gate.port";
import {
  AUR_S05_05_CREATION_PROFILE_FINGERPRINT,
  AUR_S05_05_CREATION_PROFILE_ID,
} from "../../../domain/area-create-profile";

const AWAITING_NATIVE_CERTIFICATION: AreaCreateMaterializationPolicy =
  Object.freeze({
    persistenceStatus:
      "structural-candidate-awaiting-native-certification" as const,
    materializationAllowed: false as const,
    certificationId: null,
    blockingProofs: Object.freeze([...AREA_CREATE_BLOCKING_PROOFS]),
  });

/**
 * Fail-closed release gate for public module mutation.
 *
 * The narrow profile remains validation-only until an immutable fresh proof
 * packet binds this exact profile fingerprint to settled Aurora Web canvas,
 * Toolset Save/Build, and NWN runtime evidence. A later certified adapter may
 * replace this provider; absence or identity mismatch must never enable writes.
 */
@Injectable()
export class StaticAreaCreateMaterializationGateAdapter
  implements AreaCreateMaterializationGatePort
{
  async resolve(input: Readonly<{
    profileId: string;
    profileFingerprintSha256: string;
  }>): Promise<AreaCreateMaterializationPolicy> {
    if (
      input.profileId !== AUR_S05_05_CREATION_PROFILE_ID ||
      input.profileFingerprintSha256 !==
        AUR_S05_05_CREATION_PROFILE_FINGERPRINT
    ) {
      return AWAITING_NATIVE_CERTIFICATION;
    }
    return AWAITING_NATIVE_CERTIFICATION;
  }
}
