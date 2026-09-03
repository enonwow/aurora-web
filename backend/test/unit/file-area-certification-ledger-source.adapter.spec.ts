import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AppConfigService } from "../../src/common/config/app-config.service";
import { FileAreaCertificationLedgerSourceAdapter } from "../../src/modules/areas/adapters/outbound/certification/file-area-certification-ledger-source.adapter";

describe("FileAreaCertificationLedgerSourceAdapter", () => {
  const directories: string[] = [];

  afterEach(async () => {
    await Promise.all(directories.splice(0).map((path) =>
      rm(path, { recursive: true, force: true })
    ));
  });

  it("returns null when the immutable report path is not configured", async () => {
    const adapter = new FileAreaCertificationLedgerSourceAdapter(
      { areaCertificationReportPath: "" } as AppConfigService,
    );

    await expect(adapter.readReleaseReport()).resolves.toBeNull();
  });

  it("reads one bounded JSON document and reuses its object identity while unchanged", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aurora-area-certification-"));
    directories.push(directory);
    const path = join(directory, "release-report.json");
    await writeFile(path, JSON.stringify({ schemaVersion: "area-certification-report.v1" }));
    const adapter = new FileAreaCertificationLedgerSourceAdapter(
      { areaCertificationReportPath: path } as AppConfigService,
    );

    const first = await adapter.readReleaseReport();
    const second = await adapter.readReleaseReport();

    expect(first).toEqual({ schemaVersion: "area-certification-report.v1" });
    expect(second).toBe(first);
  });

  it("rejects empty or malformed documents", async () => {
    const directory = await mkdtemp(join(tmpdir(), "aurora-area-certification-"));
    directories.push(directory);
    const path = join(directory, "release-report.json");
    const adapter = new FileAreaCertificationLedgerSourceAdapter(
      { areaCertificationReportPath: path } as AppConfigService,
    );

    await writeFile(path, "");
    await expect(adapter.readReleaseReport()).rejects.toThrow(
      "area_certification_release_report_file_invalid",
    );
    await writeFile(path, "{not-json}");
    await expect(adapter.readReleaseReport()).rejects.toBeInstanceOf(SyntaxError);
  });
});
