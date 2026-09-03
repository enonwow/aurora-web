import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";
import { AREA_CREATURE_APPENDAGE_FIELDS } from "../domain/area-creature-appendages";

export type AreaCreatureAppendageCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "descriptor_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "row_lookup_failed"
  | "compile_source_changed"
  | "row_not_admitted";

export class AreaCreatureAppendageCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreatureAppendageCatalogAdmissionFailureReason,
    readonly member?: "wings" | "tail",
    readonly targetRow?: number,
  ) {
    super(`Creature appendage catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureAppendageCatalogAdmissionError";
  }
}

export interface AreaCreatureAppendageCatalogBoundMutation {
  readonly kind: string;
  readonly appendages?: Readonly<Partial<Record<"wings" | "tail", Readonly<{
    value: number;
    tableSha256: string;
    rowCount: number;
  }>>>>;
}

export async function admitCreatureAppendageCatalogMutations(
  mutations: readonly AreaCreatureAppendageCatalogBoundMutation[],
  catalog: Pick<
    TemplateCatalogRepositoryPort,
    | "resolveEffectiveCreatureAppendageTwoDaDescriptor"
    | "resolveEffectiveCreatureAppendageTwoDaRow"
  >,
): Promise<void> {
  const requested = mutations.flatMap((mutation) =>
    mutation.kind !== "creature" || !mutation.appendages
      ? []
      : AREA_CREATURE_APPENDAGE_FIELDS.flatMap((definition) => {
          const member = mutation.appendages?.[definition.key];
          return member ? [{ ...definition, mutation: member }] : [];
        }));
  if (requested.length === 0) return;
  const resolveDescriptor = catalog.resolveEffectiveCreatureAppendageTwoDaDescriptor;
  const resolveRow = catalog.resolveEffectiveCreatureAppendageTwoDaRow;
  if (!resolveDescriptor || !resolveRow) {
    throw new AreaCreatureAppendageCatalogAdmissionError("catalog_unavailable");
  }

  for (const definition of AREA_CREATURE_APPENDAGE_FIELDS) {
    const members = requested.filter((candidate) => candidate.key === definition.key);
    if (members.length === 0) continue;
    let descriptor;
    try {
      descriptor = await resolveDescriptor.call(catalog, definition.resourceName);
    } catch {
      throw new AreaCreatureAppendageCatalogAdmissionError(
        "descriptor_lookup_failed",
        definition.key,
      );
    }
    if (!descriptor) {
      throw new AreaCreatureAppendageCatalogAdmissionError("source_unavailable", definition.key);
    }
    for (const member of members) {
      if (
        descriptor.resourceName !== definition.resourceName ||
        descriptor.sha256 !== member.mutation.tableSha256 ||
        descriptor.rowCount !== member.mutation.rowCount
      ) {
        throw new AreaCreatureAppendageCatalogAdmissionError(
          "draft_source_changed",
          definition.key,
        );
      }
    }
    const targets = [...new Set(members.map((member) => member.mutation.value))];
    for (const targetRow of targets) {
      let result;
      try {
        result = await resolveRow.call(catalog, definition.resourceName, targetRow);
      } catch {
        throw new AreaCreatureAppendageCatalogAdmissionError(
          "row_lookup_failed",
          definition.key,
          targetRow,
        );
      }
      if (
        !result ||
        result.descriptor.resourceName !== definition.resourceName ||
        result.descriptor.sha256 !== descriptor.sha256 ||
        result.descriptor.rowCount !== descriptor.rowCount
      ) {
        throw new AreaCreatureAppendageCatalogAdmissionError(
          "compile_source_changed",
          definition.key,
          targetRow,
        );
      }
      if (!result.row || result.row.rowIndex !== targetRow) {
        throw new AreaCreatureAppendageCatalogAdmissionError(
          "row_not_admitted",
          definition.key,
          targetRow,
        );
      }
    }
  }
}
