import type { AreaScene } from "../../scene/contracts";
import type { AreaUpdateDraftIdentity } from "../areaUpdateContracts";
import type { AreaDraftSession } from "../ports/areaLifecyclePort";

const SHA256_PATTERN = /^[a-f0-9]{64}$/u;

export function resolveCurrentAreaUpdateDraftIdentity(
  scene: AreaScene,
  session: AreaDraftSession | undefined
): AreaUpdateDraftIdentity | null {
  const sourceAreaFingerprint = scene.auroraAreaEditing?.state.sourceAreaFingerprint;
  if (
    !session ||
    session.productionSource?.provenance.areaId !== scene.sceneId ||
    session.productionSource.provenance.sourceAreSha256 !== sourceAreaFingerprint ||
    session.persistedSceneUpdatedAtUnixMs !== scene.updatedAtUnixMs ||
    !Number.isSafeInteger(session.revision) ||
    session.revision <= 0 ||
    !SHA256_PATTERN.test(session.normalizedSha256 ?? "")
  ) {
    return null;
  }
  return Object.freeze({
    id: session.draftId,
    revision: session.revision,
    normalizedSha256: session.normalizedSha256!
  });
}
