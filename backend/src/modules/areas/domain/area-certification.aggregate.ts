import {
  AREA_PROOF_DIMENSIONS,
  AREA_PROOF_STATES,
  type AreaCertificationRow,
  type AreaProofDimension,
  type AreaProofState,
} from "./area-certification.types";
import { validateAreaCertificationRow } from "./area-certification.validation";

export interface AreaCertificationRowCounts {
  readonly total: number;
  readonly eligible: number;
  readonly excluded: number;
  readonly productionEligible: number;
  readonly developmentEligible: number;
  readonly productionReady: number;
  readonly productionBlocked: number;
}

export type AreaCertificationProofCounts = Readonly<
  Record<AreaProofState, number>
>;

export interface AreaCertificationAggregate {
  readonly rows: AreaCertificationRowCounts;
  /** Proof totals include eligible production rows only. */
  readonly proofs: Readonly<
    Record<AreaProofDimension, AreaCertificationProofCounts>
  >;
}

export class InvalidAreaCertificationRowError extends Error {
  constructor(rowId: string, issueCodes: readonly string[]) {
    super(
      `Cannot aggregate Area certification row ${rowId}: ${issueCodes.join(
        ", ",
      )}.`,
    );
    this.name = "InvalidAreaCertificationRowError";
  }
}

export function aggregateAreaCertificationRows(
  rows: readonly AreaCertificationRow[],
): AreaCertificationAggregate {
  const counts = {
    total: rows.length,
    eligible: 0,
    excluded: 0,
    productionEligible: 0,
    developmentEligible: 0,
    productionReady: 0,
    productionBlocked: 0,
  };
  const proofCounts = createEmptyProofCounts();

  for (const input of rows) {
    const validation = validateAreaCertificationRow(input);
    if (!validation.valid) {
      throw new InvalidAreaCertificationRowError(
        readRowId(input),
        validation.issues.map((entry) => entry.code),
      );
    }

    const row = validation.value;
    if (row.eligibility.status === "excluded") {
      counts.excluded += 1;
      continue;
    }

    counts.eligible += 1;
    if (row.releaseScope === "development") {
      counts.developmentEligible += 1;
      continue;
    }

    counts.productionEligible += 1;
    let ready = true;
    for (const dimension of AREA_PROOF_DIMENSIONS) {
      const state = row.proofs[dimension];
      proofCounts[dimension][state] += 1;
      if (state !== "verified") {
        ready = false;
      }
    }

    if (ready) {
      counts.productionReady += 1;
    } else {
      counts.productionBlocked += 1;
    }
  }

  return deepFreeze({
    rows: counts,
    proofs: proofCounts,
  });
}

function createEmptyProofCounts(): Record<
  AreaProofDimension,
  Record<AreaProofState, number>
> {
  return Object.fromEntries(
    AREA_PROOF_DIMENSIONS.map((dimension) => [
      dimension,
      Object.fromEntries(AREA_PROOF_STATES.map((state) => [state, 0])),
    ]),
  ) as Record<AreaProofDimension, Record<AreaProofState, number>>;
}

function readRowId(row: AreaCertificationRow): string {
  return typeof row?.rowId === "string" && row.rowId.trim().length > 0
    ? row.rowId
    : "<unknown>";
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) {
    return value;
  }

  for (const child of Object.values(value as Record<string, unknown>)) {
    deepFreeze(child);
  }
  return Object.freeze(value);
}
