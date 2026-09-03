import type {
  AreaEventScriptPublicationReceipt,
  AreaEventScriptSourceCommand,
  AreaEventScriptSourceSnapshot,
  AreaEventScriptValidationResult,
} from "../domain/areaEventScriptPublication";

export interface AreaEventScriptSourceQuery {
  readonly moduleId: string;
  readonly targetResRef: string;
  readonly expectedModuleRevision: string;
}

export interface AreaEventScriptPublicationResult {
  readonly idempotency: "created" | "replayed";
  readonly receipt: AreaEventScriptPublicationReceipt;
}

export class AreaEventScriptPortError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "AreaEventScriptPortError";
  }
}

export interface AreaEventScriptPublicationPort {
  readSource(
    accessToken: string,
    query: AreaEventScriptSourceQuery,
  ): Promise<AreaEventScriptSourceSnapshot>;
  validate(
    accessToken: string,
    command: AreaEventScriptSourceCommand,
  ): Promise<AreaEventScriptValidationResult>;
  publish(
    accessToken: string,
    command: AreaEventScriptSourceCommand,
    idempotencyKey: string,
  ): Promise<AreaEventScriptPublicationResult>;
}
