import { parseAreaMetadataFromAreGff } from "./aurora-gff-area-parser";
import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import type {
  ProjectedAreaUpdateDraft,
  ProjectedAreaUpdateTile,
} from "../../../domain/area-update-draft-projector";
import { terrainTypeFlagsEqual } from "../../../domain/area-advanced-flags";
import {
  areaNameStorageEntriesEqual,
  areaNameStorageEntryIdentifiersFormAdmittedTarget,
  areaNameStorageProfileForEntries,
  readEditableAreaNameStorage,
  type EditableAreaNameStorage,
} from "../../../domain/area-basic-identity";
import { areaVisualEnvironmentsEqual } from "../../../domain/area-visual-environment";
import { areaVisualEnvironmentScalarControlsEqual } from "../../../domain/area-visual-environment-scalar-controls";
import type { ResolvedAreaVisualEnvironmentCatalogSelectionMutation } from "../../../domain/area-visual-environment-catalog-selection-mutation";

export const AURORA_AREA_UPDATE_CANDIDATE_VALIDATOR_VERSION =
  "aurora-area-update-candidate-validator.v1" as const;

export interface AreaUpdateCandidateValidationIssue {
  readonly code:
    | "AREA_UPDATE_CANDIDATE_PARSE_FAILED"
    | "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH"
    | "AREA_UPDATE_CANDIDATE_TILE_MISMATCH";
  readonly path: string;
  readonly message: string;
}

export type AreaUpdateCandidateValidationResult =
  | Readonly<{ valid: true; issues: readonly [] }>
  | Readonly<{
      valid: false;
      issues: readonly AreaUpdateCandidateValidationIssue[];
    }>;

