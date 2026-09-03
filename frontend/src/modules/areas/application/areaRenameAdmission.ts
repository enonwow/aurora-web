import type { AreaRenamePreview } from "../areaRenameContracts";

export type AreaRenameAdmission =
  | Readonly<{ allowed: true }>
  | Readonly<{
      allowed: false;
      reason:
        | "identity_mismatch"
        | "references_blocked"
        | "membership_invalid"
        | "target_collision"
        | "preview_expired";
    }>;

export function resolveAreaRenameAdmission(input: Readonly<{
  moduleId: string;
  areaResRef: string;
  targetAreaResRef: string;
  moduleRevision: string;
  preview: AreaRenamePreview;
  nowUnixMs: number;
}>): AreaRenameAdmission {
  if (input.preview.moduleId !== input.moduleId ||
      input.preview.areaResRef !== input.areaResRef ||
      input.preview.targetAreaResRef !== input.targetAreaResRef ||
      input.preview.moduleRevision !== input.moduleRevision) {
    return { allowed: false, reason: "identity_mismatch" };
  }
  if (input.preview.blockerCount !== 0) {
    return { allowed: false, reason: "references_blocked" };
  }
  if (input.preview.oldMembershipCount !== 1) {
    return { allowed: false, reason: "membership_invalid" };
  }
  if (input.preview.newMembershipCount !== 0) {
    return { allowed: false, reason: "target_collision" };
  }
  const expiresAt = Date.parse(input.preview.expiresAt);
  if (!Number.isFinite(expiresAt) || expiresAt <= input.nowUnixMs) {
    return { allowed: false, reason: "preview_expired" };
  }
  return { allowed: true };
}
