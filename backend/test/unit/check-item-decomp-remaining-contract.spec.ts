import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/check-item-decomp-remaining-contract.mjs"
);

async function writeJson(path: string, value: unknown) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function createMatrixSummary(angles = ["front", "side", "back", "top-oblique"]) {
  const ids = [
    "single-part-gem-nw-it-gem001",
    "custom-wizard-armor",
    "three-part-weapon-nw-wswmls002",
    "shield-nw-ashlw001",
    "armor-aarcl009",
    "robe-cloak-l-cloak-0",
    "potion-nw-it-mpotion002"
  ];
  return {
    totalCases: ids.length,
    capturedCases: ids.length,
    failedCases: 0,
    issueCaseCount: 0,
    coverage: {
      fullDefaultCaseSet: true,
      angleCounts: Object.fromEntries(angles.map((angle) => [angle, ids.length]))
    },
    thumbnailReadiness: {
      readyCount: ids.length,
      totalCount: ids.length,
      missing: [],
      entries: ids.map((id) => ({
        id,
        resRef: id.split("-").at(-1),
        imageSourceKind: "rendered-data-url",
        frontFacingProof: true,
        thumbnailQuality: {
          ready: true,
          status: "ready",
          reasons: [],
          metrics: {
            status: "ready",
            naturalWidth: 96,
            naturalHeight: 128,
            alphaBounds: { minX: 4, minY: 2, maxX: 91, maxY: 124, width: 88, height: 123 },
            alphaCoverageRatio: 0.62,
            visibleAlphaRect: { x: 5, y: 1, width: 42, height: 52 },
            visibleAlphaWidthRatio: 0.78,
            visibleAlphaHeightRatio: 0.96,
            visibleAlphaLongAxisFillRatio: 0.96,
            visibleAlphaShortAxisFillRatio: 0.78
          }
        }
      }))
    }
  };
}

function createSourceBlockedRuntimeSummary() {
  return {
    totalCases: 1,
    capturedCases: 1,
    failedCases: 0,
    issueCaseCount: 1,
    expectedSourceIssueCaseCount: 1,
    sourceBlockedEvidence: {
      count: 1,
      withExplicitCodeCount: 1,
      entries: [
        {
          id: "source-issue-001-x3_it_camp",
          resRef: "x3_it_camp",
          visualSupportCode: "metadata-without-supported-asset",
          visualSupportKind: "missing-source",
          visualSupportLabel: "Preview unavailable",
          visualSupportDetail:
            "Source-blocked: model metadata exists, but no supported web model or real inventory icon asset was delivered."
        }
      ]
    }
  };
}

