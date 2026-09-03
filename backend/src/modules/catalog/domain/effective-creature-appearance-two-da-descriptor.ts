import { createHash } from "node:crypto";

import {
  parseAuroraTwoDaTable,
  type AuroraTwoDaTable,
} from "../../../common/aurora/two-da/aurora-two-da-table";

export const MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_BYTES = 64 * 1024 * 1024;
export const MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_ROWS = 1_000_000;
export const MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_SOURCE_OBJECT_KEY_LENGTH = 2048;

export type EffectiveCreatureAppearanceTwoDaSourceLayer = "module" | "hak" | "vanilla";

export interface EffectiveCreatureAppearanceTwoDaDescriptor {
  resourceName: "appearance.2da";
  sourceObjectKey: string;
  sourceLayer: EffectiveCreatureAppearanceTwoDaSourceLayer;
  sha256: string;
  sizeBytes: number;
  rowCount: number;
}

export interface EffectiveCreatureAppearanceTwoDaDescriptorInput {
  bytes: Buffer;
  sourceObjectKey: string;
  sourceLayer: string;
}

function isEffectiveSourceLayer(
  value: string,
): value is EffectiveCreatureAppearanceTwoDaSourceLayer {
  return value === "module" || value === "hak" || value === "vanilla";
}

export function isSupportedEffectiveCreatureAppearanceTwoDaInput(
  input: EffectiveCreatureAppearanceTwoDaDescriptorInput,
): input is EffectiveCreatureAppearanceTwoDaDescriptorInput & {
  sourceLayer: EffectiveCreatureAppearanceTwoDaSourceLayer;
} {
  return Buffer.isBuffer(input.bytes) &&
    input.bytes.length >= 1 &&
    input.bytes.length <= MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_BYTES &&
    typeof input.sourceObjectKey === "string" &&
    input.sourceObjectKey.length >= 1 &&
    input.sourceObjectKey.length <=
      MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_SOURCE_OBJECT_KEY_LENGTH &&
    isEffectiveSourceLayer(input.sourceLayer);
}

export function isSupportedEffectiveCreatureAppearanceTwoDaTable(
  table: AuroraTwoDaTable,
): boolean {
  return !(
    table.version !== "2DA V2.0" ||
    !table.header.includes("MODELTYPE") ||
    table.rows.length < 1 ||
    table.rows.length > MAX_EFFECTIVE_CREATURE_APPEARANCE_TWO_DA_ROWS ||
    table.diagnostics.some(
      (entry) => entry.severity === "error" || entry.code === "VFX_2DA_ROW_ID_REQUIRED",
    )
  );
}

export function buildEffectiveCreatureAppearanceTwoDaDescriptor(
  input: EffectiveCreatureAppearanceTwoDaDescriptorInput,
): EffectiveCreatureAppearanceTwoDaDescriptor | null {
  if (!isSupportedEffectiveCreatureAppearanceTwoDaInput(input)) {
    return null;
  }

  const sha256 = createHash("sha256").update(input.bytes).digest("hex");
  const table = parseAuroraTwoDaTable(input.bytes, {
    tableName: "appearance.2da",
    profile: "effective-creature-appearance-source-provenance",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sourceHash: sha256,
  });
  if (!isSupportedEffectiveCreatureAppearanceTwoDaTable(table)) {
    return null;
  }

  return {
    resourceName: "appearance.2da",
    sourceObjectKey: input.sourceObjectKey,
    sourceLayer: input.sourceLayer,
    sha256,
    sizeBytes: input.bytes.length,
    rowCount: table.rows.length,
  };
}
