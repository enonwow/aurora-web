import type {
  AuroraVfxPayload,
  AuroraVfxRendererEligibility,
  AuroraVfxRetailParityStatus,
  SceneObjectVfxCanonicalStatus
} from "../contracts";

export interface AuroraVfxClaimState {
  rendererEligibility: AuroraVfxRendererEligibility;
  retailParityStatus: AuroraVfxRetailParityStatus;
  retailParityPromoted: boolean;
  legacyCanonicalLabelNonRetail: boolean;
}
type AuroraVfxClaimInput = Partial<
  Pick<
    AuroraVfxPayload,
    "canonicalStatus" | "backendCanonical" | "rendererEligibility" | "retailParityStatus"
  >
>;

export function resolveAuroraVfxClaimState(
  payload: AuroraVfxClaimInput | undefined,
  fallbackCanonicalStatus: SceneObjectVfxCanonicalStatus = "unmapped"
): AuroraVfxClaimState {
  const canonicalStatus = payload?.canonicalStatus ?? fallbackCanonicalStatus;
  const rendererEligibility =
    payload?.rendererEligibility ??
    (canonicalStatus === "canonical" && payload?.backendCanonical === true
      ? "source_backed"
      : canonicalStatus === "preview_only"
        ? "preview_only"
        : "blocked");
  const retailParityStatus = payload?.retailParityStatus ?? "unproven";
  const retailParityPromoted = retailParityStatus === "proven";

  return {
    rendererEligibility,
    retailParityStatus,
    retailParityPromoted,
    legacyCanonicalLabelNonRetail: !retailParityPromoted
  };
}
