import { Injectable } from "@nestjs/common";
import type { AreaCreatePersistedReadbackVerifierPort } from "../../../application/ports/area-create-readback-verifier.port";
import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import { moduleIfoContainsArea } from "./aurora-gff-module-ifo-area-writer";
import {
  parseAreaMetadataFromAreGff,
  parseAreaVariablesFromGitGff,
} from "./aurora-gff-area-parser";
import { inspectAreaGitGicPair } from "./aurora-gff-area-object-pair-writer";
import { auroraVariableEntriesEqual } from "../../../domain/aurora-variable-table";
import { areaVisualEnvironmentsEqual } from "../../../domain/area-visual-environment";
import { areaVisualEnvironmentScalarControlsEqual } from "../../../domain/area-visual-environment-scalar-controls";
import { areaNameStorageEntriesEqual } from "../../../domain/area-basic-identity";

@Injectable()
export class AuroraAreaUpdatePersistedReadbackVerifier
  implements AreaCreatePersistedReadbackVerifierPort
{
  readonly version = "aurora-area-update-persisted-readback.v1";

  async verify(
    input: Parameters<AreaCreatePersistedReadbackVerifierPort["verify"]>[0],
  ): ReturnType<AreaCreatePersistedReadbackVerifierPort["verify"]> {
    const diagnostics: string[] = [];
    const byExtension = new Map<string, Buffer>();
    for (const resource of input.resources) {
      if (byExtension.has(resource.extension)) {
        diagnostics.push(`AREA_UPDATE_READBACK_RESOURCE_DUPLICATE:${resource.extension}`);
        continue;
      }
      byExtension.set(resource.extension, Buffer.from(resource.bytes));
    }
    const are = byExtension.get("are");
    const git = byExtension.get("git");
    const gic = byExtension.get("gic");
    if (!are) {
      diagnostics.push("AREA_UPDATE_READBACK_ARE_MISSING");
    } else {
      const document = parseRawGffDocument(are);
      if (!document || document.fileType !== "ARE " || document.fileVersion !== "V3.2") {
        diagnostics.push("AREA_UPDATE_READBACK_ARE_INVALID");
      } else {
        const resRef = document.fields.find(
          (field) => field.label.toLowerCase() === "resref",
        );
        if (
          !resRef ||
          (resRef.type !== "resref" && resRef.type !== "cexostring") ||
          resRef.value.toLowerCase() !== input.areaId.toLowerCase()
        ) {
          diagnostics.push("AREA_UPDATE_READBACK_ARE_IDENTITY_MISMATCH");
        }
        const metadata = parseAreaMetadataFromAreGff(are);
        if (
          !metadata ||
          !Number.isSafeInteger(metadata.width) ||
          (metadata.width ?? 0) <= 0 ||
          !Number.isSafeInteger(metadata.height) ||
          (metadata.height ?? 0) <= 0 ||
          !Number.isSafeInteger((metadata.width ?? 0) * (metadata.height ?? 0)) ||
          metadata.tileCount !== (metadata.width ?? 0) * (metadata.height ?? 0)
        ) {
          diagnostics.push("AREA_UPDATE_READBACK_ARE_TOPOLOGY_INVALID");
        }
        if (input.expectedAreaBasicIdentity) {
          const expected = input.expectedAreaBasicIdentity;
          const actual = metadata?.basicIdentity;
          const nameMatches = expected.name === undefined
            || (
              actual?.name === expected.name
              && actual.nameProfile === expected.nameProfile
              && (expected.nameEntries === undefined
                || (actual.nameEntries !== undefined
                  && areaNameStorageEntriesEqual(actual.nameEntries, expected.nameEntries)))
            );
          const tagMatches = expected.tag === undefined || actual?.tag === expected.tag;
          if (!nameMatches || !tagMatches) {
            diagnostics.push("AREA_UPDATE_READBACK_BASIC_IDENTITY_MISMATCH");
          }
        }
        if (
          input.expectedAreaVisualEnvironment
          && !areaVisualEnvironmentsEqual(
            metadata?.visualEnvironment,
            input.expectedAreaVisualEnvironment,
          )
        ) {
          diagnostics.push("AREA_UPDATE_READBACK_VISUAL_ENVIRONMENT_MISMATCH");
        }
        if (
          input.expectedAreaVisualEnvironmentScalarControls
          && !areaVisualEnvironmentScalarControlsEqual(
            metadata?.visualEnvironmentScalarControls,
            input.expectedAreaVisualEnvironmentScalarControls,
          )
        ) {
          diagnostics.push("AREA_UPDATE_READBACK_VISUAL_ENVIRONMENT_SCALAR_CONTROLS_MISMATCH");
        }
        if (input.expectedAreaVisualEnvironmentCatalogSelection) {
          const expectedSelection = input.expectedAreaVisualEnvironmentCatalogSelection;
          const actualSelection = metadata?.visualEnvironmentCatalogSelection;
          if (
            !actualSelection
            || actualSelection.lightingSchemeRowIndex
              !== expectedSelection.lightingSchemeRowIndex
            || actualSelection.skyBoxRowIndex !== expectedSelection.skyBoxRowIndex
          ) {
            diagnostics.push(
              "AREA_UPDATE_READBACK_VISUAL_ENVIRONMENT_CATALOG_SELECTION_MISMATCH",
            );
          }
        }
      }
    }
    const gitValid = validateCompanion(git, "GIT ", "GIT", diagnostics);
    const gicValid = validateCompanion(gic, "GIC ", "GIC", diagnostics);
    if (gitValid && gicValid) {
      try {
        inspectAreaGitGicPair(git!, gic!);
      } catch {
        diagnostics.push("AREA_UPDATE_READBACK_GIT_GIC_PAIR_MISMATCH");
      }
    }
    if (gitValid && input.expectedAreaVariables) {
      const variables = parseAreaVariablesFromGitGff(git!);
      if (!variables || !auroraVariableEntriesEqual(
        variables.expectedEntries,
        input.expectedAreaVariables,
      )) {
        diagnostics.push("AREA_UPDATE_READBACK_VARIABLE_TABLE_MISMATCH");
      }
    }
    if (!moduleIfoContainsArea(input.moduleIfo.bytes, input.areaId)) {
      diagnostics.push("AREA_UPDATE_READBACK_IFO_MEMBERSHIP_MISSING");
    }
    return Object.freeze({
      valid: diagnostics.length === 0,
      diagnostics: Object.freeze(diagnostics),
    });
  }
}

function validateCompanion(
  bytes: Buffer | undefined,
  fileType: "GIT " | "GIC ",
  label: "GIT" | "GIC",
  diagnostics: string[],
): boolean {
  if (!bytes) {
    diagnostics.push(`AREA_UPDATE_READBACK_${label}_MISSING`);
    return false;
  }
  const document = parseRawGffDocument(bytes);
  if (!document || document.fileType !== fileType || document.fileVersion !== "V3.2") {
    diagnostics.push(`AREA_UPDATE_READBACK_${label}_INVALID`);
    return false;
  }
  return true;
}