export function validateAreaUpdateCandidate(
  expected: ProjectedAreaUpdateDraft,
  candidateAre: Buffer,
  sourceAre?: Buffer,
  resolvedVisualEnvironmentCatalogSelection?:
    ResolvedAreaVisualEnvironmentCatalogSelectionMutation,
): AreaUpdateCandidateValidationResult {
  const parsed = parseAreaMetadataFromAreGff(candidateAre);
  if (!parsed) {
    return invalid([
      issue(
        "AREA_UPDATE_CANDIDATE_PARSE_FAILED",
        "candidate.are",
        "Candidate is not a readable ARE GFF.",
      ),
    ]);
  }

  const issues: AreaUpdateCandidateValidationIssue[] = [];
  compareRoot(issues, "width", parsed.width, expected.width);
  compareRoot(issues, "height", parsed.height, expected.height);
  compareRoot(
    issues,
    "tilesetResRef",
    parsed.tileSet?.toLowerCase(),
    expected.tilesetResRef,
  );
  compareRoot(issues, "tileCount", parsed.tileCount, expected.tiles.length);
  if (expected.comments) {
    compareRoot(issues, "comments", parsed.comments, expected.comments.value);
  }
  if (expected.eventScripts) {
    for (const [slot, mutation] of Object.entries(expected.eventScripts)) {
      compareRoot(
        issues,
        `eventScripts.${slot}`,
        parsed.eventScripts?.[slot as keyof typeof parsed.eventScripts],
        mutation?.resRef,
      );
    }
  }
  if (expected.basicIdentity?.name) {
    compareRoot(
      issues,
      "basicIdentity.name",
      parsed.basicIdentity?.name,
      expected.basicIdentity.name.value,
    );
    compareRoot(
      issues,
      "basicIdentity.nameProfile",
      parsed.basicIdentity?.nameProfile,
      expected.basicIdentity.name.valueEntries
        ? areaNameStorageProfileForEntries(expected.basicIdentity.name.valueEntries)
        : expected.basicIdentity.name.expectedProfile ?? "simple_inline_ascii",
    );
    if (sourceAre) {
      compareAreaNameSiblings(
        issues,
        sourceAre,
        candidateAre,
        expected.basicIdentity.name.value,
        expected.basicIdentity.name.valueEntries,
      );
    }
  }
  if (expected.basicIdentity?.tag) {
    compareRoot(
      issues,
      "basicIdentity.tag",
      parsed.basicIdentity?.tag,
      expected.basicIdentity.tag.value,
    );
  }
  if (expected.advancedFlags?.terrainType) {
    const actual = parsed.advancedFlags?.terrainType;
    const target = expected.advancedFlags.terrainType.value;
    if (!actual || !terrainTypeFlagsEqual(actual, target)) {
      issues.push(issue(
        "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
        "candidate.are.advancedFlags.terrainType",
        `Expected ${JSON.stringify(target)}, received ${JSON.stringify(actual)}.`,
      ));
    }
  }
  if (expected.advancedFlags?.playerVsPlayer) {
    compareRoot(
      issues,
      "advancedFlags.playerVsPlayer",
      parsed.advancedFlags?.playerVsPlayer,
      expected.advancedFlags.playerVsPlayer.value,
    );
  }
  if (expected.advancedFlags?.noRest) {
    compareRoot(
      issues,
      "advancedFlags.noRest",
      parsed.advancedFlags?.noRest,
      expected.advancedFlags.noRest.value,
    );
  }
  if (expected.advancedFlags?.listenCheckModifier) {
    compareRoot(
      issues,
      "advancedFlags.listenCheckModifier",
      parsed.advancedFlags?.listenCheckModifier,
      expected.advancedFlags.listenCheckModifier.value,
    );
  }
  if (expected.advancedFlags?.spotCheckModifier) {
    compareRoot(
      issues,
      "advancedFlags.spotCheckModifier",
      parsed.advancedFlags?.spotCheckModifier,
      expected.advancedFlags.spotCheckModifier.value,
    );
  }
  if (expected.advancedFlags?.loadingScreenId) {
    compareRoot(
      issues,
      "advancedFlags.loadingScreenId",
      parsed.advancedFlags?.loadingScreenId,
      expected.advancedFlags.loadingScreenId.value,
    );
  }
  if (
    expected.visualEnvironment
    && !areaVisualEnvironmentsEqual(
      parsed.visualEnvironment,
      expected.visualEnvironment.value,
    )
  ) {
    issues.push(issue(
      "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
      "candidate.are.visualEnvironment",
      "Candidate visual-environment tuple differs from the requested target.",
    ));
  }
  if (
    expected.visualEnvironmentScalarControls
    && !areaVisualEnvironmentScalarControlsEqual(
      parsed.visualEnvironmentScalarControls,
      expected.visualEnvironmentScalarControls.value,
    )
  ) {
    issues.push(issue(
      "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
      "candidate.are.visualEnvironmentScalarControls",
      "Candidate visual-environment scalar-controls pair differs from the requested target.",
    ));
  }
  if (resolvedVisualEnvironmentCatalogSelection) {
    const target = resolvedVisualEnvironmentCatalogSelection.value;
    const actual = parsed.visualEnvironmentCatalogSelection;
    if (
      !actual
      || actual.lightingSchemeRowIndex !== target.lightingSchemeRowIndex
      || actual.skyBoxRowIndex !== target.skyBoxRowIndex
    ) {
      issues.push(issue(
        "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
        "candidate.are.visualEnvironmentCatalogSelection",
        "Candidate visual-environment catalog selection differs from the resolved target.",
      ));
    }
    if (
      resolvedVisualEnvironmentCatalogSelection.lightingSchemeChanged
      && !areaVisualEnvironmentsEqual(
        parsed.visualEnvironment,
        target.visualEnvironment,
      )
    ) {
      issues.push(issue(
        "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
        "candidate.are.visualEnvironmentCatalogSelection.visualEnvironment",
        "Candidate visual environment differs from the resolved catalog target.",
      ));
    }
    if (
      resolvedVisualEnvironmentCatalogSelection.lightingSchemeChanged
      && !areaVisualEnvironmentScalarControlsEqual(
        parsed.visualEnvironmentScalarControls,
        target.visualEnvironmentScalarControls,
      )
    ) {
      issues.push(issue(
        "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
        "candidate.are.visualEnvironmentCatalogSelection.visualEnvironmentScalarControls",
        "Candidate scalar controls differ from the resolved catalog target.",
      ));
    }
  }

  expected.tiles.forEach((expectedTile, index) => {
    const actual = parsed.tiles[index];
    if (!actual) {
      issues.push(
        issue(
          "AREA_UPDATE_CANDIDATE_TILE_MISMATCH",
          `candidate.are.tiles.${index}`,
          "Candidate is missing the expected tile.",
        ),
      );
      return;
    }
    compareTile(issues, index, "row", actual.row, expectedTile.row);
    compareTile(issues, index, "col", actual.col, expectedTile.col);
    compareTile(issues, index, "tileId", actual.tileId, expectedTile.tileId);
    compareTile(
      issues,
      index,
      "orientation",
      actual.orientation,
      expectedTile.orientation,
    );
    compareTile(issues, index, "height", actual.height, expectedTile.height);
    for (const field of [
      "mainLight1",
      "mainLight2",
      "sourceLight1",
      "sourceLight2",
      "animLoop1",
      "animLoop2",
      "animLoop3",
    ] as const) {
      if (expectedTile[field] !== undefined) {
        compareTile(issues, index, field, actual[field], expectedTile[field]);
      }
    }
  });

  return issues.length === 0
    ? Object.freeze({ valid: true as const, issues: Object.freeze([]) as readonly [] })
    : invalid(issues);
}

