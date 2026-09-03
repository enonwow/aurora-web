import { Injectable } from "@nestjs/common";
import { readFile, stat } from "node:fs/promises";
import { AppConfigService } from "../../../../../common/config/app-config.service";
import type {
  AreaCertificationLedgerSourcePort,
} from "../../../application/ports/area-certification-ledger-source.port";

export const AREA_CERTIFICATION_RELEASE_REPORT_MAX_BYTES = 64 * 1024 * 1024;

interface CachedDocument {
  readonly path: string;
  readonly size: number;
  readonly mtimeMs: number;
  readonly value: unknown;
}

@Injectable()
export class FileAreaCertificationLedgerSourceAdapter
implements AreaCertificationLedgerSourcePort {
  private cache: CachedDocument | null = null;

  constructor(private readonly config: AppConfigService) {}

  async readReleaseReport(): Promise<unknown | null> {
    const path = this.config.areaCertificationReportPath;
    if (!path) return null;

    const descriptor = await stat(path);
    if (
      !descriptor.isFile() ||
      descriptor.size < 2 ||
      descriptor.size > AREA_CERTIFICATION_RELEASE_REPORT_MAX_BYTES
    ) {
      throw new Error("area_certification_release_report_file_invalid");
    }
    if (
      this.cache?.path === path &&
      this.cache.size === descriptor.size &&
      this.cache.mtimeMs === descriptor.mtimeMs
    ) {
      return this.cache.value;
    }

    const bytes = await readFile(path);
    if (bytes.byteLength !== descriptor.size) {
      throw new Error("area_certification_release_report_changed_while_reading");
    }
    const value: unknown = JSON.parse(bytes.toString("utf8"));
    this.cache = Object.freeze({
      path,
      size: descriptor.size,
      mtimeMs: descriptor.mtimeMs,
      value,
    });
    return value;
  }
}
