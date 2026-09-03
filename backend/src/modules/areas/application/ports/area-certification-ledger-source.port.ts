export const AREA_CERTIFICATION_LEDGER_SOURCE = Symbol(
  "AREA_CERTIFICATION_LEDGER_SOURCE",
);

/**
 * Read-only source for one already-published immutable release report.
 * Implementations return the untrusted decoded document; the application
 * service rebuilds and validates the complete report before serving a page.
 */
export interface AreaCertificationLedgerSourcePort {
  readReleaseReport(): Promise<unknown | null>;
}