function compareAreaNameSiblings(
  issues: AreaUpdateCandidateValidationIssue[],
  sourceAre: Buffer,
  candidateAre: Buffer,
  targetName: string,
  targetEntries?: readonly { readonly languageId: number; readonly text: string }[],
): void {
  const source = readRawAreaNameStorage(sourceAre);
  const candidate = readRawAreaNameStorage(candidateAre);
  if (!source || !candidate) {
    issues.push(issue(
      "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
      "candidate.are.basicIdentity.nameSiblings",
      "Source or candidate Area Name storage is outside the admitted inline entry profile.",
    ));
    return;
  }
  const equal = targetEntries
    ? areaNameStorageEntriesEqual(candidate.entries, targetEntries)
      && areaNameStorageEntryIdentifiersFormAdmittedTarget(source.entries, targetEntries)
    : source.entries.length === candidate.entries.length
      && source.entries.every((entry, index) => {
        const actual = candidate.entries[index];
        return actual?.languageId === entry.languageId
          && actual.text === (entry.languageId === 0 ? targetName : entry.text);
      });
  if (!equal) {
    issues.push(issue(
      "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
      "candidate.are.basicIdentity.nameSiblings",
      "Candidate Area Name does not match the complete ordered removal target.",
    ));
  }
}

function readRawAreaNameStorage(bytes: Buffer): EditableAreaNameStorage | undefined {
  const document = parseRawGffDocument(bytes);
  if (!document || document.fileType !== "ARE ") return undefined;
  const matches = document.fields.filter(
    (field) => field.label.toLowerCase() === "name",
  );
  const field = matches[0];
  if (
    matches.length !== 1
    || field?.label !== "Name"
    || field.type !== "cexolocstring"
    || !Array.isArray(field.value.entries)
  ) {
    return undefined;
  }
  return readEditableAreaNameStorage({
    present: true,
    strRef: field.value.strRef,
    entries: field.value.entries.map((entry) => ({
      languageId: entry.languageId,
      textBytesBase64: Buffer.from(entry.text, "utf8").toString("base64"),
    })),
  });
}

function compareRoot(
  issues: AreaUpdateCandidateValidationIssue[],
  field: string,
  actual: unknown,
  expected: unknown,
): void {
  if (actual === expected) return;
  issues.push(
    issue(
      "AREA_UPDATE_CANDIDATE_ROOT_MISMATCH",
      `candidate.are.${field}`,
      `Expected ${String(expected)}, received ${String(actual)}.`,
    ),
  );
}

function compareTile(
  issues: AreaUpdateCandidateValidationIssue[],
  index: number,
  field: keyof ProjectedAreaUpdateTile,
  actual: unknown,
  expected: unknown,
): void {
  if (actual === expected) return;
  issues.push(
    issue(
      "AREA_UPDATE_CANDIDATE_TILE_MISMATCH",
      `candidate.are.tiles.${index}.${String(field)}`,
      `Expected ${String(expected)}, received ${String(actual)}.`,
    ),
  );
}

function issue(
  code: AreaUpdateCandidateValidationIssue["code"],
  path: string,
  message: string,
): AreaUpdateCandidateValidationIssue {
  return Object.freeze({ code, path, message });
}

function invalid(
  issues: readonly AreaUpdateCandidateValidationIssue[],
): AreaUpdateCandidateValidationResult {
  return Object.freeze({ valid: false as const, issues: Object.freeze([...issues]) });
}