async function createFixtureRoot(utgHeader = "LTR V1.0") {
  const root = await mkdtemp(join(tmpdir(), "aurora-item-contract-"));
  const referenceRoot = join(root, "reference");
  const repoRoot = join(root, "repo");
  const utgDir = join(referenceRoot, "item-retail-extract", "utg");
  const serviceDir = join(
    repoRoot,
    "backend",
    "src",
    "modules",
    "catalog",
    "application"
  );
  const templateParserDir = join(
    repoRoot,
    "backend",
    "src",
    "modules",
    "catalog",
    "adapters",
    "outbound",
    "blob"
  );
  const backendUnitTestDir = join(repoRoot, "backend", "test", "unit");
  const itemsApplicationDir = join(repoRoot, "frontend", "src", "modules", "items", "application");
  const layoutComponentsDir = join(
    repoRoot,
    "frontend",
    "src",
    "modules",
    "layout",
    "components"
  );
  const layoutTestsDir = join(
    repoRoot,
    "frontend",
    "tests",
    "unit",
    "modules",
    "layout"
  );
  const evidenceDir = join(repoRoot, "evidence");
  const outDir = join(repoRoot, "out");
  await mkdir(utgDir, { recursive: true });
  await mkdir(serviceDir, { recursive: true });
  await mkdir(templateParserDir, { recursive: true });
  await mkdir(backendUnitTestDir, { recursive: true });
  await mkdir(itemsApplicationDir, { recursive: true });
  await mkdir(layoutComponentsDir, { recursive: true });
  await mkdir(layoutTestsDir, { recursive: true });
  await mkdir(evidenceDir, { recursive: true });
  await writeFile(join(utgDir, "animal.utg"), `${utgHeader}\0fake`);
  await writeFile(
    join(serviceDir, "catalog.application.service.ts"),
    [
      "GFF-style UTG header detected, but Aurora Web does not yet have a verified TNWItemGenerator parser/serializer.",
      "LTR V1.0 resource, not a GFF item-generator blueprint.",
      "Detected .utg resources are LTR V1.0 lexicons, not item-generator blueprints."
    ].join("\n")
  );
  await writeFile(
    join(templateParserDir, "aurora-gff-template-parser.ts"),
    [
      "const GFF_MAX_PARSED_NESTING_DEPTH = 4",
      "function readInventoryItemListEntries() {}",
      "function readEquippedItemListEntries() {}",
      "function readStoreListEntries() {}"
    ].join("\n")
  );
  await writeFile(
    join(backendUnitTestDir, "aurora-gff-template-parser.spec.ts"),
    [
      "round-trips full embedded item fields through creature inventory and equipment GFF",
      "round-trips full embedded item fields through placeable inventory UTP GFF",
      "round-trips full embedded item fields through store UTM StoreList",
      "localizedNameStrRef",
      "bodyPartRFoot",
      "itemPropertyListEntries"
    ].join("\n")
  );
  await writeFile(
    join(backendUnitTestDir, "aurora-gff-area-parser.spec.ts"),
    [
      "round-trips placed item properties through the GIT ItemList writer and parser",
      "localizedNameStrRef",
      "bodyPartRFoot",
      "itemPropertyListEntries",
      "bearing"
    ].join("\n")
  );
  await writeFile(
    join(itemsApplicationDir, "itemVisualSupport.ts"),
    [
      "metadata-without-supported-asset",
      "Preview unavailable",
      "Preview unsupported"
    ].join("\n")
  );
  await writeFile(
    join(layoutComponentsDir, "ItemsModePanel.tsx"),
    [
      "Item Generator Unsupported",
      "aria-label=\"item generator support\"",
      "generatorSupport.status === \"ready\"",
      "generatorSupport.status === \"no-sources\"",
      "resolveItemVisualSupportInfo",
      "shouldSuppressUnsupportedThumbnail",
      "data-visual-support-code",
      "items-mode-visual-status"
    ].join("\n")
  );
  await writeFile(
    join(layoutComponentsDir, "ItemsModeRightPanel.tsx"),
    [
      "resolveItemVisualSupportInfo",
      "items-visual-support-notice",
      "role={visualSupportInfo.tone === \"warning\" ? \"alert\" : \"status\"}"
    ].join("\n")
  );
  await writeFile(
    join(layoutTestsDir, "ItemsModePanel.test.tsx"),
    [
      "shows item generator support as unsupported when sources are LTR lexicons",
      "Item Generator Unsupported",
      "animal.utg: LTR V1.0",
      "Detected .utg resources are LTR V1.0 lexicons, not item-generator blueprints.",
      "labels item rows whose source visual is unsupported",
      "does not use cached preview images for unsupported item visuals",
      "does not render metadata-only model assets as item thumbnails",
      "Preview unsupported",
      "empty-model-no-real-icon",
      "data-visual-support-code"
    ].join("\n")
  );
  await writeFile(
    join(layoutTestsDir, "ItemsModeRightPanel.test.tsx"),
    [
      "shows an unsupported preview notice for item sources without real visuals",
      "Preview unsupported"
    ].join("\n")
  );
  await writeJson(join(evidenceDir, "coverage.json"), {
    totalItems: 3160,
    uniqueVisualSignatures: 1207,
    issueItemCount: 653,
    sourceBlockedItemCount: 653,
    webBugCandidateItemCount: 0,
    statusCounts: {
      "authored-invalid-icon-no-renderable-model": 652,
      "missing-renderable-model-and-icon-source": 1
    }
  });
  await writeJson(join(evidenceDir, "visual-matrix.json"), createMatrixSummary());
  await writeJson(join(evidenceDir, "thumbnail-matrix.json"), createMatrixSummary(["front"]));
  await writeJson(
    join(evidenceDir, "source-blocked-runtime.json"),
    createSourceBlockedRuntimeSummary()
  );
  await writeFile(join(evidenceDir, "contact-sheet.png"), Buffer.alloc(2048, 1));
  return {
    root,
    referenceRoot,
    repoRoot,
    outDir,
    coverageSummary: join(evidenceDir, "coverage.json"),
    visualMatrixSummary: join(evidenceDir, "visual-matrix.json"),
    thumbnailSummary: join(evidenceDir, "thumbnail-matrix.json"),
    sourceBlockedRuntimeSummary: join(evidenceDir, "source-blocked-runtime.json"),
    thumbnailContactSheet: join(evidenceDir, "contact-sheet.png")
  };
}

