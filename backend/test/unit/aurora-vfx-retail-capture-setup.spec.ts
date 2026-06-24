import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  createVfxRetailFixturePack,
  REQUIRED_VFX_RETAIL_FIXTURE_FILES
} from "../../scripts/create-vfx-retail-fixture-pack";
import {
  getAuroraVfxRetailBehaviorClaims,
  getAuroraVfxRetailParityEvidenceKeys,
  getAuroraVfxRetailParityStatuses
} from "../../src/modules/vfx/domain/aurora-vfx-retail-parity-gate";

describe("Aurora VFX retail capture setup", () => {
  const templateRoot = join(process.cwd(), "test", "fixtures", "vfx-retail", "_template");

  it("keeps the template fixture pack complete", async () => {
    for (const file of REQUIRED_VFX_RETAIL_FIXTURE_FILES) {
      await expect(access(join(templateRoot, file))).resolves.toBeUndefined();
    }
    await expect(access(join(templateRoot, "README.md"))).resolves.toBeUndefined();
  });

  it("keeps every template JSON parseable and explicitly non-captured", async () => {
    for (const file of REQUIRED_VFX_RETAIL_FIXTURE_FILES) {
      const parsed = JSON.parse(await readFile(join(templateRoot, file), "utf-8")) as {
        fixtureId?: string;
        status?: string;
      };

      expect(parsed.fixtureId).toBe("TODO");
      expect(parsed.status).toMatch(/missing|TODO/);
    }
  });

  it("defines the final retail-build metadata fields without pretending evidence exists", async () => {
    const parsed = JSON.parse(
      await readFile(join(templateRoot, "retail-build.json"), "utf-8")
    ) as {
      client?: { name?: string | null; buildId?: string | null; version?: string | null };
      platform?: unknown;
      buildProfile?: unknown;
      moduleProfile?: unknown;
      hakProfile?: { hakList?: unknown[]; hakListHashSha256?: string | null };
      runtimeSettings?: { revision?: number | null; hashSha256?: string | null };
      captureEnvironment?: {
        machineName?: string | null;
        captureStartedAt?: string | null;
        captureFinishedAt?: string | null;
      };
      operatorNotes?: string | null;
    };

    expect(parsed.client).toMatchObject({
      name: null,
      buildId: null,
      version: null
    });
    expect(parsed.platform).toBeDefined();
    expect(parsed.buildProfile).toBeDefined();
    expect(parsed.moduleProfile).toBeDefined();
    expect(parsed.hakProfile?.hakList).toBeDefined();
    expect(parsed.hakProfile?.hakListHashSha256).toBeNull();
    expect(parsed.runtimeSettings).toMatchObject({
      revision: null,
      hashSha256: null
    });
    expect(parsed.captureEnvironment).toMatchObject({
      machineName: null,
      captureStartedAt: null,
      captureFinishedAt: null
    });
    expect(parsed.operatorNotes).toBe("TODO");
  });

  it("keeps the retail capture handoff aligned with manifest fixture ids", async () => {
    const manifest = JSON.parse(
      await readFile(
        join(process.cwd(), "docs", "aurora-reverse", "vfx-retail-parity-fixtures.json"),
        "utf-8"
      )
    ) as { fixtures: Array<{ fixtureId: string }> };
    const handoff = await readFile(
      join(process.cwd(), "docs", "aurora-reverse", "vfx-retail-capture-handoff.md"),
      "utf-8"
    );

    const fixtureIds = manifest.fixtures.map((fixture) => fixture.fixtureId).sort();
    const fixtureIdSet = new Set(fixtureIds);
    const handoffFixtureIds = [...handoff.matchAll(/`(vfx-retail-[a-z0-9._-]+)`/g)]
      .map((match) => match[1])
      .filter((fixtureId) => fixtureIdSet.has(fixtureId))
      .sort();

    expect(fixtureIds).toHaveLength(10);
    expect(handoffFixtureIds).toEqual(fixtureIds);
  });

  it("keeps the retail capture handoff aligned with manifest required cases", async () => {
    const manifest = JSON.parse(
      await readFile(
        join(process.cwd(), "docs", "aurora-reverse", "vfx-retail-parity-fixtures.json"),
        "utf-8"
      )
    ) as { fixtures: Array<{ requiredCase: string }> };
    const handoff = await readFile(
      join(process.cwd(), "docs", "aurora-reverse", "vfx-retail-capture-handoff.md"),
      "utf-8"
    );

    const requiredCases = manifest.fixtures.map((fixture) => fixture.requiredCase).sort();
    const requiredCaseSet = new Set(requiredCases);
    const handoffRequiredCases = [...handoff.matchAll(/`([a-z][a-z0-9_]+)`/g)]
      .map((match) => match[1])
      .filter((requiredCase) => requiredCaseSet.has(requiredCase))
      .sort();

    expect(requiredCases).toHaveLength(10);
    expect(handoffRequiredCases).toEqual(requiredCases);
  });

  it("keeps capture docs aligned with required fixture artifact files", async () => {
    const docsRoot = join(process.cwd(), "docs", "aurora-reverse");
    const setup = await readFile(join(docsRoot, "vfx-retail-capture-setup.md"), "utf-8");
    const handoff = await readFile(join(docsRoot, "vfx-retail-capture-handoff.md"), "utf-8");

    expect(REQUIRED_VFX_RETAIL_FIXTURE_FILES).toHaveLength(9);
    for (const file of REQUIRED_VFX_RETAIL_FIXTURE_FILES) {
      expect(setup).toContain(file);
      expect(handoff).toContain(file);
    }
  });

  it("keeps capture docs aligned with the retail fixture status lifecycle", async () => {
    const docsRoot = join(process.cwd(), "docs", "aurora-reverse");
    const setup = await readFile(join(docsRoot, "vfx-retail-capture-setup.md"), "utf-8");
    const handoff = await readFile(join(docsRoot, "vfx-retail-capture-handoff.md"), "utf-8");

    for (const status of getAuroraVfxRetailParityStatuses()) {
      expect(setup).toContain(`\`${status}\``);
      expect(handoff).toContain(`\`${status}\``);
    }
  });

  it("keeps capture docs aligned with the retail parity evidence chain", async () => {
    const docsRoot = join(process.cwd(), "docs", "aurora-reverse");
    const setup = await readFile(join(docsRoot, "vfx-retail-capture-setup.md"), "utf-8");
    const handoff = await readFile(join(docsRoot, "vfx-retail-capture-handoff.md"), "utf-8");

    for (const evidenceKey of getAuroraVfxRetailParityEvidenceKeys()) {
      expect(setup).toContain(evidenceKey);
      expect(handoff).toContain(evidenceKey);
    }
  });

  it("keeps capture docs aligned with retail behavior claim labels", async () => {
    const docsRoot = join(process.cwd(), "docs", "aurora-reverse");
    const setup = await readFile(join(docsRoot, "vfx-retail-capture-setup.md"), "utf-8");
    const handoff = await readFile(join(docsRoot, "vfx-retail-capture-handoff.md"), "utf-8");

    for (const behaviorClaim of getAuroraVfxRetailBehaviorClaims()) {
      expect(setup).toContain(behaviorClaim);
      expect(handoff).toContain(behaviorClaim);
    }
  });

  it("creates a new fixture pack from the template without touching the manifest", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-vfx-retail-fixture-"));

    try {
      const result = await createVfxRetailFixturePack({
        fixtureId: "vfx-retail-test-pack",
        fixturesRoot: tempRoot,
        templateRoot
      });

      expect(result.fixtureId).toBe("vfx-retail-test-pack");
      expect(result.files).toEqual([...REQUIRED_VFX_RETAIL_FIXTURE_FILES]);
      await expect(access(join(result.fixturePath, "README.md"))).resolves.toBeUndefined();

      for (const file of REQUIRED_VFX_RETAIL_FIXTURE_FILES) {
        const parsed = JSON.parse(await readFile(join(result.fixturePath, file), "utf-8")) as {
          fixtureId?: string;
          status?: string;
        };
        expect(parsed.fixtureId).toBe("vfx-retail-test-pack");
        expect(parsed.status).toBe("missing");
      }
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it("refuses unsafe fixture ids and existing fixture directories", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "aurora-vfx-retail-fixture-"));

    try {
      await expect(
        createVfxRetailFixturePack({
          fixtureId: "../escape",
          fixturesRoot: tempRoot,
          templateRoot
        })
      ).rejects.toThrow("fixtureId must use");

      await createVfxRetailFixturePack({
        fixtureId: "vfx-retail-test-pack",
        fixturesRoot: tempRoot,
        templateRoot
      });
      await expect(
        createVfxRetailFixturePack({
          fixtureId: "vfx-retail-test-pack",
          fixturesRoot: tempRoot,
          templateRoot
        })
      ).rejects.toThrow("Refusing to overwrite");
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
