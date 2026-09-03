import { describe, expect, it } from "vitest";
import { resolveAreaRenameAdmission } from "../../../../src/modules/areas/application/areaRenameAdmission";
import type { AreaRenamePreview } from "../../../../src/modules/areas/areaRenameContracts";

const preview = {
  moduleId: "module-01",
  areaResRef: "old_area",
  targetAreaResRef: "new_area",
  moduleRevision: "a".repeat(64),
  oldMembershipCount: 1,
  newMembershipCount: 0,
  blockerCount: 0,
  expiresAt: "2026-08-24T18:05:00.000Z"
} as AreaRenamePreview;

describe("Area rename admission", () => {
  it("admits only the exact unblocked, unexpired one-to-zero identity transition", () => {
    expect(resolveAreaRenameAdmission({
      moduleId: "module-01",
      areaResRef: "old_area",
      targetAreaResRef: "new_area",
      moduleRevision: "a".repeat(64),
      preview,
      nowUnixMs: Date.parse("2026-08-24T18:00:00.000Z")
    })).toEqual({ allowed: true });
  });

  it.each([
    [{ ...preview, targetAreaResRef: "other" }, "identity_mismatch"],
    [{ ...preview, blockerCount: 1 }, "references_blocked"],
    [{ ...preview, oldMembershipCount: 2 }, "membership_invalid"],
    [{ ...preview, newMembershipCount: 1 }, "target_collision"],
    [preview, "preview_expired"]
  ] as const)("blocks an inadmissible preview", (candidate, reason) => {
    expect(resolveAreaRenameAdmission({
      moduleId: "module-01",
      areaResRef: "old_area",
      targetAreaResRef: "new_area",
      moduleRevision: "a".repeat(64),
      preview: candidate,
      nowUnixMs: reason === "preview_expired"
        ? Date.parse("2026-08-24T18:05:00.000Z")
        : Date.parse("2026-08-24T18:00:00.000Z")
    })).toEqual({ allowed: false, reason });
  });
});