function buildArgs(fixture: Awaited<ReturnType<typeof createFixtureRoot>>) {
  return [
    scriptPath,
    "--repoRoot",
    fixture.repoRoot,
    "--referenceRoot",
    fixture.referenceRoot,
    "--outDir",
    fixture.outDir,
    "--coverageSummary",
    fixture.coverageSummary,
    "--visualMatrixSummary",
    fixture.visualMatrixSummary,
    "--thumbnailSummary",
    fixture.thumbnailSummary,
    "--sourceBlockedRuntimeSummary",
    fixture.sourceBlockedRuntimeSummary,
    "--thumbnailContactSheet",
    fixture.thumbnailContactSheet
  ];
}

describe("check-item-decomp-remaining-contract", () => {
  it("passes when generator sources are LTR-only and item visual proof is clean", async () => {
    const fixture = await createFixtureRoot();
    const { stdout } = await execFileAsync("node", buildArgs(fixture), {
      maxBuffer: 1024 * 1024
    });
    const report = JSON.parse(stdout);

    expect(report.status).toBe("pass");
    expect(report.summary).toMatchObject({
      utgStatus: "unsupported-gated-ltr-only",
      sourceBlockedItemCount: 653,
      webBugCandidateItemCount: 0,
      visualMatrixCases: 7,
      thumbnailMatrixCases: 7,
      sourceBlockedRuntimeCases: 1,
      generatorFrontendGatePresent: true,
      visualUnsupportedFrontendGatePresent: true,
      embeddedItemParityGatePresent: true,
      failureCount: 0
    });
    const written = JSON.parse(
      await readFile(
        join(fixture.outDir, "item-decomp-remaining-contract-summary.json"),
        "utf8"
      )
    );
    expect(written.checks.utg.sources[0]).toMatchObject({
      name: "animal.utg",
      classification: "ltr-lexicon"
    });
    expect(written.checks.sourceBlockedRuntime.sourceBlockedEvidence.entries[0]).toMatchObject({
      resRef: "x3_it_camp",
      visualSupportCode: "metadata-without-supported-asset",
      visualSupportKind: "missing-source",
      visualSupportLabel: "Preview unavailable"
    });
    expect(written.checks.generatorUnsupportedFrontend.statusPresent).toBe(true);
    expect(written.checks.visualUnsupportedFrontend.statusPresent).toBe(true);
    expect(written.checks.embeddedItemParityProofs.statusPresent).toBe(true);
  });

  it("fails when a real GFF-style UTG source appears before parser support lands", async () => {
    const fixture = await createFixtureRoot("UTG V3.2");
    await expect(
      execFileAsync("node", buildArgs(fixture), {
        maxBuffer: 1024 * 1024
      })
    ).rejects.toMatchObject({
      stdout: expect.stringContaining("utg-gff-candidate-needs-parser")
    });
  });
});
