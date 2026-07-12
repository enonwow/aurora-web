import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

describe("capture-item-visual-matrix-cdp", () => {
  it("records thumbnail readiness, coverage, and source-blocked visual support evidence", async () => {
    const scriptPath = resolve(__dirname, "../../scripts/capture-item-visual-matrix-cdp.mjs");
    const script = await readFile(scriptPath, "utf8");

    expect(script).toContain("data-visual-support-code");
    expect(script).toContain("visualSupportCode");
    expect(script).toContain("summarizeVisualMatrixCoverage");
    expect(script).toContain("summarizeThumbnailReadiness");
    expect(script).toContain("summarizeSourceBlockedEvidence");
    expect(script).toContain("thumbnailReadiness");
    expect(script).toContain("thumbnailPixelMetrics");
    expect(script).toContain("evaluateThumbnailQuality");
    expect(script).toContain("visibleAlphaLongAxisFillRatio");
    expect(script).toContain("sourceBlockedEvidence");
    expect(script).toContain("fullDefaultCaseSet");
    expect(script).toContain("frontFacingProof");
    expect(script).toContain("buildItemSearchTerms");
    expect(script).toContain("buildItemSearchTerms(resRef, [])");
    expect(script).toContain('replace(/_/g, "")');
    expect(script).toContain("fields = Array.from(root.querySelectorAll");
    expect(script).toContain("reloadError");
    expect(script).toContain('id: "three-part-weapon-nw-wswmls002"');
    expect(script).toContain('resRef: "nw_wswmls002"');
    expect(script).toContain('searchHints: ["longsword", "wswls"]');
    expect(script).toContain('selectBaseItem(send, "16", wizardSelector)');
    expect(script).toContain("startsWith(exactBaseNeedle)");
    expect(script).toContain('id: "shield-nw-ashlw001"');
    expect(script).toContain('resRef: "nw_ashlw001"');
    expect(script).toContain('searchHints: ["Large Shield", "largeshield"]');
    expect(script).toContain("debugRows");
  });
});
