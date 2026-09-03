import type { TemplateCatalogRepositoryPort } from
  "../../catalog/application/ports/template-catalog-repository.port";

export type AreaCreatureSoundSetFileCatalogAdmissionFailureReason =
  | "catalog_unavailable"
  | "table_lookup_failed"
  | "source_unavailable"
  | "draft_source_changed"
  | "row_not_admitted";

export class AreaCreatureSoundSetFileCatalogAdmissionError extends Error {
  constructor(
    readonly reason: AreaCreatureSoundSetFileCatalogAdmissionFailureReason,
    readonly targetRow?: number,
  ) {
    super(`Creature SoundSetFile catalog admission failed: ${reason}.`);
    this.name = "AreaCreatureSoundSetFileCatalogAdmissionError";
  }
}

export interface AreaCreatureSoundSetFileCatalogBoundMutation {
  readonly kind: string;
  readonly soundSetFile?: {
    readonly value: number;
    readonly tableSha256: string;
    readonly rowCount: number;
  };
}

export async function admitCreatureSoundSetFileCatalogMutations(
  mutations: readonly AreaCreatureSoundSetFileCatalogBoundMutation[],
  catalog: Pick<TemplateCatalogRepositoryPort, "resolveEffectiveCreatureSoundSetsTwoDaTable">,
): Promise<void> {
  const soundSets = mutations.flatMap((mutation) =>
    mutation.kind === "creature" && mutation.soundSetFile ? [mutation.soundSetFile] : []);
  if (soundSets.length === 0) return;
  const resolveTable = catalog.resolveEffectiveCreatureSoundSetsTwoDaTable;
  if (!resolveTable) {
    throw new AreaCreatureSoundSetFileCatalogAdmissionError("catalog_unavailable");
  }
  let table;
  try {
    table = await resolveTable.call(catalog);
  } catch {
    throw new AreaCreatureSoundSetFileCatalogAdmissionError("table_lookup_failed");
  }
  if (!table) throw new AreaCreatureSoundSetFileCatalogAdmissionError("source_unavailable");
  for (const soundSet of soundSets) {
    if (table.descriptor.resourceName !== "soundset.2da" ||
      table.descriptor.sha256 !== soundSet.tableSha256 ||
      table.descriptor.rowCount !== soundSet.rowCount) {
      throw new AreaCreatureSoundSetFileCatalogAdmissionError("draft_source_changed");
    }
    if (!table.rows.some((row) => row.rowIndex === soundSet.value)) {
      throw new AreaCreatureSoundSetFileCatalogAdmissionError("row_not_admitted", soundSet.value);
    }
  }
}
