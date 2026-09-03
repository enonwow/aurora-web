export type AreaCreateRevisionPreconditionResult =
  | Readonly<{ matched: true; revision: string }>
  | Readonly<{
      matched: false;
      code:
        | "missing_if_match"
        | "invalid_if_match"
        | "body_header_mismatch"
        | "stale_revision";
      expected?: string;
      actual?: string;
    }>;

export interface AreaCreateRevisionPreconditionInput {
  readonly ifMatchHeader: string | undefined;
  readonly expectedModuleRevision: string;
  readonly currentModuleRevision: string;
}

export function checkAreaCreateRevisionPrecondition({
  ifMatchHeader,
  expectedModuleRevision,
  currentModuleRevision,
}: AreaCreateRevisionPreconditionInput): AreaCreateRevisionPreconditionResult {
  if (ifMatchHeader === undefined || ifMatchHeader.length === 0) {
    return Object.freeze({ matched: false, code: "missing_if_match" });
  }

  const match = /^"([\x21\x23-\x7e]+)"$/u.exec(ifMatchHeader);
  if (!match) {
    return Object.freeze({ matched: false, code: "invalid_if_match" });
  }

  const headerRevision = match[1];
  if (headerRevision !== expectedModuleRevision) {
    return Object.freeze({
      matched: false,
      code: "body_header_mismatch",
      expected: expectedModuleRevision,
      actual: headerRevision,
    });
  }

  if (currentModuleRevision !== expectedModuleRevision) {
    return Object.freeze({
      matched: false,
      code: "stale_revision",
      expected: expectedModuleRevision,
      actual: currentModuleRevision,
    });
  }

  return Object.freeze({ matched: true, revision: currentModuleRevision });
}
