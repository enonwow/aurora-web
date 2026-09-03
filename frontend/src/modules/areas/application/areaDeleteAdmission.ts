import type { AreaDeletePreview } from "../areaDeleteContracts";

const AREA_ID_PATTERN = /^area_([a-z0-9_]{1,16})$/u;

export function resolveAreaResRefFromAreaId(areaId: string): string | null {
  return AREA_ID_PATTERN.exec(areaId)?.[1] ?? null;
}

export type AreaDeleteAdmission =
  | Readonly<{ allowed: true }>
  | Readonly<{
      allowed: false;
      reason:
        | "identity_mismatch"
        | "references_blocked"
        | "membership_invalid"
        | "entry_area_blocked"
        | "preview_expired";
    }>;

export function resolveAreaDeleteAdmission(input: Readonly<{
  moduleId: string;
  areaResRef: string;
  moduleRevision: string;
  preview: AreaDeletePreview;
  nowUnixMs: number;
}>): AreaDeleteAdmission {
  if (
    input.preview.moduleId !== input.moduleId ||
    input.preview.areaResRef !== input.areaResRef ||
    input.preview.moduleRevision !== input.moduleRevision
  ) {
    return { allowed: false, reason: "identity_mismatch" };
  }
  if (input.preview.blockerCount !== 0) {
    return { allowed: false, reason: "references_blocked" };
  }
  if (input.preview.membershipCount !== 1) {
    return { allowed: false, reason: "membership_invalid" };
  }
  if (input.preview.entryAreaResRef === input.areaResRef) {
    return { allowed: false, reason: "entry_area_blocked" };
  }
  const expiresAtUnixMs = Date.parse(input.preview.expiresAt);
  if (!Number.isFinite(expiresAtUnixMs) || expiresAtUnixMs <= input.nowUnixMs) {
    return { allowed: false, reason: "preview_expired" };
  }
  return { allowed: true };
}
