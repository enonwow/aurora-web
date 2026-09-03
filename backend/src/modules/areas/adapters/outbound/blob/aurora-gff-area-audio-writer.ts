import { parseRawGffDocument } from "../../../../catalog/adapters/outbound/blob/aurora-gff-template-parser";
import {
  buildGffBuffer,
  type SupportedGffField,
} from "../../../../catalog/adapters/outbound/blob/aurora-gff-uti-writer";
import {
  AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS,
  areaAudioEnvironmentsEqual,
  isAreaAudioEnvironment,
  type AreaAudioEnvironment,
  type ExistingAreaAudioEnvironmentMutation,
} from "../../../domain/area-audio-environment";
import { parseAreaAudioEnvironmentFromGitGff } from "./aurora-gff-area-parser";
import {
  cloneSupportedGffField,
} from "./aurora-gff-supported-field-cloner";

export interface UpdatedGitAreaAudioEnvironment {
  readonly bytes: Buffer;
  readonly audioEnvironment: AreaAudioEnvironment;
}

/** Replaces one retained canonical audio tuple and preserves all sibling GFF values. */
export function updateGitAreaAudioEnvironment(
  sourceBytes: Buffer,
  mutation: ExistingAreaAudioEnvironmentMutation,
): UpdatedGitAreaAudioEnvironment {
  if (!isAreaAudioEnvironment(mutation.expectedValue) ||
      !isAreaAudioEnvironment(mutation.value)) {
    throw new Error("Area audio mutation must contain two complete admitted tuples.");
  }
  if (areaAudioEnvironmentsEqual(mutation.expectedValue, mutation.value)) {
    throw new Error("Area audio mutation must change the retained tuple.");
  }
  const document = parseRawGffDocument(sourceBytes);
  if (!document || document.fileType !== "GIT ") {
    throw new Error("Area companion is not a readable GIT GFF document.");
  }
  if (document.fileVersion !== "V3.2") {
    throw new Error(`Unsupported Area GIT version ${document.fileVersion}.`);
  }
  const current = parseAreaAudioEnvironmentFromGitGff(sourceBytes);
  if (!current || !areaAudioEnvironmentsEqual(current, mutation.expectedValue)) {
    throw new Error("Area audio source provenance is missing or stale.");
  }

  const areaPropertiesMatches = document.fields.filter(
    (field) => field.label.toLowerCase() === "areaproperties",
  );
  if (areaPropertiesMatches.length !== 1 ||
      areaPropertiesMatches[0]?.label !== "AreaProperties" ||
      areaPropertiesMatches[0].type !== "struct" ||
      areaPropertiesMatches[0].value.typeId !== 100) {
    throw new Error("GIT must contain one exact type-100 AreaProperties struct.");
  }
  const retainedAreaProperties = areaPropertiesMatches[0];
  const propertyByLabel = new Map<string, (typeof AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS)[number]["property"]>(
    AREA_AUDIO_ENVIRONMENT_FIELD_MAPPINGS.map((entry) => [entry.label, entry.property]),
  );
  const fields = document.fields.map((field): SupportedGffField => {
    if (field !== retainedAreaProperties || field.type !== "struct") {
      return cloneSupportedGffField(field);
    }
    return {
      ...field,
      value: {
        typeId: field.value.typeId,
        fields: field.value.fields.map((nested): SupportedGffField => {
          const property = propertyByLabel.get(nested.label);
          return property === undefined
            ? cloneSupportedGffField(nested)
            : { ...nested, value: mutation.value[property] } as SupportedGffField;
        }),
      },
    };
  });
  const bytes = buildGffBuffer(fields, document.fileType, document.rootStructTypeId);
  const readback = parseAreaAudioEnvironmentFromGitGff(bytes);
  if (!readback || !areaAudioEnvironmentsEqual(readback, mutation.value)) {
    throw new Error("Area audio candidate failed independent readback.");
  }
  return Object.freeze({ bytes, audioEnvironment: readback });
}
