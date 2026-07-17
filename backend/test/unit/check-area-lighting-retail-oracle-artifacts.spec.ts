import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const scriptPath = resolve(
  __dirname,
  "../../scripts/check-area-lighting-retail-oracle-artifacts.mjs"
);

async function runGate(tempRoot: string) {
  const outputPath = join(tempRoot, "report.json");
  const artifactRoot = join(tempRoot, "backend/docs/aurora-reverse/artifacts");
  const { stdout } = await execFileAsync(
    "node",
    [
      scriptPath,
      "--repoRoot",
      tempRoot,
      "--searchRoot",
      artifactRoot,
      "--out",
      outputPath,
      "--allow-blocked"
    ],
    { maxBuffer: 1024 * 1024 * 4 }
  );
  return {
    stdout: JSON.parse(stdout),
    report: JSON.parse(await readFile(outputPath, "utf8"))
  };
}

describe("check-area-lighting-retail-oracle-artifacts", () => {
  it("keeps retail parity blocked when required oracle files are absent", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-empty-"));
    await mkdir(join(tempRoot, "backend/docs/aurora-reverse/artifacts"), { recursive: true });

    const { stdout, report } = await runGate(tempRoot);

    expect(stdout.status).toBe("blocked");
    expect(report.status).toBe("blocked");
    expect(report.summary.requiredArtifacts).toBe(25);
    expect(report.summary.missingRequiredArtifacts).toBe(25);
    expect(report.missingRequiredArtifacts).toEqual(
      expect.arrayContaining([
        "retail-or-toolset-shadowvol-campfire.png",
        "aurora-web-shadowvol-campfire.png",
        "shadowvol-campfire-pixel-compare.json"
      ])
    );
    expect(
      report.blockers
        .find((blocker: { key: string }) => blocker.key === "retail-shadow-volume-projection-parity")
        ?.cases.find(
          (oracleCase: { caseId: string }) =>
            oracleCase.caseId === "shadowvol-campfire-pixel-geometry-opacity"
        )
    ).toMatchObject({
      promotionStatus: "blocked-missing-required-artifacts",
      missingRequiredArtifacts: expect.arrayContaining([
        "retail-or-toolset-shadowvol-campfire.png",
        "aurora-web-shadowvol-campfire.png",
        "shadowvol-campfire-pixel-compare.json"
      ])
    });
  });

  it("promotes an oracle case only when required files and explicit JSON verdict exist", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-present-"));
    const artifactRoot = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(join(artifactRoot, "retail-or-toolset-shadowvol-campfire.png"), "retail-png");
    await writeFile(join(artifactRoot, "aurora-web-shadowvol-campfire.png"), "web-png");
    await writeFile(
      join(artifactRoot, "shadowvol-campfire-pixel-compare.json"),
      `${JSON.stringify({ status: "passed", maxDelta: 0.01 })}\n`
    );

    const { report } = await runGate(tempRoot);
    const shadowBlocker = report.blockers.find(
      (blocker: { key: string }) => blocker.key === "retail-shadow-volume-projection-parity"
    );
    const campfireCase = shadowBlocker.cases.find(
      (oracleCase: { caseId: string }) =>
        oracleCase.caseId === "shadowvol-campfire-pixel-geometry-opacity"
    );

    expect(report.status).toBe("blocked");
    expect(campfireCase).toMatchObject({
      promotionStatus: "oracle-pass",
      missingRequiredArtifacts: []
    });
    expect(campfireCase.requiredArtifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "shadowvol-campfire-pixel-compare.json",
          status: "present",
          json: expect.objectContaining({ status: "explicit-pass" })
        })
      ])
    );
  });

  it("does not require pass verdicts from required JSON input traces", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-input-json-"));
    const artifactRoot = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(join(artifactRoot, "retail-shadowvol-state-trace.json"), "{}\n");
    await writeFile(join(artifactRoot, "aurora-web-shadowvol-state-trace.json"), "{}\n");

    const { report } = await runGate(tempRoot);
    const shadowBlocker = report.blockers.find(
      (blocker: { key: string }) => blocker.key === "retail-shadow-volume-projection-parity"
    );
    const stateCase = shadowBlocker.cases.find(
      (oracleCase: { caseId: string }) => oracleCase.caseId === "shadowvol-retail-gl-state-order"
    );

    expect(report.summary.requiredJsonWithoutExplicitVerdict).toBe(0);
    expect(stateCase.requiredJsonWithoutExplicitVerdict).toEqual([]);
    expect(stateCase.missingRequiredArtifacts).toEqual(["shadowvol-state-order-compare.json"]);
  });

  it("tracks source-family lane artifacts as current evidence without promoting retail ordering", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-source-family-"));
    const artifactRoot = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(
      join(artifactRoot, "audit-retail-item-light-tables-2026-07-05.json"),
      `${JSON.stringify({ proofStatus: "source-backed-retail-key-bif-item-light-tables" })}\n`
    );
    await writeFile(
      join(artifactRoot, "audit-lightstate-default-retail-binary-2026-07-05.json"),
      `${JSON.stringify({
        proofStatus: "retail-binary-backed-nwserver-lightstate-default-on-xref"
      })}\n`
    );
    await writeFile(
      join(artifactRoot, "cross-lane-active-slot-blocker-proof.json"),
      `${JSON.stringify({
        status: "blocked-direct-retail-active-slot-order-missing-local-source-model-present",
        passed: false,
        canonicalParityPromoted: false
      })}\n`
    );

    const { report } = await runGate(tempRoot);
    const crossLaneBlocker = report.blockers.find(
      (blocker: { key: string }) => blocker.key === "retail-cross-lane-active-light-ordering"
    );
    const receiverCase = crossLaneBlocker.cases.find(
      (oracleCase: { caseId: string }) =>
        oracleCase.caseId === "lightmanager-vtable-receiver-dispatch"
    );

    expect(receiverCase.promotionStatus).toBe("blocked-missing-required-artifacts");
    expect(receiverCase.currentEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "audit-retail-item-light-tables-2026-07-05.json",
          status: "present"
        }),
        expect.objectContaining({
          name: "audit-lightstate-default-retail-binary-2026-07-05.json",
          status: "present"
        }),
        expect.objectContaining({
          name: "retail-table-backed-itempropertylight-vfx-dur-light-progfx-fx-light-family-owner-order-blocked",
          status: "evidence-token"
        }),
        expect.objectContaining({
          name: "cross-lane-active-slot-blocker-proof.json",
          status: "present"
        })
      ])
    );
  });

  it("reads BOM-prefixed JSON evidence instead of reporting invalid JSON noise", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-bom-json-"));
    const artifactRoot = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(
      join(artifactRoot, "audit-retail-item-light-tables-2026-07-05.json"),
      Buffer.from(
        `\uFEFF${JSON.stringify({ proofStatus: "source-backed-retail-key-bif-item-light-tables" })}\n`,
        "utf8"
      )
    );

    const { report } = await runGate(tempRoot);
    const crossLaneBlocker = report.blockers.find(
      (blocker: { key: string }) => blocker.key === "retail-cross-lane-active-light-ordering"
    );
    const receiverCase = crossLaneBlocker.cases.find(
      (oracleCase: { caseId: string }) =>
        oracleCase.caseId === "lightmanager-vtable-receiver-dispatch"
    );

    expect(receiverCase.currentEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "audit-retail-item-light-tables-2026-07-05.json",
          json: expect.objectContaining({
            readable: true,
            status: "present-no-explicit-verdict"
          })
        })
      ])
    );
  });

  it("lists shadow-volume projection and no-input fixture proofs as current evidence", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-fixture-current-"));
    const shadowArtifactRoot = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    const driverArtifactRoot = join(
      tempRoot,
      "backend/docs/aurora-reverse/artifacts/light-shadow-retail-oracle-drivers"
    );
    await mkdir(shadowArtifactRoot, { recursive: true });
    await mkdir(driverArtifactRoot, { recursive: true });
    await writeFile(
      join(shadowArtifactRoot, "retail-shadowvol-projection-proof.json"),
      `${JSON.stringify({
        status:
          "source-backed-shadowvol-projection-caster-path-retail-pixel-parity-blocked",
        canonicalParityPromoted: false,
        passed: false
      })}\n`
    );
    await writeFile(
      join(shadowArtifactRoot, "area-lighting-retail-runtime-oracle-pack-proof.json"),
      `${JSON.stringify({
        status: "runtime-oracle-pack-present-readable-parity-still-blocked",
        passed: false,
        canonicalParityPromoted: false,
        summary: {
          requiredRuntimeArtifactCount: 12,
          presentRuntimeArtifactCount: 12
        }
      })}\n`
    );
    await writeFile(
      join(driverArtifactRoot, "oracle-module-fixture-no-input-proof.json"),
      `${JSON.stringify({
        status: "fixture-ready-runtime-capture-required",
        canonicalParityPromoted: false,
        passed: false,
        safety: {
          usesGlobalCursor: false,
          usesForegroundWindow: false
        }
      })}\n`
    );

    const { report } = await runGate(tempRoot);
    const shadowBlocker = report.blockers.find(
      (blocker: { key: string }) => blocker.key === "retail-shadow-volume-projection-parity"
    );
    const campfireCase = shadowBlocker.cases.find(
      (oracleCase: { caseId: string }) =>
        oracleCase.caseId === "shadowvol-campfire-pixel-geometry-opacity"
    );

    expect(campfireCase.currentEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "retail-shadowvol-projection-proof.json",
          status: "present",
          json: expect.objectContaining({
            readable: true,
            explicitFail: true
          })
        }),
        expect.objectContaining({
          name: "area-lighting-retail-runtime-oracle-pack-proof.json",
          status: "present",
          json: expect.objectContaining({
            readable: true,
            explicitFail: true
          })
        }),
        expect.objectContaining({
          name: "oracle-module-fixture-no-input-proof.json",
          status: "present",
          json: expect.objectContaining({
            readable: true,
            explicitFail: true
          })
        })
      ])
    );
    expect(report.summary.currentEvidenceFilesPresent).toBeGreaterThanOrEqual(2);
  });

  it("treats PNG current evidence as proof files, not source tokens", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-light-oracle-png-current-"));
    const artifactRoot = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(
      join(artifactRoot, "shadowvol-campfire-retail-web-diff-normalized.png"),
      "png-proof"
    );

    const { report } = await runGate(tempRoot);
    const shadowBlocker = report.blockers.find(
      (blocker: { key: string }) => blocker.key === "retail-shadow-volume-projection-parity"
    );
    const campfireCase = shadowBlocker.cases.find(
      (oracleCase: { caseId: string }) =>
        oracleCase.caseId === "shadowvol-campfire-pixel-geometry-opacity"
    );

    expect(campfireCase.currentEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "shadowvol-campfire-retail-web-diff-normalized.png",
          status: "present",
          kind: "local-proof-file",
          bytes: 9
        })
      ])
    );
    expect(campfireCase.currentEvidence).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "shadowvol-campfire-retail-web-diff-normalized.png",
          status: "source-token"
        })
      ])
    );
  });

  it("lists the compact ProgFX Type 4 runtime blocker proof as current evidence", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-progfx-current-proof-"));
    const artifactRoot = join(tempRoot, "backend/docs/aurora-reverse/artifacts/light-shadow");
    await mkdir(artifactRoot, { recursive: true });
    await writeFile(
      join(artifactRoot, "progfx-type4-runtime-oracle-blocker-proof.json"),
      `${JSON.stringify({
        status: "blocked-progfx-type4-runtime-oracles-present-policy-parity-incomplete",
        passed: false,
        canonicalParityPromoted: false
      })}\n`
    );

    const { report } = await runGate(tempRoot);
    const progFxBlocker = report.blockers.find(
      (blocker: { key: string }) => blocker.key === "progfx-type4-priority-proximity-vision-scheduler"
    );
    const priorityCase = progFxBlocker.cases.find(
      (oracleCase: { caseId: string }) =>
        oracleCase.caseId === "progfx-type4-priority-tie-and-zero-policy"
    );

    expect(priorityCase.currentEvidence).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "progfx-type4-runtime-oracle-blocker-proof.json",
          status: "present",
          json: expect.objectContaining({
            readable: true,
            explicitFail: true
          })
        })
      ])
    );
  });
});
